/**
 * Organic timing for a lifted arm. Pure math: no THREE, no rig, no DOM.
 *
 * Three ideas, all functions of the gesture's own eased weight so that the collision guard can
 * sample exactly the poses that are later performed:
 *  1. Overlap. Shoulder, forearm and hand follow the same route but not in lockstep: the upper
 *     arm leads and the distal segments arrive later (a power curve on the shared weight).
 *     Endpoints are exact: weight 0 is the rest pose and weight 1 the final pose.
 *  2. Breath. While the hand rests, the whole arm moves a fraction of a degree with a slow
 *     breathing signal, faded in only near the final pose.
 *  3. Varied durations. Entry, hold and exit are drawn per gesture instead of fixed.
 */
const clamp01 = (t) => Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));

export const LIMB_PARTS = Object.freeze(['upper', 'fore', 'hand']);

/** Exponents applied to the shared weight; larger = arrives later. upper >= fore >= hand in value. */
export const LIMB_LAG = Object.freeze({ upper: 1, fore: 1.22, hand: 1.5 });

export function limbWeights(t) {
  const w = clamp01(t);
  return { upper: Math.pow(w, LIMB_LAG.upper), fore: Math.pow(w, LIMB_LAG.fore), hand: Math.pow(w, LIMB_LAG.hand) };
}

/** Seconds per breath, and how far each segment's world orientation moves at full breath (radians). */
export const BREATH_PERIOD = 4.6;
export const BREATH_ANGLE = Object.freeze({ upper: 0.0175, fore: 0.0140, hand: 0.0105 }); // about 1.0°, 0.8°, 0.6°

/** Slow breathing signal in -1..1. */
export const breathSignal = (clock, phase = 0) => Math.sin((2 * Math.PI * clock) / BREATH_PERIOD + phase);

/** Zero until the arm is nearly home, then a smooth fade-in. Exactly 0 at and below `.88`. */
export function breathEnvelope(weight) {
  const t = clamp01((clamp01(weight) - 0.88) / 0.12);
  return t * t * (3 - 2 * t);
}

/** World-orientation deltas per segment for a breath signal `scale` in -1..1 at gesture `weight`. */
export function breathAngles(scale, weight) {
  const s = Math.max(-1, Math.min(1, Number.isFinite(scale) ? scale : 0)) * breathEnvelope(weight);
  // `+ 0` turns a negative zero into a plain zero, so "no breath" is the same value for every caller.
  return { upper: s * BREATH_ANGLE.upper + 0, fore: s * BREATH_ANGLE.fore + 0, hand: s * BREATH_ANGLE.hand + 0 };
}

/** The original fixed schedule, kept as the default so existing callers behave exactly as before. */
export const CHEST_TIMING = Object.freeze({ entry: 1.8, hold: 2.2, exit: 1.8 });

/** Ranges for a performance that does not repeat itself. */
export const ORGANIC_CHEST_TIMING = Object.freeze({ entry: [2.0, 2.7], hold: [2.8, 4.6], exit: [2.0, 2.8] });

/** `random` is any function returning a number in [0, 1). */
export function organicChestTiming(random, ranges = ORGANIC_CHEST_TIMING) {
  const draw = ([low, high]) => low + (high - low) * random();
  return { entry: draw(ranges.entry), hold: draw(ranges.hold), exit: draw(ranges.exit) };
}
