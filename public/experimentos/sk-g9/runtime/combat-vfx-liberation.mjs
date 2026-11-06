/**
 * R6.2 S3 · Liberation layer: Outer Stellarealm (AUTHORIAL art, mechanics UNVERIFIED).
 *
 * pre-emission/condensation (ethereal core + converging motes, camera close) -> Outer field reveal
 * (ground field with a visible boundary + canopy arcs) -> peak (violet arcs, gold ornaments, one gold
 * shock ring) -> dissipation (field fades in the reveal tail, motes rise on the recovery source).
 *
 * Contract (same as the S1/S2 layers):
 *  - pure function of (absolute time, read-only pose, explicit options); no clock/RAF/random/mixer;
 *  - neutralized on every frame, own subtree, additive, toneMapped:false, depthWrite:false;
 *  - 4 draw calls (field, canopy, ethereal core, motes); the star canopy is the EXISTING R4 star draw,
 *    gated by `starGate` through the director (no new draw);
 *  - no coreCrystal/coreCage polyhedron, no Inner/Supernal stage triggered by time
 *    (colour variants are explicit AUTHORIAL flags only), no gameplay radius in metres.
 */
import {BILLBOARD_VS, FACE_FS, TAIL} from './combat-vfx-shaders.mjs';
import {S3_COLOR_VARIANTS} from './combat-vfx-events.mjs';

export const LIBERATION_MAX_DRAW_CALLS = 4;
/** Radius / contrast A/B presets, relative to the model height (no world-unit or gameplay claim). */
export const LIBERATION_RADIUS_PRESETS = Object.freeze({compact: 1.8, standard: 2.6, wide: 3.4});
export const LIBERATION_CONTRAST_PRESETS = Object.freeze({soft: 0.8, standard: 1.0, strong: 1.25});
export const LIBERATION_COLORS = Object.freeze({blue: [0.18, 0.50, 1.0], violet: [0.42, 0.16, 1.0], gold: [1.0, 0.52, 0.10]});
const NM = 48, TAU = Math.PI * 2;
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const clamp01 = x => Math.max(0, Math.min(1, x));
const hash = (i, j = 0) => { let h = (Math.imul(i + 3, 374761393) + Math.imul(j + 11, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** Same envelope as the S0 score (smoothstep up to the peak, down to the end), per event. */
export const eventEnvelope = (e, t) => !e || t < e.start || t >= e.end ? 0 : smooth(t <= e.peak ? (t - e.start) / (e.peak - e.start) : (e.end - t) / (e.end - e.peak));
const phase = (e, t) => !e ? 0 : clamp01((t - e.start) / (e.end - e.start));

const SCR_VS_HEAD = `uniform vec3 uHeadW; uniform float uFaceR; varying vec2 vScr; varying float vOn;`;
const SCR_VS_BODY = `vec4 hv=viewMatrix*vec4(uHeadW,1.); vScr=mv.xy-hv.xy*(mv.z/min(hv.z,-1e-3)); vOn=(hv.z<-1e-3&&uFaceR>0.)?1.:0.;`;
const SCR_FS = `uniform float uFaceR; varying vec2 vScr; varying float vOn; float scrMask(){ return vOn<.5?1.:smoothstep(uFaceR*.75,uFaceR*1.35,length(vScr)); }`;

const FIELD_VS = `varying vec2 vP; void main(){ vP=position.xz*2.3; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const FIELD_FS = `
uniform vec3 uBlue, uViolet, uGold; uniform float uA, uReveal, uPeak, uShock, uViol, uGoldW, uTime, uContrast;
varying vec2 vP;
float ring(float r,float c,float w){ return exp(-pow((r-c)/w,2.)); }
void main(){
  float r=length(vP); if(r>1.15) discard;
  float a=atan(vP.y,vP.x), inside=1.-smoothstep(uReveal-.02,uReveal+.02,r);
  float edge=ring(r,.97,.016)*1.15+ring(r,.925,.006)*.55;
  float halo=r>.97?exp(-(r-.97)*16.)*.45:0.;
  float rings=0.; for(int i=1;i<6;i++){ float c=float(i)*.16; rings+=ring(r,c,.006)*(.28+.07*float(i)); }
  float spokes=pow(abs(cos(a*6.+uTime*.05)),70.)*smoothstep(.12,.3,r)*(1.-smoothstep(.84,.95,r))*.32;
  float glyph=step(.855,r)*step(r,.895)*pow(abs(cos(a*24.+uTime*.03)),10.);
  float centre=exp(-r*r*16.)*.30, wash=(1.-r)*.10;
  vec3 ringCol=mix(uBlue,uViolet,clamp(uViol,0.,1.));
  vec3 col=(uBlue*(edge*.9+centre+wash+halo)+ringCol*(rings+spokes*1.1))*inside;
  float gw=uGoldW*uPeak; col=col*(1.-.75*glyph*gw)+uGold*gw*(glyph*1.25+edge*.35)*inside;
  col+=mix(uBlue,vec3(1.),.45)*ring(r,uReveal,.022)*step(uReveal,1.0);
  float sh=uPeak>0.?ring(r,uShock,.028)*uPeak*(1.-smoothstep(.9,1.08,uShock)):0.;
  col+=uGold*(.35+uGoldW*.75)*sh*inside;
  col*=uA*uContrast; if(max(col.r,max(col.g,col.b))<.004) discard;
  gl_FragColor=vec4(col,1.);${TAIL}`;
const DOME_VS = `${SCR_VS_HEAD} varying vec3 vN;
void main(){ vN=normalize(position); vec4 mv=modelViewMatrix*vec4(position,1.); ${SCR_VS_BODY} gl_Position=projectionMatrix*mv; }`;
const DOME_FS = `${SCR_FS}
uniform vec3 uBlue, uViolet, uGold; uniform float uA, uRise, uViol, uGoldW, uPeak, uTime, uContrast;
varying vec3 vN;
void main(){
  float e=clamp(vN.y,0.,1.); if(e>uRise+.02) discard;
  float az=atan(vN.z,vN.x)+uTime*.012;
  float mer=pow(abs(cos(az*3.)),160.)*(1.-smoothstep(.55,.95,e))*.6;
  float lat=exp(-pow((e-.42)/.012,2.))*.7;
  float horizon=exp(-pow(e/.05,2.))*.7, front=exp(-pow((e-uRise)/.03,2.))*.18*step(uRise,.99);
  float fade=1.-e*.55;
  vec3 col=mix(uBlue,uViolet,clamp(.45+.75*uViol,0.,1.))*(mer+lat+horizon)*fade;
  col+=uGold*uGoldW*uPeak*lat*.55;
  col+=mix(uBlue,vec3(1.),.5)*front;
  col*=uA*uContrast*scrMask(); if(max(col.r,max(col.g,col.b))<.004) discard;
  gl_FragColor=vec4(col,1.);${TAIL}`;
const CORE_FS = `${FACE_FS}
uniform vec3 uBlue, uViolet, uGold; uniform float uA, uTime, uGrow, uViol;
varying vec2 vP; varying vec2 vD;
void main(){
  float r=length(vP); if(r>1.) discard;
  float a=atan(vP.y,vP.x);
  float halo=pow(max(0.,1.-r),2.6)*.38, inner=exp(-r*r*40./max(.3,uGrow))*.55;
  float wisp=0.; for(int i=0;i<3;i++){ float k=float(i); wisp+=pow(max(0.,sin(a*2.+r*9.-uTime*(.9+.3*k)+k*2.1)),6.)*exp(-pow((r-.25-.18*k)/.12,2.)); }
  vec3 col=uBlue*(halo+wisp*.6)+mix(uBlue,vec3(.95,.98,1.),.7)*inner+uViolet*uViol*wisp*.5;
  col*=uA*faceMask(vP); if(max(col.r,max(col.g,col.b))<.004) discard;
  gl_FragColor=vec4(col,1.);${TAIL}`;
const MOTE_VS = `attribute vec3 iPos; attribute float iS; attribute float iA; attribute float iK; ${SCR_VS_HEAD}
varying vec2 vUv; varying float vA; varying float vK;
void main(){ vUv=position.xy*2.; vA=iA; vK=iK; vec4 mv=viewMatrix*vec4(iPos,1.); mv.xy+=position.xy*iS; ${SCR_VS_BODY} gl_Position=projectionMatrix*mv; }`;
const MOTE_FS = `${SCR_FS}
uniform vec3 uBlue, uGold; varying vec2 vUv; varying float vA; varying float vK;
void main(){ float r=length(vUv); if(r>1.) discard; float a=vA*(pow(1.-r,2.2)*.9+exp(-r*r*16.)*.6)*scrMask(); if(a<.004) discard;
  gl_FragColor=vec4(mix(mix(uBlue,uGold,vK),vec3(1.),.35*exp(-r*r*10.))*a,1.);${TAIL}`;

/**
 * @param opts.parent   adapter subtree
 * @param opts.h        model height (world units)
 * @param opts.bundle   createS3Score(...) result
 * @param opts.radius   field radius in model heights (A/B presets above)
 * @param opts.contrast field/canopy gain (A/B presets above)
 * @param opts.variant  'OUTER' | 'INNER_AUTHORIAL' | 'SUPERNAL_AUTHORIAL' (explicit flag only)
 */
export function createLiberationLayer(T, {parent, h, bundle, radius = LIBERATION_RADIUS_PRESETS.standard, contrast = LIBERATION_CONTRAST_PRESETS.standard, variant = 'OUTER'}) {
 if (!S3_COLOR_VARIANTS[variant]) throw new TypeError('Liberation: unknown colour variant ' + variant);
 if (!(radius > 0.5 && radius < 8) || !(contrast > 0.1 && contrast < 3)) throw new TypeError('Liberation: radius/contrast out of range');
 let disposed = false, last = null, cfg = {radius, contrast, variant};
 const mats = [], geos = [];
 const v3 = (...a) => new T.Vector3(...a), col = k => ({value: v3(...LIBERATION_COLORS[k])});
 const additive = extra => ({transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending, toneMapped: false, ...extra});
 const mk = (geo, mat, order, name) => { const o = new T.Mesh(geo, mat); o.name = name; o.frustumCulled = false; o.renderOrder = order; o.visible = false; mats.push(mat); geos.push(geo); parent.add(o); return o; };
 const headU = () => ({uHeadW: {value: v3()}, uFaceR: {value: 0}});

 const fg = new T.PlaneGeometry(1, 1); fg.rotateX(-Math.PI / 2);
 const field = mk(fg, new T.ShaderMaterial({...additive({side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3}),
  uniforms: {uBlue: col('blue'), uViolet: col('violet'), uGold: col('gold'), uA: {value: 0}, uReveal: {value: 0}, uPeak: {value: 0}, uShock: {value: 0}, uViol: {value: 0}, uGoldW: {value: 0}, uTime: {value: 0}, uContrast: {value: 1}},
  vertexShader: FIELD_VS, fragmentShader: FIELD_FS}), 6, 'liberationOuterField');
 const dg = new T.SphereGeometry(1, 48, 16, 0, TAU, 0, Math.PI / 2);
 const canopy = mk(dg, new T.ShaderMaterial({...additive({side: T.DoubleSide}),
  uniforms: {uBlue: col('blue'), uViolet: col('violet'), uGold: col('gold'), uA: {value: 0}, uRise: {value: 0}, uViol: {value: 0}, uGoldW: {value: 0}, uPeak: {value: 0}, uTime: {value: 0}, uContrast: {value: 1}, ...headU()},
  vertexShader: DOME_VS, fragmentShader: DOME_FS}), 5, 'liberationCanopyArcs');
 const core = mk(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({...additive({side: T.DoubleSide}),
  uniforms: {uCenter: {value: v3()}, uDirW: {value: v3(0, 0, 1)}, uSize: {value: 1}, uPush: {value: 0}, uBlue: col('blue'), uViolet: col('violet'), uGold: col('gold'), uA: {value: 0}, uTime: {value: 0}, uGrow: {value: 0}, uViol: {value: 0}, ...headU()},
  vertexShader: BILLBOARD_VS, fragmentShader: CORE_FS}), 12, 'liberationEtherealCore');
 const mg = new T.InstancedBufferGeometry(), mq = new T.PlaneGeometry(1, 1); mg.index = mq.index; mg.setAttribute('position', mq.attributes.position); mg.instanceCount = NM; mq.dispose();
 const mPos = new Float32Array(NM * 3), mS = new Float32Array(NM), mA = new Float32Array(NM), mK = new Float32Array(NM);
 for (const [n, a, k] of [['iPos', mPos, 3], ['iS', mS, 1], ['iA', mA, 1], ['iK', mK, 1]]) { const at = new T.InstancedBufferAttribute(a, k); at.setUsage(T.DynamicDrawUsage); mg.setAttribute(n, at); }
 const motes = mk(mg, new T.ShaderMaterial({...additive({side: T.DoubleSide}), uniforms: {uBlue: col('blue'), uGold: col('gold'), ...headU()}, vertexShader: MOTE_VS, fragmentShader: MOTE_FS}), 13, 'liberationMotes');
 const meshes = {field, canopy, core, motes};
 const U = o => o.material.uniforms;
 const neutral = new Map(Object.values(meshes).map(o => [o, Object.fromEntries(Object.entries(U(o)).map(([k, u]) => [k, u.value?.clone ? u.value.clone() : u.value]))]));
 const neutralize = () => {
  for (const a of [mPos, mS, mA, mK]) a.fill(0);
  for (const [o, init] of neutral) for (const [k, u] of Object.entries(U(o))) { if (u.value?.copy) u.value.copy(init[k]); else u.value = init[k]; }
  for (const o of Object.values(meshes)) { o.visible = false; o.position.set(0, 0, 0); o.scale.set(1, 1, 1); }
 };
 const focus = v3(), tmp = v3();

 /** ctx: {t, cue, rm, bundle, headW, P:{chest, rh, lh}, stage:{x, z, floorY}} */
 function update(c) {
  neutralize(); last = null;
  const {t, cue, rm, bundle: b} = c;
  if (!(cue.liberationField > 0.002)) return null;
  const ix = id => b.index.get(id), eC = ix('LIB.condense'), eR = ix('LIB.reveal'), eK = ix('LIB.peak'), eD = ix('LIB.decay');
  const vC = eventEnvelope(eC, t), vR = eventEnvelope(eR, t), vK = eventEnvelope(eK, t), vD = eventEnvelope(eD, t);
  const col3 = S3_COLOR_VARIANTS[cfg.variant], R = cfg.radius * h, time = rm ? 0 : t;
  for (const o of Object.values(meshes)) { const u = U(o); if (u.uHeadW) { u.uHeadW.value.copy(c.headW); u.uFaceR.value = 0.14 * h; } }
  const probe = {stage: null, levels: {condense: vC, reveal: vR, peak: vK, decay: vD}, starGate: 0, variant: col3.label, radiusH: cfg.radius, contrast: cfg.contrast, mechanics: col3.mechanics, motes: 0};
  // ---- Outer field + canopy (reveal envelope; peak adds violet arcs, gold ornaments, one gold shock ring) ----
  if (vR > 0.002) {
   const uR = phase(eR, t), reveal = rm ? 1.05 : 0.05 + 1.0 * smooth(uR / 0.30), rise = rm ? 1 : smooth((uR - 0.08) / 0.32);
   const uK = phase(eK, t), shock = rm ? 0.6 : 0.08 + 0.95 * smooth(uK / 0.7);
   const viol = col3.violet * (0.35 + 0.65 * Math.max(vK, smooth((uR - 0.15) / 0.25) * 0.6));
   const f = U(field); field.position.set(c.stage.x, c.stage.floorY + 0.006 * h, c.stage.z); field.scale.set(2.3 * R, 1, 2.3 * R);
   f.uA.value = vR; f.uReveal.value = reveal; f.uPeak.value = vK; f.uShock.value = shock; f.uViol.value = viol; f.uGoldW.value = col3.gold; f.uTime.value = time; f.uContrast.value = cfg.contrast;
   field.visible = true;
   const d = U(canopy); canopy.position.set(c.stage.x, c.stage.floorY, c.stage.z); canopy.scale.set(R, R * 0.62, R);
   d.uA.value = vR * 0.45; d.uRise.value = rise; d.uViol.value = viol; d.uGoldW.value = col3.gold; d.uPeak.value = vK; d.uTime.value = time; d.uContrast.value = cfg.contrast;
   canopy.visible = rise > 0.01;
   probe.starGate = vR * rise; probe.reveal = reveal; probe.rise = rise; probe.shock = vK > 0.002 ? shock : null; probe.violet = viol; probe.goldOrnament = col3.gold * vK;
  }
  // ---- Ethereal condensation core (no polyhedron) ----
  focus.copy(c.P.rh).add(c.P.lh).multiplyScalar(0.5).lerp(c.P.chest, 0.6); focus.y -= 0.02 * h; // kept low: hands rise to the chin in Burst02
  if (vC > 0.002) {
   const uC = phase(eC, t), k = U(core), grow = rm ? 1 : 0.35 + 0.65 * smooth(uC / 0.55);
   k.uCenter.value.copy(focus); k.uSize.value = 0.34 * h * grow; k.uPush.value = 0.06 * h; k.uA.value = vC * 0.6; k.uTime.value = time; k.uGrow.value = grow; k.uViol.value = 0.4 * col3.violet;
   core.visible = true; probe.core = {grow, focus: focus.toArray(), label: 'ETHEREAL_NO_POLYHEDRON'};
  }
  // ---- Motes: converge (condense), drift up from the field (reveal/peak), rise and fade (decay) ----
  let n = 0;
  const put = (x, y, z, s, a, k) => { if (n >= NM || a < 0.003) return; mPos[n * 3] = x; mPos[n * 3 + 1] = y; mPos[n * 3 + 2] = z; mS[n] = s; mA[n] = a; mK[n] = k; n++; };
  if (vC > 0.002) for (let i = 0; i < 18; i++) {
   const uC = rm ? 0.5 : phase(eC, t), q = clamp01(uC * 1.4 - hash(i, 1) * 0.4), ang = hash(i, 2) * TAU + (rm ? 0 : q * 2.2), rad = (0.75 - 0.68 * smooth(q)) * h, y = (hash(i, 3) - 0.5) * 0.5 * h * (1 - q);
   put(focus.x + Math.cos(ang) * rad, focus.y + y, focus.z + Math.sin(ang) * rad, 0.024 * h, vC * (0.4 + 0.6 * q), 0.15);
  }
  const fieldMotes = (lv, kGold, rise0) => { for (let i = 0; i < 16; i++) {
   const ang = hash(i, 5) * TAU, rr = (0.25 + 0.7 * hash(i, 6)) * R, per = 2.6 + hash(i, 7) * 1.6, ph = rm ? 0.4 : ((t / per + hash(i, 8)) % 1);
   put(c.stage.x + Math.cos(ang) * rr, c.stage.floorY + (rise0 + ph * 1.1) * h, c.stage.z + Math.sin(ang) * rr, 0.02 * h * (1 + hash(i, 9)), lv * Math.sin(Math.PI * ph) * 0.8, kGold);
  } };
  if (vR > 0.002) fieldMotes(vR, 0.15 + 0.85 * vK * col3.gold, 0.02);
  if (vD > 0.002) fieldMotes(vD, 0.6, 0.15);
  if (n) { motes.visible = true; for (const a of Object.values(mg.attributes)) if (a.isInstancedBufferAttribute) a.needsUpdate = true; }
  probe.motes = n;
  probe.stage = vC >= Math.max(vR, vD) && vC > 0.002 ? 'CONDENSE' : vK > 0.35 ? 'PEAK' : vR > 0.002 && phase(eR, t) < 0.45 ? 'OUTER_REVEAL' : vR > 0.002 ? 'DISSIPATION' : vD > 0.002 ? 'RECOVERY_MOTES' : 'NONE';
  last = probe; return probe;
 }
 return {
  update, hide() { neutralize(); last = null; },
  configure({radius: r = cfg.radius, contrast: k = cfg.contrast, variant: v = cfg.variant} = {}) {
   if (!S3_COLOR_VARIANTS[v] || !(r > 0.5 && r < 8) || !(k > 0.1 && k < 3)) throw new TypeError('Liberation: invalid configuration');
   cfg = {radius: r, contrast: k, variant: v};
  },
  get config() { return {...cfg}; },
  get meshes() { return meshes; },
  get probe() { return last; },
  uniformsProbe() { const o = {}; for (const [k, m] of Object.entries(meshes)) { o[k] = {visible: m.visible, pos: m.position.toArray(), scale: m.scale.toArray()}; for (const [n, u] of Object.entries(U(m))) o[k][n] = u.value?.toArray ? u.value.toArray() : u.value; } o.arrays = {mPos: Array.from(mPos), mA: Array.from(mA), mS: Array.from(mS)}; return o; },
  dispose() { if (disposed) return; disposed = true; neutralize(); for (const o of Object.values(meshes)) o.removeFromParent(); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); },
  get disposed() { return disposed; }
 };
}
