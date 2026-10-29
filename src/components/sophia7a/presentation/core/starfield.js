import * as THREE from 'three';

/**
 * Céu estrelado EXTERNO ao modelo (pontos aditivos numa casca grande).
 * Totalmente descartável: removê-lo não altera nada no modelo.
 * Determinístico (semente fixa) para que capturas sejam comparáveis.
 */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStarfield({ count = 650, seed = 11 } = {}) {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const cool = new THREE.Color('#bcd0ff');
  const warm = new THREE.Color('#ffe3b0');
  const tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    // direção uniforme na esfera; casca 7–10 unidades
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = 7 + rnd() * 3;
    const s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
    tmp.copy(cool).lerp(warm, rnd() < 0.22 ? 0.8 : rnd() * 0.25);
    const b = 0.35 + Math.pow(rnd(), 3) * 0.65;
    col.set([tmp.r * b, tmp.g * b, tmp.b * b], i * 3);
    size[i] = 1.1 + Math.pow(rnd(), 4) * 3.4;
    phase[i] = rnd() * 6.283;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uOpacity: { value: 1 }, uStatic: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime, uPx, uStatic;
      varying vec3 vCol; varying float vTw;
      void main() {
        vCol = aColor;
        vTw = mix(0.72 + 0.28 * sin(uTime * (0.6 + aPhase * 0.18) + aPhase * 9.0), 0.9, uStatic);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPx;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying vec3 vCol; varying float vTw;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p) * 2.0;
        float a = smoothstep(1.0, 0.0, d);
        a = a * a;
        gl_FragColor = vec4(vCol * vTw, a * uOpacity);
      }`,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'sophia-starfield';
  points.renderOrder = -10;
  points.frustumCulled = false;

  return {
    object: points,
    update(t, pixelRatio, staticMode) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uPx.value = pixelRatio;
      mat.uniforms.uStatic.value = staticMode ? 1 : 0;
    },
    setOpacity(o) { mat.uniforms.uOpacity.value = o; },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
