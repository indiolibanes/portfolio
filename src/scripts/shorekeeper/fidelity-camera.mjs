/**
 * F2 · FIDELIDADE camera for the Liberation: montage language (hard cuts), not a continuous orbit.
 *
 * Reference: the Liberation cutscene GIF (5.51 s) has THREE shots separated by TWO hard cuts, measured by frame difference:
 *   shot 1  0.00-3.80 s  continuous close camera: from behind the shoulder round to the face in profile (no cut inside)
 *   cut     3.80 s
 *   shot 2  3.80-4.20 s  arm raised with a flare, close
 *   cut     4.20 s
 *   shot 3  4.20-5.51 s  Stellarealm reveal, held: LOW camera looking UP at the dome ceiling (bright rim ring, orbit arcs, light shafts), her figure small at the bottom centre
 * Runtime clip SK_BURST_02 lasts 5.433 s (77 ms shorter), the right hand starts to rise at ~3.7 s, which agrees with the 3.80 s cut.
 * The mapping is proportional (x 5.433/5.51) and is a CANDIDATE: confidence medium, not a game timestamp.
 *
 * Contract: pure function of absolute presentation time + read-only anchors. No clock, RAF, history, renderer or camera owner:
 * it is a `frameTransform` of the existing R6.x camera. Everything outside the Burst clip window is the existing frame `base`
 * (the approved G11.3 arena framing and its own return), so the release back to the base is a real cut.
 * The camera never compensates body motion: it only follows the real anchors (head, hands).
 */
export const FIDELITY_REFERENCE = Object.freeze({
 source: 'resonance liberation cutscene.gif', durationS: 5.51, cutsS: Object.freeze([3.80, 4.20]),
 clipDurationS: 5.433, mapping: 'PROPORTIONAL_CANDIDATE', confidence: 'MEDIUM'
});
const K = FIDELITY_REFERENCE.clipDurationS / FIDELITY_REFERENCE.durationS;
/** Shot windows relative to the start of the Burst clip (seconds of clip time). */
export const FIDELITY_SHOTS = Object.freeze([
 Object.freeze({id: 'S1_CLOSE_BEHIND_TO_PROFILE', from: 0, to: FIDELITY_REFERENCE.cutsS[0] * K, basis: 'REFERENCE_SHOT_1'}),
 Object.freeze({id: 'S2_HAND_FLARE_CLOSE', from: FIDELITY_REFERENCE.cutsS[0] * K, to: FIDELITY_REFERENCE.cutsS[1] * K, basis: 'REFERENCE_SHOT_2'}),
 Object.freeze({id: 'S3_STELLAREALM_LOW_LOOK_UP', from: FIDELITY_REFERENCE.cutsS[1] * K, to: FIDELITY_REFERENCE.clipDurationS, basis: 'REFERENCE_SHOT_3'})
]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = a => Math.hypot(a[0], a[1], a[2]);
const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

export function fidelityShotAt(tClip) {
 if (!Number.isFinite(tClip)) throw new TypeError('fidelity camera: finite clip time required');
 if (tClip < 0) return null;
 return FIDELITY_SHOTS.find(s => tClip >= s.from && tClip < s.to) ?? null;
}

/** Shot 3: the camera sits low in front of her and looks up at the dome; she stays small at the bottom centre. Fixed pose relative to her ground point. */
function stellarealmLowLookUp({base, shot, anchors, fx, fz, h, aspect}) {
 const feet = anchors.rf && anchors.lf ? Math.min(anchors.rf[1], anchors.lf[1]) : anchors.head[1] - 0.92 * h, pel = anchors.pel ?? anchors.head;
 const D = 3.2 * h, pitch = (aspect < 1 ? 36 : 28) * Math.PI / 180, fov = aspect < 1 ? 78 : 64; // portrait needs a taller view to keep both her and the ring
 const position = [pel[0] + fx * D, feet + 0.15 * h, pel[2] + fz * D];
 const target = [position[0] - fx * Math.cos(pitch) * 5 * h, position[1] + Math.sin(pitch) * 5 * h, position[2] - fz * Math.cos(pitch) * 5 * h];
 return Object.freeze({...base, position, target, fov, phase: shot.id, preset: 'f2-fidelity-cuts', cut: true});
}

/**
 * @param o.base     frame of the existing camera ({position,target,fov,...}) used outside the close shots
 * @param o.tClip    seconds since the Burst clip started (sequence time - burst segment start)
 * @param o.anchors  {head,rh,lh,(pel,rf,lf for shot 3)} world arrays; o.front horizontal anatomic front (unit, world)
 */
export function fidelityCameraFrame({base, tClip, anchors, front, h, aspect = 16 / 9, reduced = false}) {
 if (!base?.position || !base?.target) throw new TypeError('fidelity camera: base frame required');
 const shot = fidelityShotAt(tClip);
 if (reduced || !shot || !anchors?.head || !anchors?.rh || !anchors?.lh || !front || !(h > 0)) return base;
 const {head, rh, lh} = anchors, fl = Math.hypot(front[0], front[2]);
 if (!(fl > 1e-3)) return base; // singular front: keep the existing camera rather than invent a direction
 const fx = front[0] / fl, fz = front[2] / fl, hands = lerp3(rh, lh, 0.5);
 if (shot.id === 'S3_STELLAREALM_LOW_LOOK_UP') return stellarealmLowLookUp({base, shot, anchors, fx, fz, h, aspect});
 const fovDeg = shot.id === 'S1_CLOSE_BEHIND_TO_PROFILE' ? 26 : 28;
 const vf = fovDeg * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * aspect), fit = Math.min(vf, hf);
 const target = shot.id === 'S1_CLOSE_BEHIND_TO_PROFILE' ? lerp3(head, hands, 0.42) : lerp3(head, rh, 0.55);
 const top = [head[0], head[1] + 0.12 * h, head[2]];
 const span = Math.max(len(sub(top, target)), len(sub(rh, target)), len(sub(lh, target))) + 0.08 * h;
 const R = Math.max(0.42 * h, span / Math.tan(fit / 2) * 1.08);
 // azimuth measured from her front: PI = directly behind, 0 = in front of her. Shot 1 slides continuously from over-the-shoulder (0.80 PI, so the hands and the butterfly in front of her are not hidden by her head) to profile (0.50 PI); shot 2 holds a side view.
 const u = shot.id === 'S1_CLOSE_BEHIND_TO_PROFILE' ? smooth((tClip - shot.from) / (shot.to - shot.from)) : 0;
 const az = shot.id === 'S1_CLOSE_BEHIND_TO_PROFILE' ? Math.PI * (0.80 - 0.30 * u) : Math.PI * 0.42;
 const side = 1; // camera passes on her right-hand side (screen-left of her back) for both shots, never changes sign mid shot
 const ca = Math.cos(az), sa = Math.sin(az) * side;
 // front = (fx,fz); right-handed side vector = (fz,-fx)
 const dx = fx * ca + fz * sa, dz = fz * ca - fx * sa;
 const elev = (shot.id === 'S1_CLOSE_BEHIND_TO_PROFILE' ? 0.03 : -0.02) * h;
 const position = [target[0] + dx * R, target[1] + elev, target[2] + dz * R];
 return Object.freeze({...base, position, target, fov: fovDeg, phase: shot.id, preset: 'f2-fidelity-cuts', cut: true});
}


/**
 * F1.4 STUDY_PRESENTATION observation shots (exposition only, NOT reference-derived): after the Burst clip, while the Stellarealm is HELD, the camera
 * keeps looking at the dome and then observes her from the ground and from behind the shoulder. Hard cuts between the three shots (montage language),
 * the first one continues the reference low look-up without a cut. Pure function of time + read-only anchors; the base camera takes over after the hold.
 */
export const STUDY_OBSERVATION_SHOTS = Object.freeze([
 Object.freeze({id: 'STUDY_DOME_LOOKUP_DRIFT', from: 0, to: 0.40}),
 Object.freeze({id: 'STUDY_GROUND_WIDE', from: 0.40, to: 0.70}),
 Object.freeze({id: 'STUDY_SHOULDER_TO_DOME', from: 0.70, to: 1.0})
]);
export function studyObservationFrame({base, t, burstEnd, holdEnd, anchors, front, h, aspect = 16 / 9, reduced = false}) {
 if (!base?.position || !base?.target) throw new TypeError('study camera: base frame required');
 if (![t, burstEnd, holdEnd].every(Number.isFinite) || !(holdEnd > burstEnd)) throw new TypeError('study camera: finite window required');
 if (reduced || t < burstEnd || t >= holdEnd || !anchors?.pel || !front || !(h > 0)) return base;
 const fl = Math.hypot(front[0], front[2]); if (!(fl > 1e-3)) return base;
 const fx = front[0] / fl, fz = front[2] / fl, span = holdEnd - burstEnd, x = (t - burstEnd) / span;
 const shot = STUDY_OBSERVATION_SHOTS.find(s => x >= s.from && x < s.to) ?? STUDY_OBSERVATION_SHOTS.at(-1);
 const u = clamp((x - shot.from) / (shot.to - shot.from), 0, 1), su = smooth(u);
 const pel = anchors.pel, feet = anchors.rf && anchors.lf ? Math.min(anchors.rf[1], anchors.lf[1]) : pel[1] - 0.55 * h, portrait = aspect < 1;
 const rot = (a) => [fx * Math.cos(a) + fz * Math.sin(a), fz * Math.cos(a) - fx * Math.sin(a)]; // direction at azimuth a from her front (PI = behind)
 let position, target, fov;
 if (shot.id === 'STUDY_DOME_LOOKUP_DRIFT') {
  const theta = 0.30 * su, [dx, dz] = rot(theta), D = 2.7 * h, pitch = (26 - 4 * su) * Math.PI / 180;
  fov = portrait ? 78 : 64;
  position = [pel[0] + dx * D, feet + 0.15 * h, pel[2] + dz * D];
  target = [position[0] - dx * Math.cos(pitch) * 5 * h, position[1] + Math.sin(pitch) * 5 * h, position[2] - dz * Math.cos(pitch) * 5 * h];
 } else if (shot.id === 'STUDY_GROUND_WIDE') {
  const [dx, dz] = rot(Math.PI * (0.30 + 0.12 * su)), D = (portrait ? 5.4 : 4.2) * h;
  fov = portrait ? 58 : 46;
  position = [pel[0] + dx * D, feet + 0.30 * h, pel[2] + dz * D];
  target = [pel[0], feet + 0.62 * h, pel[2]];
 } else {
  const [dx, dz] = rot(Math.PI * (0.86 - 0.06 * su)), D = (portrait ? 3.4 : 2.8) * h, pitch = (7 + 4 * su) * Math.PI / 180;
  fov = portrait ? 74 : 58;
  position = [pel[0] + dx * D, feet + 0.85 * h, pel[2] + dz * D];
  target = [position[0] - dx * Math.cos(pitch) * 5 * h, position[1] + Math.sin(pitch) * 5 * h, position[2] - dz * Math.cos(pitch) * 5 * h];
 }
 return Object.freeze({...base, position, target, fov, phase: shot.id, preset: 'f14-study-observation', cut: shot.id !== 'STUDY_DOME_LOOKUP_DRIFT'});
}

/**
 * frameTransform factory for createR62Cinematic's cameraProfile. ctx comes from the cinematic: {rig, h, aspect, plan, reduced}.
 * `inner` (optional) is another transform to apply after (duet integrations).
 */
export function createFidelityFrameTransform(inner = null) {
 return (frame, time, ctx = {}) => {
  let f = frame;
  const seg = ctx.plan?.schedule?.segments?.find(s => s.id === 'SK_BURST_02_ORIGINAL');
  if (seg && ctx.rig?.anchors && Number.isFinite(time)) {
   const A = ctx.rig.anchors, anchors = {head: A.head, rh: A.rh, lh: A.lh, pel: A.pel, rf: A.rf, lf: A.lf}, hold = ctx.plan?.study ? ctx.timeline?.studyHold : null;
   f = fidelityCameraFrame({base: frame, tClip: time - seg.start, anchors, front: ctx.rig.front, h: ctx.h, aspect: ctx.aspect, reduced: ctx.reduced});
   if (hold && time >= seg.end && time < hold.end) f = studyObservationFrame({base: frame, t: time, burstEnd: seg.end, holdEnd: hold.end, anchors, front: ctx.rig.front, h: ctx.h, aspect: ctx.aspect, reduced: ctx.reduced});
  }
  return inner ? inner(f, time, ctx) : f;
 };
}
