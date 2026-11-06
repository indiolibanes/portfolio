import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {deriveBindRootClip, quatAngleDeg, poseDistance, findTransition, buildComboSchedule, weightsAt, clipTimeAt, createComboSequencer, COMBO_STATUS} from '../src/scripts/shorekeeper/combo-sequencer.mjs';

const q = (deg) => { const h = deg * Math.PI / 360; return [0, Math.sin(h), 0, Math.cos(h)]; };
const sampler = (fn, n, fps = 10) => ({fps, frames: Array.from({length: n}, (_, i) => Float32Array.from(fn(i / fps)))});

test('quaternion angle is symmetric, sign-invariant and exact', () => {
  const a = q(0), b = q(60);
  assert.ok(Math.abs(quatAngleDeg(a, 0, b, 0) - 60) < 1e-4); assert.ok(Math.abs(quatAngleDeg(b, 0, a, 0) - 60) < 1e-4);
  assert.ok(Math.abs(quatAngleDeg(a, 0, b.map((v) => -v), 0) - 60) < 1e-4, 'q and -q are the same rotation');
  assert.ok(Math.abs(poseDistance([...q(0), ...q(0)], [...q(30), ...q(90)]) - 60) < 1e-4);
  assert.throws(() => poseDistance([0, 0, 0, 1], [0, 0, 0, 1, 0, 0, 0, 1]), /incompat/i);
});

test('findTransition picks the most similar pair inside the allowed windows', () => {
  const A = sampler((t) => q(t * 100), 41), B = sampler((t) => q(180 - t * 100), 41); // A at t=1.0 is 100deg, B at t=0.8 is 100deg
  const r = findTransition(A, B, {exitFrom: 0.5, exitTo: 3, enterFrom: 0, enterTo: 2});
  assert.ok(r.distance < 11, 'distance ' + r.distance); assert.ok(Math.abs(q(0)[3] - 1) < 1e-9);
  const narrow = findTransition(A, B, {exitFrom: 3, exitTo: 4, enterFrom: 0, enterTo: 0.5}); assert.ok(narrow.exit >= 3 && narrow.enter <= 0.5);
  assert.throws(() => findTransition(A, B, {exitFrom: 9, exitTo: 8, enterTo: 1}), /vazia/);
});

test('schedule: segments overlap by the fade, durations add up, events are ordered', () => {
  const s = buildComboSchedule([{id: 'ATK', duration: 4, enter: 0, exit: 3}, {id: 'SKL', duration: 5, enter: 0.4, exit: 4, fade: 0.3}, {id: 'BST', duration: 6, enter: 0.2, exit: 5.5, fade: 0.4}]);
  assert.equal(s.segments[0].start, 0); assert.equal(s.segments[0].end, 3);
  assert.ok(Math.abs(s.segments[1].start - 2.7) < 1e-9); assert.ok(Math.abs(s.segments[1].end - (2.7 + 3.6)) < 1e-9);
  assert.ok(Math.abs(s.duration - s.segments[2].end) < 1e-9); assert.deepEqual(s.events.map((e) => e.event), ['ENTER', 'BLEND_IN', 'BLEND_IN', 'END']);
  s.events.forEach((e, i) => { if (i) assert.ok(e.t >= s.events[i - 1].t); });
  assert.throws(() => buildComboSchedule([]), /vazio/); assert.throws(() => buildComboSchedule([{id: 'A', duration: 1, exit: 2}]), /inválida/);
  assert.throws(() => buildComboSchedule([{id: 'A', duration: 3}, {id: 'B', duration: 3, enter: 2.9, fade: 0.25}]), /inválida/, 'fade longer than the segment');
});

test('weights always sum to 1, are continuous across blends and clip time stays inside its window', () => {
  const s = buildComboSchedule([{id: 'A', duration: 4}, {id: 'B', duration: 4, enter: 0.5, exit: 3.5, fade: 0.3}, {id: 'C', duration: 4, enter: 0, exit: 2, fade: 0.5}]);
  let prev = null, worst = 0;
  for (let t = 0; t <= s.duration + 1e-9; t += 1 / 120) {
    const w = weightsAt(s, t); assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9, 'sum at ' + t);
    if (prev) worst = Math.max(worst, ...w.map((v, i) => Math.abs(v - prev[i]))); prev = w;
    s.segments.forEach((g, i) => { const ct = clipTimeAt(s, i, t); assert.ok(ct >= g.clipEnter - 1e-9 && ct <= g.clipExit + 1e-9); });
  }
  assert.ok(worst < 0.05, 'weights never jump: ' + worst);
  assert.deepEqual(weightsAt(s, 0), [1, 0, 0]); assert.deepEqual(weightsAt(s, s.duration), [0, 0, 1]);
});

function rig() {
  const root = new T.Group(), bone = new T.Bone(); bone.name = 'Bip001'; root.add(bone);
  const mk = (name, deg) => new T.AnimationClip(name, 4, [new T.QuaternionKeyframeTrack('Bip001.quaternion', [0, 4], [...q(0), ...q(deg)])]);
  return {root, bone, clips: {A: mk('A', 40), B: mk('B', 120), C: mk('C', 10)}};
}
test('sequencer blends deterministically through a single mixer and records its state', () => {
  const {root, bone, clips} = rig(), s = buildComboSchedule([{id: 'A', duration: 4, exit: 3}, {id: 'B', duration: 4, enter: 0, exit: 3, fade: 0.5}, {id: 'C', duration: 4, enter: 0, exit: 3, fade: 0.5}]);
  const seq = createComboSequencer(T, root, clips, s); assert.equal(seq.status, COMBO_STATUS);
  seq.seek(0); const a0 = Array.from(bone.quaternion.toArray());
  seq.seek(2.75); const mid = bone.quaternion.clone(), wm = seq.state().weights; assert.ok(wm[0] > 0 && wm[1] > 0, 'both clips contribute inside the overlap');
  seq.seek(2.75); assert.ok(bone.quaternion.equals(mid), 'seek is deterministic');
  seq.seek(0); let prev = bone.quaternion.clone(), worst = 0;
  for (let t = 0; t < s.duration; t += 1 / 60) { seq.advance(1 / 60); worst = Math.max(worst, 2 * Math.acos(Math.min(1, Math.abs(prev.dot(bone.quaternion)))) * 180 / Math.PI); prev = bone.quaternion.clone(); }
  assert.ok(seq.done); assert.ok(worst < 4, 'no snap at the transitions: ' + worst + 'deg/frame'); assert.ok(a0.every(Number.isFinite));
  seq.setPaused(true); const before = seq.time; seq.advance(1); assert.equal(seq.time, before); seq.dispose(); seq.dispose(); seq.advance(1);
});
test('sequencer rejects non-body channels and missing clips', () => {
  const {root, clips} = rig(); const bad = new T.AnimationClip('X', 1, [new T.NumberKeyframeTrack('Face.morphTargetInfluences[0]', [0, 1], [0, 1])]);
  assert.throws(() => createComboSequencer(T, root, {...clips, X: bad}, buildComboSchedule([{id: 'X', duration: 1}])), /não corporal/);
  assert.throws(() => createComboSequencer(T, root, clips, buildComboSchedule([{id: 'Z', duration: 1}])), /ausente/);
});

test('deriveBindRootClip holds Root at bind without touching the source clip or other tracks', () => {
  const model = new T.Group(), root = new T.Bone(), hip = new T.Bone(); root.name = 'Root'; hip.name = 'Bip001'; root.quaternion.setFromAxisAngle(new T.Vector3(0, 1, 0), 0.4); model.add(root, hip);
  const src = new T.AnimationClip('SK_ATTACK_L02_ORIGINAL', 4, [new T.QuaternionKeyframeTrack('Root.quaternion', [0, 2, 4], [...q(0), ...q(90), ...q(180)]), new T.QuaternionKeyframeTrack('Bip001.quaternion', [0, 4], [...q(0), ...q(30)])]);
  const before = JSON.stringify(src.tracks.map((t) => [t.name, Array.from(t.values)])), r = deriveBindRootClip(T, model, src);
  assert.equal(JSON.stringify(src.tracks.map((t) => [t.name, Array.from(t.values)])), before, 'source untouched'); assert.equal(r.clip.name, 'SK_ATTACK_L02_ORIGINAL_ROOT_BODY_OWNED');
  const rt = r.clip.tracks.find((t) => t.name === 'Root.quaternion'), want = root.quaternion.toArray();
  for (const k of [0, 4]) want.forEach((v, j) => assert.ok(Math.abs(rt.values[k + j] - v) < 1e-6)); assert.deepEqual(r.changedTracks, ['Root.quaternion']);
  assert.deepEqual(Array.from(r.clip.tracks.find((t) => t.name === 'Bip001.quaternion').values), Array.from(src.tracks[1].values));
  assert.throws(() => deriveBindRootClip(T, new T.Group(), src), /Root/);
});
