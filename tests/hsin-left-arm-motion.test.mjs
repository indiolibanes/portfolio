// Left-arm motion maths: overlap timing, breath, varied durations and the optional hand composition.
// Pure functions only: no THREE, no rig, no GLB. Geometry-dependent behaviour lives in hsin-chest-rig.test.mjs.
import assert from 'node:assert/strict';
import {
  BREATH_ANGLE, BREATH_PERIOD, CHEST_TIMING, LIMB_LAG, ORGANIC_CHEST_TIMING,
  breathAngles, breathEnvelope, breathSignal, limbWeights, organicChestTiming,
} from '../src/scripts/hsin-limb-motion.mjs';
import {COMPOSITION, composeChestTarget} from '../src/scripts/hsin-hand-composition.mjs';

const lcg = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; };

// ---------------------------------------------------------------------------------------------
// 1. Overlap: the shoulder leads, forearm and hand arrive later, endpoints are exact.
// ---------------------------------------------------------------------------------------------
{
  const rest = limbWeights(0), home = limbWeights(1);
  assert.deepEqual(rest, {upper: 0, fore: 0, hand: 0});
  assert.deepEqual(home, {upper: 1, fore: 1, hand: 1}); // exact, so restoration and the final pose carry no rounding
  assert.deepEqual(limbWeights(-3), rest);
  assert.deepEqual(limbWeights(7), home);
  assert.deepEqual(limbWeights(NaN), rest);
  assert.ok(LIMB_LAG.upper <= LIMB_LAG.fore && LIMB_LAG.fore <= LIMB_LAG.hand);
  let previous = limbWeights(0), widest = 0;
  for (let i = 1; i <= 4000; i++) {
    const t = i / 4000, w = limbWeights(t);
    assert.ok(w.upper >= w.fore - 1e-12 && w.fore >= w.hand - 1e-12, 'proximal segments are never behind distal ones');
    for (const part of ['upper', 'fore', 'hand']) assert.ok(w[part] >= previous[part] - 1e-12, `${part} never moves backwards`);
    widest = Math.max(widest, w.upper - w.hand);
    previous = w;
  }
  // The segments stay one arm: the hand never trails the shoulder by more than a modest share of the route.
  assert.ok(widest > 0.05, 'there is a visible overlap');
  assert.ok(widest < 0.2, `but the arm does not come apart (widest gap ${widest.toFixed(3)})`);
  const half = limbWeights(.5);
  assert.ok(half.hand < half.fore && half.fore < half.upper);
}

// ---------------------------------------------------------------------------------------------
// 2. Breath: tiny, slow, zero away from the final pose, symmetric.
// ---------------------------------------------------------------------------------------------
{
  assert.equal(breathEnvelope(0), 0);
  assert.equal(breathEnvelope(.5), 0);
  assert.equal(breathEnvelope(.88), 0);
  assert.equal(breathEnvelope(1), 1);
  assert.equal(breathEnvelope(2), 1);
  let last = 0;
  for (let i = 0; i <= 1000; i++) { const e = breathEnvelope(i / 1000); assert.ok(e >= last - 1e-12 && e >= 0 && e <= 1); last = e; }
  for (const scale of [-1, -.4, 0, .7, 1]) {
    for (const weight of [0, .3, .88]) assert.deepEqual(breathAngles(scale, weight), {upper: 0, fore: 0, hand: 0}, 'no breath before the arm is home');
  }
  assert.deepEqual(breathAngles(0, 1), {upper: 0, fore: 0, hand: 0});
  const up = breathAngles(1, 1), down = breathAngles(-1, 1);
  for (const part of ['upper', 'fore', 'hand']) {
    assert.equal(up[part], -down[part], 'symmetric about rest');
    assert.ok(Math.abs(up[part]) <= BREATH_ANGLE[part] + 1e-12);
  }
  assert.ok(Math.abs(breathAngles(9, 1).upper) <= BREATH_ANGLE.upper, 'a runaway scale is clamped');
  // Small enough to read as breath, not as movement.
  const largestDegrees = Math.max(...Object.values(BREATH_ANGLE)) * 180 / Math.PI;
  assert.ok(largestDegrees <= 1.2, `breath stays within about a degree (${largestDegrees.toFixed(2)}°)`);
  assert.ok(BREATH_ANGLE.upper >= BREATH_ANGLE.fore && BREATH_ANGLE.fore >= BREATH_ANGLE.hand, 'the hand moves least');
  assert.ok(Math.abs(breathSignal(0)) < 1e-12);
  assert.ok(Math.abs(breathSignal(BREATH_PERIOD)) < 1e-9);
  assert.ok(Math.abs(breathSignal(BREATH_PERIOD / 4) - 1) < 1e-12);
  for (let i = 0; i < 500; i++) assert.ok(Math.abs(breathSignal(i * .037)) <= 1);
  assert.ok(BREATH_PERIOD > 3 && BREATH_PERIOD < 7, 'a resting breath, not a tremor');
}

// ---------------------------------------------------------------------------------------------
// 3. Durations: the old schedule stays the default; the organic one is bounded and reproducible.
// ---------------------------------------------------------------------------------------------
{
  assert.deepEqual({...CHEST_TIMING}, {entry: 1.8, hold: 2.2, exit: 1.8});
  assert.ok(Object.isFrozen(CHEST_TIMING) && Object.isFrozen(ORGANIC_CHEST_TIMING));
  const draw = (seed) => { const random = lcg(seed); return Array.from({length: 400}, () => organicChestTiming(random)); };
  const run = draw(5);
  assert.deepEqual(run, draw(5), 'same seed, same performance');
  assert.notDeepEqual(run, draw(6));
  for (const t of run) {
    for (const key of ['entry', 'hold', 'exit']) {
      assert.ok(t[key] >= ORGANIC_CHEST_TIMING[key][0] && t[key] <= ORGANIC_CHEST_TIMING[key][1], `${key} within its range`);
    }
  }
  assert.ok(new Set(run.map((t) => t.hold.toFixed(2))).size > 100, 'durations really vary');
  assert.ok(ORGANIC_CHEST_TIMING.entry[0] >= 1.8 && ORGANIC_CHEST_TIMING.exit[0] >= 1.8, 'never snappier than the old schedule');
  assert.ok(ORGANIC_CHEST_TIMING.hold[1] > BREATH_PERIOD * .9, 'a long hold can contain a whole breath');
}

// ---------------------------------------------------------------------------------------------
// 4. Hand composition.
// ---------------------------------------------------------------------------------------------
{
  const forward = [0, 0, 1];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  // Plenty of room: the target travels up toward the companion by the capped amount, never along `forward`.
  const roomy = composeChestTarget({target: [0, 0, 0], companion: [0, 6, 1], forward, eyeSpan: 1});
  assert.equal(roomy.accepted, true);
  assert.ok(Math.abs(roomy.shift - COMPOSITION.maxShift) < 1e-12, 'capped by maxShift');
  assert.deepEqual(roomy.target.map((x) => Math.round(x * 1e9) / 1e9), [0, COMPOSITION.maxShift, 0]);
  assert.equal(roomy.target[2], 0, 'the shift stays in the torso plane');
  assert.ok(roomy.gap >= COMPOSITION.minGap);
  // Close companion: shift is limited so the gap lands exactly on the minimum.
  const tight = composeChestTarget({target: [0, 0, 0], companion: [0, 2.6, 0], forward, eyeSpan: 1});
  assert.equal(tight.accepted, true);
  assert.ok(Math.abs(tight.shift - .2) < 1e-9);
  assert.ok(tight.gap >= COMPOSITION.minGap - 1e-9);
  // Too close already: refuses, target untouched.
  const crowded = composeChestTarget({target: [0, 0, 0], companion: [0, 1.5, 0], forward, eyeSpan: 1});
  assert.equal(crowded.accepted, false);
  assert.deepEqual(crowded.target, [0, 0, 0]);
  assert.equal(crowded.shift, 0);
  assert.match(crowded.reason, /mais próximas/);
  // Exactly at the minimum: no room to move.
  assert.equal(composeChestTarget({target: [0, 0, 0], companion: [0, COMPOSITION.minGap, 0], forward, eyeSpan: 1}).accepted, false);
  // Depth between the hands buys room: a companion far in front can be approached laterally.
  const deep = composeChestTarget({target: [0, 0, 0], companion: [0, 2.6, 2.4], forward, eyeSpan: 1});
  assert.equal(deep.accepted, true);
  assert.ok(deep.shift > .2, 'depth leaves more room than a flat configuration');
  // Distances scale with eyeSpan.
  const scaled = composeChestTarget({target: [0, 0, 0], companion: [0, 12, 2], forward, eyeSpan: 2});
  assert.ok(Math.abs(scaled.shift - COMPOSITION.maxShift * 2) < 1e-12);
  // Degenerate and invalid input is rejected, never NaN.
  for (const bad of [
    {target: [0, 0, 0], companion: [0, 0, 5], forward, eyeSpan: 1}, // companion straight ahead: no in-plane direction
    {target: [0, 0, 0], companion: [0, 5, 0], forward: [0, 0, 0], eyeSpan: 1},
    {target: [0, 0, 0], companion: [0, 5, 0], forward, eyeSpan: 0},
    {target: [0, 0, 0], companion: [NaN, 5, 0], forward, eyeSpan: 1},
    {target: [0, 0], companion: [0, 5, 0], forward, eyeSpan: 1},
    {},
  ]) {
    const result = composeChestTarget(bad);
    assert.equal(result.accepted, false);
    assert.equal(result.shift, 0);
  }
  // A non-unit forward is normalised.
  assert.equal(composeChestTarget({target: [0, 0, 0], companion: [0, 6, 1], forward: [0, 0, 9], eyeSpan: 1}).accepted, true);

  // Properties over many reproducible configurations.
  const random = lcg(2026);
  let accepted = 0, refused = 0;
  for (let i = 0; i < 4000; i++) {
    const span = .5 + random() * 2;
    const f = [random() - .5, random() - .5, random() + .2];
    const n = Math.hypot(...f), unit = f.map((x) => x / n);
    const target = [random() * 4 - 2, random() * 4 - 2, random() * 4 - 2];
    const reach = random() < .5 ? 2.2 : 12; // half the cases are near enough to be refused or trimmed
    const companion = target.map((x) => x + (random() * 2 - 1) * reach * span);
    const result = composeChestTarget({target, companion, forward: unit, eyeSpan: span});
    const before = dist(target, companion);
    if (!result.accepted) { refused++; assert.deepEqual(result.target, target); continue; }
    accepted++;
    const moved = result.target.map((x, k) => x - target[k]);
    assert.ok(Math.hypot(...moved) <= COMPOSITION.maxShift * span + 1e-9, 'shift is capped');
    assert.ok(Math.abs(moved[0] * unit[0] + moved[1] * unit[1] + moved[2] * unit[2]) < 1e-9, 'no movement along forward');
    assert.ok(result.gap >= COMPOSITION.minGap * span - 1e-9, 'hands never closer than the minimum gap');
    assert.ok(Math.abs(dist(result.target, companion) - result.gap) < 1e-9, 'reported gap is the real gap');
    assert.ok(dist(result.target, companion) < before + 1e-12, 'the hands approach, never separate');
    assert.ok(Math.abs(result.shift - Math.hypot(...moved)) < 1e-9);
  }
  assert.ok(accepted > 500 && refused > 100, `the property run exercised both outcomes (${accepted}/${refused})`);
  assert.ok(COMPOSITION.hardGap < COMPOSITION.minGap, 'the route may pass nearer than the resting target, but never touch');
  assert.ok(COMPOSITION.chance > 0 && COMPOSITION.chance < 1, 'composition is occasional, not a rule');
}

console.log('Left-arm motion: overlap timing with exact endpoints, bounded breath, varied durations and guarded hand composition PASS');
