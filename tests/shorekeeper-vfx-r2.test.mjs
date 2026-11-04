import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ShorekeeperVfxR2Director, VFX_R2_STATES, STAGE_TINTS, STAGE_REFERENCE_STATUS, CORE_PHASES, CORE_PERIOD, corePhaseName, renderWingAtlas} from '../src/scripts/shorekeeper/vfx-r2.mjs';

const make = (o = {}) => { const scene = new T.Scene(); return {scene, vfx: new ShorekeeperVfxR2Director(scene, o)}; };
const run = (v, seconds, dt = 1 / 30) => { for (let t = 0; t < seconds; t += dt) v.update(dt, 1); };

test('manual state machine cycles OFF -> ... -> RECOVERY -> OFF (RECOVERY never loops to AMBIENT)', () => {
  const {vfx} = make(); assert.equal(vfx.state, 'OFF'); const seen = [vfx.state];
  for (let i = 0; i < VFX_R2_STATES.length; i++) { vfx.next(); seen.push(vfx.state); }
  assert.deepEqual(seen, ['OFF', 'AMBIENT', 'PREPARATION', 'STELLAREALM', 'RESONANCE_PEAK', 'RECOVERY', 'OFF']);
  assert.throws(() => vfx.setState('BOGUS'), /inválido/); vfx.dispose();
});

test('nothing is visible in OFF; the peak shows every system; the root stays invisible when disabled', () => {
  const {vfx} = make(); assert.equal(vfx.root.visible, false);
  vfx.setState('RESONANCE_PEAK'); run(vfx, 2); assert.equal(vfx.root.visible, true);
  for (const k of ['butterflies', 'collapsedCore', 'field', 'canopy']) vfx.setEnabled(k, false);
  assert.equal(vfx.root.visible, false); vfx.dispose();
});

test('modes gate gameplay field and cinematic canopy independently', () => {
  const {vfx} = make(); vfx.setState('RESONANCE_PEAK'); run(vfx, 2);
  vfx.setMode('FIELD_GAMEPLAY'); assert.equal(vfx.field.visible, true); assert.equal(vfx.rings.visible, false); assert.equal(vfx.dome.visible, false);
  vfx.setMode('CINEMATIC_CANOPY'); assert.equal(vfx.field.visible, false); assert.equal(vfx.rings.visible, true);
  vfx.setMode('BOTH'); assert.equal(vfx.field.visible && vfx.rings.visible, true);
  assert.throws(() => vfx.setMode('X'), /inválido/); vfx.dispose();
});

test('Collapsed Core has five ordered phases and advances only in PREPARATION and above', () => {
  assert.deepEqual(CORE_PHASES.map(p => p[0]), ['SPAWN', 'GATHER', 'HOLD', 'CONVERT', 'DISSOLVE']);
  assert.equal(CORE_PHASES[0][1], 0); assert.equal(CORE_PHASES.at(-1)[2], 1);
  CORE_PHASES.forEach((p, i) => { if (i) assert.equal(p[1], CORE_PHASES[i - 1][2], 'contiguous'); });
  assert.equal(corePhaseName(0.1), 'SPAWN'); assert.equal(corePhaseName(0.6), 'HOLD'); assert.equal(corePhaseName(0.95), 'DISSOLVE');
  const {vfx} = make(); vfx.setState('AMBIENT'); run(vfx, 3); assert.equal(vfx.corePhase, 0, 'no core in AMBIENT');
  vfx.setState('PREPARATION'); run(vfx, CORE_PERIOD * 0.5); assert.ok(vfx.corePhase > 0.3 && vfx.corePhase < 0.7);
  vfx.seek({corePhase: 0.8}); run(vfx, 1); assert.equal(vfx.corePhase, 0.8, 'QA seek freezes the phase'); vfx.releaseSeek(); run(vfx, 0.5); assert.ok(vfx.corePhase > 0.8); vfx.dispose();
});

test('reduced motion freezes clocks, drops the core and flattens the wingbeat, still one finished frame', () => {
  const {vfx} = make({reducedMotion: true}); vfx.setState('STELLAREALM'); run(vfx, 2); assert.equal(vfx.time, 0);
  assert.equal(vfx.coreParticles.visible, false); assert.equal(vfx.report().reducedMotion, true);
  const flaps = new Set(Array.from({length: vfx.counts.butterflies}, (_, i) => Math.round(vfx.bMisc[i * 8 + 1] * 1000))); assert.deepEqual([...flaps], [600]); vfx.dispose();
});

test('pause (suspended) and invalid deltas never advance state', () => {
  const {vfx} = make(); vfx.setState('STELLAREALM'); vfx.setSuspended(true); run(vfx, 1); assert.equal(vfx.time, 0);
  vfx.setSuspended(false); vfx.update(NaN, 1); vfx.update(-1, 1); vfx.update(0, 1); assert.equal(vfx.time, 0); vfx.update(10, 1); assert.ok(vfx.time <= 0.1 + 1e-9, 'delta is clamped'); vfx.dispose();
});

test('butterflies: independent paths, tangent flight vectors, face-avoidance zone, wings mirrored by side', () => {
  const {vfx} = make({butterflies: 12}); vfx.setState('STELLAREALM'); run(vfx, 4);
  const pos = (i) => [vfx.bPos[i * 6], vfx.bPos[i * 6 + 1], vfx.bPos[i * 6 + 2]], set = new Set(Array.from({length: 12}, (_, i) => pos(i).map(v => v.toFixed(3)).join()));
  assert.equal(set.size, 12, 'every butterfly has its own position');
  for (let i = 0; i < 12; i++) {
    const f = [vfx.bFwd[i * 6], vfx.bFwd[i * 6 + 1], vfx.bFwd[i * 6 + 2]]; assert.ok(Math.abs(Math.hypot(...f) - 1) < 1e-5, 'unit forward');
    const d = Math.hypot(...pos(i).map((v, k) => v - vfx.head.getComponent(k))); assert.ok(d >= 0.399, 'outside the face zone: ' + d);
    assert.equal(vfx.bMisc[i * 8 + 2], 1); assert.equal(vfx.bMisc[i * 8 + 6], -1, 'second instance is the mirrored wing');
    assert.deepEqual([...vfx.bPos.slice(i * 6, i * 6 + 3)], [...vfx.bPos.slice(i * 6 + 3, i * 6 + 6)], 'both wings share the body position');
  }
  vfx.dispose();
});

test('flight is continuous: positions move smoothly frame to frame', () => {
  const {vfx} = make({butterflies: 6}); vfx.setState('STELLAREALM'); run(vfx, 3); let prev = Float32Array.from(vfx.bPos), worst = 0;
  for (let k = 0; k < 90; k++) { vfx.update(1 / 30, 1); for (let i = 0; i < 6; i++) worst = Math.max(worst, Math.hypot(vfx.bPos[i * 6] - prev[i * 6], vfx.bPos[i * 6 + 1] - prev[i * 6 + 1], vfx.bPos[i * 6 + 2] - prev[i * 6 + 2])); prev = Float32Array.from(vfx.bPos); }
  assert.ok(worst < 0.06, 'no teleporting; worst step ' + worst); vfx.dispose();
});

test('QA single butterfly pose (Gate C1) shows exactly one butterfly and can restore the swarm', () => {
  const {vfx} = make({butterflies: 10}); vfx.setState('STELLAREALM'); run(vfx, 3);
  vfx.qaButterfly({pos: [0, 0, 0], fwd: [1, 0, 0], flap: 0.3, scale: 0.2}); assert.equal(vfx.wings.geometry.instanceCount, 2); assert.ok(Math.abs(vfx.bMisc[1] - 0.3) < 1e-6);
  vfx.qaButterfly(null); assert.equal(vfx.wings.geometry.instanceCount, 20); vfx.dispose();
});

test('wing atlas is deterministic, non-empty, transparent at the corners and opaque near the thorax/body', () => {
  const a = renderWingAtlas(64), b = renderWingAtlas(64); assert.deepEqual(Buffer.from(a), Buffer.from(b)); assert.equal(a.length, 64 * 64 * 4);
  const alpha = (x, y) => a[((y * 64) + x) * 4 + 3]; assert.equal(alpha(63, 0), 0); assert.equal(alpha(63, 63), 0); assert.ok(alpha(1, 32) > 200, 'body axis is opaque');
  let covered = 0; for (let i = 0; i < 64 * 64; i++) if (a[i * 4 + 3] > 40) covered++; assert.ok(covered / 4096 > 0.2 && covered / 4096 < 0.7, 'wing coverage ' + covered / 4096);
  assert.ok(renderWingAtlas(64, 99).some((v, i) => v !== a[i]), 'seed changes the jagged edge');
});

test('stage tints are labelled as unverified references and change the shared tint only', () => {
  const {vfx} = make(); assert.equal(STAGE_REFERENCE_STATUS, 'STAGE_REFERENCE_UNVERIFIED'); assert.equal(vfx.report().stageReference, 'STAGE_REFERENCE_UNVERIFIED');
  for (const k of ['outer', 'inner', 'supernal']) { vfx.setStage(k); assert.deepEqual(vfx.tint.toArray(), STAGE_TINTS[k]); }
  assert.throws(() => vfx.setStage('x'), /inválido/); vfx.dispose();
});

test('stays inside the budget: <= 8 additional draw calls, CPU stats recorded, GPU honestly NOT_MEASURED', () => {
  const {vfx} = make(); vfx.setState('RESONANCE_PEAK'); run(vfx, 2); const r = vfx.report();
  assert.ok(r.estimatedAdditionalDrawCalls <= 8 && r.maxAdditionalDrawCalls <= 8); assert.equal(r.gpuTiming, 'NOT_MEASURED'); assert.equal(r.visualQA, 'VISUAL_QA_PENDING'); assert.equal(r.manualOnly, true); assert.ok(r.samples > 0);
  const mobile = make({mobile: true}).vfx; assert.ok(mobile.counts.butterflies < vfx.counts.butterflies && mobile.counts.canopyStars < vfx.counts.canopyStars); vfx.dispose(); mobile.dispose();
});

test('never writes to bones, morphs or animation: anchors are read-only and the director owns only its subtree', () => {
  const scene = new T.Scene(), model = new T.Group(), bone = new T.Bone(); bone.name = 'Bip001RHand'; bone.position.set(0.2, 1, 0.1); model.add(bone); scene.add(model);
  model.updateMatrixWorld(true); const before = bone.matrix.clone(), snapshot = JSON.stringify(model.toJSON());
  const vfx = new ShorekeeperVfxR2Director(scene); vfx.bindModel(model); vfx.setState('RESONANCE_PEAK'); run(vfx, 2);
  assert.ok(bone.matrix.equals(before)); assert.equal(JSON.stringify(model.toJSON()), snapshot); assert.equal(scene.children.filter(c => c.name === 'ShorekeeperVfxR2').length, 1); vfx.dispose();
});

test('dispose is idempotent, removes the subtree, frees GPU resources and silences later calls', () => {
  const {scene, vfx} = make(); let freed = 0; for (const o of [vfx.wings, vfx.coreParticles, vfx.field, vfx.rings]) { const g = o.geometry.dispose.bind(o.geometry); o.geometry.dispose = () => { freed++; g(); }; }
  vfx.dispose(); vfx.dispose(); assert.equal(freed, 4); assert.equal(scene.children.length, 0); assert.equal(vfx.setState('AMBIENT'), false); vfx.update(1, 1);
});
