import * as THREE from 'three';
import { damp, clamp } from './math.js';

/**
 * Interação com a constelação da cauda — 100 % REVERSÍVEL e EXTERNA ao GLB:
 *
 *  1) Gancho de shader (`onBeforeCompile`) que SOMA emissão dourada apenas onde a
 *     máscara externa (constellation-mask.png) marca a constelação. Não toca em
 *     geometria, UVs, texturas ou parâmetros do material. Com `glow = 0` a saída é
 *     idêntica à do material original (verificado por comparação de pixels).
 *     `dispose()` restaura `onBeforeCompile`/`customProgramCacheKey` originais.
 *  2) Halos (sprites aditivos) nas estrelas, filhos do modelo, descartáveis.
 *
 * Interações: brilho-base cintilante; realce por hover (ponteiro sobre a cauda);
 * pulso em onda que percorre a constelação a partir do ponto tocado/clicado.
 */

const KEY = 'sophia-7a-constellation-v1';
const PULSE_SPEED = 0.42; // unidades/s (modelo = 1 de altura)
const PULSE_LIFE = 3.4; // s

function makeGlintTexture() {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  rg.addColorStop(0, 'rgba(255,244,214,1)');
  rg.addColorStop(0.12, 'rgba(255,214,128,0.75)');
  rg.addColorStop(0.4, 'rgba(255,190,90,0.18)');
  rg.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, s, s);
  // 4 pontas finas (cintilação de estrela)
  g.globalCompositeOperation = 'lighter';
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const lg = g.createLinearGradient(s / 2 - dx * s / 2, s / 2 - dy * s / 2, s / 2 + dx * s / 2, s / 2 + dy * s / 2);
    lg.addColorStop(0, 'rgba(255,230,170,0)');
    lg.addColorStop(0.5, 'rgba(255,240,200,0.95)');
    lg.addColorStop(1, 'rgba(255,230,170,0)');
    g.fillStyle = lg;
    if (dx) g.fillRect(0, s / 2 - 1.2, s, 2.4);
    else g.fillRect(s / 2 - 1.2, 0, 2.4, s);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createConstellationFx({ material, maskTexture, anchors, root, maxHalos = 6 }) {
  const uniforms = {
    uSpMask: { value: maskTexture },
    uSpTime: { value: 0 },
    uSpGlow: { value: 0 },
    uSpStatic: { value: 0 },
    uSpHover: { value: 0 },
    uSpHoverPos: { value: new THREE.Vector3(9, 9, 9) },
    uSpPulseT: { value: -1 },
    uSpPulseAmp: { value: 1 },
    uSpPulseOrigin: { value: new THREE.Vector3() },
  };

  const original = { onBeforeCompile: material.onBeforeCompile, customProgramCacheKey: material.customProgramCacheKey };

  const hook = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSpObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSpObj = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vSpObj;
        uniform sampler2D uSpMask;
        uniform float uSpTime, uSpGlow, uSpStatic, uSpHover, uSpPulseT, uSpPulseAmp;
        uniform vec3 uSpHoverPos, uSpPulseOrigin;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (uSpGlow > 0.001) {
          vec3 spm = texture2D(uSpMask, vMapUv).rgb;
          if (spm.r > 0.004) {
            float tw = uSpStatic > 0.5 ? 0.92 : 0.64 + 0.36 * sin(uSpTime * (1.3 + spm.g * 1.5) + spm.g * 41.0);
            float body = mix(0.5, 1.0, spm.b);
            float dh = distance(vSpObj, uSpHoverPos);
            float hover = uSpHover * (0.5 + 1.7 * exp(-(dh * dh) / 0.035));
            float pulse = 0.0;
            if (uSpPulseT >= 0.0) {
              float dp = distance(vSpObj, uSpPulseOrigin);
              float rr = uSpPulseT * ${PULSE_SPEED.toFixed(3)};
              float ring = exp(-pow((dp - rr) / 0.075, 2.0));
              float trail = exp(-max(0.0, rr - dp) * 5.0) * step(dp, rr) * 0.35;
              pulse = uSpPulseAmp * (ring + trail) * exp(-uSpPulseT * 0.9) * 2.4;
            }
            vec3 tint = mix(diffuseColor.rgb, vec3(1.0, 0.78, 0.34), 0.5);
            totalEmissiveRadiance += tint * (spm.r * body * (0.46 * tw + hover + pulse) * uSpGlow);
          }
        }`,
      );
  };

  let hooked = false;
  /**
   * Força uma recompilação "do zero" ao alternar o gancho. Só `needsUpdate` não basta:
   * o three só chama `onBeforeCompile` quando o programa NÃO está no cache do material;
   * ao reaproveitar um programa em cache, o material manteria o objeto de uniforms do
   * programa anterior e os uniforms `uSp*` ficariam sem ligação. `material.dispose()`
   * apenas descarta os programas do material (texturas não são tocadas).
   */
  function refreshPrograms() {
    material.dispose();
    material.needsUpdate = true;
  }
  function installHook() {
    if (hooked) return;
    material.onBeforeCompile = hook;
    material.customProgramCacheKey = () => KEY;
    refreshPrograms();
    hooked = true;
  }
  function removeHook() {
    if (!hooked) return;
    material.onBeforeCompile = original.onBeforeCompile;
    material.customProgramCacheKey = original.customProgramCacheKey;
    refreshPrograms();
    hooked = false;
  }
  installHook();

  // --- halos ----------------------------------------------------------------
  const halos = new THREE.Group();
  halos.name = 'sophia-constellation-halos';
  const glint = makeGlintTexture();
  const stars = (anchors?.tail?.stars ?? []).slice(0, maxHalos);
  const maxArea = Math.max(1, ...stars.map((s) => s.areaPx));
  const haloItems = stars.map((s) => {
    const mat = new THREE.SpriteMaterial({
      map: glint, color: 0xffffff, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false,
    });
    const sp = new THREE.Sprite(mat);
    const n = new THREE.Vector3(...s.normal);
    sp.position.set(...s.position).addScaledVector(n, 0.006); // 6 mm acima da superfície
    const size = 0.03 + 0.07 * Math.sqrt(s.areaPx / maxArea);
    sp.scale.setScalar(size);
    sp.renderOrder = 5;
    halos.add(sp);
    return { sp, mat, size, phase: s.phase * 6.283, pos: sp.position };
  });
  root.add(halos);

  // --- estado -----------------------------------------------------------------
  const state = {
    enabled: true,
    intensity: 1,
    reduced: false,
    halosVisible: true,
    glow: 0, // valor suavizado → uniform
    hoverTarget: 0,
    hover: 0,
    time: 0,
    pulseT: -1,
  };

  function pulse(localPoint, amp = 1) {
    if (!state.enabled) return;
    uniforms.uSpPulseOrigin.value.copy(localPoint);
    uniforms.uSpPulseAmp.value = amp;
    state.pulseT = 0;
  }

  function setHover(localPointOrNull) {
    if (localPointOrNull) {
      uniforms.uSpHoverPos.value.copy(localPointOrNull);
      state.hoverTarget = 1;
    } else {
      state.hoverTarget = 0;
    }
  }

  const tmpV = new THREE.Vector3();
  function update(dt) {
    state.time += dt;
    const glowTarget = state.enabled ? state.intensity : 0;
    state.glow = state.reduced ? glowTarget : damp(state.glow, glowTarget, 4.5, dt);
    if (Math.abs(state.glow - glowTarget) < 0.002) state.glow = glowTarget;
    state.hover = state.reduced ? state.hoverTarget : damp(state.hover, state.hoverTarget, 7, dt);
    if (Math.abs(state.hover - state.hoverTarget) < 0.002) state.hover = state.hoverTarget;
    if (state.pulseT >= 0) {
      state.pulseT += dt;
      if (state.pulseT > PULSE_LIFE) state.pulseT = -1;
    }
    uniforms.uSpTime.value = state.time;
    uniforms.uSpGlow.value = state.glow;
    uniforms.uSpStatic.value = state.reduced ? 1 : 0;
    uniforms.uSpHover.value = state.hover;
    uniforms.uSpPulseT.value = state.pulseT;

    // halos seguem a mesma lógica (JS) com custo desprezível (≤ 6 sprites)
    const show = state.halosVisible && state.glow > 0.002;
    halos.visible = show;
    if (!show) return;
    for (const h of haloItems) {
      const tw = state.reduced ? 0.92 : 0.64 + 0.36 * Math.sin(state.time * (1.3 + (h.phase / 6.283) * 1.5) + (h.phase / 6.283) * 41);
      let flare = 0;
      if (state.pulseT >= 0) {
        const d = tmpV.copy(h.pos).distanceTo(uniforms.uSpPulseOrigin.value);
        const rr = state.pulseT * PULSE_SPEED;
        flare = Math.exp(-Math.pow((d - rr) / 0.09, 2)) * Math.exp(-state.pulseT * 0.9) * uniforms.uSpPulseAmp.value;
      }
      const hoverBoost = state.hover * 0.35;
      h.mat.opacity = clamp(state.glow * (0.22 * tw + hoverBoost + flare * 0.9), 0, 1);
      h.sp.scale.setScalar(h.size * (1 + 0.12 * tw + flare * 0.55));
    }
  }

  return {
    uniforms,
    halos,
    state,
    update,
    pulse,
    setHover,
    setEnabled(v) { state.enabled = !!v; },
    setIntensity(v) { state.intensity = clamp(v, 0, 1.5); },
    setReduced(v) { state.reduced = !!v; },
    setHalosVisible(v) { state.halosVisible = !!v; },
    /** Alterna o gancho (usado só em testes para provar equivalência com o material original). */
    setHookActive(v) { v ? installHook() : removeHook(); },
    get hookActive() { return hooked; },
    /** Há algo animando que exige renderizar quadros? */
    get active() {
      if (!state.enabled && state.glow === 0) return false;
      const transitioning = Math.abs(state.glow - (state.enabled ? state.intensity : 0)) > 0.002 || Math.abs(state.hover - state.hoverTarget) > 0.002;
      return transitioning || state.pulseT >= 0 || (state.enabled && !state.reduced);
    },
    dispose() {
      removeHook();
      root.remove(halos);
      haloItems.forEach((h) => h.mat.dispose());
      glint.dispose();
    },
  };
}
