/**
 * R6.2 G11 · pre-peak body stability (EDITORIAL, reversible, source clip untouched).
 *
 * Diagnosis (measured, see G11_REPORT.md): in SK_BURST_02_ORIGINAL the whole body swings side to side at
 * ~2.9 Hz (hips world sway ~+-0.14 u, ~9 % of the model height, yaw ripple ~12 deg p-p) from sequence time
 * ~22.4 s to ~24.1 s, right before the launch / spin that precedes the Stellarealm peak. The cause is the
 * `Root.quaternion` curve (+-5 deg ripple about a pivot ~0.8 u away from the hips); the hips' own tracks are
 * almost still. It is source-clip content (a raw AnimationMixer sample matches the director pose to < 1 mm);
 * it is NOT the camera and NOT VFX.
 *
 * Treatment: `Root.quaternion` is NOT modified. The clip is CLONED and only the hips tracks
 * (`Bip001.position`, `Bip001.quaternion`) are re-expressed so that the world result equals
 * `Root_eff * Bip001`, with `Root_eff = slerp(Root, LowPass(Root), w(t) * alpha)` (Gaussian low-pass,
 * sigma 0.18 s, flat hold after the window) - i.e. `Bip001' = (Root^-1 * Root_eff) * Bip001` (so that Root * Bip001' = Root_eff * Bip001). `w` is a smooth
 * window that is 0 before the blend-in has finished and 0 again BEFORE the launch. Everything else (spine,
 * arms, hair, cloth, weapon props, Root, every other clip) is the original data. No second mixer, no runtime bone write: the derived clip goes through the existing
 * combo sequencer, so seek / pause / restart / interrupt are bit-identical for the same absolute time.
 *
 * `off` returns the original clip object. Pure functions of (clip, preset); no clock, RAF or random.
 */
export const BODY_STABILITY_PRESETS = Object.freeze({off: 0, soft: 0.55, standard: 0.75});
export const BODY_STABILITY_CLIP = 'SK_BURST_02_ORIGINAL';
/** Clip-local seconds (burst segment starts at sequence 22.133 s and enters at clip time 0). */
export const BODY_STABILITY_WINDOW = Object.freeze({rampIn: [0.20, 0.45], rampOut: [1.82, 1.97], holdAt: 1.917, sigma: 0.18});
const TRACKS = ['Bip001.position', 'Bip001.quaternion'];
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export const stabilityWeight = (tc, W = BODY_STABILITY_WINDOW) => smooth((tc - W.rampIn[0]) / (W.rampIn[1] - W.rampIn[0])) * (1 - smooth((tc - W.rampOut[0]) / (W.rampOut[1] - W.rampOut[0])));

/** Evaluate a track at tc with a copy of the interpolant result (no shared buffer). */
function sampler(track) {
  const it = track.createInterpolant(), n = track.getValueSize();
  return tc => { const r = it.evaluate(tc); const o = new Array(n); for (let i = 0; i < n; i++) o[i] = r[i]; return o; };
}
function kernel(W, dt) {
  const half = Math.ceil(4 * W.sigma / dt), g = []; let s = 0;
  for (let k = -half; k <= half; k++) { const v = Math.exp(-((k * dt) ** 2) / (2 * W.sigma ** 2)); g.push(v); s += v; }
  return {half, g: g.map(v => v / s)};
}
function lowPass(sample, tc, K, dt, W, size, quat) {
  const acc = new Array(size).fill(0); let ref = null;
  if (quat) ref = sample(Math.min(tc, W.holdAt));
  for (let k = -K.half; k <= K.half; k++) {
    const v = sample(Math.max(0, Math.min(tc + k * dt, W.holdAt)));
    let sgn = 1;
    if (quat) sgn = (v[0] * ref[0] + v[1] * ref[1] + v[2] * ref[2] + v[3] * ref[3]) < 0 ? -1 : 1;
    const g = K.g[k + K.half] * sgn;
    for (let i = 0; i < size; i++) acc[i] += g * v[i];
  }
  if (quat) { const n = Math.hypot(...acc) || 1; for (let i = 0; i < 4; i++) acc[i] /= n; }
  return acc;
}
function slerp(a, b, s) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b;
  if (d < 0) { bb = b.map(v => -v); d = -d; }
  if (d > 0.9995) { const o = a.map((v, i) => v + (bb[i] - v) * s); const n = Math.hypot(...o); return o.map(v => v / n); }
  const th = Math.acos(d), sin = Math.sin(th), w1 = Math.sin((1 - s) * th) / sin, w2 = Math.sin(s * th) / sin;
  return a.map((v, i) => v * w1 + bb[i] * w2);
}

/**
 * @returns {{clip, preset, strength, changedTracks, peakCorrection}} - `clip` is the ORIGINAL object when
 * strength is 0 or the expected tracks are missing / not plain (then `blocked` explains why).
 */
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qinv = q => [-q[0], -q[1], -q[2], q[3]];
const qrot = (q, v) => { const r = qmul(qmul(q, [v[0], v[1], v[2], 0]), qinv(q)); return [r[0], r[1], r[2]]; };
const none = (clip, preset, blocked) => ({clip, preset, strength: 0, changedTracks: [], peakCorrection: {position: 0, angleDeg: 0}, blocked});
export function deriveStabilizedBurst(original, preset = 'standard', W = BODY_STABILITY_WINDOW) {
  const alpha = BODY_STABILITY_PRESETS[preset];
  if (alpha === undefined) throw new TypeError('Body stability: unknown preset ' + preset);
  if (!original || original.name !== BODY_STABILITY_CLIP) return none(original, preset, 'NOT_THE_BURST_SOURCE');
  if (alpha === 0) return none(original, preset, null);
  const find = n => original.tracks.findIndex(t => t.name === n);
  const iR = find('Root.quaternion'), iP = find(TRACKS[0]), iQ = find(TRACKS[1]);
  const plain = iR >= 0 && iP >= 0 && iQ >= 0 && [[iR, 4], [iP, 3], [iQ, 4]].every(([i, k]) => original.tracks[i].values.length === original.tracks[i].times.length * k);
  if (!plain) return none(original, preset, 'BODY_JITTER_SOURCE_BLOCKED:Root_or_Bip001_tracks_missing_or_not_plain');
  const dt = 1 / 120, K = kernel(W, dt), clip = original.clone(); clip.name = original.name + '_G11_PREPEAK_STABLE';
  const root = sampler(original.tracks[iR]);
  // Correction rotation C = Root^-1 * Root_eff at clip time tc (identity outside the window): Root * (C * Bip001) = Root_eff * Bip001.
  const correction = tc => {
    const w = stabilityWeight(tc, W); if (w <= 0) return null;
    const r = root(tc), lp = lowPass(root, tc, K, dt, W, 4, true);
    return qmul(qinv(r), slerp(r, lp, w * alpha));
  };
  let peakPos = 0, peakAng = 0;
  [[iP, 3], [iQ, 4]].forEach(([ti, size]) => {
    const src = original.tracks[ti], sample = sampler(src), out = src.clone();
    for (let k = 0; k < src.times.length; k++) {
      const C = correction(src.times[k]); if (!C) continue;
      const v = sample(src.times[k]);
      if (size === 4) { const q = qmul(C, v), n = Math.hypot(...q); for (let i = 0; i < 4; i++) out.values[k * 4 + i] = q[i] / n; peakAng = Math.max(peakAng, 2 * Math.acos(Math.min(1, Math.abs(C[3]))) * 180 / Math.PI); }
      else { const p = qrot(C, v); for (let i = 0; i < 3; i++) out.values[k * 3 + i] = p[i]; peakPos = Math.max(peakPos, Math.hypot(p[0] - v[0], p[1] - v[1], p[2] - v[2])); }
    }
    clip.tracks[ti] = out;
  });
  return {clip, preset, strength: alpha, changedTracks: TRACKS.slice(), peakCorrection: {position: peakPos, angleDeg: peakAng}, blocked: null};
}
