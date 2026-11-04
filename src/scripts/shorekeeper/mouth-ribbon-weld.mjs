/**
 * B2 candidate · mouth-ribbon weld (runtime, non-destructive).
 *
 * WebGL evidence (R2): the 52-vertex mouth contour is a ribbon with four vertices per cross-section
 * (outer/inner layers). Canonical smile morphs (M_Smile_*, P_M_*_Add) move only SOME vertices of the
 * outer layer on the lip tips (~3 mm) and leave their inner partners at rest. The ribbon therefore
 * shears into a thin, detached filament (the "fiozinho") instead of bending as a stroke.
 *
 * This module fills the missing partner deltas by interpolating the deltas that already exist along |x|,
 * on a CLONED geometry. The canonical GLB buffers are never edited; restore()/dispose() put the original
 * geometry back. Only one-sided morphs are welded (bilateral/opening morphs are left untouched on purpose).
 *
 * Status: B_SMILE_VISUAL_CANDIDATE at best. It does not claim visual approval.
 */
import {connectedComponents} from './mouth-forensics.mjs';

/** One-sided corner morphs known to move only a subset of the ribbon cross-section. */
export const WELD_MORPHS = Object.freeze(['M_Smile_L', 'M_Smile_R', 'P_M_L_Add', 'P_M_R_Add', 'P_M_ZL_Add', 'P_M_ZR_Add', 'M_Ennui_L', 'M_Ennui_R']);
const EPS = 1e-9;

/** Same selection rule as the forensic bench: 52-vertex island in the lip band of the face atlas. */
export function findMouthContour(geometry) {
  const uv = geometry.attributes.uv;
  if (!uv) return null;
  for (const ids of connectedComponents(geometry)) {
    if (ids.length !== 52) continue;
    let lo = Infinity, hi = -Infinity;
    for (const i of ids) { const v = uv.getY(i); lo = Math.min(lo, v); hi = Math.max(hi, v); }
    if (lo > 0.89 && hi < 0.93) return ids;
  }
  return null;
}

function bin(points, tolerance) {
  const sorted = points.slice().sort((a, b) => a.x - b.x), out = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && p.x - last.xMax < tolerance) { last.n++; last.xSum += p.x; last.xMax = p.x; for (let k = 0; k < 3; k++) last.d[k] += p.d[k]; }
    else out.push({n: 1, xSum: p.x, xMax: p.x, d: [...p.d]});
  }
  return out.map(b => ({x: b.xSum / b.n, d: b.d.map(v => v / b.n)}));
}

/** Builds the |x| -> delta curve from the vertices that already move. Returns null for bilateral/empty morphs. */
export function buildStationCurve({x, delta, center = 1.5e-3, anchor = 1.5e-3, tolerance = 0.3e-3}) {
  const n = x.length, moved = [];
  for (let i = 0; i < n; i++) if (Math.hypot(delta[i * 3], delta[i * 3 + 1], delta[i * 3 + 2]) > EPS) moved.push(i);
  if (!moved.length) return {reason: 'empty'};
  const sides = new Set(moved.filter(i => Math.abs(x[i]) >= center).map(i => Math.sign(x[i])));
  if (moved.some(i => Math.abs(x[i]) < center) || sides.size !== 1) return {reason: 'bilateral'};
  const bins = bin(moved.map(i => ({x: Math.abs(x[i]), d: [delta[i * 3], delta[i * 3 + 1], delta[i * 3 + 2]]})), tolerance);
  const x0 = Math.max(center, bins[0].x - anchor);
  return {reason: 'ok', side: [...sides][0], moved: new Set(moved), x0, tip: bins[bins.length - 1].x, curve: [{x: x0, d: [0, 0, 0]}, ...bins]};
}
export function evalStationCurve(curve, a) {
  let k = 0; while (k < curve.length - 2 && a > curve[k + 1].x) k++;
  const p = curve[k], q = curve[k + 1], t = Math.max(0, Math.min(1, (a - p.x) / Math.max(q.x - p.x, EPS)));
  return [0, 1, 2].map(c => p.d[c] + (q.d[c] - p.d[c]) * t);
}

/**
 * Pure function. x: signed x per contour vertex (metres), delta: Float64Array(n*3) of the morph.
 * lift: extra forward (z) push per unit of upward (y) displacement, so the lifted stroke rides over the
 * cheek instead of sinking under it (measured skin slope dz/dy ~ 0.46-0.49). Never mutates the input.
 */
export function propagateStationDeltas({x, delta, lift = 0, ...options}) {
  const out = Float64Array.from(delta), built = buildStationCurve({x, delta, ...options});
  if (built.reason !== 'ok') return {delta: out, welded: 0, reason: built.reason};
  let welded = 0;
  for (let i = 0; i < x.length; i++) {
    if (Math.sign(x[i]) !== built.side || Math.abs(x[i]) <= built.x0) continue;
    if (!built.moved.has(i)) { const d = evalStationCurve(built.curve, Math.abs(x[i])); for (let c = 0; c < 3; c++) out[i * 3 + c] = d[c]; welded++; }
    if (lift) out[i * 3 + 2] += lift * Math.max(0, out[i * 3 + 1]);
  }
  return {delta: out, welded, reason: 'ok', curve: built};
}

/** Lip-liner islands: same field, fading with depth (front rim follows the stroke, the cavity stays anchored). */
export function linerDelta({curve, side, ax, z, zFront, zBack, fade = 4e-3}) {
  if (Math.sign(ax) !== side || Math.abs(ax) <= curve.x0) return [0, 0, 0];
  const depth = Math.max(0, Math.min(1, (z - zBack) / Math.max(zFront - zBack, EPS))), wz = depth * depth * (3 - 2 * depth);
  const a = Math.abs(ax), wx = a <= curve.tip ? 1 : Math.max(0, 1 - (a - curve.tip) / fade);
  return evalStationCurve(curve.curve, Math.min(a, curve.tip)).map(v => v * wz * wx);
}

/** Islands of the Face that carry the red lip liner: lip-band atlas, around the contour, not the contour. */
export function findLinerIslands(geometry, contourIds) {
  const P = geometry.attributes.position, uv = geometry.attributes.uv, set = new Set(contourIds);
  let cy = 0, cz = 0; for (const i of contourIds) { cy += P.getY(i); cz += P.getZ(i); } cy /= contourIds.length; cz /= contourIds.length;
  return connectedComponents(geometry).filter(ids => {
    if (ids.some(i => set.has(i)) || ids.length > 120) return false;
    let lo = Infinity, hi = -Infinity, xm = 0, ymin = Infinity, ymax = -Infinity;
    for (const i of ids) { const v = uv.getY(i); lo = Math.min(lo, v); hi = Math.max(hi, v); xm = Math.max(xm, Math.abs(P.getX(i))); ymin = Math.min(ymin, P.getY(i)); ymax = Math.max(ymax, P.getY(i)); }
    return lo >= 0.925 && hi <= 0.995 && xm < 16e-3 && ymin > cy - 7e-3 && ymax < cy + 7e-3;
  });
}

/**
 * Applies the weld to a CLONE of the Face geometry. Call BEFORE createMouthIsolation() so the isolation
 * bench captures the welded geometry as its "original" and restores to it.
 */
export function createMouthRibbonWeld(model, {morphs = WELD_MORPHS, lift = 0.6, liner = true} = {}) {
  const face = model.getObjectByName('Shorekeeper_Face');
  if (!face?.isMesh) throw Error('Canonical Face mesh missing');
  const source = face.geometry, ids = findMouthContour(source);
  if (!ids) throw Error('Mouth contour island not found');
  if (!source.morphTargetsRelative) throw Error('Weld expects relative morph targets');
  const clone = source.clone(), P = source.attributes.position, report = [];
  const x = Float64Array.from(ids, i => P.getX(i));
  const islands = liner ? findLinerIslands(source, ids) : [], linerIds = islands.flat();
  let zFront = -Infinity, zBack = Infinity; for (const i of linerIds) { zFront = Math.max(zFront, P.getZ(i)); zBack = Math.min(zBack, P.getZ(i)); }
  for (const name of morphs) {
    const index = face.morphTargetDictionary?.[name];
    if (index === undefined) { report.push({name, welded: 0, liner: 0, reason: 'missing'}); continue; }
    const attr = clone.morphAttributes.position[index];
    const delta = new Float64Array(ids.length * 3);
    ids.forEach((v, k) => { delta[k * 3] = attr.getX(v); delta[k * 3 + 1] = attr.getY(v); delta[k * 3 + 2] = attr.getZ(v); });
    const r = propagateStationDeltas({x, delta, lift});
    let linerCount = 0;
    if (r.reason === 'ok') {
      ids.forEach((v, k) => attr.setXYZ(v, r.delta[k * 3], r.delta[k * 3 + 1], r.delta[k * 3 + 2]));
      for (const v of linerIds) {
        if (Math.hypot(attr.getX(v), attr.getY(v), attr.getZ(v)) > EPS) continue;
        const d = linerDelta({curve: r.curve, side: r.curve.side, ax: P.getX(v), z: P.getZ(v), zFront, zBack});
        if (Math.hypot(...d) > EPS) { attr.setXYZ(v, d[0], d[1], d[2] + lift * Math.max(0, d[1])); linerCount++; }
      }
      attr.needsUpdate = true;
    }
    report.push({name, welded: r.welded, liner: linerCount, reason: r.reason});
  }
  let active = true, disposed = false;
  face.geometry = clone;
  return {
    report, contourVertices: ids.length, linerIslands: islands.length, linerVertices: linerIds.length, lift, get active() { return active; },
    restore() { if (active && !disposed) { face.geometry = source; active = false; } },
    dispose() { if (disposed) return; if (active) face.geometry = source; clone.dispose(); active = false; disposed = true; },
  };
}
