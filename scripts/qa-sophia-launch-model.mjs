/** CPU geometry/rig QA against a local copy of the public rocket GLB.
 * Textures are deliberately skipped. This is NOT a visual or WebGL approval.
 * node scripts/qa-sophia-launch-model.mjs MODEL.glb [report.json]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createLaunchDirector } from '../src/scripts/sophia-launch-director.ts';

if (!process.argv[2]) throw new Error('Pass a read-only local GLB path.');
const bytes = await readFile(process.argv[2]);
const loader = new GLTFLoader();
loader.register(() => ({ name: 'CPU_QA_SKIP_TEXTURES', loadTexture() { return Promise.resolve(new THREE.Texture()); } }));
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const originals = JSON.stringify(gltf.animations.map(c => THREE.AnimationClip.toJSON(c)));
const controls = { target: new THREE.Vector3(), addEventListener() {}, enableRotate: false, enableZoom: false };
const director = createLaunchDirector(gltf, new THREE.Scene(), new THREE.PerspectiveCamera(38, 16 / 9, .005, 1000), controls, () => false);
assert.equal(director.supported, true, 'Actual public model hierarchy must be supported.');
const samples = [];
for (const t of [0, 1.1, 2.1, 4.1, 5.1, 5.45, 5.8, 6.1, 6.4, 8.2, 9]) {
  director.apply(t); const sample = director.snapshot(); samples.push(sample);
  assert.ok(sample.riderWorld.every(Number.isFinite));
  if (t < 2.1) assert.equal(sample.riderVisible, false);
  if (t >= 5.8) assert.ok(sample.riderSeatError < 1e-6, 'No carrier/mount drift after docking.');
  if (t <= 6.1) assert.equal(sample.ribbonsVisible, false);
  assert.deepEqual(sample.baseWorld, samples[0].baseWorld);
}
director.apply(5.45); const first = director.snapshot(); director.apply(12); director.apply(0); director.apply(5.45);
assert.deepEqual(director.snapshot(), first, 'Seeking must reproduce exact world transforms.');
assert.equal(JSON.stringify(gltf.animations.map(c => THREE.AnimationClip.toJSON(c))), originals);
assert.ok(director.stats.triangles < 12000);
const report = { result: 'CPU_GEOMETRY_AND_RIG_PASS', visual: 'VISUAL_QA_PENDING',
  modelSha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
  preservedClips: gltf.animations.length, texturesSkipped: true, cradle: director.stats, samples,
  limits: ['No WebGL context or texture inspection in this script.', 'No triangle collision or physical Android approval.'] };
if (process.argv[3]) await writeFile(process.argv[3], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2)); director.dispose();
