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
