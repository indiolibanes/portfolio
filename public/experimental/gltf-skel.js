// gltf-skel.js — leitor de GLB, esqueleto e animação para o modo-experimental.
// Sem dependências e sem WebGL (roda também no Node, para conferir poses e velocidades).
// O desenho fica em gltf-gl.js. Matrizes em coluna-maior, como no WebGL; quaternions [x, y, z, w].

const TYPES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const CTYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NORM = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };

// ---------------------------------------------------------------- GLB

export function parseGLB(buf) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('Arquivo não é um GLB');
  let off = 12;
  let json = null;
  let bin = null;
  while (off + 8 <= dv.byteLength) {
    const len = dv.getUint32(off, true);
    const type = dv.getUint32(off + 4, true);
    const start = off + 8;
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, start, len)));
    else if (type === 0x004e4942) bin = new Uint8Array(buf, start, len);
    off = start + len;
  }
  if (!json || !bin) throw new Error('GLB sem JSON ou sem dados binários');
  return { json, bin };
}

// Lê um accessor como Float32Array (inteiros normalizados viram 0..1 / -1..1).
export function readAccessor(json, bin, index) {
  const a = json.accessors[index];
  const n = TYPES[a.type];
  const C = CTYPES[a.componentType];
  const out = new Float32Array(a.count * n);
  if (a.bufferView === undefined) return out;
  const bv = json.bufferViews[a.bufferView];
  const base = bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0);
  const size = C.BYTES_PER_ELEMENT;
  const stride = bv.byteStride || n * size;
  const dv = new DataView(bin.buffer);
  const norm = a.normalized ? NORM[a.componentType] : 0;
  const get = {
    5120: (o) => dv.getInt8(o), 5121: (o) => dv.getUint8(o), 5122: (o) => dv.getInt16(o, true),
    5123: (o) => dv.getUint16(o, true), 5125: (o) => dv.getUint32(o, true), 5126: (o) => dv.getFloat32(o, true),
  }[a.componentType];
  for (let i = 0; i < a.count; i += 1) {
    for (let k = 0; k < n; k += 1) {
      const v = get(base + i * stride + k * size);
      out[i * n + k] = norm ? Math.max(-1, v / norm) : v;
    }
  }
  return out;
}

// ---------------------------------------------------------------- matrizes e quaternions

export function composeInto(out, oo, T, ti, R, ri, S, si) {
  const x = R[ri], y = R[ri + 1], z = R[ri + 2], w = R[ri + 3];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const sx = S[si], sy = S[si + 1], sz = S[si + 2];
  out[oo] = (1 - (yy + zz)) * sx; out[oo + 1] = (xy + wz) * sx; out[oo + 2] = (xz - wy) * sx; out[oo + 3] = 0;
  out[oo + 4] = (xy - wz) * sy; out[oo + 5] = (1 - (xx + zz)) * sy; out[oo + 6] = (yz + wx) * sy; out[oo + 7] = 0;
  out[oo + 8] = (xz + wy) * sz; out[oo + 9] = (yz - wx) * sz; out[oo + 10] = (1 - (xx + yy)) * sz; out[oo + 11] = 0;
  out[oo + 12] = T[ti]; out[oo + 13] = T[ti + 1]; out[oo + 14] = T[ti + 2]; out[oo + 15] = 1;
}

const tmp16 = new Float32Array(16);
export function mulInto(out, oo, a, ao, b, bo) {
  for (let c = 0; c < 4; c += 1) {
    const b0 = b[bo + c * 4], b1 = b[bo + c * 4 + 1], b2 = b[bo + c * 4 + 2], b3 = b[bo + c * 4 + 3];
    for (let r = 0; r < 4; r += 1) {
      tmp16[c * 4 + r] = a[ao + r] * b0 + a[ao + 4 + r] * b1 + a[ao + 8 + r] * b2 + a[ao + 12 + r] * b3;
    }
  }
  for (let i = 0; i < 16; i += 1) out[oo + i] = tmp16[i];
}

export function invertAffine(out, m) {
  // Inversa de uma matriz afim (3×3 + translação).
  const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
  const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
  const det = a * A + b * B + c * C;
  const id = det ? 1 / det : 0;
  const r0 = A * id, r1 = (c * h - b * i) * id, r2 = (b * f - c * e) * id;
  const r3 = B * id, r4 = (a * i - c * g) * id, r5 = (c * d - a * f) * id;
  const r6 = C * id, r7 = (b * g - a * h) * id, r8 = (a * e - b * d) * id;
  out[0] = r0; out[1] = r1; out[2] = r2; out[3] = 0;
  out[4] = r3; out[5] = r4; out[6] = r5; out[7] = 0;
  out[8] = r6; out[9] = r7; out[10] = r8; out[11] = 0;
  out[12] = -(r0 * m[12] + r3 * m[13] + r6 * m[14]);
  out[13] = -(r1 * m[12] + r4 * m[13] + r7 * m[14]);
  out[14] = -(r2 * m[12] + r5 * m[13] + r8 * m[14]);
  out[15] = 1;
  return out;
}

export const quat = {
  mul(a, b) {
    return [
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
    ];
  },
  inv: (q) => [-q[0], -q[1], -q[2], q[3]],
  axis(ax, ay, az, angle) {
    const l = Math.hypot(ax, ay, az) || 1;
    const s = Math.sin(angle / 2) / l;
    return [ax * s, ay * s, az * s, Math.cos(angle / 2)];
  },
  euler(x, y, z) {
    // XYZ, mesma ordem do Three.js
    const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
    return [
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 + s1 * s2 * c3,
      c1 * c2 * c3 - s1 * s2 * s3,
    ];
  },
  slerp(a, b, t) {
    let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    let sgn = 1;
    if (cos < 0) { cos = -cos; sgn = -1; }
    let k0, k1;
    if (cos > 0.9995) {
      k0 = 1 - t;
      k1 = t * sgn;
    } else {
      const th = Math.acos(cos);
      const s = Math.sin(th);
      k0 = Math.sin((1 - t) * th) / s;
      k1 = (Math.sin(t * th) / s) * sgn;
    }
    const o = [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1, a[3] * k0 + b[3] * k1];
    const l = Math.hypot(...o) || 1;
    return o.map((v) => v / l);
  },
  // menor rotação que leva a direção a em b (vetores unitários)
  between(a, b) {
    const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    if (d < -0.999999) {
      const ax = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      const c = [a[1] * ax[2] - a[2] * ax[1], a[2] * ax[0] - a[0] * ax[2], a[0] * ax[1] - a[1] * ax[0]];
      return quat.axis(c[0], c[1], c[2], Math.PI);
    }
    const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const q = [c[0], c[1], c[2], 1 + d];
    const l = Math.hypot(...q) || 1;
    return q.map((v) => v / l);
  },
  // rotação (3×3 de uma matriz coluna-maior com escala removida) → quaternion
  fromMat(m, o = 0) {
    const sx = Math.hypot(m[o], m[o + 1], m[o + 2]) || 1;
    const sy = Math.hypot(m[o + 4], m[o + 5], m[o + 6]) || 1;
    const sz = Math.hypot(m[o + 8], m[o + 9], m[o + 10]) || 1;
    const m00 = m[o] / sx, m10 = m[o + 1] / sx, m20 = m[o + 2] / sx;
    const m01 = m[o + 4] / sy, m11 = m[o + 5] / sy, m21 = m[o + 6] / sy;
    const m02 = m[o + 8] / sz, m12 = m[o + 9] / sz, m22 = m[o + 10] / sz;
    const tr = m00 + m11 + m22;
    let x, y, z, w;
    if (tr > 0) {
      const s = Math.sqrt(tr + 1) * 2;
      w = 0.25 * s; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s;
    } else if (m00 > m11 && m00 > m22) {
      const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
      w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s;
    } else if (m11 > m22) {
      const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
      w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s;
    } else {
      const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
      w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s;
    }
    return [x, y, z, w];
  },
  rotate(q, v) {
    // v' = q v q⁻¹
    const [x, y, z, w] = q;
    const ix = w * v[0] + y * v[2] - z * v[1];
    const iy = w * v[1] + z * v[0] - x * v[2];
    const iz = w * v[2] + x * v[1] - y * v[0];
    const iw = -x * v[0] - y * v[1] - z * v[2];
    return [
      ix * w + iw * -x + iy * -z - iz * -y,
      iy * w + iw * -y + iz * -x - ix * -z,
      iz * w + iw * -z + ix * -y - iy * -x,
    ];
  },
};

// ---------------------------------------------------------------- esqueleto

export class Skeleton {
  constructor(json, bin) {
    this.json = json;
    this.bin = bin;
    const nodes = json.nodes;
    const n = nodes.length;
    this.n = n;
    this.names = nodes.map((nd) => nd.name || '');
    this.index = {};
    this.names.forEach((nm, i) => { if (nm && !(nm in this.index)) this.index[nm] = i; });
    this.parent = new Int32Array(n).fill(-1);
    nodes.forEach((nd, i) => (nd.children || []).forEach((c) => { this.parent[c] = i; }));

    this.restT = new Float32Array(n * 3);
    this.restR = new Float32Array(n * 4);
    this.restS = new Float32Array(n * 3);
    nodes.forEach((nd, i) => {
      const t = nd.translation || [0, 0, 0];
      const r = nd.rotation || [0, 0, 0, 1];
      const s = nd.scale || [1, 1, 1];
      this.restT.set(t, i * 3);
      this.restR.set(r, i * 4);
      this.restS.set(s, i * 3);
    });
    this.T = new Float32Array(this.restT);
    this.R = new Float32Array(this.restR);
    this.S = new Float32Array(this.restS);
    this.world = new Float32Array(n * 16);

    // ordem pai → filho a partir das raízes da cena
    this.order = [];
    const visit = (i) => { this.order.push(i); (nodes[i].children || []).forEach(visit); };
    (json.scenes[json.scene || 0].nodes || []).forEach(visit);

    // pele
    const skin = (json.skins || [])[0];
    if (skin) {
      this.joints = skin.joints;
      this.ibm = readAccessor(json, bin, skin.inverseBindMatrices);
      this.jointMatrices = new Float32Array(skin.joints.length * 16);
    }
    this.meshNode = nodes.findIndex((nd) => nd.skin !== undefined);

    // animações
    this.clips = {};
    (json.animations || []).forEach((a) => {
      const channels = a.channels.map((ch) => {
        const s = a.samplers[ch.sampler];
        return {
          node: ch.target.node,
          path: ch.target.path,
          step: s.interpolation === 'STEP',
          times: readAccessor(json, bin, s.input),
          values: readAccessor(json, bin, s.output),
        };
      });
      const duration = Math.max(...channels.map((c) => c.times[c.times.length - 1]));
      this.clips[a.name] = { name: a.name, duration, channels };
    });

    this.pT = new Float32Array(n * 3);
    this.pR = new Float32Array(n * 4);
    this.pS = new Float32Array(n * 3);
    this.updateWorld();
  }

  // grava no pose (T, R, S) a amostra do clipe em `time` (segundos, com repetição ou fixo).
  sample(clip, time, T, R, S, loop = true) {
    const d = clip.duration || 1;
    const t = loop ? ((time % d) + d) % d : Math.min(Math.max(time, 0), d);
    for (const ch of clip.channels) {
      const times = ch.times;
      const last = times.length - 1;
      let i = 0;
      if (t >= times[last]) i = last;
      else { while (i < last && times[i + 1] <= t) i += 1; }
      const j = Math.min(i + 1, last);
      const span = times[j] - times[i];
      const f = ch.step || span <= 0 ? 0 : (t - times[i]) / span;
      const v = ch.values;
      if (ch.path === 'rotation') {
        const q = quat.slerp([v[i * 4], v[i * 4 + 1], v[i * 4 + 2], v[i * 4 + 3]], [v[j * 4], v[j * 4 + 1], v[j * 4 + 2], v[j * 4 + 3]], f);
        R.set(q, ch.node * 4);
      } else {
        const o = ch.path === 'translation' ? T : S;
        for (let k = 0; k < 3; k += 1) o[ch.node * 3 + k] = v[i * 3 + k] + (v[j * 3 + k] - v[i * 3 + k]) * f;
      }
    }
  }

  // layers: [{ clip, time, weight, loop }] → pose em this.T/R/S (mistura normalizada pelos pesos)
  evaluate(layers) {
    const n = this.n;
    const live = layers.filter((l) => l.weight > 1e-4);
    const total = live.reduce((s, l) => s + l.weight, 0) || 1;
    this.T.fill(0);
    this.S.fill(0);
    this.R.fill(0);
    live.forEach((l, li) => {
      this.pT.set(this.restT);
      this.pR.set(this.restR);
      this.pS.set(this.restS);
      if (l.clip) this.sample(l.clip, l.time, this.pT, this.pR, this.pS, l.loop !== false);
      const w = l.weight / total;
      for (let i = 0; i < n * 3; i += 1) { this.T[i] += this.pT[i] * w; this.S[i] += this.pS[i] * w; }
      for (let i = 0; i < n; i += 1) {
        const o = i * 4;
        let s = 1;
        if (li > 0 && this.R[o] * this.pR[o] + this.R[o + 1] * this.pR[o + 1] + this.R[o + 2] * this.pR[o + 2] + this.R[o + 3] * this.pR[o + 3] < 0) s = -1;
        for (let k = 0; k < 4; k += 1) this.R[o + k] += this.pR[o + k] * w * s;
      }
    });
    if (!live.length) { this.T.set(this.restT); this.R.set(this.restR); this.S.set(this.restS); return; }
    for (let i = 0; i < n; i += 1) {
      const o = i * 4;
      const l = Math.hypot(this.R[o], this.R[o + 1], this.R[o + 2], this.R[o + 3]) || 1;
      for (let k = 0; k < 4; k += 1) this.R[o + k] /= l;
    }
  }

  updateWorld() {
    const W = this.world;
    for (const i of this.order) {
      const p = this.parent[i];
      if (p < 0) composeInto(W, i * 16, this.T, i * 3, this.R, i * 4, this.S, i * 3);
      else {
        composeInto(tmp16b, 0, this.T, i * 3, this.R, i * 4, this.S, i * 3);
        mulInto(W, i * 16, W, p * 16, tmp16b, 0);
      }
    }
  }

  // matrizes de junta (inverse(mundo do nó da malha) × mundo da junta × inverseBind)
  updateSkin() {
    if (!this.joints) return;
    const inv = invertAffine(new Float32Array(16), this.world.subarray(this.meshNode * 16, this.meshNode * 16 + 16));
    this.joints.forEach((j, k) => {
      mulInto(this.jointMatrices, k * 16, this.world, j * 16, this.ibm, k * 16);
      mulInto(this.jointMatrices, k * 16, inv, 0, this.jointMatrices, k * 16);
    });
  }

  // gira o nó no espaço local dele (depois da animação): r = r × q
  rotateLocal(name, q) {
    const i = this.index[name];
    if (i === undefined) return;
    const r = quat.mul([this.R[i * 4], this.R[i * 4 + 1], this.R[i * 4 + 2], this.R[i * 4 + 3]], q);
    this.R.set(r, i * 4);
  }

  scaleNode(name, k) {
    const i = this.index[name];
    if (i !== undefined) for (let a = 0; a < 3; a += 1) this.S[i * 3 + a] *= k;
  }

  worldPos(name) {
    const i = this.index[name];
    return [this.world[i * 16 + 12], this.world[i * 16 + 13], this.world[i * 16 + 14]];
  }

  // Aponta a corda (nó → ponta) para `target` (espaço do modelo), girando só `name`.
  // O cotovelo continua dobrado como na animação; `weight` mistura animação e mira.
  aim(name, endName, target, weight = 1) {
    const i = this.index[name];
    const p = this.parent[i];
    if (i === undefined || weight <= 0) return;
    const a = this.worldPos(name);
    const e = this.worldPos(endName);
    const v = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
    const d = [target[0] - a[0], target[1] - a[1], target[2] - a[2]];
    const lv = Math.hypot(...v);
    const ld = Math.hypot(...d);
    if (lv < 1e-5 || ld < 1e-5) return;
    const dq = quat.between(v.map((x) => x / lv), d.map((x) => x / ld));
    const rp = p >= 0 ? quat.fromMat(this.world, p * 16) : [0, 0, 0, 1];
    const local = [this.R[i * 4], this.R[i * 4 + 1], this.R[i * 4 + 2], this.R[i * 4 + 3]];
    // rotação mundial dq expressa no espaço do pai: rp⁻¹ · dq · rp
    const dLocal = quat.mul(quat.mul(quat.inv(rp), dq), rp);
    const next = quat.mul(dLocal, local);
    this.R.set(quat.slerp(local, next, weight), i * 4);
    this.updateWorld();
  }
}

const tmp16b = new Float32Array(16);
