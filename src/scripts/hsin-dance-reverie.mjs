import {splineQuaternion} from './hsin-dance-interp.mjs';

const DEG = Math.PI / 180;
const smooth = t => t * t * (3 - 2 * t);

/** Decode once at load: i16 quaternions, positions and secondary tracks become Float32/64 buffers. Never decoded per frame. */
export function decodeReverieData(data) {
  if (data.encoding !== 'quaternion-i16') return data;
  for (const p of Object.values(data.phrases)) {
    p.frames = p.frames.map(f => Float32Array.from(f, v => v / 32767));
    p.frames[0] = data.rest; p.frames[p.frames.length - 1] = data.rest;
    p.positionFrames = p.positionFrames.map(f => Float32Array.from(f));
    p.positionFrames[0] = data.positionRest; p.positionFrames[p.positionFrames.length - 1] = data.positionRest;
    for (const group of Object.values(p.secondary ?? {})) for (const key of ['sway', 'pitch']) group[key] = Float32Array.from(group[key], v => v / 32767);
  }
  data.encoding = 'decoded-f32';
  return data;
}

/**
 * Baked special-phrase player. Same contract as the R2 pose (has/duration/apply/restore/beginRecovery/recover/atReference),
 * plus offline secondary motion for hair, sleeves and tail. No physics, no IK and no per-frame allocation.
 * Every channel scales with amplitude, so the support path (hip + legs) and the torso stay mutually consistent.
 */
export function createReveriePose({THREE: T, data, bones, model = null, metrics = null, smoothing = 'catmull'}) {
  const by = new Map(bones.map(b => [b.name, b])), chain = data.names.map(n => by.get(n)), size = chain.length * 4;
  const spline = smoothing === 'catmull', lowerStart = data.lowerStart ?? chain.length;
  const a = new T.Quaternion(), b = new T.Quaternion(), c = new T.Quaternion(), axis = new T.Vector3(), scratch = new Float64Array(4);
  const from = new Float64Array(size), prior = new Float64Array(size), current = new Float64Array(size);
  const rotation = new Float64Array(chain.length * 3), velocity = new Float64Array(chain.length * 3);
  const positions = (data.positionNames ?? []).map(n => model?.getObjectByName(n) ?? by.get(n));
  const posFrom = new Float64Array(positions.length * 3), posVelocity = new Float64Array(positions.length * 3), posPrior = new Float64Array(positions.length * 3), posCurrent = new Float64Array(positions.length * 3);
  let lastDt = 1 / 30;

  // Secondary chains (hair, sleeves, tail). Bone rest is captured from the live bones at the first apply.
  const sec = data.secondary ?? {names: [], group: [], depth: [], gain: [], axes: [], groups: []};
  const secBones = sec.names.map(n => by.get(n)), secRest = new Float64Array(secBones.length * 4), secFrom = new Float64Array(secBones.length * 4);
  const maxDepth = sec.depth.reduce((m, d) => Math.max(m, d), 0), levels = new Float64Array(sec.groups.length * (maxDepth + 1) * 2);
  let captured = false;

  const phrasesOk = Object.values(data.phrases).every(p => p.frames.length >= 2 && p.frames.every(f => f.length === size) && p.positionFrames.length === p.frames.length && Object.values(p.secondary ?? {}).every(g => g.sway.length === p.frames.length && g.pitch.length === p.frames.length));
  const ready = chain.length > 0 && chain.every(Boolean) && positions.every(Boolean) && secBones.every(Boolean) && data.rest.length === size && phrasesOk;

  const read = q => { for (let i = 0; i < chain.length; i++) chain[i].quaternion.toArray(q, i * 4); };
  const readPositions = q => { for (let i = 0; i < positions.length; i++) positions[i].position.toArray(q, i * 3); };
  read(current); prior.set(current); readPositions(posCurrent); posPrior.set(posCurrent);

  function captureSecondary() { for (let i = 0; i < secBones.length; i++) secBones[i].quaternion.toArray(secRest, i * 4); captured = true; }
  function restoreSecondary() {
    if (!captured) return;
    for (let i = 0; i < secBones.length; i++) { secBones[i].quaternion.fromArray(secRest, i * 4); secBones[i].updateMatrix(); }
    captured = false;
  }
  function sampleTrack(track, x) { const f = x * (track.length - 1), i = Math.min(track.length - 2, Math.max(0, Math.floor(f))), m = f - i; return track[i] + (track[i + 1] - track[i]) * m; }
  /** Per-group, per-depth lag: depth d reads the group track `d * delayPerDepth` seconds earlier, giving a travelling wave. */
  function applySecondary(p, t, amount) {
    if (!secBones.length || !p.secondary) return;
    if (!captured) captureSecondary();
    const stride = (maxDepth + 1) * 2;
    for (let g = 0; g < sec.groups.length; g++) {
      const info = sec.groups[g], tracks = p.secondary[info.id];
      for (let d = 0; d <= maxDepth; d++) {
        const x = Math.max(0, Math.min(1, t - d * info.delayPerDepth / p.seconds));
        levels[g * stride + d * 2] = tracks ? sampleTrack(tracks.sway, x) * info.maxDegrees.sway * DEG * amount : 0;
        levels[g * stride + d * 2 + 1] = tracks ? sampleTrack(tracks.pitch, x) * info.maxDegrees.pitch * DEG * amount : 0;
      }
    }
    for (let i = 0; i < secBones.length; i++) {
      const g = sec.group[i], k = g * stride + sec.depth[i] * 2, gain = sec.gain[i], ax = sec.axes[i];
      const sway = levels[k] * gain, pitch = levels[k + 1] * gain;
      a.setFromAxisAngle(axis.set(ax[0], ax[1], ax[2]), sway);
      b.setFromAxisAngle(axis.set(ax[3], ax[4], ax[5]), pitch);
      c.fromArray(secRest, i * 4);
      a.multiply(b).multiply(c).normalize();
      secBones[i].quaternion.copy(a); secBones[i].updateMatrix();
    }
  }

  function restore() {
    if (!ready) return;
    for (let i = 0; i < chain.length; i++) { chain[i].quaternion.fromArray(data.rest, i * 4); chain[i].updateMatrix(); }
    for (let i = 0; i < positions.length; i++) { positions[i].position.fromArray(data.positionRest, i * 3); positions[i].updateMatrix(); }
    restoreSecondary();
    current.set(data.rest); prior.set(data.rest); readPositions(posCurrent); posPrior.set(posCurrent);
  }

  function log(q, out, i, scale = 1) {
    if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w);
    const s = Math.hypot(q.x, q.y, q.z), k = s > 1e-10 ? 2 * Math.atan2(s, q.w) / s * scale : 2 * scale;
    out[i] = q.x * k; out[i + 1] = q.y * k; out[i + 2] = q.z * k;
  }

  return {
    ready, lowerBody: positions.length > 0, secondaryBones: secBones.length,
    has: name => !!data.phrases[name],
    duration: name => data.phrases[name]?.seconds ?? 12,
    meta: name => data.phrases[name] ?? null,
    apply(name, t, weight = 1, amplitude = 1, dt = 1 / 30) {
      if (!ready) return;
      const started = metrics?.enabled ? metrics.now() : 0, p = data.phrases[name];
      if (!p) return;
      lastDt = dt > 0 ? dt : lastDt; prior.set(current); posPrior.set(posCurrent);
      t = Math.max(0, Math.min(1, t));
      const x = t * (p.frames.length - 1), i = Math.min(p.frames.length - 2, Math.floor(x)), mix = x - i, amount = Math.max(0, Math.min(1, weight * amplitude));
      for (let k = 0; k < chain.length; k++) {
        if (spline && k < lowerStart) { splineQuaternion(p.frames, i, mix, k, scratch); a.set(scratch[0], scratch[1], scratch[2], scratch[3]); }
        else { a.fromArray(p.frames[i], k * 4).normalize(); b.fromArray(p.frames[i + 1], k * 4).normalize(); a.slerp(b, mix); }
        c.fromArray(data.rest, k * 4); c.slerp(a, amount);
        chain[k].quaternion.copy(c); chain[k].updateMatrix(); c.toArray(current, k * 4);
      }
      for (let k = 0; k < positions.length; k++) {
        const f = p.positionFrames[i], g = p.positionFrames[i + 1], r = data.positionRest;
        for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
          const value = f[k * 3 + axisIndex] + (g[k * 3 + axisIndex] - f[k * 3 + axisIndex]) * mix;
          posCurrent[k * 3 + axisIndex] = r[k * 3 + axisIndex] + (value - r[k * 3 + axisIndex]) * amount;
        }
        positions[k].position.set(posCurrent[k * 3], posCurrent[k * 3 + 1], posCurrent[k * 3 + 2]); positions[k].updateMatrix();
      }
      applySecondary(p, t, amount);
      if (metrics?.enabled) metrics.sample('reveriePose', metrics.now() - started);
    },
    /** Inertial return from an upright, grounded posture: position, rotation and secondary motion all settle onto the reference. */
    beginRecovery() {
      read(from); readPositions(posFrom);
      for (let k = 0; k < chain.length; k++) {
        a.fromArray(from, k * 4).normalize(); b.fromArray(data.rest, k * 4).normalize();
        c.copy(a).invert().multiply(b).normalize(); log(c, rotation, k * 3);
        c.fromArray(prior, k * 4).normalize().invert().multiply(a).normalize(); log(c, velocity, k * 3, 1 / Math.max(.01, lastDt));
      }
      for (let i = 0; i < positions.length * 3; i++) posVelocity[i] = (posCurrent[i] - posPrior[i]) / Math.max(.01, lastDt);
      for (let i = 0; i < secBones.length; i++) secBones[i].quaternion.toArray(secFrom, i * 4);
    },
    recover(t, seconds = 1.6) {
      if (t >= 1) { restore(); return; }
      t = Math.max(0, t);
      const h = t - 2 * t * t + t * t * t, s = 3 * t * t - 2 * t * t * t;
      for (let k = 0; k < chain.length; k++) {
        const j = k * 3, x = velocity[j] * seconds * h + rotation[j] * s, y = velocity[j + 1] * seconds * h + rotation[j + 1] * s, z = velocity[j + 2] * seconds * h + rotation[j + 2] * s;
        const len = Math.hypot(x, y, z), f = len > 1e-10 ? Math.sin(len / 2) / len : .5;
        a.set(x * f, y * f, z * f, Math.cos(len / 2)); b.fromArray(from, k * 4).multiply(a).normalize();
        chain[k].quaternion.copy(b); chain[k].updateMatrix();
      }
      for (let k = 0; k < positions.length; k++) for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
        const i = k * 3 + axisIndex, rest = data.positionRest[i], value = posFrom[i] + posVelocity[i] * seconds * h + (rest - posFrom[i]) * s;
        positions[k].position.setComponent(axisIndex, value);
      }
      for (const o of positions) o.updateMatrix();
      if (captured) for (let i = 0; i < secBones.length; i++) {
        a.fromArray(secFrom, i * 4).normalize(); b.fromArray(secRest, i * 4).normalize(); a.slerp(b, smooth(t));
        secBones[i].quaternion.copy(a); secBones[i].updateMatrix();
      }
    },
    restore,
    atReference: () => ready
      && chain.every((bone, i) => Math.abs(bone.quaternion.x - data.rest[i * 4]) + Math.abs(bone.quaternion.y - data.rest[i * 4 + 1]) + Math.abs(bone.quaternion.z - data.rest[i * 4 + 2]) + Math.abs(bone.quaternion.w - data.rest[i * 4 + 3]) < 2e-6)
      && positions.every((o, i) => Math.abs(o.position.x - data.positionRest[i * 3]) + Math.abs(o.position.y - data.positionRest[i * 3 + 1]) + Math.abs(o.position.z - data.positionRest[i * 3 + 2]) < 1e-8)
      && !captured,
    bufferBytes: () => from.byteLength + prior.byteLength + current.byteLength + rotation.byteLength + velocity.byteLength + posFrom.byteLength + posVelocity.byteLength + secRest.byteLength + secFrom.byteLength + levels.byteLength,
  };
}
