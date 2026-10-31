// Public-safe synthetic arm rig: tests reversible Hsin v1.0.7 IK without any
// Wuthering Waves asset, texture, mesh, screenshot or model data.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHsinGestureLab } from '../src/scripts/hsin-gesture-ik.mjs';

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
  b.name = name;
  b.position.set(x, y, z);
  return b;
}
const clavicle = bone('Bip001Clavicle.R', -.21, .16, 0);
const upper = bone('Bip001UpperArm.R', 0, -.01, 0);
const forearm = bone('Bip001Forearm.R', -.05, -.19, 0);
const hand = bone('Bip001Hand.R', -.04, -.19, 0);
const fingerBase = bone('Bip001Finger1.R', 0, -.06, 0);
const fingerMiddle = bone('Bip001Finger11.R', 0, -.04, 0);
const fingerTip = bone('Bip001Finger12.R', 0, -.035, 0);
scene.add(clavicle);
clavicle.add(upper); upper.add(forearm); forearm.add(hand);
hand.add(fingerBase); fingerBase.add(fingerMiddle); fingerMiddle.add(fingerTip);
const skeleton = [clavicle,upper,forearm,hand,fingerBase,fingerMiddle,fingerTip];
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
assert.equal(lab.chooseTarget(), true);
assert.equal(orbit.enabled, false);
events.get('pointerdown')({
  isPrimary: true, clientX: 50, clientY: 50,
  preventDefault() {}, stopPropagation() {},
});
assert.equal(orbit.enabled, true);
assert.ok(lab.getTarget());
const result = lab.pose();
assert.equal(result.ok, true);
assert.ok(Number.isFinite(result.distance), 'IK distance must be finite');
assert.ok(result.iterations <= 22, 'bounded CPU iterations');
assert.equal(lab.rotations().length, 4);
assert.equal(lab.restoreRotations([{name:'hacked',quaternion:[0,0,0,1]}]), false);
const data=lab.rotations();
assert.equal(lab.restoreRotations(data),true);
lab.restoreChain();
for (const joint of [clavicle,upper,forearm,hand]) {
  assert.ok(joint.quaternion.angleTo(rests.get(joint)) < 1e-5, joint.name);
}
lab.dispose();
assert.equal(events.has('pointerdown'),false);
sampleFace.geometry.dispose();sampleFace.material.dispose();
console.log('Hsin v1.0.7 synthetic rig, gesture target and reversible CCD: PASS');
