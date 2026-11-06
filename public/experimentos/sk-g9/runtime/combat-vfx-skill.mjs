/**
 * R6.2 S2 · Resonance Skill layer: SIMULATED healing pulse + exactly five guided butterflies.
 *
 * A layer of the S1 adapter (shares its pose read, face mask, neutralize-per-frame rule and lifecycle).
 *  - Pure function of (absolute time, pose): every position/alpha is derived from the event phase u, never
 *    from a previous frame. Trails and sparks are the same path sampled at earlier u, so they need no history.
 *  - Heal  = SIMULATED_HEALING: pre-emission (motes converge on the chest) -> expansion (ground ring +
 *    light sweep along the body) -> dissipation. No HP, no gameplay state.
 *  - Butterflies = five guided light butterflies in the body frame, towards a legible SIMULATED_TARGET
 *    (reticle). Not the 8/18 ambient R5 ones (larger, brighter, own trails, own draw). Fallback without
 *    target ('NONE') fans them outwards around the character and hides the reticle.
 *  - No Stellarealm, no field, no R2-R5 director access. Only the pure `renderWingAtlas` is reused.
 *  - Additive, toneMapped:false, depthWrite:false. 5 draw calls maximum (wings, particles, ground ring,
 *    body sweep, target reticle); S1 effects never coincide with the Skill segment.
 */
import {renderWingAtlas} from './vfx-r2.mjs';
import {BILLBOARD_VS, FACE_FS, TAIL} from './combat-vfx-shaders.mjs';

export const SKILL_BUTTERFLY_COUNT = 5;
export const SKILL_MAX_DRAW_CALLS = 5;
const NB = SKILL_BUTTERFLY_COUNT, TRAIL = 14, SPARKS = 6, MOTES = 20, NP = NB * TRAIL + NB * SPARKS + MOTES;
const SPAWN_STEP = 0.045, FLIGHT = 0.5, TRAIL_DELTA = 0.018, THETA = [-1.1, -0.55, 0, 0.55, 1.1];
const TAU = Math.PI * 2;
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const clamp01 = x => Math.max(0, Math.min(1, x));
const hash = (i, j = 0) => { let h = (Math.imul(i + 1, 374761393) + Math.imul(j + 7, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const WING_VS = `
attribute vec3 iPos; attribute vec3 iFwd; attribute vec4 iMisc; attribute float iAlpha;
uniform vec3 uHeadW; uniform float uFaceR;
varying vec2 vUv; varying float vShade; varying float vAlpha; varying vec2 vScr; varying float vOn;
void main(){
  vec3 f=normalize(iFwd); vec3 up=vec3(0.,1.,0.);
  vec3 r=cross(f,up); if(length(r)<.02) r=vec3(1.,0.,0.); r=normalize(r); vec3 u=cross(r,f);
  float cb=cos(iMisc.w), sb=sin(iMisc.w); vec3 r2=r*cb+u*sb; vec3 u2=-r*sb+u*cb;
  float fl=iMisc.y; vec3 o=iMisc.z*r2*cos(fl)+u2*sin(fl);
  vUv=uv; vAlpha=iAlpha; vShade=.7+.3*abs(dot(normalize(cross(o,f)),vec3(0.,0.,1.)));
  vec3 wp=iPos+iMisc.x*(o*uv.x+f*(uv.y-.52));
  vec4 mv=viewMatrix*vec4(wp,1.); vec4 hv=viewMatrix*vec4(uHeadW,1.);
  vScr=mv.xy-hv.xy*(mv.z/min(hv.z,-1e-3)); vOn=(hv.z<-1e-3&&uFaceR>0.)?1.:0.;
  gl_Position=projectionMatrix*mv;
}`;
const WING_FS = `
uniform sampler2D atlas; uniform vec3 uTint; uniform float uFaceR;
varying vec2 vUv; varying float vShade; varying float vAlpha; varying vec2 vScr; varying float vOn;
void main(){
  vec4 t=texture2D(atlas,vec2(vUv.x,1.-vUv.y)); float a=t.a*vAlpha; if(a<.004) discard;
  a*=(vOn<.5)?1.:smoothstep(uFaceR*.75,uFaceR*1.35,length(vScr)); if(a<.004) discard;
  float lum=dot(t.rgb,vec3(.3,.55,.15)); vec3 tinted=uTint*(lum*1.7+.08)+vec3(max(0.,lum-.62))*1.1;
  gl_FragColor=vec4(mix(t.rgb,tinted,.8)*vShade*1.12,a);${TAIL}`;
const PART_VS = `
attribute vec3 iPos; attribute float iS; attribute float iA; attribute float iK;
uniform vec3 uHeadW; uniform float uFaceR;
varying vec2 vUv; varying float vA; varying float vK; varying vec2 vScr; varying float vOn;
void main(){
  vUv=position.xy*2.; vA=iA; vK=iK;
  vec4 mv=viewMatrix*vec4(iPos,1.); mv.xy+=position.xy*iS;
  vec4 hv=viewMatrix*vec4(uHeadW,1.); vScr=mv.xy-hv.xy*(mv.z/min(hv.z,-1e-3)); vOn=(hv.z<-1e-3&&uFaceR>0.)?1.:0.;
  gl_Position=projectionMatrix*mv;
}`;
const PART_FS = `
uniform vec3 uCyan, uGold; uniform float uFaceR;
varying vec2 vUv; varying float vA; varying float vK; varying vec2 vScr; varying float vOn;
void main(){
  float r=length(vUv); if(r>1.) discard;
  float a=vA*(pow(1.-r,2.2)*.9+exp(-r*r*18.)*.6); a*=(vOn<.5)?1.:smoothstep(uFaceR*.75,uFaceR*1.35,length(vScr)); if(a<.004) discard;
  gl_FragColor=vec4(mix(mix(uCyan,uGold,vK),vec3(1.),.35*exp(-r*r*10.)),min(1.,a));${TAIL}`;
const GROUND_VS = `varying vec2 vP; void main(){ vP=position.xz*2.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const GROUND_FS = `
uniform vec3 uCyan, uGold; uniform float uA, uR;
varying vec2 vP;
void main(){
  float r=length(vP); if(r>1.) discard;
  float ring=exp(-pow((r-uR)/(.035+.05*uR),2.)), tail=smoothstep(uR,0.,r)*.22*smoothstep(0.,.25,uR), edge=1.-smoothstep(.8,1.,r);
  float a=uA*(ring*1.0+tail)*edge; if(a<.004) discard;
  gl_FragColor=vec4(mix(uCyan,uGold,.25*ring),min(1.,a));${TAIL}`;
const SWEEP_FS = `${FACE_FS}
uniform vec3 uCyan, uGold; uniform float uA, uBand;
varying vec2 vP; varying vec2 vD;
void main(){
  float yN=vP.y/2.4, ax=abs(vP.x); if(ax>1.) discard;
  float body=smoothstep(1.,.45,ax), band=exp(-pow((yN-uBand)/.16,2.)), trail=(yN<uBand)?exp(-(uBand-yN)*3.)*.35:0.;
  float streak=.65+.35*sin(vP.x*14.+yN*28.), edge=smoothstep(1.,.82,abs(yN));
  float a=uA*(band+trail)*body*streak*edge*faceMask(vP); if(a<.004) discard;
  gl_FragColor=vec4(mix(uCyan,uGold,.35*band),min(1.,a));${TAIL}`;
const RETICLE_FS = `${FACE_FS}
uniform vec3 uTint; uniform float uA, uRot;
varying vec2 vP; varying vec2 vD;
void main(){
  float r=length(vP); if(r>1.) discard;
  float ring=exp(-pow((r-.62)/.035,2.)), dot_=exp(-r*r*90.);
  float ang=atan(vP.y,vP.x)+uRot, tick=exp(-pow((r-.78)/.05,2.))*pow(max(0.,cos(ang*4.)),24.);
  float a=uA*(ring*.9+dot_*.8+tick)*faceMask(vP); if(a<.004) discard;
  gl_FragColor=vec4(mix(uTint,vec3(1.),.35*dot_),min(1.,a));${TAIL}`;

export const SKILL_COLORS = Object.freeze({cyan: [0.50, 0.95, 1.0], gold: [1.0, 0.86, 0.52], wing: [0.55, 0.95, 1.0]});

export function createSkillLayer(T, {parent, h, bundle, targetMode = 'SIMULATED_TARGET'}) {
 let mode = targetMode, disposed = false;
 const mats = [], geos = [], tex = [];
 const additive = extra => ({transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending, toneMapped: false, side: T.DoubleSide, ...extra});
 const mk = (m, geo, order, name) => { const o = new T.Mesh(geo, m); o.name = name; o.frustumCulled = false; o.renderOrder = order; o.visible = false; mats.push(m); geos.push(geo); parent.add(o); return o; };
 const v3 = () => new T.Vector3();
 const headU = () => ({uHeadW: {value: v3()}, uFaceR: {value: 0}});
 const cyan = () => ({value: new T.Vector3(...SKILL_COLORS.cyan)}), gold = () => ({value: new T.Vector3(...SKILL_COLORS.gold)});

 // ---- instanced wings (exactly NB butterflies x 2 sides) ----
 const wingPlane = new T.PlaneGeometry(1, 1, 1, 1); const wp = wingPlane.attributes.position; for (let i = 0; i < wp.count; i++) wp.setX(i, wp.getX(i) + 0.5);
 const wg = new T.InstancedBufferGeometry(); wg.index = wingPlane.index; wg.setAttribute('position', wp); wg.setAttribute('uv', wingPlane.attributes.uv); wg.instanceCount = NB * 2; wingPlane.dispose();
 const wPos = new Float32Array(NB * 6), wFwd = new Float32Array(NB * 6), wMisc = new Float32Array(NB * 8), wAlpha = new Float32Array(NB * 2);
 for (const [n, a, k] of [['iPos', wPos, 3], ['iFwd', wFwd, 3], ['iMisc', wMisc, 4], ['iAlpha', wAlpha, 1]]) { const at = new T.InstancedBufferAttribute(a, k); at.setUsage(T.DynamicDrawUsage); wg.setAttribute(n, at); }
 const atlas = new T.DataTexture(renderWingAtlas(128, 7, {crystalline: true, delicate: true}), 128, 128, T.RGBAFormat);
 atlas.colorSpace = T.SRGBColorSpace; atlas.generateMipmaps = true; atlas.minFilter = T.LinearMipmapLinearFilter; atlas.magFilter = T.LinearFilter; atlas.needsUpdate = true; tex.push(atlas);
 const wings = mk(new T.ShaderMaterial({...additive(), uniforms: {atlas: {value: atlas}, uTint: {value: new T.Vector3(...SKILL_COLORS.wing)}, ...headU()}, vertexShader: WING_VS, fragmentShader: WING_FS}), wg, 12, 'skillButterflyWings');

 // ---- instanced particles: trails, arrival sparks, heal motes ----
 const pg = new T.InstancedBufferGeometry(); const pq = new T.PlaneGeometry(1, 1); pg.index = pq.index; pg.setAttribute('position', pq.attributes.position); pg.setAttribute('uv', pq.attributes.uv); pg.instanceCount = NP; pq.dispose();
 const pPos = new Float32Array(NP * 3), pS = new Float32Array(NP), pA = new Float32Array(NP), pK = new Float32Array(NP);
 for (const [n, a, k] of [['iPos', pPos, 3], ['iS', pS, 1], ['iA', pA, 1], ['iK', pK, 1]]) { const at = new T.InstancedBufferAttribute(a, k); at.setUsage(T.DynamicDrawUsage); pg.setAttribute(n, at); }
 const particles = mk(new T.ShaderMaterial({...additive(), uniforms: {uCyan: cyan(), uGold: gold(), ...headU()}, vertexShader: PART_VS, fragmentShader: PART_FS}), pg, 11, 'skillParticles');

 // ---- ground ring, body sweep, target reticle ----
 const gp = new T.PlaneGeometry(1, 1); gp.rotateX(-Math.PI / 2);
 const ground = mk(new T.ShaderMaterial({...additive({polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}), uniforms: {uCyan: cyan(), uGold: gold(), uA: {value: 0}, uR: {value: 0}}, vertexShader: GROUND_VS, fragmentShader: GROUND_FS}), gp, 8, 'skillHealGroundRing');
 const billUniforms = () => ({uCenter: {value: v3()}, uDirW: {value: new T.Vector3(0, 0, 1)}, uSize: {value: 1}, uPush: {value: 0}, uA: {value: 0}, ...headU()});
 const sweep = mk(new T.ShaderMaterial({...additive(), uniforms: {...billUniforms(), uCyan: cyan(), uGold: gold(), uBand: {value: 0}}, vertexShader: BILLBOARD_VS, fragmentShader: SWEEP_FS}), new T.PlaneGeometry(1, 2.4), 9, 'skillHealBodySweep');
 const reticle = mk(new T.ShaderMaterial({...additive(), uniforms: {...billUniforms(), uTint: {value: new T.Vector3(0.55, 0.95, 1)}, uRot: {value: 0}}, vertexShader: BILLBOARD_VS, fragmentShader: RETICLE_FS}), new T.PlaneGeometry(1, 1), 10, 'skillSimulatedTarget');
 const meshes = {wings, particles, ground, sweep, reticle};
 const U = o => o.material.uniforms;

 // ---- neutral state ----
 const neutral = new Map(Object.values(meshes).map(o => [o, Object.fromEntries(Object.entries(U(o)).filter(([k]) => k !== 'atlas').map(([k, u]) => [k, u.value?.clone ? u.value.clone() : u.value]))]));
 const neutralize = () => {
  for (const a of [wPos, wFwd, wMisc, wAlpha, pPos, pS, pA, pK]) a.fill(0);
  for (let i = 0; i < NB * 2; i++) wFwd[i * 3 + 2] = 1;
  for (const [o, init] of neutral) for (const [k, u] of Object.entries(U(o))) if (k !== 'atlas') { if (u.value?.copy) u.value.copy(init[k]); else u.value = init[k]; }
  for (const o of Object.values(meshes)) { o.visible = false; o.position.set(0, 0, 0); o.scale.set(1, 1, 1); }
 };
 const dirty = () => { for (const g of [wg, pg]) for (const a of Object.values(g.attributes)) if (a.isInstancedBufferAttribute) a.needsUpdate = true; };

 // ---- scratch ----
 const S = Array.from({length: NB}, v3), C1 = Array.from({length: NB}, v3), C2 = Array.from({length: NB}, v3), TG = Array.from({length: NB}, v3);
 const p0 = v3(), p1 = v3(), tmp = v3(), O = v3(), chestC = v3(), target = v3();
 const bez = (i, s, out) => { const a = 1 - s, w0 = a * a * a, w1 = 3 * a * a * s, w2 = 3 * a * s * s, w3 = s * s * s; return out.set(0, 0, 0).addScaledVector(S[i], w0).addScaledVector(C1[i], w1).addScaledVector(C2[i], w2).addScaledVector(TG[i], w3); };
 const ease = s => s * s * (3 - 2 * s);
 let last = null;

 function frame(c) { // body frame: pelvis origin, forward f, right r (character right = R thigh - L thigh)
  const {P, fwd, right} = c;
  O.copy(P.pel); chestC.copy(P.chest);
  target.copy(O).addScaledVector(fwd, 1.7 * h); target.y = P.chest.y - 0.05 * h;
  for (let i = 0; i < NB; i++) {
   const th = THETA[i], sn = Math.sin(th);
   S[i].copy(P.chest).addScaledVector(fwd, 0.10 * h).addScaledVector(right, th * 0.06 * h); S[i].y += 0.02 * h;
   if (mode === 'SIMULATED_TARGET') TG[i].copy(target).addScaledVector(right, th * 0.045 * h);
   else { const phi = th * 0.9; TG[i].copy(O).addScaledVector(fwd, Math.cos(phi) * 1.0 * h).addScaledVector(right, Math.sin(phi) * 1.0 * h); TG[i].y = P.chest.y + 0.12 * h; }
   C1[i].copy(S[i]).addScaledVector(fwd, 0.35 * h).addScaledVector(right, sn * 0.55 * h); C1[i].y += 0.05 * h + 0.02 * h * (i % 2);
   C2[i].copy(TG[i]).addScaledVector(fwd, -0.55 * h).addScaledVector(right, sn * 0.30 * h); C2[i].y += 0.03 * h;
  }
 }

 function update(c) {
  neutralize(); last = null;
  const {t, cue, rm, bundle: b} = c, heal = b.index.get('SKILL.heal'), bf = b.index.get('SKILL.butterflies');
  const healOn = heal && cue.healingPulse > 0.002 && t >= heal.start && t < heal.end;
  const bfOn = bf && cue.guidedButterflies > 0.002 && t >= bf.start && t < bf.end;
  if (!healOn && !bfOn) return null;
  frame(c);
  const probe = {heal: null, butterflies: [], target: null, motes: 0, sparks: 0, trails: 0};
  for (const o of Object.values(meshes)) { const u = U(o); if (u.uHeadW) { u.uHeadW.value.copy(c.headW); u.uFaceR.value = 0.14 * h; } }
  let pi = 0;
  // ---------------- healing (SIMULATED_HEALING) ----------------
  if (healOn) {
   const uh = (t - heal.start) / (heal.end - heal.start), lv = cue.healingPulse, exp = smooth((uh - 0.2) / 0.5);
   const gU = U(ground), floor = c.floorY;
   ground.position.set(O.x, floor + 0.004, O.z); ground.scale.set(1.9 * h, 1, 1.9 * h);
   gU.uR.value = rm ? 0.55 : 0.12 + 0.83 * exp; gU.uA.value = lv * smooth((uh - 0.18) / 0.12) * 0.9; ground.visible = gU.uA.value > 0.002;
   const sU = U(sweep), mid = tmp.copy(O).lerp(chestC, 0.5);
   sU.uCenter.value.copy(mid); sU.uSize.value = 0.46 * h; sU.uPush.value = 0.05 * h;
   sU.uBand.value = rm ? 0 : -0.95 + 1.9 * exp; sU.uA.value = lv * 0.55 * smooth((uh - 0.2) / 0.1); sweep.visible = sU.uA.value > 0.002;
   const gather = rm ? 0 : clamp01(uh / 0.3);
   for (let k = 0; k < MOTES; k++, pi++) {
    const a = hash(k, 1) * TAU, r0 = (0.55 + 0.25 * hash(k, 2)) * h, y0 = (hash(k, 3) - 0.5) * 0.30 * h, ph = rm ? 0.5 : uh;
    let rad, y, al;
    if (ph < 0.3) { rad = r0 + (0.04 * h - r0) * ease(ph / 0.3); y = y0 * (1 - ease(ph / 0.3)); al = lv * ease(ph / 0.3) * (rm ? 0 : 1); }
    else { const q = (ph - 0.3) / 0.7; rad = 0.04 * h + 0.5 * h * ease(q) * (0.6 + 0.4 * hash(k, 4)); y = (0.02 + 0.2 * q * (0.6 + 0.6 * hash(k, 5))) * h; al = lv * (1 - smooth(q)); }
    if (rm) { rad = 0.30 * h * (0.6 + 0.4 * hash(k, 4)); y = 0.2 * h * hash(k, 5); al = lv * 0.8; }
    const i = NB * TRAIL + NB * SPARKS + k;
    pPos[i * 3] = O.x + Math.cos(a) * rad; pPos[i * 3 + 1] = chestC.y + y; pPos[i * 3 + 2] = O.z + Math.sin(a) * rad;
    pS[i] = 0.022 * h * (0.7 + 0.6 * hash(k, 6)); pA[i] = al * 0.9; pK[i] = 0.35 + 0.4 * hash(k, 7);
   }
   probe.motes = MOTES; probe.heal = {phase: uh, expansion: exp, level: lv, ringRadius: gU.uR.value, band: sU.uBand.value, stage: uh < 0.25 ? 'PRE_EMISSION' : uh < 0.65 ? 'EXPANSION' : 'DISSIPATION', gather, label: 'SIMULATED_HEALING'};
  }
  // ---------------- five guided butterflies (SIMULATED_TARGET) ----------------
  if (bfOn) {
   const ub = (t - bf.start) / (bf.end - bf.start), gain = clamp01(cue.guidedButterflies * 4);
   for (let i = 0; i < NB; i++) {
    const sRaw = rm ? 0.6 + i * 0.001 : (ub - i * SPAWN_STEP) / FLIGHT, s = clamp01(sRaw), ta = rm ? 0 : ub - (i * SPAWN_STEP + FLIGHT);
    const fly = sRaw >= 0 && !(ta > 0.08), alpha = gain * smooth(sRaw / 0.06) * (1 - smooth(ta / 0.08));
    probe.butterflies.push({i, visible: fly && alpha > 0.002, s, alpha, pos: null});
    if (!fly || alpha <= 0.002) continue;
    bez(i, ease(s), p0); const s2 = ease(clamp01(s + 0.02)), s1 = ease(clamp01(s - 0.02)); bez(i, s2, p1); bez(i, s1, tmp); p1.sub(tmp);
    if (p1.lengthSq() < 1e-10) p1.copy(c.fwd);
    p1.normalize();
    const scale = 0.17 * h * (0.7 + 0.3 * smooth(sRaw / 0.15)) * (1 - 0.5 * smooth(ta / 0.08));
    const phase = TAU * (2.6 + 0.12 * i) * t + i * 1.3, w = Math.sin(phase) + 0.28 * Math.sin(2 * phase - 0.7);
    const flap = rm ? 0.6 : 0.08 + (0.5 - 0.5 * w) * 1.2, bank = rm ? 0 : 0.3 * Math.sin(i + t * 1.1);
    for (let side = 0; side < 2; side++) {
     const j = i * 2 + side;
     wPos[j * 3] = p0.x; wPos[j * 3 + 1] = p0.y; wPos[j * 3 + 2] = p0.z; wFwd[j * 3] = p1.x; wFwd[j * 3 + 1] = p1.y; wFwd[j * 3 + 2] = p1.z;
     wMisc[j * 4] = scale; wMisc[j * 4 + 1] = flap; wMisc[j * 4 + 2] = side === 0 ? 1 : -1; wMisc[j * 4 + 3] = bank; wAlpha[j] = alpha;
    }
    probe.butterflies[i].pos = [p0.x, p0.y, p0.z]; probe.butterflies[i].tangent = [p1.x, p1.y, p1.z];
    if (!rm) for (let k = 0; k < TRAIL; k++) { // trail = the same path at earlier phase: no history
     const sk = sRaw - k * TRAIL_DELTA; if (sk <= 0) continue;
     bez(i, ease(clamp01(sk)), tmp); const idx = i * TRAIL + k, fade = Math.pow(1 - k / TRAIL, 1.5) * (1 - smooth(ta / 0.12));
     pPos[idx * 3] = tmp.x; pPos[idx * 3 + 1] = tmp.y; pPos[idx * 3 + 2] = tmp.z; pS[idx] = 0.03 * h * (1 - 0.6 * k / TRAIL); pA[idx] = gain * fade * 0.8; pK[idx] = 0.7; probe.trails++;
    }
   }
   if (!rm) for (let i = 0; i < NB; i++) { // arrival sparks
    const ta = ub - (i * SPAWN_STEP + FLIGHT); if (ta < 0 || ta > 0.2) continue;
    const tp = ta / 0.2;
    for (let k = 0; k < SPARKS; k++) {
     const a = hash(i * 7 + k, 11) * TAU, e = (hash(i * 7 + k, 12) - 0.5) * Math.PI, rr = (0.01 + 0.10 * ease(tp)) * h, idx = NB * TRAIL + i * SPARKS + k;
     pPos[idx * 3] = TG[i].x + Math.cos(a) * Math.cos(e) * rr; pPos[idx * 3 + 1] = TG[i].y + Math.sin(e) * rr; pPos[idx * 3 + 2] = TG[i].z + Math.sin(a) * Math.cos(e) * rr;
     pS[idx] = 0.032 * h * (1 - 0.5 * tp); pA[idx] = gain * (1 - tp); pK[idx] = 1; probe.sparks++;
    }
   }
   if (mode === 'SIMULATED_TARGET') {
    const rU = U(reticle); rU.uCenter.value.copy(target); rU.uSize.value = 0.32 * h; rU.uPush.value = 0; rU.uA.value = gain * 0.7; rU.uRot.value = rm ? 0 : t * 0.4; reticle.visible = rU.uA.value > 0.002;
    probe.target = {label: 'SIMULATED_TARGET', pos: [target.x, target.y, target.z]};
   }
   probe.ub = ub; probe.targetMode = mode;
  }
  wings.visible = wAlpha.some(a => a > 0.002); particles.visible = pA.some(a => a > 0.002);
  dirty();
  last = probe; return probe;
 }

 return {
  update, hide() { neutralize(); last = null; },
  setTargetMode(m) { if (!['SIMULATED_TARGET', 'NONE'].includes(m)) throw new TypeError('target mode'); mode = m; },
  get targetMode() { return mode; },
  get meshes() { return meshes; },
  get probe() { return last; },
  uniformsProbe() { const o = {}; for (const [k, m] of Object.entries(meshes)) { o[k] = {visible: m.visible, pos: m.position.toArray(), scale: m.scale.toArray()}; for (const [n, u] of Object.entries(U(m))) if (n !== 'atlas') o[k][n] = u.value?.toArray ? u.value.toArray() : u.value; } o.arrays = {wPos: Array.from(wPos), wAlpha: Array.from(wAlpha), wMisc: Array.from(wMisc), pPos: Array.from(pPos), pA: Array.from(pA), pS: Array.from(pS)}; return o; },
  dispose() { if (disposed) return; disposed = true; neutralize(); for (const o of Object.values(meshes)) o.removeFromParent(); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); for (const x of tex) x.dispose(); },
  get disposed() { return disposed; }
 };
}
