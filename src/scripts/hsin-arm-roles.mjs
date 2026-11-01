/**
 * Which arm owns which gesture. Pure data and arithmetic: no THREE, no rig, no DOM.
 *
 * `side` is the rig bone suffix (`.R` / `.L`) exactly as the approved signature uses it.
 * Whether a suffix really sits on the character's anatomical right or left is a property of
 * the model, so `classifyArmSides` measures it from geometry instead of trusting the name.
 */
export const ARM_ROLES = Object.freeze({
  signature: Object.freeze({ side: 'R', gesture: 'under-chin', label: 'mão direita sob o queixo' }),
  chest: Object.freeze({ side: 'L', gesture: 'hand-on-chest', label: 'mão esquerda ao peito' }),
});

export const oppositeSide = (side) => (side === 'L' ? 'R' : 'L');

/** The two gestures must never share an arm. Throws so a bad edit fails loudly in tests. */
export function assertDisjointRoles(roles = ARM_ROLES) {
  const sides = Object.values(roles).map((role) => role.side);
  if (sides.some((side) => side !== 'L' && side !== 'R')) throw new Error('Arm roles must name side L or R.');
  if (new Set(sides).size !== sides.length) throw new Error('Two arm roles share the same arm.');
  return true;
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const length = (v) => Math.hypot(v[0], v[1], v[2]);

/**
 * Which bone suffix is on the character's anatomical right?
 * A character facing `forward` with `up` overhead has its right hand toward `forward × up`
 * (facing +Z with +Y up, the right hand is at -X, which the viewer sees on their left).
 *
 * Inputs are plain 3-arrays in one coordinate system: `root` (spine), the two shoulders,
 * and the character's `up` and `forward` (forward need not be perpendicular to up).
 * `minSeparation` is the smallest lateral gap, in the same units, that counts as a decision.
 */
export function classifyArmSides({ root, up, forward, shoulderR, shoulderL, minSeparation = 1e-4 }) {
  const arrays = [root, up, forward, shoulderR, shoulderL];
  if (!arrays.every((v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite))) {
    return { status: 'INDETERMINATE', reason: 'Entrada geométrica ausente ou inválida.' };
  }
  const unit = (v) => { const n = length(v); return n > 0 ? [v[0] / n, v[1] / n, v[2] / n] : null; };
  const upUnit = unit(up);
  if (!upUnit) return { status: 'INDETERMINATE', reason: 'Eixo vertical nulo.' };
  const flat = sub(forward, upUnit.map((x) => x * dot(forward, upUnit)));
  const forwardUnit = unit(flat);
  if (!forwardUnit) return { status: 'INDETERMINATE', reason: 'Direção frontal paralela à vertical.' };
  const characterRight = cross(forwardUnit, upUnit);
  const sideR = dot(sub(shoulderR, root), characterRight);
  const sideL = dot(sub(shoulderL, root), characterRight);
  const separation = sideR - sideL;
  const base = { rightBoneOffset: sideR, leftBoneOffset: sideL, separation };
  if (Math.abs(separation) < minSeparation) return { status: 'INDETERMINATE', reason: 'Ombros sem separação lateral mensurável.', ...base };
  // `.R` is anatomically right only when it lies further along characterRight than `.L`.
  const matches = separation > 0;
  return {
    status: matches ? 'MATCHES_ROLES' : 'MIRRORED',
    reason: matches
      ? 'O sufixo .R está no lado direito anatômico da personagem.'
      : 'O sufixo .R está no lado esquerdo anatômico: o rig parece espelhado em relação ao rosto calibrado.',
    ...base,
  };
}
