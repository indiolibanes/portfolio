/** CPU cost of the acting hot path on the real rig (Node, no WebGL). Indicative only: a CI runner is not a phone or a GPU.
 * Measures what the stage does per frame for the new gestures: quaternion playback of the baked chains and the world-matrix update.
 * Usage: node scripts/bench-hsin-acting.mjs */
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createBakedPose} from '../src/scripts/hsin-baked-pose.mjs';
import {createWeightPath, createHairCaress, createLipHairComposition} from '../src/scripts/hsin-lip-hair.mjs';

globalThis.self = globalThis; globalThis.createImageBitmap = async () => ({width: 1, height: 1, close() {}}); globalThis.ProgressEvent = class {};
const bytes = await readFile(new URL('../public/assets/models/hsin/hsin-v2.0.glb', import.meta.url)), acting = JSON.parse(await readFile(new URL('../public/assets/models/hsin/hsin-v2.1-acting.json', import.meta.url)));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''), scene = new THREE.Scene(); scene.matrixWorldAutoUpdate = false; scene.add(gltf.scene);
const meshes = []; gltf.scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); }); const bones = [...new Set(meshes.flatMap((m) => m.skeleton.bones))];
scene.updateMatrixWorld(true);
const time = (label, n, fn) => { for (let i = 0; i < 200; i++) fn(i); const t = performance.now(); for (let i = 0; i < n; i++) fn(i); const per = (performance.now() - t) / n; console.log(`${label}: ${(per * 1000).toFixed(1)} µs/frame (${n} frames)`); return per; };
const lip = createBakedPose({THREE, data: acting.poses.lipTouch, bones});
const results = {
 lipPlayback: time('Lip Touch playback (18 bones, slerp between frames)', 20000, (i) => lip.apply((Math.sin(i / 40) + 1) / 2)),
 sceneUpdate: time('scene.updateMatrixWorld (full rig, as the stage does when the pose changes)', 2000, () => scene.updateMatrixWorld()),
};
if (acting.poses.hairCaress) { const caress = createBakedPose({THREE, data: acting.poses.hairCaress, bones}); results.hairPlayback = time('Hair Caress playback', 20000, (i) => caress.apply((Math.sin(i / 40) + 1) / 2)); }
console.log(JSON.stringify({node: process.version, bones: bones.length, results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, +(v * 1000).toFixed(1)])), unit: 'µs per frame', caveat: 'CI runner CPU; not a device or GPU measurement'}));
const budget = results.lipPlayback + (results.hairPlayback ?? 0);
if (budget > 0.25) { console.error(`acting playback costs ${budget.toFixed(3)} ms per frame, over the 0.25 ms guard`); process.exit(1); }
