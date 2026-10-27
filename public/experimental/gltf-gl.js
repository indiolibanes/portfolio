// gltf-gl.js — renderizador WebGL2 para o sophia.glb (pele por GPU, PBR simplificado, sem dependências).
//
// Por que existe: o CSP do site só aceita scripts do próprio domínio e o Three.js não pôde ser baixado
// aqui; o minigl.js (WebGL1) não lê glTF. Este arquivo faz só o que o modelo precisa:
// malhas com pele (93 juntas, matrizes numa textura RGBA32F), cor base e emissiva com textura, cor por vértice,
// metal/rugosidade (GGX), brilho de pelo (sheen), verniz (clearcoat) e emissão forte, além de uma luz fria de lua,
// uma luz quente de lanterna, um ponto de luz, ambiente hemisférico e um "céu" analítico para os reflexos.

import { parseGLB, readAccessor, Skeleton, composeInto, mulInto } from './gltf-skel.js';
export { quat } from './gltf-skel.js';

// '#rrggbb' (sRGB) → linear
export function hex(h, k = 1) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => (c / 255) ** 2.2 * k);
}

export async function fetchGLB(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('GLB ' + res.status);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body || !res.body.getReader) return res.arrayBuffer();
  const reader = res.body.getReader();
  const parts = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    if (onProgress && total) onProgress(got / total);
  }
  const out = new Uint8Array(got);
  let o = 0;
  parts.forEach((p) => { out.set(p, o); o += p.length; });
  return out.buffer;
}

const VS = `#version 300 es
precision highp float;
precision highp int;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;
layout(location = 2) in vec2 aUV;
layout(location = 3) in vec4 aCol;
layout(location = 4) in uvec4 aJoints;
layout(location = 5) in vec4 aWeights;
// morph targets (até 4): deltas de posição em 6–9 e de normal em 10–13. Alvos sem bufferView (todos zero no glTF)
// ficam desligados e leem o valor genérico (0,0,0).
layout(location = 6) in vec3 aMP0;
layout(location = 7) in vec3 aMP1;
layout(location = 8) in vec3 aMP2;
layout(location = 9) in vec3 aMP3;
layout(location = 10) in vec3 aMN0;
layout(location = 11) in vec3 aMN1;
layout(location = 12) in vec3 aMN2;
layout(location = 13) in vec3 aMN3;
uniform vec4 uMorph;
uniform mat4 uVP;
uniform mat4 uModel;
uniform mat3 uNM;
uniform int uSkinned;
uniform highp sampler2D uJoints;
out vec3 vN;
out vec3 vW;
out vec2 vUV;
out vec4 vC;
mat4 joint(uint j) {
  int r = int(j);
  return mat4(texelFetch(uJoints, ivec2(0, r), 0), texelFetch(uJoints, ivec2(1, r), 0),
              texelFetch(uJoints, ivec2(2, r), 0), texelFetch(uJoints, ivec2(3, r), 0));
}
void main() {
  vec4 p = vec4(aPos + uMorph.x * aMP0 + uMorph.y * aMP1 + uMorph.z * aMP2 + uMorph.w * aMP3, 1.0);
  vec3 n = aNor + uMorph.x * aMN0 + uMorph.y * aMN1 + uMorph.z * aMN2 + uMorph.w * aMN3;
  if (uSkinned == 1) {
    mat4 s = joint(aJoints.x) * aWeights.x + joint(aJoints.y) * aWeights.y
           + joint(aJoints.z) * aWeights.z + joint(aJoints.w) * aWeights.w;
    p = s * p;
    n = mat3(s) * n;
  }
  vec4 w = uModel * p;
  vW = w.xyz;
  vN = uNM * n;
  vUV = aUV;
  vC = aCol;
  gl_Position = uVP * w;
}`;

const FS = `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vW;
in vec2 vUV;
in vec4 vC;
uniform vec4 uBase;
uniform sampler2D uBaseTex;
uniform int uHasBase;
uniform vec3 uEmis;
uniform sampler2D uEmisTex;
uniform int uHasEmis;
uniform float uEmisK;
uniform float uMetal;
uniform float uRough;
uniform vec3 uSheen;
uniform float uCoat;
uniform float uCoatR;
uniform vec3 uCam;
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec3 uD0; uniform vec3 uC0;
uniform vec3 uD1; uniform vec3 uC1;
uniform vec3 uPP; uniform vec3 uPC;
uniform vec3 uRim;
uniform float uRimK;
uniform float uExposure;
out vec4 outColor;

const float PI = 3.14159265;
vec3 gN; vec3 gV; float gNoV;
vec3 gDiff; vec3 gF0; float gA; float gCA;

float dGGX(float NoH, float a) {
  float a2 = a * a;
  float d = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d);
}
float vSmith(float NoV, float NoL, float a) {
  float a2 = a * a;
  float gv = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
  float gl = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
  return 0.5 / max(gv + gl, 1e-4);
}
vec3 fresnel(vec3 f0, float c) { return f0 + (1.0 - f0) * pow(1.0 - c, 5.0); }

// céu analítico: gradiente frio + um disco de lua e uma mancha quente (lanternas)
vec3 envSpec(vec3 R, float rough) {
  vec3 c = mix(uGround, uSky, smoothstep(-0.2, 0.9, R.y));
  float m = max(dot(R, uD0), 0.0);
  c += uC0 * pow(m, mix(220.0, 7.0, rough)) * mix(7.0, 0.7, rough);
  float w = max(dot(R, uD1), 0.0);
  c += uC1 * pow(w, mix(140.0, 5.0, rough)) * mix(5.0, 0.6, rough);
  return c;
}

vec3 shade(vec3 L, vec3 rad) {
  float NoL = max(dot(gN, L), 0.0);
  float wrap = clamp((dot(gN, L) + 0.35) / 1.35, 0.0, 1.0);
  vec3 H = normalize(L + gV);
  float NoH = max(dot(gN, H), 0.0);
  float VoH = max(dot(gV, H), 0.0);
  vec3 spec = fresnel(gF0, VoH) * dGGX(NoH, gA) * vSmith(gNoV, NoL, gA) * NoL;
  vec3 res = (gDiff * wrap + spec) * rad;
  if (uCoat > 0.0) {
    float cs = dGGX(NoH, gCA) * vSmith(gNoV, NoL, gCA) * NoL * (0.04 + 0.96 * pow(1.0 - VoH, 5.0));
    res += vec3(cs) * rad * uCoat;
  }
  return res;
}

void main() {
  gN = normalize(vN);
  if (!gl_FrontFacing) gN = -gN;
  gV = normalize(uCam - vW);
  gNoV = max(dot(gN, gV), 1e-3);

  vec4 base = uBase * vec4(vC.rgb, 1.0);
  if (uHasBase == 1) base *= texture(uBaseTex, vUV);
  float rough = clamp(uRough, 0.05, 1.0);
  gA = rough * rough;
  gCA = max(uCoatR * uCoatR, 0.002);
  gF0 = mix(vec3(0.04), base.rgb, uMetal);
  gDiff = base.rgb * (1.0 - uMetal);

  vec3 col = gDiff * mix(uGround, uSky, gN.y * 0.5 + 0.5);
  col += shade(uD0, uC0);
  col += shade(uD1, uC1);
  vec3 Lp = uPP - vW;
  float d2 = dot(Lp, Lp);
  col += shade(normalize(Lp), uPC / (1.0 + d2 * 0.18));

  // reflexo do ambiente (metais, verniz dos olhos)
  vec3 R = reflect(-gV, gN);
  vec3 fe = gF0 + (max(vec3(1.0 - rough), gF0) - gF0) * pow(1.0 - gNoV, 5.0);
  col += envSpec(R, rough) * fe * (uMetal > 0.5 ? 1.0 : 0.35);
  if (uCoat > 0.0) col += envSpec(R, uCoatR) * (0.04 + 0.96 * pow(1.0 - gNoV, 5.0)) * uCoat;

  float rim = pow(1.0 - gNoV, 3.0);
  col += uSheen * rim * 0.6 * (uSky * 0.9 + uC0 * 0.5 + uC1 * 0.35);
  col += uRim * rim * uRimK;

  vec3 em = uEmis * uEmisK;
  if (uHasEmis == 1) em *= texture(uEmisTex, vUV).rgb;
  col += em;

  col *= uExposure;
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14); // ACES
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  outColor = vec4(col, 1.0);
}`;

const SHADOW_VS = `#version 300 es
in vec2 aP;
uniform mat4 uVP;
uniform vec3 uAt;
uniform vec2 uR;
out vec2 vP;
void main() {
  vP = aP;
  gl_Position = uVP * vec4(uAt.x + aP.x * uR.x, uAt.y + 0.003, uAt.z + aP.y * uR.y, 1.0);
}`;
const SHADOW_FS = `#version 300 es
precision mediump float;
in vec2 vP;
uniform float uA;
out vec4 o;
void main() {
  float d = length(vP);
  float a = (1.0 - smoothstep(0.15, 1.0, d)) * uA;
  o = vec4(0.0, 0.01, 0.04, 1.0) * a;
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader');
  return sh;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
  return p;
}
const uniforms = (gl, p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));

function normalMatrix(out, m) {
  const a00 = m[0], a01 = m[4], a02 = m[8];
  const a10 = m[1], a11 = m[5], a12 = m[9];
  const a20 = m[2], a21 = m[6], a22 = m[10];
  const c00 = a11 * a22 - a12 * a21, c01 = a12 * a20 - a10 * a22, c02 = a10 * a21 - a11 * a20;
  const c10 = a02 * a21 - a01 * a22, c11 = a00 * a22 - a02 * a20, c12 = a01 * a20 - a00 * a21;
  const c20 = a01 * a12 - a02 * a11, c21 = a02 * a10 - a00 * a12, c22 = a00 * a11 - a01 * a10;
  const det = a00 * c00 + a01 * c01 + a02 * c02;
  const id = det ? 1 / det : 0;
  out[0] = c00 * id; out[1] = c10 * id; out[2] = c20 * id;
  out[3] = c01 * id; out[4] = c11 * id; out[5] = c21 * id;
  out[6] = c02 * id; out[7] = c12 * id; out[8] = c22 * id;
  return out;
}

// Mantém a fração `keep` dos tufos (componentes conexos da malha), escolhidos por um hash fixo.
function thinTufts(idx, nv, keep) {
  const par = new Int32Array(nv);
  for (let i = 0; i < nv; i += 1) par[i] = i;
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let i = 0; i < idx.length; i += 3) {
    const a = find(idx[i]);
    for (let k = 1; k < 3; k += 1) { const c = find(idx[i + k]); if (c !== a) par[c] = a; }
  }
  const out = [];
  for (let i = 0; i < idx.length; i += 3) {
    let h = (find(idx[i]) + 1) * 2654435761;
    h = (h ^ (h >>> 15)) >>> 0;
    if ((h % 1000) / 1000 < keep) out.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  return new Uint32Array(out);
}

const TUFT = 25;
const MAX_MORPHS = 4;
const ZERO4 = new Float32Array(4);
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 indisponível');
    this.gl = gl;
    this.canvas = canvas;
    this.prog = program(gl, VS, FS);
    this.U = uniforms(gl, this.prog, ['uMorph', 'uVP', 'uModel', 'uNM', 'uSkinned', 'uJoints', 'uBase', 'uBaseTex', 'uHasBase', 'uEmis', 'uEmisTex',
      'uHasEmis', 'uEmisK', 'uMetal', 'uRough', 'uSheen', 'uCoat', 'uCoatR', 'uCam', 'uSky', 'uGround', 'uD0', 'uC0', 'uD1', 'uC1',
      'uPP', 'uPC', 'uRim', 'uRimK', 'uExposure']);
    this.shadowProg = program(gl, SHADOW_VS, SHADOW_FS);
    this.SU = uniforms(gl, this.shadowProg, ['uVP', 'uAt', 'uR', 'uA']);
    this.shadowVAO = gl.createVertexArray();
    gl.bindVertexArray(this.shadowVAO);
    const q = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, q);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.shadowProg, 'aP');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.white = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.white);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    this.P = new Float32Array(16);
    this.V = new Float32Array(16);
    this.VP = new Float32Array(16);
    this.M = new Float32Array(16);
    this.C = new Float32Array(16);
    this.NM = new Float32Array(9);
    this.MW = new Float32Array(4);
    this.MWm = new Float32Array(4);
    // valor genérico (0) dos atributos de morph desligados: estado do contexto, definido uma vez
    for (let k = 6; k < 14; k += 1) gl.vertexAttrib3f(k, 0, 0, 0);
    this.lost = false;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
  }

  setSize(cssW, cssH, dpr) {
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  // ---------------------------------------------------------------- carga do modelo

  // opts.thin: { nomeDoMaterial: fração de tufos a manter } — os tufos ("locks") do pelo são geometria opaca e,
  // todos juntos, escondem fitas, brincos e as estrelas da cauda; manter só parte deles deixa o pelo fofo e os detalhes à vista.
  async loadModel(buffer, opts = {}) {
    const gl = this.gl;
    const { json, bin } = parseGLB(buffer);
    const skeleton = new Skeleton(json, bin);

    // texturas (PNG embutidos); cor base e emissiva são sRGB
    const srgb = new Set();
    (json.materials || []).forEach((m) => {
      const b = m.pbrMetallicRoughness?.baseColorTexture?.index;
      const e = m.emissiveTexture?.index;
      if (b !== undefined) srgb.add(b);
      if (e !== undefined) srgb.add(e);
    });
    const textures = await Promise.all((json.textures || []).map(async (t, ti) => {
      const im = json.images[t.source];
      const bv = json.bufferViews[im.bufferView];
      const blob = new Blob([bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)], { type: im.mimeType || 'image/png' });
      const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, srgb.has(ti) ? gl.SRGB8_ALPHA8 : gl.RGBA8, bmp.width, bmp.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
      bmp.close?.();
      return tex;
    }));

    // buffers por bufferView
    const bufCache = new Map();
    const bufferFor = (viewIndex, target) => {
      const key = viewIndex + ':' + target;
      if (bufCache.has(key)) return bufCache.get(key);
      const bv = json.bufferViews[viewIndex];
      const b = gl.createBuffer();
      gl.bindBuffer(target, b);
      gl.bufferData(target, bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength), gl.STATIC_DRAW);
      bufCache.set(key, b);
      return b;
    };

    const materialOf = (mi) => {
      const m = json.materials[mi];
      const pbr = m.pbrMetallicRoughness || {};
      const ext = m.extensions || {};
      return {
        name: m.name,
        base: pbr.baseColorFactor || [1, 1, 1, 1],
        baseTex: pbr.baseColorTexture ? textures[pbr.baseColorTexture.index] : null,
        metal: pbr.metallicFactor ?? 1,
        rough: pbr.roughnessFactor ?? 1,
        emis: m.emissiveFactor || [0, 0, 0],
        emisTex: m.emissiveTexture ? textures[m.emissiveTexture.index] : null,
        emisK: ext.KHR_materials_emissive_strength?.emissiveStrength ?? 1,
        sheen: ext.KHR_materials_sheen?.sheenColorFactor || [0, 0, 0],
        coat: ext.KHR_materials_clearcoat?.clearcoatFactor ?? 0,
        coatR: ext.KHR_materials_clearcoat?.clearcoatRoughnessFactor ?? 0,
        double: !!m.doubleSided,
      };
    };

    const draws = [];
    json.nodes.forEach((node, ni) => {
      if (node.mesh === undefined) return;
      json.meshes[node.mesh].primitives.forEach((prim) => {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const attr = (name, loc, integer = false) => {
          const ai = prim.attributes[name];
          if (ai === undefined) return false;
          const a = json.accessors[ai];
          if (a.bufferView === undefined) return false; // accessor sem bufferView = todo zero (glTF 2.0 §3.6.2.3)
          const bv = json.bufferViews[a.bufferView];
          gl.bindBuffer(gl.ARRAY_BUFFER, bufferFor(a.bufferView, gl.ARRAY_BUFFER));
          gl.enableVertexAttribArray(loc);
          const n = COMPONENTS[a.type];
          if (integer) gl.vertexAttribIPointer(loc, n, a.componentType, bv.byteStride || 0, a.byteOffset || 0);
          else gl.vertexAttribPointer(loc, n, a.componentType, !!a.normalized, bv.byteStride || 0, a.byteOffset || 0);
          return true;
        };
        attr('POSITION', 0);
        attr('NORMAL', 1);
        const hasUV = attr('TEXCOORD_0', 2);
        const hasCol = attr('COLOR_0', 3);
        const skinned = node.skin !== undefined && attr('JOINTS_0', 4, true) && attr('WEIGHTS_0', 5);
        // morph targets: liga só os alvos com dados; máscara de quais pesos importam para esta primitiva
        let morphMask = 0;
        (prim.targets || []).slice(0, MAX_MORPHS).forEach((t, k) => {
          const on = (name, loc) => {
            const ai = t[name];
            if (ai === undefined || json.accessors[ai].bufferView === undefined) return false;
            const a = json.accessors[ai];
            const bv = json.bufferViews[a.bufferView];
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferFor(a.bufferView, gl.ARRAY_BUFFER));
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 3, a.componentType, !!a.normalized, bv.byteStride || 0, a.byteOffset || 0);
            return true;
          };
          const hp = on('POSITION', 6 + k);
          const hn = on('NORMAL', 10 + k);
          if (hp || hn) morphMask |= 1 << k;
        });
        const ia = json.accessors[prim.indices];
        const mat = materialOf(prim.material);
        let count = ia.count;
        let itype = ia.componentType;
        let ioff = ia.byteOffset || 0;
        const shrink = opts.shrink?.[mat.name];
        const nv = json.accessors[prim.attributes.POSITION].count;
        if (shrink && shrink < 1 && nv % TUFT === 0) {
          // cada tufo = 6 anéis de 4 vértices + ponta (25): encolhe em torno do anel da raiz, que fica colado à pele
          const P = readAccessor(json, bin, prim.attributes.POSITION);
          for (let t = 0; t < nv; t += TUFT) {
            let rx = 0, ry = 0, rz = 0;
            for (let k = 0; k < 4; k += 1) { rx += P[(t + k) * 3] / 4; ry += P[(t + k) * 3 + 1] / 4; rz += P[(t + k) * 3 + 2] / 4; }
            for (let k = 0; k < TUFT; k += 1) {
              const o = (t + k) * 3;
              P[o] = rx + (P[o] - rx) * shrink; P[o + 1] = ry + (P[o + 1] - ry) * shrink; P[o + 2] = rz + (P[o + 2] - rz) * shrink;
            }
          }
          const pb = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, pb);
          gl.bufferData(gl.ARRAY_BUFFER, P, gl.STATIC_DRAW);
          gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        }
        const keep = opts.thin?.[mat.name];
        if (keep !== undefined && keep < 1) {
          const kept = thinTufts(readAccessor(json, bin, prim.indices), json.accessors[prim.attributes.POSITION].count, keep);
          const eb = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eb);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, kept, gl.STATIC_DRAW);
          count = kept.length;
          itype = gl.UNSIGNED_INT;
          ioff = 0;
        } else {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferFor(ia.bufferView, gl.ELEMENT_ARRAY_BUFFER));
        }
        gl.bindVertexArray(null);
        draws.push({ node: ni, vao, skinned: !!skinned, hasUV, hasCol, count, itype, ioff, mat, morphMask });
      });
    });

    this.jointTex = this.jointTex || gl.createTexture();
    if (skeleton.joints) {
      gl.bindTexture(gl.TEXTURE_2D, this.jointTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, skeleton.joints.length, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    return { skeleton, draws };
  }

  // ---------------------------------------------------------------- quadro

  // model: de loadModel · pose: { x, y, z, yaw, scale } · cam: { fov, x, y, dist, tx, ty } · env: ver sophia-scene.js
  render(model, pose, cam, env, shadow) {
    if (this.lost) return;
    const gl = this.gl;
    const U = this.U;
    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // projeção com deslocamento de tela (tx/ty em NDC), olhando para -Z
    const f = 1 / Math.tan(cam.fov / 2);
    const aspect = w / h;
    const P = this.P;
    P.fill(0);
    P[0] = f / aspect; P[5] = f; P[10] = (60 + 0.05) / (0.05 - 60); P[11] = -1; P[14] = (2 * 60 * 0.05) / (0.05 - 60);
    for (let c = 0; c < 4; c += 1) {
      P[c * 4] += cam.tx * P[c * 4 + 3];
      P[c * 4 + 1] += cam.ty * P[c * 4 + 3];
    }
    const V = this.V;
    V.fill(0);
    V[0] = V[5] = V[10] = V[15] = 1;
    V[12] = -cam.x; V[13] = -cam.y; V[14] = -cam.dist;
    mulInto(this.VP, 0, P, 0, V, 0);

    // matriz do personagem: translação · rotação Y · escala uniforme
    const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw), s = pose.scale ?? 1;
    const C = this.C;
    C.fill(0);
    C[0] = cy * s; C[2] = -sy * s; C[5] = s; C[8] = sy * s; C[10] = cy * s; C[12] = pose.x; C[13] = pose.y; C[14] = pose.z; C[15] = 1;

    if (shadow) {
      gl.useProgram(this.shadowProg);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
      gl.uniformMatrix4fv(this.SU.uVP, false, this.VP);
      gl.uniform3f(this.SU.uAt, pose.x, pose.y, pose.z);
      gl.uniform2f(this.SU.uR, shadow.rx, shadow.rz);
      gl.uniform1f(this.SU.uA, shadow.alpha);
      gl.bindVertexArray(this.shadowVAO);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
    }

    gl.useProgram(this.prog);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.uniformMatrix4fv(U.uVP, false, this.VP);
    gl.uniform3f(U.uCam, cam.x, cam.y, cam.dist);
    gl.uniform3fv(U.uSky, env.sky);
    gl.uniform3fv(U.uGround, env.ground);
    gl.uniform3fv(U.uD0, env.d0); gl.uniform3fv(U.uC0, env.c0);
    gl.uniform3fv(U.uD1, env.d1); gl.uniform3fv(U.uC1, env.c1);
    gl.uniform3fv(U.uPP, env.pp); gl.uniform3fv(U.uPC, env.pc);
    gl.uniform3fv(U.uRim, env.rim);
    gl.uniform1f(U.uRimK, env.rimK ?? 0.3);
    gl.uniform1f(U.uExposure, env.exposure ?? 1);
    gl.uniform1i(U.uBaseTex, 0);
    gl.uniform1i(U.uEmisTex, 1);
    gl.uniform1i(U.uJoints, 2);

    const sk = model.skeleton;
    if (sk.joints) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.jointTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, sk.joints.length, gl.RGBA, gl.FLOAT, sk.jointMatrices);
    }

    // pesos de morph: model.morphOverride (ex.: composeExpressions de sophia-expressions.js) ou os do esqueleto
    // (canais glTF "weights" dos clipes, já misturados por Skeleton.evaluate)
    const mw = model.morphOverride || sk.morphWeights || ZERO4;
    const mv = this.MW;
    const masked = this.MWm;
    for (let k = 0; k < MAX_MORPHS; k += 1) mv[k] = k < mw.length ? mw[k] : 0;
    let lastDouble = null;
    let lastMask = -1;
    for (const d of model.draws) {
      if (d.hidden) continue;
      const m = d.mat;
      // matriz do modelo: personagem · mundo do nó
      mulInto(this.M, 0, C, 0, sk.world, d.node * 16);
      gl.uniformMatrix4fv(U.uModel, false, this.M);
      gl.uniformMatrix3fv(U.uNM, false, normalMatrix(this.NM, this.M));
      gl.uniform1i(U.uSkinned, d.skinned ? 1 : 0);
      if (m.double !== lastDouble) {
        if (m.double) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
        lastDouble = m.double;
      }
      gl.uniform4fv(U.uBase, m.base);
      gl.uniform3fv(U.uEmis, m.emis);
      gl.uniform1f(U.uEmisK, m.emisK);
      gl.uniform1f(U.uMetal, m.metal);
      gl.uniform1f(U.uRough, m.rough);
      gl.uniform3fv(U.uSheen, m.sheen);
      gl.uniform1f(U.uCoat, m.coat);
      gl.uniform1f(U.uCoatR, m.coatR);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, m.baseTex || this.white);
      gl.uniform1i(U.uHasBase, m.baseTex ? 1 : 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, m.emisTex || this.white);
      gl.uniform1i(U.uHasEmis, m.emisTex ? 1 : 0);
      gl.bindVertexArray(d.vao);
      if (d.morphMask !== lastMask) {
        for (let k = 0; k < 4; k += 1) masked[k] = d.morphMask & (1 << k) ? mv[k] : 0;
        gl.uniform4fv(U.uMorph, d.morphMask ? masked : ZERO4);
        lastMask = d.morphMask;
      }
      if (!d.skinned) { gl.vertexAttribI4ui(4, 0, 0, 0, 0); gl.vertexAttrib4f(5, 1, 0, 0, 0); }
      if (!d.hasUV) gl.vertexAttrib2f(2, 0, 0);
      if (!d.hasCol) gl.vertexAttrib4f(3, 1, 1, 1, 1);
      gl.drawElements(gl.TRIANGLES, d.count, d.itype, d.ioff);
    }
    gl.bindVertexArray(null);
  }
}

export { Skeleton, composeInto };
