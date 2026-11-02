// The offline authoring rig (scripts/lib/hsin-rig.mjs) must place vertices where three.js does, otherwise every
// geometric proof made with it is worthless. Needs three (CI). No WebGL.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCinematicReference} from '../src/scripts/hsin-cinematic-idle.mjs';
import {createLunarPresentation, HSIN_LUNAR_PRESENTATION} from '../src/scripts/hsin-lunar-presentation.mjs';
import {createBakedPose} from '../src/scripts/hsin-baked-pose.mjs';
import {loadRig, forward, skinMatrices, skinVertices, presentationState} from '../scripts/lib/hsin-rig.mjs';

globalThis.self = globalThis; globalThis.createImageBitmap = async () => ({width: 1, height: 1, close() {}}); globalThis.ProgressEvent = class {};
const bytes = await readFile(new URL('../public/assets/models/hsin/hsin-v2.0.glb', import.meta.url)), profile = JSON.parse(await readFile(new URL('../public/assets/models/hsin/hsin-v2.1-profile.json', import.meta.url)));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''), model = gltf.scene;
model.updateMatrixWorld(true);
const meshes = []; model.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
const bones = [...new Set(meshes.flatMap((m) => m.skeleton.bones))];
createCinematicReference({bones, profile}).apply(); model.updateMatrixWorld(true);
// Root yaw 0 so model space == world space: camera azimuth equal to the nominal body yaw.
createLunarPresentation({THREE, model, bones, bounds: profile.bounds, cameraAzimuth: HSIN_LUNAR_PRESENTATION.bodyApparentYaw}).apply();
const signature = createBakedPose({THREE, data: profile.poses.signature, bones});

const rig = loadRig(bytes);
const compare = (label, overrides) => {
 model.updateMatrixWorld(true); for (const m of meshes) m.skeleton.update();
 const matrices = skinMatrices(rig, forward(rig, overrides)); let worst = 0, n = 0; const v = new THREE.Vector3();
 for (const mesh of meshes) {
  const mine = rig.meshes.find((x) => x.name.replace(/[.\s]/g, '') === mesh.name.replace(/[.\s]/g, ''))
   ?? rig.meshes.find((x) => x.nodeIndex === rig.byName.get(mesh.name)); assert.ok(mine, 'mesh ' + mesh.name);
  const posed = skinVertices(rig, mine, matrices);
  for (let i = 0; i < mine.count; i += 37) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); worst = Math.max(worst, Math.hypot(v.x - posed[i * 3], v.y - posed[i * 3 + 1], v.z - posed[i * 3 + 2])); n++; }
 }
 assert.ok(worst < 2e-4, `${label}: worst vertex error ${worst.toExponential(2)} m over ${n} vertices`);
 return worst;
};
const a = compare('presented rest', presentationState(rig, profile));
signature.apply(1); const sig = new Map(presentationState(rig, profile)); profile.poses.signature.names.forEach((name, i) => sig.set(rig.bone(name), profile.poses.signature.frames[64].slice(i * 4, i * 4 + 4)));
const b = compare('signature pose', sig);
console.log(`Hsin rig parity: offline evaluator matches three.js skinning (rest ${a.toExponential(1)} m, signature ${b.toExponential(1)} m) PASS`);
