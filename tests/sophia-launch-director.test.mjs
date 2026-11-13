import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLaunchDirector } from '../src/scripts/sophia-launch-director.ts';

function fixture() {
  const root = new THREE.Group(), assembly = new THREE.Group(); assembly.name = 'Sophia_Flight_Left_Assembly'; assembly.rotation.y = -Math.PI / 2; root.add(assembly);
  const rocket = new THREE.Group(); rocket.name = 'Rocket_Flight_Mount'; rocket.scale.setScalar(.16); rocket.rotation.x = Math.PI / 2; rocket.position.set(-.177, .23, -.3); assembly.add(rocket);
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4.1, 24, 8), new THREE.MeshBasicMaterial()); hull.name = 'Fuselage'; hull.position.y = 2.73; rocket.add(hull);
  const plume = new THREE.Group(); plume.name = 'Plume_Root'; rocket.add(plume);
  const rider = new THREE.Group(); rider.name = 'Sophia_Astronauta_Rider_Mount'; rider.position.y = .216; assembly.add(rider);
  const motion = new THREE.Bone(); motion.name = 'Root_Motion'; rider.add(motion);
  const hips = new THREE.Bone(); hips.name = 'Hips'; hips.position.y = .3; motion.add(hips);
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
  const controls = { target: new THREE.Vector3(), addEventListener() {}, enableRotate: false, enableZoom: false };
  const gltf = { scene: root, animations: [flight, walk] };
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 16 / 9, .005, 100);
  const original = JSON.stringify(gltf.animations.map(c => THREE.AnimationClip.toJSON(c)));
  const director = createLaunchDirector(gltf, scene, camera, controls, () => false);
  return { director, controls, original, gltf, rider, motion };
}
test('R3 hides rider at reveal, preserves walking root, and settles on the real mount after liftoff', () => {
  const { director, rider, motion, gltf, original } = fixture();
  assert.equal(director.supported, true);
  director.apply(0); assert.equal(rider.visible, false); assert.equal(director.snapshot().ribbonsVisible, false);
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
test('unknown hierarchy has an explicit, usable original-flight fallback', () => {
  const root = new THREE.Group(), controls = { target: new THREE.Vector3(), addEventListener() {} };
  const director = createLaunchDirector({ scene: root, animations: [] }, new THREE.Scene(), new THREE.PerspectiveCamera(), controls, () => false);
  assert.equal(director.supported, false); director.apply(12); assert.equal(director.snapshot().phase, 'FLIGHT_LOOP'); director.dispose();
});
