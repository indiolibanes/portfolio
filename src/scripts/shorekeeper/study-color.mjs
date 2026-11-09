/**
 * F1.4 STUDY_COLOR (laboratory only): reversible, explicit colour study of the FIDELIDADE Stellarealm field.
 *
 * - BLUE   = the plain FIDELIDADE blue-white (weights 0/0 -> the unmodified F2 path).
 * - VIOLET = the G11.3 violet hand-over key held as a state.
 * - GOLD   = the G11.3 gold key held as a state.
 * The profiles are COLOUR STATES chosen by the user. They are NOT a function of time and NOT a function of any Stellarealm stage:
 * nothing here knows about Outer / Inner / Supernal, so a colour is never presented as evidence of a stage (`stageAssociation: NONE`).
 * Transitions are eased weight blends driven by the caller's `now` (seconds) - no clock, RAF or timer of its own - and are reversible.
 * Pure data + a tiny state machine; reuses the liberation layer's shaders / geometries / materials (no new resources).
 */
export const STUDY_COLOR_PROFILES = Object.freeze({
 BLUE: Object.freeze({id: 'BLUE', violet: 0, gold: 0, label: 'AZUL (FIDELIDADE)'}),
 VIOLET: Object.freeze({id: 'VIOLET', violet: 1, gold: 0, label: 'VIOLETA (estudo)'}),
 GOLD: Object.freeze({id: 'GOLD', violet: 1, gold: 1, label: 'DOURADO (estudo)'})
});
export const STUDY_COLOR_STATUS = Object.freeze({mode: 'STUDY_COLOR', scope: 'LABORATORY_ONLY', stageAssociation: 'NONE', canonical: 'CANONICAL_PENDING', note: 'Colour is an exposition state, never evidence of Outer/Inner/Supernal.'});
export const STUDY_COLOR_TRANSITION_S = 1.6;
const smooth = x => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

/** Weights {violet, gold} of a transition from `a` to `b` at progress 0..1 (eased). Pure; the endpoints are exactly the profiles. */
export function studyColorWeights(a, b, u) {
 const k = smooth(u);
 return {violet: a.violet + (b.violet - a.violet) * k, gold: a.gold + (b.gold - a.gold) * k};
}

/**
 * Controller bound to a liberation layer (anything with setStudyColor). `select(id, now)` starts a reversible transition (selecting the same profile
 * is a no-op; selecting during a transition continues from the CURRENT weights, so there is never a jump). `apply(now)` writes the weights.
 * `reset()` returns to BLUE and clears the layer (null -> plain FIDELIDADE).
 */
export function createStudyColorController(layer, {transitionS = STUDY_COLOR_TRANSITION_S} = {}) {
 if (!layer || typeof layer.setStudyColor !== 'function') throw new TypeError('study colour: a layer with setStudyColor is required');
 if (!(transitionS >= 0 && transitionS <= 10)) throw new RangeError('study colour: transition 0-10 s');
 let id = 'BLUE', from = {violet: 0, gold: 0}, to = STUDY_COLOR_PROFILES.BLUE, t0 = 0, cur = {violet: 0, gold: 0}, disposed = false;
 const weightsAt = now => transitionS === 0 ? {violet: to.violet, gold: to.gold} : studyColorWeights(from, to, (now - t0) / transitionS);
 return {
  select(profile, now) {
   if (disposed) return;
   const p = STUDY_COLOR_PROFILES[profile];
   if (!p) throw new RangeError('study colour: unknown profile ' + profile);
   if (!Number.isFinite(now)) throw new TypeError('study colour: finite time required');
   if (p.id === id) return;
   from = weightsAt(now); to = p; t0 = now; id = p.id;
  },
  apply(now) {
   if (disposed || !Number.isFinite(now)) return cur;
   cur = weightsAt(now);
   layer.setStudyColor(cur.violet === 0 && cur.gold === 0 ? null : cur);
   return cur;
  },
  /** Finish any running transition immediately (used while paused or when a cycle starts). */
  complete(now) { from = {violet: to.violet, gold: to.gold}; t0 = now - transitionS; return this.apply(now); },
  get transitioning() { return !disposed && (cur.violet !== to.violet || cur.gold !== to.gold); },
  reset() { id = 'BLUE'; from = {violet: 0, gold: 0}; to = STUDY_COLOR_PROFILES.BLUE; cur = {violet: 0, gold: 0}; layer.setStudyColor(null); },
  dispose() { if (!disposed) { layer.setStudyColor(null); disposed = true; } },
  get profile() { return id; },
  get weights() { return {...cur}; },
  get status() { return STUDY_COLOR_STATUS; }
 };
}
