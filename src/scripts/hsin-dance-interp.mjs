/**
 * Inter-sample interpolation for baked dance frames.
 * Authored samples sit at ~15 Hz while the stage runs at 30 Hz. Linear slerp between samples keeps the path but
 * makes angular velocity change in steps; a Catmull–Rom spline through the same samples keeps velocity continuous.
 * Samples are hit exactly, so timing and the verified support path at sample points are unchanged.
 * No allocations: writes four numbers into `out`.
 */
export function splineQuaternion(frames, i, mix, k, out) {
  const o = k * 4, n = frames.length, p0 = frames[i > 0 ? i - 1 : 0], p1 = frames[i], p2 = frames[i + 1], p3 = frames[i + 2 < n ? i + 2 : n - 1];
  const s0 = p0[o] * p1[o] + p0[o + 1] * p1[o + 1] + p0[o + 2] * p1[o + 2] + p0[o + 3] * p1[o + 3] < 0 ? -1 : 1;
  const s2 = p2[o] * p1[o] + p2[o + 1] * p1[o + 1] + p2[o + 2] * p1[o + 2] + p2[o + 3] * p1[o + 3] < 0 ? -1 : 1;
  const s3 = (p3[o] * p2[o] + p3[o + 1] * p2[o + 1] + p3[o + 2] * p2[o + 2] + p3[o + 3] * p2[o + 3] < 0 ? -1 : 1) * s2;
  const u = mix, u2 = u * u, u3 = u2 * u;
  let len = 0;
  for (let c = 0; c < 4; c++) {
    const a = p0[o + c] * s0, b = p1[o + c], d = p2[o + c] * s2, e = p3[o + c] * s3;
    const v = .5 * (2 * b + (-a + d) * u + (2 * a - 5 * b + 4 * d - e) * u2 + (-a + 3 * b - 3 * d + e) * u3);
    out[c] = v; len += v * v;
  }
  len = len > 1e-18 ? 1 / Math.sqrt(len) : 1;
  out[0] *= len; out[1] *= len; out[2] *= len; out[3] *= len;
}

/** Same hemisphere-aware normalisation used by linear sampling, for tests that compare both paths. */
export function linearQuaternion(frames, i, mix, k, out) {
  const o = k * 4, a = frames[i], b = frames[i + 1];
  let bx = b[o], by = b[o + 1], bz = b[o + 2], bw = b[o + 3];
  const la = 1 / Math.hypot(a[o], a[o + 1], a[o + 2], a[o + 3]), lb = 1 / Math.hypot(bx, by, bz, bw);
  let dot = (a[o] * bx + a[o + 1] * by + a[o + 2] * bz + a[o + 3] * bw) * la * lb;
  const s = dot < 0 ? -lb : lb; dot = Math.abs(dot);
  bx *= s; by *= s; bz *= s; bw *= s;
  const ax = a[o] * la, ay = a[o + 1] * la, az = a[o + 2] * la, aw = a[o + 3] * la, theta = Math.acos(Math.min(1, dot)), sin = Math.sin(theta);
  const w0 = sin < 1e-6 ? 1 - mix : Math.sin((1 - mix) * theta) / sin, w1 = sin < 1e-6 ? mix : Math.sin(mix * theta) / sin;
  out[0] = ax * w0 + bx * w1; out[1] = ay * w0 + by * w1; out[2] = az * w0 + bz * w1; out[3] = aw * w0 + bw * w1;
}
