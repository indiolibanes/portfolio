// minigl.js — renderizador WebGL mínimo, sem dependências, para o modo-experimental.
//
// Por que existe: o rig 3D da Sophia veio em Three.js (CDN), mas o CSP do site só aceita
// scripts do próprio domínio e a biblioteca não pôde ser baixada na hora de montar isto.
// Aqui há só o necessário: grafo de cena (posição/rotação XYZ/escala), primitivas
// (esfera, cilindro/cone, toro, octaedro, tubo por Catmull-Rom), luz hemisférica +
// 2 direcionais + 1 pontual, brilho de borda frio e saída com gama.
// O desenho do rig segue as mesmas primitivas do Three.js, então é fácil portar depois.

export const m4 = {
  create() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  },
  // out = a × b (colunas-maior, como no WebGL)
  mul(out, a, b) {
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c += 1) {
      for (let row = 0; row < 4; row += 1) {
        r[c * 4 + row] =
          a[row] * b[c * 4] + a[4 + row] * b[c * 4 + 1] + a[8 + row] * b[c * 4 + 2] + a[12 + row] * b[c * 4 + 3];
      }
    }
    out.set(r);
    return out;
  },
  perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  },
  // Translação · rotação Euler XYZ (mesma convenção do Three.js) · escala.
  compose(out, p, e, s) {
    const a = Math.cos(e[0]);
    const b = Math.sin(e[0]);
    const c = Math.cos(e[1]);
    const d = Math.sin(e[1]);
    const g = Math.cos(e[2]);
    const f = Math.sin(e[2]);
    const ae = a * g;
    const af = a * f;
    const be = b * g;
    const bf = b * f;
    out[0] = c * g * s[0]; out[1] = (af + be * d) * s[0]; out[2] = (bf - ae * d) * s[0]; out[3] = 0;
    out[4] = -c * f * s[1]; out[5] = (ae - bf * d) * s[1]; out[6] = (be + af * d) * s[1]; out[7] = 0;
    out[8] = d * s[2]; out[9] = -b * c * s[2]; out[10] = a * c * s[2]; out[11] = 0;
    out[12] = p[0]; out[13] = p[1]; out[14] = p[2]; out[15] = 1;
    return out;
  },
  // Inversa transposta do bloco 3×3 (normais corretas mesmo com escala não uniforme).
  normalMatrix(out, m) {
    const a00 = m[0], a01 = m[4], a02 = m[8];
    const a10 = m[1], a11 = m[5], a12 = m[9];
    const a20 = m[2], a21 = m[6], a22 = m[10];
    const c00 = a11 * a22 - a12 * a21;
    const c01 = a12 * a20 - a10 * a22;
    const c02 = a10 * a21 - a11 * a20;
    const c10 = a02 * a21 - a01 * a22;
    const c11 = a00 * a22 - a02 * a20;
    const c12 = a01 * a20 - a00 * a21;
    const c20 = a01 * a12 - a02 * a11;
    const c21 = a02 * a10 - a00 * a12;
    const c22 = a00 * a11 - a01 * a10;
    const det = a00 * c00 + a01 * c01 + a02 * c02;
    const id = det ? 1 / det : 0;
    out[0] = c00 * id; out[1] = c10 * id; out[2] = c20 * id;
    out[3] = c01 * id; out[4] = c11 * id; out[5] = c21 * id;
    out[6] = c02 * id; out[7] = c12 * id; out[8] = c22 * id;
    return out;
  },
};

// ---------------------------------------------------------------- grafo de cena

export class Node {
  constructor(name = '') {
    this.name = name;
    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0];
    this.scale = [1, 1, 1];
    this.children = [];
    this.mesh = null;
    this.visible = true;
    this.world = m4.create();
    this.local = m4.create();
  }

  add(child) {
    this.children.push(child);
    return child;
  }
}

// ---------------------------------------------------------------- geometrias

function pack(pos, nor, idx) {
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
}

export function sphere(r, ws = 24, hs = 18) {
  const pos = [];
  const nor = [];
  const idx = [];
  for (let y = 0; y <= hs; y += 1) {
    const phi = (y / hs) * Math.PI;
    for (let x = 0; x <= ws; x += 1) {
      const th = (x / ws) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(th);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(th);
      pos.push(nx * r, ny * r, nz * r);
      nor.push(nx, ny, nz);
    }
  }
  for (let y = 0; y < hs; y += 1) {
    for (let x = 0; x < ws; x += 1) {
      const a = y * (ws + 1) + x;
      const b = a + ws + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return pack(pos, nor, idx);
}

// Eixo no Y; rTop em +Y. Cone = rTop 0.
export function cylinder(rTop, rBot, h, seg = 16) {
  const pos = [];
  const nor = [];
  const idx = [];
  const slope = (rBot - rTop) / h;
  for (let i = 0; i <= seg; i += 1) {
    const th = (i / seg) * Math.PI * 2;
    const cx = Math.cos(th);
    const sz = Math.sin(th);
    const inv = 1 / Math.hypot(1, slope);
    pos.push(cx * rTop, h / 2, sz * rTop, cx * rBot, -h / 2, sz * rBot);
    nor.push(cx * inv, slope * inv, sz * inv, cx * inv, slope * inv, sz * inv);
  }
  for (let i = 0; i < seg; i += 1) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const cap = (y, r, ny) => {
    if (r <= 0) return;
    const base = pos.length / 3;
    pos.push(0, y, 0);
    nor.push(0, ny, 0);
    for (let i = 0; i <= seg; i += 1) {
      const th = (i / seg) * Math.PI * 2;
      pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
      nor.push(0, ny, 0);
    }
    for (let i = 0; i < seg; i += 1) idx.push(base, base + 1 + i, base + 2 + i);
  };
  cap(h / 2, rTop, 1);
  cap(-h / 2, rBot, -1);
  return pack(pos, nor, idx);
}

// Anel deitado no plano XZ (o eixo do toro é o Y).
export function torus(R, r, rs = 10, ts = 28) {
  const pos = [];
  const nor = [];
  const idx = [];
  for (let j = 0; j <= ts; j += 1) {
    const u = (j / ts) * Math.PI * 2;
    for (let i = 0; i <= rs; i += 1) {
      const v = (i / rs) * Math.PI * 2;
      const cx = Math.cos(v) * Math.cos(u);
      const cy = Math.sin(v);
      const cz = Math.cos(v) * Math.sin(u);
      pos.push((R + r * Math.cos(v)) * Math.cos(u), r * cy, (R + r * Math.cos(v)) * Math.sin(u));
      nor.push(cx, cy, cz);
    }
  }
  for (let j = 0; j < ts; j += 1) {
    for (let i = 0; i < rs; i += 1) {
      const a = j * (rs + 1) + i;
      const b = a + rs + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return pack(pos, nor, idx);
}

// Faces planas (normal por face), como no Three.js.
export function octahedron(r) {
  const P = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]];
  const F = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  const pos = [];
  const nor = [];
  const idx = [];
  F.forEach((f) => {
    const [a, b, c] = f.map((k) => P[k]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(...n);
    n = n.map((x) => x / l);
    const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    if (n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] < 0) n = n.map((x) => -x);
    const base = pos.length / 3;
    [a, b, c].forEach((p) => {
      pos.push(...p);
      nor.push(...n);
    });
    idx.push(base, base + 1, base + 2);
  });
  return pack(pos, nor, idx);
}

// Catmull-Rom uniforme: pontos de controle → `samples + 1` pontos.
export function catmull(pts, samples) {
  const n = pts.length;
  const get = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  const out = [];
  for (let s = 0; s <= samples; s += 1) {
    const t = (s / samples) * (n - 1);
    const i = Math.floor(Math.min(t, n - 1 - 1e-9));
    const f = t - i;
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    out.push([0, 1, 2].map((k) => 0.5 * (
      2 * p1[k] +
      (-p0[k] + p2[k]) * f +
      (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f * f +
      (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f * f * f
    )));
  }
  return out;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// Tubo ao longo de uma polilinha, com transporte paralelo do referencial.
export function tube(points, radius, seg = 14) {
  const n = points.length;
  const T = points.map((_, i) => norm(sub(points[Math.min(n - 1, i + 1)], points[Math.max(0, i - 1)])));
  let N = cross(T[0], [0, 0, 1]);
  if (Math.hypot(...N) < 1e-4) N = cross(T[0], [0, 1, 0]);
  N = norm(N);
  const pos = [];
  const nor = [];
  const idx = [];
  for (let i = 0; i < n; i += 1) {
    if (i > 0) {
      const k = dot(N, T[i]);
      N = norm([N[0] - T[i][0] * k, N[1] - T[i][1] * k, N[2] - T[i][2] * k]);
    }
    const B = cross(T[i], N);
    for (let j = 0; j <= seg; j += 1) {
      const a = (j / seg) * Math.PI * 2;
      const d = [N[0] * Math.cos(a) + B[0] * Math.sin(a), N[1] * Math.cos(a) + B[1] * Math.sin(a), N[2] * Math.cos(a) + B[2] * Math.sin(a)];
      pos.push(points[i][0] + d[0] * radius, points[i][1] + d[1] * radius, points[i][2] + d[2] * radius);
      nor.push(...d);
    }
  }
  for (let i = 0; i < n - 1; i += 1) {
    for (let j = 0; j < seg; j += 1) {
      const a = i * (seg + 1) + j;
      const b = a + seg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return pack(pos, nor, idx);
}

// ---------------------------------------------------------------- cor

// '#rrggbb' (sRGB) → linear, para iluminar corretamente; a saída volta a sRGB no shader.
export function hex(h, k = 1) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => (c / 255) ** 2.2 * k);
}

// ---------------------------------------------------------------- renderizador

const VS = `
attribute vec3 aPos;
attribute vec3 aNor;
uniform mat4 uModel;
uniform mat4 uVP;
uniform mat3 uNM;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vW = w.xyz;
  vN = uNM * aNor;
  gl_Position = uVP * w;
}`;

const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vN;
varying vec3 vW;
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform float uShine;
uniform float uSpec;
uniform float uAlpha;
uniform vec3 uCam;
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec3 uD0; uniform vec3 uC0;
uniform vec3 uD1; uniform vec3 uC1;
uniform vec3 uPP; uniform vec3 uPC;
uniform vec3 uRim;
uniform float uRimK;
void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vW);
  vec3 col = uColor * mix(uGround, uSky, N.y * 0.5 + 0.5);
  float spec = 0.0;

  float n0 = max(dot(N, uD0), 0.0);
  col += uColor * uC0 * n0;
  spec += pow(max(dot(N, normalize(uD0 + V)), 0.0), uShine) * n0 * dot(uC0, vec3(0.33));

  float n1 = max(dot(N, uD1), 0.0);
  col += uColor * uC1 * n1;
  spec += pow(max(dot(N, normalize(uD1 + V)), 0.0), uShine) * n1 * dot(uC1, vec3(0.33));

  vec3 Lp = uPP - vW;
  float d2 = dot(Lp, Lp);
  Lp = normalize(Lp);
  float att = 1.0 / (1.0 + d2 * 0.18);
  float np = max(dot(N, Lp), 0.0) * att;
  col += uColor * uPC * np;
  spec += pow(max(dot(N, normalize(Lp + V)), 0.0), uShine) * np * dot(uPC, vec3(0.33));

  col += vec3(spec * uSpec);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += uRim * rim * uRimK;
  col += uEmissive;
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(col * uAlpha, uAlpha);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader');
  return sh;
}

export class MiniGL {
  constructor(canvas) {
    const opts = { antialias: true, alpha: true, premultipliedAlpha: true };
    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) throw new Error('WebGL indisponível');
    this.gl = gl;
    this.canvas = canvas;
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    gl.useProgram(prog);
    this.prog = prog;
    this.loc = {};
    ['uModel', 'uVP', 'uNM', 'uColor', 'uEmissive', 'uShine', 'uSpec', 'uAlpha', 'uCam', 'uSky', 'uGround',
      'uD0', 'uC0', 'uD1', 'uC1', 'uPP', 'uPC', 'uRim', 'uRimK'].forEach((n) => {
      this.loc[n] = gl.getUniformLocation(prog, n);
    });
    this.aPos = gl.getAttribLocation(prog, 'aPos');
    this.aNor = gl.getAttribLocation(prog, 'aNor');
    gl.enableVertexAttribArray(this.aPos);
    gl.enableVertexAttribArray(this.aNor);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.P = m4.create();
    this.VP = m4.create();
    this.V = m4.create();
    this.NM = new Float32Array(9);
    this.draws = [];
    this.lost = false;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
    });
  }

  // geometria + material → malha (buffers na GPU).
  mesh(geo, mat) {
    const gl = this.gl;
    const mk = (target, data) => {
      const b = gl.createBuffer();
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return b;
    };
    return {
      pos: mk(gl.ARRAY_BUFFER, geo.pos),
      nor: mk(gl.ARRAY_BUFFER, geo.nor),
      idx: mk(gl.ELEMENT_ARRAY_BUFFER, geo.idx),
      count: geo.idx.length,
      mat: {
        color: hex(mat.color),
        emissive: mat.emissive ? hex(mat.emissive, mat.emissiveIntensity ?? 1) : [0, 0, 0],
        shine: mat.shine ?? 16,
        spec: mat.spec ?? 0.1,
        alpha: mat.alpha ?? 1,
        rim: mat.rim ?? 0.3,
      },
    };
  }

  setSize(cssW, cssH, dpr) {
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  // cam: { fov (rad), x, y, dist, tx, ty }  — olha para -Z a partir de (x, y, dist);
  // tx/ty deslocam o ponto observado na tela (NDC), para a personagem ficar fora do centro.
  // env:  { sky, ground, d0, c0, d1, c1, pp, pc, rim }  — cores já lineares (hex()).
  render(root, cam, env) {
    if (this.lost) return;
    const gl = this.gl;
    const L = this.loc;
    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    m4.perspective(this.P, cam.fov, w / h, 0.05, 60);
    for (let c = 0; c < 4; c += 1) {
      this.P[c * 4] += cam.tx * this.P[c * 4 + 3];
      this.P[c * 4 + 1] += cam.ty * this.P[c * 4 + 3];
    }
    this.V.fill(0);
    this.V[0] = this.V[5] = this.V[10] = this.V[15] = 1;
    this.V[12] = -cam.x;
    this.V[13] = -cam.y;
    this.V[14] = -cam.dist;
    m4.mul(this.VP, this.P, this.V);

    gl.uniformMatrix4fv(L.uVP, false, this.VP);
    gl.uniform3f(L.uCam, cam.x, cam.y, cam.dist);
    gl.uniform3fv(L.uSky, env.sky);
    gl.uniform3fv(L.uGround, env.ground);
    gl.uniform3fv(L.uD0, env.d0);
    gl.uniform3fv(L.uC0, env.c0);
    gl.uniform3fv(L.uD1, env.d1);
    gl.uniform3fv(L.uC1, env.c1);
    gl.uniform3fv(L.uPP, env.pp);
    gl.uniform3fv(L.uPC, env.pc);
    gl.uniform3fv(L.uRim, env.rim);

    this.draws.length = 0;
    this.collect(root, null);
    // opacos primeiro; translúcidos por último, sem escrever profundidade
    const opaque = this.draws.filter((n) => n.mesh.mat.alpha >= 1);
    const blended = this.draws.filter((n) => n.mesh.mat.alpha < 1);
    opaque.forEach((n) => this.drawNode(n));
    gl.depthMask(false);
    blended.forEach((n) => this.drawNode(n));
    gl.depthMask(true);
  }

  collect(node, parent) {
    if (!node.visible) return;
    m4.compose(node.local, node.position, node.rotation, node.scale);
    if (parent) m4.mul(node.world, parent.world, node.local);
    else node.world.set(node.local);
    if (node.mesh) this.draws.push(node);
    node.children.forEach((c) => this.collect(c, node));
  }

  drawNode(node) {
    const gl = this.gl;
    const L = this.loc;
    const m = node.mesh;
    gl.bindBuffer(gl.ARRAY_BUFFER, m.pos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.nor);
    gl.vertexAttribPointer(this.aNor, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx);
    gl.uniformMatrix4fv(L.uModel, false, node.world);
    gl.uniformMatrix3fv(L.uNM, false, m4.normalMatrix(this.NM, node.world));
    gl.uniform3fv(L.uColor, m.mat.color);
    gl.uniform3fv(L.uEmissive, m.mat.emissive);
    gl.uniform1f(L.uShine, m.mat.shine);
    gl.uniform1f(L.uSpec, m.mat.spec);
    gl.uniform1f(L.uAlpha, m.mat.alpha);
    gl.uniform1f(L.uRimK, m.mat.rim);
    gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
  }
}
