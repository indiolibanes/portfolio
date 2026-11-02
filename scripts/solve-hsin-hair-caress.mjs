/** Offline solver: left-hand hair caress. Five key poses on the real hair surface (hover, contact start, contact end, hover, plus the
 * rest pose at both ends handled by the bake): the pad of the index finger travels a short stroke along the surface, approaching and
 * leaving tangentially. Plain quaternion output; the runtime plays it back and never solves anything.
 * Usage: node scripts/solve-hsin-hair-caress.mjs [OUT.json] */
import {readFileSync, writeFileSync} from 'node:fs';
import {loadRig, forward} from './lib/hsin-rig.mjs';
import {createArmContext, withPose} from './lib/hsin-arm.mjs';
import {measurePose, nearestTo} from './lib/hsin-arm-metrics.mjs';
import {qMul, qExp, qAxisAngle, qAngle, sub, len, add, scale, dot, unit} from './lib/hsin-math.mjs';
import {multiStart, optimise} from './lib/hsin-solve.mjs';

const root = new URL('../', import.meta.url).pathname;
export const rig = loadRig(readFileSync(root + 'public/assets/models/hsin/hsin-v2.0.glb'));
export const profile = JSON.parse(readFileSync(root + 'public/assets/models/hsin/hsin-v2.1-profile.json'));
export const ctx = createArmContext(rig, profile, 'L');
export const hairPose = profile.poses.hair, hairRest = hairPose.rest;
const startArm = [0, 1, 2].map((i) => hairPose.frames[64].slice(i * 4, i * 4 + 4));
export const hinge = [1, 0, 0], SIDE = 'L';
export const fingerBones = [['1', '11', '12'], ['2', '21', '22'], ['3', '31', '32'], ['4', '41', '42']].map((g) => g.map((s) => `ORG-Bip001Finger${s}${SIDE}`));
export const restQ = (name) => ctx.base.get(rig.bone(name)) ?? rig.rest[rig.bone(name)].q;
/** Relaxed cascade: the index leads, each next finger curls a little more, so the hand reads soft and slightly curved. */
export const CASCADE = [0, .12, .22, .3];
export const fingerAngles = (index) => fingerBones.map((_, g) => index.map((a, k) => Math.max(-.1, Math.min(1.25, a + CASCADE[g] * (k === 2 ? .6 : 1)))));
export const fingerExtra = (index) => { const out = new Map(); fingerAngles(index).forEach((angles, g) => angles.forEach((a, k) => out.set(fingerBones[g][k], qMul(restQ(fingerBones[g][k]), qAxisAngle(hinge, a))))); return out; };
export const chainFrom = (x, base = startArm) => { const q = [0, 1, 2].map((i) => qMul(qExp(x.slice(i * 3, i * 3 + 3)), base[i])); return [...q, ...q]; };

// ---- Hair targets
const hair = ctx.surfaces.hair, ANCHOR = [+(process.env.HAIR_X ?? .099), +(process.env.HAIR_Y ?? 1.515), +(process.env.HAIR_Z ?? -.045)];
const GAP = .003, STROKE = +(process.env.HAIR_STROKE ?? .05), HOVER = .012, LEAD = .025;
const anchorHit = hair.query(ANCHOR, .08);
if (!anchorHit) throw Error('no hair surface near the anchor');
// Outward = away from the head centre (hair and bangs are open shells, so the vertex-normal sign is not trusted).
const HEAD_CENTRE = [0, 1.45, -.03], outward = (hit) => { const n = hit.normal; return dot(n, sub(hit.point, HEAD_CENTRE)) < 0 ? scale(n, -1) : n; };
const nA = unit(outward(anchorHit)), down = [0, -1, 0], tangent = unit(sub(down, scale(nA, dot(down, nA))));
const hitAt = (p) => { const h = hair.query(p, .08); return {point: h.point, normal: unit(outward(h))}; };
const sA = hitAt(anchorHit.point), sB = hitAt(add(sA.point, scale(tangent, STROKE)));
export const keyTargets = {
 hoverIn: add(add(sA.point, scale(tangent, -LEAD)), scale(sA.normal, HOVER + GAP)),
 start: add(sA.point, scale(sA.normal, GAP)), end: add(sB.point, scale(sB.normal, GAP)),
 hoverOut: add(add(sB.point, scale(tangent, LEAD)), scale(sB.normal, HOVER + GAP)),
};

const LIM = [.6, .9, 1.0], FLEX = [[-.1, .6], [-.1, .9], [-.1, .6]];
export function evaluate(x, goal, {warm = null, warmWeight = 0, full = false} = {}) {
 const world = forward(rig, withPose(ctx, chainFrom(x), fingerExtra(x.slice(9, 12)))), p = [0, 0, 0];
 let cost = 0, dTarget = Infinity;
 for (const s of ctx.groups.distalIndex) { ctx.point(world, s, p); dTarget = Math.min(dTarget, len(sub(p, goal))); }
 cost += 4e4 * dTarget * dTarget;
 for (let i = 0; i < 3; i++) cost += .5 * (Math.hypot(x[i * 3], x[i * 3 + 1], x[i * 3 + 2]) / LIM[i]) ** 2;
 for (let k = 0; k < 3; k++) { const f = x[9 + k]; if (f < FLEX[k][0]) cost += 200 * (FLEX[k][0] - f) ** 2; if (f > FLEX[k][1]) cost += 200 * (f - FLEX[k][1]) ** 2; }
 const chain = chainFrom(x), elbow = qAngle(chain[1], hairRest.slice(4, 8)) * 180 / Math.PI, wrist = qAngle(chain[2], hairRest.slice(8, 12)) * 180 / Math.PI;
 if (elbow > 150) cost += .02 * (elbow - 150) ** 2; if (wrist > 55) cost += .02 * (wrist - 55) ** 2;
 if (warm) cost += warmWeight * x.reduce((s, v, i) => s + (v - warm[i]) ** 2, 0);
 if (!full && cost > 60) return {cost: cost + 50};
 const report = {dTarget, elbow, wrist};
 const near = (g, key, min, w = 4e4) => { const m = measurePose; return null; };
 const metrics = measurePose(ctx, chain, fingerExtra(x.slice(9, 12)), {groups: ['index', 'otherFingers', 'thumb', 'hand', 'forearm']}).clearance;
 const need = [['hand:face', .02], ['forearm:face', .03], ['otherFingers:face', .02], ['thumb:face', .02], ['index:face', .015], ['hand:bangs', .012], ['otherFingers:bangs', .01], ['forearm:bangs', .012],
  ['hand:torso', .015], ['forearm:torso', .012], ['otherFingers:torso', .012], ['thumb:torso', .012], ['otherFingers:hair', .003], ['hand:hair', .006], ['thumb:hair', .004], ['forearm:hair', .006]];
 for (const [key, min] of need) { report[key] = metrics[key]; if (metrics[key] < min) cost += 4e4 * (min - metrics[key]) ** 2; }
 return {cost, report, world};
}

const solveOne = (goal, start, {warm = null, warmWeight = 0, seeds = [1, 2, 3], generations = 80, sigma = .2} = {}) => multiStart((x) => evaluate(x, goal, {warm, warmWeight}), start, seeds, {generations, sigma}, (seed, cost) => console.log('  seed', seed, 'cost', cost.toFixed(3)));
export function solveAll(log = console.log) {
 const out = {};
 log('start (contact) …'); out.start = solveOne(keyTargets.start, [0, 0, 0, 0, 0, 0, 0, 0, 0, .1, .1, .05], {seeds: [1, 2, 3, 4]});
 for (const name of ['end', 'hoverIn', 'hoverOut']) { log(name + ' …'); out[name] = solveOne(keyTargets[name], out.start.x, {warm: out.start.x, warmWeight: name === 'end' ? .4 : .25, seeds: [1, 2], generations: 60, sigma: .1}); }
 for (const [name, sol] of Object.entries(out)) { const e = evaluate(sol.x, keyTargets[name], {full: true}); sol.report = e.report; sol.cost = e.cost; }
 return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
 const outPath = process.argv[2];
 console.log('targets', JSON.stringify(Object.fromEntries(Object.entries(keyTargets).map(([k, v]) => [k, v.map((n) => +n.toFixed(4))]))), 'normal', nA.map((v) => +v.toFixed(2)), 'tangent', tangent.map((v) => +v.toFixed(2)));
 const solved = solveAll();
 for (const [name, s] of Object.entries(solved)) console.log(name, 'cost', s.cost.toFixed(3), JSON.stringify(Object.fromEntries(Object.entries(s.report).map(([k, v]) => [k, +v.toFixed(4)]))));
 if (outPath) writeFileSync(outPath, JSON.stringify({targets: keyTargets, anchor: ANCHOR, solutions: Object.fromEntries(Object.entries(solved).map(([k, s]) => [k, {x: s.x, cost: s.cost, report: s.report}]))}, null, 1));
}
