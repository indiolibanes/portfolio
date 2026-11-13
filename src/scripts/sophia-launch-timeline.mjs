/** Absolute, seekable launch choreography. No rendering or wall-clock globals. */
export const LAUNCH = Object.freeze({ ignition: 1.1, enter: 2.1, prepare: 4.65, jump: 5.1, dock: 5.8, release: 6.1, flight: 8.2 });
const clamp = (x) => Math.min(1, Math.max(0, x));
export const ease = (x) => { const u = clamp(x); return u * u * (3 - 2 * u); };
const smoother = (x) => { const u = clamp(x); return u ** 3 * (u * (6 * u - 15) + 10); };

export function getLaunchStateAt(seconds) {
  const t = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const countdown = t < LAUNCH.ignition || t > LAUNCH.release + .65
    ? null : Math.max(0, 5 - Math.floor((t - LAUNCH.ignition + 1e-9)));
  const phase = t < LAUNCH.ignition ? 'PAD_REVEAL' : t < LAUNCH.enter ? 'IGNITION'
    : t < LAUNCH.prepare ? 'APPROACH' : t < LAUNCH.jump ? 'PREPARE'
      : t < LAUNCH.dock ? 'JUMP_BOARD' : t < LAUNCH.release ? 'DOCK'
        : t < LAUNCH.flight ? 'BOOST' : 'FLIGHT_LOOP';
  return {
    t, phase, countdown, riderVisible: t >= LAUNCH.enter, docked: t >= LAUNCH.dock,
    engine: t < LAUNCH.ignition ? 'ENGINE_OFF' : t < LAUNCH.ignition + .45 ? 'ENGINE_IGNITION'
      : t < LAUNCH.release ? 'ENGINE_IDLE' : t < LAUNCH.flight ? 'ENGINE_BOOST' : 'IN_FLIGHT',
    reveal: ease(t / .65), ignition: ease((t - LAUNCH.ignition) / .45),
    release: ease((t - LAUNCH.release) / .32),
    trail: ease((t - LAUNCH.release - .18) / .95),
    flightMix: ease((t - LAUNCH.flight + .3) / .3),
    controlsEnabled: t >= LAUNCH.flight,
  };
}

/** Offset in WORLD axes, relative to the seated mount. Dock precedes liftoff by .3s. */
export function getBoardingPoseAt(seconds, { distance = 1.2, groundOffset = -.25, height = .3, depth = .18, reducedMotion = false } = {}) {
  const t = Math.max(0, seconds);
  const walk = ease((t - LAUNCH.enter) / (LAUNCH.prepare - LAUNCH.enter));
  const takeoffX = -distance * .24;
  const initialX = -distance;
  let x = initialX + (takeoffX - initialX) * walk;
  let y = groundOffset; let z = depth;
  const anticipation = ease((t - LAUNCH.prepare) / .2) * (1 - ease((t - LAUNCH.jump) / .14));
  let tuck = 0;
  if (t >= LAUNCH.jump) {
    const u = smoother((t - LAUNCH.jump) / (LAUNCH.dock - LAUNCH.jump));
    x = takeoffX * (1 - u);
    y = groundOffset * (1 - u) + 4 * (reducedMotion ? height * .3 : height) * u * (1 - u);
    z = depth * (1 - u);
    tuck = Math.sin(Math.PI * u);
  }
  if (t >= LAUNCH.dock) { x = 0; y = 0; z = 0; tuck = 0; }
  return { x, y, z, walk, anticipation: reducedMotion ? 0 : anticipation, tuck: reducedMotion ? 0 : tuck,
    flightWeight: ease((t - LAUNCH.jump) / (LAUNCH.dock - LAUNCH.jump)),
    walkTime: Math.max(0, Math.min(t, LAUNCH.prepare) - LAUNCH.enter) };
}

/** Position AND derivative are continuous across the boost/loop boundary. */
export function getRocketPoseAt(seconds, scale = 1) {
  const dt = Math.max(0, seconds - LAUNCH.release);
  const duration = LAUNCH.flight - LAUNCH.release;
  const u = Math.min(1, dt / duration); const extra = Math.max(0, dt - duration);
  const speed = 3 * 2.6 / duration;
  return { x: -scale * (2.6 * u ** 3 + speed * extra), y: scale * (.7 * ease(u) + .10 * extra ** 2 / (1 + extra)), z: 0 };
}

/** Monotonic active time, including multiple independent pause reasons. */
export class ActiveSceneClock {
  constructor() { this.seconds = 0; this.anchor = null; this.pauses = new Set(); this.started = false; }
  start(now) { this.seconds = 0; this.anchor = now; this.started = true; }
  read(now) { return this.seconds + (this.started && !this.pauses.size && this.anchor !== null ? Math.max(0, now - this.anchor) / 1000 : 0); }
  pause(reason, now) { this.seconds = this.read(now); this.anchor = now; this.pauses.add(reason); }
  resume(reason, now) { this.seconds = this.read(now); this.anchor = now; this.pauses.delete(reason); }
  reset(now) { this.seconds = 0; this.anchor = now; this.started = false; }
}
