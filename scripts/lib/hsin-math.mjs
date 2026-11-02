/** Small column-major 4x4 / quaternion helpers for the offline rig tools. Float64, no three. */
export const identity = () => { const m = new Float64Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
export function compose(t, q, s, out = new Float64Array(16)) {
 const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
 out[0] = (1 - (yy + zz)) * s[0]; out[1] = (xy + wz) * s[0]; out[2] = (xz - wy) * s[0]; out[3] = 0;
 out[4] = (xy - wz) * s[1]; out[5] = (1 - (xx + zz)) * s[1]; out[6] = (yz + wx) * s[1]; out[7] = 0;
 out[8] = (xz + wy) * s[2]; out[9] = (yz - wx) * s[2]; out[10] = (1 - (xx + yy)) * s[2]; out[11] = 0;
 out[12] = t[0]; out[13] = t[1]; out[14] = t[2]; out[15] = 1; return out;
}
export function mul(a, b, out = new Float64Array(16)) {
 for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
 return out;
}
export function invert(m, out = new Float64Array(16)) {
 const a = m, b = new Float64Array(16);
 const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
 const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
 const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
 let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; det = 1 / det;
 b[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; b[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det; b[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; b[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
 b[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; b[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det; b[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; b[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
 b[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; b[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det; b[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; b[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
 b[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; b[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det; b[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; b[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
 out.set(b); return out;
}
export const transformPoint = (m, x, y, z, out = [0, 0, 0]) => { out[0] = m[0] * x + m[4] * y + m[8] * z + m[12]; out[1] = m[1] * x + m[5] * y + m[9] * z + m[13]; out[2] = m[2] * x + m[6] * y + m[10] * z + m[14]; return out; };
export const transformDir = (m, x, y, z, out = [0, 0, 0]) => { out[0] = m[0] * x + m[4] * y + m[8] * z; out[1] = m[1] * x + m[5] * y + m[9] * z; out[2] = m[2] * x + m[6] * y + m[10] * z; return out; };

// Quaternions are [x, y, z, w].
export const qMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
export const qConj = (q) => [-q[0], -q[1], -q[2], q[3]];
export const qNorm = (q) => { const l = Math.hypot(...q) || 1; return q.map((v) => v / l); };
export function qAxisAngle(axis, angle) { const l = Math.hypot(...axis) || 1, s = Math.sin(angle / 2) / l; return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)]; }
export function qSlerp(a, b, t) {
 let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], sign = 1; if (cos < 0) { cos = -cos; sign = -1; }
 let k0, k1; if (cos > .9995) { k0 = 1 - t; k1 = t * sign; } else { const th = Math.acos(cos), s = Math.sin(th); k0 = Math.sin((1 - t) * th) / s; k1 = Math.sin(t * th) / s * sign; }
 return qNorm([a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1, a[3] * k0 + b[3] * k1]);
}
export const qAngle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])));
/** Rotation vector (axis * angle) of a unit quaternion, shortest arc. */
export function qLog(q) { let [x, y, z, w] = q; if (w < 0) { x = -x; y = -y; z = -z; w = -w; } const s = Math.hypot(x, y, z); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, w); return [x / s * a, y / s * a, z / s * a]; }
export const qExp = (v) => { const a = Math.hypot(...v); return a < 1e-12 ? [0, 0, 0, 1] : qAxisAngle(v, a); };
export const qApply = (q, v) => { const r = qMul(qMul(q, [v[0], v[1], v[2], 0]), qConj(q)); return [r[0], r[1], r[2]]; };
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
