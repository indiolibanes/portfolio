/**
 * Optional composition between the two hands. Pure vector arithmetic on plain 3-arrays.
 *
 * When the right hand rests under the chin, the left hand may stop a little nearer to it
 * instead of at the plain chest target, so the pair reads as one composition. This is a small
 * pull, not a meeting: the shift stays inside the torso plane, is capped, and never takes the
 * hands closer than `minGap`. If there is no room, nothing moves.
 * All distances are in `eyeSpan` units (the calibrated inter-eye distance), scaled by the caller.
 */
export const COMPOSITION = Object.freeze({
  /** Fraction of the in-plane distance to the companion hand that the target may travel. */
  pull: 0.32,
  /** Hard cap on the shift. */
  maxShift: 0.55,
  /** The composed target never ends closer than this to the companion reference point. */
  minGap: 2.4,
  /** Along the whole route, no point of one hand may come nearer than this to the other hand. */
  hardGap: 1.0,
  /** Probability that an eligible gesture uses the composed variant. */
  chance: 0.55,
});

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const finite = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

/**
 * @param target     plain chest target (world, 3-array)
 * @param companion  reference point of the other hand (world, 3-array)
 * @param forward    unit vector out of the chest; the shift never moves along it
 * @param eyeSpan    length unit
 * @returns {{accepted:boolean, target:number[], shift:number, gap:number, reason:string}}
 *   `shift` and `gap` are in world units; `target` equals the input when not accepted.
 */
export function composeChestTarget({ target, companion, forward, eyeSpan, pull = COMPOSITION.pull, maxShift = COMPOSITION.maxShift, minGap = COMPOSITION.minGap }) {
  const reject = (reason, gap = NaN) => ({ accepted: false, target: finite(target) ? [...target] : target, shift: 0, gap, reason });
  if (![target, companion, forward].every(finite) || !(eyeSpan > 0)) return reject('Entrada de composição inválida.');
  const norm = Math.hypot(...forward);
  if (!(norm > 0)) return reject('Direção frontal nula.');
  const f = scale(forward, 1 / norm);
  const toCompanion = sub(companion, target);
  const depth = dot(toCompanion, f);
  const inPlane = sub(toCompanion, scale(f, depth));
  const distance = Math.hypot(...inPlane);
  if (!(distance > 1e-9)) return reject('Mão de apoio alinhada com o alvo: sem direção para aproximar.');
  const unit = scale(inPlane, 1 / distance);
  const gapAt = (shift) => Math.hypot(distance - shift, depth);
  const required = minGap * eyeSpan;
  if (gapAt(0) < required) return reject('As mãos já estão mais próximas que o mínimo: sem composição.', gapAt(0));
  let shift = Math.min(pull * distance, maxShift * eyeSpan);
  if (gapAt(shift) < required) {
    const room = required * required - depth * depth;
    shift = room > 0 ? Math.max(0, Math.min(shift, distance - Math.sqrt(room))) : shift;
  }
  if (!(shift > 1e-6 * eyeSpan)) return reject('Sem folga para aproximar as mãos.', gapAt(0));
  return { accepted: true, target: add(target, scale(unit, shift)), shift, gap: gapAt(shift), reason: 'Composição calculada.' };
}
