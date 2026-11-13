// Read-only census of a glTF-binary file. No dependencies, no writes besides stdout/--out.
// Usage: node scripts/sophia/glb-census.mjs <file.glb> [--out report.json]
// Purpose: SOURCE_VERIFIED evidence for docs/sophia/adornments-r1. It decodes only what the
// audit needs (hashes, scene graph, skin, primitives, UV sets, materials, images, morphs, clips).
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const sha = buf => createHash('sha256').update(buf).digest('hex');
const CT = {5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4]};
const NC = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16};
const r = (v, d = 5) => +Number(v).toFixed(d);

export function openGlb(file) {
  const buf = readFileSync(file), dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.toString('latin1', 0, 4) !== 'glTF' || dv.getUint32(4, true) !== 2) throw Error('not a glTF 2 binary');
  if (dv.getUint32(8, true) !== buf.length) throw Error('declared length differs from file size');
  let o = 12, json = null, bin = null;
  while (o < buf.length) {
    const len = dv.getUint32(o, true), type = buf.toString('latin1', o + 4, o + 8), start = o + 8;
    if (start + len > buf.length) throw Error('chunk overruns file');
    if (type === 'JSON') json = JSON.parse(buf.toString('utf8', start, start + len));
    else if (type.startsWith('BIN')) bin = buf.subarray(start, start + len);
    o = start + len + ((4 - (len % 4)) % 4 === 0 ? 0 : 0);
  }
  return {buf, json, bin, sha256: sha(buf)};
}

export function accessorReader(g) {
  const {json: j, bin} = g;
  return function read(i) {
    const a = j.accessors[i], bv = j.bufferViews[a.bufferView];
    if (a.sparse) throw Error('sparse accessor ' + i + ' not supported by this audit');
    const [T, sz] = CT[a.componentType], n = NC[a.type], stride = bv.byteStride || sz * n;
    const base = (bv.byteOffset || 0) + (a.byteOffset || 0), out = new Float64Array(a.count * n);
    const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    const get = {5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32'}[a.componentType];
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) {
      let v = dv[get](base + k * stride + c * sz, true);
      if (a.normalized) v /= {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}[a.componentType];
      out[k * n + c] = v;
    }
    return {data: out, n, count: a.count, type: a.type, min: a.min, max: a.max};
  };
}

function nodeIndex(j) {
  const parent = {};
  j.nodes.forEach((n, i) => (n.children || []).forEach(c => (parent[c] = i)));
  const chain = i => { const o = []; for (let p = parent[i]; p != null; p = parent[p]) o.push(j.nodes[p].name); return o; };
  return {parent, chain};
}

export function census(file) {
  const g = openGlb(file), j = g.json, read = accessorReader(g), {parent, chain} = nodeIndex(j);
  const skin = j.skins?.[0], jointSet = new Set(skin?.joints || []);
  const jointName = k => j.nodes[skin.joints[k]].name;
  const rep = {
    file, bytes: g.buf.length, sha256: g.sha256,
    asset: {version: j.asset.version, generator: j.asset.generator},
    extensionsUsed: j.extensionsUsed || [], extensionsRequired: j.extensionsRequired || [],
    counts: Object.fromEntries(['scenes', 'nodes', 'meshes', 'skins', 'animations', 'materials', 'textures', 'images', 'samplers', 'accessors', 'bufferViews'].map(k => [k, (j[k] || []).length])),
  };
  rep.sceneRoots = j.scenes[j.scene].nodes.map(i => j.nodes[i].name);
  rep.skin = skin ? {joints: skin.joints.length, skeletonRoot: j.nodes[skin.skeleton]?.name, ibmAccessor: skin.inverseBindMatrices, ibmCount: read(skin.inverseBindMatrices).count, jointNames: skin.joints.map(i => j.nodes[i].name)} : null;
  rep.nonJointNodes = j.nodes.map((n, i) => ({i, n})).filter(x => !jointSet.has(x.i)).map(({i, n}) => ({
    index: i, name: n.name, mesh: n.mesh, skin: n.skin, parentChain: chain(i), translation: n.translation, rotation: n.rotation, scale: n.scale, matrix: n.matrix,
  }));
  rep.images = (j.images || []).map((im, i) => ({index: i, name: im.name, mime: im.mimeType, bytes: j.bufferViews[im.bufferView].byteLength,
    sha256: sha(g.bin.subarray(j.bufferViews[im.bufferView].byteOffset || 0, (j.bufferViews[im.bufferView].byteOffset || 0) + j.bufferViews[im.bufferView].byteLength))}));
  rep.textures = (j.textures || []).map((t, i) => ({index: i, source: t.source, sampler: t.sampler}));
  rep.materials = (j.materials || []).map((m, i) => ({index: i, name: m.name, baseColor: m.pbrMetallicRoughness?.baseColorFactor, baseColorTexture: m.pbrMetallicRoughness?.baseColorTexture, extensions: Object.keys(m.extensions || {}), doubleSided: !!m.doubleSided, alphaMode: m.alphaMode}));
  rep.meshes = j.meshes.map((m, mi) => {
    const prims = m.primitives.map((p, pi) => {
      const pos = read(p.attributes.POSITION), tris = p.indices != null ? read(p.indices).count / 3 : pos.count / 3;
      const uvSets = Object.keys(p.attributes).filter(k => k.startsWith('TEXCOORD')).length;
      const out = {index: pi, material: p.material, materialName: j.materials[p.material]?.name, mode: p.mode ?? 4, vertices: pos.count, triangles: tris, attributes: Object.keys(p.attributes), uvSets,
        morphTargets: (p.targets || []).length, min: pos.min?.map(v => r(v)), max: pos.max?.map(v => r(v))};
      if (p.attributes.JOINTS_0 && p.attributes.WEIGHTS_0 && skin) {
        const J = read(p.attributes.JOINTS_0), W = read(p.attributes.WEIGHTS_0), mass = new Float64Array(skin.joints.length);
        let badSum = 0, oob = 0;
        for (let v = 0; v < J.count; v++) { let s = 0; for (let c = 0; c < 4; c++) { const w = W.data[v * 4 + c], jj = J.data[v * 4 + c]; if (w > 0) { if (jj >= mass.length) oob++; else mass[jj] += w; } s += w; } if (Math.abs(s - 1) > 0.01) badSum++; }
        out.skinning = {weightSumOff: badSum, jointIndexOutOfRange: oob, topJoints: [...mass.keys()].sort((a, b) => mass[b] - mass[a]).slice(0, 3).filter(k => mass[k] > 0).map(k => [jointName(k), r(mass[k] / J.count, 3)])};
      }
      return out;
    });
    const named = new Set(); const extras = m.extras;
    return {index: mi, name: m.name, primitiveCount: prims.length, targetNames: m.extras?.targetNames, defaultWeights: m.weights, totalTriangles: prims.reduce((a, p) => a + p.triangles, 0), totalVertices: prims.reduce((a, p) => a + p.vertices, 0), primitives: prims};
  });
  rep.animations = (j.animations || []).map((a, i) => {
    const byPath = {}, byNode = {};
    let tmax = 0;
    for (const ch of a.channels) { const nn = j.nodes[ch.target.node].name; byPath[ch.target.path] = (byPath[ch.target.path] || 0) + 1; (byNode[nn] ||= []).push(ch.target.path); }
    const sampHash = createHash('sha256');
    for (const ch of a.channels) { const s = a.samplers[ch.sampler]; const inp = read(s.input), out = read(s.output); tmax = Math.max(tmax, inp.max?.[0] ?? 0); sampHash.update(Buffer.from(inp.data.buffer)).update(Buffer.from(out.data.buffer)).update(ch.target.path + j.nodes[ch.target.node].name + (s.interpolation || 'LINEAR')); }
    return {index: i, name: a.name, channels: a.channels.length, duration: r(tmax, 4), channelsByPath: byPath, bookChannels: byNode.Book || [], penChannels: byNode.Pen || [], contentSha256: sampHash.digest('hex')};
  });
  return rep;
}

if (process.argv[1] && process.argv[1].endsWith('glb-census.mjs')) {
  const file = process.argv[2]; if (!file) { console.error('usage: glb-census.mjs file.glb [--out out.json]'); process.exit(2); }
  const rep = census(file), oi = process.argv.indexOf('--out');
  if (oi > 0) writeFileSync(process.argv[oi + 1], JSON.stringify(rep, null, 1) + '\n'); else console.log(JSON.stringify(rep, null, 1));
}
