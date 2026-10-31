import assert from 'node:assert/strict';
import * as THREE from 'three';
import { inspectHsinWaypointContinuity } from '../src/scripts/hsin-waypoint-safety.mjs';

// These are original synthetic fixtures: no Hsin model, textures or derived
// user assets. Test both guard conditions independently of the real rig.
function pose(elbowX, rotation = 0) {
  return {
    shoulder: new THREE.Vector3(0, 0, 0),
    elbow: new THREE.Vector3(elbowX, .5, .02),
    wrist: new THREE.Vector3(0, 1, 0),
    quaternions: [
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotation),
      new THREE.Quaternion(),
      new THREE.Quaternion(),
      new THREE.Quaternion(),
    ],
  };
}
let check = inspectHsinWaypointContinuity([
  pose(.2, 0), pose(.22, .05), pose(.25, .10),
  pose(.22, .15), pose(.20, .20),
]);
assert.equal(check.ok, true, 'coherent bend and small angular steps accepted');
assert.equal(check.reason, null);

check = inspectHsinWaypointContinuity([
  pose(.2), pose(.22), pose(-.25), pose(-.22), pose(-.2),
]);
assert.equal(check.ok, false, 'switched elbow bend plane must be rejected');
assert.equal(check.reason, 'elbow-branch-inversion');
assert.equal(check.frameIndex, 2);

check = inspectHsinWaypointContinuity([
  pose(.2, 0), pose(.2, .1), pose(.2, 1.6), pose(.2, 1.7),
]);
assert.equal(check.ok, false, 'excessive adjacent joint rotation must be rejected');
assert.equal(check.reason, 'excessive-joint-step');

check = inspectHsinWaypointContinuity([pose(.2)]);
assert.equal(check.ok, false);
assert.equal(check.reason, 'insufficient-waypoints');

check = inspectHsinWaypointContinuity([
  pose(.2), { ...pose(.2), quaternions: [] },
]);
assert.equal(check.reason, 'inconsistent-joints');
console.log('Hsin spatial CCD safety: accepted smooth paths; rejected elbow flips and joint jumps (PASS)');
