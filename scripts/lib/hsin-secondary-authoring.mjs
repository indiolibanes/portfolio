/**
 * Offline secondary motion: hair, sleeves/ribbons and tail already exist in the GLB as skinned ORG-Bone_* chains.
 * Their lag is generated here with a damped follower, quantised, and replayed. There is no cloth or hair physics at run time.
 */
export const SECONDARY_GROUPS = Object.freeze({
  hair: Object.freeze({maxDegrees: Object.freeze({sway: 9, pitch: 20}), delayPerDepth: .045, omega: 9, zeta: .55, velocityReference: .22, angularReference: 2.4, gravity: .6}),
  sleeveL: Object.freeze({maxDegrees: Object.freeze({sway: 14, pitch: 14}), delayPerDepth: .035, omega: 12, zeta: .6, velocityReference: .8, angularReference: 3.2, gravity: .12}),
  sleeveR: Object.freeze({maxDegrees: Object.freeze({sway: 14, pitch: 14}), delayPerDepth: .035, omega: 12, zeta: .6, velocityReference: .8, angularReference: 3.2, gravity: .12}),
  tail: Object.freeze({maxDegrees: Object.freeze({sway: 12, pitch: 20}), delayPerDepth: .06, omega: 8, zeta: .5, velocityReference: .22, angularReference: 2, gravity: .55}),
});

/** Classifies a skinned secondary bone by name and nearest non-secondary ancestor. Returns null for bones left alone. */
export function classifySecondary(name, ancestorNames) {
  if (!/^ORG-Bone_(Hair|Piao|Tail)/.test(name)) return null;
  if (/^ORG-Bone_Tail/.test(name)) return 'tail';
  const anchor = ancestorNames.find(n => !/^ORG-Bone_/.test(n)) ?? '';
  if (/Head|Neck/.test(anchor) || /^ORG-Bone_Hair/.test(name)) return 'hair';
  // three.js strips '.' from node names, so 'Bip001UpArmTwist2.L' arrives as 'Bip001UpArmTwist2L'.
  if (/L$/.test(anchor) || /_L$/.test(name)) return 'sleeveL';
  if (/R$/.test(anchor) || /_R$/.test(name)) return 'sleeveR';
  return null;
}

/** Chain depth of a bone below its first non-secondary ancestor, and the chain's total length. */
export function chainWeights(depth, chainLength) {
  const gain = Math.pow((depth + 1) / Math.max(1, chainLength), 1.15);
  return {gain: +Math.min(1, depth === 0 ? .1 + gain * .5 : gain).toFixed(3)};
}

/** Critically-shaped second-order follower, sub-stepped. `target(i)` is sampled once per authored frame. */
export function follow(targets, dt, {omega, zeta, substeps = 16}) {
  const out = new Float64Array(targets.length);
  let x = 0, v = 0; const h = dt / substeps;
  for (let i = 0; i < targets.length; i++) {
    for (let s = 0; s < substeps; s++) {
      const a = omega * omega * (targets[i] - x) - 2 * zeta * omega * v;
      v += a * h; x += v * h;
    }
    out[i] = x;
  }
  return out;
}

const smoothstep = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
/** Zero exactly at both ends: the phrase starts and ends on the untouched reference pose. */
export const envelope = t => smoothstep(0, .03, t) * (1 - smoothstep(.93, 1, t));

/**
 * @param drive {vl, vf, wUp, bow}: per-frame anchor velocity (m/s) on lateral/forward, yaw rate (rad/s) and bow profile 0..1
 * Returns two normalised tracks, -1..1: sway (about the forward axis) and pitch (about the lateral axis).
 */
export function buildTracks(drive, dt, group) {
  const n = drive.vl.length, sway = new Float64Array(n), pitch = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    sway[i] = Math.tanh(-drive.vl[i] / group.velocityReference) * .8 + Math.tanh(-drive.wUp[i] / group.angularReference) * .5;
    // Positive pitch swings a hanging strand backwards; forward anchor motion therefore drives it positive, and a forward bow pulls it back toward vertical.
    pitch[i] = Math.tanh(drive.vf[i] / group.velocityReference) * .8 - group.gravity * drive.bow[i];
  }
  const a = follow(sway, dt, group), b = follow(pitch, dt, group), out = {sway: [], pitch: []};
  for (let i = 0; i < n; i++) {
    const e = envelope(i / (n - 1));
    out.sway.push(Math.max(-1, Math.min(1, a[i])) * e);
    out.pitch.push(Math.max(-1, Math.min(1, b[i])) * e);
  }
  out.sway[0] = out.pitch[0] = out.sway[n - 1] = out.pitch[n - 1] = 0;
  return out;
}

export const quantise = track => track.map(v => Math.round(Math.max(-1, Math.min(1, v)) * 32767));
