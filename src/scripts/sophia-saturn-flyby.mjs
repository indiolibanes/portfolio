import { smooth } from './sophia-immersive-r3-timeline.mjs';

// NASA Saturn and Saturnian Rings fact sheets. System and solar GM: JPL DE440.
export const SATURN = Object.freeze({
  equatorialRadiusKm: 60_268,
  polarRadiusKm: 54_364,
  obliquity: 26.73 * Math.PI / 180,
  spinSeconds: 10.656 * 3600,
  gm: 37_940_584.8418,
  solarGm: 132_712_440_041.2794,
  aphelionKm: 1_506_527_000,
});

export const SATURN_RINGS = Object.freeze({
  cInner: 74_658, bInner: 91_975, bOuter: 117_507,
  aInner: 122_340, aOuter: 136_780, fCenter: 139_826,
});

export const SATURN_FLYBY = Object.freeze({
  start: 13.5, closest: 22, release: 23.5, end: 40,
  hillKm: SATURN.aphelionKm * Math.cbrt(SATURN.gm / (3 * SATURN.solarGm)),
  impactKm: 82_000_000,
  // Fictional cruise speed and time compression shared by the planet and ring rotation.
  cruiseKmPerSecond: 12_000,
  simulatedSecondsPerSecond: 2400,
});

export const ringAngularSpeed = radiusKm => Math.sqrt(SATURN.gm / radiusKm ** 3);

export function sampleSaturnFlyby(time) {
  const shot = SATURN_FLYBY;
  const t = Math.max(shot.start, Math.min(shot.end, time));
  const simulatedSeconds = (t - shot.start) * shot.simulatedSecondsPerSecond;
  const alongTrackKm = (t - shot.closest) * shot.simulatedSecondsPerSecond * shot.cruiseKmPerSecond;
  const distanceKm = Math.hypot(shot.impactKm, alongTrackKm);
  const departure = smooth((t - shot.release) / 5);
  const travel = Math.max(0, t - shot.release);
  return {
    visible: time >= shot.start,
    distanceKm,
    simulatedSeconds,
    spin: simulatedSeconds / SATURN.spinSeconds * 2 * Math.PI,
    bearing: Math.atan2(alongTrackKm, shot.impactKm),
    angularRadius: Math.asin(SATURN.equatorialRadiusKm / distanceKm),
    departure,
    // Begins with zero added velocity. Perspective supplies the shrink as it recedes.
    travel: travel ** 4 * .08,
  };
}
