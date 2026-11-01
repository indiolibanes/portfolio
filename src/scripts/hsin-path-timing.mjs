/**
 * Monotone C1 re-timing for a chain of pose segments. Pure math: no THREE, no rig.
 *
 * Easing every segment on its own forces zero velocity at each interior waypoint,
 * so a three-segment arm path stops and restarts twice. This keeps the visited
 * poses and the authored waypoint times exactly as they are and only changes the
 * speed profile between them: a Fritsch-Butland monotone cubic Hermite through
 * (time, cumulative pose distance), whose interior tangents are never zero.
 * Start and end tangents are the neighbouring secant; the caller's own envelope
 * (e.g. a quintic over the whole gesture) is what brings the motion to rest.
 */
export function createPathTiming(times, lengths) {
  const n = Array.isArray(times) ? times.length : 0;
  if (n < 2 || !Array.isArray(lengths) || lengths.length !== n - 1) throw new Error('Path timing needs n knots and n-1 segment lengths.');
  if (times[0] !== 0 || times[n - 1] !== 1) throw new Error('Path timing knots must span 0..1.');
  for (let i = 1; i < n; i++) if (!(times[i] > times[i - 1])) throw new Error('Path timing knots must increase strictly.');
  if (!lengths.every((v) => Number.isFinite(v) && v >= 0)) throw new Error('Segment lengths must be finite and non-negative.');

  const total = lengths.reduce((a, b) => a + b, 0);
  const h = lengths.map((_, i) => times[i + 1] - times[i]);
  // Without any distance there is nothing to shape: fall back to linear time.
  const S = [0];
  for (let i = 0; i < n - 1; i++) S.push(total > 0 ? S[i] + lengths[i] / total : times[i + 1]);
  const d = h.map((hi, i) => (S[i + 1] - S[i]) / hi);
  const m = new Array(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }
    const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }

  function segmentOf(t) {
    let k = 0;
    while (k < n - 2 && t > times[k + 1]) k++;
    return k;
  }
  function distance(t, k) {
    const u = (t - times[k]) / h[k], u2 = u * u, u3 = u2 * u;
    const s = (2 * u3 - 3 * u2 + 1) * S[k] + (u3 - 2 * u2 + u) * h[k] * m[k]
      + (-2 * u3 + 3 * u2) * S[k + 1] + (u3 - u2) * h[k] * m[k + 1];
    return Math.max(S[k], Math.min(S[k + 1], s));
  }
  return {
    knots: [...times],
    /** Which segment to blend and how far through it, for a gesture parameter in 0..1. */
    sample(t) {
      t = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
      const k = segmentOf(t), span = S[k + 1] - S[k];
      return { index: k, mix: span > 0 ? (distance(t, k) - S[k]) / span : (t - times[k]) / h[k] };
    },
    /** Pose-space speed, as a fraction of the whole path per unit of t. */
    speed(t) {
      t = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
      const k = segmentOf(t), u = (t - times[k]) / h[k], u2 = u * u;
      const ds = (6 * u2 - 6 * u) * S[k] / h[k] + (3 * u2 - 4 * u + 1) * m[k]
        + (-6 * u2 + 6 * u) * S[k + 1] / h[k] + (3 * u2 - 2 * u) * m[k + 1];
      return ds;
    },
  };
}
