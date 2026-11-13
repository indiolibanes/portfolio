import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLaunchCradle } from './sophia-launch-cradle.ts';
import { LAUNCH, ease, getLaunchStateAt, getBoardingPoseAt, getRocketPoseAt } from './sophia-launch-timeline.mjs';

export function createLaunchDirector(gltf: GLTF, scene: THREE.Scene, camera: THREE.PerspectiveCamera,
  controls: OrbitControls, reducedMotion: () => boolean) {
  const root = gltf.scene;
  const carrier = new THREE.Group(); carrier.name = 'Launch_Flight_Carrier'; carrier.add(root); scene.add(carrier);
  root.updateMatrixWorld(true);
  const rider = root.getObjectByName('Sophia_Astronauta_Rider_Mount');
  const rocket = root.getObjectByName('Rocket_Flight_Mount');
  const fuselage = root.getObjectByName('Fuselage');
  const originalFlight = gltf.animations.find(c => c.name === 'Sophia_Foguete_Voo_Esquerda_Ondas_R2');
  const originalWalk = gltf.animations.find(c => c.name === 'Andar_R6');
  const flightBox = new THREE.Box3();
  for (const name of ['Fuselage', 'Helmet_Glass', 'Suit_Chest', 'Suit_Boot_L', 'Suit_Boot_R']) {
    const part = root.getObjectByName(name); if (part) flightBox.expandByObject(part);
  }
  if (flightBox.isEmpty()) flightBox.setFromObject(root);
  if (flightBox.isEmpty()) flightBox.set(new THREE.Vector3(-.5, 0, -.5), new THREE.Vector3(.5, 1, .5));
  const unit = Math.max(flightBox.getSize(new THREE.Vector3()).y, .6);
  const mixer = new THREE.AnimationMixer(root);
  const records: { node: THREE.Object3D; p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; visible: boolean; weights?: number[] }[] = [];
  root.traverse(node => records.push({ node, p: node.position.clone(), q: node.quaternion.clone(), s: node.scale.clone(), visible: node.visible,
    weights: (node as THREE.Mesh).morphTargetInfluences?.slice() }));
  function restore() {
    for (const r of records) {
      r.node.position.copy(r.p); r.node.quaternion.copy(r.q); r.node.scale.copy(r.s); r.node.visible = r.visible;
      const weights = (r.node as THREE.Mesh).morphTargetInfluences;
      if (weights && r.weights) for (let i = 0; i < weights.length; i++) weights[i] = r.weights[i];
    }
  }
  let manualCamera = false, lastTime = 0;
  const previousOffset = new THREE.Vector3(), offset = new THREE.Vector3();
  const onControlStart = () => { if (lastTime >= LAUNCH.flight) manualCamera = true; };
  controls.addEventListener('start', onControlStart);
  function disposeModel() {
    controls.removeEventListener?.('start', onControlStart);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    root.traverse(node => { const mesh = node as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material)); });
    materials.forEach(material => { Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); }); material.dispose(); });
    geometries.forEach(geometry => geometry.dispose()); textures.forEach(texture => texture.dispose());
  }
  function cameraPose(box: THREE.Box3, direction: THREE.Vector3, translate: THREE.Vector3) {
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3()).add(translate);
    const fov = THREE.MathUtils.degToRad(camera.fov / 2), aspect = Math.max(.3, camera.aspect);
    const distance = Math.max(size.x / (2 * Math.tan(fov) * aspect), size.y / (2 * Math.tan(fov)), size.z * 1.2, unit) * 1.4;
    return { target: center, position: center.clone().addScaledVector(direction.clone().normalize(), distance), distance };
  }
  function placeCamera(frame: ReturnType<typeof cameraPose>) {
    controls.target.copy(frame.target); camera.position.copy(frame.position);
    controls.minDistance = Math.max(unit * .4, frame.distance * .32); controls.maxDistance = frame.distance * 5;
    camera.near = Math.max(.005, unit / 200); camera.far = Math.max(100, unit * 150);
    camera.lookAt(frame.target); camera.updateProjectionMatrix();
  }
  if (!rider || !rocket || !fuselage || !originalWalk || !originalFlight) {
    const fallback = originalFlight || gltf.animations.find(c => /foguete|rocket/i.test(c.name));
    const action = fallback ? mixer.clipAction(fallback).play() : null;
    return {
      supported: false, stats: { fallback: true },
      apply(t: number) { lastTime = t; root.visible = true; if (action && fallback) { action.time = reducedMotion() ? 0 : t % fallback.duration; mixer.update(0); }
        controls.enableRotate = controls.enableZoom = true; if (!manualCamera) placeCamera(cameraPose(flightBox, new THREE.Vector3(-.5, .2, 1), new THREE.Vector3())); },
      resize() { manualCamera = false; }, reset() { restore(); manualCamera = false; },
      snapshot() { return { supported: false, time: lastTime, phase: 'FLIGHT_LOOP' }; },
      dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); disposeModel(); carrier.removeFromParent(); },
    };
  }
  const riderNodes = new Set<THREE.Object3D>(); rider.traverse(node => riderNodes.add(node));
  function trackNode(track: THREE.KeyframeTrack) {
    const parsed = THREE.PropertyBinding.parseTrackName(track.name);
    return THREE.PropertyBinding.findNode(root, parsed.nodeName) as THREE.Object3D | null;
  }
  const actorTrack = (track: THREE.KeyframeTrack) => { const node = trackNode(track); return !!node && riderNodes.has(node); };
  function filtered(source: THREE.AnimationClip | undefined, name: string, filter: (track: THREE.KeyframeTrack) => boolean) {
    if (!source) return null;
    const tracks = source.tracks.filter(filter).map(track => track.clone());
    if (!tracks.length) return null;
    const clip = new THREE.AnimationClip(name, source.duration, tracks);
    const action = mixer.clipAction(clip); action.setLoop(THREE.LoopRepeat, Infinity); action.play(); action.enabled = false;
    return { action, clip };
  }
  // One mixer, disjoint actor/effect scopes. Original GLB clips remain untouched.
  const walk = filtered(originalWalk, 'Launch_Approach_Runtime', track => actorTrack(track) && trackNode(track)?.name !== 'Root_Motion');
  const flightActor = filtered(originalFlight, 'Launch_Rider_Runtime', actorTrack);
  const flightEffects = filtered(originalFlight, 'Launch_Effects_Runtime', track => !actorTrack(track));
  const idle = filtered(gltf.animations.find(c => c.name === 'Engine_Idle'), 'Launch_Idle_Runtime', track => !actorTrack(track));
  const boost = filtered(gltf.animations.find(c => c.name === 'Engine_Boost'), 'Launch_Boost_Runtime', track => !actorTrack(track));
  if (!walk || !flightActor) throw new Error('Os canais de caminhada e voo não puderam ser associados à Sophia.');
  const allActions = [walk, flightActor, flightEffects, idle, boost];
  function sample(action: typeof walk, weight: number, time: number) {
    if (!action) return;
    action.action.enabled = weight > .000001; action.action.setEffectiveWeight(weight);
    action.action.time = Math.max(0, time) % Math.max(action.clip.duration, .001);
  }
  const seated = rider.position.clone(), seatedQuaternion = rider.quaternion.clone();
  const skeletons = new Set<THREE.Skeleton>();
  root.traverse(node => { if ((node as THREE.SkinnedMesh).isSkinnedMesh) skeletons.add((node as THREE.SkinnedMesh).skeleton); });
  function updateSkeletons() { root.updateMatrixWorld(true); skeletons.forEach(skeleton => skeleton.update()); }
  restore(); sample(walk, 1, 0); mixer.update(0); updateSkeletons();
  const hips = [...riderNodes].find(node => /(?:mixamorig:?|^)Hips$/.test(node.name));
  const pivotLocal = hips ? rider.worldToLocal(hips.getWorldPosition(new THREE.Vector3())) : new THREE.Vector3();
  const footBox = new THREE.Box3();
  for (const name of ['Suit_Boot_L', 'Suit_Boot_R']) {
    const foot = root.getObjectByName(name) as THREE.SkinnedMesh | undefined;
    if (foot) { foot.computeBoundingBox(); footBox.expandByObject(foot); }
  }
  const cradle = createLaunchCradle(fuselage, unit); scene.add(cradle.group); // Never parent to the GLB or carrier.
  const groundOffset = footBox.isEmpty() ? -unit * .24 : cradle.groundY - footBox.min.y;
  allActions.forEach(a => { if (a) a.action.enabled = false; }); restore(); updateSkeletons();
  const rocketBox = new THREE.Box3().setFromObject(fuselage).union(cradle.box);
  const entryBox = flightBox.clone().translate(new THREE.Vector3(-unit * 1.2, groundOffset, unit * .18));
  const approachBox = rocketBox.clone().union(flightBox).union(entryBox).expandByScalar(unit * .06);
  const ribbons = Array.from({ length: 8 }, (_, i) => root.getObjectByName(`SpeedRibbon_${i + 1}`)).filter((node): node is THREE.Object3D => !!node);
  const engineNodes: THREE.Object3D[] = [];
  root.traverse(node => { if (/Plume|Shock_Diamond|Engine_Coil|Fusion_Halo|Fusion_Core|Plasma_Ring/.test(node.name)) engineNodes.push(node); });
  const plume = root.getObjectByName('Plume_Root');
  const engineLight = new THREE.PointLight(0xebb047, 0, unit * 2, 2); engineLight.name = 'Launch_Ignition_Light'; scene.add(engineLight);
  const nozzle = root.getObjectByName('Engine_Nozzle') || rocket;
  const cameraDirection = new THREE.Vector3(-.45, .24, 1);
  function apply(t: number) {
    lastTime = t; const state = getLaunchStateAt(t), reduced = reducedMotion();
    const b = getBoardingPoseAt(t, { distance: unit * 1.2, groundOffset, height: unit * .28, depth: unit * .18, reducedMotion: reduced });
    const r = getRocketPoseAt(t, unit);
    offset.set(r.x, r.y, r.z); carrier.position.copy(offset);
    restore(); root.visible = true;
    const flightTime = Math.max(0, t - LAUNCH.release);
    sample(walk, state.riderVisible && !state.docked ? 1 - b.flightWeight : 0, b.walkTime);
    sample(flightActor, state.docked ? 1 : state.riderVisible ? b.flightWeight : 1, flightTime);
    const engineBlend = ease((t - LAUNCH.release) / .26);
    sample(idle, state.ignition * (1 - engineBlend), t - LAUNCH.ignition);
    sample(boost, engineBlend * (1 - state.flightMix), t - LAUNCH.release);
    sample(flightEffects, state.flightMix, flightTime);
    mixer.update(0);
    // Turn around the hip centre, not the off-centre imported mesh origin.
    const yaw = Math.PI * (1 - b.flightWeight);
    rider.quaternion.copy(seatedQuaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    const before = pivotLocal.clone().multiply(rider.scale).applyQuaternion(seatedQuaternion);
    const after = pivotLocal.clone().multiply(rider.scale).applyQuaternion(rider.quaternion);
    rider.position.copy(seated).add(before).sub(after);
    const parent = rider.parent!; parent.updateWorldMatrix(true, false);
    const target = parent.localToWorld(rider.position.clone()).add(new THREE.Vector3(b.x, b.y, b.z));
    rider.position.copy(parent.worldToLocal(target)); rider.visible = state.riderVisible;
    // Small additive brace; every frame starts from stored originals, no drift.
    if (!reduced && !state.docked) for (const node of riderNodes) {
      if (/LeftLeg$|RightLeg$/.test(node.name)) node.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .07 * (b.anticipation + b.tuck)));
    }
    engineNodes.forEach(node => { node.visible = state.engine !== 'ENGINE_OFF'; });
    if (plume && state.engine !== 'IN_FLIGHT') plume.scale.multiplyScalar(.18 + state.ignition * (.3 + .52 * engineBlend));
    ribbons.forEach(node => { node.visible = state.trail > .001; node.scale.z *= Math.max(state.trail, .00001); });
    cradle.update(t, state.release, state.ignition, reduced);
    root.updateMatrixWorld(true);
    engineLight.position.copy(nozzle.getWorldPosition(new THREE.Vector3()));
    engineLight.intensity = state.ignition * (1 + engineBlend * 2) * (reduced ? 1 : 1 + .025 * Math.sin(t * 15));
    // No camera cuts at ignition, boarding, release, or loop hand-off.
    if (manualCamera && state.controlsEnabled) {
      const delta = offset.clone().sub(previousOffset); camera.position.add(delta); controls.target.add(delta);
    } else {
      const pad = cameraPose(rocketBox, cameraDirection, new THREE.Vector3());
      const wide = cameraPose(approachBox, cameraDirection, new THREE.Vector3());
      const flight = cameraPose(flightBox.clone().expandByScalar(unit * .05), cameraDirection, offset);
      const reveal = reduced ? 1 : ease((t - .8) / 1.3), follow = ease((t - LAUNCH.release) / (LAUNCH.flight - LAUNCH.release));
      const target = pad.target.clone().lerp(wide.target, reveal).lerp(flight.target, follow);
      const position = pad.position.clone().lerp(wide.position, reveal).lerp(flight.position, follow);
      placeCamera({ target, position, distance: position.distanceTo(target) });
    }
    controls.enableRotate = controls.enableZoom = state.controlsEnabled;
    previousOffset.copy(offset);
  }
  function reset() { manualCamera = false; previousOffset.set(0, 0, 0); carrier.position.set(0, 0, 0); restore(); apply(0); }
  function snapshot() {
    root.updateMatrixWorld(true);
    const rest = rider.parent!.localToWorld(seated.clone());
    return { supported: true, time: lastTime, phase: getLaunchStateAt(lastTime).phase,
      riderVisible: rider.visible, riderWorld: rider.getWorldPosition(new THREE.Vector3()).toArray(), seatedWorld: rest.toArray(),
      riderSeatError: rider.getWorldPosition(new THREE.Vector3()).distanceTo(rest), rocketWorld: rocket.getWorldPosition(new THREE.Vector3()).toArray(),
      baseWorld: cradle.group.getWorldPosition(new THREE.Vector3()).toArray(), ribbonsVisible: ribbons.some(node => node.visible),
      cradleTriangles: cradle.stats.triangles, cradleMeshes: cradle.stats.meshes, groundOffset, unit, controlsEnabled: controls.enableRotate,
      actorTracks: flightActor!.clip.tracks.length, walkTracks: walk!.clip.tracks.length };
  }
  reset();
  return { supported: true, stats: cradle.stats, apply, reset, snapshot,
    resize() { if (!manualCamera) apply(lastTime); },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); cradle.dispose(); disposeModel(); engineLight.removeFromParent(); carrier.removeFromParent(); },
  };
}
