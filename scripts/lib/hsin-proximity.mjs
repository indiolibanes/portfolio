/** Exact point-to-triangle queries on posed mesh surfaces, with a spatial hash. Offline authoring/QA only.
 * Distances are in model units (metres). Sign: positive on the side the triangle winding faces (outside). */
import {sub, dot, cross, len, unit} from './hsin-math.mjs';

function closestOnTriangle(p, a, b, c) { // Ericson, Real-Time Collision Detection
 const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap);
 if (d1 <= 0 && d2 <= 0) return a;
 const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return b;
 const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v]; }
 const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return c;
 const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]; }
 const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]; }
 const denom = 1 / (va + vb + vc), v = vb * denom, w = vc * denom; return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
}

/** @param positions Float64Array xyz per vertex (posed), @param indices triangle list, @param normals optional posed vertex
 * normals (sign is taken from the interpolated vertex normal, which is reliable even when the winding is not),
 * @param triangles optional subset of triangle ids */
export function buildSurface(positions, indices, {cell = .012, triangles = null, normals = null} = {}) {
 const ids = triangles ?? Array.from({length: indices.length / 3}, (_, i) => i), grid = new Map(), tri = [];
 const P = (v) => [positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]], N = (v) => [normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]];
 const key = (x, y, z) => (x + 1024) * 4194304 + (y + 1024) * 2048 + (z + 1024);
 for (const t of ids) {
  const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2], a = P(i0), b = P(i1), c = P(i2), n = unit(cross(sub(b, a), sub(c, a)));
  const k = tri.push({a, b, c, n, na: normals ? N(i0) : null, nb: normals ? N(i1) : null, nc: normals ? N(i2) : null}) - 1;
  const lo = [0, 1, 2].map((i) => Math.floor(Math.min(a[i], b[i], c[i]) / cell)), hi = [0, 1, 2].map((i) => Math.floor(Math.max(a[i], b[i], c[i]) / cell));
  for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) { const h = key(x, y, z); let list = grid.get(h); if (!list) grid.set(h, list = []); list.push(k); }
 }
 const stamp = new Int32Array(tri.length); let epoch = 0;
 function shellNormal(t, q) { // interpolated vertex normal at q, falling back to the face normal
  if (!t.na) return t.n;
  const v0 = sub(t.b, t.a), v1 = sub(t.c, t.a), v2 = sub(q, t.a), d00 = dot(v0, v0), d01 = dot(v0, v1), d11 = dot(v1, v1), d20 = dot(v2, v0), d21 = dot(v2, v1), den = d00 * d11 - d01 * d01 || 1e-30;
  const v = (d11 * d20 - d01 * d21) / den, w = (d00 * d21 - d01 * d20) / den, u = 1 - v - w;
  return unit([t.na[0] * u + t.nb[0] * v + t.nc[0] * w, t.na[1] * u + t.nb[1] * v + t.nc[1] * w, t.na[2] * u + t.nb[2] * v + t.nc[2] * w]);
 }
 /** Nearest surface point within `radius` (null if none). signed: + on the outward (vertex-normal) side. */
 function query(p, radius = .06) {
  const c = p.map((v) => Math.floor(v / cell)), maxRing = Math.ceil(radius / cell); epoch++;
  let best = null;
  for (let r = 0; r <= maxRing; r++) {
   if (best && best.distance <= (r - 1) * cell) break; // nothing in this ring can be closer
   for (let x = c[0] - r; x <= c[0] + r; x++) for (let y = c[1] - r; y <= c[1] + r; y++) for (let z = c[2] - r; z <= c[2] + r; z++) {
    if (r && Math.max(Math.abs(x - c[0]), Math.abs(y - c[1]), Math.abs(z - c[2])) !== r) continue;
    const list = grid.get(key(x, y, z)); if (!list) continue;
    for (const k of list) {
     if (stamp[k] === epoch) continue; stamp[k] = epoch;
     const t = tri[k], q = closestOnTriangle(p, t.a, t.b, t.c), d = len(sub(p, q));
     if (d <= radius && (!best || d < best.distance)) best = {distance: d, point: q, tri: t, triangle: k};
    }
   }
  }
  if (!best) return null;
  best.normal = shellNormal(best.tri, best.point); best.signed = dot(sub(p, best.point), best.normal) >= 0 ? best.distance : -best.distance;
  delete best.tri; return best;
 }
 return {query, triangles: tri.length};
}
