// CPU/API audit of private files supplied on the command line; no files are hosted or copied to public/.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash, webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { AnimationMixer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { verifyMaster, createFaceController, disposeGltf } from '../src/experiments/sophia-face-qa/core.mjs';
import { indexZip, findMaster, readZipMaster } from '../src/experiments/sophia-face-qa/zip.mjs';
const directory = process.argv[2];
if (!directory) throw Error('Uso: npm run qa:sophia-face:assets -- /diretorio-privado-r1 [/saida.json] [pacote.zip]');
const manifest = JSON.parse(await readFile(new URL('../src/experiments/sophia-face-qa/manifest.json', import.meta.url)));
globalThis.self = globalThis;
globalThis.ProgressEvent ??= class ProgressEvent { constructor(type, values) { this.type = type; Object.assign(this, values); } };
let bitmapsCreated = 0, bitmapsClosed = 0;
// This decodes real JPEG pixels using sharp, not a browser/GPU ImageBitmap implementation.
globalThis.createImageBitmap = async blob => {
  const { data, info } = await sharp(Buffer.from(await blob.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  bitmapsCreated++;
  return { width: info.width, height: info.height, data, close() { if (this.data) { this.data = null; bitmapsClosed++; } } };
};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function immutableFingerprint(root) {
  const h = createHash('sha256'), seen = new Set();
  function attribute(a) { if (!a || seen.has(a.array)) return; seen.add(a.array); h.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength)); }
  root.traverse(o => {
    if (o.geometry) {
      attribute(o.geometry.index);
      for (const a of Object.values(o.geometry.attributes)) attribute(a);
      for (const values of Object.values(o.geometry.morphAttributes)) for (const a of values) attribute(a);
    }
    if (o.skeleton) {
      for (const b of o.skeleton.bones) h.update(JSON.stringify([b.name, b.parent?.name, b.position.toArray(), b.quaternion.toArray(), b.scale.toArray()]));
      for (const inverse of o.skeleton.boneInverses) h.update(JSON.stringify(inverse.elements));
    }
    for (const m of [].concat(o.material ?? [])) h.update(JSON.stringify({ name: m.name, color: m.color?.toArray(), roughness: m.roughness, metalness: m.metalness, map: m.map?.uuid, side: m.side }));
  });
  return h.digest('hex');
}
const result = { scope: 'CPU/API + JPEG decode using sharp. No WebGL, GPU memory or mobile FPS certification.', source: 'Sophia Living Face R1', models: {}, zip: {}, R0Comparison: 'NOT TESTED' };
let zip, entries;
if (process.argv[4]) { zip = new Blob([await readFile(process.argv[4])]); entries = await indexZip(zip); }
for (const kind of ['anime', 'kitsune']) {
  const expected = manifest[kind], bytes = await readFile(join(directory, expected.filename));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const inventory = await verifyMaster(buffer, expected, webcrypto);
  const presets = JSON.parse(await readFile(join(directory, `${kind === 'anime' ? 'Anime' : 'Kitsune'}_Expressions_R1.json`)));
  const bundled = JSON.parse(await readFile(new URL(`../src/experiments/sophia-face-qa/presets/${kind}.json`, import.meta.url)));
  assert.deepEqual(bundled, presets);
  if (zip) {
    const extracted = await readZipMaster(zip, findMaster(entries, expected.filename), expected.bytes);
    assert.equal(digest(new Uint8Array(extracted)), expected.sha256); result.zip[kind] = { masterHashMatches: true, bytes: extracted.byteLength };
  }
  const cycles = [];
  for (let cycle = 1; cycle <= 3; cycle++) {
    const start = performance.now(), gltf = await new GLTFLoader().parseAsync(buffer, ''), parseCpuMs = performance.now() - start;
    const mixer = new AnimationMixer(gltf.scene), face = createFaceController(gltf.scene, mixer, gltf.animations);
    gltf.scene.updateMatrixWorld(true);
    for (const mesh of face.meshes) mesh.skeleton?.update();
    const before = immutableFingerprint(gltf.scene), morphEffects = [];
    assert.equal(face.names.length, expected.morphs);
    for (const name of face.names) {
      let movedVertices = 0, maximum = 0, sampleMesh, sampleIndex;
      for (const mesh of face.meshes) {
        const attribute = mesh.geometry.morphAttributes.position[mesh.morphTargetDictionary[name]];
        for (let i = 0; i < attribute.count; i++) {
          const amount = Math.hypot(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
          if (amount > 1e-7) movedVertices++;
          if (amount > maximum) { maximum = amount; sampleMesh = mesh; sampleIndex = i; }
        }
      }
      assert.ok(movedVertices > 0 && maximum > 1e-7, `Empty position morph: ${name}`);
      face.neutral();
      const beforeVertex = sampleMesh.getVertexPosition(sampleIndex, sampleMesh.position.clone());
      face.neutral(); face.set(name, 0.37);
      for (const mesh of face.meshes) assert.ok(Math.abs(mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]] - 0.37) < 1e-6);
      const afterVertex = sampleMesh.getVertexPosition(sampleIndex, sampleMesh.position.clone());
      const evaluatedDelta = afterVertex.distanceTo(beforeVertex);
      assert.ok(evaluatedDelta > 1e-8, `No evaluated vertex motion: ${name}`);
      morphEffects.push({ name, movedVertices, maximumTargetDelta: maximum, evaluatedSampleDeltaAt037: evaluatedDelta });
    }
    for (const values of Object.values(presets)) {
      face.preset(values);
      for (const mesh of face.meshes) for (const name of face.names) assert.ok(Math.abs(mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]] - (values[name] ?? 0)) < 1e-6);
    }
    const samples = [];
    for (const time of [0, 0.67, 1.5, 2.2, 3, 6.8, 9]) {
      face.play(); mixer.setTime(time + inventory.animations[0].start); const weights = face.weights();
      for (const mesh of face.meshes) for (const name of face.names) assert.ok(Math.abs(mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]] - weights[name]) < 1e-6);
      samples.push({ time, maximumWeight: Math.max(...Object.values(weights)) });
    }
    assert.ok(samples.some(s => s.maximumWeight > 0.9));
    face.set('Smile_L', 0.35); assert.equal(face.playing, false); const paused = face.weights(); mixer.update(0.5); assert.deepEqual(face.weights(), paused);
    face.neutral(); assert.ok(Object.values(face.weights()).every(v => v === 0));
    assert.equal(immutableFingerprint(gltf.scene), before, 'Geometry/material/UV/skinning/bone data changed');
    face.dispose(); const disposal = disposeGltf(gltf);
    cycles.push({ cycle, parseCpuMs, primitiveCount: face.meshes.length, morphsExercised: face.names.length, morphEffects, presetsExercised: Object.keys(presets).length, demoSamples: samples, neutralReturn: 'PASS', immutableRuntimeData: 'PASS', disposal });
  }
  assert.equal(digest(await readFile(join(directory, expected.filename))), expected.sha256);
  result.models[kind] = { sha256: inventory.sha256, bytes: expected.bytes, bones: inventory.bones, triangles: inventory.triangles, morphs: inventory.names, animations: inventory.animations, cycles };
}
result.bitmapLifecycle = { created: bitmapsCreated, closed: bitmapsClosed }; assert.equal(bitmapsCreated, bitmapsClosed);
if (process.argv[3]) await writeFile(resolve(process.argv[3]), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
