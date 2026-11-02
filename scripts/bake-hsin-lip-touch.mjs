/** Bakes the Lip Touch trajectory (Signature Chin -> lower lip -> back) from a solver solution.
 * Output is plain quaternion data in the acting profile; the runtime plays it, it never solves anything.
 * Usage: node scripts/bake-hsin-lip-touch.mjs SOLUTION.json OUT.json */
import {readFileSync, writeFileSync} from 'node:fs';
import {ctx, rig, profile, sigPose, sigFinal, chainFrom, fingerExtra, restQ, bone, hinge, curl, target, lowerLip} from './solve-hsin-lip-touch.mjs';
import {measurePose, nearestTo} from './lib/hsin-arm-metrics.mjs';
import {qMul, qSlerp, qAxisAngle, qAngle, qNorm} from './lib/hsin-math.mjs';

export const STAGE2_FRAMES = 28;
const minJerk = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (u * (u * 6 - 15) + 10); };
const lagged = (u, delay) => minJerk((u - delay) / (1 - delay));

const fingerBones = [['1', '11', '12'], ['2', '21', '22'], ['3', '31', '32'], ['4', '41', '42']].map((g) => g.map((s) => `ORG-Bip001Finger${s}R`));
export const NAMES = [...ctx.names, ...fingerBones.flat()];
// Joint delays: shoulder leads, elbow, wrist, then the fingers from proximal to distal (segment lag).
const ARM_DELAY = [0, .04, .09, 0, .04, .09], FINGER_DELAY = [.12, .16, .2];

export function bakeLip(solution, {stage2 = STAGE2_FRAMES} = {}) {
 const lipArm = chainFrom(solution.x), target12 = solution.x.slice(9, 12);
 const curlAngles = new Map(); // bone -> flexion angle at contact
 fingerBones[0].forEach((n, k) => curlAngles.set(n, target12[k]));
 [2, 3, 4].forEach((f, g) => fingerBones[g + 1].forEach((n, k) => curlAngles.set(n, curl[f][k])));
 const rest = NAMES.map((n) => restQ(n)), frames = [];
 const armAt = (i, u) => ctx.names.map((_, k) => i <= 64 ? sigPose.frames[i].slice(k * 4, k * 4 + 4) : qSlerp(sigFinal[k], lipArm[k], lagged(u, ARM_DELAY[k])));
 const fingerAt = (u) => { const out = []; fingerBones.forEach((g, gi) => g.forEach((n, k) => out.push(qMul(restQ(n), qAxisAngle(hinge, curlAngles.get(n) * lagged(u, FINGER_DELAY[k] + gi * .02)))))); return out; };
 const total = 65 + stage2;
 for (let i = 0; i < total; i++) { const u = i <= 64 ? 0 : (i - 64) / stage2; frames.push(qNorm2([...armAt(i, u), ...(i <= 64 ? fingerBones.flat().map((n) => restQ(n)) : fingerAt(u))])); }
 return {names: NAMES, rest: rest0(), frames, stages: {signature: 64 / (total - 1), contact: 1}};
 function rest0() { return [...ctx.names.map((n) => sigPose.rest.slice(ctx.names.indexOf(n) * 4, ctx.names.indexOf(n) * 4 + 4)), ...fingerBones.flat().map((n) => restQ(n))].flat(); }
 function qNorm2(list) { return list.flat().map((v) => +v.toFixed(7)); }
}

/** Dense geometric audit of a baked pose: sub-sampled frames, clearance by group, step sizes and the contact track. */
export function auditLip(baked, subsamples = 4) {
 const n = baked.names.length, q = (f, i) => f.slice(i * 4, i * 4 + 4);
 const report = {frames: baked.frames.length, minClearance: {}, maxStepDegrees: {}, contactTrack: [], accelerationDegrees: 0};
 const evalFrame = (f) => ({arm6: ctx.names.map((_, i) => q(f, i)), extra: new Map(baked.names.slice(6).map((name, i) => [name, q(f, 6 + i)]))});
 const mix = (a, b, t) => a.map((v, i) => { const qa = q(a, Math.floor(i / 4)), qb = q(b, Math.floor(i / 4)); return null; });
 for (let i = 0; i < baked.frames.length; i++) for (let s = 0; s < (i === baked.frames.length - 1 ? 1 : subsamples); s++) {
  const t = s / subsamples, a = baked.frames[i], b = baked.frames[Math.min(i + 1, baked.frames.length - 1)];
  const f = []; for (let k = 0; k < n; k++) f.push(...qSlerp(q(a, k), q(b, k), t));
  const {arm6, extra} = evalFrame(f), m = measurePose(ctx, arm6, extra, {groups: ['distalIndex', 'index', 'otherFingers', 'thumb', 'hand', 'forearm', 'upper']});
  for (const [key, v] of Object.entries(m.clearance)) report.minClearance[key] = Math.min(report.minClearance[key] ?? Infinity, v);
  if (s === 0) report.contactTrack.push(+nearestTo(ctx, m.world, ctx.groups.distalIndex, target).distance.toFixed(5));
 }
 for (let i = 1; i < baked.frames.length; i++) for (let k = 0; k < n; k++) { const d = qAngle(q(baked.frames[i - 1], k), q(baked.frames[i], k)) * 180 / Math.PI; report.maxStepDegrees[baked.names[k]] = Math.max(report.maxStepDegrees[baked.names[k]] ?? 0, d); }
 for (let i = 2; i < baked.frames.length; i++) for (let k = 0; k < n; k++) { const d1 = qAngle(q(baked.frames[i - 2], k), q(baked.frames[i - 1], k)), d2 = qAngle(q(baked.frames[i - 1], k), q(baked.frames[i], k)); report.accelerationDegrees = Math.max(report.accelerationDegrees, Math.abs(d2 - d1) * 180 / Math.PI); }
 return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
 const [solutionPath, outPath] = process.argv.slice(2), solution = JSON.parse(readFileSync(solutionPath, 'utf8'));
 const baked = bakeLip(solution), audit = auditLip(baked);
 console.log(JSON.stringify({frames: baked.frames.length, stages: baked.stages, contactMin: Math.min(...audit.contactTrack), contactEnd: audit.contactTrack.at(-1), maxStep: Math.max(...Object.values(audit.maxStepDegrees)), accel: audit.accelerationDegrees, clearance: Object.fromEntries(Object.entries(audit.minClearance).map(([k, v]) => [k, +v.toFixed(4)]))}, null, 1));
 if (outPath) writeFileSync(outPath, JSON.stringify({baked, audit, solution}, null, 1));
}
