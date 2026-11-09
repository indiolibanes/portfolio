/**
 * F1.4 STUDY_PRESENTATION: a long, EXPOSITORY run of the F3 cycle for observation (60-90 s, configurable).
 *
 * What is canonical and what is not:
 *  - Every combat clip keeps its original curves, its original duration and its original 1x speed. The seven combat steps of the plan are
 *    byte-identical to the short F3 cycle (same indices, durations and fades).
 *  - The ONLY extra time is exposition: the original idle clips keep playing at 1x after the combat (contemplative intervals), the
 *    Stellarealm field is HELD for `holdS` seconds (15-25), and the camera adds observation shots. All of it is labelled
 *    EXPOSITION_HOLD_NOT_CANONICAL_DURATION; none of it is a game duration, none promotes Inner/Supernal, none plays Discernment.
 *  - Pure functions of absolute presentation time. No clock, RAF or director of its own: the existing presentation clock drives it.
 */
import {buildR61Plan} from './r61-plan.mjs';

export const STUDY_LABEL = 'EXPOSITION_HOLD_NOT_CANONICAL_DURATION';
export const STUDY_PRESENTATION_STATUS = Object.freeze({
 mode: 'STUDY_PRESENTATION', timing: STUDY_LABEL, combatClips: 'ORIGINAL_1X_UNEDITED', extraTime: 'ORIGINAL_IDLES_1X_PLUS_FIELD_HOLD_PLUS_CAMERA',
 stellarealmStage: 'NOT_PROMOTED_NO_INNER_NO_SUPERNAL', discernment: 'NOT_PLAYED', canonical: 'CANONICAL_PENDING', G7: 'NO_GO'
});
export const STUDY_LIMITS = Object.freeze({minS: 60, maxS: 90, defaultS: 75, holdMinS: 15, holdMaxS: 25, defaultHoldS: 20});
/** Idle clips available after the combat, in playback order. Each id may appear ONCE (the score requires unique segment ids). */
export const STUDY_IDLE_ORDER = Object.freeze(['SK_IDLE_01_ORIGINAL', 'SK_IDLE_02_ORIGINAL', 'SK_IDLE_03_ORIGINAL']);
const MARGIN_S = 1.0, MIN_AFTER_HOLD_S = 3;

export function resolveStudyConfig({durationS = STUDY_LIMITS.defaultS, holdS = STUDY_LIMITS.defaultHoldS} = {}) {
 const L = STUDY_LIMITS;
 if (!Number.isFinite(durationS) || durationS < L.minS || durationS > L.maxS) throw new RangeError(`STUDY_PRESENTATION: duration must be ${L.minS}-${L.maxS} s`);
 if (!Number.isFinite(holdS) || holdS < L.holdMinS || holdS > L.holdMaxS) throw new RangeError(`STUDY_PRESENTATION: Stellarealm hold must be ${L.holdMinS}-${L.holdMaxS} s`);
 return Object.freeze({durationS, holdS});
}

/**
 * Plan options for buildR61Plan: the recovery idle keeps playing (up to its own length minus a margin) and the other original idles follow
 * until `durationS` is reached. The combat part is read from the unmodified short plan.
 */
export function studyPlanOptions(library, config, {burstEntry = 'cut'} = {}) {
 const {durationS, holdS} = resolveStudyConfig(config);
 const base = buildR61Plan(library, {burstEntry}), segs = base.schedule.segments, burst = segs[5], rec = segs[6];
 if (durationS < burst.end + holdS + MIN_AFTER_HOLD_S) throw new RangeError('STUDY_PRESENTATION: duration too short for the requested hold');
 const dur = id => library.find(c => c?.name === id)?.duration;
 const idle1 = dur(STUDY_IDLE_ORDER[0]);
 if (!(idle1 > 2)) throw Error('STUDY_PRESENTATION: original idle source missing');
 let total = rec.start;
 const first = Math.min(durationS - total, idle1 - MARGIN_S);
 const recoveryS = Math.max(1.45, first);
 total += recoveryS;
 const tail = [];
 for (const id of STUDY_IDLE_ORDER.slice(1)) {
  const need = durationS - total;
  if (need < 0.5) break;
  const d = dur(id);
  if (!(d > 2)) throw Error('STUDY_PRESENTATION: original idle source missing: ' + id);
  const maxLen = d - MARGIN_S, fade = Math.min(0.6, maxLen * 0.24);
  const exit = Math.min(need + fade, maxLen);
  tail.push({id, exit}); total += exit - Math.min(0.6, exit * 0.24);
 }
 if (Math.abs(total - durationS) > 0.1) throw RangeError('STUDY_PRESENTATION: the original idle sources cannot fill the requested duration');
 return Object.freeze({burstEntry, study: Object.freeze({recoveryS, tail: Object.freeze(tail)}), holdS, durationS});
}

/** Phases of a study plan for UI / video labels. `canonicalTiming` is false for everything that is exposition time. */
export function studyPhaseAt(plan, timeline, t) {
 if (!plan?.study || !timeline?.studyHold) throw TypeError('study phase requires a study plan and its timeline');
 const hold = timeline.studyHold, combatEnd = plan.schedule.segments[5].end;
 if (t < combatEnd) return Object.freeze({id: 'COMBAT_SEQUENCE_PSA_1X', canonicalTiming: true, label: 'COMBAT_ORIGINAL_CLIPS_1X'});
 if (t < hold.end) return Object.freeze({id: 'STELLAREALM_EXPOSITION_HOLD', canonicalTiming: false, label: STUDY_LABEL});
 return Object.freeze({id: 'CONTEMPLATIVE_IDLE', canonicalTiming: false, label: 'CONTEMPLATIVE_IDLE_NOT_CANONICAL'});
}
