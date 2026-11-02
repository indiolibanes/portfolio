/**
 * Moon Fox Reverie — authored language (degrees / metres). Pure data and maths: no three, no rig.
 * The choreography is original. The reference video only informed vocabulary and timing:
 * an asymmetric opening, a spiral of arcs, one deep inclination, a progressive recovery, a raised-arm finale.
 */
export const REVERIE_NAME = 'moon-fox-reverie';
export const REVERIE_GRAND_NAME = 'moon-fox-reverie-grand';

/** Movements as fractions of the phrase. Boundaries are shared by the bake, the director and the tests. */
export const MOVEMENTS = Object.freeze([
  {id: 'A', name: "Fox's Prelude", from: 0, to: .16},
  {id: 'B', name: 'Silk Spiral', from: .16, to: .44},
  {id: 'C', name: 'Lunar Bow', from: .44, to: .66},
  {id: 'D', name: 'Moonlit Recovery', from: .66, to: .78},
  {id: 'E', name: 'Foxfire Finale', from: .78, to: 1},
]);

/**
 * Interruptions inside these phase windows wait (slightly accelerated) until the body is upright again.
 * Outside them the inertial recovery returns from an upright, grounded posture.
 */
export const UNSAFE_WINDOWS = Object.freeze([[.46, .76]]);

/** Two variants share one score. `bow` (0..1) is the inclination profile; `bowHead` lets the head lag the torso. */
export const VARIANTS = Object.freeze({
  [REVERIE_NAME]: Object.freeze({
    seconds: 13.6, spine1: 12, spine2: 14, neck: 4, head: 3, hipBack: .040, hipDown: .045, armCounter: .5, minComMargin: .015,
  }),
  [REVERIE_GRAND_NAME]: Object.freeze({
    seconds: 14.4, spine1: 22, spine2: 26, neck: 8, head: 6, hipBack: .075, hipDown: .070, armCounter: .55, minComMargin: .015,
  }),
});
export const bowDegrees = v => v.spine1 + v.spine2 + v.neck + v.head;

export const KEYS = Object.freeze([
  {t: 0},
  // A — Fox's Prelude: shoulders anticipate, torso follows the dominant (right) hand, head counter-moves.
  {t: .03, shoulderR: 3, yaw: -1.5, headYaw: 1.5},
  {t: .075, shoulderR: 5, shoulderL: -1, outR: 22, liftR: 4, elbowR: 12, outL: 6, elbowL: 6, yaw: 2, headYaw: -1.5, headRoll: 1},
  {t: .12, shoulderR: 4, outR: 36, liftR: 9, elbowR: 22, wristR: 6, outL: 15, liftL: 2, elbowL: 12, yaw: 7, roll: 1.5, headYaw: -4, headRoll: 2.5},
  {t: .16, outR: 40, liftR: 10, elbowR: 26, wristR: 8, outL: 20, elbowL: 16, yaw: 8, roll: 1.2, headYaw: -3, headRoll: 2},
  // B — Silk Spiral: partial rotation, wide arcs; wrists finish after elbows (see FIELD_LAG).
  {t: .22, outR: 30, liftR: 20, elbowR: 32, wristR: 10, outL: 30, liftL: 6, elbowL: 24, wristL: 6, yaw: 3, roll: -2, headYaw: 2, headRoll: -1},
  {t: .28, outR: 16, liftR: 12, elbowR: 24, outL: 44, liftL: 14, elbowL: 30, wristL: 10, yaw: -8, roll: -3, headYaw: 5, headRoll: -2},
  {t: .34, outR: 28, liftR: -2, elbowR: 20, wristR: -4, outL: 34, liftL: 20, elbowL: 34, wristL: 12, yaw: -10, headYaw: 3},
  {t: .40, outR: 38, liftR: 6, elbowR: 26, outL: 22, liftL: 10, elbowL: 22, yaw: -3, roll: 2.5, headYaw: -2, headRoll: 1.5},
  {t: .44, outR: 30, liftR: 2, elbowR: 22, outL: 20, elbowL: 18, yaw: 2, roll: 1, headYaw: -1},
  // C — Lunar Bow: hips go back and down with locked feet, spine folds, arms balance.
  {t: .50, bow: .45, bowHead: .30, outR: 28, liftR: -6, elbowR: 18, outL: 22, liftL: 8, elbowL: 20, yaw: 4, headYaw: -2},
  {t: .56, bow: 1, bowHead: .85, outR: 32, liftR: -12, elbowR: 14, wristR: -6, outL: 26, liftL: 12, elbowL: 16, yaw: 6, headYaw: -4, headRoll: 2},
  {t: .60, bow: 1, bowHead: 1, outR: 30, liftR: -10, outL: 24, liftL: 10, yaw: 6, headYaw: -3, headRoll: 1.5},
  {t: .66, bow: .4, bowHead: .78, outR: 26, liftR: -2, elbowR: 18, outL: 20, liftL: 6, yaw: 3, headYaw: -1},
  // D — Moonlit Recovery: torso first, head late, shoulders accommodate, arms settle.
  {t: .72, bow: .1, bowHead: .38, outR: 18, elbowR: 16, outL: 16, elbowL: 14, shoulderR: 3, shoulderL: 3, yaw: 1, headRoll: 1},
  {t: .78, bow: 0, bowHead: .06, outR: 14, elbowR: 14, outL: 12, elbowL: 12, shoulderL: 1},
  // E — Foxfire Finale: one arm rises, the other answers, brief open silhouette, then an organic return.
  {t: .82, outR: 32, liftR: 8, elbowR: 18, wristR: 5, outL: 14, liftL: 4, elbowL: 12, yaw: 3, headYaw: -2, headRoll: 2, shoulderR: 3},
  {t: .875, outR: 64, liftR: 20, elbowR: 16, wristR: 10, outL: 30, liftL: 8, elbowL: 22, wristL: 6, yaw: 6, roll: -1.5, headYaw: -3, headRoll: 3, shoulderR: 5},
  {t: .905, outR: 66, liftR: 22, elbowR: 14, wristR: 12, outL: 32, liftL: 8, elbowL: 22, wristL: 6, yaw: 6.5, roll: -1.5, headYaw: -3, headRoll: 3.2, shoulderR: 5},
  {t: .945, outR: 38, liftR: 12, elbowR: 14, outL: 20, elbowL: 14, yaw: 3.5, headYaw: -1.5, headRoll: 1.6, shoulderR: 2},
  {t: .98, outR: 12, liftR: 3, elbowR: 8, outL: 7, elbowL: 6, yaw: 1, headYaw: -.3, headRoll: .3},
  {t: 1},
]);

/** Hip (root) offsets in metres: x lateral, y vertical, z forward. Bow lowering is added from the `bow` profile. */
export const HIP_KEYS = Object.freeze([
  {t: 0}, {t: .12, x: -.008}, {t: .16, x: -.010}, {t: .22, x: .012}, {t: .28, x: .020}, {t: .34, x: -.012}, {t: .40, x: -.018}, {t: .44},
  {t: .50, x: .020}, {t: .56, x: .030}, {t: .60, x: .030}, {t: .66, x: .012}, {t: .72, x: .006}, {t: .78},
  {t: .82, x: -.008}, {t: .875, x: -.012}, {t: .905, x: -.012}, {t: .945, x: -.008}, {t: .98, x: -.002}, {t: 1},
]);

/** Distal joints finish their curves slightly after proximal ones. */
const FIELD_LAG = Object.freeze({wrist: .028, elbow: .014, head: .010, neck: .007});
const lagFor = field => /wrist/.test(field) ? FIELD_LAG.wrist : /elbow/.test(field) ? FIELD_LAG.elbow : /^head|bowHead/.test(field) ? FIELD_LAG.head : 0;

/** Monotone cubic Hermite (Fritsch–Carlson), zero slope at both ends. Continuous velocity: not stop-and-go at every key. */
export function pchip(keys, field, t) {
  const n = keys.length;
  if (t <= keys[0].t) return keys[0][field] ?? 0;
  if (t >= keys[n - 1].t) return keys[n - 1][field] ?? 0;
  let i = 0; while (i < n - 2 && t > keys[i + 1].t) i++;
  const y = keys.map(k => k[field] ?? 0), x = keys.map(k => k.t), h = [], d = [];
  for (let j = 0; j < n - 1; j++) { h[j] = x[j + 1] - x[j]; d[j] = (y[j + 1] - y[j]) / h[j]; }
  const slope = j => {
    if (j === 0 || j === n - 1) return 0;
    if (d[j - 1] * d[j] <= 0) return 0;
    const w1 = 2 * h[j] + h[j - 1], w2 = h[j] + 2 * h[j - 1];
    return (w1 + w2) / (w1 / d[j - 1] + w2 / d[j]);
  };
  const m0 = slope(i), m1 = slope(i + 1), u = (t - x[i]) / h[i], u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * y[i] + (u3 - 2 * u2 + u) * h[i] * m0 + (-2 * u3 + 3 * u2) * y[i + 1] + (u3 - u2) * h[i] * m1;
}

/** Lag is applied as a time warp that still lands exactly on 0 and 1, so the phrase starts and ends on the reference. */
export const field = (name, t) => { const lag = lagFor(name); return pchip(KEYS, name, Math.max(0, Math.min(1, (t - lag) / (1 - lag)))); };
const hip = (name, t) => pchip(HIP_KEYS, name, t);

/** Every authored scalar at phrase fraction t, for one variant. Angles in degrees, offsets in metres. */
export function evaluate(variantName, t) {
  const v = VARIANTS[variantName];
  if (!v) throw Error('Unknown reverie variant ' + variantName);
  t = Math.max(0, Math.min(1, t));
  const bow = Math.max(0, Math.min(1, field('bow', t))), head = Math.max(0, Math.min(1, field('bowHead', t)));
  const out = {};
  for (const name of ['yaw', 'roll', 'headYaw', 'headRoll', 'shoulderL', 'shoulderR', 'outL', 'outR', 'liftL', 'liftR', 'elbowL', 'elbowR', 'wristL', 'wristR']) out[name] = field(name, t);
  out.pitch1 = bow * v.spine1;
  out.pitch2 = bow * v.spine2;
  out.neckPitch = head * v.neck;
  out.headPitch = head * v.head;
  out.armCounter = -v.armCounter * (out.pitch1 + out.pitch2);
  out.bow = bow;
  const breath = Math.sin(Math.PI * t) ** 2;
  out.hipX = hip('x', t);
  out.hipY = -.008 * breath - bow * v.hipDown;
  out.hipZ = -bow * v.hipBack;
  out.spineDegrees = out.pitch1 + out.pitch2 + out.neckPitch + out.headPitch;
  return out;
}

/** Sampled count: ~15 Hz. The runtime interpolates with a cubic through these samples. */
export const sampleCount = variantName => Math.round(VARIANTS[variantName].seconds * 15) + 1;
