// Read-only structural audit of the checked-in Sophia 6H GLB for the R1.B preflight.
// Reproduces, with plain linear algebra (no three.js), the evidence the Work pilot was supposed to deliver:
// bind-pose integrity, Book/Pen attachment, Write-clip contact numbers, forehead star/occlusion, coat skinning/UV.
// STRUCTURAL ONLY: vertex-level, rest/sampled poses. It is NOT visual QA and NOT a triangle-triangle collision test.
// Usage: node scripts/sophia/adornments-audit.mjs [file.glb] [--out report.json]
import {writeFileSync} from 'node:fs';
import {openGlb, accessorReader} from './glb-census.mjs';

const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'public/experimental/sophia-alpha.glb';
const g = openGlb(file), j = g.json, read = accessorReader(g);
const r = (v, d = 4) => +Number(v).toFixed(d), mm = v => r(v * 1000, 2);

// ---- tiny column-major mat4 / quat helpers -------------------------------------------------
const I4 = () => { const m = new Float64Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
function compose(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = q, m = new Float64Array(16);
  m[0] = (1 - 2 * (y * y + z * z)) * s[0]; m[1] = 2 * (x * y + z * w) * s[0]; m[2] = 2 * (x * z - y * w) * s[0];
  m[4] = 2 * (x * y - z * w) * s[1]; m[5] = (1 - 2 * (x * x + z * z)) * s[1]; m[6] = 2 * (y * z + x * w) * s[1];
  m[8] = 2 * (x * z + y * w) * s[2]; m[9] = 2 * (y * z - x * w) * s[2]; m[10] = (1 - 2 * (x * x + y * y)) * s[2];
  m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1; return m;
}
function mul(a, b) { const o = new Float64Array(16); for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + rr] * b[c * 4 + k]; o[c * 4 + rr] = s; } return o; }
function inv(m) { // general 4x4 inverse
  const a = [...m], o = new Float64Array(16), A = (r_, c) => a[c * 4 + r_];
  const aug = Array.from({length: 4}, (_, i) => [...Array.from({length: 4}, (_, c) => A(i, c)), ...[0, 1, 2, 3].map(c => (c === i ? 1 : 0))]);
  for (let i = 0; i < 4; i++) { let p = i; for (let k = i + 1; k < 4; k++) if (Math.abs(aug[k][i]) > Math.abs(aug[p][i])) p = k; [aug[i], aug[p]] = [aug[p], aug[i]]; const d = aug[i][i]; for (let c = 0; c < 8; c++) aug[i][c] /= d; for (let k = 0; k < 4; k++) if (k !== i) { const f = aug[k][i]; for (let c = 0; c < 8; c++) aug[k][c] -= f * aug[i][c]; } }
  for (let i = 0; i < 4; i++) for (let c = 0; c < 4; c++) o[c * 4 + i] = aug[i][4 + c]; return o;
}
const pt = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
function slerp(a, b, t) { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; const bb = d < 0 ? b.map(v => -v) : b; d = Math.abs(d); let s0, s1; if (d > 0.9995) { s0 = 1 - t; s1 = t; } else { const th = Math.acos(d), sn = Math.sin(th); s0 = Math.sin((1 - t) * th) / sn; s1 = Math.sin(t * th) / sn; } const o = a.map((v, i) => s0 * v + s1 * bb[i]); const l = Math.hypot(...o); return o.map(v => v / l); }

// ---- scene graph + animation evaluation ------------------------------------------------------
const N = j.nodes, parent = {}; N.forEach((n, i) => (n.children || []).forEach(c => (parent[c] = i)));
const byName = Object.fromEntries(N.map((n, i) => [n.name, i]));
const order = []; (function dfs(i) { order.push(i); (N[i].children || []).forEach(dfs); })(j.scenes[j.scene].nodes[0]); // root -> ...
const skin = j.skins[0], IBM = read(skin.inverseBindMatrices).data;
const clips = Object.fromEntries(j.animations.map(a => [a.name, a.channels.map(ch => { const s = a.samplers[ch.sampler]; return {node: ch.target.node, path: ch.target.path, t: read(s.input).data, v: read(s.output).data, n: ch.target.path === 'rotation' ? 4 : 3}; })]));
const clipLen = name => Math.max(...clips[name].map(c => c.t[c.t.length - 1]));
function sample(c, t) { const T = c.t; let k = 0; if (t >= T[T.length - 1]) k = T.length - 2; else if (t > T[0]) while (T[k + 1] < t) k++; const f = Math.min(1, Math.max(0, (t - T[k]) / (T[k + 1] - T[k] || 1))), a = c.v.subarray(k * c.n, k * c.n + c.n), b = c.v.subarray((k + 1) * c.n, (k + 1) * c.n + c.n);
  return c.path === 'rotation' ? slerp([...a], [...b], f) : [...a].map((v, i) => v + (b[i] - v) * f); }
function worlds(clip, t) {
  const local = N.map(n => ({t: n.translation || [0, 0, 0], q: n.rotation || [0, 0, 0, 1], s: n.scale || [1, 1, 1]}));
  if (clip) for (const c of clips[clip]) local[c.node][{translation: 't', rotation: 'q', scale: 's'}[c.path]] = sample(c, t);
  const W = new Array(N.length); for (const i of order) { const L = compose(local[i].t, local[i].q, local[i].s); W[i] = parent[i] == null ? L : mul(W[parent[i]], L); } return W;
}
const skinMats = W => skin.joints.map((ji, k) => mul(W[ji], IBM.subarray(k * 16, k * 16 + 16)));

// ---- 1. bind integrity -----------------------------------------------------------------------
const Wrest = worlds(null, 0); let bindDev = 0; const bindOff = [];
skin.joints.forEach((ji, k) => { const m = mul(Wrest[ji], IBM.subarray(k * 16, k * 16 + 16)); let d = 0; for (let i = 0; i < 16; i++) d = Math.max(d, Math.abs(m[i] - (i % 5 === 0 ? 1 : 0))); bindDev = Math.max(bindDev, d); if (d > 1e-3) bindOff.push([N[ji].name, r(d, 3)]); });
// World position of a joint in the BIND pose (what the vertices are authored in): inverse of its inverse-bind matrix.
const bindPos = nm => { const k = skin.joints.indexOf(byName[nm]); return pt(inv(IBM.subarray(k * 16, k * 16 + 16)), 0, 0, 0); };

// ---- helpers over the Sophia primitives ------------------------------------------------------
const SOPHIA = j.meshes[N[byName.Sophia].mesh], prims = SOPHIA.primitives;
const jn = k => N[skin.joints[k]].name;
function primVerts(pi) { const p = prims[pi]; return {pos: read(p.attributes.POSITION).data, J: read(p.attributes.JOINTS_0).data, W: read(p.attributes.WEIGHTS_0).data, idx: p.indices != null ? read(p.indices).data : null, uv: p.attributes.TEXCOORD_0 != null ? read(p.attributes.TEXCOORD_0).data : null}; }
function skinPoint(pos, J, W, v, M) { let x = 0, y = 0, z = 0; for (let c = 0; c < 4; c++) { const w = W[v * 4 + c]; if (w <= 0) continue; const q = pt(M[J[v * 4 + c]], pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); x += w * q[0]; y += w * q[1]; z += w * q[2]; } return [x, y, z]; }

const rep = {file, sha256: g.sha256, method: 'structural, vertex-level, linear algebra; not visual, not triangle-triangle collision'};
rep.bindIntegrity = {joints: skin.joints.length, jointsBoundToNodeRestPose: skin.joints.length - bindOff.length, jointsWhereBindPoseDiffersFromNodeRestPose: bindOff.length, maxAbsDeviationFromIdentity: r(bindDev, 3), offJoints: bindOff,
  note: 'world(node rest) x inverseBind should be identity when the skin is bound to the node rest pose. Here the two arm chains (clavicle..thumb, both sides) are bound in a different pose than their node rest rotations, so a static node-rest display of the arms would not match the skinned mesh: always play a clip. Per the archived 6H report the nodes, skins and IBM are identical to 6G, i.e. inherited.'};

// ---- 2. Book / Pen attachment ------------------------------------------------------------------
const book = byName.Book, pen = byName.Pen, bookMesh = j.meshes[N[book].mesh], penMesh = j.meshes[N[pen].mesh];
const prim = (m, k, a) => read(m.primitives[k].attributes[a]);
function meshBox(m) { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const p of m.primitives) { const a = j.accessors[p.attributes.POSITION]; for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]); } } return {mn, mx}; }
const bookBox = meshBox(bookMesh), penBox = meshBox(penMesh);
const materialUse = {}; prims.forEach((p, i) => (materialUse[p.material] ||= []).push(i));
const shared = m => m.primitives.map(p => ({material: j.materials[p.material].name, alsoUsedByBodyPrimitives: (materialUse[p.material] || []).length}));
rep.attachment = {
  Book: {nodePath: ['Book', ...(function c(i) { const o = []; for (let p = parent[i]; p != null; p = parent[p]) o.push(N[p].name); return o; })(book)], restLocal: {t: N[book].translation.map(v => mm(v)), q: N[book].rotation.map(v => r(v, 5)), unit: 'mm / quaternion xyzw'}, primitives: bookMesh.primitives.length, triangles: bookMesh.primitives.reduce((a, p) => a + j.accessors[p.indices].count / 3, 0), uvSetsPerPrimitive: bookMesh.primitives.map(p => Object.keys(p.attributes).filter(k => k.startsWith('TEXCOORD')).length), localBoundsMm: {min: bookBox.mn.map(mm), max: bookBox.mx.map(mm)}, materials: shared(bookMesh), isSkinned: N[book].skin != null, morphTargets: 0},
  Pen: {nodePath: ['Pen', ...(function c(i) { const o = []; for (let p = parent[i]; p != null; p = parent[p]) o.push(N[p].name); return o; })(pen)], restLocal: {t: N[pen].translation.map(v => mm(v)), s: N[pen].scale, unit: 'mm'}, primitives: penMesh.primitives.length, triangles: penMesh.primitives.reduce((a, p) => a + j.accessors[p.indices].count / 3, 0), localBoundsMm: {min: penBox.mn.map(mm), max: penBox.mx.map(mm)}, materials: shared(penMesh), isSkinned: N[pen].skin != null},
  clipChannelsOnProps: Object.fromEntries(Object.keys(clips).map(k => [k, {Book: clips[k].filter(c => c.node === book).map(c => c.path + '[' + c.t.length + ' keys]'), Pen: clips[k].filter(c => c.node === pen).map(c => c.path + '[' + c.t.length + ' keys]')}])),
  sockets: 'No dedicated socket nodes exist in the GLB: Book/Pen are direct non-joint children of hand_L/hand_R. Their local TRS is animated by every clip.',
};

// pen tip = vertex of the pen body with the lowest local y
const penPos = prim(penMesh, 0, 'POSITION').data; let tipV = 0; for (let v = 1; v < penPos.length / 3; v++) if (penPos[v * 3 + 1] < penPos[tipV * 3 + 1]) tipV = v;
const tip = [penPos[tipV * 3], penPos[tipV * 3 + 1], penPos[tipV * 3 + 2]];
rep.attachment.Pen.nibVertexLocalMm = tip.map(mm);

// ---- 3. Write (and other clips): nib vs notebook ------------------------------------------------
// Notebook box in Book-local space: union of cover/pages/back prims (gold trim is inside it).
const BB = {mn: bookBox.mn, mx: bookBox.mx};
const pagesPrim = bookMesh.primitives.findIndex(p => j.materials[p.material].name === 'Sophia_pages'), pa = j.accessors[bookMesh.primitives[pagesPrim].attributes.POSITION];
const insideBox = (p, box, eps = 0) => p[0] > box.mn[0] + eps && p[0] < box.mx[0] - eps && p[1] > box.mn[1] + eps && p[1] < box.mx[1] - eps && p[2] > box.mn[2] + eps && p[2] < box.mx[2] - eps;
const boxDist = (p, box) => { const d = [0, 1, 2].map(i => Math.max(box.mn[i] - p[i], 0, p[i] - box.mx[i])); return Math.hypot(...d); };

// ---- triangle helpers: nearest-point distance (Ericson) and SAT triangle-triangle overlap ------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function pointTriDist(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap); let q;
  if (d1 <= 0 && d2 <= 0) q = a; else { const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
    if (d3 >= 0 && d4 <= d3) q = b; else { const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); q = [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]]; } else { const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
        if (d6 >= 0 && d5 <= d6) q = c; else { const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); q = [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]]; } else { const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); q = [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]; } else { const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; q = [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]; } } } } } }
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
function triTri(A, B) { // separating-axis test; touching within 1e-9 m is not an overlap
  const eA = [sub(A[1], A[0]), sub(A[2], A[1]), sub(A[0], A[2])], eB = [sub(B[1], B[0]), sub(B[2], B[1]), sub(B[0], B[2])], nA = cross(eA[0], eA[1]), nB = cross(eB[0], eB[1]);
  const axes = [nA, nB]; for (const x of eA) for (const y of eB) axes.push(cross(x, y));
  for (const ax of axes) { const L = Math.hypot(...ax); if (L < 1e-14) continue; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9; for (const v of A) { const d = dot(v, ax) / L; a0 = Math.min(a0, d); a1 = Math.max(a1, d); } for (const v of B) { const d = dot(v, ax) / L; b0 = Math.min(b0, d); b1 = Math.max(b1, d); } if (a1 <= b0 + 1e-9 || b1 <= a0 + 1e-9) return false; }
  return true;
}
// Triangle soups: [{pos Float32/64 (local), idx, J, W}] skinned per pose; rigid meshes use their node matrix.
const isMat = (...names) => prims.map((p, i) => [p, i]).filter(([p]) => names.includes(j.materials[p.material].name)).map(([, i]) => i);
const groups = {hands: null, garment: isMat('Sophia_coat', 'Sophia_lining', 'Ivory_tailored_lapels', 'Sophia_gold_garment', 'Sophia_navycloth')};
const handJoints = new Set(['hand_L', 'fingers_L', 'thumb_L', 'hand_R', 'fingers_R', 'thumb_R'].map(n => skin.joints.indexOf(byName[n])));
const handSide = new Map(); // primitive -> {tris:[...], side}
prims.forEach((p, pi) => { if (p.attributes.JOINTS_0 == null || p.indices == null) return; const {J, W, idx} = primVerts(pi); const side = v => { let l = 0, rr = 0; for (let c = 0; c < 4; c++) { const w = W[v * 4 + c], jj = J[v * 4 + c]; if (handJoints.has(jj)) (jn(jj).endsWith('_L') ? (l += w) : (rr += w)); } return l > 0.5 ? 'L' : rr > 0.5 ? 'R' : null; }; const tris = []; for (let f = 0; f < idx.length / 3; f++) { const s0 = side(idx[f * 3]), s1 = side(idx[f * 3 + 1]), s2 = side(idx[f * 3 + 2]); if (s0 && s0 === s1 && s1 === s2) tris.push([idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2], s0]); } if (tris.length) handSide.set(pi, tris); });
const cache = {}; const PV = pi => (cache[pi] ||= primVerts(pi));
const rigid = (m, name) => m.primitives.map(p => ({pos: read(p.attributes.POSITION).data, idx: read(p.indices).data}));
const bookRigid = rigid(bookMesh), penRigid = rigid(penMesh);
function rigidTris(parts, M) { const out = []; for (const {pos, idx} of parts) for (let f = 0; f < idx.length / 3; f++) out.push([0, 1, 2].map(k => pt(M, pos[idx[f * 3 + k] * 3], pos[idx[f * 3 + k] * 3 + 1], pos[idx[f * 3 + k] * 3 + 2]))); return out; }
const aabb = T => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const v of T) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], v[i]); mx[i] = Math.max(mx[i], v[i]); } return {mn, mx}; };
const overlapBox = (a, b) => a.mn[0] <= b.mx[0] && a.mx[0] >= b.mn[0] && a.mn[1] <= b.mx[1] && a.mx[1] >= b.mn[1] && a.mn[2] <= b.mx[2] && a.mx[2] >= b.mn[2];
function skinTris(pis, M, filter) { const out = []; for (const pi of pis) { const {pos, J, W, idx} = PV(pi); const sk = new Map(); const get = v => sk.get(v) || (sk.set(v, skinPoint(pos, J, W, v, M)), sk.get(v)); const list = filter ? filter(pi) : null; const T = list || Array.from({length: idx.length / 3}, (_, f) => [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]]); for (const t of T) out.push({v: [get(t[0]), get(t[1]), get(t[2])], side: t[3]}); } return out; }
function countPairs(softTris, rigidT) { const rb = aabb(rigidT.flat()), pad = 1e-6; let hits = 0, bySide = {L: 0, R: 0}; for (const s of softTris) { const sb = aabb(s.v); if (!overlapBox(sb, {mn: rb.mn.map(v => v - pad), mx: rb.mx.map(v => v + pad)})) continue; for (const q of rigidT) { if (triTri(s.v, q)) { hits++; if (s.side) bySide[s.side]++; } } } return {pairs: hits, bySide}; }

function contactAudit(clip, step) {
  const L = clipLen(clip), out = {clip, samples: 0, nibToBookSurfaceMm: {min: 1e9, max: -1e9}, pairs: {handsXBook: {samplesWithAny: 0, max: 0, L: 0, R: 0}, garmentXBook: {samplesWithAny: 0, max: 0}, penXBook: {samplesWithAny: 0, max: 0}, handsXPen: {samplesWithAny: 0, max: 0}, garmentXPen: {samplesWithAny: 0, max: 0}}};
  for (let t = 0; t <= L + 1e-9; t += step) {
    const W = worlds(clip, Math.min(t, L)), M = skinMats(W), bookT = rigidTris(bookRigid, W[book]), penT = rigidTris(penRigid, W[pen]), tipW = pt(W[pen], tip[0], tip[1], tip[2]);
    out.samples++; let dmin = 1e9; for (const q of bookT) dmin = Math.min(dmin, pointTriDist(tipW, q[0], q[1], q[2])); out.nibToBookSurfaceMm.min = Math.min(out.nibToBookSurfaceMm.min, mm(dmin)); out.nibToBookSurfaceMm.max = Math.max(out.nibToBookSurfaceMm.max, mm(dmin));
    const hands = skinTris([...handSide.keys()], M, pi => handSide.get(pi)), garment = skinTris(groups.garment, M);
    const rec = (k, r_) => { const o = out.pairs[k]; if (r_.pairs) { o.samplesWithAny++; o.max = Math.max(o.max, r_.pairs); } if (o.L !== undefined) { o.L = Math.max(o.L, r_.bySide.L); o.R = Math.max(o.R, r_.bySide.R); } };
    rec('handsXBook', countPairs(hands, bookT)); rec('garmentXBook', countPairs(garment, bookT)); rec('handsXPen', countPairs(hands, penT)); rec('garmentXPen', countPairs(garment, penT));
    const pb = []; { let n = 0; const bb = aabb(bookT.flat()); for (const q of penT) { if (!overlapBox(aabb(q), bb)) continue; for (const w of bookT) if (triTri(q, w)) n++; } rec('penXBook', {pairs: n, bySide: {L: 0, R: 0}}); }
  }
  return out;
}
rep.contactMethod = 'triangle-triangle SAT on skinned vertices (hands = triangles whose 3 vertices are >50% on hand/fingers/thumb; garment = coat, lining, lapels, gold garment trim, navy cloth). Sampled poses only; counts are pairs, comparable in kind (not in exact number) to the archived 6H audit, whose triangle subsets and sample instants are unknown.';
const skipContact = process.argv.includes('--skip-contact');
rep.contact = skipContact ? 'SKIPPED (--skip-contact)' : [['Write', 1 / 15], ['Idle', 1], ['Wave', 0.4], ['Point', 0.4], ['Walk', 0.25]].map(([c, st]) => contactAudit(c, st));

// ---- 4. Forehead star: identity of the three raised stars + occlusion by hair -----------------------
const goldIdx = [9, 10, 11], skullIdx = 274;
const starInfo = goldIdx.map(pi => { const p = prims[pi], a = j.accessors[p.attributes.POSITION]; return {primitive: pi, material: j.materials[p.material].name, triangles: j.accessors[p.indices].count / 3, uvSets: Object.keys(p.attributes).filter(k => k.startsWith('TEXCOORD')).length, hasMorphTargets: (p.targets || []).length, sizeMm: a.min.map((v, i) => mm(a.max[i] - v)), centerMm: a.min.map((v, i) => mm((a.max[i] + v) / 2))}; });
function rayHits(x, y, z0, dir = [0, 0, -1]) { // first-hit list along -z for given (x,y) over head-region prims, rest pose
  const hits = []; for (const pi of [skullIdx, 275, 278, 0, 9, 10, 11, 15, 16, 26, 27]) { const {pos, idx} = PV(pi); const n = idx.length / 3; for (let f = 0; f < n; f++) { const a = idx[f * 3] * 3, b = idx[f * 3 + 1] * 3, c = idx[f * 3 + 2] * 3; const A = [pos[a], pos[a + 1], pos[a + 2]], B = [pos[b], pos[b + 1], pos[b + 2]], C = [pos[c], pos[c + 1], pos[c + 2]];
    // 2-D point-in-triangle in xy, then interpolate z
    const d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]); if (Math.abs(d) < 1e-14) continue; const l1 = ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (y - C[1])) / d, l2 = ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (y - C[1])) / d, l3 = 1 - l1 - l2; if (l1 < 0 || l2 < 0 || l3 < 0) continue; hits.push({pi, z: l1 * A[2] + l2 * B[2] + l3 * C[2]}); } }
  hits.sort((p, q) => q.z - p.z); return hits; }
const column = (y) => { const h = rayHits(0, y); const seen = []; for (const x of h) if (!seen.length || seen.at(-1).pi !== x.pi) seen.push({primitive: x.pi, zMm: mm(x.z)}); return seen.slice(0, 5); };
const colX = (x, y) => { const h = rayHits(x, y); const seen = []; for (const q of h) if (!seen.length || seen.at(-1).pi !== q.pi) seen.push({primitive: q.pi, zMm: mm(q.z)}); return seen.slice(0, 4); };
const skull = PV(skullIdx); let colored = 0, nV = skull.pos.length / 3; const cAcc = read(prims[skullIdx].attributes.COLOR_0); const cn = cAcc.n; let nonWhite = 0; for (let v = 0; v < nV; v++) { if (Math.abs(cAcc.data[v * cn] - 1) > 0.01 || Math.abs(cAcc.data[v * cn + 1] - 1) > 0.01 || Math.abs(cAcc.data[v * cn + 2] - 1) > 0.01) nonWhite++; }
// vertex density of the skull around the main star centre
const sc = starInfo[1].centerMm.map(v => v / 1000); let near = 0, edges = [], R = 0.035; const nearSet = new Set(); for (let v = 0; v < nV; v++) if (Math.hypot(skull.pos[v * 3] - sc[0], skull.pos[v * 3 + 1] - sc[1], skull.pos[v * 3 + 2] - sc[2]) < R) { near++; nearSet.add(v); }
for (let f = 0; f < skull.idx.length / 3; f++) { const t3 = [skull.idx[f * 3], skull.idx[f * 3 + 1], skull.idx[f * 3 + 2]]; if (!t3.every(v => nearSet.has(v))) continue; for (let e = 0; e < 3; e++) { const a = t3[e], b = t3[(e + 1) % 3]; edges.push(Math.hypot(skull.pos[a * 3] - skull.pos[b * 3], skull.pos[a * 3 + 1] - skull.pos[b * 3 + 1], skull.pos[a * 3 + 2] - skull.pos[b * 3 + 2])); } }
edges.sort((a, b) => a - b);
rep.forehead = {
  archivedRaisedStars: starInfo,
  verdictOnRaisedStars: 'Three separate head-bound solid gold primitives of 288 triangles each, no UV, with 4 morph targets; the largest is ~62 x 89 x 32 mm. They are raised geometry, not a flat skin mark.',
  skullPrimitive: {index: skullIdx, material: j.materials[prims[skullIdx].material].name, triangles: prims[skullIdx].indices != null ? j.accessors[prims[skullIdx].indices].count / 3 : 0, uvSets: Object.keys(prims[skullIdx].attributes).filter(k => k.startsWith('TEXCOORD')).length, hasCOLOR_0: true, nonWhiteVertexColors: nonWhite, vertexCount: nV, materialBaseColorTexture: j.materials[prims[skullIdx].material].pbrMetallicRoughness.baseColorTexture ?? null},
  skullVertexDensityNearMainStar: {radiusMm: R * 1000, vertices: near, edgeLengthMm: edges.length ? {median: mm(edges[edges.length >> 1]), p10: mm(edges[Math.floor(edges.length * 0.1)]), p90: mm(edges[Math.floor(edges.length * 0.9)])} : null},
  occlusionColumnsRestPose: {note: 'front-to-back primitives met by a ray along -z at x=0 (and x=±15 mm) for several heights; primitives 275/278 are fringe/mane hair, 274 skull skin, 9-11 the raised stars', x0: Object.fromEntries([630, 650, 670, 690, 710, 730].map(y => ['y' + y + 'mm', column(y / 1000)])), xPlus15: Object.fromEntries([650, 690, 730].map(y => ['y' + y + 'mm', colX(0.015, y / 1000)]))},
};

// ---- 5. Coat (jaleco) audit -----------------------------------------------------------------------
const coatI = prims.findIndex(p => j.materials[p.material].name === 'Sophia_coat');
const cv = PV(coatI), cN = cv.pos.length / 3, jointPos = bindPos;
const infl = [0, 0, 0, 0, 0]; const share = {}; const famOf = nm => nm.replace(/_[LR]$/, '').replace(/_\d+$/, '');
for (let v = 0; v < cN; v++) { let k = 0; for (let c = 0; c < 4; c++) if (cv.W[v * 4 + c] > 0.001) k++; infl[k]++; for (let c = 0; c < 4; c++) { const w = cv.W[v * 4 + c]; if (w > 0) share[famOf(jn(cv.J[v * 4 + c]))] = (share[famOf(jn(cv.J[v * 4 + c]))] || 0) + w; } }
for (const k in share) share[k] = r(share[k] / cN, 3);
function regionStats(label, center, rad, armOnly = false) { let n = 0, hard = 0, spreadSum = 0; const fam = {}; for (let v = 0; v < cN; v++) { if (armOnly) { let a = 0; for (let c = 0; c < 4; c++) if (/^(upper_arm|forearm|hand|clavicle)/.test(jn(cv.J[v * 4 + c]))) a += cv.W[v * 4 + c]; if (a < 0.3) continue; } const dx = cv.pos[v * 3] - center[0], dy = cv.pos[v * 3 + 1] - center[1], dz = cv.pos[v * 3 + 2] - center[2]; if (Math.hypot(dx, dy, dz) > rad) continue; n++; let top = 0, k = 0; for (let c = 0; c < 4; c++) { const w = cv.W[v * 4 + c]; if (w > top) top = w; if (w > 0.001) k++; fam[famOf(jn(cv.J[v * 4 + c]))] = (fam[famOf(jn(cv.J[v * 4 + c]))] || 0) + w; } if (top > 0.99) hard++; spreadSum += k; } for (const k in fam) fam[k] = r(fam[k] / Math.max(1, n), 3); return {region: label, radiusMm: rad * 1000, vertices: n, hardBoundFraction: n ? r(hard / n, 3) : null, meanInfluences: n ? r(spreadSum / n, 2) : null, weightShareByJoint: fam}; }
function blendWidth(side, from, to, fam2) { // axial range (mm) of vertices near the limb axis whose weight on `fam2` is between 5% and 95%
  const A = jointPos(from + '_' + side), B = jointPos(to + '_' + side), ax = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(...ax), u = ax.map(v => v / L); let lo = 1e9, hi = -1e9, n = 0, pure = 0;
  for (let v = 0; v < cN; v++) { const d = [cv.pos[v * 3] - A[0], cv.pos[v * 3 + 1] - A[1], cv.pos[v * 3 + 2] - A[2]], s = d[0] * u[0] + d[1] * u[1] + d[2] * u[2]; if (s < -L * 0.5 || s > L * 1.5) continue; const rad = Math.hypot(d[0] - s * u[0], d[1] - s * u[1], d[2] - s * u[2]); if (rad > 0.09) continue; let w2 = 0; for (let c = 0; c < 4; c++) if (famOf(jn(cv.J[v * 4 + c])) === fam2) w2 += cv.W[v * 4 + c]; if (w2 > 0.05 && w2 < 0.95) { n++; lo = Math.min(lo, s); hi = Math.max(hi, s); } else pure++; }
  return {segment: from + '->' + to + ' (' + side + ')', segmentLengthMm: mm(L), transitionVertices: n, transitionAxialWidthMm: n ? mm(hi - lo) : 0, transitionStartMm: n ? mm(lo) : null, transitionEndMm: n ? mm(hi) : null, note: 'axial extent of vertices with 5-95% weight on ' + fam2 + ' within 90 mm of the limb axis'}; }
function bandStats(label, pred) { let n = 0, hard = 0, spread = 0; const fam = {}; for (let v = 0; v < cN; v++) { if (!pred(v)) continue; n++; let top = 0, k = 0; for (let c = 0; c < 4; c++) { const w = cv.W[v * 4 + c]; if (w > top) top = w; if (w > 0.001) k++; const f = famOf(jn(cv.J[v * 4 + c])); fam[f] = (fam[f] || 0) + w; } if (top > 0.99) hard++; spread += k; } for (const k in fam) fam[k] = r(fam[k] / Math.max(1, n), 3); return {region: label, vertices: n, hardBoundFraction: n ? r(hard / n, 3) : null, meanInfluences: n ? r(spread / n, 2) : null, weightShareByJoint: fam}; }
function sleeveEnd(side) { // farthest sleeve vertex along forearm->hand axis, relative to the wrist joint
  const A = jointPos('forearm_' + side), B = jointPos('hand_' + side), ax = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(...ax), u = ax.map(v => v / L); let smax = -1e9, n = 0, hard = 0;
  for (let v = 0; v < cN; v++) { let fw = 0; for (let c = 0; c < 4; c++) if (famOf(jn(cv.J[v * 4 + c])) === 'forearm' && jn(cv.J[v * 4 + c]).endsWith('_' + side)) fw += cv.W[v * 4 + c]; if (fw < 0.5) continue; const d = [cv.pos[v * 3] - A[0], cv.pos[v * 3 + 1] - A[1], cv.pos[v * 3 + 2] - A[2]], s_ = d[0] * u[0] + d[1] * u[1] + d[2] * u[2], rad = Math.hypot(d[0] - s_ * u[0], d[1] - s_ * u[1], d[2] - s_ * u[2]); if (rad > 0.09) continue; n++; smax = Math.max(smax, s_); }
  for (let v = 0; v < cN; v++) { /* count hard-bound vertices in the last 20 mm of the sleeve */ const d = [cv.pos[v * 3] - A[0], cv.pos[v * 3 + 1] - A[1], cv.pos[v * 3 + 2] - A[2]], s_ = d[0] * u[0] + d[1] * u[1] + d[2] * u[2], rad = Math.hypot(d[0] - s_ * u[0], d[1] - s_ * u[1], d[2] - s_ * u[2]); if (rad > 0.09 || s_ < smax - 0.02 || s_ > smax + 1e-9) continue; let top = 0; for (let c = 0; c < 4; c++) top = Math.max(top, cv.W[v * 4 + c]); if (top > 0.99) hard++; }
  return {side, forearmLengthMm: mm(L), sleeveVerticesOnForearm: n, sleeveEndAlongForearmAxisMm: mm(smax), cuffToWristJointMm: mm(L - smax), verticesInLast20mm_hardBoundToOneJoint: hard}; }
let ymin = 1e9, ymax = -1e9, uvArea = 0, geoArea = 0, flipped = 0, degenerate = 0, uvOut = 0; const triN = cv.idx.length / 3; let pos = 0, neg = 0;
for (let v = 0; v < cN; v++) { ymin = Math.min(ymin, cv.pos[v * 3 + 1]); ymax = Math.max(ymax, cv.pos[v * 3 + 1]); if (cv.uv[v * 2] < -1e-6 || cv.uv[v * 2] > 1 + 1e-6 || cv.uv[v * 2 + 1] < -1e-6 || cv.uv[v * 2 + 1] > 1 + 1e-6) uvOut++; }
for (let f = 0; f < triN; f++) { const a = cv.idx[f * 3], b = cv.idx[f * 3 + 1], c = cv.idx[f * 3 + 2]; const ua = [cv.uv[a * 2], cv.uv[a * 2 + 1]], ub = [cv.uv[b * 2], cv.uv[b * 2 + 1]], uc = [cv.uv[c * 2], cv.uv[c * 2 + 1]]; const s = ((ub[0] - ua[0]) * (uc[1] - ua[1]) - (uc[0] - ua[0]) * (ub[1] - ua[1])) / 2; if (Math.abs(s) < 1e-12) degenerate++; else if (s > 0) pos++; else neg++; uvArea += Math.abs(s); const P = i => [cv.pos[i * 3], cv.pos[i * 3 + 1], cv.pos[i * 3 + 2]]; const A = P(a), B = P(b), Cc = P(c), e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [Cc[0] - A[0], Cc[1] - A[1], Cc[2] - A[2]]; geoArea += Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]) / 2; }
const png = i => { const bv = j.bufferViews[j.images[i].bufferView], o = (bv.byteOffset || 0) + 16; return [g.bin.readUInt32BE(o), g.bin.readUInt32BE(o + 4)]; };
rep.coat = {
  primitives: {coat: coatI, lining: prims.findIndex(p => j.materials[p.material].name === 'Sophia_lining'), lapels: prims.map((p, i) => [p, i]).filter(([p]) => j.materials[p.material].name === 'Ivory_tailored_lapels').map(([, i]) => i), goldGarmentTrim: prims.filter(p => j.materials[p.material].name === 'Sophia_gold_garment').length},
  coatMesh: {vertices: cN, triangles: triN, yRangeMm: [mm(ymin), mm(ymax)], uvSets: 1, texture: {image: 'coat', pixels: png(3)}, liningTexture: {pixels: png(4)}, doubleSided: !!j.materials[prims[coatI].material].doubleSided},
  uv: {outsideUnitSquareVertices: uvOut, degenerateTriangles: degenerate, positiveWinding: pos, negativeWinding: neg, mirroredLayout: Math.min(pos, neg) > 0, uvToGeometryAreaRatio: r(uvArea / geoArea, 4), note: 'a mixed winding means mirrored UV islands (shared texture halves); not an error by itself'},
  skinning: {vertices: cN, influenceHistogram: {'0': infl[0], '1': infl[1], '2': infl[2], '3': infl[3], '4': infl[4]}, weightShareByJointFamily: share},
  regions: [regionStats('shoulder_L (sleeve vertices)', jointPos('upper_arm_L'), 0.07, true), regionStats('elbow_L (sleeve vertices)', jointPos('forearm_L'), 0.06, true), regionStats('shoulder_R (sleeve vertices)', jointPos('upper_arm_R'), 0.07, true), regionStats('elbow_R (sleeve vertices)', jointPos('forearm_R'), 0.06, true), bandStats('collar band (top 25 mm)', v => cv.pos[v * 3 + 1] > ymax - 0.025), bandStats('hem band (bottom 30 mm)', v => cv.pos[v * 3 + 1] < ymin + 0.03)],
  sleeveEnd: ['L', 'R'].map(sd => sleeveEnd(sd)),
  blendWidths: [blendWidth('L', 'upper_arm', 'forearm', 'forearm'), blendWidth('L', 'forearm', 'hand', 'hand'), blendWidth('R', 'upper_arm', 'forearm', 'forearm'), blendWidth('R', 'forearm', 'hand', 'hand'), blendWidth('L', 'clavicle', 'upper_arm', 'upper_arm'), blendWidth('R', 'clavicle', 'upper_arm', 'upper_arm')],
};
rep.textures = j.images.map((im, i) => ({index: i, name: im.name, pixels: png(i)}));
const oi = process.argv.indexOf('--out'); const text = JSON.stringify(rep, null, 1) + '\n';
if (oi > 0) writeFileSync(process.argv[oi + 1], text); else process.stdout.write(text);
