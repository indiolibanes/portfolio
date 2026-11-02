/** Offline solver: Lip Touch for the right hand, built on top of the approved Signature Chin.
 * The fingertip must rest at a real point of the lower-lip surface of the face mesh, in the presented head pose
 * (cinematic reference + lunar compensation), never at a proxy. Output is plain quaternion data; the runtime does no IK.
 * Usage: node scripts/solve-hsin-lip-touch.mjs [OUT.json] */
import {readFileSync, writeFileSync} from 'node:fs';
import {loadRig, forward, nodePosition} from './lib/hsin-rig.mjs';
import {createArmContext, withPose, clearance} from './lib/hsin-arm.mjs';
import {qMul, qExp, qAxisAngle, qLog, qAngle, sub, len, add, scale} from './lib/hsin-math.mjs';
import {rng, gauss, optimise as strategy} from './lib/hsin-solve.mjs';

const root = new URL('../', import.meta.url).pathname;
export const rig = loadRig(readFileSync(root + 'public/assets/models/hsin/hsin-v2.0.glb'));
export const profile = JSON.parse(readFileSync(root + 'public/assets/models/hsin/hsin-v2.1-profile.json'));
export const ctx = createArmContext(rig, profile, 'R');
export const sigPose = profile.poses.signature;
export const sigFinal = [0, 1, 2, 3, 4, 5].map((i) => sigPose.frames[64].slice(i * 4, i * 4 + 4));
const face = ctx.surfaces.face, SIDE = 'R';

// ---- Lip target on the real surface: UV (u, v) -> posed 3D point and outward normal.
export function uvToSurface(mesh, positions, normals, u, v) {
 for (let t = 0; t < mesh.indices.length / 3; t++) {
  const i = [mesh.indices[t * 3], mesh.indices[t * 3 + 1], mesh.indices[t * 3 + 2]], p = i.map((k) => [mesh.uv[k * 2], mesh.uv[k * 2 + 1]]);
  const den = (p[1][1] - p[2][1]) * (p[0][0] - p[2][0]) + (p[2][0] - p[1][0]) * (p[0][1] - p[2][1]); if (Math.abs(den) < 1e-12) continue;
  const a = ((p[1][1] - p[2][1]) * (u - p[2][0]) + (p[2][0] - p[1][0]) * (v - p[2][1])) / den, b = ((p[2][1] - p[0][1]) * (u - p[2][0]) + (p[0][0] - p[2][0]) * (v - p[2][1])) / den, c = 1 - a - b;
  if (a < -1e-9 || b < -1e-9 || c < -1e-9) continue;
  const mix = (arr) => [0, 1, 2].map((k) => arr[i[0] * 3 + k] * a + arr[i[1] * 3 + k] * b + arr[i[2] * 3 + k] * c);
  const n = mix(normals), l = Math.hypot(...n); return {point: mix(positions), normal: n.map((x) => x / l), triangle: t};
 }
 return null;
}
export const lowerLip = uvToSurface(face.mesh, face.positions, face.normals, +(process.env.LIP_U ?? .5), +(process.env.LIP_V ?? .514));
if (!lowerLip) throw Error('lip UV not on the face mesh');
export const GAP = .0025; export const target = add(lowerLip.point, scale(lowerLip.normal, GAP));

// ---- Fixed hand shape (relaxed curl for middle, ring, pinky; thumb at rest) and the three index joints we solve.
export const hinge = [1, 0, 0], bone = (f, s) => `ORG-Bip001Finger${s}${SIDE}`;
export const curl = {2: [.55, .85, .42], 3: [.68, .92, .42], 4: [.8, .98, .42]};
export const restQ = (name) => ctx.base.get(rig.bone(name)) ?? rig.rest[rig.bone(name)].q;
export const fingerExtra = (index) => {
 const extra = new Map();
 for (const f of [2, 3, 4]) [`${f}`, `${f}1`, `${f}2`].forEach((s, k) => extra.set(bone(f, s), qMul(restQ(bone(f, s)), qAxisAngle(hinge, curl[f][k]))));
 ['1', '11', '12'].forEach((s, k) => extra.set(bone(1, s), qMul(restQ(bone(1, s)), qAxisAngle(hinge, index[k]))));
 return extra;
};
const LIM = [.5, .8, 1.0], FLEX = [[-.15, .7], [-.15, 1.0], [-.15, .7]];
export const chainFrom = (x) => { const q = [0, 1, 2].map((i) => qMul(qExp(x.slice(i * 3, i * 3 + 3)), sigFinal[i])); return [...q, ...q]; };

const need = {index: .004, otherFingers: .014, thumb: .012, hand: .016, forearm: .016};
export function evaluate(x, full = false) {
 const world = forward(rig, withPose(ctx, chainFrom(x), fingerExtra(x.slice(9, 12)))), p = [0, 0, 0];
 let cost = 0;
 // contact: closest distal-index vertex to the lower lip and to the lip surface
 let dTarget = Infinity, dFace = Infinity, nearest = null;
 for (const s of ctx.groups.distalIndex) { ctx.point(world, s, p); const d = len(sub(p, target)); if (d < dTarget) { dTarget = d; nearest = p.slice(); } }
 cost += 4e4 * dTarget * dTarget;
 for (let i = 0; i < 3; i++) cost += .6 * (Math.hypot(x[i * 3], x[i * 3 + 1], x[i * 3 + 2]) / LIM[i]) ** 2;
 for (let k = 0; k < 3; k++) { const f = x[9 + k]; if (f < FLEX[k][0]) cost += 200 * (FLEX[k][0] - f) ** 2; if (f > FLEX[k][1]) cost += 200 * (f - FLEX[k][1]) ** 2; }
 const elbow = qAngle(chainFrom(x)[1], sigPose.rest.slice(4, 8)) * 180 / Math.PI; if (elbow > 142) cost += .02 * (elbow - 142) ** 2;
 const wrist = qAngle(chainFrom(x)[2], sigPose.rest.slice(8, 12)) * 180 / Math.PI; if (wrist > 62) cost += .02 * (wrist - 62) ** 2;
 if (!full && cost > 40) return {cost: cost + 50};
 const report = {dTarget, elbow, wrist};
 for (const s of ctx.groups.distalIndex) { ctx.point(world, s, p); const q = face.query(p, .05); if (q) { dFace = Math.min(dFace, q.signed); if (q.signed < .0008) cost += 3e5 * (.0008 - q.signed) ** 2; } }
 report.fingertipFaceClearance = dFace;
 for (const [name, min] of Object.entries(need)) { const c = clearance(ctx, world, ctx.groups[name], face, .05); report[name + 'Face'] = c.min; if (c.min < min) cost += 4e4 * (min - c.min) ** 2; }
 for (const [name, min] of [['forearm', .02], ['hand', .012], ['otherFingers', .012]]) for (const surf of ctx.surfaces.torso) { const c = clearance(ctx, world, ctx.groups[name], surf, .05); report[name + 'Torso'] = Math.min(report[name + 'Torso'] ?? 1, c.min); if (c.min < min) cost += 4e4 * (min - c.min) ** 2; }
 for (const key of ['hair', 'bangs']) for (const name of ['hand', 'otherFingers', 'index']) { const c = clearance(ctx, world, ctx.groups[name], ctx.surfaces[key], .05); report[name + key] = c.min; if (c.min < .003) cost += 2e4 * (.003 - c.min) ** 2; }
 return {cost, report, world, nearest};
}

export const optimise = (start, options) => strategy(evaluate, start, options);

if (import.meta.url === `file://${process.argv[1]}`) {
 const out = process.argv[2], start = [0, 0, 0, 0, 0, 0, 0, 0, 0, -.05, -.05, 0];
 console.log('lip target', target.map((v) => v.toFixed(4)), 'lower-lip surface point', lowerLip.point.map((v) => v.toFixed(4)));
 let best = null;
 for (const seed of [1, 2, 3, 4]) { const result = optimise(start, {seed}); console.log('seed', seed, 'cost', result.cost.toFixed(3)); if (!best || result.cost < best.cost) best = result; }
 const final = evaluate(best.x, true);
 console.log('best cost', final.cost.toFixed(3), JSON.stringify(Object.fromEntries(Object.entries(final.report).map(([k, v]) => [k, +v.toFixed(4)]))));
 console.log('x (rad)', best.x.map((v) => +v.toFixed(3)).join(' '));
 if (out) writeFileSync(out, JSON.stringify({x: best.x, cost: final.cost, report: final.report, target, lowerLip}, null, 1));
}
