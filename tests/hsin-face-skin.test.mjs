// Face skin material swap on synthetic meshes and on the production GLB. Needs three (CI); no WebGL.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFaceSkin, auditFaceMaterials, HSIN_FACE_SKIN} from '../src/scripts/hsin-face-skin.mjs';
import {createStageLights, HSIN_STAGE_LIGHTS} from '../src/scripts/hsin-stage-lighting.mjs';

// --- Synthetic: swap, share the texture, restore the exact original, dispose the replacement, idempotence.
const texture = new THREE.Texture(); texture.colorSpace = THREE.SRGBColorSpace;
const unlitFace = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide, vertexColors: true}); unlitFace.name = 'Gathering Wives - Face Xin';
const eye = new THREE.MeshBasicMaterial({map: texture}); eye.name = 'Wuwa - Eye Xin';
const litFace = new THREE.MeshStandardMaterial({map: texture}); litFace.name = 'Face (already lit)';
const mk = (material) => new THREE.Mesh(new THREE.BufferGeometry(), material);
const [faceMesh, eyeMesh, litMesh] = [mk(unlitFace), mk(eye), mk(litFace)];
const skin = createFaceSkin({THREE, meshes: [faceMesh, eyeMesh, litMesh]});
assert.equal(skin.active, false); assert.equal(faceMesh.material, unlitFace, 'nothing changes before apply()');
assert.equal(skin.apply(), true); assert.equal(skin.apply(), true, 'idempotent');
const lit = faceMesh.material;
assert.ok(lit.isMeshLambertMaterial && lit !== unlitFace);
assert.equal(lit.map, texture, 'the same texture object, never a copy'); assert.equal(lit.emissiveMap, texture);
assert.equal(lit.side, THREE.DoubleSide); assert.equal(lit.vertexColors, false); assert.equal(lit.toneMapped, unlitFace.toneMapped); assert.equal(lit.transparent, false);
assert.match(lit.name, /Face Xin · lit skin /, 'family detection by name keeps working');
const linear = (c) => [c.r, c.g, c.b].map((v) => +v.toFixed(4));
assert.deepEqual(linear(lit.color), [...HSIN_FACE_SKIN.tint].map((v) => +v.toFixed(4)), 'tint is linear, not re-interpreted as sRGB');
assert.deepEqual(linear(lit.emissive), [...HSIN_FACE_SKIN.floor].map((v) => +v.toFixed(4)));
assert.equal(eyeMesh.material, eye, 'eyes stay unlit'); assert.equal(litMesh.material, litFace, 'an already lit face is not touched');
assert.deepEqual(skin.diagnostics().replaced, [faceMesh.name]);
let disposed = 0; lit.addEventListener('dispose', () => disposed++);
skin.restore(); assert.equal(faceMesh.material, unlitFace, 'exact original object restored'); assert.equal(disposed, 1, 'replacement disposed'); assert.equal(skin.active, false);
skin.restore(); assert.equal(disposed, 1, 'restore is idempotent');
assert.equal(createFaceSkin({THREE, meshes: [faceMesh], config: {...HSIN_FACE_SKIN, enabled: false}}).apply(), false, 'disabled config is a no-op');

// --- Shared light rig: ambient + key + rim, V2.0.1 values.
const rig = createStageLights(THREE);
assert.equal(rig.all.length, 3); assert.ok(rig.ambient.isAmbientLight && rig.key.isDirectionalLight && rig.rim.isDirectionalLight);
assert.equal(rig.key.intensity, HSIN_STAGE_LIGHTS.key.intensity); assert.deepEqual(rig.key.position.toArray(), [-2, 4, 5]); assert.deepEqual(rig.rim.position.toArray(), [-2, 4, -5]);

// --- Production GLB: the real face mesh is unlit before, lit after, with skinning, morph targets and base normals intact.
globalThis.self = globalThis; globalThis.createImageBitmap = async () => ({width: 1, height: 1, close() {}}); globalThis.ProgressEvent = class {};
const bytes = await readFile(new URL('../public/assets/characters/hsin/models/hsin-v2.0.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const meshes = []; gltf.scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
const before = auditFaceMaterials(meshes), faceBefore = before.find((r) => /Face Xin/.test(r.material));
assert.ok(faceBefore && faceBefore.type === 'MeshBasicMaterial' && faceBefore.lit === false, 'the diagnosis: the production face is unlit');
assert.equal(faceBefore.mapColorSpace, THREE.SRGBColorSpace, 'face map is sRGB: no colour-space error'); assert.equal(faceBefore.vertexColors, true);
assert.equal(faceBefore.hasMorphNormals, false); assert.ok(faceBefore.morphTargets >= 18);
const eyeBefore = before.find((r) => /Eye Xin/.test(r.material)); assert.equal(eyeBefore.lit, false, 'eyes remain unlit by design');
for (const row of before.filter((r) => /Up|Down|Cloth|Tail|Hair|Bangs/.test(r.material))) assert.equal(row.lit, true, row.material + ' is lit');
const face = meshes.find((m) => /Face Xin/.test(m.material.name)), influences = [...face.morphTargetInfluences], dictionary = {...face.morphTargetDictionary}, normals = face.geometry.attributes.normal.array.slice(0, 30);
const realSkin = createFaceSkin({THREE, meshes}); assert.equal(realSkin.apply(), true);
assert.ok(face.isSkinnedMesh && face.material.isMeshLambertMaterial && face.material.map.colorSpace === THREE.SRGBColorSpace);
assert.deepEqual([...face.morphTargetInfluences], influences, 'morph influences untouched'); assert.deepEqual(face.morphTargetDictionary, dictionary);
assert.deepEqual([...face.geometry.attributes.normal.array.slice(0, 30)], [...normals], 'base normals untouched');
assert.equal(auditFaceMaterials(meshes).filter((r) => r.lit === false).length, 1, 'only the eyes remain unlit');
realSkin.restore(); assert.ok(face.material.isMeshBasicMaterial, 'reversible on the real asset');

console.log('Hsin face skin: swap, shared texture, exact restore, disposal, shared rig, real GLB unlit->lit with morphs/skinning intact PASS');
