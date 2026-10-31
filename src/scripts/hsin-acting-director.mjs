/** Autonomous timing only. The adapter owns targets and all rig mutations. */
export function createBehaviorDirector({onState, requestFrame, cancelFrame, seed = 17}) {
  let state = 'stopped', elapsed = 0, last = null, frame = 0, visible = true, random = seed >>> 0;
  const durations = {idle: 3000, anticipate: 700, gesture: 1800, hold: 1300, release: 1400};
  let idleDuration = durations.idle;
  function nextIdle() { random = (Math.imul(1664525, random) + 1013904223) >>> 0; return 2800 + (random % 1801); }
  function transition(next) { state = next; elapsed = 0; if(next === 'idle') idleDuration = nextIdle(); onState?.(next); }
  function schedule() { if (!frame && visible && state !== 'stopped') frame = requestFrame(tick); }
  function tick(time) {
    frame = 0; if(!visible || state === 'stopped') return;
    if(last !== null) elapsed += Math.max(0, Math.min(100, time - last));
    last = time;
    const limit = state === 'idle' ? idleDuration : durations[state];
    if(elapsed >= limit) transition(({idle:'anticipate', anticipate:'gesture', gesture:'hold', hold:'release', release:'idle'})[state]);
    schedule();
  }
  return {
    start({reducedMotion = false} = {}) { if(reducedMotion || state !== 'stopped') return false; last = null; transition('idle'); schedule(); return true; },
    stop() { if(frame) cancelFrame(frame); frame = 0; state = 'stopped'; elapsed = 0; last = null; onState?.('stopped'); },
    setVisible(value) { visible = !!value; last = null; if(!visible && frame) { cancelFrame(frame); frame = 0; } else schedule(); },
    getState() { return {state, elapsed, visible}; },
    durations,
  };
}

/** Quintic timing has zero velocity and acceleration at both endpoints. */
export function smoothQuintic(value) { const t = Math.max(0, Math.min(1,value)); return t*t*t*(t*(t*6-15)+10); }

/** Pole-constrained two-link geometry. Does not apply rotations or infer rig axes. */
export function solveTwoLink(THREE, root, target, pole, lengthA, lengthB) {
  if(!(lengthA > 0 && lengthB > 0)) throw new Error('Segment lengths must be positive.');
  const direction = target.clone().sub(root), distance = direction.length();
  if(distance < 1e-8) return null;
  direction.divideScalar(distance);
  const reach = Math.max(Math.abs(lengthA-lengthB)+1e-6, Math.min(distance, lengthA+lengthB-1e-6));
  const along = (lengthA*lengthA - lengthB*lengthB + reach*reach)/(2*reach);
  const height = Math.sqrt(Math.max(0,lengthA*lengthA-along*along));
  const perpendicular = pole.clone().sub(root).addScaledVector(direction, -pole.clone().sub(root).dot(direction));
  if(perpendicular.lengthSq()<1e-12) return null;
  perpendicular.normalize();
  return {elbow: root.clone().addScaledVector(direction,along).addScaledVector(perpendicular,height),
    end: root.clone().addScaledVector(direction,reach), reachable:Math.abs(reach-distance)<1e-5};
}

/** Cubic spatial arc with endpoints fixed, not a finished or collision-safe pose. */
export function sampleGestureArc(THREE, from, to, outward, t) {
  const u = smoothQuintic(t), one = 1-u;
  const p1 = from.clone().lerp(to,.30).add(outward);
  const p2 = from.clone().lerp(to,.72).addScaledVector(outward,.55);
  return from.clone().multiplyScalar(one**3).addScaledVector(p1,3*one*one*u)
    .addScaledVector(p2,3*one*u*u).addScaledVector(to,u**3);
}
