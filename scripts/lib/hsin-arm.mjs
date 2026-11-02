/** Arm authoring context: chains, moving vertex sets, static surfaces and clearance sampling on the real mesh.
 * Offline only. The runtime never imports this file. */
import {forward, skinMatrices, skinVertices, skinNormals, skinVertexAt, verticesInfluencedBy, presentationState, nodePosition} from './hsin-rig.mjs';
import {buildSurface} from './hsin-proximity.mjs';
import {qMul, qExp, qAxisAngle, sub, len, qNorm} from './hsin-math.mjs';

export const chainNames = (side) => ['ORG-Bip001UpperArm', 'ORG-Bip001Forearm', 'ORG-Bip001Hand', 'DEF-Bip001UpperArm', 'DEF-Bip001Forearm', 'DEF-Bip001Hand'].map((n) => n + side);
export const fingerNames = (side) => [1, 2, 3, 4, 0].flatMap((f) => [`${f}`, `${f}1`, `${f}2`].map((s) => `ORG-Bip001Finger${s}${side}`));
const armJointNames = (side) => [...chainNames(side), `DEF-Bip001UpperArm${side}001`, `DEF-Bip001Forearm${side}001`, ...fingerNames(side)];

export function createArmContext(rig, profile, side, {cell = .012} = {}) {
 const base = presentationState(rig, profile), ids = chainNames(side).map((n) => rig.bone(n));
 const restWorld = forward(rig, base), restMatrices = skinMatrices(rig, restWorld);
 const moving = [];
 for (const mesh of rig.meshes) { if (/Eye/.test(mesh.material)) continue; const list = verticesInfluencedBy(rig, mesh, armJointNames(side), .5); if (list.length) moving.push({mesh, list: Int32Array.from(list)}); }
 const movingSet = new Map(moving.map(({mesh, list}) => [mesh, new Set(list)]));
 // Static surfaces: every triangle whose vertices are not driven by this arm.
 const surfaces = {};
 const staticTriangles = (mesh) => { const set = movingSet.get(mesh), out = []; for (let t = 0; t < mesh.indices.length / 3; t++) if (!set || !(set.has(mesh.indices[t * 3]) || set.has(mesh.indices[t * 3 + 1]) || set.has(mesh.indices[t * 3 + 2]))) out.push(t); return out; };
 const surfaceOf = (mesh, triangles) => { const nrm = skinNormals(rig, mesh, restMatrices), pos = skinVertices(rig, mesh, restMatrices); return {...buildSurface(pos, mesh.indices, {cell, normals: nrm, triangles}), positions: pos, normals: nrm, mesh}; };
 for (const [key, re] of [['face', /Face Xin/], ['bangs', /Bangs Xin/], ['hair', /Hair Xin/]]) { const mesh = rig.meshByMaterial(re); surfaces[key] = surfaceOf(mesh, null); }
 surfaces.torso = ['Up Xin', 'Down Xin', 'Cloth Xin'].map((m) => { const mesh = rig.meshes.find((x) => x.material.endsWith(m)); return surfaceOf(mesh, staticTriangles(mesh)); });
 const sample = (list, n) => { // farthest-point sampling on rest positions
  if (list.length <= n) return list.slice(); const chosen = [list[0]], d = new Float64Array(list.length).fill(Infinity);
  while (chosen.length < n) { const c = chosen[chosen.length - 1]; let bestI = 0, best = -1; list.forEach((v, i) => { const dist = len(sub([mesh0.positions[v * 3], mesh0.positions[v * 3 + 1], mesh0.positions[v * 3 + 2]], [mesh0.positions[c * 3], mesh0.positions[c * 3 + 1], mesh0.positions[c * 3 + 2]])); d[i] = Math.min(d[i], dist); if (d[i] > best) { best = d[i]; bestI = i; } }); chosen.push(list[bestI]); }
  return chosen;
 }; let mesh0 = null;
 const pick = (names, threshold = .5, count = 24) => rig.meshes.filter((m) => !/Eye|Face|Hair|Bangs/.test(m.material)).flatMap((mesh) => { mesh0 = mesh; return sample(verticesInfluencedBy(rig, mesh, names, threshold), count).map((v) => ({mesh, v})); });
 const groups = {
  distalIndex: pick([`ORG-Bip001Finger12${side}`], .5, 20), index: pick([`ORG-Bip001Finger1${side}`, `ORG-Bip001Finger11${side}`], .5, 14),
  otherFingers: pick(['2', '21', '22', '3', '31', '32', '4', '41', '42'].map((s) => `ORG-Bip001Finger${s}${side}`), .5, 24), thumb: pick(['0', '01', '02'].map((s) => `ORG-Bip001Finger${s}${side}`), .5, 10),
  hand: pick([`ORG-Bip001Hand${side}`], .5, 24), forearm: pick([`ORG-Bip001Forearm${side}`, `DEF-Bip001Forearm${side}`, `DEF-Bip001Forearm${side}001`], .5, 24), upper: pick([`ORG-Bip001UpperArm${side}`, `DEF-Bip001UpperArm${side}`, `DEF-Bip001UpperArm${side}001`], .5, 24),
 };
 const point = (world, {mesh, v}, out) => skinVertexAt(rig, mesh, v, world, null, out);
 return {rig, side, base, ids, restWorld, restMatrices, moving, surfaces, groups, point, names: chainNames(side)};
}

/** Overrides = presentation + the six chain quaternions + optional extra bone quaternions. */
export function withPose(ctx, chain6, extra = null, base = ctx.base) {
 const ov = new Map(base); ctx.names.forEach((n, i) => ov.set(ctx.rig.bone(n), chain6[i])); if (extra) for (const [name, q] of extra) ov.set(ctx.rig.bone(name), q); return ov;
}

/** Minimum signed clearance of a vertex group against a static surface. Positive = outside. */
export function clearance(ctx, world, group, surface, radius = .08) {
 let min = Infinity, at = null; const p = [0, 0, 0];
 for (const s of group) { ctx.point(world, s, p); const q = surface.query(p, radius); const d = q ? q.signed : radius; if (d < min) { min = d; at = {mesh: s.mesh.material, v: s.v, p: p.slice()}; } }
 return {min, at};
}
export {nodePosition, qMul, qExp, qAxisAngle, qNorm};
