/**
 * R6.2 G11.1 · full-bodied blue motion trails ("rastros azuis por onde ela passa"), AUTHORIAL.
 *
 * G11 drew thin 5-px lines. G11.1 draws broad energy ribbons (deep blue body, cyan-white core, violet fringe, streaked)
 * that taper along their length. They are emitted by BODY points (pelvis, chest, both feet) all the time she is fast, and by
 * the two HANDS only at attack speed (never a permanent arm glow); they fade with age and vanish when she is still.
 *
 * Determinism: the path history is a table of world positions sampled ONCE (30 Hz) through the body director's
 * own `seek` (the same sampler the smart camera guide uses; no second mixer, no clock). A frame is then a pure
 * function of the absolute time: window [t-WINDOW, t] interpolated from the table, so seek / pause / restart /
 * reverse scrub give the same ribbon for the same time, with no per-frame accumulation.
 * One draw call (one BufferGeometry, 4 ribbons), additive, depthWrite off.
 */
export const TRAIL_WINDOW_S = 1.15;
export const TRAIL_SEGMENTS = 44;
/** G11.3 orbital beams: ribbons that circle the character (energy-driven), pure function of absolute time and the chest history. */
export const ORBIT_RIBBONS = 5, ORBIT_WINDOW_S = 1.5, ORBIT_PERIOD_S = 1.35;
export const TRAIL_POINTS = ['pel', 'chest', 'rfoot', 'lfoot', 'rhand', 'lhand'];
export const TRAIL_INDEX = Object.freeze(Object.fromEntries(TRAIL_POINTS.map((k, i) => [k, i])));
const NAMES = {pel: 'Bip001Pelvis', chest: 'Bip001Spine2', rfoot: 'Bip001RFoot', lfoot: 'Bip001LFoot', rhand: 'Bip001RHand', lhand: 'Bip001LHand'};
/** Ribbon width factor per anchor (model-height units are applied by the layer). */
export const TRAIL_WIDTH = Object.freeze({pel: 1.0, chest: 0.95, rfoot: 0.62, lfoot: 0.62, rhand: 0.5, lhand: 0.5});
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
/** Speed (in model heights per second) where a trail starts to show / is fully shown. */
export const TRAIL_SPEED_H = Object.freeze({from: 0.7, to: 2.6});
/** Hands only trail at attack speed (the arms are not meant to glow permanently). */
export const TRAIL_HAND_SPEED_H = Object.freeze({from: 2.2, to: 4.6});

/** Samples anchors through `samplePose(t)` (the director body seek). Returns a frozen, read-only history. */
export function buildTrailHistory(root, samplePose, duration, hz = 30) {
 const bones = TRAIL_POINTS.map(k => root.getObjectByName(NAMES[k]));
 if (bones.some(b => !b)) return null;
 const n = Math.floor(duration * hz) + 2, data = TRAIL_POINTS.map(() => new Float32Array(n * 3));
 const probe = new (bones[0].position.constructor)();
 for (let i = 0; i < n; i++) {
  samplePose(Math.min(duration, i / hz)); root.updateMatrixWorld(true);
  bones.forEach((b, k) => { b.getWorldPosition(probe); data[k][i * 3] = probe.x; data[k][i * 3 + 1] = probe.y; data[k][i * 3 + 2] = probe.z; });
 }
 return Object.freeze({hz, n, duration, data});
}

/** Pure: position of anchor `k` at time t (linear interpolation of the table, clamped). */
export function trailPosition(hist, k, t, out = [0, 0, 0]) {
 const f = Math.max(0, Math.min(hist.n - 1.0001, t * hist.hz)), i = Math.floor(f), a = f - i, d = hist.data[k];
 for (let c = 0; c < 3; c++) out[c] = d[i * 3 + c] * (1 - a) + d[(i + 1) * 3 + c] * a;
 return out;
}

const TRAIL_VS = `attribute vec3 aTan; attribute float aSide; attribute float aU; attribute float aA; attribute float aW; attribute float aR; uniform float uW;
varying float vS; varying float vU; varying float vA; varying float vR;
void main(){ vS=aSide; vU=aU; vA=aA; vR=aR; vec3 vd=normalize(cameraPosition-position); vec3 tn=normalize(aTan+vec3(1e-6)); vec3 sd=cross(tn,vd); float l=length(sd); sd=l>1e-5?sd/l:vec3(0.,1.,0.); sd=normalize(mix(vec3(0.,1.,0.),sd,smoothstep(.35,.8,l)));
 float taper=(1.-aU*.72)*(.55+.45*smoothstep(0.,.08,aU)); vec3 p=position+sd*aSide*uW*aW*taper; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const TRAIL_FS = `uniform float uK; varying float vS; varying float vU; varying float vA; varying float vR;
void main(){
 float s2=vS*vS, fade=pow(1.-vU,1.05);
 float body=exp(-s2*1.5), core=exp(-s2*11.), fringe=smoothstep(.35,1.,abs(vS))*(1.-smoothstep(.95,1.,abs(vS)));
 float stk=.72+.28*sin(vU*46.+vS*5.5+vR*7.1)*sin(vU*17.-vS*3.+vR*3.3);
 vec3 deep=vec3(.02,.12,.85), mid=vec3(.08,.34,1.), hot=vec3(.45,.78,1.), vio=vec3(.40,.04,1.);
 vec3 col=deep*body*1.6*stk+mid*body*.5+hot*core*(.42+.30*(1.-vU))+vio*fringe*.85*(1.-.4*vU);
 float a=uK*vA*fade; col*=a; if(max(col.r,max(col.g,col.b))<.004) discard;
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

/**
 * @param T     three namespace
 * @param parent adapter subtree
 * @param h     model height (world units)
 */
export function createTrailLayer(T, {parent, h}) {
 const RB = TRAIL_POINTS.length, R = RB + ORBIT_RIBBONS, S = TRAIL_SEGMENTS + 1, V = R * S * 2;
 const pos = new Float32Array(V * 3), tan = new Float32Array(V * 3), side = new Float32Array(V), au = new Float32Array(V), aa = new Float32Array(V), aw = new Float32Array(V), ar = new Float32Array(V);
 const idx = []; for (let r = 0; r < R; r++) for (let s = 0; s < S - 1; s++) { const b = (r * S + s) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
 const g = new T.BufferGeometry(); g.setIndex(idx);
 const attrs = {position: [pos, 3], aTan: [tan, 3], aSide: [side, 1], aU: [au, 1], aA: [aa, 1], aW: [aw, 1], aR: [ar, 1]};
 for (const [name, [arr, size]] of Object.entries(attrs)) { const at = new T.BufferAttribute(arr, size); at.setUsage(T.DynamicDrawUsage); g.setAttribute(name, at); }
 for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) for (let e = 0; e < 2; e++) { const o = (r * S + s) * 2 + e; aw[o] = r < RB ? TRAIL_WIDTH[TRAIL_POINTS[r]] : 0.62 - 0.06 * (r - RB); ar[o] = r + 1; }
 const mat = new T.ShaderMaterial({uniforms: {uW: {value: 0.13 * h}, uK: {value: 0}}, vertexShader: TRAIL_VS, fragmentShader: TRAIL_FS,
  transparent: true, depthWrite: false, depthTest: true, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcColorFactor, toneMapped: false, side: T.DoubleSide}); // screen blend: overlaps saturate smoothly (G11.3), no hard white slabs
 const mesh = new T.Mesh(g, mat); mesh.name = 'blueMotionTrails'; mesh.frustumCulled = false; mesh.renderOrder = 9; mesh.visible = false; parent.add(mesh);
 const a = [0, 0, 0], b = [0, 0, 0], c0 = [0, 0, 0], c1 = [0, 0, 0];
 let disposed = false, last = null;
 const hide = () => { mesh.visible = false; last = null; };
 const orbit = (r, tt, wide, out) => { // centre = chest history, helix around it
  const j = r - RB, dir = j % 2 ? -1 : 1, ph = dir * 2 * Math.PI * tt / ORBIT_PERIOD_S * (1 + 0.12 * j) + j * 2 * Math.PI / ORBIT_RIBBONS;
  const rad = h * (0.5 + 0.2 * Math.sin(j * 1.7 + tt * 2.1)) * wide, yy = h * (-0.38 + 0.2 * j / (ORBIT_RIBBONS - 1) * 1.9 + 0.2 * Math.sin(tt * 3.2 + j * 2.3));
  trailPosition(hist_, TRAIL_INDEX.chest, tt, c0);
  out[0] = c0[0] + Math.cos(ph) * rad; out[1] = c0[1] + yy; out[2] = c0[2] + Math.sin(ph) * rad;
 };
 let hist_ = null;
 return {
  mesh,
  /** @param energy 0..1 attack/heavy/ultimate energy at t (drives the orbital beams); @param wide ultimate widening >= 1 */
  update(hist, t, rm = false, energy = 0, wide = 1) {
   if (disposed || !hist || rm || !(t > 0)) { hide(); return null; }
   hist_ = hist; let peak = 0;
   for (let r = 0; r < R; r++) {
    const isOrb = r >= RB, hand = !isOrb && TRAIL_POINTS[r].endsWith('hand'), sp0 = hand ? TRAIL_HAND_SPEED_H : TRAIL_SPEED_H, win = isOrb ? ORBIT_WINDOW_S : TRAIL_WINDOW_S;
    for (let s = 0; s < S; s++) {
     const u = s / (S - 1), tt = t - u * win, t2 = tt - win / (S - 1);
     let al;
     if (isOrb) { orbit(r, Math.max(0, tt), wide, a); orbit(r, Math.max(0, t2), wide, b); al = 0.55 * smooth(energy * 1.6) * (tt >= 0 ? 1 : 0) * (1 - 0.15 * u); }
     else {
      trailPosition(hist, r, tt, a); trailPosition(hist, r, Math.max(0, t2), b);
      const dt = tt - Math.max(0, t2), sp = dt > 1e-6 ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / dt / h : 0;
      al = smooth((sp - sp0.from) / (sp0.to - sp0.from)) * (tt >= 0 ? 1 : 0);
     }
     peak = Math.max(peak, al * (1 - u));
     for (let e = 0; e < 2; e++) {
      const o = ((r * S + s) * 2 + e), o3 = o * 3;
      pos[o3] = a[0]; pos[o3 + 1] = a[1]; pos[o3 + 2] = a[2];
      tan[o3] = a[0] - b[0]; tan[o3 + 1] = a[1] - b[1]; tan[o3 + 2] = a[2] - b[2];
      side[o] = e ? 1 : -1; au[o] = u; aa[o] = al;
     }
    }
   }
   if (peak < 0.01) { hide(); return null; }
   for (const n of ['position', 'aTan', 'aSide', 'aU', 'aA']) g.attributes[n].needsUpdate = true;
   mat.uniforms.uK.value = 1.0; mesh.visible = true; last = {strength: peak, ribbons: R, energy};
   return last;
  },
  hide,
  get probe() { return last; },
  dispose() { if (disposed) return; disposed = true; mesh.removeFromParent(); g.dispose(); mat.dispose(); }
 };
}
