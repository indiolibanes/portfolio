// Face skin response, calculated without three: the numbers the lit face material must produce under the stage rig.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HSIN_FACE_SKIN as P, stageIrradiance, faceSkinResponse, lambertResponse, unlitResponse, srgbToLinear, linearToSrgb, hexToLinear, toSrgb8, relativeLuminance} from '../src/scripts/hsin-face-skin.mjs';
import {HSIN_STAGE_LIGHTS as RIG} from '../src/scripts/hsin-stage-lighting.mjs';
import {HSIN_LUNAR_PRESENTATION} from '../src/scripts/hsin-lunar-presentation.mjs';
import {loadRig, forward, skinMatrices, skinNormals, presentationState} from '../scripts/lib/hsin-rig.mjs';

const lin = (a) => a.map((v) => srgbToLinear(v / 255));
// Measured on the production GLB face texture (2048x2048 sRGB): centre of the face and the median skin pixel.
const centre = lin([252, 232, 236]), median = lin([251, 213, 213]);
// Body skin albedo medians measured on Up_D and Down_D (lit PBR in the same scene).
const neck = lin([237, 211, 208]), arm = lin([219, 192, 183]);

// Colour helpers round-trip.
for (const v of [0, .01, .2, .5, .9, 1]) assert.ok(Math.abs(linearToSrgb(srgbToLinear(v)) - v) < 1e-9);
assert.deepEqual(hexToLinear(0xffffff).map((v) => +v.toFixed(6)), [1, 1, 1]);

// 1. The defect: an unlit face is constant under every light.
const lights = [0, .25, .5, .78, 1].map((n) => stageIrradiance(RIG, n));
const unlit = lights.map(() => toSrgb8(unlitResponse(centre)));
assert.ok(unlit.every((c) => c.join() === unlit[0].join()), 'unlit face does not react to light');

// 2. The lit face reacts: monotonic in the key light, with a real light-to-shadow range.
let previous = -1;
const lit = [0, .2, .4, .6, .78, .95].map((n) => faceSkinResponse(centre, stageIrradiance(RIG, n)));
for (const c of lit) { const l = relativeLuminance(c); assert.ok(l > previous, 'luminance grows with the key light'); previous = l; }
const shadow = relativeLuminance(lit[0]), front = relativeLuminance(faceSkinResponse(centre, stageIrradiance(RIG, .78)));
assert.ok(shadow / front > .5 && shadow / front < .8, `soft anime shadow, not flat and not harsh: ${(shadow / front).toFixed(2)}`);
const shadowSrgb = toSrgb8(lit[0]), frontSrgb = toSrgb8(faceSkinResponse(centre, stageIrradiance(RIG, .78)));
assert.ok(frontSrgb[0] - shadowSrgb[0] >= 25, `visible local contrast in sRGB: ${frontSrgb[0] - shadowSrgb[0]}`);

// 3. No clipping and no grey, on the REAL face: posed vertex normals of the production GLB in the presented pose,
//    rotated by the stage root yaw into the world where the lights live.
const unit = ([x, y, z]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const keyDir = unit(RIG.key.position), rimDir = unit(RIG.rim.position), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const rig = loadRig(await readFile(new URL('../public/assets/characters/hsin/models/hsin-v2.0.glb', import.meta.url)));
const profile = JSON.parse(await readFile(new URL('../public/assets/characters/hsin/models/hsin-v2.1-profile.json', import.meta.url)));
const faceMesh = rig.meshByMaterial(/Face Xin/), matrices = skinMatrices(rig, forward(rig, presentationState(rig, profile))), normals = skinNormals(rig, faceMesh, matrices);
const yaw = (HSIN_LUNAR_PRESENTATION.cameraAzimuth - HSIN_LUNAR_PRESENTATION.bodyApparentYaw) * Math.PI / 180, c = Math.cos(yaw), sn = Math.sin(yaw);
let worst = 0, samples = 0; const lumByNdl = [];
for (let v = 0; v < faceMesh.count; v++) {
 const n = [normals[v * 3] * c + normals[v * 3 + 2] * sn, normals[v * 3 + 1], -normals[v * 3] * sn + normals[v * 3 + 2] * c]; // rotation about +Y
 const irradiance = stageIrradiance(RIG, dot(n, keyDir), dot(n, rimDir));
 for (const albedo of [centre, median]) {
  const out = faceSkinResponse(albedo, irradiance); samples++; worst = Math.max(worst, ...out);
  assert.ok(out.every((x) => x > 0 && x <= 1), `inside the displayable range: ${out.map((x) => x.toFixed(3))}`);
  assert.ok(out[0] >= out[1] && out[1] >= out[2], 'warm skin ordering R >= G >= B');
 }
 lumByNdl.push(relativeLuminance(faceSkinResponse(centre, irradiance)));
}
lumByNdl.sort((a, b) => a - b);
const p10 = lumByNdl[Math.floor(lumByNdl.length * .1)], p90 = lumByNdl[Math.floor(lumByNdl.length * .9)];
assert.ok(worst < .985, `highlight headroom on the real face without tone mapping: ${worst.toFixed(3)}`);
assert.ok(p10 / p90 > .55 && p10 / p90 < .85, `the real face has visible volume (p10/p90 luminance ${(p10 / p90).toFixed(2)}): not flat, not harsh`);
// The old face was pink (blue above green); the new one has peach separation between red and blue.
const oldRb = toSrgb8(centre)[0] - toSrgb8(centre)[2], newRb = frontSrgb[0] - frontSrgb[2];
assert.ok(newRb > oldRb * 1.5, `warmer than the recovered pink: R-B ${oldRb} -> ${newRb}`);

// 4. Coherence with the body: the face stays the focal point but is not a separate glowing object. The band comes from
//    real WebGL frames (see docs/hsin-v201-face-fidelity.md): the old unlit face was 2.4-3.0x brighter than the body skin.
for (const [name, body] of [['neck', neck], ['arm', arm]]) {
 const ratio = front / relativeLuminance(lambertResponse(body, stageIrradiance(RIG, .78)));
 assert.ok(ratio > 1 && ratio < 2.5, `face/${name} lit luminance ratio ${ratio.toFixed(2)} within the focal-point band`);
}
// Less white than the old unlit face, never darker than the shadowed body skin.
assert.ok(front < relativeLuminance(unlitResponse(centre)), 'brighter-than-lit-skin pallor is gone');
assert.ok(shadow > relativeLuminance(lambertResponse(neck, stageIrradiance(RIG, 0))), 'shadow side keeps a warm floor');

// 5. Parameters are frozen, versioned and finite.
assert.ok(Object.isFrozen(P) && Object.isFrozen(P.tint) && Object.isFrozen(P.floor) && /^2\.0\.1-face-r\d+$/.test(P.version));
assert.ok([...P.tint, ...P.floor].every((v) => Number.isFinite(v) && v >= 0 && v <= 1.5));

// 6. The public stage uses the shared rig and applies the face skin before compiling, and releases it on teardown.
const stage = await readFile(new URL('../src/scripts/hsin-stage.ts', import.meta.url), 'utf8');
assert.ok(stage.includes("from './hsin-stage-lighting.mjs'") && stage.includes('createStageLights(T)'), 'stage uses the shared light rig');
assert.ok(stage.includes("from './hsin-face-skin.mjs'") && stage.includes('createFaceSkin('), 'stage applies the face skin');
assert.ok(stage.indexOf('faceSkin.apply()') > -1 && stage.indexOf('faceSkin.apply()') < stage.indexOf('renderer.compileAsync'), 'face skin exists before the programs are compiled');
assert.ok(stage.includes('faceSkin?.restore()') && stage.indexOf('faceSkin?.restore()') < stage.indexOf('collect(scene);releaseCollected()'), 'face skin is restored before resources are collected');
assert.ok(!/new T\.(AmbientLight|DirectionalLight|PointLight|SpotLight)/.test(stage), 'no stray lights in the stage');
assert.equal((await readFile(new URL('../src/scripts/hsin-stage-lighting.mjs', import.meta.url), 'utf8')).match(/new T\.\w*Light/g).length, 3, 'exactly ambient, key and rim');
assert.equal(RIG.ambient.color, 0xb7c9e3); assert.equal(RIG.key.intensity, 1.8); assert.equal(RIG.rim.intensity, 1.15); // unchanged from V2.0.1

console.log('Hsin face skin math: unlit defect proven, lit response with soft shadow, warm, unclipped, coherent with body skin, shared rig PASS');
