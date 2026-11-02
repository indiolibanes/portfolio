// Face skin response, calculated without three: the numbers the lit face material must produce under the stage rig.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HSIN_FACE_SKIN as P, stageIrradiance, faceSkinResponse, lambertResponse, unlitResponse, srgbToLinear, linearToSrgb, hexToLinear, toSrgb8, relativeLuminance} from '../src/scripts/hsin-face-skin.mjs';
import {HSIN_STAGE_LIGHTS as RIG} from '../src/scripts/hsin-stage-lighting.mjs';

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

// 3. No clipping and no grey: over every possible surface normal (real key and rim directions, not independent
//    cosines), lit highlights stay inside the displayable range and skin stays warm (R >= G >= B).
const unit = ([x, y, z]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const keyDir = unit(RIG.key.position), rimDir = unit(RIG.rim.position), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
let worst = 0;
for (let i = 0; i <= 48; i++) for (let j = 0; j < 96; j++) {
 const theta = i / 48 * Math.PI, phi = j / 96 * 2 * Math.PI, n = [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)];
 for (const albedo of [centre, median]) {
  const c = faceSkinResponse(albedo, stageIrradiance(RIG, dot(n, keyDir), dot(n, rimDir)));
  worst = Math.max(worst, ...c);
  assert.ok(c.every((v) => v > 0 && v <= 1), `inside the displayable range: ${c.map((v) => v.toFixed(3))}`);
  assert.ok(c[0] >= c[1] && c[1] >= c[2], 'warm skin ordering R >= G >= B');
 }
}
assert.ok(worst < .97, `highlight headroom without tone mapping: ${worst.toFixed(3)}`);
// The old face was pink (blue above green); the new one has peach separation between red and blue.
const oldRb = toSrgb8(centre)[0] - toSrgb8(centre)[2], newRb = frontSrgb[0] - frontSrgb[2];
assert.ok(newRb > oldRb * 1.5, `warmer than the recovered pink: R-B ${oldRb} -> ${newRb}`);

// 4. Coherence with the body: the face stays the focal point but is not a separate glowing object.
for (const [name, body] of [['neck', neck], ['arm', arm]]) {
 const ratio = front / relativeLuminance(lambertResponse(body, stageIrradiance(RIG, .78)));
 assert.ok(ratio > 1 && ratio < 2.15, `face/${name} lit luminance ratio ${ratio.toFixed(2)} within the focal-point band`);
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
