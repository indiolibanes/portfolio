/**
 * S6-A Gate E — G7 mechanical A/B of the composed ORIGINAL source sequence (Basic → Skill → Burst → Recovery).
 * Data-only: no renderer, no texture decoding, no source edit. Uses the application's own combo plan and sequencer,
 * so the transitions measured are the ones the S5 preview plays. Output is numbers, never a visual verdict.
 *
 * Spaces: "local" = bone-local quaternion as written by the mixer; "world" = model world space after updateMatrixWorld.
 * Units: metres, degrees, seconds. Positions of Root/Bip001/pelvis/feet are world space.
 */
import {buildInspectableCombo} from '../../src/scripts/shorekeeper/combo-plan.mjs';
import {createComboSequencer} from '../../src/scripts/shorekeeper/combo-sequencer.mjs';

export const G7_LANDMARKS = Object.freeze(['Root', 'Bip001', 'Bip001Pelvis', 'Bip001LFoot', 'Bip001RFoot']);
const deg = r => r * 180 / Math.PI;
const qAngle = (a, b) => deg(2 * Math.acos(Math.min(1, Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w))));

function bonesOf(model) { const out = []; model.traverse(o => { if (o.isBone) out.push(o); }); return out; }

/** Snapshot of every bone's local TRS plus world landmarks. */
function capture(T, model, bones, landmarks) {
  model.updateMatrixWorld(true);
  const local = bones.map(b => ({q: b.quaternion.clone(), p: b.position.clone()}));
  const world = {};
  for (const [name, b] of landmarks) { const p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3(); b.matrixWorld.decompose(p, q, s); world[name] = {p, q}; }
  return {local, world};
}
function yawOf(T, q) { const f = new T.Vector3(0, 0, 1).applyQuaternion(q); return Math.hypot(f.x, f.z) < 1e-6 ? null : deg(Math.atan2(f.x, f.z)); }
const wrap = d => ((d + 540) % 360) - 180;

/** Compare two snapshots. `animated` restricts local comparison to bones the clips actually drive. */
export function compareSnapshots(T, a, b, bones, animated) {
  let sum = 0, n = 0, max = 0, maxBone = null; const per = [];
  bones.forEach((bone, i) => { if (!animated.has(bone.name)) return; const d = qAngle(a.local[i].q, b.local[i].q); sum += d; n++; per.push([bone.name, d]); if (d > max) { max = d; maxBone = bone.name; } });
  const topBones = per.sort((x, y) => y[1] - x[1]).slice(0, 6).filter(([, d]) => d > 1e-6).map(([bone, d]) => ({bone, deg: +d.toFixed(3)}));
  const world = {};
  for (const name of Object.keys(a.world)) {
    const pa = a.world[name], pb = b.world[name], ya = yawOf(T, pa.q), yb = yawOf(T, pb.q);
    world[name] = {displacementM: +pa.p.distanceTo(pb.p).toFixed(5), deltaM: pb.p.clone().sub(pa.p).toArray().map(v => +v.toFixed(5)), rotationDeg: +qAngle(pa.q, pb.q).toFixed(3), yawDeltaDeg: ya === null || yb === null ? null : +wrap(yb - ya).toFixed(3)};
  }
  return {meanLocalDeg: n ? +(sum / n).toFixed(3) : 0, maxLocalDeg: +max.toFixed(3), maxLocalBone: maxBone, topBones, comparedBones: n, world};
}

/** Pose a single clip at clip-time t on a fresh mixer (no blend) and capture it. */
function poseAt(T, model, clip, t, bones, landmarks, rest) {
  restore(model, bones, rest);
  const mixer = new T.AnimationMixer(model), a = mixer.clipAction(clip); a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; a.play(); a.paused = true; a.time = Math.min(clip.duration, Math.max(0, t)); mixer.update(0);
  const snap = capture(T, model, bones, landmarks); mixer.stopAllAction(); mixer.uncacheRoot(model); return snap;
}
function restore(model, bones, rest) { bones.forEach((b, i) => { b.position.copy(rest.local[i].p); b.quaternion.copy(rest.local[i].q); }); model.updateMatrixWorld(true); }

/**
 * @returns per-variant report: plan schedule, per-transition source gap (A@exit vs B@enter, unblended),
 * blended per-frame steps across each fade window at 30/60 Hz, pose-vs-rest distances, and the global max step.
 */
export function auditG7(T, model, library, {variants = ['ORIGINAL', 'REBASED', 'ROOT_BODY_OWNED'], fpsList = [30, 60], margin = .1} = {}) {
  const bones = bonesOf(model), landmarks = G7_LANDMARKS.map(n => [n, bones.find(b => b.name === n)]).filter(([, b]) => b);
  const rest = capture(T, model, bones, landmarks), report = {schema: 'shorekeeper.s6a.g7-ab/1', spaces: {local: 'bone-local quaternion', world: 'model world after updateMatrixWorld'}, units: {position: 'm', angle: 'deg', time: 's'}, landmarks: landmarks.map(([n]) => n), variants: {}};
  try {
    for (const variant of variants) {
      if (variant !== 'ORIGINAL' && !library.some(c => c.name === 'SK_BURST_02_' + variant)) { report.variants[variant] = {status: 'VARIANT_CLIP_ABSENT'}; continue; }
      const plan = buildInspectableCombo(model, library, {variant, sourceKey: 's6a-g7'}), segs = plan.schedule.segments;
      const animated = new Set(); for (const c of Object.values(plan.clips)) for (const tr of c.tracks) animated.add(tr.name.split('.')[0]);
      const transitions = [];
      for (let i = 0; i < segs.length - 1; i++) {
        const A = segs[i], B = segs[i + 1], ca = plan.clips[A.id], cb = plan.clips[B.id];
        const exitPose = poseAt(T, model, ca, A.clipExit, bones, landmarks, rest), enterPose = poseAt(T, model, cb, B.clipEnter, bones, landmarks, rest);
        transitions.push({from: A.id, to: B.id, sequenceTime: +B.start.toFixed(4), fade: B.fade, clipExit: +A.clipExit.toFixed(4), clipEnter: +B.clipEnter.toFixed(4),
          sourceGap: compareSnapshots(T, exitPose, enterPose, bones, animated),
          exitVsRest: compareSnapshots(T, rest, exitPose, bones, animated).meanLocalDeg, enterVsRest: compareSnapshots(T, rest, enterPose, bones, animated).meanLocalDeg});
      }
      restore(model, bones, rest);
      const seq = createComboSequencer(T, model, plan.clips, plan.schedule), blended = {};
      try {
        for (const fps of fpsList) {
          const dt = 1 / fps, rows = transitions.map(() => ({maxLocalStepDeg: 0, maxWorldStepM: 0, maxWorldStepLandmark: null, at: null}));
          let prev = null, globalMax = {maxLocalStepDeg: 0, at: null, maxWorldStepM: 0, worldAt: null};
          for (let k = 0; k * dt <= plan.schedule.duration + 1e-9; k++) {
            const t = Math.min(plan.schedule.duration, k * dt); seq.seek(t); const snap = capture(T, model, bones, landmarks);
            if (prev) {
              const d = compareSnapshots(T, prev, snap, bones, animated), worldMax = Object.entries(d.world).reduce((m, [n, w]) => w.displacementM > m[1] ? [n, w.displacementM] : m, [null, 0]);
              if (d.maxLocalDeg > globalMax.maxLocalStepDeg) Object.assign(globalMax, {maxLocalStepDeg: d.maxLocalDeg, at: +t.toFixed(4), bone: d.maxLocalBone});
              if (worldMax[1] > globalMax.maxWorldStepM) Object.assign(globalMax, {maxWorldStepM: worldMax[1], worldAt: +t.toFixed(4), landmark: worldMax[0]});
              transitions.forEach((tr, j) => { const s = segs[j + 1]; if (t < s.start - margin || t > s.start + s.fade + margin) return; const r = rows[j];
                if (d.maxLocalDeg > r.maxLocalStepDeg) Object.assign(r, {maxLocalStepDeg: d.maxLocalDeg, at: +t.toFixed(4), bone: d.maxLocalBone});
                if (worldMax[1] > r.maxWorldStepM) Object.assign(r, {maxWorldStepM: worldMax[1], maxWorldStepLandmark: worldMax[0], worldAt: +t.toFixed(4)}); });
            }
            prev = snap;
          }
          blended[fps] = {perTransition: rows, global: globalMax};
        }
      } finally { seq.dispose(); restore(model, bones, rest); }
      report.variants[variant] = {status: plan.status, missing: plan.missing, duration: +plan.schedule.duration.toFixed(4), schedule: segs.map(s => ({id: s.id, start: +s.start.toFixed(4), end: +s.end.toFixed(4), clipEnter: +s.clipEnter.toFixed(4), clipExit: +s.clipExit.toFixed(4), fade: s.fade})), transitions, blended};
    }
  } finally { restore(model, bones, rest); }
  report.verdict = 'NUMERIC_ONLY_NO_VISUAL_OR_CANONICAL_PARITY_CLAIM';
  return report;
}
