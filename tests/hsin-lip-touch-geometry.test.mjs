// Lip Touch against the real posed meshes (offline rig evaluator, validated against three.js by hsin-rig-parity). No three, no WebGL.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ctx, sigPose, target, lowerLip} from '../scripts/solve-hsin-lip-touch.mjs';
import {measurePose, nearestTo} from '../scripts/lib/hsin-arm-metrics.mjs';
import {qAngle} from '../scripts/lib/hsin-math.mjs';

const file = (path) => readFileSync(new URL('../' + path, import.meta.url)), sha = (buffer) => createHash('sha256').update(buffer).digest('hex');
const actingBytes = file('public/assets/characters/hsin/models/hsin-v2.1-acting.json'), acting = JSON.parse(actingBytes), manifest = JSON.parse(file('src/data/hsin-v201-acting.json'));
const lip = acting.poses.lipTouch, q = (f, i) => f.slice(i * 4, i * 4 + 4), n = lip.names.length;

// Provenance: this data belongs to exactly this model and this approved profile, and the manifest matches the file.
assert.equal(acting.modelSha256, sha(file('public/assets/characters/hsin/models/hsin-v2.0.glb'))); assert.equal(acting.profileSha256, sha(file('public/assets/characters/hsin/models/hsin-v2.1-profile.json')));
assert.equal(manifest.sha256, sha(actingBytes)); assert.equal(manifest.bytes, actingBytes.length); assert.equal(manifest.profileSha256, acting.profileSha256);
assert.equal(n, 18); assert.ok(lip.names.slice(0, 6).every((name, i) => name === sigPose.names[i]), 'arm chain = the approved signature chain');
assert.ok(lip.frames.length === 93 && lip.frames.every((f) => f.length === n * 4 && f.every(Number.isFinite)) && lip.rest.length === n * 4);
assert.ok(actingBytes.length < 140000, 'small: ' + actingBytes.length);

// Signature Chin is preserved bit for bit (to the 6 decimals stored) and the fingers stay at rest until stage 2.
const maxDiff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
for (let i = 0; i <= 64; i++) { assert.ok(maxDiff(lip.frames[i].slice(0, 24), sigPose.frames[i]) < 2e-6, 'arm frame ' + i + ' equals the approved signature'); assert.ok(maxDiff(lip.frames[i].slice(24), lip.rest.slice(24)) < 2e-6, 'fingers at rest in stage 1'); }
assert.ok(maxDiff(lip.frames[0], lip.rest) < 2e-6, 'frame 0 is the rest pose'); assert.ok(Math.abs(lip.stages.signature - 64 / 92) < 1e-9);

// Continuity of the baked path: bounded angular steps and accelerations, every bone.
let step = 0, accel = 0;
for (let i = 1; i < lip.frames.length; i++) for (let k = 0; k < n; k++) step = Math.max(step, qAngle(q(lip.frames[i - 1], k), q(lip.frames[i], k)) * 180 / Math.PI);
for (let i = 2; i < lip.frames.length; i++) for (let k = 0; k < n; k++) accel = Math.max(accel, Math.abs(qAngle(q(lip.frames[i - 1], k), q(lip.frames[i], k)) - qAngle(q(lip.frames[i - 2], k), q(lip.frames[i - 1], k))) * 180 / Math.PI);
assert.ok(step < 6 && accel < 3, `smooth: max step ${step.toFixed(2)}°/frame, max change ${accel.toFixed(2)}°/frame²`);

// Real mesh geometry on sampled frames (signature end, approach, contact).
const at = (i) => { const f = lip.frames[i], m = measurePose(ctx, ctx.names.map((_, k) => q(f, k)), new Map(lip.names.slice(6).map((name, k) => [name, q(f, 6 + k)])), {groups: ['distalIndex', 'index', 'otherFingers', 'thumb', 'hand', 'forearm']}); return {...m.clearance, toLip: nearestTo(ctx, m.world, ctx.groups.distalIndex, target).distance}; };
const frames = Object.fromEntries([64, 70, 76, 82, 88, 92].map((i) => [i, at(i)]));
const distances = [64, 70, 76, 82, 88, 92].map((i) => frames[i].toLip);
for (let i = 1; i < distances.length; i++) assert.ok(distances[i] < distances[i - 1] + (i === distances.length - 1 ? .002 : 1e-4), 'fingertip approaches the lip monotonically (a settle of at most 2 mm at the very end): ' + distances.map((d) => (d * 1000).toFixed(1)));
const end = frames[92];
assert.ok(end.toLip < .004, `fingertip within 4 mm of the lower-lip target: ${(end.toLip * 1000).toFixed(2)} mm`);
assert.ok(lowerLip.point && Math.abs(Math.hypot(...target.map((v, i) => v - lowerLip.point[i])) - .0025) < 1e-6, 'target is 2.5 mm off a real lower-lip surface point');
for (const i of [64, 70, 76, 82, 88, 92]) { const m = frames[i];
 assert.ok(m['distalIndex:face:signed'] > -1e-4 && m['index:face:signed'] > -1e-4, `no vertex of the index behind the skin at frame ${i}`);
 assert.ok(m['hand:face'] > .03 && m['thumb:face'] > .03 && m['otherFingers:face'] > .025, `hand, thumb and curled fingers stay off the face at frame ${i}: ${[m['hand:face'], m['thumb:face'], m['otherFingers:face']].map((v) => (v * 1000).toFixed(0))}`);
 assert.ok(m['forearm:face'] > .06, 'forearm clear of the face'); }
// Stage 2 must not be tighter than the approved Signature end against hair/bangs/torso (it is looser: the hand leaves the sleeve and the hair).
for (const key of ['hand:bangs', 'hand:torso', 'forearm:torso', 'otherFingers:bangs', 'otherFingers:torso', 'thumb:torso']) for (const i of [76, 82, 88, 92]) assert.ok(frames[i][key] > frames[64][key] - .0012, `${key} at frame ${i} is not tighter than at the Signature end (${(frames[i][key] * 1000).toFixed(1)} vs ${(frames[64][key] * 1000).toFixed(1)} mm)`);
assert.ok(end['hand:torso'] > .02 && end['forearm:torso'] > .02, 'sleeve and hand clear of the torso at contact');
assert.equal(lip.validation.visual ?? acting.visual, 'PENDING');
console.log(`Hsin Lip Touch geometry: signature preserved, continuous path, fingertip ${(end.toLip * 1000).toFixed(1)} mm from the target 2.5 mm off the lower-lip surface, no vertex behind the skin, hand/fingers/forearm clear (visual approval PENDING)`);
