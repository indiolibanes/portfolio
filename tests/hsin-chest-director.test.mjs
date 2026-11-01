// Chest director behaviour with a fake pose: no THREE, no rig, no GLB.
// The geometric side (collision guard, restoration on a real skeleton) lives in hsin-chest-rig.test.mjs.
import assert from 'node:assert/strict';
import {createChestDirector} from '../src/scripts/hsin-chest-gesture.mjs';
import {BREATH_ANGLE, CHEST_TIMING, ORGANIC_CHEST_TIMING, breathAngles} from '../src/scripts/hsin-limb-motion.mjs';
import {COMPOSITION} from '../src/scripts/hsin-hand-composition.mjs';

function fakePose({composedOk = true} = {}) {
  const state = {value: 0, calls: [], selected: [], restores: 0};
  return {
    state,
    diagnostics: () => ({ready: true}),
    atBaseline: () => state.value === 0,
    apply(t, options) { state.value = t; state.calls.push({t, options}); },
    restore() { state.value = 0; state.restores++; },
    select(label) { state.selected.push(label); return label === 'plain' || composedOk; },
  };
}
const run = (actor, step = .02, limit = 4000) => { let n = 0; while (actor.busy() && n++ < limit) actor.advance(step); assert.ok(n < limit, 'the gesture ends'); return n; };

// ---------------------------------------------------------------------------------------------
// 1. Default schedule is the approved one, spent exactly.
// ---------------------------------------------------------------------------------------------
{
  const pose = fakePose(), events = [];
  const actor = createChestDirector({pose, seed: 3, onEvent: (e) => events.push(e)});
  assert.deepEqual(actor.diagnostics().spans, {...CHEST_TIMING});
  assert.equal(actor.start(true), true);
  assert.deepEqual(actor.diagnostics().spans, {entry: 1.8, hold: 2.2, exit: 1.8});
  actor.advance(1.8); assert.equal(pose.state.value, 1, 'entry ends exactly at the final pose');
  actor.advance(2.2); assert.equal(pose.state.value, 1);
  actor.advance(1.8); assert.equal(pose.state.value, 0, 'exit ends exactly at rest');
  assert.equal(pose.state.restores, 1);
  assert.deepEqual(events, ['gesture:prepare', 'gesture:hold', 'gesture:release']);
  assert.deepEqual(pose.state.selected, ['plain'], 'with composition not wired the plain variant is always chosen');
}

// ---------------------------------------------------------------------------------------------
// 2. Organic durations: bounded, different per gesture, reproducible from the seed.
// ---------------------------------------------------------------------------------------------
{
  const spansFor = (seed, count) => {
    const pose = fakePose(), actor = createChestDirector({pose, seed, organic: true}), list = [];
    for (let i = 0; i < count; i++) { assert.equal(actor.start(true), true); list.push({...actor.diagnostics().spans}); run(actor); }
    return list;
  };
  const a = spansFor(9, 30);
  assert.deepEqual(a, spansFor(9, 30), 'same seed, same performance');
  assert.notDeepEqual(a, spansFor(10, 30));
  for (const s of a) for (const k of ['entry', 'hold', 'exit']) assert.ok(s[k] >= ORGANIC_CHEST_TIMING[k][0] && s[k] <= ORGANIC_CHEST_TIMING[k][1]);
  assert.ok(new Set(a.map((s) => s.hold.toFixed(3))).size > 25, 'no two gestures are timed alike');
}

// ---------------------------------------------------------------------------------------------
// 3. Composition is occasional, optional and always falls back.
// ---------------------------------------------------------------------------------------------
{
  const performed = (options, poseOptions) => {
    const pose = fakePose(poseOptions), actor = createChestDirector({pose, seed: 21, organic: true, ...options}), labels = [];
    for (let i = 0; i < 300; i++) { assert.equal(actor.start(true), true); labels.push(actor.diagnostics().variant); run(actor, .05); }
    return {labels, pose};
  };
  const never = performed({compose: () => false});
  assert.ok(never.labels.every((l) => l === 'plain'));
  assert.ok(never.pose.state.selected.every((l) => l === 'plain'));
  const wired = performed({compose: () => true});
  const share = wired.labels.filter((l) => l === 'composed').length / wired.labels.length;
  assert.ok(Math.abs(share - COMPOSITION.chance) < .12, `about the configured share of gestures compose (${share.toFixed(2)})`);
  assert.ok(wired.labels.includes('plain') && wired.labels.includes('composed'), 'both outcomes happen');
  // The pose refuses the composed variant (guard failed): the director reports plain, never a half state.
  const refused = performed({compose: () => true}, {composedOk: false});
  assert.ok(refused.labels.every((l) => l === 'plain'));
  // A pose without `select` (older callers) still works.
  const bare = fakePose(); delete bare.select;
  const legacy = createChestDirector({pose: bare, seed: 1, compose: () => true});
  assert.equal(legacy.start(true), true); assert.equal(legacy.diagnostics().variant, 'plain'); run(legacy);
  // Same seed: the same sequence of choices.
  assert.deepEqual(performed({compose: () => true}).labels, wired.labels);
}

// ---------------------------------------------------------------------------------------------
// 4. Breath rides the director clock and never breaks the endpoints.
// ---------------------------------------------------------------------------------------------
{
  const pose = fakePose(), actor = createChestDirector({pose, seed: 4, organic: true});
  assert.equal(actor.start(true), true); run(actor, .02);
  for (const {options} of pose.state.calls) assert.ok(options && Math.abs(options.breath) <= 1);
  const hold = pose.state.calls.filter((c) => c.t === 1).map((c) => c.options.breath);
  assert.ok(hold.length > 100);
  assert.ok(Math.max(...hold) > .5 && Math.min(...hold) < -.5, 'the breath actually swings during the hold');
  // In the pose, that signal is faded in only near the final pose, so the travel itself is untouched.
  for (const w of [0, .2, .5, .88]) assert.deepEqual(breathAngles(1, w), {upper: 0, fore: 0, hand: 0});
  assert.ok(Math.max(...Object.values(breathAngles(1, 1))) <= BREATH_ANGLE.upper);
}

// ---------------------------------------------------------------------------------------------
// 5. The motion has no snap: bounded step, no overshoot, and a release is continuous.
// ---------------------------------------------------------------------------------------------
{
  for (const organic of [false, true]) {
    const pose = fakePose(), actor = createChestDirector({pose, seed: 8, organic});
    assert.equal(actor.start(true), true); run(actor, .01);
    const w = pose.state.calls.map((c) => c.t);
    assert.ok(w.every((x) => x >= 0 && x <= 1), 'never outside the rest..final range');
    let worst = 0; for (let i = 1; i < w.length; i++) worst = Math.max(worst, Math.abs(w[i] - w[i - 1]));
    assert.ok(worst < .02, `largest 10 ms step ${worst.toFixed(4)}`);
    const peak = w.indexOf(1);
    assert.ok(w.slice(0, peak).every((x, i, a) => i === 0 || x >= a[i - 1] - 1e-12), 'rises monotonically');
    assert.ok(w.slice(w.lastIndexOf(1)).every((x, i, a) => i === 0 || x <= a[i - 1] + 1e-12), 'falls monotonically');
    // Eased in and out: the first and last steps are far slower than the middle.
    const middle = Math.max(...w.slice(1, peak).map((x, i) => x - w[i]));
    assert.ok(w[1] - w[0] < middle * .02 && w[peak] - w[peak - 1] < middle * .05, 'soft start and soft arrival');
  }
  // Releasing in the middle of the entry hands over from the same weight, with no jump.
  const pose = fakePose(), actor = createChestDirector({pose, seed: 2});
  actor.start(true); actor.advance(.7);
  const before = pose.state.value;
  assert.equal(actor.release(), true);
  actor.advance(.001);
  assert.ok(Math.abs(pose.state.value - before) < .001);
  run(actor, .02);
  assert.equal(pose.state.value, 0);
  // Cancelling mid-gesture restores exactly; cancelling at rest does not touch a manual pose.
  const other = fakePose(), second = createChestDirector({pose: other, seed: 1});
  second.start(true); second.advance(1); second.cancel();
  assert.equal(other.state.value, 0); assert.equal(second.busy(), false);
  const restoresAtRest = other.state.restores; second.cancel();
  assert.equal(other.state.restores, restoresAtRest);
}

console.log('Chest director: approved default timing, organic bounded durations, optional guarded composition, breath on the same clock, no snaps PASS');
