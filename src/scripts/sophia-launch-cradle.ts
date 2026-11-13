import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A world-fixed support. Its X axis follows the measured, horizontal fuselage. */
export function createLaunchCradle(fuselage: THREE.Object3D, unit: number) {
  fuselage.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(fuselage);
  const origin = fuselage.getWorldPosition(new THREE.Vector3());
  const axis = new THREE.Vector3(0, 1, 0).transformDirection(fuselage.matrixWorld);
  if (Math.abs(axis.y) > .25) throw new Error('O foguete não está na orientação horizontal esperada.');
  axis.y = 0; axis.normalize();
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3().crossVectors(axis, up).normalize();
  const group = new THREE.Group(); group.name = 'LaunchCradle_R1';
  group.position.copy(origin);
  group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(axis, up, side));
  const mesh = fuselage as THREE.Mesh<THREE.BufferGeometry>;
  const points = mesh.geometry?.getAttribute('position');
  const scale = new THREE.Vector3().setFromMatrixScale(fuselage.matrixWorld).x;
  const sections = new Map<number, number>();
  if (points) for (let i = 0; i < points.count; i++) {
    const y = Math.round(points.getY(i) * 1e5) / 1e5;
    const r = Math.hypot(points.getX(i), points.getZ(i));
    sections.set(y, Math.max(sections.get(y) || 0, r));
  }
  const stations = [...sections.entries()].sort((a, b) => a[0] - b[0]);
  if (stations.length < 3) throw new Error('Não foi possível medir as seções do casco.');
  const first = stations[0][0] * scale, last = stations.at(-1)![0] * scale;
  const length = last - first, center = (first + last) / 2;
  const maximum = Math.max(...stations.map(s => s[1])) * scale;
  function radiusAt(x: number) {
    const y = x / scale;
    let k = 0;
    while (k < stations.length - 2 && stations[k + 1][0] < y) k++;
    const [a, r0] = stations[k], [b, r1] = stations[k + 1];
    const f = THREE.MathUtils.clamp((y - a) / (b - a), 0, 1);
    return (r0 + (r1 - r0) * f) * scale;
  }
  const floor = -maximum - unit * .06, floorThickness = unit * .026;
  const padLength = length * 1.6, padWidth = maximum * 3.5;
  const metal = new THREE.MeshStandardMaterial({ color: 0x181b32, roughness: .72, metalness: .65 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xebb047, roughness: .42, metalness: .7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c101d, roughness: .85, metalness: .3 });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xebae47 });
  const fixed = new Map<THREE.Material, THREE.BufferGeometry[]>();
  function bake(geometry: THREE.BufferGeometry, material: THREE.Material, position = new THREE.Vector3(), quaternion = new THREE.Quaternion()) {
    geometry.applyMatrix4(new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1)));
    if (!fixed.has(material)) fixed.set(material, []);
    fixed.get(material)!.push(geometry.toNonIndexed()); geometry.dispose();
  }
  function block(w: number, h: number, d: number, x: number, y: number, z: number, material = metal) {
    bake(new THREE.BoxGeometry(w, Math.max(h, .002), d), material, new THREE.Vector3(x, y, z));
  }
  function beam(a: THREE.Vector3, b: THREE.Vector3, width: number, material = metal) {
    const delta = b.clone().sub(a); const q = new THREE.Quaternion().setFromUnitVectors(up, delta.clone().normalize());
    bake(new THREE.BoxGeometry(width, delta.length(), width), material, a.clone().add(b).multiplyScalar(.5), q);
  }
  block(padLength, floorThickness, padWidth, center, floor - floorThickness / 2, 0);
  block(padLength * 1.03, floorThickness * .35, padWidth * 1.05, center, floor - floorThickness, 0, dark);
  for (const z of [-padWidth * .45, padWidth * .45]) {
    block(padLength * .85, unit * .004, unit * .008, center, floor + .003, z, trim);
  }
  const pivots: { pivot: THREE.Group; side: number }[] = [];
  const contacts: { x: number; radius: number; innerRadius: number }[] = [];
  for (const fraction of [.25, .62]) {
    const x = first + length * fraction, radius = radiusAt(x), thickness = unit * .006;
    class SaddleCurve extends THREE.Curve<THREE.Vector3> {
      getPoint(t: number, target = new THREE.Vector3()) {
        const a = (t - .5) * Math.PI;
        return target.set(x, -(radius + thickness) * Math.cos(a), (radius + thickness) * Math.sin(a));
      }
    }
    bake(new THREE.TubeGeometry(new SaddleCurve(), 28, thickness, 6, false), trim);
    const bottom = -radius - thickness * 2;
    block(unit * .055, Math.max(bottom - floor, .012), unit * .075, x, (bottom + floor) / 2, 0);
    contacts.push({ x, radius, innerRadius: radius });
    for (const sign of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.name = `HoldDown_${fraction}_${sign}`;
      pivot.position.set(x, -radius * .45, sign * radius * 1.4);
      const end = new THREE.Vector3(0, radius * 1.01, -sign * radius * .53);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(unit * .018, end.length(), unit * .018), metal);
      arm.position.copy(end).multiplyScalar(.5); arm.quaternion.setFromUnitVectors(up, end.clone().normalize()); pivot.add(arm);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(unit * .012, 8, 5), trim);
      shoe.scale.set(1.2, .65, 1); shoe.position.copy(end); pivot.add(shoe);
      group.add(pivot); pivots.push({ pivot, side: sign });
      block(unit * .042, unit * .025, unit * .055, x, floor + unit * .012, sign * radius * 1.4);
    }
  }
  const mastX = first + length * .12, mastZ = -padWidth * .46, mastHeight = maximum * 3.1;
  for (const sign of [-1, 1]) block(unit * .016, mastHeight, unit * .016, mastX + sign * unit * .046, floor + mastHeight / 2, mastZ);
  for (let i = 0; i < 4; i++) {
    const y = floor + mastHeight * i / 4;
    beam(new THREE.Vector3(mastX - unit * .046, y, mastZ), new THREE.Vector3(mastX + unit * .046, y + mastHeight / 4, mastZ), unit * .008);
  }
  const umbilical = new THREE.Group(); umbilical.name = 'Umbilical_Arm';
  umbilical.position.set(mastX, floor + mastHeight * .85, mastZ);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(unit * .018, unit * .018, padWidth * .30), trim);
  cable.position.z = padWidth * .15; umbilical.add(cable); group.add(umbilical);
  for (const material of fixed.keys()) {
    const geometries = fixed.get(material)!; const merged = mergeGeometries(geometries, false);
    geometries.forEach(geometry => geometry.dispose());
    if (merged) group.add(new THREE.Mesh(merged, material));
  }
  const lamps: THREE.Mesh[] = [];
  for (const sign of [-1, 1]) {
    const light = new THREE.Mesh(new THREE.SphereGeometry(unit * .012, 8, 6), lamp);
    light.position.set(center + sign * padLength * .4, floor + .016, padWidth * .42); group.add(light); lamps.push(light);
  }
  // Soft contact pool and eight deterministic billboards, no particle system.
  let smokeTexture: THREE.CanvasTexture | null = null;
  const smoke: THREE.Sprite[] = [];
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(170,180,210,.45)'); gradient.addColorStop(1, 'rgba(80,100,130,0)');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64); smokeTexture = new THREE.CanvasTexture(canvas);
      const smokeMaterial = new THREE.SpriteMaterial({ map: smokeTexture, transparent: true, opacity: 0, depthWrite: false });
      for (let i = 0; i < 8; i++) { const puff = new THREE.Sprite(smokeMaterial); group.add(puff); smoke.push(puff); }
    }
  }
  const contact = new THREE.Mesh(new THREE.CircleGeometry(unit * .48, 40), new THREE.MeshBasicMaterial({ color: 0x05060c, transparent: true, opacity: .8, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.set(center, floor - floorThickness * 1.1, 0); group.add(contact);
  group.updateMatrixWorld(true);
  const groundY = group.localToWorld(new THREE.Vector3(0, floor + .002, 0)).y;
  const stats = { triangles: 0, meshes: 0, contactSections: contacts, stationary: true };
  group.traverse(node => { const m = node as THREE.Mesh; if (m.geometry) { stats.triangles += (m.geometry.index?.count || m.geometry.getAttribute('position').count) / 3; stats.meshes++; } });
  function update(t: number, release: number, ignition: number, reduced: boolean) {
    pivots.forEach(({ pivot, side }) => { pivot.rotation.x = side * release * 1.05; });
    umbilical.rotation.y = -.95 * release;
    lamps.forEach(light => { light.scale.setScalar(reduced ? 1 : 1 + .06 * Math.sin(t * 2)); });
    const opacity = reduced ? 0 : ignition * Math.max(0, 1 - release * .8) * .3;
    smoke.forEach((puff, i) => {
      const u = (t * .38 + i / 8) % 1;
      puff.position.set(first - u * unit * .22, floor + unit * (.10 + u * .14), (i % 2 ? 1 : -1) * unit * (.05 + u * .2));
      puff.scale.setScalar(unit * (.09 + u * .3)); puff.material.opacity = opacity;
      puff.visible = opacity > .001;
    });
  }
  function dispose() {
    const materials = new Set<THREE.Material>();
    group.traverse(n => { const m = n as THREE.Mesh; m.geometry?.dispose(); if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(material => materials.add(material)); });
    materials.forEach(material => material.dispose()); smokeTexture?.dispose(); group.removeFromParent();
  }
  return { group, groundY, box: new THREE.Box3().setFromObject(group), stats, update, dispose };
}
