/**
 * R6.2 G11.1 · quick small butterflies of the attack energy spectrum (blue + violet + butterflies), AUTHORIAL.
 *
 * "Borboletinhas rapidas": tiny energy butterflies born from the hands during the combo envelopes and the Heavy
 * (preparation + release). They appear, flap fast, drift away and fade in ~0.4 s. They are NOT a swarm and NOT the ultimate
 * trigger butterfly: at most SPARK_MAX are alive and only while an attack is happening.
 *
 * Determinism: the spawn table is a pure function of the score events (ids/starts/ends). The state of a butterfly at
 * absolute time t is a pure function of (spawn time, seed, age) and of the hand-history table (same table as the trails),
 * so seek / pause / restart / reverse scrub reproduce the same frame. No clock, no RAF, no per-frame accumulation.
 * One draw call (InstancedBufferGeometry), additive, depthWrite off. Reduced motion draws none.
 */
import {BUTTERFLY_GLSL} from './combat-vfx-shaders.mjs';
import {TRAIL_INDEX, trailPosition} from './combat-vfx-trails.mjs';

export const SPARK_MAX = 28;
export const SPARK_LIFE_S = 0.5;
const HEAVY_PREP = 4, HEAVY_REL = 9;
const basicCount = dur => Math.max(4, Math.min(10, Math.round(dur * 10)));
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const strHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

/** Pure: spawn table from the score events. `handOf(clipId)` -> 'R' | 'L' (measured dominant hand). */
export function buildSparkTable(events, handOf = () => 'R') {
 const out = [];
 const push = (ts, hand, seed, scale, kind) => out.push({ts, hand, seed, scale, kind});
 for (const e of events ?? []) {
  if (!Number.isFinite(e.start) || !Number.isFinite(e.end) || e.end <= e.start) continue;
  const dom = handOf(e.clipId) ?? 'R', other = dom === 'R' ? 'L' : 'R', dur = e.end - e.start, base = strHash(e.id);
  if (e.channel === 'blueAttack') {
   const n = basicCount(dur);
   for (let i = 0; i < n; i++) push(e.start + dur * (0.10 + 0.78 * (i + hash(base * 91 + i) * 0.5) / n), i % 3 === 2 ? other : dom, base * 1000 + i, 0.8 + 0.4 * hash(base * 7 + i), 'basic');
  } else if (e.channel === 'blueCore' && String(e.id).startsWith('HEAVY')) {
   for (let i = 0; i < HEAVY_PREP; i++) push(e.start + dur * (0.35 + 0.55 * (i + 0.3) / HEAVY_PREP), dom, base * 1000 + i, 0.65, 'heavyPrep');
  } else if (e.channel === 'heavyPulse') {
   for (let i = 0; i < HEAVY_REL; i++) push(e.start + 0.01 + i * Math.min(0.045, dur * 0.12), i % 4 === 3 ? other : dom, base * 1000 + 50 + i, 0.9 + 0.5 * hash(base * 3 + i), 'heavyRel');
  }
 }
 out.sort((a, b) => a.ts - b.ts);
 return Object.freeze(out.map(Object.freeze));
}

const SCR_VS_HEAD = 'uniform vec3 uHeadW; uniform float uFaceR; varying vec2 vScr; varying float vOn;';
const SCR_VS_BODY = 'vec4 hv=viewMatrix*vec4(uHeadW,1.); vScr=mv.xy-hv.xy*(mv.z/min(hv.z,-1e-3)); vOn=(hv.z<-1e-3&&uFaceR>0.)?1.:0.;';
const SPK_VS = `attribute vec3 iPos; attribute vec4 iA; attribute vec2 iB; ${SCR_VS_HEAD}
varying vec2 vUv; varying vec4 vA; varying vec2 vB;
void main(){ vUv=position.xy*2.; vA=iA; vB=iB; vec4 mv=viewMatrix*vec4(iPos,1.); float c=cos(iB.y), s=sin(iB.y); vec2 q=vec2(c*position.x-s*position.y, s*position.x+c*position.y); mv.xy+=q*iA.y; ${SCR_VS_BODY} gl_Position=projectionMatrix*mv; }`;
const SPK_FS = `uniform vec3 uBlue, uViolet; uniform float uFaceR; varying vec2 vScr; varying float vOn; varying vec2 vUv; varying vec4 vA; varying vec2 vB;
${BUTTERFLY_GLSL}
void main(){
 float scr = vOn<.5 ? 1. : smoothstep(uFaceR*.75,uFaceR*1.35,length(vScr));
 vec2 pb=vUv*1.05; float flap=max(.16,abs(cos(vA.z*6.2831*7.+vB.x*6.2831))); vec2 p=vec2(pb.x/flap,pb.y); vec2 q=vec2(abs(p.x),p.y);
 float wing=bfWing(q), ins=1.-smoothstep(-.02,.02,wing);
 float sqm=1.-smoothstep(.5,.98,max(abs(vUv.x),abs(vUv.y)));
 float edge=exp(-pow(wing/.03,2.)), halo=(wing>0.?exp(-pow(wing/.26,2.)):0.)*sqm;
 vec3 base=mix(uBlue,uViolet,vA.w);
 vec3 col=base*(ins*.45+edge*1.1+halo*.55)+vec3(.9,.96,1.)*(bfBody(pb)*.8+edge*.28+ins*.12)+vec3(1.,.78,.35)*exp(-pow(length(q-vec2(.18,.08))/.17,2.))*ins*.75;
 col*=vA.x*scr; if(max(col.r,max(col.g,col.b))<.004) discard;
 gl_FragColor=vec4(min(col,vec3(1.)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export function createSparkLayer(T, {parent, h}) {
 const g = new T.InstancedBufferGeometry(), q = new T.PlaneGeometry(1, 1);
 g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
 const pos = new Float32Array(SPARK_MAX * 3), aA = new Float32Array(SPARK_MAX * 4), aB = new Float32Array(SPARK_MAX * 2);
 const mk = (arr, n, name) => { const at = new T.InstancedBufferAttribute(arr, n); at.setUsage(T.DynamicDrawUsage); g.setAttribute(name, at); return at; };
 const atP = mk(pos, 3, 'iPos'), atA = mk(aA, 4, 'iA'), atB = mk(aB, 2, 'iB');
 g.instanceCount = 0;
 const mat = new T.ShaderMaterial({uniforms: {uBlue: {value: new T.Vector3(0.12, 0.40, 1.0)}, uViolet: {value: new T.Vector3(0.40, 0.05, 1.0)}, uHeadW: {value: new T.Vector3()}, uFaceR: {value: 0}},
  vertexShader: SPK_VS, fragmentShader: SPK_FS, transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending, toneMapped: false, side: T.DoubleSide});
 const mesh = new T.Mesh(g, mat); mesh.name = 'attackQuickButterflies'; mesh.frustumCulled = false; mesh.renderOrder = 12; mesh.visible = false; parent.add(mesh);
 const p0 = [0, 0, 0]; let disposed = false, last = null;
 const hide = () => { mesh.visible = false; g.instanceCount = 0; last = null; };
 return {
  mesh,
  /** @returns {alive, positions[]} or null. Pure function of (table, hist, t). */
  update({table, hist, t, rm, headW}) {
   if (disposed || !table || !hist || rm || !(t > 0)) { hide(); return null; }
   let n = 0; const list = [];
   for (let i = 0; i < table.length && n < SPARK_MAX; i++) {
    const s = table[i]; if (s.ts > t) break;
    const age = t - s.ts; if (age >= SPARK_LIFE_S) continue;
    const u = age / SPARK_LIFE_S, k = TRAIL_INDEX[s.hand === 'R' ? 'rhand' : 'lhand'];
    // G11.2: the butterfly is CARRIED by the light trail: it is born on the hand NOW and slides back along the hand's own path
    // (same history table as the ribbons), so it moves with the character and the energy flow instead of drifting off alone.
    const lag = Math.min(age, 0.45) * 0.9;
    trailPosition(hist, k, Math.max(0, t - lag), p0);
    const th = hash(s.seed * 1.7) * 6.2831, up = 0.3 + 0.7 * hash(s.seed * 2.3), spread = smooth(u * 1.6);
    const wob = 0.02 * h * Math.sin(age * 17 + s.seed) * (0.4 + u), o3 = n * 3;
    pos[o3] = p0[0] + Math.cos(th) * 0.075 * h * spread + wob;
    pos[o3 + 1] = p0[1] + up * 0.07 * h * spread + 0.02 * h * u;
    pos[o3 + 2] = p0[2] + Math.sin(th) * 0.075 * h * spread - wob * 0.6;
    const grow = smooth(u / 0.16), fade = 1 - smooth((u - 0.55) / 0.45);
    aA[n * 4] = 1.15 * grow * fade;                                   // alpha
    aA[n * 4 + 1] = 0.05 * h * s.scale * (0.55 + 0.45 * grow) * (1 - 0.25 * u); // size
    aA[n * 4 + 2] = age;                                              // flap clock (s)
    aA[n * 4 + 3] = 0.35 + 0.65 * hash(s.seed * 5.9);                  // violet mix 0.25..0.85
    aB[n * 2] = hash(s.seed * 4.4); aB[n * 2 + 1] = (hash(s.seed * 6.6) - 0.5) * 1.6 + 0.4 * Math.sin(age * 9 + s.seed);
    list.push(n); n++;
   }
   if (!n) { hide(); return null; }
   atP.needsUpdate = atA.needsUpdate = atB.needsUpdate = true; g.instanceCount = n;
   mat.uniforms.uHeadW.value.copy(headW); mat.uniforms.uFaceR.value = 0.14 * h;
   mesh.visible = true; last = {alive: n};
   return last;
  },
  hide,
  get probe() { return last; },
  get geometry() { return g; },
  dispose() { if (disposed) return; disposed = true; mesh.removeFromParent(); g.dispose(); q.dispose(); mat.dispose(); }
 };
}
