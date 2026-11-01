// Chest gesture on a synthetic, human-scale skeleton: real THREE bones, hand-skinned torso and arm vertices.
// No GLB. This covers the geometry the fake-pose tests cannot: restoration, endpoints, statelessness, breath, composition.
// It is a regression net, not a visual approval: sleeve, bust and hair still need a human review with the real model.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createChestDirector, createChestPose} from '../src/scripts/hsin-chest-gesture.mjs';
import {ARM_ROLES} from '../src/scripts/hsin-arm-roles.mjs';
import {BREATH_ANGLE} from '../src/scripts/hsin-limb-motion.mjs';
import {COMPOSITION} from '../src/scripts/hsin-hand-composition.mjs';

const v = (...a) => new THREE.Vector3(...a);

function buildRig() {
  const scene = new THREE.Group();
  const bones = [];
  const add = (name, parent, world) => {
    const bone = new THREE.Bone(); bone.name = name;
    const parentWorld = parent === scene ? v() : parent.userData.world;
    bone.position.copy(world).sub(parentWorld); bone.userData.world = world.clone();
    parent.add(bone); bones.push(bone); return bone;
  };
  const spine = add('ORG-Bip001Spine2', scene, v(0, 1.25, 0)), neck = add('ORG-Bip001Neck', scene, v(0, 1.48, 0));
  const head = add('ORG-Bip001Head', scene, v(0, 1.65, 0));
  const chain = (prefix, side, parentFor) => {
    const shoulder = side === 'L' ? v(.18, 1.42, 0) : v(-.18, 1.42, 0), mirror = side === 'L' ? 1 : -1;
    const upper = add(`${prefix}-Bip001UpperArm.${side}`, parentFor(), shoulder);
    const fore = add(`${prefix}-Bip001Forearm.${side}`, upper, v(.2 * mirror, 1.12, 0));
    const hand = add(`${prefix}-Bip001Hand.${side}`, fore, v(.2 * mirror, .88, .04));
    return {upper, fore, hand};
  };
  const org = chain('ORG', 'L', () => scene), def = chain('DEF', 'L', () => scene), right = chain('ORG', 'R', () => scene);
  const finger = add('ORG-Bip001Finger1.L', org.hand, v(.2, .8, .04));
  scene.updateMatrixWorld(true);
  const inverse = new Map(bones.map((b) => [b, b.matrixWorld.clone().invert()]));

  // One skinned body mesh: a torso grid in front of the spine plus a few rigid arm vertices.
  const positions = [], skin = [], owner = [];
  const vertex = (p, bone) => { positions.push(p.x, p.y, p.z); skin.push(owner.length, 0, 0, 0); owner.push(bone); };
  const columns = 23, rows = 23;
  for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) vertex(v(-.22 + c * .02, 1.18 + r * .02, .06), spine);
  for (const [bone, p] of [[def.upper, v(.19, 1.3, .02)], [def.fore, v(.2, 1.0, .02)], [def.fore, v(.2, 1.05, .05)], [def.hand, v(.2, .88, .05)], [org.hand, v(.2, .86, .05)], [finger, v(.2, .8, .05)]]) vertex(p, bone);
  const slots = [...new Set(owner)], index = [];
  const remap = owner.map((b) => slots.indexOf(b));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(remap.flatMap((s) => [s, 0, 0, 0]), 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(owner.flatMap(() => [1, 0, 0, 0]), 4));
  for (let r = 0; r + 1 < rows; r++) for (let c = 0; c + 1 < columns; c++) { const a = r * columns + c, b = a + 1, d = a + columns, e = d + 1; index.push(a, b, d, b, e, d); }
  g.setIndex(index);
  const mesh = {
    geometry: g, material: {name: 'Up Xin'}, matrixWorld: new THREE.Matrix4(),
    skeleton: {bones: slots, update() {}}, updateWorldMatrix() {},
    getVertexPosition(i, target) { const bone = owner[i]; bone.updateWorldMatrix(true, false); return target.set(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]).applyMatrix4(inverse.get(bone)).applyMatrix4(bone.matrixWorld); },
  };
  return {scene, bones, head, meshes: [mesh], right, left: org, deform: def, finger, spine};
}

const quats = (list) => list.map((b) => b.quaternion.toArray());
const sameQuats = (a, b, tolerance = 0) => a.every((q, i) => q.every((x, k) => Math.abs(x - b[i][k]) <= tolerance));
const calibration = {ready: true, focusCenter: [0, 0, .09], radius: .1575}; // eye span 0.063 m
const eyeSpan = .063;

const rig = buildRig();
const armBones = [rig.left.upper, rig.left.fore, rig.left.hand, rig.deform.upper, rig.deform.fore, rig.deform.hand, rig.finger];
const rightBones = [rig.right.upper, rig.right.fore, rig.right.hand];
const worldHand = () => { rig.left.hand.updateWorldMatrix(true, false); return rig.left.hand.getWorldPosition(v()); };
const rest = quats(armBones), restRight = quats(rightBones);

// The right wrist as the approved under-chin pose would leave it: high, to the character's right, in front of the chest.
const companion = [-.04, 1.62, .13];
const make = (extra = {}) => createChestPose({THREE, bones: rig.bones, meshes: rig.meshes, head: rig.head, calibration, ...extra});

// ---------------------------------------------------------------------------------------------
// 1. The plain gesture is ready on a sane rig, and the right arm is never touched.
// ---------------------------------------------------------------------------------------------
const plain = make();
const info = plain.diagnostics();
assert.equal(info.ready, true, `plain gesture must be ready on the synthetic rig: ${info.reason}`);
assert.equal(info.variants.plain.ok, true, info.variants.plain.reason);
assert.equal(info.composition.accepted, false, 'without a measured companion there is no composition');
assert.equal(info.pathGuard.worstViolations.torso, 0);
assert.ok(info.pathGuard.samples >= 65 + 6, 'the guard samples the route and the breath extremes');
assert.ok(sameQuats(quats(armBones), rest), 'building the gesture leaves the arm at rest');
assert.ok(sameQuats(quats(rightBones), restRight));
assert.equal(plain.atBaseline(), true);

// ---------------------------------------------------------------------------------------------
// 2. Endpoints, restoration and statelessness: the pose is a pure function of (weight, breath).
// ---------------------------------------------------------------------------------------------
const snapshot = (weight, options) => { plain.apply(weight, options); const out = quats(armBones); plain.restore(); return out; };
assert.ok(sameQuats(snapshot(0), rest), 'weight 0 is exactly the rest pose');
assert.ok(sameQuats(snapshot(0, {breath: 1}), rest), 'breath alone never moves a resting arm');
const home = snapshot(1);
assert.ok(!sameQuats(home, rest, 1e-3), 'weight 1 is a different pose');
const chestCenter = v(0, 1.44, .19);
plain.apply(1); const arrived = worldHand(); plain.restore();
assert.ok(arrived.distanceTo(chestCenter) < .2, `the hand arrives near the chest (${arrived.toArray().map((x) => x.toFixed(3))})`);
assert.ok(sameQuats(quats(armBones), rest), 'restore() is exact');
// Order independence: reaching a weight from anywhere gives the same pose.
plain.apply(.9); plain.apply(.2);
const fromAbove = quats(armBones); plain.restore();
assert.ok(sameQuats(fromAbove, snapshot(.2)), 'no hidden state between frames');
plain.apply(1, {breath: 1}); plain.apply(1, {breath: -1}); plain.apply(1);
assert.ok(sameQuats(quats(armBones), home), 'breath leaves no residue');
plain.restore();
for (const w of [.1, .4, .7, .88]) assert.ok(sameQuats(snapshot(w, {breath: 1}), snapshot(w)), `no breath before the arm is home (weight ${w})`);
assert.ok(sameQuats(quats(rightBones), restRight), 'the gesture never writes to the right arm');

// ---------------------------------------------------------------------------------------------
// 3. Breath is small, symmetric and affects only the settled arm.
// ---------------------------------------------------------------------------------------------
{
  const up = snapshot(1, {breath: 1}), down = snapshot(1, {breath: -1});
  assert.ok(!sameQuats(up, down, 1e-6), 'the arm really moves with the breath');
  const worldAngle = (options) => { plain.apply(1, options); rig.left.hand.updateWorldMatrix(true, false); const q = rig.left.hand.getWorldQuaternion(new THREE.Quaternion()); plain.restore(); return q; };
  const spread = THREE.MathUtils.radToDeg(worldAngle({breath: 1}).angleTo(worldAngle({breath: -1})));
  const budget = THREE.MathUtils.radToDeg(2 * (BREATH_ANGLE.upper + BREATH_ANGLE.fore + BREATH_ANGLE.hand));
  assert.ok(spread > 0 && spread <= budget + 1e-6, `breath swing stays within its budget (${spread.toFixed(2)}° of ${budget.toFixed(2)}°)`);
}

// ---------------------------------------------------------------------------------------------
// 4. Along the whole route: finite unit quaternions, a hand that keeps clear of the torso, no jumps.
// ---------------------------------------------------------------------------------------------
{
  let previous = null, biggest = 0;
  for (let i = 0; i <= 400; i++) {
    plain.apply(i / 400, {breath: Math.sin(i / 7)});
    for (const bone of armBones) { assert.ok(bone.quaternion.toArray().every(Number.isFinite)); assert.ok(Math.abs(bone.quaternion.length() - 1) < 1e-6); }
    const p = worldHand(); if (previous) biggest = Math.max(biggest, p.distanceTo(previous)); previous = p.clone();
  }
  plain.restore();
  assert.ok(biggest < eyeSpan * .5, `the hand never jumps between frames (${(biggest / eyeSpan).toFixed(3)} eye spans per 1/400)`);
}

// ---------------------------------------------------------------------------------------------
// 5. Roles: the chest gesture refuses the signature arm and never touches it.
// ---------------------------------------------------------------------------------------------
{
  const refused = make({side: ARM_ROLES.signature.side});
  assert.equal(refused.diagnostics().role, 'REFUSED'); assert.equal(refused.apply(1), false);
  assert.ok(sameQuats(quats(rightBones), restRight));
}

// ---------------------------------------------------------------------------------------------
// 6. Optional composition: accepted, bounded, guarded, reversible, and plain is always available.
// ---------------------------------------------------------------------------------------------
const composedPose = make({companion});
const composedInfo = composedPose.diagnostics();
assert.equal(composedInfo.ready, true, composedInfo.reason);
assert.equal(composedInfo.composition.accepted, true, composedInfo.composition.reason);
assert.ok(composedInfo.composition.shiftEyeSpans > 0 && composedInfo.composition.shiftEyeSpans <= COMPOSITION.maxShift + 1e-9);
assert.ok(composedInfo.composition.gapEyeSpans >= COMPOSITION.minGap - 1e-9);
assert.equal(composedInfo.variants.composed.ok, true, composedInfo.variants.composed.reason);
assert.ok(composedInfo.variants.composed.minHandGapEyeSpans >= COMPOSITION.hardGap, 'the hands stay apart along the whole composed route');
assert.ok(sameQuats(quats(armBones), rest), 'building both variants leaves the arm at rest');
{
  const handAt = (pose, label) => { assert.equal(pose.select(label), true); pose.apply(1); const p = worldHand(); pose.restore(); return p; };
  const plainEnd = handAt(composedPose, 'plain'), composedEnd = handAt(composedPose, 'composed');
  const shift = plainEnd.distanceTo(composedEnd);
  assert.ok(shift > 1e-4 && shift <= (COMPOSITION.maxShift + .1) * eyeSpan, `composed ends a little nearer the other hand, never far (${(shift / eyeSpan).toFixed(2)} eye spans)`);
  assert.ok(composedEnd.distanceTo(v(...companion)) < plainEnd.distanceTo(v(...companion)), 'the composed hand is the nearer one');
  assert.ok(composedEnd.distanceTo(v(...companion)) >= COMPOSITION.hardGap * eyeSpan);
  composedPose.select('composed'); composedPose.apply(0); assert.ok(sameQuats(quats(armBones), rest), 'composed variant also starts at exact rest');
  composedPose.apply(1); composedPose.restore(); assert.ok(sameQuats(quats(armBones), rest), 'and restores exactly');
  assert.equal(composedPose.select('missing'), false, 'an unknown variant falls back to plain');
  assert.equal(composedPose.diagnostics().activeVariant, 'plain');
  assert.equal(composedPose.atBaseline(), true);
}
// A companion that is already too close is refused and the gesture stays plain.
{
  const crowded = make({companion: [.02, 1.5, .2]});
  assert.equal(crowded.diagnostics().ready, true);
  assert.equal(crowded.diagnostics().composition.accepted, false);
  assert.equal(crowded.select('composed'), false);
  assert.equal(crowded.diagnostics().variants.composed, undefined);
}

// ---------------------------------------------------------------------------------------------
// 7. The real director on the real pose: both variants perform and the arm returns exactly home.
// ---------------------------------------------------------------------------------------------
{
  const seen = new Set();
  const actor = createChestDirector({pose: composedPose, seed: 12, organic: true, compose: () => true});
  for (let n = 0; n < 24; n++) {
    assert.equal(actor.start(true), true, 'the arm is at baseline before every gesture');
    seen.add(actor.diagnostics().variant);
    let peak = 0, guard = 0;
    while (actor.busy() && guard++ < 6000) { actor.advance(.02); peak = Math.max(peak, worldHand().y); }
    assert.ok(guard < 6000);
    assert.ok(sameQuats(quats(armBones), rest), `gesture ${n} returns the arm to exact rest`);
    assert.ok(sameQuats(quats(rightBones), restRight));
    assert.ok(peak > 1.2, 'the hand really rises toward the chest');
  }
  assert.deepEqual([...seen].sort(), ['composed', 'plain'], 'both variants are performed over a session');
}

console.log('Chest rig: ready, exact rest/endpoints, stateless pose, bounded breath, guarded optional composition, right arm untouched PASS');
