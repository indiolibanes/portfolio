// Hair Caress against the real posed hair, face, bangs and torso (offline rig evaluator, validated against three.js by hsin-rig-parity). No three.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ctx, hairPose, keyTargets} from '../scripts/solve-hsin-hair-caress.mjs';
import {measurePose, nearestTo} from '../scripts/lib/hsin-arm-metrics.mjs';
import {qAngle} from '../scripts/lib/hsin-math.mjs';

const acting = JSON.parse(readFileSync(new URL('../public/assets/characters/hsin/models/hsin-v2.1-acting.json', import.meta.url))), hair = acting.poses.hairCaress, n = hair.names.length, q = (f, i) => f.slice(i * 4, i * 4 + 4);
assert.equal(n, 18); assert.ok(hair.names.slice(0, 6).every((name, i) => name === hairPose.names[i]), 'arm chain = the approved left chain'); assert.ok(hair.names.every((name) => /L$/.test(name)), 'left side only');
assert.ok(hair.frames.length >= 3, 'sampled trajectory, independent of historical frame count'); assert.ok(hair.frames.every((f) => f.length === n * 4 && f.every(Number.isFinite)));
const maxDiff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
assert.ok(maxDiff(hair.frames[0], hair.rest) < 2e-6 && maxDiff(hair.frames.at(-1), hair.rest) < 2e-6, 'starts and ends exactly at rest');
assert.ok(maxDiff(hair.rest.slice(0, 24), hairPose.rest) < 1e-9, 'rest = the approved left rest');
const {hoverIn, start, end, hoverOut} = hair.stages; assert.ok(0 < hoverIn && hoverIn < start && start < end && end < hoverOut && hoverOut < 1, 'stages are ordered');

// Continuity: velocity-continuous spline, no step or acceleration spikes, no bone moving the wrong way around.
let step = 0, accel = 0, restTravel = 0;
for (let i = 1; i < hair.frames.length; i++) for (let k = 0; k < n; k++) step = Math.max(step, qAngle(q(hair.frames[i - 1], k), q(hair.frames[i], k)) * 180 / Math.PI);
for (let i = 2; i < hair.frames.length; i++) for (let k = 0; k < n; k++) accel = Math.max(accel, Math.abs(qAngle(q(hair.frames[i - 1], k), q(hair.frames[i], k)) - qAngle(q(hair.frames[i - 2], k), q(hair.frames[i - 1], k))) * 180 / Math.PI);
assert.ok(step < 7 && accel < 3, `smooth: max step ${step.toFixed(2)}°/frame, max change ${accel.toFixed(2)}°/frame²`);
// Slow at the ends of the whole gesture (ease from rest and back to rest).
const first = Math.max(...Array.from({length: n}, (_, k) => qAngle(q(hair.frames[0], k), q(hair.frames[1], k)))) * 180 / Math.PI; assert.ok(first < 1.2, 'gentle departure from rest: ' + first.toFixed(2));

const at = (i) => { const f = hair.frames[i], m = measurePose(ctx, ctx.names.map((_, k) => q(f, k)), new Map(hair.names.slice(6).map((name, k) => [name, q(f, 6 + k)])), {radius: .06, groups: ['distalIndex', 'index', 'otherFingers', 'thumb', 'hand', 'forearm']}); return {...m.clearance, toTarget: (name) => nearestTo(ctx, m.world, ctx.groups.distalIndex, keyTargets[name]).distance}; };
const frameAt = phase => Math.round(phase * (hair.frames.length - 1));
const strokeFrames = [0,.2,.5,.8,1].map(u=>frameAt(start+(end-start)*u));
// Preserve the legacy sample coverage as normalized phases, then add semantic boundaries.
const samples = [...new Set([0,26,34,36,39,43,46,50,54,60,70,80].map(f=>frameAt(f/86)).concat(strokeFrames,frameAt(hoverIn),frameAt(hoverOut)))];
const rest=at(0),hoverFrame=at(frameAt(hoverIn)),frames=Object.fromEntries(samples.map(i=>[i,at(i)]));
for(const i of strokeFrames) assert.ok(frames[i]['distalIndex:hair'] > .0008 && frames[i]['distalIndex:hair'] < .006, `pad on hair during semantic stroke at ${i}`);
assert.ok(at(frameAt(start)).toTarget('start') < .004 && at(frameAt(end)).toTarget('end') < .005 && hoverFrame.toTarget('hoverIn') < .004, 'semantic contact and hover boundaries reach solved targets');
assert.ok(hoverFrame['distalIndex:hair'] > .006, 'approach hovers before contact');
assert.ok(at(frameAt(hoverOut))['distalIndex:hair'] > .006 || at(frameAt(hoverOut+(1-hoverOut)*.4))['distalIndex:hair'] > .015, 'semantic release leaves the hair');
// Safety on every sampled frame: face, bangs, torso, curled fingers off the hair.
for (const [i, m] of Object.entries({0: rest, 26: hoverFrame, ...frames})) {
 assert.ok(m['hand:face'] > .035 && m['forearm:face'] > .035 && m['thumb:face'] > .025 && m['otherFingers:face'] > .02 && m['distalIndex:face'] > .015, `clear of the face at frame ${i}`);
 assert.ok(m['hand:bangs'] > .02 && m['otherFingers:bangs'] > .008 && m['thumb:bangs'] > .01, `clear of the bangs at frame ${i}`);
 assert.ok(m['otherFingers:hair'] > .008 && m['thumb:hair'] > .008 && m['hand:hair'] > .015, `only the pad touches the hair at frame ${i}`);
 for (const [key, need] of [['hand:torso', .008], ['forearm:torso', .008], ['otherFingers:torso', .004], ['thumb:torso', .004]]) assert.ok(m[key] > Math.min(rest[key], need) - .001, `${key} keeps at least min(rest, ${need * 1000} mm) at frame ${i} (${(m[key] * 1000).toFixed(1)} vs ${(rest[key] * 1000).toFixed(1)} mm at rest)`);
}
console.log('Hsin Hair Caress geometry: rest to rest, velocity-continuous, index pad 1-6 mm from the real hair surface during the stroke, hovering before and after, face/bangs/torso clear (visual approval PENDING)');
