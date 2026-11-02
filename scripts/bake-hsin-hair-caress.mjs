/** Bakes the left Hair Caress (rest -> hover -> contact start -> stroke -> contact end -> hover -> rest) from five solved poses.
 * The path is a C1 Hermite spline through the waypoints in rotation-vector space (velocity continuous through every waypoint, zero at
 * both ends), with a small per-segment lag (forearm, wrist, then fingers) so the limb follows through instead of moving as one block.
 * Usage: node scripts/bake-hsin-hair-caress.mjs START.json MID.json END.json HOVERIN.json HOVEROUT.json OUT.json */
import {readFileSync, writeFileSync} from 'node:fs';
import {ctx, rig, hairRest, chainFrom, fingerBones, fingerAngles, restQ, hinge, keyTargets} from './solve-hsin-hair-caress.mjs';
import {measurePose, nearestTo} from './lib/hsin-arm-metrics.mjs';
import {qMul, qConj, qLog, qExp, qAxisAngle, qNorm, qAngle, sub, len} from './lib/hsin-math.mjs';

export const TIMES = [0, 34, 44, 51, 58, 68, 88, 108]; // rest, hoverIn, start, mid, end, hoverOut, homeMid, rest
const APPROACH = [0, 34]; // the validated approach segment; the way home passes through its midpoint
const names = [...ctx.names, ...fingerBones.flat()], armLag = [0, 1.5, 3, 0, 1.5, 3], fingerLag = [4, 5.5, 7];
const rest6 = [0, 1, 2, 3, 4, 5].map((i) => hairRest.slice(i * 4, i * 4 + 4));
const clamp = (v) => Math.max(0, Math.min(TIMES.at(-1), v));

function hermite(values, t, times = TIMES) { // values: array of vectors at `times`
 t = Math.max(times[0], Math.min(times.at(-1), t)); let k = times.findIndex((x, i) => i < times.length - 1 && t >= x && t <= times[i + 1]); if (k < 0) k = times.length - 2;
 const slope = (i) => i === 0 || i === times.length - 1 ? values[0].map(() => 0) : values[i].map((_, c) => (values[i + 1][c] - values[i - 1][c]) / (times[i + 1] - times[i - 1]));
 const h = times[k + 1] - times[k], u = (t - TIMES[k]) / h, u2 = u * u, u3 = u2 * u, m0 = slope(k), m1 = slope(k + 1);
 return values[k].map((_, c) => (2 * u3 - 3 * u2 + 1) * values[k][c] + (u3 - 2 * u2 + u) * h * m0[c] + (-2 * u3 + 3 * u2) * values[k + 1][c] + (u3 - u2) * h * m1[c]);
}
const approachMid = (values) => hermite([values[0], values[1]], 17, APPROACH);
/** Follow-through lag acts on the approach from rest and on the way home, and is zero from hover-in to hover-out, so every joint
 * reaches the solved waypoints together (a lagging wrist would drag the pad off the hair). Slope stays below 1, so time never runs backwards. */
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const lagScale = (f) => f <= TIMES[1] ? smooth((TIMES[1] - f) / 12) : f >= TIMES[5] ? smooth((f - TIMES[5]) / 12) * smooth((TIMES.at(-1) - f) / 14) : 0; // zero from hover-in to hover-out and at the very end
const rotVec = (q, base) => { const d = qMul(q, qConj(base)); return qLog(d); }; // rotation from rest, as a vector
const fromVec = (v, base) => qNorm(qMul(qExp(v), base));

export function bakeHair(solutions) {
 const order = ['rest', 'hoverIn', 'start', 'mid', 'end', 'hoverOut', 'homeMid', 'rest'];
 const solved = (n) => n === 'rest' || n === 'homeMid' ? null : solutions[n];
 const armVecs = order.map((n) => solved(n) ? chainFrom(solved(n).x).map((q, i) => rotVec(q, rest6[i])) : n === 'rest' ? rest6.map(() => [0, 0, 0]) : null);
 const angles = order.map((n) => solved(n) ? fingerAngles(solved(n).x.slice(9, 12)) : fingerBones.map(() => [0, 0, 0]));
 // On the way home the hand passes through the midpoint of the validated approach path: it keeps the sleeve off the torso.
 armVecs[6] = rest6.map((_, i) => approachMid([armVecs[0][i], armVecs[1][i]]));
 angles[6] = fingerBones.map((_, g) => [0, 1, 2].map((k) => approachMid([[angles[0][g][k]], [angles[1][g][k]]])[0]));
 const frames = [];
 for (let f = 0; f <= TIMES.at(-1); f++) {
  const row = [];
  for (let i = 0; i < 6; i++) row.push(...fromVec(hermite(armVecs.map((c) => c[i]), f - armLag[i] * lagScale(f)), rest6[i]));
  fingerBones.forEach((g, gi) => g.forEach((bone, k) => row.push(...qNorm(qMul(restQ(bone), qAxisAngle(hinge, hermite(angles.map((a) => [a[gi][k]]), f - fingerLag[k] * lagScale(f))[0]))))));
  frames.push(row.map((v) => +v.toFixed(6)));
 }
 const last = TIMES.at(-1), rest = [...rest6.flat(), ...fingerBones.flat().flatMap((b) => restQ(b))];
 return {names, rest, frames, stages: {hoverIn: TIMES[1] / last, start: TIMES[2] / last, end: TIMES[4] / last, hoverOut: TIMES[5] / last}, side: 'L'};
}

/** Dense audit: sub-sampled frames; contact distance along the stroke, clearances, step and acceleration limits. */
export function auditHair(baked, subsamples = 3) {
 const n = baked.names.length, q = (f, i) => f.slice(i * 4, i * 4 + 4), report = {minClearance: {}, contactStroke: [], hover: [], maxStepDegrees: 0, accelerationDegrees: 0};
 const slerp = (a, b, t) => { const out = []; for (let k = 0; k < n; k++) { const x = q(a, k), y = q(b, k); let d = x[0] * y[0] + x[1] * y[1] + x[2] * y[2] + x[3] * y[3], s = d < 0 ? -1 : 1; out.push(...qNorm(x.map((v, i) => v * (1 - t) + s * y[i] * t))); } return out; };
 const hair = ctx.surfaces.hair;
 for (let i = 0; i < baked.frames.length; i++) for (let s = 0; s < (i === baked.frames.length - 1 ? 1 : subsamples); s++) {
  const f = s ? slerp(baked.frames[i], baked.frames[i + 1], s / subsamples) : baked.frames[i], t = i + s / subsamples;
  const m = measurePose(ctx, ctx.names.map((_, k) => q(f, k)), new Map(baked.names.slice(6).map((name, k) => [name, q(f, 6 + k)])), {radius: .06, groups: ['distalIndex', 'index', 'otherFingers', 'thumb', 'hand', 'forearm']});
  for (const [key, v] of Object.entries(m.clearance)) report.minClearance[key] = Math.min(report.minClearance[key] ?? Infinity, v);
  if (t >= TIMES[2] && t <= TIMES[4]) report.contactStroke.push(m.clearance['distalIndex:hair']);
  if (t >= TIMES[1] - 4 && t <= TIMES[1]) report.hover.push(m.clearance['distalIndex:hair']);
 }
 for (let i = 1; i < baked.frames.length; i++) for (let k = 0; k < n; k++) report.maxStepDegrees = Math.max(report.maxStepDegrees, qAngle(q(baked.frames[i - 1], k), q(baked.frames[i], k)) * 180 / Math.PI);
 for (let i = 2; i < baked.frames.length; i++) for (let k = 0; k < n; k++) report.accelerationDegrees = Math.max(report.accelerationDegrees, Math.abs(qAngle(q(baked.frames[i - 1], k), q(baked.frames[i], k)) - qAngle(q(baked.frames[i - 2], k), q(baked.frames[i - 1], k))) * 180 / Math.PI);
 return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
 const [startPath, midPath, endPath, inPath, outPath, out] = process.argv.slice(2), read = (p) => JSON.parse(readFileSync(p, 'utf8'));
 const baked = bakeHair({start: read(startPath), mid: read(midPath), end: read(endPath), hoverIn: read(inPath), hoverOut: read(outPath)}), audit = auditHair(baked);
 const mm = (v) => +(v * 1000).toFixed(1);
 console.log(JSON.stringify({frames: baked.frames.length, stages: baked.stages, strokeToHairMm: [mm(Math.min(...audit.contactStroke)), mm(Math.max(...audit.contactStroke))], maxStep: +audit.maxStepDegrees.toFixed(2), accel: +audit.accelerationDegrees.toFixed(2), minMm: Object.fromEntries(Object.entries(audit.minClearance).filter(([k]) => !k.endsWith('signed')).map(([k, v]) => [k, mm(v)]))}, null, 1));
 if (out) writeFileSync(out, JSON.stringify({baked, audit}, null, 1));
}
