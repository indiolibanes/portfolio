// Public-safe synthetic arm rig: tests reversible Hsin v1.0.7 IK without any
// Wuthering Waves asset, texture, mesh, screenshot or model data.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHsinGestureLab, canonicalHsinBoneName, resolveHsinBones } from '../src/scripts/hsin-gesture-ik.mjs';

const events = new Map();
const canvas = {
  style: {},
  addEventListener(type, callback) { events.set(type, callback); },
  removeEventListener(type) { events.delete(type); },
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
};
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
camera.position.set(0, 0, 3);
camera.updateMatrixWorld(true);
const orbit = { enabled: true };
function bone(name, x, y, z) {
  const b = new THREE.Bone();
  // GLTFLoader → PropertyBinding.sanitizeNodeName() removes the . in .R
  b.name = name.replaceAll('.', '');
  b.position.set(x, y, z);
  return b;
}
const clavicle = bone('ORG-Bip001Clavicle.R', -.21, .16, 0);
const upper = bone('ORG-Bip001UpperArm.R', 0, -.01, 0);
const forearm = bone('ORG-Bip001Forearm.R', -.05, -.19, 0);
const hand = bone('ORG-Bip001Hand.R', -.04, -.19, 0);
const fingerBase = bone('ORG-Bip001Finger1.R', 0, -.06, 0);
const fingerMiddle = bone('ORG-Bip001Finger11.R', 0, -.04, 0);
const fingerTip = bone('ORG-Bip001Finger12.R', 0, -.035, 0);
scene.add(clavicle);
clavicle.add(upper); upper.add(forearm); forearm.add(hand);
hand.add(fingerBase); fingerBase.add(fingerMiddle); fingerMiddle.add(fingerTip);
// The 823-joint active skin also has a parallel DEF chain for deformation.
const defUpper = bone('DEF-Bip001UpperArm.R', 0, -.01, 0);
const defUpperTwist = bone('DEF-Bip001UpperArm.R.001', 0, -.08, 0);
const defForearm = bone('DEF-Bip001Forearm.R', -.05, -.11, 0);
const defForearmTwist = bone('DEF-Bip001Forearm.R.001', 0, -.09, 0);
const defHand = bone('DEF-Bip001Hand.R', -.04, -.10, 0);
const head = bone('ORG-Bip001Head', 0, .22, 0);
const defHead = bone('DEF-Bip001Head', 0, .22, 0);
scene.add(head, defHead);
const extraFingers = [2, 3, 4].map((index) => ({
  org: bone('ORG-Bip001Finger' + index + '.R', 0, -.035, .025 * index),
  def: bone('DEF-Bip001Finger' + index + '.R', 0, -.035, .025 * index),
}));
extraFingers.forEach(({ org, def }) => { hand.add(org); defHand.add(def); });
const defIndex = bone('DEF-Bip001Finger1.R', 0, -.04, 0);
defHand.add(defIndex);
clavicle.add(defUpper); defUpper.add(defUpperTwist);
defUpperTwist.add(defForearm); defForearm.add(defForearmTwist);
defForearmTwist.add(defHand);
const skeleton = [
  clavicle, upper, forearm, hand, fingerBase, fingerMiddle, fingerTip,
  defUpper, defUpperTwist, defForearm, defForearmTwist, defHand,
  head, defHead, defIndex, ...extraFingers.flatMap(({org, def}) => [org, def]),
];
const rests = new Map(skeleton.map(item => [item,item.quaternion.clone()]));
const sampleFace = new THREE.Mesh(new THREE.SphereGeometry(.11,12,10), new THREE.MeshBasicMaterial());
scene.add(sampleFace);
scene.updateMatrixWorld(true);
const lab = createHsinGestureLab({
  THREE, scene, camera, orbit, canvas,
  onStatus() {}, invalidate() {}, getFaceMeshes: () => [sampleFace],
});
assert.equal(lab.attach(skeleton, rests), true);
assert.equal(lab.getDiagnostics().ready, true);
assert.equal(lab.getDiagnostics().secondaryDeformers, true);
assert.equal(lab.getDiagnostics().actingBones.length, 4);
assert.equal(lab.getDiagnostics().actingDeformers, 5);
// Regression: the glTF strings contain .R while THREE skeleton Bone.name lacks the dot.
assert.equal(lab.getDiagnostics().matchedBoneNames['ORG-Bip001Hand.R'], 'ORG-Bip001HandR');
assert.equal(lab.getDiagnostics().matchedBoneNames['ORG-Bip001Finger12.R'], 'ORG-Bip001Finger12R');
assert.equal(canonicalHsinBoneName('ORG-Bip001Finger1.R'), canonicalHsinBoneName('ORG-Bip001Finger1R'));
const expected = ['ORG-Bip001Hand.R'];
assert.equal(resolveHsinBones(skeleton, expected).missing.length, 0);
const ambiguous = resolveHsinBones([hand, {name: 'ORG-Bip001Hand_R'}], expected);
assert.equal(ambiguous.ambiguous.length, 1, 'ambiguous aliases must be rejected');
assert.equal(ambiguous.resolved.size, 0);
assert.equal(resolveHsinBones([{name:'Bip001HandR'}], expected).missing.length, 1);
assert.equal(lab.chooseTarget(), true);
assert.equal(orbit.enabled, false);
events.get('pointerdown')({
  isPrimary: true, clientX: 50, clientY: 50,
  preventDefault() {}, stopPropagation() {},
});
assert.equal(orbit.enabled, true);
assert.ok(lab.getTarget());
const contact = lab.getContactLocal(); assert.ok(contact);
const targetBefore = lab.getTarget(); head.position.x += .1; scene.updateMatrixWorld(true);
assert.ok(Math.abs(lab.getTarget().x - targetBefore.x - .1) < 1e-6, 'contact follows head');
head.position.x -= .1; scene.updateMatrixWorld(true);
assert.equal(lab.restoreContactLocal({bone:'invalid',position:[0,0,0]}),false);
assert.equal(lab.restoreContactLocal(contact),true);
const result = lab.pose();
assert.equal(result.ok, true);
assert.ok(Number.isFinite(result.distance), 'IK distance must be finite');
assert.ok(result.iterations <= 22, 'bounded CPU iterations');
assert.equal(lab.rotations().length, 4);
assert.equal(lab.restoreRotations([{name:'hacked',quaternion:[0,0,0,1]}]), false);
const data=lab.rotations();
assert.equal(lab.restoreRotations(data),true);
lab.restoreChain();
for (const joint of [clavicle,upper,forearm,hand,defUpper,defForearm]) {
  assert.ok(joint.quaternion.angleTo(rests.get(joint)) < 1e-5, joint.name);
}
// Animation regression: deterministic fake rAF, no browser and no third-party
// character data. The transition must not jump to the final quaternions.
const savedRequest = globalThis.requestAnimationFrame;
const savedCancel = globalThis.cancelAnimationFrame;
let nextFrameId = 1;
const scheduled = new Map();
globalThis.requestAnimationFrame = (fn) => {
  const id = nextFrameId++;
  scheduled.set(id, fn);
  return id;
};
globalThis.cancelAnimationFrame = (id) => { scheduled.delete(id); };
const runFrame = (time) => {
  const pending = [...scheduled.values()];
  scheduled.clear();
  for (const fn of pending) fn(time);
};
try {
  lab.restoreChain();
  const joints = [clavicle, upper, forearm, hand];
  const actors = [head, ...extraFingers.map(({ org }) => org)];
  const homeActors = actors.map((joint) => joint.quaternion.clone());
  const home = joints.map((joint) => joint.quaternion.clone());
  assert.equal(lab.pose().ok, true);
  const goal = joints.map((joint) => joint.quaternion.clone());
  assert.ok(goal.some((q, i) => q.angleTo(home[i]) > 0.01),
    'synthetic gesture must rotate at least one joint');
  lab.restoreChain();
  const animated = lab.animateToPose(1000, { actingLevel: .7, staged: true });
  assert.equal(animated.ok, true);
  assert.equal(animated.animated, true);
  assert.equal(lab.getDiagnostics().animating, true);
  joints.forEach((joint, i) => {
    assert.ok(joint.quaternion.angleTo(home[i]) < 1e-6,
      'IK solve must be visually restored before first animation frame');
  });
  runFrame(0);
  runFrame(500);
  const midway = joints.map((joint) => joint.quaternion.clone());
  assert.ok(midway.some((q, i) =>
    q.angleTo(home[i]) > 0.002 && q.angleTo(goal[i]) > 0.002),
    'intermediate quaternions must be distinct from both endpoints');
  lab.setVisible(false);
  assert.equal(scheduled.size, 0, 'offscreen animation must pause');
  lab.setVisible(true);
  runFrame(1000); // The first resumed frame must not consume hidden time.
  joints.forEach((joint, i) =>
    assert.ok(joint.quaternion.angleTo(midway[i]) < 1e-6, 'resume must not jump'));
  runFrame(1500);
  assert.equal(lab.getDiagnostics().animating, false);
  joints.forEach((joint, i) =>
    assert.ok(joint.quaternion.angleTo(goal[i]) < 1e-5, 'IK endpoint preserved'));
  actors.forEach((joint, i) =>
    assert.ok(joint.quaternion.angleTo(homeActors[i]) > 0.004,
      'subtle secondary head/finger animation must reach an intentional pose: ' + joint.name));
  for (const [org, def] of [[head, defHead], ...extraFingers.map(({org, def}) => [org, def])]) {
    assert.ok(def.quaternion.angleTo(rests.get(def)) > 0.003,
      'parallel DEF should follow active ORG motion: ' + org.name);
  }

  assert.equal(lab.animateRestore(800), true);
  runFrame(1600);
  runFrame(2000);
  runFrame(2400);
  assert.equal(lab.getDiagnostics().animating, false);
  joints.forEach((joint, i) =>
    assert.ok(joint.quaternion.angleTo(home[i]) < 1e-5, 'reversible return'));
  actors.forEach((joint, i) =>
    assert.ok(joint.quaternion.angleTo(homeActors[i]) < 1e-5,
      'restored secondary acting: ' + joint.name));
  // Compare actual v1.0.8 fallback and staged choreography under the same
  // rig: the classic mode must not introduce secondary acting.
  lab.animateToPose(1000, { actingLevel: 0, staged: false });
  runFrame(3000); runFrame(4000);
  actors.forEach((joint, i) =>
    assert.ok(joint.quaternion.angleTo(homeActors[i]) < 1e-5,
      'classic baseline must not animate secondary acting'));
  lab.restoreChain();

  // Spatial mode is a separate experimental CCD path, with the same endpoint.
  const spatial = lab.animateToPose(1000, { spatial:true, actingLevel:0 });
  assert.equal(spatial.ok,true); assert.equal(spatial.animated,true);
  // A synthetic test rig may pass the safety gate (5 samples) or legitimately
  // reject a limb flip (0 samples + fallback). Both must reach the approved
  // target without re-solving CCD on animation frames.
  assert.equal(spatial.bakedSamples, spatial.trajectoryAccepted ? 5 : 0);
  if (!spatial.trajectoryAccepted) assert.ok(spatial.fallbackReason);
  const countAfterPlanning = lab.getDiagnostics().solveCount;
  runFrame(5000); runFrame(5500);
  assert.equal(lab.getDiagnostics().solveCount,countAfterPlanning,'playback must not solve CCD per frame');
  assert.equal(lab.getDiagnostics().animating,true);
  assert.ok(joints.some((joint,i)=>joint.quaternion.angleTo(home[i])>.002), 'waypoint must move the rig');
  lab.setVisible(false); assert.equal(scheduled.size,0);lab.setVisible(true);
  runFrame(10000); runFrame(10500);
  assert.equal(lab.getDiagnostics().animating,false);
  joints.forEach((joint,i)=>assert.ok(joint.quaternion.angleTo(goal[i])<1e-5, 'spatial endpoint matches baseline'));
  lab.restoreChain();

  // An interrupted animation cannot continue to modify the rig afterward.
  lab.animateToPose(1000);
  assert.ok(scheduled.size > 0);
  lab.stopMotion();
  assert.equal(scheduled.size, 0);
} finally {
  if (savedRequest === undefined) delete globalThis.requestAnimationFrame;
  else globalThis.requestAnimationFrame = savedRequest;
  if (savedCancel === undefined) delete globalThis.cancelAnimationFrame;
  else globalThis.cancelAnimationFrame = savedCancel;
}
lab.dispose();
assert.equal(events.has('pointerdown'),false);
sampleFace.geometry.dispose();sampleFace.material.dispose();
// Regression: another arm with all legacy names is NOT part of this active skin.
const legacy = bone('Bip001UpperArm.R', 0, 0, 0);
assert.equal(lab.getDiagnostics().ready, true);
assert.ok(!lab.rotations().some((x) => x.name === legacy.name));
console.log('Hsin v1.0.9 synthetic rig, staged acting, extra ORG/DEF, classic fallback, pause and undo: PASS');
