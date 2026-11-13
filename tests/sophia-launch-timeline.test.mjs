import test from 'node:test';
import assert from 'node:assert/strict';
import { LAUNCH, ActiveSceneClock, getLaunchStateAt, getBoardingPoseAt, getRocketPoseAt } from '../src/scripts/sophia-launch-timeline.mjs';

test('first post-start frame shows a stationary, unlit rocket without rider or trails', () => {
  for (const t of [0, .5, LAUNCH.ignition - .001]) {
    const s = getLaunchStateAt(t);
    assert.equal(s.riderVisible, false); assert.equal(s.trail, 0); assert.equal(s.engine, 'ENGINE_OFF');
    assert.deepEqual(getRocketPoseAt(t), { x: -0, y: 0, z: 0 });
  }
});
test('countdown changes exactly once per active second from 5 through 0', () => {
  for (let k = 0; k <= 5; k++) {
    const t = LAUNCH.ignition + k;
    assert.equal(getLaunchStateAt(t).countdown, 5 - k);
    if (k < 5) assert.equal(getLaunchStateAt(t + .999).countdown, 5 - k);
    if (k) assert.equal(getLaunchStateAt(t - .001).countdown, 6 - k);
  }
});
test('safe boarding lands .3 seconds before launch, independent of frame order', () => {
  assert.ok(Math.abs(LAUNCH.release - LAUNCH.dock - .3) < 1e-9);
  for (const t of [10, LAUNCH.release, LAUNCH.dock, 5.95]) {
    const p = getBoardingPoseAt(t); assert.equal(p.x, 0); assert.equal(p.y, 0); assert.equal(p.z, 0);
  }
  const p0 = getBoardingPoseAt(LAUNCH.jump), pm = getBoardingPoseAt((LAUNCH.jump + LAUNCH.dock) / 2);
  assert.ok(pm.y > p0.y + .2); assert.ok(pm.x > p0.x);
  const near = getBoardingPoseAt(LAUNCH.dock - 1e-5);
  assert.ok(Math.hypot(near.x, near.y, near.z) < 1e-8);
});
test('release and acceleration remain continuous through the flight loop', () => {
  const e = 1e-5;
  assert.ok(Math.abs(getRocketPoseAt(LAUNCH.release + e).x) < 1e-10);
  const before = getRocketPoseAt(LAUNCH.flight - e), at = getRocketPoseAt(LAUNCH.flight), after = getRocketPoseAt(LAUNCH.flight + e);
  assert.ok(Math.abs(before.x - at.x) < .001); assert.ok(after.x < at.x);
  assert.ok(Math.abs((at.x - before.x) / e - (after.x - at.x) / e) < .001);
  assert.ok(Math.abs((at.y - before.y) / e - (after.y - at.y) / e) < .001);
  assert.equal(getLaunchStateAt(LAUNCH.release).trail, 0);
  assert.ok(getLaunchStateAt(LAUNCH.release + 1).trail > .8);
});
test('timeline is deterministic on seek, dropped frames, and restart', () => {
  const snapshots = [0, 1.1, 2.1, 5.1, 5.45, 5.8, 6.1, 6.4, 8.2, 12];
  const expected = snapshots.map(t => [getLaunchStateAt(t), getBoardingPoseAt(t), getRocketPoseAt(t)]);
  for (let i = snapshots.length - 1; i >= 0; i--) assert.deepEqual([getLaunchStateAt(snapshots[i]), getBoardingPoseAt(snapshots[i]), getRocketPoseAt(snapshots[i])], expected[i]);
});
test('active clock pauses visibility and context loss without counting hidden time', () => {
  const clock = new ActiveSceneClock(); clock.start(1000);
  clock.pause('hidden', 2100); assert.equal(clock.read(9000), 1.1);
  clock.pause('context', 9000); clock.resume('hidden', 10000); assert.equal(clock.read(12000), 1.1);
  clock.resume('context', 12000); assert.equal(clock.read(13000), 2.1);
  assert.equal(getLaunchStateAt(clock.read(13000)).countdown, 4);
  clock.reset(14000); assert.equal(clock.read(19000), 0);
});
test('reduced motion retains the countdown and exact docking point', () => {
  assert.equal(getLaunchStateAt(LAUNCH.ignition).countdown, 5);
  const r = getBoardingPoseAt(5.45, { reducedMotion: true }), full = getBoardingPoseAt(5.45);
  assert.equal(r.anticipation, 0); assert.equal(r.tuck, 0); assert.ok(r.y < full.y);
  assert.equal(getBoardingPoseAt(LAUNCH.dock, { reducedMotion: true }).y, 0);
});
