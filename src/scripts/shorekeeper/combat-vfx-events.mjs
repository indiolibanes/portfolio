/**
 * R6.2 S1 · authorial event windows for Basic Attack / Heavy Attack / blue core.
 *
 * Data only: no DOM, Three.js, timers, clock or randomness. The windows are
 * AUTHORIAL presentation seconds placed on the unchanged R6.1 source segments;
 * they are NOT game hit frames, GIF/PSA timestamps or a canonical skill timeline.
 * Real hit/contact frames stay PENDING (null times, no intensity) until an
 * explicitly authorized video/GLB source supplies them.
 *
 * Placement evidence (see R62_S1_EVENTS.csv): for each source clip the peak is
 * the most prominent local maximum of the faster hand's world speed, measured on
 * the UNBLENDED core of the segment (cross-fade edges are excluded because the
 * G7 pose discontinuity makes them look like 8-15 body-heights/s "strikes").
 */
import {createCombatVisualScore} from './combat-visual-score.mjs';

export const S2_SKILL_CLIP = 'SK_SKILL_01_ORIGINAL';
export const S1_ROLE_BY_CLIP = Object.freeze({
 SK_ATTACK_01_ORIGINAL: 'BASIC',
 SK_ATTACK_02_ORIGINAL: 'BASIC',
 SK_ATTACK_03_ORIGINAL: 'BASIC',
 SK_ATTACK_L02_ORIGINAL: 'HEAVY'
});

/** Mapping handed to the S0 score. Confidence can never be canonical in S0. */
export function s1SourceMapping(extra = {}) {
 const m = {};
 for (const [id, role] of Object.entries(S1_ROLE_BY_CLIP)) m[id] = {role, confidence: 'SOURCE_ROLE_UNVERIFIED'};
 return {...m, ...extra};
}

const HAND_EVIDENCE = 'AUTHORIAL_PLACEMENT:peak=hand_speed_local_max_unblended_core(R6.1 composite);NOT_A_GAME_HIT_FRAME';

/**
 * Seconds relative to each segment start, on the reference durations of the
 * real R6.1 sources (refLen). Windows are rescaled for other durations.
 * envelope = [start, peak, end] of the blue hand envelope; core likewise.
 * hand = dominant hand measured at the peak (sets the primary side only).
 */
export const S1_PLACEMENT = Object.freeze({
 SK_ATTACK_01_ORIGINAL: {n: 1, refLen: 3.633, hand: 'R', peak: 1.60, envelope: [0.90, 1.60, 2.50], core: [1.75, 2.40, 3.20]},
 SK_ATTACK_02_ORIGINAL: {n: 2, refLen: 5.733, hand: 'R', peak: 1.37, envelope: [0.70, 1.37, 2.30], core: [1.55, 2.20, 3.40]},
 SK_ATTACK_03_ORIGINAL: {n: 3, refLen: 3.867, hand: 'L', peak: 2.03, envelope: [1.30, 2.03, 2.90], core: [2.20, 2.80, 3.60]},
 SK_ATTACK_L02_ORIGINAL: {n: 4, refLen: 4.667, hand: 'R', peak: 2.65, prep: [0.90, 2.00, 2.80], release: [2.15, 2.65, 3.45]}
});

/**
 * Visual identity per source. All values are authorial art direction.
 * Distinguishability is by side, bend, length, filament count, tint and size,
 * not by any claim about the game animation.
 */
export const S1_VISUAL_VARIANTS = Object.freeze({
 SK_ATTACK_01_ORIGINAL: Object.freeze({label: 'BASIC_1', tint: [0.30, 0.82, 1.00], bend: +0.55, length: 0.62, width: 0.050, filaments: 1, glints: 0.0, secondary: 0.30, flash: 0, gain: 1.00, glow: 0.18, accumulation: 0.70}),
 SK_ATTACK_02_ORIGINAL: Object.freeze({label: 'BASIC_2', tint: [0.18, 0.46, 1.00], bend: -0.70, length: 0.78, width: 0.058, filaments: 2, glints: 0.9, secondary: 0.35, flash: 0, gain: 1.05, glow: 0.20, accumulation: 0.90}),
 SK_ATTACK_03_ORIGINAL: Object.freeze({label: 'BASIC_3', tint: [0.62, 0.84, 1.00], bend: +0.30, length: 0.88, width: 0.068, filaments: 2, glints: 0.6, secondary: 0.85, flash: 1, gain: 0.95, glow: 0.24, accumulation: 1.15}),
 SK_ATTACK_L02_ORIGINAL: Object.freeze({label: 'HEAVY_CANDIDATE', tint: [0.50, 0.80, 1.00], bend: 0, length: 0, width: 0, filaments: 0, glints: 0, secondary: 0, flash: 0, gain: 1.0, glow: 0.22, accumulation: 1.35})
});

function fail(msg) { throw new TypeError('S1 events: ' + msg); }

/** Rescale a [a,b,c] window authored on refLen to the real segment, keeping it inside the unblended core. */
function fit(window, refLen, seg, nextFade) {
 const len = seg.end - seg.start, k = len / refLen;
 const lo = Math.max(0, seg.fade ?? 0) + 0.02, hi = len - Math.max(0, nextFade) - 0.02;
 if (!(hi - lo > 0.3)) fail('segment too short for ' + seg.id);
 let [a, b, c] = window.map(x => x * k);
 a = Math.max(a, lo); c = Math.min(c, hi);
 b = Math.min(Math.max(b, a + 0.05), c - 0.05);
 if (!(a < b && b < c)) fail('window collapsed for ' + seg.id);
 return [seg.start + a, seg.start + b, seg.start + c];
}

/**
 * Build the S1 event list for a schedule (the shape accepted by S0: {duration, segments}).
 * Segments absent from the schedule are skipped, never substituted by another clip.
 */
export function authorS1Events(schedule) {
 if (!schedule || !Array.isArray(schedule.segments)) fail('schedule');
 const segs = schedule.segments, events = [];
 segs.forEach((seg, i) => {
  const p = S1_PLACEMENT[seg.id];
  if (!p) return;
  const nextFade = segs[i + 1]?.fade ?? 0;
  const ref = ' ref=' + p.refLen + 's';
  if (S1_ROLE_BY_CLIP[seg.id] === 'BASIC') {
   const [s, pk, e] = fit(p.envelope, p.refLen, seg, nextFade);
   events.push({id: `BASIC_${p.n}.envelope`, clipId: seg.id, channel: 'blueAttack', basis: 'AUTHORIAL', evidence: HAND_EVIDENCE + ';hand=' + p.hand + ref, start: s, peak: pk, end: e});
   const [cs, cp, ce] = fit(p.core, p.refLen, seg, nextFade);
   events.push({id: `BASIC_${p.n}.core`, clipId: seg.id, channel: 'blueCore', basis: 'AUTHORIAL', evidence: 'AUTHORIAL_SIMULATED_ACCUMULATION_MARKER:no hit/target/Empirical Data state;accumulation=' + S1_VISUAL_VARIANTS[seg.id].accumulation + ref, start: cs, peak: cp, end: ce});
   events.push({id: `BASIC_${p.n}.hit_frame`, clipId: seg.id, channel: 'blueAttack', basis: 'PENDING', evidence: 'PENDING:contact_frame_requires_authorized_video_or_GLB_evidence', start: null, peak: null, end: null});
  } else {
   const [ps, pp, pe] = fit(p.prep, p.refLen, seg, nextFade);
   events.push({id: 'HEAVY.prep', clipId: seg.id, channel: 'blueCore', basis: 'AUTHORIAL', evidence: 'AUTHORIAL_PREPARATION_CONCENTRATION;NOT_ILLATION;' + HAND_EVIDENCE + ref, start: ps, peak: pp, end: pe});
   const [rs, rp, re] = fit(p.release, p.refLen, seg, nextFade);
   events.push({id: 'HEAVY.release', clipId: seg.id, channel: 'heavyPulse', basis: 'AUTHORIAL', evidence: 'AUTHORIAL_SINGLE_RELEASE_PULSE;no_contact_no_damage;' + HAND_EVIDENCE + ref, start: rs, peak: rp, end: re});
   events.push({id: 'HEAVY.hit_frame', clipId: seg.id, channel: 'heavyPulse', basis: 'PENDING', evidence: 'PENDING:release_frame_requires_authorized_video_or_GLB_evidence', start: null, peak: null, end: null});
   events.push({id: 'HEAVY.illation_condition', clipId: seg.id, channel: 'heavyPulse', basis: 'PENDING', evidence: 'PENDING:ILLATION_NOT_MODELED(needs 5 Empirical Data state; not reproduced as common Heavy)', start: null, peak: null, end: null});
  }
 });
 return events;
}

/**
 * R6.2 S2 · Resonance Skill candidate. Same rules as S1: AUTHORIAL presentation seconds on the unchanged
 * source segment, never game frames. Hand-activity local maximum of the Skill clip: t=2.40 s (left hand,
 * 1.39 body-heights/s, prominence 1.23); that instant is the release (cast) anchor.
 * Order is enforced: heal.peak <= butterflies.start (pre-emission -> expansion -> release -> pursuit -> dissipation).
 */
export const S2_PLACEMENT = Object.freeze({
 refLen: 5.233, hand: 'L', castPeak: 2.40,
 heal: [1.20, 2.25, 3.40],        // pre-emission 0-25 %, expansion, dissipation (phase derived by the adapter)
 butterflies: [2.40, 3.30, 4.70]  // five staggered releases, pursuit, dissipation
});
export const S2_SIMULATION_LABELS = Object.freeze({healing: 'SIMULATED_HEALING', target: 'SIMULATED_TARGET', hp: 'NO_REAL_HP_CHANGED'});

export function authorS2Events(schedule) {
 if (!schedule || !Array.isArray(schedule.segments)) fail('schedule');
 const segs = schedule.segments, i = segs.findIndex(s => s.id === S2_SKILL_CLIP);
 if (i < 0) return [];
 const seg = segs[i], nextFade = segs[i + 1]?.fade ?? 0, p = S2_PLACEMENT, ref = ' ref=' + p.refLen + 's';
 const ev = 'AUTHORIAL_PLACEMENT:cast=hand_speed_local_max_unblended_core(R6.1 composite);hand=' + p.hand + ';NOT_A_GAME_FRAME' + ref;
 if (seg.end - seg.start - (seg.fade ?? 0) - nextFade < 1.5) fail('Skill segment too short for the authorial heal/butterfly window');
 const [hs, hp, he] = fit(p.heal, p.refLen, seg, nextFade), [bs, bp, be] = fit(p.butterflies, p.refLen, seg, nextFade);
 if (hp > bs) fail('heal expansion must precede the butterfly release');
 return [
  {id: 'SKILL.heal', clipId: seg.id, channel: 'healingPulse', basis: 'AUTHORIAL', evidence: 'SIMULATED_HEALING;NO_REAL_HP_CHANGED;' + ev, start: hs, peak: hp, end: he},
  {id: 'SKILL.butterflies', clipId: seg.id, channel: 'guidedButterflies', basis: 'AUTHORIAL', evidence: 'FIVE_GUIDED_BUTTERFLIES;SIMULATED_TARGET;not_combat_engine;' + ev, start: bs, peak: bp, end: be},
  {id: 'SKILL.heal_frame', clipId: seg.id, channel: 'healingPulse', basis: 'PENDING', evidence: 'PENDING:heal_frame_requires_authorized_video_or_GLB_evidence', start: null, peak: null, end: null},
  {id: 'SKILL.cast_frame', clipId: seg.id, channel: 'guidedButterflies', basis: 'PENDING', evidence: 'PENDING:cast_frame_requires_authorized_video_or_GLB_evidence', start: null, peak: null, end: null},
  {id: 'SKILL.real_target', clipId: seg.id, channel: 'guidedButterflies', basis: 'PENDING', evidence: 'PENDING:real_enemy_target_not_modeled(SIMULATED_TARGET_only);Spectro_damage_not_simulated', start: null, peak: null, end: null}
 ];
}

/** S1 + S2 score bundle: the Skill source is mapped SKILL (SOURCE_ROLE_UNVERIFIED, never canonical). */
export function createS2Score(schedule) {
 return createS1Score(schedule, {[S2_SKILL_CLIP]: {role: 'SKILL', confidence: 'SOURCE_ROLE_UNVERIFIED'}}, authorS2Events(schedule));
}

/** Highest-start segment active at t (the incoming clip during a blend); null outside every segment. */
export function resolveClipId(schedule, t) {
 let id = null, start = -Infinity;
 for (const s of schedule.segments) if (t >= s.start && t < s.end && s.start >= start) { id = s.id; start = s.start; }
 return id;
}

/** Everything the adapter needs, built once from a schedule. */
export function createS1Score(schedule, extraMapping = {}, extraEvents = []) {
 const mapping = s1SourceMapping(extraMapping), events = [...authorS1Events(schedule), ...extraEvents];
 const score = createCombatVisualScore({duration: schedule.duration, segments: schedule.segments.map(s => ({id: s.id, start: s.start, end: s.end}))}, mapping, events);
 const index = new Map(events.filter(e => e.basis !== 'PENDING').map(e => [e.id, Object.freeze({...e})]));
 const hand = Object.freeze(Object.fromEntries(Object.entries(S1_PLACEMENT).map(([id, pl]) => [id, pl.hand])));
 return Object.freeze({score, events: Object.freeze(events.map(e => Object.freeze({...e}))), index, mapping, schedule, hand});
}

/** CSV rows for R62_S1_EVENTS.csv (pure; used by the delivery script and by tests). */
export function s1EventRows(bundle) {
 const head = ['id', 'clipId', 'channel', 'basis', 'start_s', 'peak_s', 'end_s', 'role', 'roleConfidence', 'evidence'];
 const rows = bundle.events.map(e => [e.id, e.clipId, e.channel, e.basis, e.start ?? '', e.peak ?? '', e.end ?? '', bundle.mapping[e.clipId]?.role ?? '', bundle.mapping[e.clipId]?.confidence ?? '', e.evidence]);
 return [head, ...rows].map(r => r.map(c => typeof c === 'number' ? c.toFixed(3) : /[",\n]/.test(String(c)) ? '"' + String(c).replaceAll('"', '""') + '"' : String(c)).join(',')).join('\n') + '\n';
}

// ---------------------------------------------------------------- R6.2 S3 · Liberation (Outer Stellarealm)
export const S3_LIBERATION_CLIP = 'SK_BURST_02_ORIGINAL';
export const S3_RECOVERY_CLIP = 'SK_IDLE_01_ORIGINAL';
/**
 * Fractions of the real Burst02 / recovery segments (AUTHORIAL art direction, not game frames).
 * condense = pre-emission + condensation while the camera closes (character faces the camera in
 * the measured 22.4-23.8 s window); reveal = wide Outer field; peak = blue/violet/gold accent beat;
 * decay = rising dissipation motes on the recovery source (the field itself fades in the reveal tail). Every start is clamped to >= Skill end by the S0 score.
 */
export const S3_PLACEMENT = Object.freeze({
 condense: [0.04, 0.20, 0.34], reveal: [0.26, 0.46, 1.00], peak: [0.50, 0.585, 0.72], decay: [0.24, 0.34, 0.75]
});
/**
 * F2 FIDELIDADE placement (REFERENCE_DERIVED, confidence MEDIUM): in the Liberation cutscene GIF the Stellarealm is NOT visible during shots 1-2
 * (0-4.20 s: close camera, small butterflies, hand flare) and appears only after the second hard cut (4.20 s of 5.51 s) as a low look up at the dome.
 * Fractions of the Burst02 segment (x 5.433/5.51 proportional mapping): the reveal starts at the second cut (0.762), the peak sits late, the trigger
 * butterfly (anchored to condense/reveal) therefore holds through shot 1 and bursts into the hand flare right before the cut.
 */
export const S3_PLACEMENT_FIDELITY = Object.freeze({
 condense: [0.04, 0.20, 0.34], reveal: [0.762, 0.86, 1.00], peak: [0.80, 0.88, 0.97], decay: [0.24, 0.34, 0.75]
});
/** Colour variants are AUTHORIAL_COLOR_VARIANTS. Inner/Supernal depend on Intro Skills in the game and are
 *  NEVER selected by elapsed time; only an explicit QA flag may select them. */
export const S3_COLOR_VARIANTS = Object.freeze({
 OUTER: Object.freeze({label: 'OUTER_AUTHORIAL', violet: 0.35, gold: 0.55, mechanics: 'UNVERIFIED'}),
 INNER_AUTHORIAL: Object.freeze({label: 'INNER_AUTHORIAL_COLOR_VARIANT', violet: 0.85, gold: 0.30, mechanics: 'UNVERIFIED_REQUIRES_INTRO_SKILL'}),
 SUPERNAL_AUTHORIAL: Object.freeze({label: 'SUPERNAL_AUTHORIAL_COLOR_VARIANT', violet: 0.85, gold: 1.00, mechanics: 'UNVERIFIED_REQUIRES_INTRO_SKILL'})
});
const LIB_EVIDENCE = 'AUTHORIAL_PLACEMENT:fraction_of_real_Burst02_segment;Outer_field_art_only;NOT_A_GAME_FRAME;Inner/Supernal_NOT_TRIGGERED_BY_TIME';

function windowIn(seg, frac, minStart) {
 const len = seg.end - seg.start;
 let [a, b, c] = frac.map(x => seg.start + x * len);
 a = Math.max(a, minStart, seg.start + (seg.fade ?? 0)); c = Math.min(c, seg.end - 0.001);
 b = Math.min(Math.max(b, a + 0.05), c - 0.05);
 if (!(a < b && b < c)) fail('liberation window collapsed for ' + seg.id);
 return [a, b, c];
}

/** liberationField events, strictly after the complete Skill segment (S0 also enforces it). */
export function authorS3Events(schedule, placement = S3_PLACEMENT) {
 if (!schedule || !Array.isArray(schedule.segments)) fail('schedule');
 const segs = schedule.segments, burst = segs.find(s => s.id === S3_LIBERATION_CLIP), rec = segs.find(s => s.id === S3_RECOVERY_CLIP);
 const skill = segs.find(s => s.id === S2_SKILL_CLIP);
 if (!burst) return [];
 if (!skill) fail('liberation requires the Skill segment to define its start');
 if (burst.end - burst.start < 2) fail('Burst segment too short for the authorial liberation');
 const minStart = skill.end + 0.001, p = placement;
 const [cs, cp, ce] = windowIn(burst, p.condense, minStart), [rs, rp, re] = windowIn(burst, p.reveal, minStart), [ks, kp, ke] = windowIn(burst, p.peak, minStart);
 const out = [
  {id: 'LIB.condense', clipId: burst.id, channel: 'liberationField', basis: 'AUTHORIAL', evidence: 'PRE_EMISSION_CONDENSATION;camera_close;' + LIB_EVIDENCE, start: cs, peak: cp, end: ce},
  {id: 'LIB.reveal', clipId: burst.id, channel: 'liberationField', basis: 'AUTHORIAL', evidence: 'OUTER_STELLAREALM_REVEAL;' + LIB_EVIDENCE, start: rs, peak: rp, end: re},
  {id: 'LIB.peak', clipId: burst.id, channel: 'liberationField', basis: 'AUTHORIAL', evidence: 'PEAK_BLUE_VIOLET_GOLD_ACCENT;' + LIB_EVIDENCE, start: ks, peak: kp, end: ke}
 ];
 if (rec) { const [ds, dp, de] = windowIn(rec, p.decay, minStart); out.push({id: 'LIB.decay', clipId: rec.id, channel: 'liberationField', basis: 'AUTHORIAL', evidence: 'DISSIPATION_RECOVERY;' + LIB_EVIDENCE, start: ds, peak: dp, end: de}); }
 out.push(
  {id: 'LIB.source_frame', clipId: burst.id, channel: 'liberationField', basis: 'PENDING', evidence: 'PENDING:Burst_activation_frame_requires_authorized_video_or_PSA(sourceFrame:null)', start: null, peak: null, end: null},
  {id: 'LIB.intro_skill_stage', clipId: burst.id, channel: 'liberationField', basis: 'PENDING', evidence: 'PENDING:Inner/Supernal_require_Intro_Skill_events_not_modeled', start: null, peak: null, end: null},
  {id: 'LIB.field_radius_gameplay', clipId: burst.id, channel: 'liberationField', basis: 'PENDING', evidence: 'PENDING:gameplay_radius_in_metres_unknown(art_radius_relative_to_model_height_only)', start: null, peak: null, end: null});
 return out;
}

/** Timeline consumed by the S3 camera and director (pure; null without a Burst). */
/**
 * G11 · AUTHORIAL colour / cancel score of the Outer Stellarealm. Pure function of the schedule (no PSA, no
 * sourceFrame, no game timestamps). BLUE (prepare/expand) -> VIOLET -> GOLD (clearly before the cancel) ->
 * GIANT BUTTERFLY (the field itself is cancelled as two wings + axis) -> field gone -> sequence restart.
 * Fractions are of the real Burst02 segment; the butterfly is anchored to the END of the Burst so it sits on
 * the authorial cancel / return-to-rotation beat and ends inside the Liberation decay window.
 */
export const G11_PLACEMENT = Object.freeze({
 // G11.1: slower, overlapping hue ramps (fractions of the real Burst02 segment), absorption BEFORE the burst.
 violet: [0.426, 0.702], gold: [0.640, 0.860],
 absorbLeadS: 1.05, butterflyLeadS: 0.30, butterflyOpenS: 0.28, butterflyPeakS: 0.42, butterflyDissolveS: 0.40, butterflyTailS: 0.95,
 // G11.1 trigger: ONE butterfly above the right hand, anchored to the condensation / reveal windows.
 triggerInS: 0.10, triggerFullS: 0.35, triggerDissolveLeadS: 0.58, triggerEndTailS: 0.14
});
/** F2 FIDELIDADE: violet/gold are skipped by the palette (windows kept only to satisfy the ordering contract, after the trigger); the field is HELD to the end of the clip. */
export const G11_PLACEMENT_FIDELITY = Object.freeze({...G11_PLACEMENT, violet: [0.80, 0.81], gold: [0.805, 0.815], absorbLeadS: 0.45, butterflyLeadS: 0.05});
/** @param lib {condenseStart, revealStart} from the authorial LIB.* windows (needed for the trigger butterfly). */
export function g11Timeline(schedule, decayEnd = null, lib = null, placement = G11_PLACEMENT) {
 const burst = schedule?.segments?.find(s => s.id === S3_LIBERATION_CLIP); if (!burst) return null;
 const len = burst.end - burst.start, p = placement, at = f => burst.start + f * len;
 const bfStart = burst.end - p.butterflyLeadS, bfPeak = bfStart + p.butterflyPeakS;
 const bfEnd = Math.min(burst.end + p.butterflyTailS, schedule.duration - 0.05);
 const out = {};
 if (lib && Number.isFinite(lib.condenseStart) && Number.isFinite(lib.revealStart)) Object.assign(out, {
  triggerStart: lib.condenseStart + p.triggerInS, triggerFull: lib.condenseStart + p.triggerFullS,
  triggerDissolve: lib.revealStart - p.triggerDissolveLeadS, triggerEnd: lib.revealStart + p.triggerEndTailS});
 Object.assign(out, {violetStart: at(p.violet[0]), violetFull: at(p.violet[1]), goldStart: at(p.gold[0]), goldFull: at(p.gold[1]),
  absorbStart: burst.end - p.absorbLeadS,
  butterflyStart: bfStart, butterflyOpen: bfStart + p.butterflyOpenS, butterflyPeak: bfPeak, butterflyDissolve: bfPeak + p.butterflyDissolveS, butterflyEnd: bfEnd,
  basis: 'AUTHORIAL_DERIVED_FROM_SCHEDULE', sourceFrame: null});
 // Order contract: trigger -> violet -> gold -> absorption -> burst (ramps may overlap, causality may not).
 const chains = [['triggerStart', 'triggerFull', 'triggerDissolve', 'triggerEnd'], ['violetStart', 'violetFull'], ['goldStart', 'goldFull'], ['violetStart', 'goldStart'], ['violetFull', 'goldFull'],
  ['goldStart', 'absorbStart', 'butterflyStart'], ['goldFull', 'butterflyStart'], ['butterflyStart', 'butterflyOpen', 'butterflyPeak', 'butterflyDissolve', 'butterflyEnd']];
 if (out.triggerEnd !== undefined) chains.push(['triggerEnd', 'violetStart']);
 for (const c of chains) for (let i = 1; i < c.length; i++) if (!(out[c[i]] > out[c[i - 1]])) fail('G11 trigger/colour/absorb/butterfly windows are not ordered: ' + c[i - 1] + ' -> ' + c[i]);
 return Object.freeze(out);
}

/** G11.1: multiplier of the ambient (R5) butterfly flock. 1 outside, 0 from just before the trigger butterfly until the burst ends. Pure. */
export function ambientButterflyGate(g, t) {
 // G11.3: there is NO free-floating butterfly in the scene: with a score (g present) the ambient R5 flock is off for the whole timeline.
 return g ? 0 : 1;
}

export function s3Timeline(schedule, {fidelity = false} = {}) {
 const ev = authorS3Events(schedule, fidelity ? S3_PLACEMENT_FIDELITY : S3_PLACEMENT).filter(e => e.basis === 'AUTHORIAL'), by = id => ev.find(e => e.id === id);
 if (!by('LIB.condense')) return null;
 const skill = schedule.segments.find(s => s.id === S2_SKILL_CLIP), rec = schedule.segments.find(s => s.id === S3_RECOVERY_CLIP);
 return Object.freeze({skillEnd: skill.end, start: by('LIB.condense').start, closePeak: by('LIB.condense').peak, closeEnd: by('LIB.condense').end,
  revealStart: by('LIB.reveal').start, revealPeak: by('LIB.reveal').peak, peak: by('LIB.peak').peak, revealEnd: by('LIB.reveal').end,
  end: by('LIB.decay')?.end ?? by('LIB.reveal').end, recoveryStart: rec?.start ?? null, duration: schedule.duration,
  g11: g11Timeline(schedule, by('LIB.decay')?.end ?? null, {condenseStart: by('LIB.condense').start, revealStart: by('LIB.reveal').start}, fidelity ? G11_PLACEMENT_FIDELITY : G11_PLACEMENT)});
}

/** S1 + S2 + S3 bundle. Burst02 -> LIBERATION, Idle01 -> RECOVERY, both SOURCE_ROLE_UNVERIFIED. */
export function createS3Score(schedule, {fidelity = false} = {}) {
 const extra = {[S2_SKILL_CLIP]: {role: 'SKILL', confidence: 'SOURCE_ROLE_UNVERIFIED'}, [S3_LIBERATION_CLIP]: {role: 'LIBERATION', confidence: 'SOURCE_ROLE_UNVERIFIED'}, [S3_RECOVERY_CLIP]: {role: 'RECOVERY', confidence: 'SOURCE_ROLE_UNVERIFIED'}};
 const b = createS1Score(schedule, extra, [...authorS2Events(schedule), ...authorS3Events(schedule, fidelity ? S3_PLACEMENT_FIDELITY : S3_PLACEMENT)]);
 return Object.freeze({...b, timeline: s3Timeline(schedule, {fidelity}), placement: fidelity ? 'F2_REFERENCE_DERIVED' : 'AUTHORIAL'});
}
