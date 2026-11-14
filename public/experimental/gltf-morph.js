// CPU morph support for dense/sparse POSITION and NORMAL, independently of actor state.
import { readAccessor, readSparse } from './gltf-skel.js';
export function compactDelta(json, bin, ai) {
  if (ai === undefined) return null;
  const a = json.accessors[ai];
  if (a.sparse && a.bufferView === undefined) { const s = readSparse(json, bin, ai); return s.indices.length ? s : null; }
  const dense = readAccessor(json, bin, ai), ids = [], values = [];
  for (let i = 0; i < a.count; i += 1) if (dense[i * 3] || dense[i * 3 + 1] || dense[i * 3 + 2]) { ids.push(i); values.push(dense[i * 3], dense[i * 3 + 1], dense[i * 3 + 2]); }
  return ids.length ? { indices: Uint32Array.from(ids), values: Float32Array.from(values) } : null;
}
export function makeMorphChannel(json, bin, prim, semantic) {
  if (prim.attributes[semantic] === undefined) return null;
  const base = readAccessor(json, bin, prim.attributes[semantic]);
  const list = [];
  (prim.targets || []).forEach((t, k) => { const d = compactDelta(json, bin, t[semantic]); if (d) list.push({ k, ...d }); });
  return list.length ? { base, cur: new Float32Array(base), list, last: new Float32Array((prim.targets || []).length) } : null;
}
export function updateMorphChannel(c, weights) {
  let changed = false;
  for (const t of c.list) if (Math.abs((weights[t.k] || 0) - c.last[t.k]) > 1e-6) { changed = true; break; }
  if (!changed) return null;
  let lo = Infinity, hi = -1;
  for (const t of c.list) if (weights[t.k] || c.last[t.k]) {
    for (const i of t.indices) { const v = i * 3; c.cur[v] = c.base[v]; c.cur[v + 1] = c.base[v + 1]; c.cur[v + 2] = c.base[v + 2]; lo = Math.min(lo, i); hi = Math.max(hi, i); }
  }
  for (const t of c.list) { const w = weights[t.k] || 0; if (!w) continue; for (let q = 0; q < t.indices.length; q += 1) { const v = t.indices[q] * 3, o = q * 3; c.cur[v] += t.values[o] * w; c.cur[v + 1] += t.values[o + 1] * w; c.cur[v + 2] += t.values[o + 2] * w; } }
  for (let k = 0; k < c.last.length; k += 1) c.last[k] = weights[k] || 0;
  return hi >= lo ? { lo, hi } : null;
}
