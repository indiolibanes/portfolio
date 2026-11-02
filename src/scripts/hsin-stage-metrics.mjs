/** Opt-in performance instrumentation for the public stage. Off by default: every method is a no-op and the hot path pays one
 * boolean test. On (add `?hsin-metrics` to the URL), it keeps rolling windows of per-frame timings and one-shot milestones and
 * exposes them as `window.__hsinMetrics` (no UI, no extra loop, no network). Timings are CPU milliseconds measured around the
 * work; they are not GPU times. renderer.info counts submitted work and live objects, not VRAM. */
export const METRICS_FLAG = 'hsin-metrics';
export const metricsRequested = (search = '') => new URLSearchParams(search).has(METRICS_FLAG);

const percentile = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null;

export function createStageMetrics({enabled = false, now = () => performance.now(), window: size = 240} = {}) {
 if (!Number.isSafeInteger(size) || size < 1) throw new RangeError('Metrics window must be a positive integer.');
 const marks = new Map(), rings = new Map(), counters = {contextLost: 0, contextRestored: 0, frames: 0}; let last = null, origin = null;
 const ring = (name) => { let r = rings.get(name); if (!r) { r = {values: new Float64Array(size), count: 0, windowTotal: 0}; rings.set(name, r); } return r; };
 const api = {
  enabled,
  now: () => enabled ? now() : 0,
  /** Milestone relative to the first mark (page-side milliseconds). Only the first occurrence is kept. */
  mark(name) { if (!enabled || marks.has(name)) return; const t = now(); origin ??= t; marks.set(name, t - origin); },
  sample(name, ms) { if (!enabled || !Number.isFinite(ms) || ms < 0) return; const r = ring(name), index = r.count % size; if (r.count >= size) r.windowTotal -= r.values[index]; r.values[index] = ms; r.count++; r.windowTotal += ms; },
  /** Call once per drawn frame: records the interval between drawn frames. Gaps over 1 s are pauses, hidden tabs or context loss, not slow frames. */
  frame() { if (!enabled) return; const t = now(); if (last !== null && t - last <= 1000) api.sample('frameInterval', t - last); last = t; counters.frames++; api.mark('firstValidFrame'); },
  /** A pause, hidden tab or context loss must not count as a slow frame. */
  gap() { last = null; },
  count(name) { if (enabled && name in counters) counters[name]++; },
  report(renderer = null) {
   const stats = {};
   for (const [name, r] of rings) { const windowSamples = Math.min(r.count, size), live = Array.from(r.values.subarray(0, windowSamples)).sort((a, b) => a - b); stats[name] = {samples: r.count, windowSamples, mean: +(r.windowTotal / windowSamples).toFixed(3), p50: +percentile(live, .5).toFixed(3), p95: +percentile(live, .95).toFixed(3), max: +live[live.length - 1].toFixed(3)}; }
   const info = renderer?.info;
   return {enabled, milestonesMs: Object.fromEntries([...marks].map(([k, v]) => [k, +v.toFixed(1)])), timingsMs: stats, counters: {...counters},
    renderer: info ? {calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? null} : null,
    note: 'CPU milliseconds around the work; renderer.info is submitted work and live object counts, not VRAM or GPU time.'};
  },
 };
 return api;
}
