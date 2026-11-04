/**
 * C/CL · manual combo sequencer (Attack -> Skill -> Burst -> Recovery), preview only.
 *
 * Contract: ONE AnimationMixer owner. It writes only body TRS tracks through weighted actions (no face morphs, no
 * Root edits, no bone offsets). Time is explicit, so a sequence is reproducible and seekable for QA.
 * It never claims visual approval: `visualQA` stays COMBO_QA_PENDING until a human reviews the video.
 *
 * Transition points are chosen by pose similarity (a light "motion matching"): for every pair (A, B) the exit time in A
 * and the entry time in B that minimise the mean joint angle difference are picked inside bounded windows.
 * Pure functions here are covered by Node tests; the sampler lives in the WebGL harness.
 */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const COMBO_STATUS = 'C_COMBO_QA_PENDING';

/** Angle in degrees between two unit quaternions given as [x,y,z,w]. */
export function quatAngleDeg(a, ai, b, bi) {
  const d = Math.abs(a[ai] * b[bi] + a[ai + 1] * b[bi + 1] + a[ai + 2] * b[bi + 2] + a[ai + 3] * b[bi + 3]);
  return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI;
}
/** Mean angle over `n` joints stored as flat [x,y,z,w,...] arrays. */
export function poseDistance(pa, pb) {
  if (pa.length !== pb.length || pa.length % 4) throw Error('Poses incompatíveis');
  const n = pa.length / 4; let sum = 0;
  for (let i = 0; i < n; i++) sum += quatAngleDeg(pa, i * 4, pb, i * 4);
  return sum / n;
}
/**
 * samples: {fps, frames: Float32Array[]} (one flat pose per frame). Windows are in seconds; returns the best pair.
 * `exitMin` keeps a minimum amount of A and `enterMax` a maximum amount of B skipped, so the clip still reads as itself.
 */
export function findTransition(a, b, {exitFrom, exitTo, enterFrom = 0, enterTo}) {
  const ia = (t) => clamp(Math.round(t * a.fps), 0, a.frames.length - 1), ib = (t) => clamp(Math.round(t * b.fps), 0, b.frames.length - 1);
  if (exitFrom > exitTo || enterFrom > enterTo) throw Error('Janela de transição vazia');
  let best = null;
  for (let i = ia(exitFrom); i <= ia(exitTo); i++) for (let j = ib(enterFrom); j <= ib(enterTo); j++) {
    const d = poseDistance(a.frames[i], b.frames[j]);
    if (!best || d < best.distance) best = {exit: i / a.fps, enter: j / b.fps, distance: d};
  }
  if (!best) throw Error('Janela de transição vazia');
  return best;
}

/**
 * steps: [{id, duration, enter=0, exit=duration, fade=0.25}] where enter/exit are clip times, fade is the blend INTO this
 * step from the previous one (ignored for step 0). Returns absolute segments and an ordered event table.
 */
export function buildComboSchedule(steps) {
  if (!Array.isArray(steps) || !steps.length) throw Error('Combo vazio');
  const segs = []; let cursor = 0;
  steps.forEach((s, i) => {
    const enter = s.enter ?? 0, exit = s.exit ?? s.duration, fade = i === 0 ? 0 : s.fade ?? 0.25;
    if (!(s.duration > 0) || enter < 0 || exit > s.duration + 1e-9 || exit - enter <= fade + 1e-6) throw Error('Janela inválida em ' + s.id);
    const start = i === 0 ? 0 : cursor - fade, end = start + (exit - enter);
    segs.push({id: s.id, clipEnter: enter, clipExit: exit, fade, start, end});
    cursor = end;
  });
  const events = [];
  segs.forEach((s, i) => {
    events.push({t: s.start, event: i === 0 ? 'ENTER' : 'BLEND_IN', clip: s.id, fade: s.fade});
    if (i === segs.length - 1) events.push({t: s.end, event: 'END', clip: s.id});
  });
  return {segments: segs, duration: segs.at(-1).end, events: events.sort((a, b) => a.t - b.t)};
}
/** Weight of every segment at time t (smoothstep cross-fade over each overlap; always sums to 1 inside the sequence). */
export function weightsAt(schedule, t) {
  const segs = schedule.segments, w = new Array(segs.length).fill(0), tt = clamp(t, 0, schedule.duration);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]; if (tt < s.start || tt > s.end) continue;
    const next = segs[i + 1], rampIn = s.fade > 0 ? smooth((tt - s.start) / s.fade) : 1, rampOut = next && next.fade > 0 ? 1 - smooth((tt - next.start) / next.fade) : 1;
    w[i] = Math.min(rampIn, rampOut);
  }
  const sum = w.reduce((a, b) => a + b, 0); if (sum > 0) for (let i = 0; i < w.length; i++) w[i] /= sum;
  return w;
}
/** Clip-local time for segment i at sequence time t. */
export function clipTimeAt(schedule, i, t) { const s = schedule.segments[i]; return clamp(s.clipEnter + (t - s.start), s.clipEnter, s.clipExit); }

/**
 * Non-destructive generic body-owned variant: `Root.quaternion` held at the model's bind rotation (same rule as
 * createBindRootBurstClip, which is restricted to Burst ids). Every other track is shared by reference semantics of
 * AnimationClip.clone(); the source clip is never modified. Only for QA/combos of the already-converted clips.
 */
export function deriveBindRootClip(T, model, original, suffix = '_ROOT_BODY_OWNED') {
  if (!original || !Array.isArray(original.tracks) || !(original.duration > 0)) throw Error('Clipe inválido');
  const roots = []; model?.traverse?.((o) => { if (o.isBone && o.name === 'Root') roots.push(o); });
  if (roots.length !== 1) throw Error('Exige exatamente um osso Root');
  const rest = roots[0].quaternion.clone().normalize(), i = original.tracks.findIndex((t) => t.name === 'Root.quaternion');
  const clip = original.clone(); clip.name = original.name + suffix;
  if (i >= 0) clip.tracks[i] = new T.QuaternionKeyframeTrack('Root.quaternion', [0, original.duration], [...rest.toArray(), ...rest.toArray()]);
  return {clip, changedTracks: i >= 0 ? ['Root.quaternion'] : [], rootMode: 'BIND_STATIC'};
}

/** Runtime driver: one mixer, explicit weights. clips: {id: AnimationClip}. */
export function createComboSequencer(T, root, clips, schedule) {
  for (const s of schedule.segments) { const c = clips[s.id]; if (!c) throw Error('Clipe ausente: ' + s.id); if (c.tracks.some((t) => !/\.(?:position|quaternion|scale)$/.test(t.name))) throw Error('Canal não corporal em ' + s.id); }
  const mixer = new T.AnimationMixer(root), actions = schedule.segments.map((s) => { const a = mixer.clipAction(clips[s.id]); a.setEffectiveWeight(0); a.play(); return a; });
  let time = 0, paused = false, disposed = false;
  const apply = () => { const w = weightsAt(schedule, time); actions.forEach((a, i) => { a.time = clipTimeAt(schedule, i, time); a.setEffectiveWeight(w[i]); }); mixer.update(0); };
  apply();
  return {
    get time() { return time; }, get duration() { return schedule.duration; }, get done() { return time >= schedule.duration; }, status: COMBO_STATUS,
    seek(t) { if (disposed) return; time = clamp(t, 0, schedule.duration); apply(); },
    advance(dt) { if (disposed || paused || !(dt > 0)) return; time = Math.min(schedule.duration, time + Math.min(dt, 0.1)); apply(); },
    setPaused(v) { paused = !!v; },
    state() { return {time, weights: weightsAt(schedule, time), segment: schedule.segments.findIndex((s) => time >= s.start && time <= s.end), status: COMBO_STATUS, paused}; },
    dispose() { if (disposed) return; disposed = true; mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
}
