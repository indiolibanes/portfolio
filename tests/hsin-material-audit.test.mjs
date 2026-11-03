// The GLB's own material facts that explain the V2.0.1 face: read from the JSON chunk, no three, no WebGL.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditGlb} from '../scripts/audit-hsin-materials.mjs';

const glb = await readFile(new URL('../public/assets/characters/hsin/models/hsin-v2.0.glb', import.meta.url));
const audit = auditGlb(glb), manifest = JSON.parse(await readFile(new URL('../src/data/hsin-v2-asset.json', import.meta.url)));
assert.equal(audit.sha256, manifest.sha256); assert.equal(audit.bytes, manifest.bytes);
const byName = (re) => audit.materials.find((m) => re.test(m.name));

// The diagnosis: only the face and the eyes ignore the lights.
const face = byName(/Face Xin/), eyes = byName(/Eye Xin/);
assert.ok(face.unlit && face.threeMaterial === 'MeshBasicMaterial' && !face.respondsToLights, 'the face material is KHR_materials_unlit');
assert.ok(eyes.unlit, 'eyes are unlit by design');
for (const m of audit.materials.filter((x) => /Bangs|Hair|Up |Down|Cloth|Tail/.test(x.name))) assert.ok(!m.unlit && m.respondsToLights, m.name + ' is lit');
assert.deepEqual(audit.materials.filter((m) => m.unlit && m.usedBy.length).map((m) => m.name.replace('Gathering Wives - ', '')), ['Face Xin', 'Wuwa - Eye Xin']);
// Colour inputs are not the cause: textures are base colour (sRGB by glTF rule), vertex colours are all 1.0, no morph normals.
assert.equal(face.textures.baseColor, 2); assert.equal(audit.images[2].slot, 'baseColor'); assert.equal(audit.images[4].slot, 'normal', 'normal maps are not colour textures');
assert.ok(audit.meshes.every((m) => m.vertexColorMinimum === 1), 'vertex colours are neutral: no hidden tint or baked shade');
assert.ok(audit.meshes.every((m) => !m.morphNormals), 'no morph normals: base normals stay valid under expressions');
assert.deepEqual(audit.meshes.filter((m) => m.morphTargets).map((m) => [m.material.replace('Gathering Wives - ', ''), m.morphTargets]), [['Face Xin', 18], ['Wuwa - Eye Xin', 8]]);
assert.equal(audit.skins.length, 2); assert.equal(audit.animations, 0); assert.ok(audit.extensionsRequired.includes('EXT_texture_webp'));

// The committed audit matches the live file.
const committed = JSON.parse(await readFile(new URL('../docs/hsin-v201-material-audit.json', import.meta.url)));
assert.deepEqual(committed, JSON.parse(JSON.stringify(audit)), 'docs/hsin-v201-material-audit.json is current (rerun scripts/audit-hsin-materials.mjs)');
console.log('Hsin material audit: face and eyes unlit, every other material lit, neutral vertex colours, sRGB base colour, no morph normals PASS');
