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
import {BILLBOARD_VS, FACE_FS, TAIL, BUTTERFLY_GLSL, NOISE_GLSL} from './combat-vfx-shaders.mjs';
import {S3_COLOR_VARIANTS} from './combat-vfx-events.mjs';

export const LIBERATION_MAX_DRAW_CALLS = 6; // G11.1: + the single trigger butterfly
/** Radius / contrast A/B presets, relative to the model height (no world-unit or gameplay claim). */
export const LIBERATION_RADIUS_PRESETS = Object.freeze({compact: 1.8, standard: 2.6, wide: 3.4, vast: 7.2});
export const LIBERATION_CONTRAST_PRESETS = Object.freeze({soft: 0.8, standard: 1.0, strong: 1.25});
export const LIBERATION_COLORS = Object.freeze({blue: [0.18, 0.50, 1.0], violet: [0.42, 0.16, 1.0], gold: [1.0, 0.52, 0.10]});
const NM = 224, TAU = Math.PI * 2;
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const clamp01 = x => Math.max(0, Math.min(1, x));
const hash = (i, j = 0) => { let h = (Math.imul(i + 3, 374761393) + Math.imul(j + 11, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** Same envelope as the S0 score (smoothstep up to the peak, down to the end), per event. */
export const eventEnvelope = (e, t) => !e || t < e.start || t >= e.end ? 0 : smooth(t <= e.peak ? (t - e.start) / (e.peak - e.start) : (e.end - t) / (e.end - e.peak));
const phase = (e, t) => !e ? 0 : clamp01((t - e.start) / (e.end - e.start));

/** G11 tints (violet is deliberately more purple than S3's, gold is a warm amber that survives additive blending). */
export const G11_TINTS = Object.freeze({blue: [0.16, 0.46, 1.0], violet: [0.58, 0.22, 1.0], warm: [1.0, 0.34, 0.26], gold: [1.0, 0.50, 0.07]});
const mix3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const WHITE = [1, 1, 1];
/**
 * G11.1 AUTHORIAL colour / trigger / absorb / burst score, a pure function of absolute time and the schedule-derived
 * windows `g` (see g11Timeline). TRIGGER (one butterfly) -> BLUE field -> VIOLET -> GOLD (slow, overlapping ramps) ->
 * ABSORPTION (the field is pulled into her) -> GIANT BUTTERFLY BURST -> clear.
 * `rm` (reduced motion) keeps the same colours / fades but holds the wings open (no flapping, no scale change, no shrink).
 */
export function liberationColorScore(t, g, rm = false) {
 const none = {a: 0, open: 0, scale: 0, ring: 0, ringR: 0, burst: 0, burn: 1.2, flash: 0, chaos: 0};
 if (!g) return {violet: 0, gold: 0, absorb: 0, absorbLin: 0, collapse: 0, phase: 'NO_G11', hue: G11_TINTS.blue, line: G11_TINTS.blue, wash: G11_TINTS.blue, hor: G11_TINTS.blue, trig: {a: 0, flap: 1, dis: 0}, bf: none};
 const violet = smooth((t - g.violetStart) / (g.violetFull - g.violetStart)), gold = smooth((t - g.goldStart) / (g.goldFull - g.goldStart));
 const absorbLin = clamp01((t - g.absorbStart) / (g.butterflyStart - g.absorbStart)), absorb = smooth(absorbLin);
 const inBf = t >= g.butterflyStart && t < g.butterflyEnd, u = inBf ? t - g.butterflyStart : 0;
 const a = !inBf ? 0 : smooth(u / 0.08) * (1 - smooth((t - g.butterflyDissolve) / (g.butterflyEnd - g.butterflyDissolve)));
 const mid = (g.butterflyOpen + g.butterflyPeak) / 2, T2 = g.butterflyPeak + 0.5 * (g.butterflyDissolve - g.butterflyPeak);
 const key = (pts) => { for (let i = 0; i < pts.length - 1; i++) if (t < pts[i + 1][0]) return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * smooth((t - pts[i][0]) / (pts[i + 1][0] - pts[i][0])); return pts[pts.length - 1][1]; };
 const open = rm ? 1 : key([[g.butterflyStart, 0.12], [g.butterflyOpen, 1.0], [mid, 0.62], [g.butterflyPeak, 1.08], [T2, 0.74], [g.butterflyDissolve, 1.06], [g.butterflyEnd, 1.12]]);
 const scale = rm ? 1 : key([[g.butterflyStart, 0.45], [g.butterflyOpen, 1.04], [g.butterflyPeak, 1.0], [g.butterflyEnd, 1.2]]);
 const rT = clamp01((t - g.butterflyStart) / (g.butterflyEnd - g.butterflyStart));
 const ring = !inBf ? 0 : Math.sin(Math.PI * Math.pow(rT, 0.6)) * 0.95, ringR = 0.12 + 0.98 * smooth(rT);
 const burst = !inBf ? 0 : rT;
 // materialise (noise threshold falls) then burn away (threshold rises): energy, not a cut-out
 const burn = !inBf ? 1.2 : Math.max(1.2 * (1 - smooth(u / 0.24)), 1.2 * smooth((t - g.butterflyDissolve) / (g.butterflyEnd - g.butterflyDissolve)));
 const flash = !inBf ? 0 : Math.exp(-u / 0.11) + 0.28 * Math.exp(-Math.pow((t - g.butterflyOpen) / 0.08, 2));
 const chaos = !inBf ? 0 : rm ? 0.4 : 1 - 0.45 * smooth((t - g.butterflyPeak) / (g.butterflyEnd - g.butterflyPeak));
 // violet -> gold passes through a rose-amber key (not a grey/white average), so the hand-over keeps a colour reading.
 const cool = mix3(G11_TINTS.blue, G11_TINTS.violet, violet), hue = gold <= 0 ? cool : gold < 0.5 ? mix3(G11_TINTS.violet, G11_TINTS.warm, gold * 2) : mix3(G11_TINTS.warm, G11_TINTS.gold, gold * 2 - 1);
 const phaseName = t >= g.butterflyEnd ? 'CLEAR' : t >= g.butterflyStart ? 'BUTTERFLY' : t >= g.absorbStart ? 'ABSORB' : gold > 0.5 ? 'GOLD' : violet > 0.5 ? 'VIOLET' : t >= (g.triggerEnd ?? Infinity) ? 'BLUE' : t >= (g.triggerStart ?? Infinity) ? 'TRIGGER' : 'BLUE';
 // single trigger butterfly above the right hand: fades in, flaps, dissolves immediately into the field
 let trig = {a: 0, flap: 1, dis: 0};
 if (g.triggerStart !== undefined && t >= g.triggerStart && t < g.triggerEnd) {
  const dis = smooth((t - g.triggerDissolve) / (g.triggerEnd - g.triggerDissolve));
  trig = {a: smooth((t - g.triggerStart) / (g.triggerFull - g.triggerStart)) * (1 - 0.0 * dis), flap: rm ? 1 : 0.55 + 0.45 * Math.abs(Math.cos((t - g.triggerStart) * Math.PI * 2.1)), dis};
 }
 return {violet, gold, absorb, absorbLin, collapse: absorb, phase: phaseName, hue, line: mix3(hue, WHITE, 0.42 - 0.35 * gold - 0.04 * violet), wash: hue, hor: mix3(hue, WHITE, 0.40 - 0.31 * gold - 0.03 * violet), trig,
  bf: {a, open, scale, ring, ringR, burst, burn, flash, chaos}};
}

const SCR_VS_HEAD = `uniform vec3 uHeadW; uniform float uFaceR; varying vec2 vScr; varying float vOn;`;
const SCR_VS_BODY = `vec4 hv=viewMatrix*vec4(uHeadW,1.); vScr=mv.xy-hv.xy*(mv.z/min(hv.z,-1e-3)); vOn=(hv.z<-1e-3&&uFaceR>0.)?1.:0.;`;
const SCR_FS = `uniform float uFaceR; varying vec2 vScr; varying float vOn; float scrMask(){ return vOn<.5?1.:smoothstep(uFaceR*.75,uFaceR*1.35,length(vScr)); }`;

const FIELD_VS = `varying vec2 vP; void main(){ vP=position.xz*2.3; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const FIELD_FS = `
uniform vec3 uBlue, uViolet, uGold, uLine, uWash, uHor; uniform float uA, uReveal, uPeak, uShock, uViol, uGoldW, uTime, uContrast, uGoldAmt, uAbsorb, uShockA;
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
  // G11: colours come from the score (blue -> violet -> gold); the gold ornaments scale with uGoldAmt.
  vec3 col=(uHor*edge+uWash*(wash+halo)+uLine*orbit)*inside;
  float gw=uGoldAmt; col=col*(1.-.5*glyph*gw)+uGold*gw*(glyph*.9+edge*.25+ring(r,.78,.01)*.35)*inside;
  // G11.1: while the field is absorbed the reveal edge CONVERGES on her: a bright, thickening ring plus inward-running dashes.
  float conv=ring(r,uReveal,.02+.02*uAbsorb)*(.7+3.2*uAbsorb)*step(uReveal,1.0);
  float dash=uAbsorb>0.?pow(abs(cos(a*28.+r*40.)),10.)*ring(r,uReveal,.07)*uAbsorb*.9:0.;
  col+=uHor*(conv+dash);
  col*=uA*uContrast;
  // G11.1 burst shock ring (own amplitude: the field itself is already gone by then), always full radius
  float sh=uShockA>0.?ring(r,uShock,.035)*uShockA*(1.-smoothstep(.9,1.08,uShock)):0.;
  col+=(uGold*.9+uHor*.25)*sh*uContrast;
  if(max(col.r,max(col.g,col.b))<.004) discard;
  gl_FragColor=vec4(col,1.);${TAIL}`;
const DOME_VS = `${SCR_VS_HEAD} varying vec3 vN;
void main(){ vN=normalize(position); vec4 mv=modelViewMatrix*vec4(position,1.); ${SCR_VS_BODY} gl_Position=projectionMatrix*mv; }`;
const DOME_FS = `${SCR_FS}
uniform vec3 uBlue, uViolet, uGold, uLine, uWash, uHor; uniform float uA, uRise, uViol, uGoldW, uPeak, uTime, uContrast, uGoldAmt, uAbsorb;
varying vec3 vN;
float arcLine(vec2 p,vec2 c,float rho,float w){ return exp(-pow((length(p-c)-rho)/w,2.)); }
void main(){
  // G10-B: the Stellarealm ceiling as seen from inside: thin off-centre orbit circles (stereographic plan),
  // a bright horizon ring, soft vertical light shafts and a zenith glow. No meridian wire cage.
  // G11.1: seen from INSIDE at a vast radius (the character fills the frame): broader shafts, a bright rim ring on the
  // ceiling edge (reference: luminous ring + curtains) and a descending front that carries the absorption.
  float e=clamp(vN.y,0.,1.); if(e>uRise+.02) discard;
  vec2 p=vN.xz/(1.+vN.y); float cs=cos(uTime*.010), sn=sin(uTime*.010); p=mat2(cs,-sn,sn,cs)*p;
  float w=.0055+.004*e;
  float lines=arcLine(p,vec2(-.20,.10),.52,w)+arcLine(p,vec2(.24,-.06),.46,w)+.85*arcLine(p,vec2(.02,.0),.74,w)
   +.7*arcLine(p,vec2(-.05,-.22),.30,w)+.6*arcLine(p,vec2(.0,.0),.20,w*.8)+.5*arcLine(p,vec2(.0,.0),.90,w);
  float az=atan(vN.z,vN.x);
  float shaft=pow(.5+.5*sin(az*26.+sin(az*7.)*2.2),5.)*smoothstep(0.,.05,e)*exp(-e*2.2)*.46;
  float horizon=exp(-pow(e/.032,2.))*1.35+exp(-e*9.)*.30;
  float rim=exp(-pow((e-.56)/.018,2.))*.85+exp(-pow((e-.56)/.07,2.))*.16;
  float zen=pow(e,5.)*.30+exp(-pow(length(p)/.16,2.))*.22;
  float front=exp(-pow((e-uRise)/.03,2.))*(.16+1.0*uAbsorb)*step(uRise,.99);
  vec3 col=uLine*(lines*.62*(1.-.35*e))+uWash*(shaft*(1.+1.2*uAbsorb)+zen)+uHor*(horizon+rim*(1.-uAbsorb));
  col+=uGold*uGoldAmt*(arcLine(p,vec2(-.20,.10),.52,w*1.4)+arcLine(p,vec2(.0,.0),.74,w*1.4)+.6*arcLine(p,vec2(.02,.0),.90,w*1.3))*.62;
  col+=uHor*front;
  col*=uA*uContrast*scrMask(); if(max(col.r,max(col.g,col.b))<.004) discard;
  gl_FragColor=vec4(col,1.);${TAIL}`;

// G11.1 giant butterfly: an ENERGY butterfly, not a cut-out. A camera-facing quad (cylindrical billboard, tilted towards the
// camera) fitted to the VIEW at its distance, wider than the frame in 16:9, pushed BEHIND the character so she stays in front of
// the wings. Turbulent domain warp, radial streaks, rays outside the wing, a noise-threshold materialise/burn, a hot flash.
const BF_VS = `uniform vec3 uCenter; uniform float uBack, uScale, uMin, uMax; varying vec2 vP;
void main(){ vP=position.xy*2.;
 vec3 toCam=cameraPosition-uCenter; vec3 toH=normalize(vec3(toCam.x,0.,toCam.z)+vec3(1e-5,0.,0.)); vec3 n=normalize(mix(toH,normalize(toCam),.55));
 vec3 c=uCenter-toH*uBack; vec3 right=normalize(cross(vec3(0.,1.,0.),n)); vec3 up=cross(n,right);
 float d=length(cameraPosition-c); float halfH=d/projectionMatrix[1][1], halfW=d/projectionMatrix[0][0];
 float s=clamp(max(halfW*1.04,halfH*.58)*uScale,uMin,uMax);
 vec3 wp=c+right*vP.x*s+up*vP.y*s; gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.); }`;
const BF_FS = `uniform vec3 uGold, uViolet, uHotC, uBlue; uniform float uA, uOpen, uTime, uBurn, uFlash, uChaos; varying vec2 vP;
${BUTTERFLY_GLSL}
${NOISE_GLSL}
void main(){
 vec2 pb=vP; float tt=uTime;
 vec2 wv=vec2(fbm(pb*3.2+vec2(0.,tt*1.3)),fbm(pb*3.2+vec2(5.2,-tt*1.1)))-.5;
 vec2 pw=pb+wv*(.04+.13*uChaos);
 vec2 p=vec2(pw.x/max(uOpen,.07),pw.y); vec2 q=vec2(abs(p.x),p.y);
 float wing=bfWing(q);
 float ins=1.-smoothstep(-.012,.012,wing);
 float n=.55*fbm(pb*4.5+vec2(3.1,tt*.6))+.45*fbm(pb*13.+vec2(tt*1.7,7.7));
 float keep=smoothstep(uBurn-.06,uBurn+.06,n);
 float burnEdge=exp(-pow((n-uBurn)/.03,2.))*step(.001,uBurn)*step(uBurn,1.2);
 vec2 r0=q-vec2(.03,.02); float ang=atan(r0.y,r0.x), rr=length(r0);
 float stk=pow(abs(cos(ang*22.+fbm(vec2(ang*3.,rr*6.))*4.)),5.);
 float edge=exp(-pow(wing/(.016+.012*uChaos),2.))*(.65+.7*vn(vec2(ang*9.,tt*8.)));
 float sq=1.-smoothstep(.72,1.0,max(abs(pb.x),abs(pb.y)));
 float halo=(wing>0.?exp(-pow(wing/.12,2.)):0.)*sq;
 float rays=(wing>0.?pow(abs(cos(ang*13.+wv.x*6.)),12.)*exp(-wing*5.):0.)*(.4+.6*uChaos)*sq;
 float vein=pow(abs(cos(ang*8.+wv.y*3.)),22.)*smoothstep(.10,.45,rr)*ins*(1.-smoothstep(.8,1.,rr));
 float eye=exp(-pow((length(q-vec2(.56,.43))-.085)/.014,2.))*.9+exp(-pow(length(q-vec2(.56,.43))/.045,2.))*.55;
 float eye2=exp(-pow(length(q-vec2(.34,-.34))/.055,2.))*.5;
 float fill=ins*(.12+.40*stk*smoothstep(.1,.8,rr)+.16*smoothstep(.8,.0,length(q-vec2(.16,.05))));
 float body=bfBody(pb);
 float glint=pow(.5+.5*sin(ang*13.+tt*3.+rr*20.),10.)*edge*.5;
 vec3 W=mix(uGold,uBlue,smoothstep(.34,.95,rr)), Wl=mix(uGold,uBlue,smoothstep(.05,.45,rr));
 vec3 col=W*(fill*.62+vein*.6+edge*.85)+uGold*(eye*.95+eye2+body*1.1)+uHotC*(edge*.45+glint*.9+body*.2+vein*.35)+uViolet*(halo*.85+rays*1.0+edge*.35*(1.-smoothstep(.1,.8,rr)))+Wl*halo*.25;
 float m=max(col.r,max(col.g,col.b)); if(m>.95) col*=.95/m;
 col*=keep;
 col+=(uHotC*.8+uGold*.4)*burnEdge*(ins+.4*halo)*.9;
 col*=uA;
 float fl=uFlash*(exp(-pow(length(pb-vec2(0.,.05))/.30,2.))*.85+exp(-length(pb)*3.2)*.22)*(1.-smoothstep(.55,.98,max(abs(pb.x),abs(pb.y))));
 col+=uHotC*fl;
 if(max(col.r,max(col.g,col.b))<.004) discard;
 gl_FragColor=vec4(col,1.);${TAIL}`;
// G11.1 trigger: ONE small luminous butterfly above the right hand (blue core, white veins, violet breath), flapping slowly.
const TRG_FS = `${FACE_FS}
uniform vec3 uTint, uViolet; uniform float uA, uTime, uFlap, uDis;
varying vec2 vP; varying vec2 vD;
${BUTTERFLY_GLSL}
${NOISE_GLSL}
void main(){
 vec2 pb=vP*1.08; vec2 p=vec2(pb.x/max(uFlap,.12),pb.y); vec2 q=vec2(abs(p.x),p.y);
 float wing=bfWing(q), ins=1.-smoothstep(-.015,.015,wing);
 float sqm=1.-smoothstep(.55,.98,max(abs(vP.x),abs(vP.y)));
 float edge=exp(-pow(wing/.022,2.)), halo=(wing>0.?exp(-pow(wing/.2,2.)):0.)*sqm;
 vec2 r0=q-vec2(.03,.02); float ang=atan(r0.y,r0.x), rr=length(r0);
 float vein=pow(abs(cos(ang*8.)),18.)*smoothstep(.08,.4,rr)*ins;
 float spots=exp(-pow(length(q-vec2(.56,.43))/.05,2.))*.8+exp(-pow(length(q-vec2(.34,-.34))/.05,2.))*.45;
 float core=smoothstep(.75,.0,length(q-vec2(.18,.10)))*ins;
 vec3 col=uTint*(ins*.38+edge*.95+core*.55+spots)+vec3(.86,.95,1.)*(vein*.6+bfBody(pb)*.85+edge*.3+core*.22)+uViolet*halo*.85;
 float n=fbm(pb*5.), thr=uDis*1.3, keep=smoothstep(thr-.14,thr+.04,n+.02);
 col*=keep; col+=vec3(.9,.95,1.)*exp(-pow((n-thr)/.05,2.))*step(.001,uDis)*(ins+halo*.4)*.9;
 col*=uA*faceMask(vP); if(max(col.r,max(col.g,col.b))<.004) discard;
 gl_FragColor=vec4(min(col,vec3(1.)),1.);${TAIL}`;
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
 * @param opts.radius   field radius in model heights (A/B presets above; G11.1 default = vast)
 * @param opts.contrast field/canopy gain (A/B presets above)
 * @param opts.variant  'OUTER' | 'INNER_AUTHORIAL' | 'SUPERNAL_AUTHORIAL' (explicit flag only)
 */
export function createLiberationLayer(T, {parent, h, bundle, radius = LIBERATION_RADIUS_PRESETS.vast, contrast = LIBERATION_CONTRAST_PRESETS.standard, variant = 'OUTER'}) {
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
  uniforms: {uLine: col('blue'), uWash: col('blue'), uHor: col('blue'), uGoldAmt: {value: 0}, uBlue: col('blue'), uViolet: col('violet'), uGold: col('gold'), uA: {value: 0}, uReveal: {value: 0}, uPeak: {value: 0}, uShock: {value: 0}, uViol: {value: 0}, uGoldW: {value: 0}, uTime: {value: 0}, uContrast: {value: 1}, uAbsorb: {value: 0}, uShockA: {value: 0}},
  vertexShader: FIELD_VS, fragmentShader: FIELD_FS}), 6, 'liberationOuterField');
 const dg = new T.SphereGeometry(1, 64, 20, 0, TAU, 0, Math.PI / 2);
 const canopy = mk(dg, new T.ShaderMaterial({...additive({side: T.DoubleSide}),
  uniforms: {uLine: col('blue'), uWash: col('blue'), uHor: col('blue'), uGoldAmt: {value: 0}, uBlue: col('blue'), uViolet: col('violet'), uGold: col('gold'), uA: {value: 0}, uRise: {value: 0}, uViol: {value: 0}, uGoldW: {value: 0}, uPeak: {value: 0}, uTime: {value: 0}, uContrast: {value: 1}, uAbsorb: {value: 0}, ...headU()},
  vertexShader: DOME_VS, fragmentShader: DOME_FS}), 5, 'liberationCanopyArcs');
 const core = mk(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({...additive({side: T.DoubleSide}),
  uniforms: {uCenter: {value: v3()}, uDirW: {value: v3(0, 0, 1)}, uSize: {value: 1}, uPush: {value: 0}, uBlue: col('blue'), uViolet: col('violet'), uGold: col('gold'), uA: {value: 0}, uTime: {value: 0}, uGrow: {value: 0}, uViol: {value: 0}, ...headU()},
  vertexShader: BILLBOARD_VS, fragmentShader: CORE_FS}), 12, 'liberationAbsorbCore');
 const mg = new T.InstancedBufferGeometry(), mq = new T.PlaneGeometry(1, 1); mg.index = mq.index; mg.setAttribute('position', mq.attributes.position); mg.instanceCount = NM; mq.dispose();
 const mPos = new Float32Array(NM * 3), mS = new Float32Array(NM), mA = new Float32Array(NM), mK = new Float32Array(NM);
 for (const [n, a, k] of [['iPos', mPos, 3], ['iS', mS, 1], ['iA', mA, 1], ['iK', mK, 1]]) { const at = new T.InstancedBufferAttribute(a, k); at.setUsage(T.DynamicDrawUsage); mg.setAttribute(n, at); }
 const motes = mk(mg, new T.ShaderMaterial({...additive({side: T.DoubleSide}), uniforms: {uBlue: col('blue'), uGold: col('gold'), ...headU()}, vertexShader: MOTE_VS, fragmentShader: MOTE_FS}), 13, 'liberationMotes');
 const butterfly = mk(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({...additive({side: T.DoubleSide}),
  uniforms: {uCenter: {value: v3()}, uBack: {value: 0}, uScale: {value: 1}, uMin: {value: 0}, uMax: {value: 1}, uGold: col('gold'), uBlue: col('blue'), uViolet: col('violet'), uHotC: {value: v3(1, 0.80, 0.42)}, uA: {value: 0}, uOpen: {value: 1}, uTime: {value: 0}, uBurn: {value: 1.2}, uFlash: {value: 0}, uChaos: {value: 0}},
  vertexShader: BF_VS, fragmentShader: BF_FS}), 7, 'liberationGiantButterfly');
 const trigger = mk(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({...additive({side: T.DoubleSide}),
  uniforms: {uCenter: {value: v3()}, uDirW: {value: v3(0, 0, 1)}, uSize: {value: 1}, uPush: {value: 0}, uTint: {value: v3(0.28, 0.66, 1.0)}, uViolet: {value: v3(0.52, 0.30, 1.0)}, uA: {value: 0}, uTime: {value: 0}, uFlap: {value: 1}, uDis: {value: 0}, ...headU()},
  vertexShader: BILLBOARD_VS, fragmentShader: TRG_FS}), 14, 'liberationTriggerButterfly');
 const meshes = {field, canopy, core, motes, butterfly, trigger};
 const U = o => o.material.uniforms;
 const neutral = new Map(Object.values(meshes).map(o => [o, Object.fromEntries(Object.entries(U(o)).map(([k, u]) => [k, u.value?.clone ? u.value.clone() : u.value]))]));
 const neutralize = () => {
  for (const a of [mPos, mS, mA, mK]) a.fill(0);
  for (const [o, init] of neutral) for (const [k, u] of Object.entries(U(o))) { if (u.value?.copy) u.value.copy(init[k]); else u.value = init[k]; }
  for (const o of Object.values(meshes)) { o.visible = false; o.position.set(0, 0, 0); o.scale.set(1, 1, 1); }
 };
 const focus = v3(), tmp = v3(), bfc = v3();

 /** ctx: {t, cue, rm, bundle, headW, P:{chest, rh, lh}, stage:{x, z, floorY}} */
 function update(c) {
  neutralize(); last = null;
  const {t, cue, rm, bundle: b} = c;
  const g = b.timeline?.g11 ?? null, live = cue.liberationField > 0.002 || (g && t >= g.absorbStart && t < g.butterflyEnd);
  if (!live) return null;
  const ix = id => b.index.get(id), eC = ix('LIB.condense'), eR = ix('LIB.reveal'), eK = ix('LIB.peak'), eD = ix('LIB.decay');
  const vC = eventEnvelope(eC, t), vR = eventEnvelope(eR, t), vK = eventEnvelope(eK, t), vD = eventEnvelope(eD, t);
  const col3 = S3_COLOR_VARIANTS[cfg.variant], R = cfg.radius * h, time = rm ? 0 : t;
  const cs = liberationColorScore(t, g, rm), setTint = u => { u.uLine.value.fromArray(cs.line); u.uWash.value.fromArray(cs.wash); u.uHor.value.fromArray(cs.hor); u.uGold.value.fromArray(G11_TINTS.gold); u.uGoldAmt.value = cs.gold * (1 - 0.12 * cs.absorb); };
  for (const o of Object.values(meshes)) { const u = U(o); if (u.uHeadW) { u.uHeadW.value.copy(c.headW); u.uFaceR.value = 0.14 * h; } }
  bfc.set(c.P.chest.x, c.P.chest.y + 0.05 * h, c.P.chest.z);
  const probe = {stage: null, levels: {condense: vC, reveal: vR, peak: vK, decay: vD}, starGate: 0, variant: col3.label, radiusH: cfg.radius, contrast: cfg.contrast, mechanics: col3.mechanics, motes: 0};
  // ---- Outer field + canopy ----
  // G11.1: the field GROWS slowly, HOLDS (full strength) while the hue moves blue -> violet -> gold, is ABSORBED into her
  // (reveal edge converges, dome curtain lowers and contracts), and only then does the giant butterfly burst.
  const holdLv = !g || t <= eR?.peak ? vR : vR > 0 ? 0.94 : 0;
  const fadeEnd = g ? 1 - smooth((t - (g.butterflyStart - 0.28)) / 0.28) : 1;
  const fieldLv = holdLv * fadeEnd;
  if (fieldLv > 0.002 && vR > 0.002) {
   const uR = phase(eR, t), grow = rm ? 1.05 : 0.05 + 1.0 * smooth(uR / 0.42), rise = rm ? 1 : smooth((uR - 0.10) / 0.40);
   const ab = rm ? 0 : cs.absorb, reveal = grow + (0.03 - grow) * ab, domeRise = rise * (1 - ab);
   const f = U(field); field.position.set(c.stage.x, c.stage.floorY + 0.006 * h, c.stage.z); field.scale.set(2.3 * R, 1, 2.3 * R);
   setTint(f); f.uA.value = fieldLv; f.uReveal.value = reveal; f.uPeak.value = 0; f.uShock.value = 0; f.uViol.value = cs.violet; f.uGoldW.value = col3.gold; f.uTime.value = time; f.uContrast.value = cfg.contrast; f.uAbsorb.value = cs.absorb;
   field.visible = true;
   const d = U(canopy), sh = 1 - 0.30 * ab; canopy.position.set(c.stage.x, c.stage.floorY, c.stage.z); canopy.scale.set(R * sh, R * 0.74 * sh, R * sh);
   setTint(d); d.uA.value = fieldLv * 0.5; d.uRise.value = domeRise; d.uViol.value = cs.violet; d.uGoldW.value = col3.gold; d.uPeak.value = vK; d.uTime.value = time; d.uContrast.value = cfg.contrast; d.uAbsorb.value = cs.absorb;
   canopy.visible = domeRise > 0.01;
   probe.starGate = fieldLv * Math.max(0, 1 - cs.absorb * 1.25) * rise; probe.reveal = reveal; probe.rise = domeRise; probe.violet = cs.violet; probe.goldOrnament = cs.gold; probe.absorb = cs.absorb;
  }
  // ---- G11.1 burst shock ring on the ground (own amplitude; the field itself is gone) ----
  if (cs.bf.ring > 0.002) {
   const f = U(field); field.position.set(c.stage.x, c.stage.floorY + 0.006 * h, c.stage.z); field.scale.set(2.3 * R, 1, 2.3 * R);
   if (!field.visible) { setTint(f); f.uA.value = 0; f.uReveal.value = 1.05; f.uContrast.value = cfg.contrast; field.visible = true; }
   f.uShock.value = cs.bf.ringR; f.uShockA.value = cs.bf.ring; f.uGold.value.fromArray(G11_TINTS.gold); probe.shock = cs.bf.ringR;
  }
  // ---- G11.1 trigger: ONE butterfly above the right hand, dissolving at once into the field (no swarm, no core, no converging motes) ----
  if (cs.trig.a > 0.002) {
   const k = U(trigger);
   focus.copy(c.P.lh); focus.y += 0.17 * h + (rm ? 0 : 0.010 * h * Math.sin(t * 4.4)); // G11.2: the RAISED hand of the real animation is the LEFT one (measured: LH +0.07 h, RH -0.14 h vs chest)
   const ex = cs.trig.dis, exp3 = Math.pow(ex, 1.4);
   k.uCenter.value.copy(focus); k.uSize.value = 0.50 * h * (1 + 3.2 * exp3); k.uPush.value = 0.06 * h; k.uA.value = cs.trig.a * (1 - 0.55 * smooth((ex - 0.35) / 0.65));
   k.uTime.value = time; k.uFlap.value = cs.trig.flap; k.uDis.value = cs.trig.dis;
   trigger.visible = true;
   if (ex > 0.001) { // vertiginous expansion: an energy bloom born at the butterfly that outgrows it and hands over to the field
    const kc = U(core), fl = smooth(ex * 1.25) * (1 - smooth((ex - 0.72) / 0.28));
    kc.uCenter.value.copy(focus); kc.uSize.value = (0.6 + 7.5 * exp3) * h; kc.uPush.value = 0.05 * h; kc.uA.value = 0.95 * fl; kc.uTime.value = time; kc.uGrow.value = 1; kc.uViol.value = 0.6;
    kc.uBlue.value.set(0.22, 0.60, 1.0); kc.uViolet.value.set(0.40, 0.08, 1.0); core.visible = kc.uA.value > 0.003;
   }
   probe.trigger = {alpha: cs.trig.a, flap: cs.trig.flap, dissolve: cs.trig.dis, count: 1, anchor: focus.toArray()};
  }
  // ---- Motes ----
  let n = 0;
  const put = (x, y, z, s, a, k) => { if (n >= NM || a < 0.003) return; mPos[n * 3] = x; mPos[n * 3 + 1] = y; mPos[n * 3 + 2] = z; mS[n] = s; mA[n] = a; mK[n] = k; n++; };
  // trigger hand-over: a short, SMALL spark fan from the butterfly (not a swarm) as it becomes the field
  if (cs.trig.dis > 0.001 && cs.trig.dis < 0.999) for (let i = 0; i < 14; i++) {
   const ang = hash(i, 31) * TAU, el = (hash(i, 32) - 0.35) * 1.2, sp = 0.35 + 0.8 * hash(i, 33), u = cs.trig.dis;
   put(focus.x + Math.cos(ang) * Math.cos(el) * sp * u * 0.5 * h, focus.y + Math.sin(el) * sp * u * 0.5 * h, focus.z + Math.sin(ang) * Math.cos(el) * sp * u * 0.5 * h, 0.014 * h * (0.7 + hash(i, 34)), Math.sin(Math.PI * u) * 0.9, 0.0);
  }
  const fieldMotes = (lv, kGold, rise0, count) => { for (let i = 0; i < count; i++) {
   const ang = hash(i, 5) * TAU, rr = (0.12 + 0.86 * hash(i, 6) * hash(i, 61)) * R, per = 2.6 + hash(i, 7) * 1.6, ph = rm ? 0.4 : ((t / per + hash(i, 8)) % 1);
   put(c.stage.x + Math.cos(ang) * rr, c.stage.floorY + (rise0 + ph * 1.6 + 1.6 * hash(i, 62) * (rr / R)) * h, c.stage.z + Math.sin(ang) * rr, 0.03 * h * (1 + hash(i, 9)), lv * Math.sin(Math.PI * ph) * 0.8, kGold);
  } };
  if (fieldLv > 0.002 && vR > 0.002) fieldMotes(fieldLv * (1 - cs.absorb), 0.15 + 0.85 * cs.gold, 0.02, 40);
  // ---- G11.1 absorption: the field's light streams (spiralling) into her chest, a warm core grows there ----
  focus.copy(c.P.chest); focus.y += 0.04 * h;
  if (cs.absorbLin > 0 && t < (g?.butterflyStart ?? 0) + 0.12) {
   const ua = cs.absorbLin, wide = 0.2 * h;
   if (!rm) for (let i = 0; i < 96; i++) {
    const delay = hash(i, 41) * 0.45, q = clamp01((ua - delay) / 0.55), e = q * q * (3 - 2 * q), a0 = hash(i, 42) * TAU, rr0 = (0.25 + 0.7 * hash(i, 43)) * R * (0.6 + 0.4 * hash(i, 44)), y0 = (0.05 + hash(i, 45) * 2.4) * h;
    const sw = a0 + 2.4 * e, rad = rr0 * (1 - e) + wide * (1 - e) * 0.0;
    const x = c.stage.x + Math.cos(sw) * rad, y = c.stage.floorY + y0 * (1 - e), z = c.stage.z + Math.sin(sw) * rad, k2 = e * e;
    put(x + (focus.x - x) * k2, y + (focus.y - y) * k2, z + (focus.z - z) * k2, 0.034 * h * (1.3 - 0.5 * e), Math.pow(Math.sin(Math.PI * q), 0.7) * 0.95, 0.35 + 0.65 * cs.gold);
   }
   const kc = U(core), grow = rm ? 1 : 0.4 + 0.6 * smooth(ua), atk = cs.bf.a > 0 ? Math.exp(-(t - g.butterflyStart) / 0.10) : 1;
   kc.uCenter.value.copy(focus); kc.uSize.value = (0.55 + 0.9 * smooth(ua)) * h * (rm ? 1 : 1); kc.uPush.value = 0.06 * h; kc.uA.value = 0.85 * smooth(ua * 1.3) * atk; kc.uTime.value = time; kc.uGrow.value = grow; kc.uViol.value = 0.3;
   kc.uBlue.value.fromArray(G11_TINTS.gold); kc.uViolet.value.fromArray(G11_TINTS.warm);
   core.visible = kc.uA.value > 0.003; probe.absorbCore = {grow, focus: focus.toArray(), label: 'ETHEREAL_NO_POLYHEDRON'};
  }
  // ---- G11.1 giant butterfly: an energy burst shaped as two symmetric wings + central axis, then burned into gold motes ----
  probe.g11 = {phase: cs.phase, violet: cs.violet, gold: cs.gold, absorb: cs.absorb, collapse: cs.absorb, trigger: cs.trig.a > 0.002 ? {alpha: cs.trig.a, dissolve: cs.trig.dis} : null,
   butterfly: cs.bf.a > 0.002 ? {alpha: cs.bf.a, open: cs.bf.open, scale: cs.bf.scale, burn: cs.bf.burn, flash: cs.bf.flash} : null};
  if ((cs.bf.a > 0.002 || cs.bf.flash > 0.01) && g) {
   const k = U(butterfly);
   k.uCenter.value.copy(bfc); k.uBack.value = 0.4 * h; k.uScale.value = cs.bf.scale * 1.12; k.uMin.value = 1.5 * h; k.uMax.value = 20 * h;
   k.uA.value = cs.bf.a * 0.80 * cfg.contrast; k.uOpen.value = cs.bf.open; k.uTime.value = time; k.uBurn.value = cs.bf.burn; k.uFlash.value = cs.bf.flash; k.uChaos.value = cs.bf.chaos;
   k.uGold.value.fromArray(G11_TINTS.gold); k.uBlue.value.set(0.16, 0.50, 1.0); k.uViolet.value.set(0.50, 0.10, 1.0);
   butterfly.visible = true;
  }
  if (cs.bf.burst > 0.001 && g) {
   const u = cs.bf.burst, base = bfc;
   for (let i = 0; i < 176; i++) {
    const ang = hash(i, 21) * TAU, el = (hash(i, 22) - 0.5) * 2.0, sp = 0.45 + 1.4 * hash(i, 23), delay = hash(i, 25) * 0.25, uu = clamp01((u - delay) / (1 - delay)), e = 1 - Math.pow(1 - uu, 2.2);
    const rad = (0.2 + 3.4 * e * sp) * h, wob = rm ? 0 : 0.25 * h * Math.sin(uu * 9 + hash(i, 26) * TAU) * uu;
    put(base.x + Math.cos(ang) * rad * (1 - 0.35 * Math.abs(el)) + wob, base.y + Math.sin(el * 1.1) * rad * 0.75, base.z + Math.sin(ang) * rad * (1 - 0.35 * Math.abs(el)), 0.034 * h * (0.5 + hash(i, 24)) * (1 - 0.5 * uu), Math.sin(Math.PI * Math.min(1, uu * 1.05)) * 0.95, hash(i, 27) < 0.5 ? 0.0 : 0.85 + 0.15 * hash(i, 28));
   }
  }
  if (vD > 0.002 && !(cs.bf.a > 0.002)) fieldMotes(vD * 0.5, 0.6, 0.15, 14);
  if (n) { motes.visible = true; for (const a of Object.values(mg.attributes)) if (a.isInstancedBufferAttribute) a.needsUpdate = true; }
  probe.motes = n;
  probe.stage = cs.bf.a > 0.002 ? 'BUTTERFLY_BURST' : cs.absorbLin > 0 && t < (g?.butterflyStart ?? 0) ? 'ABSORPTION' : cs.trig.a > 0.002 ? 'TRIGGER_BUTTERFLY' : vC >= Math.max(vR, vD) && vC > 0.002 ? 'CONDENSE' : vK > 0.35 ? 'PEAK' : vR > 0.002 && phase(eR, t) < 0.45 ? 'OUTER_REVEAL' : vR > 0.002 ? 'DISSIPATION' : vD > 0.002 ? 'RECOVERY_MOTES' : 'NONE';
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
