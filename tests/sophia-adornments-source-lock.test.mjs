// Source-lock contract for the Sophia 6H adornment recovery (R1.B preflight).
// Structural facts about the checked-in GLBs: if one of these fails, a source file changed and the
// R1 documents (docs/sophia/adornments-r1) are stale. This is NOT visual or artistic validation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { census } from '../scripts/sophia/glb-census.mjs';

const ALPHA = new URL('../public/experimental/sophia-alpha.glb', import.meta.url).pathname;
const E1 = new URL('../public/experimental/sophia-7b-e1-latest.glb', import.meta.url).pathname;
const archived = JSON.parse(await readFile(new URL('../docs/archive/sophia6h/Verdict.json', import.meta.url), 'utf8'));
const a = census(ALPHA);

test('alpha GLB is byte-identical to the archived 6H candidate hash and the counts match the 6H report', () => {
  assert.equal(a.sha256, archived.candidata_sha256);
  assert.equal(a.bytes, 20795692);
  assert.equal(a.skin.joints, 101);
  assert.equal(a.skin.ibmCount, 101);
  assert.equal(a.meshes.reduce((n, m) => n + m.primitiveCount, 0), 286);
  assert.equal(a.meshes.reduce((n, m) => n + m.totalTriangles, 0), 291306);
  assert.deepEqual(a.animations.map(x => x.name), ['Idle', 'Write', 'Point', 'Wave', 'Walk']);
  assert.deepEqual(a.meshes[0].targetNames, ['Blink', 'Smile', 'BrowRaise', 'MouthOpen']);
});

test('Book and Pen are independent, unskinned nodes parented to the hands and animated by every clip', () => {
  const book = a.nonJointNodes.find(n => n.name === 'Book'), pen = a.nonJointNodes.find(n => n.name === 'Pen');
  assert.equal(book.parentChain[0], 'hand_L');
  assert.equal(pen.parentChain[0], 'hand_R');
  assert.equal(book.skin, undefined);
  assert.equal(pen.skin, undefined);
  assert.equal(a.meshes[book.mesh].primitiveCount, 5);
  assert.equal(a.meshes[pen.mesh].primitiveCount, 2);
  for (const clip of a.animations) {
    assert.deepEqual([...clip.bookChannels].sort(), ['rotation', 'translation'], clip.name);
    assert.deepEqual([...clip.penChannels].sort(), ['rotation', 'translation'], clip.name);
  }
  assert.ok(!a.nonJointNodes.some(n => /^socket_/i.test(n.name)), 'no Socket_* nodes exist; they are only proposed aliases');
});

test('the 6H forehead stars are raised, UV-less gold primitives and the skull has no UV (so no skin-texture mark)', () => {
  const P = a.meshes[0].primitives;
  for (const i of [9, 10, 11]) {
    assert.equal(P[i].materialName, 'Sophia_gold');
    assert.equal(P[i].triangles, 288);
    assert.equal(P[i].uvSets, 0);
  }
  assert.ok(P[10].max[0] - P[10].min[0] > 0.05, 'main star is ~62 mm wide: not a small flat mark');
  assert.equal(P[274].materialName, 'Sophia_fur');
  assert.equal(P[274].uvSets, 0);
  assert.ok(P[274].attributes.includes('COLOR_0'));
});

test('coat is a single UV-mapped shell with a duplicate lining; 7B E1 is one unrigged Tripo mesh', () => {
  const P = a.meshes[0].primitives;
  assert.equal(P[4].materialName, 'Sophia_coat');
  assert.equal(P[5].materialName, 'Sophia_lining');
  assert.equal(P[4].triangles, 13466);
  assert.equal(P[4].uvSets, 1);
  const e1 = census(E1);
  assert.equal(e1.sha256, 'b0f2c2e9106768b74b0582a703cf5b1c4d4ac2aac57b461ddc22f5696791c53a');
  assert.equal(e1.counts.skins, 0);
  assert.equal(e1.counts.animations, 0);
  assert.equal(e1.meshes.length, 1);
});
