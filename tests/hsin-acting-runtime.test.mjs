// Lip Touch and Hair Caress on the real production rig, through the runtime players. Needs three (CI). No WebGL.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCinematicReference} from '../src/scripts/hsin-cinematic-idle.mjs';
import {createLunarPresentation} from '../src/scripts/hsin-lunar-presentation.mjs';
import {createBakedPose} from '../src/scripts/hsin-baked-pose.mjs';
import {createHairCaress, createLipHairComposition} from '../src/scripts/hsin-lip-hair.mjs';

globalThis.self = globalThis; globalThis.createImageBitmap = async () => ({width: 1, height: 1, close() {}}); globalThis.ProgressEvent = class {};
const read = async (p) => readFile(new URL('../' + p, import.meta.url)), bytes = await read('public/assets/models/hsin/hsin-v2.0.glb');
const profile = JSON.parse(await read('public/assets/models/hsin/hsin-v2.1-profile.json')), acting = JSON.parse(await read('public/assets/models/hsin/hsin-v2.1-acting.json'));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''), model = gltf.scene; model.updateMatrixWorld(true);
const meshes = []; model.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); }); const bones = [...new Set(meshes.flatMap((m) => m.skeleton.bones))];
createCinematicReference({bones, profile}).apply(); createLunarPresentation({THREE, model, bones, bounds: profile.bounds}).apply();

const lipData = acting.poses.lipTouch, hairData = acting.poses.hairCaress;
assert.ok(lipData && hairData, 'both gestures are in the acting profile');
const lipPose = createBakedPose({THREE, data: lipData, bones}), hairPose = createBakedPose({THREE, data: hairData, bones});
assert.ok(lipPose.diagnostics().ready && hairPose.diagnostics().ready, 'every bone of both chains exists on the real rig');
assert.ok(lipPose.atBaseline() && hairPose.atBaseline(), 'the rest stored in the acting data is exactly the runtime rest (no drift, no rounding mismatch)');

const snapshot = () => new Map(bones.map((b) => [b.name, b.quaternion.toArray()])), same = (a, b) => a.every((v, i) => v === b[i]);
const before = snapshot(), owned = new Set([...lipData.names, ...hairData.names]);
// Player: exact frame values at integer positions, exact restoration, nothing else touched.
for (const [pose, data] of [[lipPose, lipData], [hairPose, hairData]]) {
 const last = data.frames.length - 1;
 for (const i of [1, Math.floor(last / 2), last - 1, last]) { pose.apply(i / last); data.names.forEach((name, k) => { const q = bones.find((b) => b.name === name).quaternion; for (let c = 0; c < 4; c++) assert.ok(Math.abs(q.toArray()[c] - data.frames[i][k * 4 + c]) < 1e-5, `${name} follows frame ${i}`); }); }
 pose.restore(); assert.ok(pose.atBaseline(), 'restore() returns every bone of the chain');
}
for (const b of bones) assert.ok(same(b.quaternion.toArray(), before.get(b.name)), b.name + ' is back exactly');

// Episodes through the real players: 5 seeds, a full composition each, only the owned chains move, everything returns exactly.
for (const seed of [1, 2, 3, 4, 5]) {
 const events = [], hair = createHairCaress({pose: hairPose, data: hairData, seed: seed ^ 5}), comp = createLipHairComposition({lip: lipPose, lipData, hair, seed, onEvent: (e) => events.push(e)});
 assert.equal(comp.start(true), true); const touched = new Set(); let ticks = 0;
 while (comp.busy() && ticks++ < 30 * 40) { comp.advance(1 / 30); for (const b of bones) if (!same(b.quaternion.toArray(), before.get(b.name))) touched.add(b.name); }
 assert.ok(!comp.busy() && comp.atBaseline(), 'seed ' + seed + ': both arms home');
 for (const name of touched) assert.ok(owned.has(name), `${name} moved but belongs to neither gesture`);
 for (const name of ['ORG-Bip001UpperArmR', 'ORG-Bip001UpperArmL', 'ORG-Bip001Finger1R', 'ORG-Bip001Finger1L']) assert.ok(touched.has(name), name + ' took part');
 for (const b of bones) assert.ok(same(b.quaternion.toArray(), before.get(b.name)), `seed ${seed}: ${b.name} restored exactly`);
 assert.deepEqual(events, ['gesture:prepare', 'gesture:hold', 'gesture:release']);
 // The right arm never carries the left gesture and vice versa.
 assert.ok(lipData.names.every((n) => /R$/.test(n)) && hairData.names.every((n) => /L$/.test(n)), 'right chain = lip, left chain = hair');
}
console.log('Hsin acting runtime: lip and hair players on the real rig, exact rest, exact frames, only owned bones move, exact restoration over 5 full episodes PASS');
