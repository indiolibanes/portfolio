/**
 * R6.2 S3 · authorial cinematic camera (opt-in). Pure function of absolute presentation time plus
 * read-only anchor positions: no clock, RAF, history or second camera owner (the R6.1 director keeps
 * the single owner and applies this pose).
 *
 *  - Ambient beats: slow auto-orbit, A/B period 15/18/20 s PER REVOLUTION (not the sequence length).
 *    The orbit phase is anchored so it arrives at the close azimuth exactly when Liberation starts.
 *  - Liberation: auto-orbit suspended (speed ramps to 0 over 0.8 s before the Skill ends; Liberation
 *    starts after it). Close on the REAL head/hand anchors of Burst02 during condensation (character
 *    faces the camera there in the measured composite), then a wide Outer reveal on the arena anchor.
 *  - Recovery: orbit resumes from where Liberation left it; the natural end return is done by the
 *    director (0.6-0.8 s), interrupt/context loss release immediately.
 *  - Reduced motion: no orbit and no authorial moves (static wide framing).
 */
import {r61CameraPose} from './r61-plan.mjs';

export const R62_ORBIT_PERIODS = Object.freeze([15, 18, 20]);
export const R62_DEFAULT_ORBIT_PERIOD = 18;
export const R62_RETURN_SECONDS = Object.freeze([0.6, 0.7, 0.8]);
export const R62_CLOSE_AZIMUTH = 0.12; // authorial 3/4 front view; character yaw measured -1..-15 deg in 22.5-23.7 s
const RAMP = 0.8;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

/** Integral of the orbit speed factor s(t) (1 outside Liberation, 0 inside, linear ramps of RAMP s). */
export function orbitTravel(t, L0, L1) {
 // s = 1 on [0, L0-R], 1->0 on [L0-R, L0], 0 on [L0, L1], 0->1 on [L1, L1+R], 1 after.
 const a = L0 - RAMP, d = L1 + RAMP;
 let g = 0;
 g += clamp(t, 0, Math.max(0, a));
 if (t > a) { const x = clamp(t, a, L0) - a; g += x - x * x / (2 * RAMP); }
 if (t > L1) { const x = clamp(t, L1, d) - L1; g += x * x / (2 * RAMP); }
 if (t > d) g += t - d;
 return g;
}

const v = (x, y, z) => ({x, y, z});
const lerpV = (a, b, u) => v(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const asV = p => p ? (Array.isArray(p) ? v(p[0], p[1], p[2]) : v(p.x, p.y, p.z)) : null;

/**
 * @param o.plan      R6.1 plan (schedule + keyframes)
 * @param o.timeline  s3Timeline(schedule) (null => R6.1 pose with orbit only)
 * @param o.t         absolute presentation time
 * @param o.aspect    viewport aspect
 * @param o.h         model height
 * @param o.center    VFX centre (bind box) {x,y,z}
 * @param o.arena     field anchor {x,z,floorY}
 * @param o.anchors   {pel, head, rh, lh} world positions read at t (read-only)
 * @param o.period    seconds per orbit revolution
 * @param o.reduced   reduced motion
 */
export function r62CameraFrame({plan, timeline, t, aspect = 16 / 9, h = 2, center = {x: 0, y: 1, z: 0}, arena = null, anchors = {}, period = R62_DEFAULT_ORBIT_PERIOD, reduced = false}) {
 if (!plan?.schedule || !Number.isFinite(t)) throw TypeError('R62 camera: plan and time required');
 if (!(period >= 6 && period <= 120)) throw TypeError('R62 camera: orbit period out of range');
 // Portrait: 1.36 like R6.1 for body shots; 2.1 for arena shots so BOTH lateral field edges stay in frame.
 const T = clamp(t, 0, plan.schedule.duration), portrait = aspect < 0.78, pk = portrait ? 1.36 : 1, pa = portrait ? 2.1 : 1;
 const c = asV(center), pel = asV(anchors.pel) ?? c, head = asV(anchors.head), rh = asV(anchors.rh), lh = asV(anchors.lh);
 const ar = arena ? v(arena.x, arena.floorY, arena.z) : v(c.x, c.y - 0.5 * h, c.z);
 const L0 = timeline?.start ?? Infinity, L1 = timeline ? (timeline.recoveryStart ?? timeline.revealEnd) : Infinity;
 const omega = reduced ? 0 : 2 * Math.PI / period;
 // ---- keyframed shape (radius/elevation/look/fov in model heights; target kind) ----
 const base = time => { const p = r61CameraPose(plan, time, aspect); return {r: p.radius, elev: p.elevation, look: p.look, fov: p.fov, kind: 'base'}; };
 let shape, kindA = 'base', kindB = 'base', u = 0, phase = 'AMBIENT_ORBIT';
 if (!timeline || reduced) {
  shape = reduced ? {r: 4.4 * pk, elev: 0.6, look: 0.42, fov: 36} : base(T);
  phase = reduced ? 'REDUCED_STATIC' : 'AMBIENT_ORBIT';
 } else {
  const g11 = timeline.g11 ?? null, arenaEnd = g11 ? g11.butterflyPeak : Math.max(timeline.peak + 0.5, timeline.revealEnd - 0.3);
  const preT = L0 - 1.0, close = {r: null, elev: 0.03, look: null, fov: 32, kind: 'close'};
  const K = [
   {t: preT, ...base(Math.min(preT, plan.schedule.segments[5]?.start ?? preT))},
   {...close, t: timeline.closePeak - 0.25},
   {...close, t: timeline.closeEnd - 0.25},
   // G11.1: the Stellarealm is seen from INSIDE and the character dominates the frame: the arena base radius is only a floor
   // (the G10-B exact fit decides the real distance), narrower lens, target near mid-body, low camera (see smart-camera dy).
   {t: timeline.revealPeak, r: 1.1 * pa, elev: 0.20, look: 0.46, fov: 40, kind: 'arena'},
   {t: timeline.peak, r: 1.1 * pa, elev: 0.18, look: 0.46, fov: 40, kind: 'arena'},
   {t: arenaEnd, r: 1.1 * pa, elev: 0.18, look: 0.46, fov: 40, kind: 'arena'},
   {t: Math.max(L1 + 0.6, arenaEnd + 0.6), ...base(Math.min(plan.schedule.duration, Math.max(L1 + 0.6, arenaEnd + 0.6)))}
  ];
  if (T <= K[0].t || T >= K.at(-1).t) { shape = base(T); phase = T <= K[0].t ? 'AMBIENT_ORBIT' : 'RECOVERY_ORBIT'; }
  else {
   let i = 0; while (i < K.length - 2 && T > K[i + 1].t) i++;
   const a = K[i], b = K[i + 1]; u = smooth((T - a.t) / (b.t - a.t)); kindA = a.kind; kindB = b.kind;
   shape = {a, b};
   phase = T < L0 ? 'PRE_LIBERATION_SETTLE' : T < timeline.closeEnd ? 'LIBERATION_CLOSE' : T < timeline.peak - 0.2 ? 'OUTER_REVEAL' : T < timeline.peak + 0.4 ? 'PEAK' : T < L1 ? 'DISSIPATION' : 'RECOVERY_SETTLE';
  }
 }
 // ---- close framing from the REAL anchors (head top + both hands), never cut face or hands ----
 const fovFit = f => { const vf = f * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * aspect); return Math.min(vf, hf); };
 const closeTarget = head && rh && lh ? lerpV(head, lerpV(rh, lh, 0.5), 0.42) : v(pel.x, c.y + 0.5 * h, pel.z);
 // A previous artistic ceiling (2.2 model heights, or 2.2*portrait factor) could silently crop
 // hands/head when a source pose spreads farther than the reference frames. Preserve the
 // minimum fit distance rather than claiming that the real anchors remain in view.
 const closeR = () => {
  if (!(head && rh && lh)) return 1.4 * pk;
  const top = v(head.x, head.y + 0.12 * h, head.z);
  const span = Math.max(dist(top, closeTarget), dist(rh, closeTarget), dist(lh, closeTarget)) + 0.08 * h;
  const required = span / Math.tan(fovFit(32) / 2) * 1.15 / h;
  if (!Number.isFinite(required)) throw new TypeError('R62 camera: invalid close anchors');
  return Math.max(0.55, required);
 };
 const targetOf = (kind, look) => kind === 'close' ? closeTarget : kind === 'arena' ? v(ar.x, c.y + look * h, ar.z) : v(pel.x, c.y + look * h, pel.z);
 let r, elev, look, fov, target;
 if (shape.a) {
  const fill = k => k.kind === 'close' ? {...k, r: closeR(), look: (closeTarget.y - c.y) / h} : k;
  const a = fill(shape.a), b = fill(shape.b), L = k => a[k] + (b[k] - a[k]) * u;
  r = L('r'); fov = L('fov'); look = L('look');
  const ta = targetOf(a.kind, a.look), tb = targetOf(b.kind, b.look); target = lerpV(ta, tb, u);
  const lift = (a.elev - (a.kind === 'close' ? 0 : a.look)) + ((b.elev - (b.kind === 'close' ? 0 : b.look)) - (a.elev - (a.kind === 'close' ? 0 : a.look))) * u;
  elev = lift;
 } else { r = shape.r; fov = shape.fov; look = shape.look; target = targetOf('base', look); elev = shape.elev - shape.look; }
 // ---- azimuth: anchored orbit + authorial reveal drift (both suspended/held inside Liberation) ----
 const G = t_ => timeline && !reduced ? orbitTravel(t_, L0, L1) : t_;
 const drift = timeline && !reduced ? 0.35 * smooth((T - timeline.revealStart) / Math.max(0.5, timeline.revealEnd - timeline.revealStart)) : 0;
 const azimuth = reduced ? R62_CLOSE_AZIMUTH : R62_CLOSE_AZIMUTH + omega * (G(T) - (Number.isFinite(L0) ? G(L0) : 0)) + drift;
 const R = r * h, y = Math.max(ar.y + 0.05 * h, target.y + elev * h);
 const position = [target.x + Math.sin(azimuth) * R, y, target.z + Math.cos(azimuth) * R];
 const orbitSpeed = timeline && !reduced ? (T < L0 - RAMP || T > L1 + RAMP ? 1 : T >= L0 && T <= L1 ? 0 : T < L0 ? (L0 - T) / RAMP : (T - L1) / RAMP) : reduced ? 0 : 1;
 return Object.freeze({position, target: [target.x, target.y, target.z], fov: clamp(fov, 20, 60), azimuth, radius: R, phase, orbitPeriod: reduced ? null : period, orbitSpeed,
  closeAnchors: head && rh && lh ? 'REAL_BONES' : 'UNRESOLVED', preset: 'r62-s3-authorial'});
}
