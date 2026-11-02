/** Artistic controls, independent of any alleged BPM. Public release remains V2.0.1. */
export const DANCE_R2 = Object.freeze({
  preparationSeconds: .8,
  recoverySeconds: 1.2,
  reposeSeconds: 1.3,
  recentPhrases: 3,
  cooldownSeconds: 10,
  levels: {
    soft: {amplitude:.72, expressiveWeight:.45},
    flowing: {amplitude:.9, expressiveWeight:1},
    expressive: {amplitude:1, expressiveWeight:1.65},
  },
});

// Spotify remains a listening provider; its current SDK cannot meet this site's CSP.
export const dancePlaybackEligible = state => state.provider === 'youtube' && state.status === 'playing' && state.playbackConfirmed === true;

/**
 * R3: Moon Fox Reverie, a rare special phrase layered on top of the eight R2 phrases (which are not retimed).
 * `smoothing` replaces piecewise-linear inter-sample motion of the upper body with a spline through the same samples.
 */
export const DANCE_R3 = Object.freeze({
  smoothing: 'catmull',
  reverie: Object.freeze({
    enabled: true,
    /** Chance per phrase boundary once the gates below are open. With a ~4 s phrase and the cooldown, roughly one episode every 3 minutes of music. */
    chance: .14,
    cooldownSeconds: 160,
    minPlayingSeconds: 30,
    minPhrasesBefore: 3,
    /** 0..1 on top of the R2 intensity level. */
    intensity: 1,
    /** Relative speed: 1 keeps the authored 13.6 s; clamped to .85–1.2. */
    speed: 1,
    /** Largest summed spine/neck/head inclination allowed to play. Lower values scale the whole phrase down. */
    maxBowDegrees: 36,
    /** The deeper variant is a separate asset, fetched only when true, and only plays if its own safety gate passed. */
    dramaticEnabled: false,
    /** 'skip' never plays under reduced motion; 'soft' plays a gentler, slower, never-dramatic version. */
    reducedMotion: 'skip',
    /** Largest foot slide (mm) the offline QA may report before the phrase is considered unsafe. */
    footSlideLimitMm: 2,
    recoverySeconds: 1.6,
    /** Speed-up while waiting to leave the bow window after an interruption. */
    interruptSpeed: 1.45,
    /** Seconds of random shift applied to facial cues per episode. */
    cueJitter: .35,
  }),
});

/** Merges overrides into the reverie config and clamps what can be unsafe. */
export function reverieSettings(overrides = {}) {
  const c = {...DANCE_R3.reverie, ...overrides};
  c.speed = Math.max(.85, Math.min(1.2, c.speed));
  c.intensity = Math.max(0, Math.min(1, c.intensity));
  c.chance = Math.max(0, Math.min(.5, c.chance));
  c.cooldownSeconds = Math.max(45, c.cooldownSeconds);
  c.maxBowDegrees = Math.max(0, Math.min(70, c.maxBowDegrees));
  return Object.freeze(c);
}

/** Facial cues are suggestions: the director drops, shifts or reorders them per episode (phase = fraction of the phrase). */
export const REVERIE_FACE_CUES = Object.freeze([
  Object.freeze({id: 'smile', event: 'gesture:prepare', at: .03, alternativeAt: .18, chance: .85}),
  Object.freeze({id: 'hold', event: 'gesture:hold', at: .88, alternativeAt: .80, chance: .75}),
  Object.freeze({id: 'neutral', event: 'gesture:release', at: .975, alternativeAt: .94, chance: 1}),
]);
