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

export const LIBERATION_MAX_DRAW_CALLS = 5;
/** Radius / contrast A/B presets, relative to the model height (no world-unit or gameplay claim). */
export const LIBERATION_RADIUS_PRESETS = Object.freeze({compact: 1.8, standard: 2.6, wide: 3.4});
export const LIBERATION_CONTRAST_PRESETS = Object.freeze({soft: 0.8, standard: 1.0, strong: 1.25});
export const LIBERATION_COLORS = Object.freeze({blue: [0.18, 0.50, 1.0], violet: [0.42, 0.16, 1.0], gold: [1.0, 0.52, 0.10]});
const NM = 96, TAU = Math.PI * 2;
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const clamp01 = x => Math.max(0, Math.min(1, x));
const hash = (i, j = 0) => { let h = (Math.imul(i + 3, 374761393) + Math.imul(j + 11, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** Same envelope as the S0 score (smoothstep up to the peak, down to the end), per event. */
export const eventEnvelope = (e, t) => !e || t < e.start || t >= e.end ? 0 : smooth(t <= e.peak ? (t - e.start) / (e.peak - e.start) : (e.end - t) / (e.end - e.peak));
const phase = (e, t) => !e ? 0 : clamp01((t - e.start) / (e.end - e.start));

/** G11 tints (violet is deliberately more purple than S3's, gold is a warm amber that survives additive blending). */
export const G11_TINTS = Object.freeze({blue: [0.18, 0.50, 1.0], violet: [0.58, 0.22, 1.0], warm: [1.0, 0.42, 0.34], gold: [1.0, 0.60, 0.12]});
const mix3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const WHITE = [1, 1, 1];
/**
 * G11 AUTHORIAL colour + cancel score, a pure function of absolute time and the schedule-derived windows `g`
 * (see g11Timeline). BLUE -> VIOLET -> GOLD (full before the cancel) -> GIANT BUTTERFLY -> clear.
 * `rm` (reduced motion) keeps the same colours / fades but holds the wings open (no flapping, no scale change).
 */
export function liberationColorScore(t, g, rm = false) {
 if (!g) return {violet: 0, gold: 0, collapse: 0, phase: 'NO_G11', hue: G11_TINTS.blue, line: G11_TINTS.blue, wash: G11_TINTS.blue, hor: G11_TINTS.blue, bf: {a: 0, open: 0, scale: 0, ring: 0, ringR: 0, burst: 0}};
 const violet = smooth((t - g.violetStart) / (g.violetFull - g.violetStart)), gold = smooth((t - g.goldStart) / (g.goldFull - g.goldStart));
 const collapse = smooth((t - g.butterflyStart) / (g.butterflyPeak - g.butterflyStart));
 const inBf = t >= g.butterflyStart && t < g.butterflyEnd;
 const a = !inBf ? 0 : smooth((t - g.butterflyStart) / (g.butterflyOpen - g.butterflyStart)) * (1 - smooth((t - g.butterflyDissolve) / (g.butterflyEnd - g.butterflyDissolve)));
 const mid = (g.butterflyOpen + g.butterflyPeak) / 2;
 const key = (pts) => { for (let i = 0; i < pts.length - 1; i++) if (t < pts[i + 1][0]) return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * smooth((t - pts[i][0]) / (pts[i + 1][0] - pts[i][0])); return pts[pts.length - 1][1]; };
 const open = rm ? 1 : key([[g.butterflyStart, 0.10], [g.butterflyOpen, 1.0], [mid, 0.52], [g.butterflyPeak, 1.06], [g.butterflyEnd, 1.08]]);
 const scale = rm ? 1 : key([[g.butterflyStart, 0.62], [g.butterflyOpen, 0.9], [g.butterflyPeak, 1.0], [g.butterflyEnd, 1.12]]);
 const rT = clamp01((t - g.butterflyOpen) / (g.butterflyEnd - g.butterflyOpen));
 const ring = !inBf || t < g.butterflyOpen ? 0 : Math.sin(Math.PI * Math.pow(rT, 0.7)) * 0.9, ringR = 0.25 + 0.85 * smooth(rT);
 const burst = !inBf || t < g.butterflyDissolve - 0.1 ? 0 : clamp01((t - (g.butterflyDissolve - 0.1)) / (g.butterflyEnd - g.butterflyDissolve + 0.1));
 // violet -> gold passes through a rose-amber key (not a grey/white average), so the hand-over keeps a colour reading.
 const cool = mix3(G11_TINTS.blue, G11_TINTS.violet, violet), hue = gold <= 0 ? cool : gold < 0.5 ? mix3(G11_TINTS.violet, G11_TINTS.warm, gold * 2) : mix3(G11_TINTS.warm, G11_TINTS.gold, gold * 2 - 1);
 const phaseName = t >= g.butterflyEnd ? 'CLEAR' : t >= g.butterflyStart ? 'BUTTERFLY' : gold > 0.5 ? 'GOLD' : violet > 0.5 ? 'VIOLET' : 'BLUE';
 return {violet, gold, collapse, phase: phaseName, hue, line: mix3(hue, WHITE, 0.42 - 0.24 * gold - 0.06 * violet), wash: hue, hor: mix3(hue, WHITE, 0.40 - 0.20 * gold - 0.04 * violet), bf: {a, open, scale, ring, ringR, burst}};
}

const SCR_VS_HEAD = `uniform vec3 uHeadW; uniform float uFaceR; varying vec2 vScr; varying float vOn;`;
const SCR_VS_BODY = `vec4 hv=viewMatrix*vec4(uHeadW,1.); vScr=mv.xy-hv.xy*(mv.z/min(hv.z,-1e-3)); vOn=(hv.z<-1e-3&&uFaceR>0.)?1.:0.;`;
const SCR_FS = `uniform float uFaceR; varying vec2 vScr; varying float vOn; float scrMask(){ return vOn<.5?1.:smoothstep(uFaceR*.75,uFaceR*1.35,length(vScr)); }`;

const FIELD_VS = `varying vec2 vP; void main(){ vP=position.xz*2.3; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const FIELD_FS = `
uniform vec3 uBlue, uViolet, uGold, uLine, uWash, uHor; uniform float uA, uReveal, uPeak, uShock, uViol, uGoldW, uTime, uContrast, uGoldAmt;
varying vec2 vP;
float ring(float r,float c,float w){ return exp(-pow((r-c)/w,2.)); }
void main(){
  // G10-B: the ground is the footprint of the dome (bright horizon ring + soft inner wash), not a radar disc.
  float r=length(vP); if(r>1.2) discard;
  float a=atan(vP.y,vP.x), inside=1.-smoothstep(uReveal-.02,uReveal+.02,r);
  float edge=ring(r,.965,.012)*1.5+ring(r,.93,.05)*.34;
  float halo=r>.965?exp(-(r-.965)*11.)*.55:0.;
  float wash=smoothstep(.2,.95,r)*(1.-smoothstep(.95,.99,r))*.17+exp(-r*r*10.)*.14;
  float orbit=ring(r,.62,.004)*.30+ring(r,.40,.003)*.18+ring(r,.78,.003)*.2;
  float glyph=step(.875,r)*step(r,.905)*pow(abs(cos(a*20.+uTime*.03)),14.);
  // G11: colours come from the score (blue -> violet -> gold); the gold ornaments scale with uGoldAmt, the ring is the cancel shock.
  vec3 col=(uHor*edge+uWash*(wash+halo)+uLine*orbit)*inside;
  float gw=uGoldAmt; col=col*(1.-.5*glyph*gw)+uGold*gw*(glyph*.9+edge*.25+ring(r,.78,.01)*.35)*inside;
  col+=uHor*ring(r,uReveal,.02)*.7*step(uReveal,1.0);
  float sh=uPeak>0.?ring(r,uShock,.03)*uPeak*(1.-smoothstep(.9,1.08,uShock)):0.;
  col+=uGold*.9*sh*inside;
  col*=uA*uContrast; if(max(col.r,max(col.g,col.b))<.004) discard;
  gl_FragColor=vec4(col,1.);${TAIL}`;
const DOME_VS = `${SCR_VS_HEAD} varying vec3 vN;
void main(){ vN=normalize(position); vec4 mv=modelViewMatrix*vec4(position,1.); ${SCR_VS_BODY} gl_Position=projectionMatrix*mv; }`;
const DOME_FS = `${SCR_FS}
uniform vec3 uBlue, uViolet, uGold, uLine, uWash, uHor; uniform float uA, uRise, uViol, uGoldW, uPeak, uTime, uContrast, uGoldAmt;
varying vec3 vN;
float arcLine(vec2 p,vec2 c,float rho,float w){ return exp(-pow((length(p-c)-rho)/w,2.)); }
void main(){
  // G10-B: the Stellarealm ceiling as seen from inside: thin off-centre orbit circles (stereographic plan),
  // a bright horizon ring, soft vertical light shafts and a zenith glow. No meridian wire cage.
  float e=clamp(vN.y,0.,1.); if(e>uRise+.02) discard;
  vec2 p=vN.xz/(1.+vN.y); float cs=cos(uTime*.010), sn=sin(uTime*.010); p=mat2(cs,-sn,sn,cs)*p;
  float w=.0055+.004*e;
  float lines=arcLine(p,vec2(-.20,.10),.52,w)+arcLine(p,vec2(.24,-.06),.46,w)+.85*arcLine(p,vec2(.02,.0),.74,w)
   +.7*arcLine(p,vec2(-.05,-.22),.30,w)+.6*arcLine(p,vec2(.0,.0),.20,w*.8)+.5*arcLine(p,vec2(.0,.0),.90,w);
  float az=atan(vN.z,vN.x);
  float shaft=pow(.5+.5*sin(az*26.+sin(az*7.)*2.2),5.)*smoothstep(0.,.05,e)*exp(-e*2.6)*.34;
  float horizon=exp(-pow(e/.032,2.))*1.35+exp(-e*9.)*.30;
  float zen=pow(e,5.)*.30+exp(-pow(length(p)/.16,2.))*.22;
  float front=exp(-pow((e-uRise)/.03,2.))*.16*step(uRise,.99);
  vec3 col=uLine*(lines*.62*(1.-.35*e))+uWash*(shaft+zen)+uHor*horizon;
  col+=uGold*uGoldAmt*(arcLine(p,vec2(-.20,.10),.52,w*1.4)+arcLine(p,vec2(.0,.0),.74,w*1.4)+.6*arcLine(p,vec2(.02,.0),.90,w*1.3))*.62;
  col+=uHor*front;
  col*=uA*uContrast*scrMask(); if(max(col.r,max(col.g,col.b))<.004) discard;
  gl_FragColor=vec4(col,1.);${TAIL}`;

// G11 giant butterfly: a camera-facing quad (cylindrical billboard, tilted 55 % towards the camera) fitted to the VIEW at its
// distance (so it reads in 16:9 and in portrait), pushed BEHIND the character so she stays in front of the wings.
const BF_VS = `uniform vec3 uCenter; uniform float uBack, uScale, uMin, uMax; varying vec2 vP;
void main(){ vP=position.xy*2.;
 vec3 toCam=cameraPosition-uCenter; vec3 toH=normalize(vec3(toCam.x,0.,toCam.z)+vec3(1e-5,0.,0.)); vec3 n=normalize(mix(toH,normalize(toCam),.55));
 vec3 c=uCenter-toH*uBack; vec3 right=normalize(cross(vec3(0.,1.,0.),n)); vec3 up=cross(n,right);
 float d=length(cameraPosition-c); float halfH=d/projectionMatrix[1][1], halfW=d/projectionMatrix[0][0];
 float s=clamp(min(halfH*.82,halfW*.92)*uScale,uMin,uMax);
 vec3 wp=c+right*vP.x*s+up*vP.y*s; gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.); }`;
const BF_FS = `uniform vec3 uGold, uViolet, uHotC; uniform float uA, uOpen, uTime; varying vec2 vP;
float sdEll(vec2 p,vec2 c,vec2 r,float a){ vec2 q=p-c; float ca=cos(a),sa=sin(a); q=vec2(ca*q.x+sa*q.y,-sa*q.x+ca*q.y); return (length(q/r)-1.)*min(r.x,r.y); }
float smn(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
float sdSeg(vec2 p,vec2 a,vec2 b){ vec2 pa=p-a,ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
void main(){
 vec2 pb=vP; vec2 p=vec2(vP.x/max(uOpen,.07),vP.y); vec2 q=vec2(abs(p.x),p.y);
 float upW=sdEll(q,vec2(.40,.30),vec2(.50,.31),.62), loW=sdEll(q,vec2(.28,-.30),vec2(.31,.24),-.62), tl=sdEll(q,vec2(.17,-.50),vec2(.07,.15),-.28);
 float wing=smn(smn(upW,loW,.09),tl,.05);
 float ins=1.-smoothstep(-.008,.008,wing), edge=exp(-pow(wing/.017,2.)), halo=(wing>0.?exp(-pow(wing/.09,2.)):0.)*(1.-smoothstep(.62,.95,max(abs(pb.x),abs(pb.y))));
 vec2 r0=q-vec2(.03,.02); float ang=atan(r0.y,r0.x), rr=length(r0);
 float vein=pow(abs(cos(ang*8.)),20.)*smoothstep(.10,.42,rr)*ins*(1.-smoothstep(.78,.98,rr));
 float eye=exp(-pow((length(q-vec2(.56,.43))-.085)/.014,2.))*.9+exp(-pow(length(q-vec2(.56,.43))/.045,2.))*.55;
 float eye2=exp(-pow(length(q-vec2(.34,-.34))/.055,2.))*.5;
 float fill=ins*(.28+.22*smoothstep(.8,.0,length(q-vec2(.16,.05))));
 float bd=sdSeg(pb,vec2(0.,-.50),vec2(0.,.28))-.026, hd=length(pb-vec2(0.,.36))-.05;
 float an=min(sdSeg(vec2(abs(pb.x),pb.y),vec2(.01,.40),vec2(.13,.66)),sdSeg(vec2(abs(pb.x),pb.y),vec2(.13,.66),vec2(.17,.68)));
 float body=exp(-pow(min(bd,hd)/.014,2.))*1.1+(1.-smoothstep(-.004,.004,min(bd,hd)))*.55+exp(-pow(an/.007,2.))*.7;
 float glint=pow(.5+.5*sin(ang*13.+uTime*3.+rr*20.),10.)*edge*.5;
 vec3 hot=uHotC;
 vec3 col=uGold*(fill*.8+vein*.5+edge*.9+eye*.9+eye2+body)+hot*(edge*.30+glint*.7+body*.16)+uViolet*halo*.62;
 float m=max(col.r,max(col.g,col.b)); if(m>.95) col*=.95/m;
 col*=uA; if(max(col.r,max(col.g,col.b))<.004) discard;
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
  uniforms: {uLine: col('blue'), uWash: col('blue'), uHor: col('blue'), uGoldAmt: {value: 0}, uBlue: col('blue'), uViolet: col('violet'), uGold: col('gold'), uA: {value: 0}, uReveal: {value: 0}, uPeak: {value: 0}, uShock: {value: 0}, uViol: {value: 0}, uGoldW: {value: 0}, uTime: {value: 0}, uContrast: {value: 1}},
  vertexShader: FIELD_VS, fragmentShader: FIELD_FS}), 6, 'liberationOuterField');
 const dg = new T.SphereGeometry(1, 48, 16, 0, TAU, 0, Math.PI / 2);
 const canopy = mk(dg, new T.ShaderMaterial({...additive({side: T.DoubleSide}),
  uniforms: {uLine: col('blue'), uWash: col('blue'), uHor: col('blue'), uGoldAmt: {value: 0}, uBlue: col('blue'), uViolet: col('violet'), uGold: col('gold'), uA: {value: 0}, uRise: {value: 0}, uViol: {value: 0}, uGoldW: {value: 0}, uPeak: {value: 0}, uTime: {value: 0}, uContrast: {value: 1}, ...headU()},
  vertexShader: DOME_VS, fragmentShader: DOME_FS}), 5, 'liberationCanopyArcs');
 const core = mk(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({...additive({side: T.DoubleSide}),
  uniforms: {uCenter: {value: v3()}, uDirW: {value: v3(0, 0, 1)}, uSize: {value: 1}, uPush: {value: 0}, uBlue: col('blue'), uViolet: col('violet'), uGold: col('gold'), uA: {value: 0}, uTime: {value: 0}, uGrow: {value: 0}, uViol: {value: 0}, ...headU()},
  vertexShader: BILLBOARD_VS, fragmentShader: CORE_FS}), 12, 'liberationEtherealCore');
 const mg = new T.InstancedBufferGeometry(), mq = new T.PlaneGeometry(1, 1); mg.index = mq.index; mg.setAttribute('position', mq.attributes.position); mg.instanceCount = NM; mq.dispose();
 const mPos = new Float32Array(NM * 3), mS = new Float32Array(NM), mA = new Float32Array(NM), mK = new Float32Array(NM);
 for (const [n, a, k] of [['iPos', mPos, 3], ['iS', mS, 1], ['iA', mA, 1], ['iK', mK, 1]]) { const at = new T.InstancedBufferAttribute(a, k); at.setUsage(T.DynamicDrawUsage); mg.setAttribute(n, at); }
 const motes = mk(mg, new T.ShaderMaterial({...additive({side: T.DoubleSide}), uniforms: {uBlue: col('blue'), uGold: col('gold'), ...headU()}, vertexShader: MOTE_VS, fragmentShader: MOTE_FS}), 13, 'liberationMotes');
 const butterfly = mk(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({...additive({side: T.DoubleSide}),
  uniforms: {uCenter: {value: v3()}, uBack: {value: 0}, uScale: {value: 1}, uMin: {value: 0}, uMax: {value: 1}, uGold: col('gold'), uViolet: col('violet'), uHotC: {value: v3(1, 0.78, 0.36)}, uA: {value: 0}, uOpen: {value: 1}, uTime: {value: 0}},
  vertexShader: BF_VS, fragmentShader: BF_FS}), 7, 'liberationGiantButterfly');
 const meshes = {field, canopy, core, motes, butterfly};
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
  if (!(cue.liberationField > 0.002) && !(b.timeline?.g11 && t >= b.timeline.g11.butterflyStart && t < b.timeline.g11.butterflyEnd)) return null;
  const ix = id => b.index.get(id), eC = ix('LIB.condense'), eR = ix('LIB.reveal'), eK = ix('LIB.peak'), eD = ix('LIB.decay');
  const vC = eventEnvelope(eC, t), vR = eventEnvelope(eR, t), vK = eventEnvelope(eK, t), vD = eventEnvelope(eD, t);
  const col3 = S3_COLOR_VARIANTS[cfg.variant], R = cfg.radius * h, time = rm ? 0 : t;
  const g = b.timeline?.g11 ?? null, cs = liberationColorScore(t, g, rm), setTint = u => { u.uLine.value.fromArray(cs.line); u.uWash.value.fromArray(cs.wash); u.uHor.value.fromArray(cs.hor); u.uGold.value.fromArray(G11_TINTS.gold); u.uGoldAmt.value = cs.gold * (1 - 0.55 * cs.collapse); };
  for (const o of Object.values(meshes)) { const u = U(o); if (u.uHeadW) { u.uHeadW.value.copy(c.headW); u.uFaceR.value = 0.14 * h; } }
  const probe = {stage: null, levels: {condense: vC, reveal: vR, peak: vK, decay: vD}, starGate: 0, variant: col3.label, radiusH: cfg.radius, contrast: cfg.contrast, mechanics: col3.mechanics, motes: 0};
  // ---- Outer field + canopy (reveal envelope; peak adds violet arcs, gold ornaments, one gold shock ring) ----
  // G11: the field holds (slightly easing) after its reveal peak so the violet/gold read, then COLLAPSES into the butterfly.
  const fieldLv = !g || t <= eR?.peak ? vR : vR > 0 ? Math.min(1, 1 - 0.15 * smooth((t - eR.peak) / Math.max(1e-3, g.butterflyStart - eR.peak))) * (1 - cs.collapse) : 0;
  if (vR > 0.002 && fieldLv > 0.002) {
   const uR = phase(eR, t), reveal = rm ? 1.05 : 0.05 + 1.0 * smooth(uR / 0.30), rise = rm ? 1 : smooth((uR - 0.08) / 0.32);
   const shock = cs.bf.ringR, viol = cs.violet;
   const f = U(field); field.position.set(c.stage.x, c.stage.floorY + 0.006 * h, c.stage.z); field.scale.set(2.3 * R, 1, 2.3 * R);
   setTint(f); f.uA.value = fieldLv; f.uReveal.value = reveal; f.uPeak.value = cs.bf.ring; f.uShock.value = shock; f.uViol.value = viol; f.uGoldW.value = col3.gold; f.uTime.value = time; f.uContrast.value = cfg.contrast;
   field.visible = true;
   const d = U(canopy); canopy.position.set(c.stage.x, c.stage.floorY, c.stage.z); canopy.scale.set(R * (1 - 0.16 * cs.collapse), R * 0.62 * (1 - 0.16 * cs.collapse), R * (1 - 0.16 * cs.collapse));
   setTint(d); d.uA.value = fieldLv * 0.45; d.uRise.value = rise; d.uViol.value = viol; d.uGoldW.value = col3.gold; d.uPeak.value = vK; d.uTime.value = time; d.uContrast.value = cfg.contrast;
   canopy.visible = rise > 0.01;
   probe.starGate = fieldLv * rise; probe.reveal = reveal; probe.rise = rise; probe.shock = cs.bf.ring > 0.002 ? shock : null; probe.violet = viol; probe.goldOrnament = cs.gold;
  }
  // ---- Ethereal condensation core (no polyhedron) ----
  focus.copy(c.P.rh).add(c.P.lh).multiplyScalar(0.5).lerp(c.P.chest, 0.6); focus.y -= 0.02 * h; // kept low: hands rise to the chin in Burst02
  if (vC > 0.002) {
   const uC = phase(eC, t), k = U(core), grow = rm ? 1 : 0.35 + 0.65 * smooth(uC / 0.55);
   k.uCenter.value.copy(focus); k.uSize.value = 0.24 * h * grow; k.uPush.value = 0.06 * h; k.uA.value = vC * 0.38; k.uTime.value = time; k.uGrow.value = grow; k.uViol.value = 0.4 * col3.violet;
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
  if (vR > 0.002 && fieldLv > 0.002) fieldMotes(fieldLv, 0.15 + 0.85 * cs.gold, 0.02);
  // ---- G11 giant butterfly (cancel of the field): two symmetric wings + central axis, flap, then it bursts into gold motes ----
  probe.g11 = {phase: cs.phase, violet: cs.violet, gold: cs.gold, collapse: cs.collapse, butterfly: cs.bf.a > 0.002 ? {alpha: cs.bf.a, open: cs.bf.open, scale: cs.bf.scale} : null};
  if (cs.bf.a > 0.002 && g) {
   const k = U(butterfly), cx = c.stage.x, cz = c.stage.z;
   k.uCenter.value.set(cx, c.stage.floorY + 1.05 * h, cz); k.uBack.value = 0.55 * h; k.uScale.value = cs.bf.scale; k.uMin.value = 1.3 * h; k.uMax.value = 6 * h;
   k.uA.value = cs.bf.a * 0.9 * cfg.contrast; k.uOpen.value = cs.bf.open; k.uTime.value = time; k.uGold.value.fromArray(G11_TINTS.gold); k.uViolet.value.fromArray(G11_TINTS.violet);
   butterfly.visible = true;
  }
  if (cs.bf.burst > 0.002) for (let i = 0; i < 36; i++) {
   const ang = hash(i, 21) * TAU, up = (hash(i, 22) - 0.35), sp = 0.5 + hash(i, 23), u = cs.bf.burst, rad = (0.3 + 1.5 * u * sp) * h;
   put(c.stage.x + Math.cos(ang) * rad, c.stage.floorY + (1.05 + up * 1.6 * u) * h, c.stage.z + Math.sin(ang) * rad, 0.022 * h * (0.6 + hash(i, 24)), Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.85, 0.9);
  }
  if (vD > 0.002) fieldMotes(vD, 0.6, 0.15);
  if (n) { motes.visible = true; for (const a of Object.values(mg.attributes)) if (a.isInstancedBufferAttribute) a.needsUpdate = true; }
  probe.motes = n;
  probe.stage = cs.bf.a > 0.002 ? 'BUTTERFLY_CANCEL' : vC >= Math.max(vR, vD) && vC > 0.002 ? 'CONDENSE' : vK > 0.35 ? 'PEAK' : vR > 0.002 && phase(eR, t) < 0.45 ? 'OUTER_REVEAL' : vR > 0.002 ? 'DISSIPATION' : vD > 0.002 ? 'RECOVERY_MOTES' : 'NONE';
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
