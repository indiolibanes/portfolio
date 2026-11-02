/** Lip Touch (right), Hair Caress (left) and their rare composition. Playback only: baked quaternion paths, no IK, no
 * geometry queries, no timers. One clock, injected by the existing facial rAF through the body repertoire, which runs a single arm
 * actor at a time, so each bone chain has exactly one writer. */
export const LIP_HAIR = Object.freeze({
 // Seconds. Every run draws its own durations inside these ranges so two episodes are never identical.
 lipRise: Object.freeze([2.0, 2.6]), lipSettle: Object.freeze([.25, .5]), lipTouch: Object.freeze([1.3, 1.8]), lipBack: Object.freeze([1.1, 1.5]), lipReturn: Object.freeze([2.0, 2.6]),
 hairApproach: Object.freeze([2.3, 3.0]), hairStroke: Object.freeze([1.1, 1.6]), hairExit: Object.freeze([.7, 1.0]), hairReturn: Object.freeze([2.0, 2.6]),
 hairLeadIn: Object.freeze([1.1, 1.9]), hold: Object.freeze([2.6, 4.2]), handoff: Object.freeze([.8, 1.3]), maxSeconds: 32,
});
const ease = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * t * (t * (t * 6 - 15) + 10); };

/** Plays a queue of {to, seconds} segments on one baked pose, each with a minimum-jerk ease from the displayed weight. */
export function createWeightPath({pose, invalidate = () => {}}) {
 let weight = 0, queue = [], from = 0, to = 0, elapsed = 0, span = 0, active = false;
 const begin = () => { const next = queue.shift(); if (!next) { active = false; return; } from = weight; to = next.to; span = Math.max(1e-3, next.seconds); elapsed = 0; active = true; };
 return {
  run(keys) { queue = keys.map((k) => ({...k})); begin(); },
  /** Re-target from wherever the pose is now: no jump, no restart from rest. */
  retreat(keys) { this.run(keys); },
  advance(dt) {
   if (!active || !Number.isFinite(dt) || dt <= 0) return;
   elapsed += dt; const t = Math.min(1, elapsed / span); weight = from + (to - from) * ease(t);
   if (weight > 0) pose.apply(weight); else pose.restore(); invalidate();
   if (t >= 1) { weight = to; begin(); }
  },
  reset() { pose.restore(); weight = from = to = elapsed = 0; queue = []; active = false; },
  weight: () => weight, busy: () => active, atBaseline: () => weight === 0 && !active && (pose.atBaseline?.() ?? true), ready: () => !!pose.diagnostics?.().ready,
 };
}

const stream = (seed) => { let state = seed >>> 0; return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; }; };
const draw = (random, [a, b]) => a + (b - a) * random();

/** Left-hand hair caress as a stand-alone actor with the same surface as the chest director (start/advance/busy/release/cancel). */
export function createHairCaress({pose, data, seed = 1, onEvent = () => {}, invalidate = () => {}}) {
 const path = createWeightPath({pose, invalidate}), random = stream(seed), stages = data?.stages ?? {};
 let phase = 'idle', cooldownUntil = 0, time = 0;
 const keys = () => {
  const out = [{to: stages.start, seconds: draw(random, LIP_HAIR.hairApproach)}, {to: stages.end, seconds: draw(random, LIP_HAIR.hairStroke)}];
  if (random() < .45) out.push({to: stages.start, seconds: draw(random, LIP_HAIR.hairStroke) * .9}, {to: stages.end, seconds: draw(random, LIP_HAIR.hairStroke)});
  out.push({to: stages.hoverOut, seconds: draw(random, LIP_HAIR.hairExit)});
  return out;
 };
 const api = {
  /** Contact stroke only; the caller decides when to leave. */
  startApproach() { path.run([{to: stages.start, seconds: draw(random, LIP_HAIR.hairApproach)}]); },
  strokeKeys: () => [{to: stages.end, seconds: draw(random, LIP_HAIR.hairStroke)}],
  leaveKeys: () => [{to: stages.hoverOut, seconds: draw(random, LIP_HAIR.hairExit)}, {to: 0, seconds: draw(random, LIP_HAIR.hairReturn)}],
  path,
  start(canStart = true) {
   if (phase !== 'idle' || !canStart || !path.ready() || !path.atBaseline() || !Number.isFinite(stages.start)) return false;
   phase = 'play'; onEvent('gesture:prepare'); path.run([...keys(), {to: 0, seconds: draw(random, LIP_HAIR.hairReturn)}]); return true;
  },
  advance(dt) {
   if (!Number.isFinite(dt) || dt < 0) return; time += dt; path.advance(dt);
   if (phase === 'play') { if (path.weight() >= stages.start && !api.touched) { api.touched = true; onEvent('gesture:hold'); } if (!path.busy()) { phase = 'idle'; api.touched = false; onEvent('gesture:release'); cooldownUntil = time + 55 + random() * 45; } }
  },
  release() { if (phase === 'idle') return false; path.retreat(api.leaveKeys()); api.touched = false; return true; },
  cancel() { path.reset(); phase = 'idle'; api.touched = false; onEvent('gesture:release'); invalidate(); },
  busy: () => phase !== 'idle', atBaseline: () => path.atBaseline(), diagnostics: () => ({phase, weight: path.weight(), stages, cooldownUntil}),
 };
 return api;
}

/** The rare composition: right hand to the lower lip, left hand caressing hair, a few seconds of stillness, then both hands leave.
 * Facial acting only receives the existing gesture events (prepare, hold, release); its smirk stays asymmetric by its own design. */
export function createLipHairComposition({lip, lipData, hair, seed = 1, onEvent = () => {}, invalidate = () => {}}) {
 const right = createWeightPath({pose: lip, invalidate}), random = stream(seed), chin = lipData?.stages?.signature ?? .7, contact = lipData?.stages?.contact ?? 1;
 let phase = 'idle', elapsed = 0, events = [], variant = 'left-first', contactSent = false;
 const at = (time, run) => events.push({time, run}); const stages = hair.diagnostics().stages;
 const plan = () => {
  const lipRise = draw(random, LIP_HAIR.lipRise), settle = draw(random, LIP_HAIR.lipSettle), touch = draw(random, LIP_HAIR.lipTouch), lead = draw(random, LIP_HAIR.hairLeadIn);
  const approach = draw(random, LIP_HAIR.hairApproach), stroke = draw(random, LIP_HAIR.hairStroke), hold = draw(random, LIP_HAIR.hold), handoff = draw(random, LIP_HAIR.handoff);
  variant = random() < .5 ? 'left-first' : 'right-first'; events = []; contactSent = false;
  const rightDone = .4 + lipRise + settle + touch, leftContact = .4 + lead + approach, caressDone = Math.max(rightDone, leftContact) + stroke, leave = caressDone + hold;
  at(.4, () => right.run([{to: chin, seconds: lipRise}, {to: chin, seconds: settle}, {to: contact, seconds: touch}]));
  at(.4 + lead, () => hair.path.run([{to: stages.start, seconds: approach}]));
  at(Math.max(rightDone, leftContact), () => hair.path.run([{to: stages.end, seconds: stroke}]));
  const leaveLeft = () => hair.path.run(hair.leaveKeys()), leaveRight = () => right.run([{to: chin, seconds: draw(random, LIP_HAIR.lipBack)}, {to: chin, seconds: .3}, {to: 0, seconds: draw(random, LIP_HAIR.lipReturn)}]);
  const first = variant === 'left-first' ? leaveLeft : leaveRight, second = variant === 'left-first' ? leaveRight : leaveLeft;
  at(leave, () => { onEvent('gesture:release'); first(); }); at(leave + handoff, second);
  events.sort((a, b) => a.time - b.time);
 };
 const api = {
  start(canStart = true) {
   if (phase !== 'idle' || !canStart || !right.ready() || !hair.path.ready() || !right.atBaseline() || !hair.path.atBaseline() || !Number.isFinite(stages?.start)) return false;
   plan(); phase = 'play'; elapsed = 0; onEvent('gesture:prepare'); return true;
  },
  advance(dt) {
   if (phase === 'idle' || !Number.isFinite(dt) || dt < 0) return; elapsed += dt;
   while (events.length && events[0].time <= elapsed) events.shift().run();
   right.advance(dt); hair.path.advance(dt);
   if (!contactSent && right.weight() >= contact - 1e-3) { contactSent = true; onEvent('gesture:hold'); }
   if (!events.length && !right.busy() && !hair.path.busy()) { phase = 'idle'; }
   else if (elapsed > LIP_HAIR.maxSeconds) api.release();
  },
  /** Interruption: both arms head home from wherever they are, no snap. */
  release() { if (phase === 'idle') return false; events = []; hair.path.run(hair.leaveKeys()); right.run([{to: Math.min(chin, right.weight()), seconds: .9}, {to: 0, seconds: 1.8}]); return true; },
  cancel() { events = []; right.reset(); hair.path.reset(); phase = 'idle'; contactSent = false; onEvent('gesture:release'); invalidate(); },
  busy: () => phase !== 'idle', atBaseline: () => right.atBaseline() && hair.path.atBaseline(), ready: () => right.ready() && hair.path.ready(),
  diagnostics: () => ({phase, elapsed, variant, right: right.weight(), left: hair.path.weight(), pending: events.length}),
 };
 return api;
}
