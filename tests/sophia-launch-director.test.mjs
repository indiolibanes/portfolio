import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { R3 } from '../src/scripts/sophia-immersive-r3-timeline.mjs';
import { createLaunchDirector } from '../src/scripts/sophia-launch-director.ts';

function fixture(journey = false) {
  const root = new THREE.Group(), assembly = new THREE.Group(); assembly.name = 'Sophia_Flight_Left_Assembly'; assembly.rotation.y = -Math.PI / 2; root.add(assembly);
  const rocket = new THREE.Group(); rocket.name = 'Rocket_Flight_Mount'; rocket.scale.setScalar(.16); rocket.rotation.x = Math.PI / 2; rocket.position.set(-.177, .23, -.3); assembly.add(rocket);
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4.1, 24, 8), (journey ? new THREE.MeshStandardMaterial() : new THREE.MeshBasicMaterial())); hull.name = 'Fuselage'; hull.position.y = 2.73; rocket.add(hull);
  const plume = new THREE.Group(); plume.name = 'Plume_Root'; rocket.add(plume);
  const rider = new THREE.Group(); rider.name = 'Sophia_Astronauta_Rider_Mount'; rider.position.y = .216; assembly.add(rider);
  const motion = new THREE.Bone(); motion.name = 'Root_Motion'; rider.add(motion);
  const hips = new THREE.Bone(); hips.name = 'Hips'; hips.position.y = .3; motion.add(hips);
  const face = new THREE.Mesh();
  face.morphTargetDictionary = { BrowRaise: 0, BrowConcerned: 1, Blink_Both: 2, Smile: 3 };
  face.morphTargetInfluences = [0, 0, 0, 0];
  rider.add(face);
  const geometry = new THREE.BoxGeometry(.08, .08, .14), positions = geometry.getAttribute('position');
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(positions.count * 4), 4));
  const weights = new Float32Array(positions.count * 4); for (let i = 0; i < positions.count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  for (const [side, x] of [['L', -.1], ['R', .1]]) {
    const foot = new THREE.SkinnedMesh(geometry.clone(), new THREE.MeshBasicMaterial()); foot.name = 'Suit_Boot_' + side; foot.position.set(x, .05, .1); rider.add(foot);
    root.updateMatrixWorld(true); foot.bind(new THREE.Skeleton([hips]));
  }
  const ribbon = new THREE.Group(); ribbon.name = 'SpeedRibbon_1'; assembly.add(ribbon);
  const flight = new THREE.AnimationClip('Sophia_Foguete_Voo_Esquerda_Ondas_R2', 8, [
    new THREE.VectorKeyframeTrack('Hips.position', [0, 8], [0, .3, 0, 0, .3, 0]),
    new THREE.VectorKeyframeTrack('Root_Motion.position', [0, 8], [0, 0, 0, 0, 0, 0]),
    new THREE.VectorKeyframeTrack('Plume_Root.scale', [0, 8], [1, 1, 1, 1, 1, 1]),
  ]);
  const walk = new THREE.AnimationClip('Andar_R6', 1, [
    new THREE.VectorKeyframeTrack('Hips.position', [0, 1], [0, .3, 0, 0, .31, 0]),
    new THREE.VectorKeyframeTrack('Root_Motion.position', [0, 1], [100, 0, 0, 200, 0, 0]),
  ]);
  const controls = Object.assign(new THREE.EventDispatcher(), {
    target: new THREE.Vector3(), enableRotate: false, enableZoom: false,
  });
  const gltf = { scene: root, animations: [flight, walk] };
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 16 / 9, .005, 100);
  const original = JSON.stringify(gltf.animations.map(c => THREE.AnimationClip.toJSON(c)));
  const director = createLaunchDirector(gltf, scene, camera, controls, () => false, { journey, coarse: journey });
  return { director, controls, camera, original, gltf, rider, motion, face, scene };
}
test('R3 hides rider at reveal, preserves walking root, and settles on the real mount after liftoff', () => {
  const { director, controls, rider, motion, gltf, original } = fixture();
  assert.equal(director.supported, true);
  director.apply(0); assert.equal(rider.visible, false); assert.equal(director.snapshot().ribbonsVisible, false);
  assert.equal(director.snapshot().rocketVisible, true);
  assert.equal(controls.enableRotate, true);
  director.apply(7.1); assert.equal(director.snapshot().rocketVisible, true);
  director.apply(4); assert.equal(rider.visible, true); assert.ok(Math.abs(motion.position.x) < .001);
  const before = director.snapshot(); director.apply(9.4); assert.ok(director.snapshot().riderSeatError < 1e-8);
  director.apply(11.5); assert.ok(director.snapshot().riderSeatError < 1e-8); assert.deepEqual(director.snapshot().baseWorld, before.baseWorld);
  director.apply(12); assert.equal(director.snapshot().controlsEnabled, true);
  assert.equal(JSON.stringify(gltf.animations.map(c => THREE.AnimationClip.toJSON(c))), original);
  director.dispose();
});
test('world transforms are identical after seeking and replay', () => {
  const { director } = fixture(); director.apply(5.45); const expected = director.snapshot();
  director.apply(14); director.apply(0); director.apply(7); director.apply(5.45); assert.deepEqual(director.snapshot(), expected);
  director.reset(); director.apply(5.45); assert.deepEqual(director.snapshot(), expected); director.dispose();
});
test('replay rebases a manual orbit to the pad and Auto remains explicit', () => {
  const { director, controls, camera } = fixture();
  director.apply(12);
  controls.dispatchEvent({ type: 'start' });
  camera.position.add(new THREE.Vector3(.4, .7, .2));
  const offset = camera.position.clone().sub(controls.target);
  const target = controls.target.clone();
  const carrier = new THREE.Vector3(...director.snapshot().carrierWorld);
  director.reset(true);
  const pad = new THREE.Vector3(...director.snapshot().carrierWorld);
  assert.equal(director.snapshot().cameraMode, 'USER');
  assert.equal(director.snapshot().time, 0);
  assert.ok(camera.position.clone().sub(controls.target).distanceTo(offset) < 1e-8);
  assert.ok(controls.target.distanceTo(target.add(pad).sub(carrier)) < 1e-8);
  director.resetCamera();
  for (let i=0; i<10; i++) director.apply(0, .1);
  assert.equal(director.snapshot().cameraMode, 'AUTO');
  director.dispose();
});
test('Sophia anticipates the climb, blinks, braces and smiles using the authored facial targets', () => {
  const { director, face } = fixture();
  assert.deepEqual(face.morphTargetInfluences, [0, 0, 0, 0]);
  director.apply(4);
  assert.ok(face.morphTargetInfluences[0] > .3);
  director.apply(4.67);
  assert.ok(face.morphTargetInfluences[2] > .85);
  director.apply(7.4);
  assert.ok(face.morphTargetInfluences[1] > .25);
  director.apply(10.7);
  assert.ok(face.morphTargetInfluences[3] > .33);
  director.reset();
  assert.deepEqual(face.morphTargetInfluences, [0, 0, 0, 0]);
  director.dispose();
});
test('unknown hierarchy has an explicit, usable original-flight fallback', () => {
  const root = new THREE.Group(), controls = { target: new THREE.Vector3(), addEventListener() {} };
  const director = createLaunchDirector({ scene: root, animations: [] }, new THREE.Scene(), new THREE.PerspectiveCamera(), controls, () => false);
  assert.equal(director.supported, false); director.apply(12); assert.equal(director.snapshot().phase, 'FLIGHT_LOOP'); director.dispose();
});

test('Saturn uses the active clock, releases the camera, and restores the original launch on replay', () => {
  const { director, controls } = fixture();
  director.apply(22);
  const passage = director.snapshot();
  assert.equal(passage.saturn.distanceKm, 82e6);
  assert.ok(passage.riderSeatError < 1e-6);
  director.apply(30);
  const departing = director.snapshot();
  assert.ok(departing.carrierWorld[0] < passage.carrierWorld[0]);
  assert.ok(departing.ribbonsVisible && controls.enableRotate);
  director.apply(40);
  assert.ok(director.finished);
  assert.equal(director.snapshot().rocketVisible, false);
  director.reset();
  assert.equal(director.finished, false);
  assert.equal(director.snapshot().saturn, null);
  director.apply(22);
  assert.deepEqual(director.snapshot(), passage);
  director.dispose();
});

test('Journey has a dark, glazed vehicle at standby and continuous vertical clearance with no exterior rider', () => {
  const { director, controls, camera, rider, scene } = fixture(true);
  const canopy = scene.getObjectByName('Journey_Panoramic_Canopy');
  assert.ok(canopy?.material.transparent);
  assert.equal(scene.getObjectByName('VentAndSmoke_Emitter').count, 14);
  camera.aspect = 390 / 844;
  director.resize();
  const base = director.snapshot().baseWorld;
  const tarmac = scene.getObjectByName('Journey_Wet_Deck').children[0];
  const jet = scene.getObjectByName('Journey_Exhaust');
  assert.equal(jet.visible, false);
  assert.equal(tarmac.material.uniforms.energy.value, 0);
  for (const t of [4, R3.launch, R3.launch + .42, R3.launch + 1.55, R3.flight]) {
    director.apply(t);
    scene.updateMatrixWorld(true);
    assert.equal(rider.visible, false);
    assert.deepEqual(director.snapshot().baseWorld, base);
    if (jet.visible) {
      const tail = jet.localToWorld(new THREE.Vector3(0, -1, 0));
      assert.ok(tail.y >= base[1]);
      assert.ok(tarmac.material.uniforms.tail.value.distanceTo(tail) < 1e-6);
    }
  }
  assert.equal(jet.visible, false);
  assert.equal(controls.enableRotate, true);
  director.apply(R3.launch + 1.55);
  assert.ok(jet.visible && director.snapshot().exhaustLength > .15);
  assert.ok(controls.maxPolarAngle < Math.PI / 2);
  assert.equal(controls.enablePan, false);
  assert.ok(controls.minDistance > director.snapshot().unit);
  director.dispose();
  assert.equal(scene.getObjectByName('Journey_Exhaust'), undefined);
  assert.equal(scene.getObjectByName('Journey_Wet_Deck'), undefined);
});

test('Journey keeps the chosen orbit through the lift, with the tower held in the opening shot', () => {
  const { director, controls, camera } = fixture(true);
  const t = R3.launch;
  const target = controls.target.clone();
  director.apply(t + .5);
  assert.ok(controls.target.distanceTo(target) < 1e-10);
  const startAngle = Math.PI * 11 / 8;
  camera.position.copy(new THREE.Vector3(Math.cos(startAngle), .25, Math.sin(startAngle)).add(controls.target));
  controls.dispatchEvent({ type: 'start' });
  const offset = camera.position.clone().sub(controls.target);
  director.apply(t + 2.5);
  assert.ok(controls.target.distanceTo(target) > .05);
  assert.ok(camera.position.clone().sub(controls.target).distanceTo(offset) < 1e-9);
  director.reset(true);
  assert.ok(controls.target.distanceTo(target) < 1e-9);
  assert.ok(camera.position.clone().sub(controls.target).distanceTo(offset) < 1e-9);
  director.dispose();
});
