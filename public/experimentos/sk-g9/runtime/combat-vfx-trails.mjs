/**
 * R6.2 G11 · thin blue motion trails ("rastros azuis por onde ela passa"), AUTHORIAL.
 *
 * The trails are emitted by BODY points (pelvis, chest, both feet) - never by the arms - and only along the
 * part of the path that was really fast; they fade with age and vanish when she is still.
 *
 * Determinism: the path history is a table of world positions sampled ONCE (30 Hz) through the body director's
 * own `seek` (the same sampler the smart camera guide uses; no second mixer, no clock). A frame is then a pure
 * function of the absolute time: window [t-WINDOW, t] interpolated from the table, so seek / pause / restart /
 * reverse scrub give the same ribbon for the same time, with no per-frame accumulation.
 * One draw call (one BufferGeometry, 4 ribbons), additive, depthWrite off.
 */
export const TRAIL_WINDOW_S = 0.40;
export const TRAIL_SEGMENTS = 14;
export const TRAIL_POINTS = ['pel', 'chest', 'rfoot', 'lfoot'];
const NAMES = {pel: 'Bip001Pelvis', chest: 'Bip001Spine2', rfoot: 'Bip001RFoot', lfoot: 'Bip001LFoot'};
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
/** Speed (in model heights per second) where a trail starts to show / is fully shown. */
export const TRAIL_SPEED_H = Object.freeze({from: 0.9, to: 3.2});

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

const TRAIL_VS = `attribute vec3 aTan; attribute float aSide; attribute float aU; attribute float aA; uniform float uW;
varying float vS; varying float vU; varying float vA;
void main(){ vS=aSide; vU=aU; vA=aA; vec3 vd=normalize(cameraPosition-position); vec3 sd=cross(normalize(aTan+vec3(1e-6)),vd); float l=length(sd); sd=l>1e-5?sd/l:vec3(0.,1.,0.);
 vec3 p=position+sd*aSide*uW*(1.-aU*.8); gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const TRAIL_FS = `uniform vec3 uTint; uniform float uK; varying float vS; varying float vU; varying float vA;
void main(){ float prof=exp(-vS*vS*3.2); float a=uK*vA*prof*pow(1.-vU,1.4); if(a<.004) discard;
 gl_FragColor=vec4(mix(uTint,vec3(1.),.35*prof*(1.-vU))*a,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

/**
 * @param T     three namespace
 * @param parent adapter subtree
 * @param h     model height (world units)
 */
export function createTrailLayer(T, {parent, h}) {
 const R = TRAIL_POINTS.length, S = TRAIL_SEGMENTS + 1, V = R * S * 2;
 const pos = new Float32Array(V * 3), tan = new Float32Array(V * 3), side = new Float32Array(V), au = new Float32Array(V), aa = new Float32Array(V);
 const idx = []; for (let r = 0; r < R; r++) for (let s = 0; s < S - 1; s++) { const b = (r * S + s) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
 const g = new T.BufferGeometry(); g.setIndex(idx);
 const attrs = {position: [pos, 3], aTan: [tan, 3], aSide: [side, 1], aU: [au, 1], aA: [aa, 1]};
 for (const [name, [arr, size]] of Object.entries(attrs)) { const at = new T.BufferAttribute(arr, size); at.setUsage(T.DynamicDrawUsage); g.setAttribute(name, at); }
 const mat = new T.ShaderMaterial({uniforms: {uW: {value: 0.012 * h}, uTint: {value: new T.Vector3(0.32, 0.72, 1.0)}, uK: {value: 0}}, vertexShader: TRAIL_VS, fragmentShader: TRAIL_FS,
  transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending, toneMapped: false, side: T.DoubleSide});
 const mesh = new T.Mesh(g, mat); mesh.name = 'blueMotionTrails'; mesh.frustumCulled = false; mesh.renderOrder = 9; mesh.visible = false; parent.add(mesh);
 const a = [0, 0, 0], b = [0, 0, 0];
 let disposed = false, last = null;
 const hide = () => { mesh.visible = false; last = null; };
 return {
  mesh,
  /** @returns probe {strength, ribbons} or null when nothing is fast enough. `rm` (reduced motion) hides the trails. */
  update(hist, t, rm = false) {
   if (disposed || !hist || rm || !(t > 0)) { hide(); return null; }
   let peak = 0;
   for (let r = 0; r < R; r++) {
    for (let s = 0; s < S; s++) {
     const u = s / (S - 1), tt = t - u * TRAIL_WINDOW_S, t2 = tt - TRAIL_WINDOW_S / (S - 1);
     trailPosition(hist, r, tt, a); trailPosition(hist, r, Math.max(0, t2), b);
     const dt = tt - Math.max(0, t2), sp = dt > 1e-6 ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / dt / h : 0;
     const al = smooth((sp - TRAIL_SPEED_H.from) / (TRAIL_SPEED_H.to - TRAIL_SPEED_H.from)) * (tt >= 0 ? 1 : 0); peak = Math.max(peak, al * (1 - u));
     for (let e = 0; e < 2; e++) {
      const o = ((r * S + s) * 2 + e), o3 = o * 3;
      pos[o3] = a[0]; pos[o3 + 1] = a[1]; pos[o3 + 2] = a[2];
      tan[o3] = a[0] - b[0]; tan[o3 + 1] = a[1] - b[1]; tan[o3 + 2] = a[2] - b[2];
      side[o] = e ? 1 : -1; au[o] = u; aa[o] = al;
     }
    }
   }
   if (peak < 0.01) { hide(); return null; }
   for (const at of Object.values(g.attributes)) at.needsUpdate = true;
   mat.uniforms.uK.value = 0.55; mesh.visible = true; last = {strength: peak, ribbons: R};
   return last;
  },
  hide,
  get probe() { return last; },
  dispose() { if (disposed) return; disposed = true; mesh.removeFromParent(); g.dispose(); mat.dispose(); }
 };
}
