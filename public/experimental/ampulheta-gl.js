// ampulheta-gl.js — desenho da ampulheta em WebGL2, sem dependências.
// Passos: mesa de madeira (procedural, século XVIII) → grãos instanciados → vidro translúcido
// com reflexo da luz do cursor e de um ambiente próximo → rachaduras (mancha por shader).
// Não é ray tracing: reflexos e sombra de contato são aproximados analiticamente.

const GLSL_COMMON = `#version 300 es
precision highp float;
`;

const VS_MESH = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNrm;
in vec3 aOff;          // deslocamento por instância (só para os grãos)
uniform mat4 uModel, uView, uProj;
uniform int uInstanced;
out vec3 vW; out vec3 vN; out vec3 vL;
void main() {
  vec3 p = aPos + (uInstanced == 1 ? aOff : vec3(0.0));
  vec4 w = uModel * vec4(p, 1.0);
  vW = w.xyz;
  vN = mat3(uModel) * aNrm;
  vL = p;
  gl_Position = uProj * uView * w;
}`;

// Luz do cursor + luz ambiente fria. Sem sombra projetada: sombra de contato em fs_table.
const LIGHT_GLSL = `
uniform vec3 uLight;      // posição da chama (segue o cursor)
uniform vec3 uLightCol;
uniform float uLightI;
uniform vec3 uEye;
vec3 lightTerm(vec3 P, vec3 N, vec3 V, vec3 alb, float rough, float spec) {
  vec3 Ld = uLight - P;
  float d2 = dot(Ld, Ld);
  vec3 L = Ld * inversesqrt(d2);
  float att = uLightI / (0.02 + d2 * 9.0);
  float ndl = max(dot(N, L), 0.0);
  vec3 H = normalize(L + V);
  float sh = pow(max(dot(N, H), 0.0), mix(180.0, 16.0, rough)) * spec;
  vec3 amb = vec3(0.012, 0.016, 0.03) * alb;
  return amb + (alb * ndl + vec3(sh)) * uLightCol * att;
}`;

const FS_TABLE = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec3 vL;
out vec4 o;
uniform vec2 uMid;        // (x, z) do centro da ampulheta na mesa
uniform float uHour;      // raio de sombra de contato
${LIGHT_GLSL}
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.07; a *= 0.5; } return s; }
void main() {
  // tábua: largura ~0,22 m, veios longitudinais, juntas escuras e desgaste irregular
  float plank = 0.22;
  float id = floor(vW.x / plank);
  float fx = fract(vW.x / plank);
  float seam = smoothstep(0.0, 0.012, fx) * smoothstep(1.0, 0.988, fx);
  vec2 g = vec2(vW.x * 38.0 + id * 13.7, vW.z * 2.2);
  float veins = fbm(g + vec2(0.0, fbm(g * 0.6) * 3.0));
  float rings = 0.5 + 0.5 * sin((veins * 9.0 + vW.z * 3.0) * 6.2831);
  float wear = fbm(vW.xz * 6.0 + id);
  vec3 light = vec3(0.56, 0.36, 0.20);
  vec3 dark = vec3(0.24, 0.14, 0.08);
  vec3 alb = mix(dark, light, 0.35 + 0.65 * rings) * (0.72 + 0.38 * wear);
  alb = mix(alb, vec3(0.08, 0.05, 0.03), (1.0 - seam) * 0.85);
  vec3 V = normalize(uEye - vW);
  vec3 c = lightTerm(vW, normalize(vN), V, alb, 0.55, 0.12);
  // sombra de contato sob a ampulheta (aproximação de oclusão, sem traçado)
  float dc = length(vW.xz - uMid);
  c *= 1.0 - 0.55 * exp(-dc * dc / (uHour * uHour));
  float fog = 1.0 - exp(-length(vW - uEye) * 1.1);
  c = mix(c, vec3(0.012, 0.016, 0.03), clamp(fog, 0.0, 1.0));
  o = vec4(c, 1.0);
}`;

const FS_GRAIN = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec3 vL;
out vec4 o;
uniform vec3 uSand;
${LIGHT_GLSL}
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(uEye - vW);
  vec3 c = lightTerm(vW, N, V, uSand, 0.35, 0.5);
  o = vec4(c, 1.0);
}`;

const FS_GLASS = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec3 vL;
out vec4 o;
${LIGHT_GLSL}
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(uEye - vW);
  if (dot(N, V) < 0.0) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  vec3 R = reflect(-V, N);
  // ambiente próximo: céu escuro azulado, um horizonte mais claro e a própria chama
  vec3 env = mix(vec3(0.01, 0.015, 0.04), vec3(0.06, 0.08, 0.16), smoothstep(-0.2, 0.7, R.y));
  vec3 Ld = normalize(uLight - vW);
  float flame = pow(max(dot(R, Ld), 0.0), 900.0) * 6.0 * uLightI;
  float glow = pow(max(dot(R, Ld), 0.0), 18.0) * 0.5 * uLightI;
  vec3 refl = env + uLightCol * (flame + glow * 0.4);
  float a = clamp(0.08 + fres * 0.9, 0.0, 1.0);
  vec3 tint = vec3(0.78, 0.9, 0.95) * 0.06;
  o = vec4(refl * (0.35 + fres * 1.6) + tint, a);
}`;

// Rachaduras: linhas 3D sobre a superfície, lidas de uma textura (3 ramos × 3 segmentos por rachadura).
const FS_CRACK = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec3 vL;
out vec4 o;
uniform sampler2D uPts;   // RGBA32F: pontos locais (xyz) de cada ramo, 4 por ramo
uniform int uCount;
uniform int uMax;
float segDist(vec3 p, vec3 a, vec3 b) {
  vec3 ab = b - a; float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
  return length(p - a - ab * t);
}
void main() {
  float m = 0.0;
  float w = 0.00030;
  for (int c = 0; c < 64; c++) {
    if (c >= uCount) break;
    for (int b = 0; b < 3; b++) {
      int base = (c * 3 + b) * 4;
      for (int k = 0; k < 3; k++) {
        vec3 a = texelFetch(uPts, ivec2(base + k, 0), 0).xyz;
        vec3 q = texelFetch(uPts, ivec2(base + k + 1, 0), 0).xyz;
        float d = segDist(vL, a, q);
        float wb = b == 0 ? w : w * 0.6;
        m = max(m, 1.0 - smoothstep(wb * 0.5, wb, d));
      }
    }
  }
  if (m <= 0.001) discard;
  // a rachadura é uma fresta clara com borda escura
  vec3 V = vec3(0.0, 0.0, 1.0);
  o = vec4(vec3(0.92, 0.96, 1.0) * (0.45 + 0.55 * m), m * 0.85);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
function buffer(gl, target, data, usage = gl.STATIC_DRAW) {
  const b = gl.createBuffer();
  gl.bindBuffer(target, b);
  gl.bufferData(target, data, usage);
  return b;
}
function mesh(gl, prog, pos, nrm, idx) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vb = buffer(gl, gl.ARRAY_BUFFER, pos);
  const aP = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aP);
  gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
  if (nrm) {
    const nb = buffer(gl, gl.ARRAY_BUFFER, nrm);
    const aN = gl.getAttribLocation(prog, 'aNrm');
    gl.enableVertexAttribArray(aN);
    gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 0, 0);
  }
  const ib = buffer(gl, gl.ELEMENT_ARRAY_BUFFER, idx);
  gl.bindVertexArray(null);
  return { vao, count: idx.length, type: idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, vb, ib };
}

// Matrizes (colunas, como o WebGL espera)
export const mat = {
  persp(fovy, aspect, n, f) {
    const t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f);
    return new Float32Array([t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]);
  },
  lookAt(e, c, u) {
    const f = norm(sub(c, e)), r = norm(cross(f, u)), up = cross(r, f);
    return new Float32Array([r[0], up[0], -f[0], 0, r[1], up[1], -f[1], 0, r[2], up[2], -f[2], 0,
      -dot(r, e), -dot(up, e), dot(f, e), 1]);
  },
  // Modelo: rotação em torno de um eixo X que passa pelo ponto c (= T(c) · Rx(a) · T(-c))
  pivotX(c, a) {
    const co = Math.cos(a), si = Math.sin(a), y = c[1], z = c[2];
    return new Float32Array([1, 0, 0, 0,
      0, co, si, 0,
      0, -si, co, 0,
      0, y - (co * y - si * z), z - (si * y + co * z), 1]);
  },
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };

export function createRenderer(canvas, data) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL2 indisponível');
  gl.getExtension('EXT_color_buffer_float');

  const pTable = program(gl, VS_MESH, FS_TABLE);
  const pGrain = program(gl, VS_MESH, FS_GRAIN);
  const pGlass = program(gl, VS_MESH, FS_GLASS);
  const pCrack = program(gl, VS_MESH, FS_CRACK);

  // mesa: plano grande em y=0
  const T = 3;
  const tablePos = new Float32Array([-T, 0, -T, T, 0, -T, T, 0, T, -T, 0, T]);
  const tableNrm = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
  const tableMesh = mesh(gl, pTable, tablePos, tableNrm, new Uint16Array([0, 1, 2, 0, 2, 3]));

  const glass = mesh(gl, pGlass, data.glass.pos, data.glass.nrm, data.glass.idx);
  const glassCrack = mesh(gl, pCrack, data.glass.pos, data.glass.nrm, data.glass.idx);
  const grainMesh = mesh(gl, pGrain, data.grain.pos, data.grain.nrm, data.grain.idx);

  // instância dos grãos: deslocamento vec3 por grão, atualizado por frame
  const N = data.N;
  const instData = new Float32Array(N * 3);
  const instVB = gl.createBuffer();
  gl.bindVertexArray(grainMesh.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, instVB);
  gl.bufferData(gl.ARRAY_BUFFER, instData, gl.DYNAMIC_DRAW);
  const aOff = gl.getAttribLocation(pGrain, 'aOff');
  gl.enableVertexAttribArray(aOff);
  gl.vertexAttribPointer(aOff, 3, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(aOff, 1);
  gl.bindVertexArray(null);

  // textura de rachaduras: 12 pontos por rachadura (3 ramos × 4 pontos), 64 rachaduras no máximo
  const MAXC = 64;
  const crackTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, crackTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 12 * MAXC, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array(12 * MAXC * 4));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  const INT_UNIFORMS = new Set(['uInstanced', 'uCount', 'uMax']);
  function setView(prog, uniforms) {
    gl.useProgram(prog);
    for (const k in uniforms) {
      const loc = gl.getUniformLocation(prog, k);
      if (loc === null) continue;
      const v = uniforms[k];
      if (INT_UNIFORMS.has(k)) gl.uniform1i(loc, v);
      else if (v instanceof Float32Array && v.length === 16) gl.uniformMatrix4fv(loc, false, v);
      else if (typeof v === 'number') gl.uniform1f(loc, v);
      else if (v.length === 3) gl.uniform3fv(loc, v);
      else if (v.length === 2) gl.uniform2fv(loc, v);
    }
  }

  return {
    gl,
    N,
    instData,
    setCracks(pointsFlat, count) {
      gl.bindTexture(gl.TEXTURE_2D, crackTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 12 * MAXC, 1, gl.RGBA, gl.FLOAT, pointsFlat);
      this.crackCount = count;
    },
    crackCount: 0,
    draw(f) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.012, 0.016, 0.03, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const common = { uView: f.view, uProj: f.proj, uModel: f.model, uEye: f.eye, uLight: f.light, uLightCol: f.lightCol, uLightI: f.lightI };
      // mesa (não gira)
      gl.disable(gl.CULL_FACE);
      setView(pTable, { ...common, uModel: f.identity, uMid: [0, 0], uHour: 0.06, uInstanced: 0 });
      gl.bindVertexArray(tableMesh.vao);
      gl.drawElements(gl.TRIANGLES, tableMesh.count, tableMesh.type, 0);
      // grãos instanciados (N)
      if (f.showGrains) {
        gl.bindVertexArray(grainMesh.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, instVB);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData);
        setView(pGrain, { ...common, uModel: f.grainModel || f.model, uSand: [0.92, 0.66, 0.30], uInstanced: 1 });
        gl.drawElementsInstanced(gl.TRIANGLES, grainMesh.count, grainMesh.type, 0, N);
      }
      // vidro (translúcido, sem escrever profundidade)
      if (f.showGlass) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        setView(pGlass, { ...common, uInstanced: 0 });
        gl.bindVertexArray(glass.vao);
        gl.drawElements(gl.TRIANGLES, glass.count, glass.type, 0);
        if (this.crackCount > 0) {
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          setView(pCrack, { ...common, uInstanced: 0, uCount: this.crackCount, uMax: MAXC });
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, crackTex);
          gl.uniform1i(gl.getUniformLocation(pCrack, 'uPts'), 0);
          gl.bindVertexArray(glassCrack.vao);
          gl.drawElements(gl.TRIANGLES, glassCrack.count, glassCrack.type, 0);
        }
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      gl.bindVertexArray(null);
    },
  };
}
