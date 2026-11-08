import {preserveBodyPose} from './body-handoff.mjs';
import {claimBodyOwner} from './animation-ownership.mjs';
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
export function weightsAt(schedule, t, out = new Array(schedule.segments.length)) {
  const segs = schedule.segments, w = out.fill(0), tt = clamp(t, 0, schedule.duration);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]; if (tt < s.start || tt > s.end) continue;
    const next = segs[i + 1];
    // F2: an explicit hard cut (fade 0 on a non-first step) is half-open, so exactly one clip owns every instant (no 50/50 frame on the boundary).
    const rampIn = s.fade > 0 ? smooth((tt - s.start) / s.fade) : i > 0 ? (tt >= s.start ? 1 : 0) : 1, rampOut = next && next.fade > 0 ? 1 - smooth((tt - next.start) / next.fade) : next ? (tt < next.start ? 1 : 0) : 1;
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
export function createComboSequencer(T, root, clips, schedule,{initialStrength=1,preservePoseOnDispose=false}={}) {
  for (const s of schedule.segments) { const c = clips[s.id]; if (!c) throw Error('Clipe ausente: ' + s.id); if (c.tracks.some((t) => !/\.(?:position|quaternion|scale)$/.test(t.name))) throw Error('Canal não corporal em ' + s.id); }
  const releaseOwner=claimBodyOwner(root,'combo');
  const mixer = new T.AnimationMixer(root), actions = schedule.segments.map((s) => { const a = mixer.clipAction(clips[s.id].clone()); a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.setEffectiveWeight(0); a.play();a.paused=true; return a; });
  let time = 0, paused = false, disposed = false,rate=1,recovery=-1,strength=initialStrength;
  const scratch=new Float64Array(schedule.segments.length),releaseWeights=new Float64Array(schedule.segments.length);
  const apply = () => { const w = weightsAt(schedule, time,scratch); actions.forEach((a, i) => { a.time = clipTimeAt(schedule, i, time); a.setEffectiveWeight(w[i]*strength); }); mixer.update(0); };
  apply();
  return {
    get time() { return time; }, get duration() { return schedule.duration; }, get done() { return time >= schedule.duration; }, status: COMBO_STATUS,
    seek(t) { if (disposed) return;if(!Number.isFinite(t))throw Error('Invalid seek');recovery=-1;time = clamp(t, 0, schedule.duration); apply(); },
    setStrength(v){if(!Number.isFinite(v)||v<0||v>1)throw Error('Invalid entry weight');strength=v;apply();},
    recover(){if(disposed)return;releaseWeights.set(scratch);recovery=0;},
    advance(dt) { if (disposed || paused || !(dt > 0)) return; if(recovery>=0){recovery=Math.min(.45,recovery+dt*rate);const u=smooth(recovery/.45),last=actions.length-1;
      actions.forEach((a,i)=>{if(i===last)a.time=Math.min(schedule.segments[i].clipExit,schedule.segments[i].clipEnter+recovery);scratch[i]=releaseWeights[i]*(1-u)+(i===last?u:0);a.setEffectiveWeight(scratch[i]);});mixer.update(0);if(recovery>=.45)time=schedule.duration;return;}
    time = Math.min(schedule.duration, time + dt*rate); apply(); },
    setPaused(v) { paused = !!v; },
    setSpeed(v){if(!Number.isFinite(v)||v<.1||v>2)throw Error('Invalid speed');rate=v;},
    state() { return {actions:actions.map((a,i)=>({clip:schedule.segments[i].id,time:a.time,weight:a.getEffectiveWeight(),enabled:a.enabled,paused:a.paused})),time, weights: Array.from(scratch), segment: schedule.segments.findIndex((s) => time >= s.start && time <= s.end), status: COMBO_STATUS, paused}; },
    dispose() { if (disposed) return; disposed = true; const release=()=>{mixer.stopAllAction();mixer.uncacheRoot(root);releaseOwner();};if(preservePoseOnDispose)preserveBodyPose(root,release);else release(); },
  };
}

/** Position, velocity and contact penalties augment angular matching. Units: metres, metres/sec. */
export function motionDistance(a,b,{position=120,velocity=8,contact=30}={}){
 let d=poseDistance(a.quaternions,b.quaternions);
 for(const key of ['positions','velocities']){
  if(!a[key]||!b[key]||a[key].length!==b[key].length)throw Error('Missing motion '+key);
  let sum=0;for(let i=0;i<a[key].length;i++)sum+=(a[key][i]-b[key][i])**2;
  d+=Math.sqrt(sum/Math.max(1,a[key].length))*(key==='positions'?position:velocity);
 }
 if(!a.contacts||!b.contacts||a.contacts.length!==b.contacts.length)throw Error('Missing foot contacts');
 for(let i=0;i<a.contacts.length;i++)if(a.contacts[i]!==b.contacts[i])d+=contact;
 return d;
}
/** Adapter used IN PLACE OF the idle/gesture director, never alongside it. */
export function createComboDirector(T,root,clips,schedule,{onEvent=()=>{},entry=0,preservePoseOnDispose=false}={}){
 if(!Number.isFinite(entry)||entry<0||entry>1)throw Error('Invalid combo entry');
 const seq=createComboSequencer(T,root,clips,schedule,{initialStrength:entry>0?0:1,preservePoseOnDispose});let running=false,paused=false,speed=1,disposed=false,recovering=false,entryClock=0,entering=false;
 return {
 start(){if(disposed)return;seq.setStrength(entry>0?0:1);seq.seek(0);running=true;recovering=false;entryClock=0;entering=entry>0;onEvent({type:'start',clip:'SK_COMBO_EXPERIMENTAL'});},
 seek(t){if(!Number.isFinite(t))throw Error('Invalid seek');entering=false;recovering=false;seq.setStrength(1);seq.seek(t);},
 interrupt(){if(!running)return;seq.recover();entering=false;recovering=true;onEvent({type:'recovery',clip:'SK_COMBO_EXPERIMENTAL'});},
 setPaused(v){paused=!!v;seq.setPaused(paused);},setSpeed(v){seq.setSpeed(v);speed=v;},configure(){},
 advance(dt){if(disposed||!running||paused||!Number.isFinite(dt)||dt<=0)return;if(entering){const step=dt,used=Math.min(entry-entryClock,step);entryClock+=used;seq.setStrength(smooth(entryClock/entry));if(entryClock>=entry){entering=false;if(step>used)seq.advance(step-used);if(seq.done){running=false;onEvent({type:'end',clip:'SK_COMBO_EXPERIMENTAL'});}}return;}seq.advance(dt);if(seq.done){running=false;onEvent({type:'end',clip:'SK_COMBO_EXPERIMENTAL'});}},
 dispose(){if(disposed)return;disposed=true;seq.dispose();},
 get state(){return {phase:running?(entering?'entry':recovering?'exit':'run'):'idle',paused,speed,clock:seq.time,duration:seq.duration,progress:seq.time/seq.duration,weights:seq.state().weights,actions:seq.state().actions,mode:'COMBO_EXPERIMENTAL',visualQA:COMBO_STATUS,landing:'SOURCE_OR_OPT_IN_BRIDGE_VISUAL_QA_PENDING'};}
 };
}
