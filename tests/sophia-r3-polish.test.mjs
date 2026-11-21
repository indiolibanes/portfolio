// Pure-function contracts for the immersive launch engine and thruster.
import test from 'node:test';
import assert from 'node:assert/strict';
import { R3, sampleImmersiveR3At as sample, thrusterFx } from '../src/scripts/sophia-immersive-r3-timeline.mjs';

test('engine power has no step at ignition or anywhere else', () => {
  let prev = sample(0).enginePower;
  let maxStep = 0;
  for (let t = .005; t <= 20; t += .005) {
    const p = sample(t).enginePower;
    maxStep = Math.max(maxStep, Math.abs(p - prev));
    prev = p;
  }
  assert.ok(maxStep <= .02, `enginePower jumps by ${maxStep.toFixed(4)} in 5 ms`);
  assert.equal(sample(R3.ignition).enginePower, sample(R3.ignition - 1e-9).enginePower);
  // Same plateau as before: 0.65 once ignition has settled, 1 at release.
  assert.ok(Math.abs(sample(R3.ignition + .4).enginePower - .65) < 1e-9);
  assert.ok(Math.abs(sample(R3.launch + .35).enginePower - 1) < 1e-9);
});

test('thruster flicker is deterministic, bounded, steady when reduced, and calms down', () => {
  const at = (t, reduced = false) => thrusterFx(t, sample(t), reduced);
  const first = at(R3.launch + 1);
  at(5); at(0); at(14);
  assert.deepEqual(at(R3.launch + 1), first, 'order of seeking must not matter');
  assert.deepEqual(thrusterFx(3, sample(3), true), { plume: 1, light: 1, shock: 1 });
  assert.deepEqual(thrusterFx(.5, sample(.5)), { plume: 1, light: 1, shock: 1 }, 'no thrust, no flicker');

  let prev = at(R3.reveal + .01);
  for (let t = R3.reveal + .01; t <= 20; t += 1 / 120) {
    const fx = at(t);
    assert.ok(fx.plume >= .55 && fx.plume <= 1.3, `plume ${fx.plume} at ${t}`);
    assert.ok(fx.light >= .35 && fx.light <= 2.2, `light ${fx.light} at ${t}`);
    assert.ok(fx.shock >= .8 && fx.shock <= 1.2, `shock ${fx.shock} at ${t}`);
    assert.ok(Math.abs(fx.plume - prev.plume) <= .15 / 2, 'plume must not jump between frames');
    assert.ok(Math.abs(fx.light - prev.light) <= .3 / 2, 'light must not jump between frames');
    prev = fx;
  }
  // In flight the flame only shimmers.
  for (let t = R3.flight; t <= R3.flight + 6; t += .01) assert.ok(Math.abs(at(t).plume - 1) <= .06 + 1e-9, `flight plume at ${t}`);
  // The pilot flame is livelier than the settled one.
  const spread = (a, b) => { let lo = 9, hi = -9; for (let t = a; t < b; t += 1 / 120) { const p = at(t).plume; lo = Math.min(lo, p); hi = Math.max(hi, p); } return hi - lo; };
  assert.ok(spread(R3.reveal + .2, R3.ignition) > spread(R3.launch + 2, R3.launch + 3.5) * 1.5, 'pilot flame should be livelier than the settled flame');
  // Ignition and release each get one bright pulse.
  const mean = (a, b) => { let s = 0, n = 0; for (let t = a; t < b; t += 1 / 120) { s += at(t).light; n++; } return s / n; };
  assert.ok(mean(R3.ignition, R3.ignition + .28) > mean(R3.ignition + 1.2, R3.ignition + 1.5) + .15, 'ignition pulse');
  assert.ok(mean(R3.launch, R3.launch + .5) > mean(R3.launch + 2, R3.launch + 2.5) + .15, 'release pulse');
});
