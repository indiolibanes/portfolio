import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {propagateStationDeltas, buildStationCurve, linerDelta, findMouthContour, createMouthRibbonWeld, WELD_MORPHS} from '../src/scripts/shorekeeper/mouth-ribbon-weld.mjs';
import {MOUTH_QA_RECIPES, MOUTH_R2_CANDIDATES} from '../src/scripts/shorekeeper/mouth-qa-probes.mjs';

const mm = 1e-3;
/** Synthetic ribbon: 13 stations x 4 vertices (outer/inner layers), 52 vertices, one connected island. */
function ribbon({decoy = true} = {}) {
  const xs = Array.from({length: 13}, (_, i) => (-8 + i * (16 / 12)) * mm), pos = [], uv = [], index = [];
  xs.forEach((x, s) => { for (let k = 0; k < 4; k++) { pos.push(x, 1.3415 + (k % 2) * 0.0007, 0.031 + Math.floor(k / 2) * 0.001); uv.push(0.5, 0.91); } });
  for (let s = 0; s < 12; s++) for (let k = 0; k < 4; k++) { const a = s * 4 + k, b = s * 4 + (k + 1) % 4, c = (s + 1) * 4 + k; index.push(a, b, c); }
  if (decoy) { const base = pos.length / 3; pos.push(0, 1.30, 0.03, 0.001, 1.30, 0.03, 0, 1.301, 0.03); uv.push(0.2, 0.3, 0.2, 0.3, 0.2, 0.3); index.push(base, base + 1, base + 2); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(index);
  return {g, xs, count: 52};
}
/** One-sided smile morph that only moves the OUTER layer (k < 2) beyond |x| > 2.5 mm: the canonical defect. */
function addSmile(g, xs, name, side = 1) {
  const n = g.attributes.position.count, d = new Float32Array(n * 3);
  xs.forEach((x, s) => { if (Math.sign(x) !== side || Math.abs(x) < 2.5 * mm) return; for (let k = 0; k < 2; k++) { const i = s * 4 + k, t = Math.abs(x) / (8 * mm); d[i * 3] = 0.6 * mm * t; d[i * 3 + 1] = 3 * mm * t * t; } });
  g.morphAttributes.position = g.morphAttributes.position ?? [];
  const a = new T.Float32BufferAttribute(d, 3); a.name = name; g.morphAttributes.position.push(a); g.morphTargetsRelative = true;
  return g.morphAttributes.position.length - 1;
}
function face() {
  const {g, xs} = ribbon(), dict = {};
  dict.M_Smile_L = addSmile(g, xs, 'M_Smile_L', 1); dict.M_Smile_R = addSmile(g, xs, 'M_Smile_R', -1);
  const mesh = new T.Mesh(g, new T.MeshBasicMaterial()); mesh.name = 'Shorekeeper_Face'; mesh.morphTargetDictionary = dict; mesh.morphTargetInfluences = [0, 0];
  const model = new T.Group(); model.add(mesh); return {model, mesh, g, xs};
}

test('finds the 52-vertex lip-band island and ignores decoys', () => {
  const {g, count} = ribbon(); const ids = findMouthContour(g);
  assert.equal(ids.length, count); assert.ok(ids.every(i => i < 52));
});

test('welds missing station partners from the deltas that already exist, without mutating inputs', () => {
  const {g, xs} = ribbon(), idx = addSmile(g, xs, 'M_Smile_L'), attr = g.morphAttributes.position[idx];
  const ids = findMouthContour(g), delta = new Float64Array(ids.length * 3), x = Float64Array.from(ids, i => g.attributes.position.getX(i));
  ids.forEach((v, k) => { delta[k * 3] = attr.getX(v); delta[k * 3 + 1] = attr.getY(v); delta[k * 3 + 2] = attr.getZ(v); });
  const before = Float64Array.from(delta), r = propagateStationDeltas({x, delta});
  assert.deepEqual([...delta], [...before], 'input must not be mutated');
  assert.equal(r.reason, 'ok'); assert.ok(r.welded > 0);
  // every vertex of the right-hand tip station now moves, not only the outer layer
  const tip = ids.map((v, k) => ({v, k})).filter(({k}) => Math.abs(x[k] - 8 * mm) < 1e-6);
  assert.equal(tip.length, 4);
  for (const {k} of tip) assert.ok(r.delta[k * 3 + 1] > 2.9 * mm, 'inner layer follows the outer one');
  // the centre and the opposite side are untouched
  ids.forEach((v, k) => { if (x[k] < 2.4 * mm) assert.equal(r.delta[k * 3 + 1], 0); });
});

test('lift pushes the lifted stroke forward only when it moves up', () => {
  const x = Float64Array.from([3, 3, 5, 5].map(v => v * mm)), delta = new Float64Array([0, 1 * mm, 0, 0, 0, 0, 0, 2 * mm, 0, 0, -1 * mm, 0]);
  const r = propagateStationDeltas({x, delta, lift: 0.6});
  assert.ok(r.delta[2] > 0, 'up-moving vertex is pushed forward');
  assert.equal(r.delta[11], 0, 'downward vertex is not pushed');
});

test('bilateral and empty morphs are not welded', () => {
  const x = Float64Array.from([-5, 5, -3, 3].map(v => v * mm));
  assert.equal(buildStationCurve({x, delta: new Float64Array(12)}).reason, 'empty');
  const delta = new Float64Array(12); delta[1] = 1 * mm; delta[4] = 1 * mm;
  assert.equal(propagateStationDeltas({x, delta}).reason, 'bilateral');
  assert.equal(propagateStationDeltas({x, delta}).welded, 0);
});

test('liner delta follows the stroke at the front rim and fades with depth and past the tip', () => {
  const curve = buildStationCurve({x: Float64Array.from([3, 6, 8].map(v => v * mm)), delta: new Float64Array([0.2 * mm, 0.5 * mm, 0, 1 * mm, 2 * mm, 0, 2 * mm, 3 * mm, 0])});
  const at = (ax, z) => linerDelta({curve, side: curve.side, ax: ax * mm, z: z * mm, zFront: 30 * mm, zBack: 18 * mm});
  assert.ok(at(7, 30)[1] > at(7, 24)[1], 'front rim moves more than the cavity');
  assert.equal(at(7, 18)[1], 0, 'back of the cavity stays anchored');
  assert.ok(at(11, 30)[1] < at(8, 30)[1], 'fades beyond the tip');
  assert.deepEqual(linerDelta({curve, side: curve.side, ax: -7 * mm, z: 30 * mm, zFront: 30 * mm, zBack: 18 * mm}), [0, 0, 0], 'other side untouched');
});

test('runtime weld edits a CLONE; canonical buffers are untouched and restore/dispose are idempotent', () => {
  const {model, mesh, g} = face(), original = g, snapshot = Float32Array.from(g.morphAttributes.position[0].array);
  const weld = createMouthRibbonWeld(model, {lift: 0.6, liner: false});
  assert.notEqual(mesh.geometry, original, 'weld swaps in a clone');
  assert.deepEqual([...original.morphAttributes.position[0].array], [...snapshot], 'canonical morph buffer unchanged');
  assert.ok(weld.report.find(r => r.name === 'M_Smile_L').welded > 0);
  assert.equal(weld.report.find(r => r.name === 'P_M_L_Add').reason, 'missing');
  assert.ok(mesh.geometry.morphAttributes.position[0].array.some((v, i) => v !== snapshot[i]), 'clone differs');
  assert.deepEqual(Object.keys(mesh.morphTargetDictionary), ['M_Smile_L', 'M_Smile_R'], 'dictionary preserved');
  weld.restore(); weld.restore(); assert.equal(mesh.geometry, original); assert.equal(weld.active, false);
  weld.dispose(); weld.dispose(); assert.equal(mesh.geometry, original);
});

test('dispose while active restores the canonical geometry', () => {
  const {model, mesh, g} = face(); const weld = createMouthRibbonWeld(model, {liner: false});
  weld.dispose(); assert.equal(mesh.geometry, g);
});

test('throws, without changing anything, when the contour island is missing', () => {
  const {model, mesh, g} = face(); g.attributes.uv.array.fill(0.2);
  assert.throws(() => createMouthRibbonWeld(model), /contour/i); assert.equal(mesh.geometry, g);
});

test('R2 candidates are explicit, weld-gated, never write E_Close, and keep the V2 baselines', () => {
  assert.deepEqual(Object.keys(MOUTH_R2_CANDIDATES), ['LITTLE_SMILE_R2_CANDIDATE', 'MY_STAR_R2_CANDIDATE', 'HELLO_R2_CANDIDATE']);
  for (const [id, r] of Object.entries(MOUTH_R2_CANDIDATES)) {
    assert.equal(r.requiresWeld, true, id); assert.equal(r.status, 'B_SMILE_VISUAL_CANDIDATE', id);
    assert.ok(!('E_Close' in r.weights), id); assert.ok(r.weights.M_Smile_L > 0 && WELD_MORPHS.includes('M_Smile_L'), id);
    assert.ok(Object.values(r.weights).every(w => w >= 0 && w <= 1), id);
  }
  assert.ok(!('M_OpenSmall' in MOUTH_R2_CANDIDATES.HELLO_R2_CANDIDATE.weights), 'closed smile for HELLO (hello.gif)');
  const sum = id => Object.values(MOUTH_R2_CANDIDATES[id].weights).reduce((a, b) => a + b, 0);
  assert.ok(sum('MY_STAR_R2_CANDIDATE') > sum('LITTLE_SMILE_R2_CANDIDATE'), 'My Star is larger than the little smile');
  assert.equal(MOUTH_QA_RECIPES.LITTLE_SMILE_V2.purpose, 'BASELINE_CONTROL_NOT_RECOVERY');
  assert.equal(MOUTH_QA_RECIPES.MY_STAR_V2.purpose, 'BASELINE_CONTROL_NOT_RECOVERY');
});
