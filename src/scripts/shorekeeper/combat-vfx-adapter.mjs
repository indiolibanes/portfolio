/**
 * R6.2 S1 · isolated combat VFX adapter (Basic 1-3, Heavy candidate, blue core).
 *
 * Contract
 *  - Driven only by combat-visual-score `cueAt(absoluteTime, clipId, aspect)`; it owns NO clock,
 *    RAF, timer, mixer, camera or facial writer. Every frame is a pure function of
 *    (absoluteTime, clipId, aspect, read-only anchor poses): seek/reverse/pause/dt cannot drift.
 *  - Own subtree (`ShorekeeperCombatScoreVfx`) and own materials. It never touches the R2-R5 director,
 *    its levels, shaders, buffers or environment, so manual VFX snapshot/restore stays the R6.1.1 job.
 *  - Reads Bip001RHand/LHand/RForearm/LForearm/Spine2/Head world positions; never writes bones.
 *  - Everything is AUTHORIAL/SIMULATED: no projectile, no hit, no target, no HP, no Stellarealm.
 *  - `blueCore` is a lit sphere + halo billboard: NOT coreCrystal (octahedron) / coreCage (icosahedron wireframe).
 *  - Additive, toneMapped:false, depthWrite:false, 6 draw calls maximum.
 */
import {createS1Score, createS2Score, createS3Score, resolveClipId, S1_VISUAL_VARIANTS} from './combat-vfx-events.mjs';
import {BILLBOARD_VS, FACE_FS, TAIL, NOISE_GLSL} from './combat-vfx-shaders.mjs';
import {createVolumetricHeavy} from './heavy-volumetric.mjs';
import {createTargetedSkill} from './skill-targeted.mjs';
import {trailPosition,TRAIL_POINTS} from './combat-vfx-trails.mjs';
import {createSkillLayer} from './combat-vfx-skill.mjs';
import {createLiberationLayer} from './combat-vfx-liberation.mjs';
import {createTrailLayer} from './combat-vfx-trails.mjs';
import {createSparkLayer, buildSparkTable} from './combat-vfx-sparkflies.mjs';

export const COMBAT_VFX_ANCHORS = Object.freeze({rh: 'Bip001RHand', lh: 'Bip001LHand', rf: 'Bip001RForearm', lf: 'Bip001LForearm', chest: 'Bip001Spine2', head: 'Bip001Head'});
export const COMBAT_VFX_BODY_ANCHORS = Object.freeze({pel: 'Bip001Pelvis', rt: 'Bip001RThigh', lt: 'Bip001LThigh', rfoot: 'Bip001RFoot', lfoot: 'Bip001LFoot'});
export const COMBAT_VFX_MAX_DRAW_CALLS = 9; // G11: +1 body motion trails; G11.1: +1 quick attack butterflies (one instanced mesh)
export const COMBAT_VFX_LABEL = 'AUTHORIAL_SIMULATED_NOT_CANONICAL';

const HEAVY_VIOLET = 0.62;
/** G11 Heavy: launch streak look (blue, thin, curved) - used only for the Heavy release, on the dominant hand. */
const HEAVY_LAUNCH = Object.freeze({tint: [0.42, 0.78, 1.0], bend: 0.35, length: 0.95, width: 0.07, filaments: 2, glints: 0.8, gain: 1.05, viol: HEAVY_VIOLET});
/** G11.1 mixed energy spectrum: violet share per clip (deterministic, 0.30..0.75; Heavy fixed) so the combo is not one flat blue. */
const violetOf = clipId => { let h = 2166136261; const s = String(clipId); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return 0.30 + 0.45 * ((h >>> 0) / 4294967296); };
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const fail = m => { throw new TypeError('Combat VFX adapter: ' + m); };

const GLOW_FS = `${FACE_FS}
uniform vec3 uTint, uViolet; uniform float uA, uRing, uViol;
varying vec2 vP; varying vec2 vD;
void main(){
  float r=length(vP); if(r>1.) discard;
  float core=exp(-r*r*14.), halo=pow(max(0.,1.-r),2.4);
  float rr=mix(.18,.92,uRing), ring=uRing>0.?exp(-pow((r-rr)/.05,2.))*(1.-uRing):0.;
  float a=uA*(core*.9+halo*.55+ring*.9); if(a<.004) discard;
  a*=faceMask(vP); if(a<.004) discard;
  vec3 tn=mix(uTint,uViolet,uViol*smoothstep(.05,.7,r)*1.1+uViol*ring*.5);
  gl_FragColor=vec4(mix(tn,vec3(1.),.4*core+.14*ring),min(1.,a));${TAIL}`;
const ARC_FS = `${FACE_FS}
uniform vec3 uTint, uViolet; uniform float uA, uPhase, uBend, uLen, uWidth, uFil, uGlint, uViol;
varying vec2 vP; varying vec2 vD;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 e=vD, n=vec2(-e.y,e.x);
  float x=dot(vP,-e), y=dot(vP,n);
  float grow=smoothstep(0.,.35,uPhase), dissolve=smoothstep(.55,1.,uPhase);
  float L=uLen*mix(.35,1.,grow)*(1.-.5*dissolve);
  float s=x/max(L,1e-3); if(s<-.04||s>1.) discard;
  float yc=uBend*s*s*L*.55, d=abs(y-yc);
  float w=uWidth*(1.-s*.85)*(.6+.4*smoothstep(0.,.12,s));
  float line=smoothstep(w,w*.35,d), glow=exp(-d*d/(w*w*7.));
  if(uFil>1.5){ float d2=abs(y-(yc+uBend*.22*L*(.3+s))); line=max(line,.6*smoothstep(w*.7,w*.2,d2)); }
  float prof=pow(max(0.,1.-s),1.3);
  float sp=step(.992,hash(floor(vec2(s*L*22.,y*22.))+floor(uPhase*5.)))*uGlint;
  float a=uA*(line+glow*.45+sp)*prof; if(a<.004) discard;
  a*=faceMask(vP); if(a<.004) discard;
  float vg=uViol*(smoothstep(.05,.8,s)*1.0+(1.-line)*.5);
  vec3 tn=mix(uTint,uViolet,clamp(vg,0.,1.));
  gl_FragColor=vec4(mix(tn,vec3(1.),.36*line*prof+.5*sp),min(1.,a));${TAIL}`;
const CORE_FS = `${FACE_FS}
uniform vec3 uTint; uniform float uA, uTime, uSph, uHot;
varying vec2 vP; varying vec2 vD;
void main(){
  float r=length(vP)/uSph; if(r>2.4) discard;
  vec3 col; float a;
  if(r<=1.){
    vec3 nrm=vec3(vP/uSph,sqrt(max(0.,1.-r*r)));
    float fres=pow(1.-nrm.z,2.2), diff=.5+.5*dot(nrm,normalize(vec3(-.4,.6,.7))), inner=pow(nrm.z,1.6);
    float band=.5+.5*sin(nrm.y*7.+nrm.x*3.+uTime*1.3+sin(nrm.x*5.-uTime*.7)*1.5);
    float body=.35+.45*diff+.35*band*inner;
    col=mix(uTint*body,vec3(.85,.96,1.),.25*inner*uHot+.32*fres);
    a=.55+.45*fres+.25*inner;
  } else {
    float k=exp(-(r-1.)*2.8)*(1.-smoothstep(1.,2.4,r));
    col=mix(uTint,vec3(1.),.12); a=.7*k;
  }
  a*=uA*faceMask(vP); if(a<.004) discard;
  gl_FragColor=vec4(col,min(1.,a));${TAIL}`;
/** G11.3 Heavy: a large blue/violet charged sphere (small black hole): dark turbulent body, hot compressed centre, bright rim, swirling accretion arms. */
const SING_FS = `${FACE_FS}
uniform vec3 uTint, uViolet; uniform float uA, uTime, uSurge;
varying vec2 vP; varying vec2 vD;
${NOISE_GLSL}
void main(){
  float r=length(vP); if(r>1.) discard;
  float rs=.46, q=r/rs, ang=atan(vP.y,vP.x);
  float sw=ang+(3.2+1.5*uSurge)*(1.-smoothstep(0.,1.4,q))+uTime*1.6;
  float t1=fbm(vec2(sw*1.7,q*5.-uTime*1.8)), t2=fbm(vec2(sw*3.1+4.,q*9.+uTime*1.2));
  float inside=1.-smoothstep(.96,1.,q);
  vec3 body=mix(uTint,uViolet,clamp(t1*1.3+.15*q,0.,1.))*(.10+.75*smoothstep(.15,1.,q))*(.55+.9*t2);
  float rim=exp(-pow((q-1.)/.075,2.))*(.9+.7*t1)*(1.+.8*uSurge);
  float arms=pow(abs(cos(sw*3.)),5.)*exp(-max(0.,q-1.)*2.6)*smoothstep(.98,1.12,q)*(.6+.7*t2);
  float halo=exp(-pow(max(0.,q-1.)/.55,2.))*smoothstep(.95,1.,q)*.55;
  float core=exp(-q*q*26.)*(.55+.8*uSurge);
  vec3 col=body*inside+uViolet*(rim*.9+arms*.8)+uTint*(rim*.5+halo*.8+arms*.4)+vec3(.78,.86,1.)*(core+rim*.18);
  col*=uA*faceMask(vP); float a=max(col.r,max(col.g,col.b)); if(a<.004) discard;
  gl_FragColor=vec4(min(col,vec3(1.)),min(1.,a));${TAIL}`;
const PULSE_FS = `${FACE_FS}
uniform vec3 uTint, uViolet; uniform float uConvA, uConv, uRelA, uRel, uViol;
varying vec2 vP; varying vec2 vD;
void main(){
  float r=length(vP); if(r>1.) discard;
  float conv=0.;
  for(int i=0;i<3;i++){ float ph=fract(uConv*1.35+float(i)/3.), rad=mix(.95,.2,ph), w=.018+.02*ph; conv+=exp(-pow((r-rad)/w,2.))*(1.-ph)*ph*4.; }
  float ang=atan(vP.y,vP.x); conv*=(.85+.15*step(.5,fract(ang*3.8197+uConv*2.)))*.8*uConvA;
  float rr=mix(.12,.97,1.-pow(1.-uRel,2.2)), rw=.028+.05*uRel;
  float rel=uRelA*(exp(-pow((r-rr)/rw,2.))*1.15+.25*exp(-pow((r-rr*.82)/(rw*3.),2.))*(1.-uRel));
  float a=(conv+rel)*faceMask(vP); if(a<.004) discard;
  vec3 tn=mix(uTint,uViolet,clamp(uViol*(.45+.75*r),0.,1.));
  gl_FragColor=vec4(mix(tn,vec3(1.),.14*min(1.,rel)),min(1.,a));${TAIL}`;

/**
 * @param T       three namespace (injected like the other Shorekeeper modules)
 * @param opts.scene/parent  where the private subtree is added
 * @param opts.model         optional; anchors are resolved by bone name
 * @param opts.bundle        createS1Score(...) result (score + events + schedule)
 * @param opts.scale         character height in world units (R2 `vfx.scale`); measured from the model if omitted
 * @param opts.reducedMotion boolean or () => boolean
 * @param opts.proxyAnchors  true => use fixed, explicitly MARKED proxy anchors (isolated proof, no skeleton)
 */
export function createCombatVfxAdapter(T, {scene, parent = scene, model = null, bundle, scale = null, reducedMotion = false, proxyAnchors = false, proxyOrigin = [0, 0, 0], skill = false, targetMode = 'SIMULATED_TARGET', liberation = null, stageAnchor = null, fidelity = false, combatStudy = null} = {}) {
 if (!parent?.add || !bundle?.score?.cueAt || !bundle.schedule) fail('scene and S1 bundle required');
 if(combatStudy&&(!fidelity||combatStudy.id!=='F141'||typeof combatStudy.target?.at!=='function'||!Array.isArray(combatStudy.front)||combatStudy.front.length!==3||!combatStudy.front.every(Number.isFinite)))fail('F141 requires a FIDELIDADE QA_TARGET and finite world front');
 let disposed = false, visible = false, last = null;
 const readReduced = typeof reducedMotion === 'function' ? reducedMotion : () => !!reducedMotion;

 // ---- anchors (read-only) ----
 const found = {}, status = {};
 for (const [k, name] of Object.entries(COMBAT_VFX_ANCHORS)) {
  const o = model && !proxyAnchors ? model.getObjectByName(name) : null;
  found[k] = o ?? null; status[k] = proxyAnchors ? 'PROXY_MARKED' : o ? 'REAL_BONE' : 'NOT_FOUND';
 }
 const bodyFound = {}, bodyStatus = {};
 if (skill) for (const [k, name] of Object.entries(COMBAT_VFX_BODY_ANCHORS)) {
  const o = model && !proxyAnchors ? model.getObjectByName(name) : null;
  bodyFound[k] = o ?? null; bodyStatus[k] = proxyAnchors ? 'PROXY_MARKED' : o ? 'REAL_BONE' : 'NOT_FOUND';
 }
 const bodyOk = skill && Object.values(bodyStatus).every(v => v !== 'NOT_FOUND') && (proxyAnchors || status.chest === 'REAL_BONE');
 const anchorStatus = proxyAnchors ? 'PROXY_MARKED' : Object.values(status).every(v => v === 'REAL_BONE') ? 'REAL' : Object.values(status).some(v => v === 'REAL_BONE') ? 'PARTIAL' : 'UNRESOLVED';
 let h = scale;
 if (!(h > 0)) {
  if (model) { model.updateMatrixWorld(true); const b = new T.Box3().setFromObject(model); h = b.isEmpty() ? 2 : Math.max(0.1, b.getSize(new T.Vector3()).y); } else h = 2;
 }
 const PROXY = {rh: [0.20, 0.50, 0.14], lh: [-0.20, 0.50, 0.14], rf: [0.30, 0.55, 0.02], lf: [-0.30, 0.55, 0.02], chest: [0, 0.68, 0], head: [0, 0.92, 0]};
 const P = {}; for (const k of Object.keys(COMBAT_VFX_ANCHORS)) P[k] = new T.Vector3();
 const PROXY_BODY = {pel: [0, 0.52, 0], rt: [0.08, 0.50, 0], lt: [-0.08, 0.50, 0], rfoot: [0.08, 0.045, 0], lfoot: [-0.08, 0.045, 0]};
 const B = {}; if (skill) for (const k of Object.keys(COMBAT_VFX_BODY_ANCHORS)) B[k] = new T.Vector3();
 const readBody = () => {
  for (const k of Object.keys(B)) {
   if (proxyAnchors) B[k].set(proxyOrigin[0] + PROXY_BODY[k][0] * h, proxyOrigin[1] + PROXY_BODY[k][1] * h, proxyOrigin[2] + PROXY_BODY[k][2] * h);
   else bodyFound[k].getWorldPosition(B[k]);
  }
 };
 // F1.4: horizontal direction the HEAD faces (the body's own heading spins in the airborne Burst, so it cannot gate a face mask).
 // The head bone's local forward axis is captured ONCE, at creation, from the standing pose (hip-line forward, same convention as the Skill layer)
 // and is then read back through the live head orientation. Read-only; null (= historical always-on mask) whenever it is not trustworthy.
 let faceAxis = null; const faceQ = new T.Quaternion(), faceV = new T.Vector3();
 if (bodyOk && !proxyAnchors && found.head) try {
  model.updateMatrixWorld(true); readBody();
  const r = new T.Vector3().copy(B.rt).sub(B.lt); r.y = 0;
  if (r.length() > 0.02 * h) { r.normalize(); const fwd = new T.Vector3(r.z, 0, -r.x); found.head.getWorldQuaternion(faceQ); faceAxis = fwd.applyQuaternion(faceQ.invert()); }
 } catch (e) { faceAxis = null; }
 const readFaceFront = () => {
  if (!faceAxis || !found.head) return null;
  found.head.getWorldQuaternion(faceQ); faceV.copy(faceAxis).applyQuaternion(faceQ); faceV.y = 0;
  const l = faceV.length(); return l > 0.25 ? {x: faceV.x / l, z: faceV.z / l} : null;
 };
 const readPose = () => {
  for (const k of Object.keys(P)) {
   if (proxyAnchors) P[k].set(proxyOrigin[0] + PROXY[k][0] * h, proxyOrigin[1] + PROXY[k][1] * h, proxyOrigin[2] + PROXY[k][2] * h);
   else if (found[k]) found[k].getWorldPosition(P[k]);
  }
 };
 const have = status.rh !== 'NOT_FOUND' || status.lh !== 'NOT_FOUND';

 // ---- subtree ----
 const root = new T.Group(); root.name = 'ShorekeeperCombatScoreVfx'; root.visible = false; parent.add(root);
 const mats = [], geos = [];
 const mat = (fs, uniforms) => {
  const m = new T.ShaderMaterial({uniforms: {uCenter: {value: new T.Vector3()}, uDirW: {value: new T.Vector3(0, 0, 1)}, uSize: {value: 1}, uPush: {value: 0}, uHeadW: {value: new T.Vector3()}, uFaceR: {value: 0}, uTint: {value: new T.Vector3(0.3, 0.8, 1)}, uViolet: {value: new T.Vector3(0.36, 0.05, 1.0)}, uViol: {value: 0}, uA: {value: 0}, ...uniforms}, vertexShader: BILLBOARD_VS, fragmentShader: fs,
   transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending, toneMapped: false, side: T.DoubleSide});
  mats.push(m); return m;
 };
 const quad = (m, order, name) => {
  const g = new T.PlaneGeometry(1, 1); geos.push(g);
  const o = new T.Mesh(g, m); o.name = name; o.frustumCulled = false; o.renderOrder = order; o.visible = false; root.add(o); return o;
 };
 const arcU = () => ({uPhase: {value: 0}, uBend: {value: 0}, uLen: {value: 0.6}, uWidth: {value: 0.05}, uFil: {value: 1}, uGlint: {value: 0}});
 const glowU = () => ({uRing: {value: 0}});
 const fx = {
  glowR: quad(mat(GLOW_FS, glowU()), 8, 'blueGlowR'), glowL: quad(mat(GLOW_FS, glowU()), 8, 'blueGlowL'),
  arcR: quad(mat(ARC_FS, arcU()), 9, 'blueArcR'), arcL: quad(mat(ARC_FS, arcU()), 9, 'blueArcL'),
  core: quad(mat(CORE_FS, {uTime: {value: 0}, uSph: {value: 1 / 2.4}, uHot: {value: 0}}), 11, 'blueCoreSphere'),
  sing: quad(mat(SING_FS, {uTime: {value: 0}, uSurge: {value: 0}}), 12, 'blueHeavySingularity'),
  pulse: quad(mat(PULSE_FS, {uConvA: {value: 0}, uConv: {value: 0}, uRelA: {value: 0}, uRel: {value: 0}}), 10, 'blueHeavyPulse')
 };
 const skillLayer = skill ? createSkillLayer(T, {parent: root, h, bundle, targetMode}) : null;
 const heavyVolume=combatStudy?createVolumetricHeavy(T,{parent:root,h}):null;
 const targetedSkill=combatStudy?createTargetedSkill(T,{parent:root,h,bundle,target:combatStudy.target,wingAtlas:skillLayer?.meshes.wings.material.uniforms.atlas.value}):null;
 if(combatStudy)skillLayer?.setAblation('HEAL_ONLY');
 let heavyProbe=null,targetProbe=null;
 // S3: Outer field anchored to the arena (fixed world point), never to the levitating/spinning body.
 let arena = null;
 if (liberation) {
  if (stageAnchor && [stageAnchor.x, stageAnchor.z, stageAnchor.floorY].every(Number.isFinite)) arena = {x: stageAnchor.x, z: stageAnchor.z, floorY: stageAnchor.floorY, source: 'STAGE_ANCHOR'};
  else if (proxyAnchors) arena = {x: proxyOrigin[0], z: proxyOrigin[2], floorY: proxyOrigin[1], source: 'PROXY_MARKED'};
  else if (model) { model.updateMatrixWorld(true); const bx = new T.Box3().setFromObject(model), c = bx.getCenter(new T.Vector3()); arena = {x: c.x, z: c.z, floorY: bx.min.y, source: 'MODEL_BOX_AT_CREATION'}; }
  else fail('liberation needs a stage anchor, a model or proxy anchors');
  arena = Object.freeze(arena);
 }
 // 'TIMELINE_ONLY' = A/B 'legacy-gated' variant: Liberation timing is known but the layer is not drawn.
 const libLayer = liberation && liberation !== 'TIMELINE_ONLY' ? createLiberationLayer(T, {parent: root, h, bundle, ...(fidelity ? {palette: 'fidelity'} : {}), ...(liberation === true ? {} : liberation)}) : null;
 const trails = createTrailLayer(T, {parent: root, h});
 const sparks = createSparkLayer(T, {parent: root, h});
 const sparkTable = buildSparkTable(bundle.events, id => bundle.hand?.[id] ?? 'R');
 let trailHistory = null;
 const U = o => o.material.uniforms;
 // Every uniform returns to its construction value at the start of each frame, so hidden effects can
 // never carry history: the full shader input is a pure function of (time, clip, aspect, pose).
 const NEUTRAL = new Map(Object.values(fx).map(o => [o, Object.fromEntries(Object.entries(U(o)).map(([k, u]) => [k, u.value?.clone ? u.value.clone() : u.value]))]));
 const neutralize = () => { for (const [o, init] of NEUTRAL) for (const [k, u] of Object.entries(U(o))) { if (u.value?.copy) u.value.copy(init[k]); else u.value = init[k]; } };
 const tmp = new T.Vector3(), mid = new T.Vector3(), focus = new T.Vector3(), headW = new T.Vector3();

 // Coarse centre guard only; the exact per-pixel face exclusion is the screen-space mask (vFace).
 const faceFactor = p => smooth((p.distanceTo(P.head) / h - 0.06) / 0.10);
 const hide = () => { neutralize(); for (const o of Object.values(fx)) o.visible = false; skillLayer?.hide(); libLayer?.hide(); trails.hide(); sparks.hide(); heavyVolume?.hide();targetedSkill?.hide();root.visible = false; visible = false; };

 const placeGlow = (mesh, p, level, v, ring) => {
  const f = faceFactor(p), u = U(mesh);
  u.uCenter.value.copy(p); u.uSize.value = h * v.glow * (0.7 + 0.35 * level) * 1.7; u.uPush.value = 0.06 * h;
  u.uTint.value.set(...v.tint); u.uViol.value = v.viol ?? 0; u.uA.value = level * v.gain * f * 0.8; u.uRing.value = ring;
  mesh.visible = u.uA.value > 0.002; return f;
 };
 const placeArc = (mesh, hand, fore, level, v, side, phase, weight, rm) => {
  const f = faceFactor(hand), u = U(mesh);
  tmp.copy(hand).sub(fore); if (tmp.lengthSq() < 1e-10) tmp.set(side, 0, 0); tmp.normalize();
  u.uCenter.value.copy(hand); u.uDirW.value.copy(tmp); u.uSize.value = h * 0.9; u.uPush.value = 0.05 * h;
  u.uTint.value.set(...v.tint); u.uViol.value = v.viol ?? 0; u.uA.value = level * v.gain * weight * f;
  u.uPhase.value = rm ? 0.5 : phase; u.uBend.value = v.bend * side; u.uLen.value = v.length; u.uWidth.value = v.width; u.uFil.value = v.filaments; u.uGlint.value = rm ? 0 : v.glints;
  mesh.visible = u.uA.value > 0.002; return f;
 };

 // G11.3: the (simulated) target of the Heavy: a point in front of her at chest height (same body-frame forward as the Skill layer).
 const tgtPt = new T.Vector3(), fwdV = new T.Vector3();
 const heavyTarget = (dom, aspect = 16 / 9) => {
  if (bodyOk) { readBody(); fwdV.copy(B.rt).sub(B.lt); fwdV.y = 0; if (fwdV.lengthSq() < 1e-8) fwdV.set(1, 0, 0); fwdV.normalize(); fwdV.set(fwdV.z, 0, -fwdV.x); }
  else { fwdV.copy(dom === 'R' ? P.rh : P.lh).sub(P.chest); fwdV.y = 0; if (fwdV.lengthSq() < 1e-8) fwdV.set(0, 0, 1); fwdV.normalize(); }
  return tgtPt.copy(P.chest).addScaledVector(fwdV, (aspect < 1 ? 0.72 : 1.05) * h).setY(P.chest.y - 0.12 * h);
 };
 const placeSing = (tp, radiusH, level, surge, v, timeU, rm) => {
  if(heavyVolume){const event=bundle.index.get('HEAVY.prep');if(!trailHistory||!event)return 1;const p=trailPosition(trailHistory,TRAIL_POINTS.indexOf('chest'),event.start);const front=combatStudy.front;p[0]+=front[0]*.95*h;p[1]-=.12*h;p[2]+=front[2]*.95*h;heavyProbe=heavyVolume.update({position:p,radius:radiusH*h,level,time:timeU,reduced:rm});return 1;}
  const u = U(fx.sing); u.uCenter.value.copy(tp); u.uSize.value = h * radiusH * 2 / 0.46; u.uPush.value = 0.0; u.uTint.value.set(0.16, 0.42, 1.0); u.uViolet.value.set(0.50, 0.12, 1.0);
  u.uA.value = level; u.uTime.value = rm ? 0 : timeU; u.uSurge.value = surge; fx.sing.visible = level > 0.002; return 1;
 };
 const activeOf = (cue, time, test) => {
  let best = null;
  for (const pr of cue.eventProvenance) {
   const e = bundle.index.get(pr.id);
   if (!e || !test(e) || time < e.start || time >= e.end) continue;
   if (!best || e.start >= best.start) best = e;
  }
  return best;
 };
 const phaseOf = (e, t) => (t - e.start) / (e.end - e.start);

 function apply(time, clipId, aspect = 16 / 9) {
  if (disposed) return null;
  if (!Number.isFinite(time)) fail('invalid time');
  const t = Math.max(0, Math.min(bundle.schedule.duration, time));
  const id = clipId === undefined ? resolveClipId(bundle.schedule, t) : clipId;
  const cue = bundle.score.cueAt(t, id, aspect), rm = !!readReduced();
  neutralize(); for (const o of Object.values(fx)) o.visible = false;
  heavyVolume?.hide();heavyProbe=null;targetProbe=targetedSkill?.update({t,rm})??null;
  let face = 1, shown = 0;
  const live = (cue.blueAttack > 0.002 || cue.blueCore > 0.002 || cue.heavyPulse > 0.002) && (have || proxyAnchors);
  if (live) {
   readPose();
   headW.copy(P.head); headW.y += 0.05 * h;
   const timeUniform = rm ? 0 : t;
   // --- Basic envelope: side from measured dominant hand, secondary weight and look from the variant ---
   const env = activeOf(cue, t, e => e.channel === 'blueAttack');
   if (env && cue.blueAttack > 0.002) {
    const v0 = S1_VISUAL_VARIANTS[env.clipId], dom = bundle.hand?.[env.clipId] ?? 'R';
    const v = v0 && {...v0, viol: violetOf(env.clipId)};
    if (v) {
     const u = phaseOf(env, t), flashRing = v.flash ? smooth((u - 0.38) / 0.34) : 0, level = cue.blueAttack;
     const hands = [['R', P.rh, P.rf, fx.glowR, fx.arcR, +1], ['L', P.lh, P.lf, fx.glowL, fx.arcL, -1]];
     for (const [k, hp, fp, g, a, side] of hands) {
      const w = k === dom ? 1 : v.secondary; if (w <= 0) continue;
      face = Math.min(face, placeGlow(g, hp, level * w, v, rm ? 0 : flashRing * (k === dom ? 1 : 0)));
      face = Math.min(face, placeArc(a, hp, fp, level, v, side, u, w, rm));
     }
    }
   }
   // --- Blue core sphere: Basic accumulation marker or Heavy preparation concentration ---
   const core = activeOf(cue, t, e => e.channel === 'blueCore');
   if (core && cue.blueCore > 0.002) {
    const v = S1_VISUAL_VARIANTS[core.clipId];
    if (v) {
     const heavy = core.id.startsWith('HEAVY'), u = phaseOf(core, t);
     // G11: the Heavy charge lives on the DOMINANT hand (palm), not between the hands / on the chest, and it COMPRESSES.
     if (heavy) { const dom = bundle.hand?.[core.clipId] ?? 'R'; focus.copy(dom === 'R' ? P.rh : P.lh).lerp(dom === 'R' ? P.rf : P.lf, 0.10); }
     else { mid.copy(P.rh).add(P.lh).multiplyScalar(0.5); focus.copy(mid).lerp(P.chest, 0.35); focus.y += 0.03 * h; }
     const f = faceFactor(focus), c = U(fx.core), grow = 0.55 + 0.45 * smooth(Math.min(1, u * 1.6));
     const radius = heavy ? h * 0.075 * (rm ? 0.8 : 1.0 - 0.45 * smooth(u)) : h * 0.07 * v.accumulation * (rm ? 1 : grow);
     c.uCenter.value.copy(focus); c.uSize.value = radius * 2 * 2.4; c.uPush.value = 0.08 * h; c.uTint.value.set(...v.tint);
     c.uA.value = cue.blueCore * f * (heavy ? 0.8 : 1); c.uTime.value = timeUniform; c.uHot.value = heavy ? 1 : 0.35;
     fx.core.visible = c.uA.value > 0.002; face = Math.min(face, f);
     if (heavy) { // concentration rings converge on the same focus point (preparation only)
      const p = U(fx.pulse); p.uCenter.value.copy(focus); p.uSize.value = h * 0.95; p.uPush.value = 0.07 * h; p.uTint.value.set(...v.tint); p.uViol.value = HEAVY_VIOLET;
      p.uConvA.value = cue.blueCore * f; p.uConv.value = rm ? 0.35 : u; fx.pulse.visible = true;
      placeSing(heavyTarget(bundle.hand?.[core.clipId] ?? 'R', aspect), 0.08 + 0.34 * smooth(u), cue.blueCore * 1.15, 0, v, timeUniform, rm);
     }
    }
   }
   // --- Heavy release: exactly one expanding pulse ---
   const rel = activeOf(cue, t, e => e.channel === 'heavyPulse');
   if (rel && cue.heavyPulse > 0.002) {
    const v = S1_VISUAL_VARIANTS[rel.clipId];
    if (v) {
     // G11: launch from the dominant hand: curved streak along the arm line + ONE impact ring centred on that hand, then dissipation.
     const dom = bundle.hand?.[rel.clipId] ?? 'R', hp = dom === 'R' ? P.rh : P.lh, fp = dom === 'R' ? P.rf : P.lf;
     focus.copy(hp).lerp(fp, 0.10);
     const f = faceFactor(focus), p = U(fx.pulse), ph = phaseOf(rel, t);
     p.uCenter.value.copy(focus); p.uSize.value = h * 0.95; p.uPush.value = 0.07 * h; p.uTint.value.set(...v.tint); p.uViol.value = HEAVY_VIOLET;
     p.uRelA.value = cue.heavyPulse * f; p.uRel.value = rm ? 0.45 : ph; fx.pulse.visible = true; face = Math.min(face, f);
     placeSing(heavyTarget(dom, aspect), 0.42 + 0.22 * smooth(ph * 1.4), Math.max(cue.heavyPulse, 0) * 1.25, 1 - smooth(ph * 1.2), v, timeUniform, rm);
     const arcMesh = dom === 'R' ? fx.arcR : fx.arcL;
     face = Math.min(face, placeArc(arcMesh, hp, fp, cue.heavyPulse, HEAVY_LAUNCH, dom === 'R' ? +1 : -1, Math.min(1, ph * 1.15), 1, rm));
    }
   }
  }
  if (!fx.pulse.visible) { U(fx.pulse).uConvA.value = 0; U(fx.pulse).uRelA.value = 0; }
  else { if (!(cue.blueCore > 0.002)) U(fx.pulse).uConvA.value = 0; if (!(cue.heavyPulse > 0.002)) U(fx.pulse).uRelA.value = 0; }
  let skillProbe = null;
  if (skillLayer) {
   const sLive = (cue.healingPulse > 0.002 || cue.guidedButterflies > 0.002) && bodyOk && (have || proxyAnchors);
   if (sLive) {
    readPose(); readBody(); headW.copy(P.head); headW.y += 0.05 * h;
    const r = tmp.copy(B.rt).sub(B.lt); r.y = 0; if (r.lengthSq() < 1e-8) r.set(1, 0, 0); r.normalize();
    const right = r.clone(), fwd = new T.Vector3(r.z, 0, -r.x);
    skillProbe = skillLayer.update({t, cue, rm, bundle, headW, fwd, right, floorY: Math.min(B.rfoot.y, B.lfoot.y) - 0.035 * h, P: {pel: B.pel, chest: P.chest}});
   } else skillLayer.hide();
   for (const o of Object.values(skillLayer.meshes)) if (o.visible) shown++;
  }
  let libProbe = null;
  if (libLayer) {
   const g11 = bundle.timeline?.g11, sh = bundle.timeline?.studyHold, bfLive = (!!sh && t >= sh.start && t < sh.end + sh.fadeS) || (!!g11 && ((t >= g11.absorbStart && t < g11.butterflyEnd) || (g11.triggerStart !== undefined && t >= g11.triggerStart && t < g11.triggerEnd))); // G11.1: absorption + burst bridge the reveal->decay gap; F2: the trigger butterfly may outlive the condense window (FIDELIDADE holds it through shot 1)
   if ((cue.liberationField > 0.002 || bfLive) && (have || proxyAnchors) && (proxyAnchors || status.chest === 'REAL_BONE')) {
    readPose(); headW.copy(P.head); headW.y += 0.05 * h;
    const front = readFaceFront();
    libProbe = libLayer.update({t, cue, rm, bundle, headW, front, P: {chest: P.chest, rh: P.rh, lh: P.lh}, stage: arena});
   } else libLayer.hide();
   for (const o of Object.values(libLayer.meshes)) if (o.visible) shown++;
  }
  // G11 body motion trails (history table is optional; without it nothing is drawn)
  const energy = fidelity ? 0 : Math.min(1, Math.max(cue.blueAttack, cue.heavyPulse, cue.blueCore * 0.7, libLayer ? cue.liberationField * 0.7 : 0, cue.guidedButterflies ? cue.guidedButterflies * 0.3 : 0)), wide = fidelity ? 1 : 1 + (libLayer ? 0.6 * Math.min(1, cue.liberationField) : 0); // F1 FIDELIDADE: no authorial orbital ribbons
  // F2: the reference Liberation cutscene (shots 1-3) shows NO body ribbons; FIDELIDADE hides them for the whole Burst clip
  const burstSeg = fidelity ? bundle.schedule?.segments?.find(sg => sg.id === 'SK_BURST_02_ORIGINAL') : null, noRibbons = !!burstSeg && t >= burstSeg.start && t < burstSeg.end;
  const trailProbe = noRibbons ? (trails.hide(), null) : trails.update(trailHistory, t, rm, energy, wide); if (trails.mesh.visible) shown++;
  // G11.1 quick attack butterflies (needs the hand history; none in proxy/no-history mode)
  let sparkProbe = null;
  if (trailHistory && (have || proxyAnchors) && !rm) { readPose(); headW.copy(P.head); headW.y += 0.05 * h; sparkProbe = sparks.update({table: sparkTable, hist: trailHistory, t, rm, headW}); } else sparks.hide();
  if (sparks.mesh.visible) shown++;
  for (const o of Object.values(fx)) if (o.visible) { shown++; if (live) { U(o).uHeadW.value.copy(headW); U(o).uFaceR.value = 0.14 * h; } }
  if(heavyProbe)shown+=heavyProbe.drawCalls;if(targetProbe)shown+=targetProbe.drawCalls;
  visible = root.visible = shown > 0;
  last = Object.freeze({presentationTime: t, clipId: id, beat: cue.beat, levels: Object.freeze({blueAttack: cue.blueAttack, blueCore: cue.blueCore, heavyPulse: cue.heavyPulse, ...(libLayer ? {liberationField: cue.liberationField} : {}), ...(skillLayer ? {healingPulse: cue.healingPulse, guidedButterflies: cue.guidedButterflies} : {})}),
   skill: skillProbe && Object.freeze(skillProbe),
   ...(combatStudy?{combatStudy:{heavy:heavyProbe,skill:targetProbe,status:'VISUAL_CANDIDATE'}}:{}),
   trails: trailProbe && Object.freeze(trailProbe), sparks: sparkProbe && Object.freeze(sparkProbe), liberation: libProbe && Object.freeze(libProbe), starGate: libProbe ? libProbe.starGate : 0,
   drawCalls: shown, minFaceFactor: face, anchorStatus, reducedMotion: rm, label: COMBAT_VFX_LABEL, pending: cue.pending, provenance: cue.eventProvenance.map(p => p.id)});
  return last;
 }

 return Object.freeze({
  apply,
  /** Hide everything; the adapter can be applied again later. Idempotent. */
  release() { if (!disposed) { hide(); last = null; } },
  dispose() {
   if (disposed) return; disposed = true; hide(); root.removeFromParent();
   heavyVolume?.dispose();targetedSkill?.dispose();skillLayer?.dispose(); libLayer?.dispose(); trails.dispose(); sparks.dispose(); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); root.clear();
  },
  /** G11: read-only world-position history of the body anchors (see combat-vfx-trails.mjs); null clears it. */
  setTrailHistory(hist) { trailHistory = hist ?? null;targetedSkill?.setHistory(trailHistory); },
  get hasTrailHistory() { return !!trailHistory; },
  get combatStudy(){return combatStudy?{target:combatStudy.target,front:[...combatStudy.front],heavy:heavyVolume,skill:targetedSkill}:null;},
  get root() { return root; },
  get disposed() { return disposed; },
  get visible() { return visible; },
  get last() { return last; },
  get anchors() { return Object.freeze({overall: anchorStatus, ...status, ...(skill ? {body: bodyOk ? (proxyAnchors ? 'PROXY_MARKED' : 'REAL') : 'UNRESOLVED', ...bodyStatus} : {})}); },
  get drawCallBudget() { return COMBAT_VFX_MAX_DRAW_CALLS+(combatStudy?8:0); },
  get skill() { return skillLayer; },
  get skillEnabled() { return !!skillLayer; },
  get liberation() { return libLayer; },
  get liberationEnabled() { return !!liberation && !!bundle.timeline; },
  get arena() { return arena; },
  get timeline() { return bundle.timeline ?? null; },
  get skillWindow() { const e = bundle.index?.get('SKILL.butterflies'); return e && Number.isFinite(e.start) ? {start: e.start, end: e.end} : null; },
  /** Test/QA probe: the exact shader inputs of every effect (read-only copy). */
  uniforms() {
   const out = {};
   for (const [k, o] of Object.entries(fx)) { out[k] = {visible: o.visible}; for (const [n, u] of Object.entries(U(o))) out[k][n] = u.value?.toArray ? u.value.toArray() : u.value; }
   if (skillLayer) out.skill = skillLayer.uniformsProbe();
   if (libLayer) out.liberation = libLayer.uniformsProbe();
   return out;
  }
 });
}

/** Convenience for the lab/director: score + adapter from an R6.1 plan (sides come from S1_PLACEMENT measurements). */
export function createS1CombatVfx(T, {scene, parent, model, plan, scale, reducedMotion, proxyAnchors = false, proxyOrigin} = {}) {
 return createCombatVfxAdapter(T, {scene, parent, model, bundle: createS1Score(plan.schedule), scale, reducedMotion, proxyAnchors, proxyOrigin});
}

/** S1 + S2: same adapter with the Resonance Skill layer (SIMULATED_HEALING + five guided butterflies). */
export function createS2CombatVfx(T, {scene, parent, model, plan, scale, reducedMotion, proxyAnchors = false, proxyOrigin, targetMode = 'SIMULATED_TARGET'} = {}) {
 return createCombatVfxAdapter(T, {scene, parent, model, bundle: createS2Score(plan.schedule), scale, reducedMotion, proxyAnchors, proxyOrigin, skill: true, targetMode});
}

/** S1 + S2 + S3: adds the Outer Stellarealm Liberation layer (AUTHORIAL; mechanics UNVERIFIED). */
export function createS3CombatVfx(T, {scene, parent, model, plan, scale, reducedMotion, proxyAnchors = false, proxyOrigin, targetMode = 'SIMULATED_TARGET', liberation = true, stageAnchor = null, fidelity = false, study = null, combatStudy = null} = {}) {
 return createCombatVfxAdapter(T, {scene, parent, model, bundle: createS3Score(plan.schedule, {fidelity, study}), scale, reducedMotion, proxyAnchors, proxyOrigin, skill: true, targetMode, liberation, stageAnchor, fidelity,combatStudy});
}
