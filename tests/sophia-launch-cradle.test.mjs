import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLaunchCradle } from '../src/scripts/sophia-launch-cradle.ts';

function fixture() {
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .7, 24, 8), new THREE.MeshBasicMaterial());
  fuselage.rotation.z = Math.PI / 2; fuselage.position.set(-.1, .25, 0); fuselage.updateMatrixWorld();
  return fuselage;
}
test('measured cradle stays world-fixed while its rocket departs', () => {
  const scene = new THREE.Scene(), carrier = new THREE.Group(), fuselage = fixture();
  carrier.add(fuselage); scene.add(carrier); scene.updateMatrixWorld(true);
  const cradle = createLaunchCradle(fuselage, 1); scene.add(cradle.group);
  const start = cradle.group.getWorldPosition(new THREE.Vector3());
  carrier.position.x -= 5; cradle.update(7, 1, 1, false); scene.updateMatrixWorld(true);
  assert.deepEqual(cradle.group.getWorldPosition(new THREE.Vector3()).toArray(), start.toArray());
  assert.equal(cradle.group.parent, scene);
  assert.ok(cradle.stats.triangles < 12000); assert.ok(cradle.stats.meshes < 30);
  assert.equal(cradle.stats.contactSections.length, 2);
  cradle.stats.contactSections.forEach(s => assert.ok(Math.abs(s.innerRadius - .15) < 1e-5));
  cradle.dispose();
});
test('clamp release is an absolute transform and restores on replay', () => {
  const cradle = createLaunchCradle(fixture(), 1);
  const arms = []; cradle.group.traverse(n => { if (n.name.startsWith('HoldDown_')) arms.push(n); });
  cradle.update(6.4, 1, 1, false); const opened = arms.map(n => n.rotation.x);
  assert.ok(opened.every(x => Math.abs(x) > 1));
  cradle.update(0, 0, 0, false); assert.ok(arms.every(n => n.rotation.x === 0));
  cradle.update(6.4, 1, 1, false); assert.deepEqual(arms.map(n => n.rotation.x), opened);
  cradle.dispose();
});
