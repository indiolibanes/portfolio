/** Offline rig evaluator for the production GLB: forward kinematics, linear-blend skinning and morph targets, in plain
 * Node (no three, no WebGL). Used only by authoring and QA scripts. A parity test against three.js runs in CI. */
import {compose, mul, invert, transformPoint, transformDir, qNorm, qMul, qConj, qApply, qAxisAngle, unit, sub, cross, add, scale as vscale} from './hsin-math.mjs';

/** The name three.js gives a node (PropertyBinding.sanitizeNodeName). The runtime refers to bones by this name. */
export const sanitize = (name) => name.replace(/\s/g, '_').replace(/[\[\].:/]/g, '');

export function loadRig(buffer) {
 const jsonLength = buffer.readUInt32LE(12), json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength)), bin = buffer.subarray(28 + jsonLength);
 const n = json.nodes.length, parent = new Int32Array(n).fill(-1);
 json.nodes.forEach((node, i) => (node.children ?? []).forEach((c) => { parent[c] = i; }));
 const byName = new Map(); json.nodes.forEach((node, i) => byName.set(sanitize(node.name ?? ''), i));
 const rest = json.nodes.map((node) => ({t: node.translation ?? [0, 0, 0], q: node.rotation ?? [0, 0, 0, 1], s: node.scale ?? [1, 1, 1]}));
 // Parents before children, so one pass computes every world matrix.
 const order = []; const seen = new Uint8Array(n);
 const visit = (i) => { if (seen[i]) return; if (parent[i] >= 0) visit(parent[i]); seen[i] = 1; order.push(i); };
 for (let i = 0; i < n; i++) visit(i);
 const view = (accessorIndex) => {
  const a = json.accessors[accessorIndex], comps = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16}[a.type];
  const size = {5126: 4, 5125: 4, 5123: 2, 5121: 1, 5122: 2, 5120: 1}[a.componentType];
  const read = (offset, type = a.componentType) => { switch (type) { case 5126: return bin.readFloatLE(offset); case 5125: return bin.readUInt32LE(offset); case 5123: return bin.readUInt16LE(offset); case 5121: return bin[offset]; case 5122: return bin.readInt16LE(offset); default: return bin.readInt8(offset); } };
  const norm = a.normalized ? ({5123: 65535, 5121: 255, 5122: 32767, 5120: 127}[a.componentType]) : 1;
  const out = a.componentType === 5126 || a.normalized ? new Float64Array(a.count * comps) : new Int32Array(a.count * comps);
  if (a.bufferView !== undefined) {
   const bv = json.bufferViews[a.bufferView], stride = bv.byteStride ?? comps * size, base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
   for (let i = 0; i < a.count; i++) for (let c = 0; c < comps; c++) out[i * comps + c] = read(base + i * stride + c * size) / norm;
  }
  if (a.sparse) { // zeros everywhere except the listed elements (used by morph targets)
   const sp = a.sparse, ib = json.bufferViews[sp.indices.bufferView], vb = json.bufferViews[sp.values.bufferView], isize = {5125: 4, 5123: 2, 5121: 1}[sp.indices.componentType];
   for (let k = 0; k < sp.count; k++) {
    const target = read((ib.byteOffset ?? 0) + (sp.indices.byteOffset ?? 0) + k * isize, sp.indices.componentType);
    for (let c = 0; c < comps; c++) out[target * comps + c] = read((vb.byteOffset ?? 0) + (sp.values.byteOffset ?? 0) + (k * comps + c) * size) / norm;
   }
  }
  return {data: out, count: a.count, comps};
 };
 const skin = json.skins[0], joints = skin.joints, ibm = view(skin.inverseBindMatrices).data;
 const meshes = json.nodes.flatMap((node, nodeIndex) => node.mesh === undefined ? [] : [{nodeIndex, name: node.name, mesh: json.meshes[node.mesh], skin: node.skin}]).map(({nodeIndex, name, mesh}) => {
  const p = mesh.primitives[0], material = json.materials[p.material]?.name ?? '';
  const positions = view(p.attributes.POSITION).data, uv = view(p.attributes.TEXCOORD_0).data, normals = view(p.attributes.NORMAL).data;
  const jointIds = view(p.attributes.JOINTS_0).data, weights = view(p.attributes.WEIGHTS_0).data, indices = view(p.indices).data;
  const morphs = (p.targets ?? []).map((t) => view(t.POSITION).data), morphNames = mesh.extras?.targetNames ?? [];
  return {nodeIndex, name, material, positions, uv, normals, jointIds, weights, indices, morphs, morphNames, count: positions.length / 3};
 });
 const rig = {json, n, parent, byName, rest, order, joints, ibm, meshes, bone: (name) => { const i = byName.get(name); if (i === undefined) throw Error('Unknown bone ' + name); return i; }};
 rig.meshByMaterial = (re) => meshes.find((m) => re.test(m.material));
 return rig;
}

/** World matrices for every node; `overrides` maps node index -> local quaternion. */
export function forward(rig, overrides = new Map(), world = new Float64Array(rig.n * 16), scratch = new Float64Array(16)) {
 for (const i of rig.order) {
  const r = rig.rest[i], q = overrides.get(i) ?? r.q;
  compose(r.t, q, r.s, scratch);
  const p = rig.parent[i];
  if (p < 0) world.set(scratch, i * 16); else mul(world.subarray(p * 16, p * 16 + 16), scratch, world.subarray(i * 16, i * 16 + 16));
 }
 return world;
}

/** Skin matrices (world * inverseBind) per skin joint. */
export function skinMatrices(rig, world, only = null) {
 const out = new Float64Array(rig.joints.length * 16), tmp = new Float64Array(16);
 for (let j = 0; j < rig.joints.length; j++) { if (only && !only.has(j)) continue; mul(world.subarray(rig.joints[j] * 16, rig.joints[j] * 16 + 16), rig.ibm.subarray(j * 16, j * 16 + 16), tmp); out.set(tmp, j * 16); }
 return out;
}

/** Posed positions (model space) of a subset of vertices (or all). `morphWeights`: {name: weight}. Returns Float64Array(3*count). */
export function skinVertices(rig, mesh, matrices, subset = null, morphWeights = null) {
 const ids = subset ?? Array.from({length: mesh.count}, (_, i) => i), out = new Float64Array(mesh.count * 3), p = [0, 0, 0], a = [0, 0, 0];
 const morphIndex = morphWeights ? Object.entries(morphWeights).map(([name, w]) => [mesh.morphNames.indexOf(name), w]).filter(([i, w]) => i >= 0 && w) : [];
 for (const v of ids) {
  let x = mesh.positions[v * 3], y = mesh.positions[v * 3 + 1], z = mesh.positions[v * 3 + 2];
  for (const [mi, w] of morphIndex) { x += mesh.morphs[mi][v * 3] * w; y += mesh.morphs[mi][v * 3 + 1] * w; z += mesh.morphs[mi][v * 3 + 2] * w; }
  let rx = 0, ry = 0, rz = 0;
  for (let k = 0; k < 4; k++) {
   const w = mesh.weights[v * 4 + k]; if (!w) continue;
   transformPoint(matrices.subarray(mesh.jointIds[v * 4 + k] * 16, mesh.jointIds[v * 4 + k] * 16 + 16), x, y, z, a);
   rx += a[0] * w; ry += a[1] * w; rz += a[2] * w;
  }
  out[v * 3] = rx; out[v * 3 + 1] = ry; out[v * 3 + 2] = rz;
 }
 void p; return out;
}

/** Vertices whose weight on the named skin joints is at least `threshold`. */
export function verticesInfluencedBy(rig, mesh, jointNodeNames, threshold = .25) {
 const wanted = new Set(jointNodeNames.map((nm) => rig.joints.indexOf(rig.bone(nm)))), out = [];
 for (let v = 0; v < mesh.count; v++) { let w = 0; for (let k = 0; k < 4; k++) if (wanted.has(mesh.jointIds[v * 4 + k])) w += mesh.weights[v * 4 + k]; if (w >= threshold) out.push(v); }
 return out;
}

/** World position of a node from world matrices. */
export const nodePosition = (world, i) => [world[i * 16 + 12], world[i * 16 + 13], world[i * 16 + 14]];

/** Cinematic reference + lunar presentation compensation: the head the visitor actually sees. Matches the runtime
 * order (hsin-cinematic-idle -> hsin-lunar-presentation). Returns node -> local quaternion overrides. */
export function presentationState(rig, profile, presentation = {neckCompensation: 4, headCompensation: 18.8}) {
 const overrides = new Map();
 for (const row of profile.cinematicIdle.reference) overrides.set(rig.bone(row.name), row.quaternion.slice());
 let world = forward(rig, overrides);
 const up = unit(sub(nodePosition(world, rig.bone('ORG-Bip001Neck')), nodePosition(world, rig.bone('ORG-Bip001Spine2'))));
 const worldQuat = (i) => matrixQuat(world.subarray(i * 16, i * 16 + 16));
 for (const [part, degrees] of [['Neck', presentation.neckCompensation], ['Head', presentation.headCompensation]]) for (const prefix of ['ORG', 'DEF']) {
  const i = rig.bone(`${prefix}-Bip001${part}`), desired = qMul(qAxisAngle(up, degrees * Math.PI / 180), worldQuat(i)), p = rig.parent[i];
  overrides.set(i, qNorm(qMul(qConj(worldQuat(p)), desired)));
  world = forward(rig, overrides);
 }
 return overrides;
}

/** Quaternion of the rotation part of a (scale-free) matrix. */
export function matrixQuat(m) {
 const m00 = m[0], m01 = m[4], m02 = m[8], m10 = m[1], m11 = m[5], m12 = m[9], m20 = m[2], m21 = m[6], m22 = m[10], tr = m00 + m11 + m22;
 let x, y, z, w;
 if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = .25 * s; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s; }
 else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / s; x = .25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s; }
 else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / s; x = (m01 + m10) / s; y = .25 * s; z = (m12 + m21) / s; }
 else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = .25 * s; }
 return qNorm([x, y, z, w]);
}
export {transformPoint, transformDir, invert, add, vscale, cross, qApply};
