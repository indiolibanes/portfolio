import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import * as THREE from 'three';
import integration from '../scripts/sophia-face-qa-integration.mjs';
import { verifyFaceQaBuild } from '../scripts/verify-sophia-face-qa-build.mjs';
import { AssetSlot, createFaceController, disposeGltf, blankEvaluation, readGlb } from '../src/experiments/sophia-face-qa/core.mjs';
import { indexZip, findMaster, readZipMaster } from '../src/experiments/sophia-face-qa/zip.mjs';

function fixture() {
  const root = new THREE.Group();
  const names = ['Blink_L', 'Blink_R', 'Smile_L', 'Mouth_Open'];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial());
    m.morphTargetDictionary = Object.fromEntries(names.map((n, i) => [n, i])); m.morphTargetInfluences = names.map(() => 0); root.add(m);
  }
  const clip = new THREE.AnimationClip('Facial_Demo', 1, root.children.map(m => new THREE.NumberKeyframeTrack(`${m.uuid}.morphTargetInfluences[0]`, [0, 1], [0, 1])));
  const mixer = new THREE.AnimationMixer(root);
  return { root, mixer, clip, face: createFaceController(root, mixer, [clip]) };
}

test('route injection occurs only in dev, including when build/sync are invoked directly', () => {
  for (const command of ['dev', 'build', 'preview', 'sync']) {
    const routes = []; integration().hooks['astro:config:setup']({ command, injectRoute: r => routes.push(r) });
    assert.equal(routes.length, command === 'dev' ? 1 : 0);
    if (routes.length) assert.equal(routes[0].pattern, '/experimentos/sophia-face-qa/');
  }
});
test('all primitives receive independent morph values and the mouth limit', () => {
  const { root, face } = fixture(); face.set('Blink_L', 0.7); face.set('Smile_L', 0.3); face.set('Mouth_Open', 1);
  for (const m of root.children) assert.deepEqual(m.morphTargetInfluences, [0.7, 0, 0.3, 0.65]);
  assert.throws(() => face.set('Invented', 1)); assert.throws(() => face.preset({ MadeUp: 1 }));
  face.neutral(); for (const m of root.children) assert.ok(m.morphTargetInfluences.every(v => v === 0)); face.dispose();
});
test('sliders interrupt the mixer without resetting unrelated current weights', () => {
  const { face, mixer, root } = fixture(); face.play(); mixer.update(0.4); assert.ok(face.playing);
  face.set('Smile_L', 0.5); const current = face.weights(); assert.ok(current.Blink_L > 0.39); assert.equal(face.playing, false);
  mixer.update(0.4); assert.deepEqual(face.weights(), current); face.neutral();
  for (const m of root.children) assert.deepEqual(m.morphTargetInfluences, [0, 0, 0, 0]); face.dispose();
});
test('stop preserves the evaluated pose; a preset can then replace it atomically', () => {
  const { face, mixer } = fixture(); face.play(); mixer.update(0.6); const current = face.weights(); face.stop();
  assert.deepEqual(face.weights(), current); face.preset({ Blink_R: 1 }); assert.deepEqual(face.weights(), { Blink_L: 0, Blink_R: 1, Smile_L: 0, Mouth_Open: 0 }); face.dispose();
});
test('rapid switching never overlaps decoders and disposes stale results', async () => {
  const disposed = []; const slot = new AssetSlot(a => disposed.push(a)); let release, active = 0, maximum = 0;
  const first = slot.load(async () => 'old', async () => { active++; maximum = Math.max(maximum, active); await new Promise(r => { release = r; }); active--; return 'old'; });
  while (!release) await Promise.resolve();
  const second = slot.load(async () => 'new', async () => { active++; maximum = Math.max(maximum, active); active--; return 'new'; });
  release(); assert.equal(await first, null); assert.equal(await second, 'new'); assert.equal(maximum, 1); assert.deepEqual(disposed, ['old']);
  slot.clear(); assert.deepEqual(disposed, ['old', 'new']); assert.equal(await slot.pending, undefined); assert.equal(slot.active, null);
});
test('failed parsing does not poison the next load', async () => {
  const slot = new AssetSlot(() => {}); await assert.rejects(slot.load(async () => 1, async () => { throw Error('parse'); }));
  assert.equal(await slot.load(async () => 2, async n => n), 2); slot.clear();
});
test('shared textures, image bitmaps, geometry and skeletons are disposed once', () => {
  const root = new THREE.Group(), geometry = new THREE.BufferGeometry(); let closed = 0, disposedTex = 0, disposedGeo = 0, disposedSkeleton = 0;
  const texture = new THREE.Texture({ close() { closed++; } }); texture.addEventListener('dispose', () => disposedTex++); geometry.addEventListener('dispose', () => disposedGeo++);
  const skeleton = { dispose() { disposedSkeleton++; } };
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture })); m.skeleton = skeleton; root.add(m); }
  const result = disposeGltf({ scene: root, scenes: [root] }); assert.deepEqual([closed, disposedTex, disposedGeo, disposedSkeleton], [1, 1, 1, 1]); assert.equal(result.materials, 3);
});
test('manual evaluations start untested and are separate for each incarnation', () => {
  const a = blankEvaluation('anime', ['Blink_L'], ['Happy']), k = blankEvaluation('kitsune', ['Blink_L'], ['Happy']);
  assert.ok(Object.values(a.criteria).every(v => v.status === 'NOT TESTED')); a.morphs.Blink_L.status = 'PASS'; assert.equal(k.morphs.Blink_L.status, 'NOT TESTED');
  assert.ok('forehead' in k.criteria); assert.ok(!('forehead' in a.criteria));
});
test('production verifier rejects a leaked route or private master filename', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sophia-face-dist-'));
  try {
    await writeFile(join(root, 'index.html'), '<h1>Public</h1>'); await verifyFaceQaBuild(root);
    await mkdir(join(root, 'experimentos', 'sophia-face-qa'), { recursive: true }); await assert.rejects(verifyFaceQaBuild(root));
    await rm(join(root, 'experimentos'), { recursive: true }); await writeFile(join(root, 'app.js'), 'const asset="Sophia_Anime_Facial_R1.glb"'); await assert.rejects(verifyFaceQaBuild(root));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('malformed GLBs and external dependencies are rejected before loading textures', () => {
  assert.throws(() => readGlb(new ArrayBuffer(20)));
  const raw = new TextEncoder().encode(JSON.stringify({ buffers: [{ uri: 'https://example.com/private.bin' }] }));
  const length = Math.ceil(raw.length / 4) * 4, data = new ArrayBuffer(20 + length), v = new DataView(data);
  v.setUint32(0, 0x46546c67, true); v.setUint32(4, 2, true); v.setUint32(8, data.byteLength, true); v.setUint32(12, length, true); v.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(data, 20).fill(32); new Uint8Array(data, 20, raw.length).set(raw); assert.throws(() => readGlb(data), /externas/);
});
test('QA page is outside automatic page discovery and production sources do not link it', async () => {
  const page = await readFile(new URL('../src/experiments/sophia-face-qa/Page.astro', import.meta.url), 'utf8'); assert.match(page, /noindex, nofollow, noarchive/);
  for (const file of ['public/sitemap.xml', 'src/components/BaseHead.astro']) assert.doesNotMatch(await readFile(new URL('../' + file, import.meta.url), 'utf8'), /sophia-face-qa/);
});

function zipFixture(method = 8) {
  const name = Buffer.from('R1/model.glb'), plain = Buffer.from('local-master-fixture');
  const bytes = method === 8 ? deflateRawSync(plain) : plain;
  const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(method, 8); header.writeUInt32LE(bytes.length, 18); header.writeUInt32LE(plain.length, 22); header.writeUInt16LE(name.length, 26);
  const local = Buffer.concat([header, name, bytes]);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(method, 10); central.writeUInt32LE(bytes.length, 20); central.writeUInt32LE(plain.length, 24); central.writeUInt16LE(name.length, 28);
  const directory = Buffer.concat([central, name]), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(local.length, 16);
  return { file: new Blob([local, directory, end]), plain };
}
test('ZIP intake reads only the selected entry, for stored and deflated packages', async () => {
  for (const method of [0, 8]) {
    const { file, plain } = zipFixture(method); const entries = await indexZip(file); const entry = findMaster(entries, 'model.glb');
    assert.deepEqual(Buffer.from(await readZipMaster(file, entry, plain.length)), plain);
    await assert.rejects(readZipMaster(file, entry, plain.length + 1));
  }
});
test('ambiguous ZIP members, encrypted entries and malformed indices fail closed', async () => {
  const { file, plain } = zipFixture(); const [entry] = await indexZip(file);
  assert.throws(() => findMaster([entry, entry], 'model.glb'));
  await assert.rejects(readZipMaster(file, { ...entry, flags: 1 }, plain.length));
  await assert.rejects(indexZip(new Blob(['not a zip'])));
});
