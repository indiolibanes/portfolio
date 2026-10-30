/**
 * The same rigged GLB that powers /modo-experimental becomes a character on /404.
 * This is intentionally plain Three.js (not a second React root): the page is
 * otherwise an Astro document and its Tetris engine remains canvas 2D.
 * No remote scripts, no video, no full-page renderer.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { buildSophiaRoom } from './sophia-404-room.js';
import { applyConstellationTail } from './sophia-404-tail.js';

const MODEL_URL = '/experimental/sophia-alpha.glb'; // available rigged alpha; replace with 7B after validated export
let modelPromise;
function sourceModel() {
  if (!modelPromise) {
    modelPromise = new GLTFLoader().loadAsync(MODEL_URL).catch((error) => {
      modelPromise = null;
      throw error;
    });
  }
  return modelPromise;
}

function normalizedFox(original) {
  const fox = cloneSkeleton(original);
  fox.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(fox);
  if (bounds.isEmpty()) throw new Error('Sophia GLB has no visible geometry');
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const factor = 2.35 / Math.max(size.y, 0.001);
  fox.scale.multiplyScalar(factor);
  // Alpha 6H is notably broader than the original Sophia illustration: restore a
  // narrower silhouette without changing the rig, head height or eye spacing.
  fox.scale.x *= 0.86;
  fox.scale.z *= 0.91;
  fox.position.set(-center.x * factor * 0.86, -bounds.min.y * factor, -center.z * factor * 0.91);
  fox.traverse((node) => {
    if (node.isSkinnedMesh) node.frustumCulled = false;
  });
  return fox;
}
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export async function mountSophia404(root) {
  const canvas = root.querySelector('[data-sophia-canvas]');
  if (!canvas) throw new Error('Missing Sophia canvas');
  const kind = root.dataset.sophiaStage;
  const portrait = kind === 'portrait';
  // Only create WebGL when the stage is close to the viewport.
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: false, powerPreference: 'low-power',
    preserveDrawingBuffer: false,
  });
  renderer.setClearColor('#000000', 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = portrait ? 1.35 : 1.1;

  let gltf;
  try {
    gltf = await sourceModel();
  } catch (error) {
    renderer.dispose();
    throw error;
  }
  if (!root.isConnected) {
    renderer.dispose();
    throw new Error('Stage removed before GLB completed loading');
  }

  const scene = new THREE.Scene();
  const fox = normalizedFox(gltf.scene);
  const releaseTail = applyConstellationTail(fox);
  const room = portrait ? null : buildSophiaRoom(scene);
  const actor = new THREE.Group();
  actor.add(fox);
  scene.add(actor);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 30);
  // Both cameras face the fox, especially the gamer-room: no more back/profile shot.
  camera.position.copy(portrait ? vec(0, 1.85, 6.1) : vec(0.55, 2.75, 9.2));
  camera.lookAt(portrait ? vec(0, 1.7, 0) : vec(0, 1.7, -0.3));

  scene.add(new THREE.HemisphereLight(0xdce6ff, 0x3b263e, portrait ? 1.6 : 1.25));
  const warm = new THREE.DirectionalLight(0xffc99d, portrait ? 1.9 : 1.25);
  warm.position.set(-2, 4, 3);
  scene.add(warm);
  const cool = new THREE.DirectionalLight(0x799bff, portrait ? 0.9 : 1.6);
  cool.position.set(3, 2, -1);
  scene.add(cool);

  // The controller is a simple lightweight 3D prop, independent of the rig.
  // The SVG room remains the backdrop: a true 2.5D theatrical composition.
  let controller;
  if (!portrait) {
    controller = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.105, 0.20),
      new THREE.MeshStandardMaterial({ color: 0x151929, metalness: 0.25, roughness: 0.55 }),
    );
    controller.add(shell);
    const ledMaterial = new THREE.MeshBasicMaterial({ color: 0x8ea5ff });
    for (const x of [-0.115, 0.115]) {
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), ledMaterial);
      led.position.set(x, 0.058, 0.025);
      controller.add(led);
    }
    controller.position.set(0, 1.12, 0.47);
    controller.rotation.x = -0.20;
    actor.add(controller);
  }

  const initialRotations = new Map();
  const bones = new Map();
  fox.traverse((obj) => {
    if (obj.isBone) {
      bones.set(obj.name, obj);
      initialRotations.set(obj, obj.quaternion.clone());
    }
  });
  const tempQuaternion = new THREE.Quaternion();
  const tempEuler = new THREE.Euler();
  function rotate(name, x = 0, y = 0, z = 0) {
    const bone = bones.get(name);
    if (!bone) return;
    tempEuler.set(x, y, z);
    tempQuaternion.setFromEuler(tempEuler);
    bone.quaternion.copy(initialRotations.get(bone)).multiply(tempQuaternion);
  }
  const morphMeshes = [];
  fox.traverse((mesh) => {
    if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) morphMeshes.push(mesh);
  });
  function expression(smile, eyebrows, mouth, blink) {
    for (const mesh of morphMeshes) {
      const dict = mesh.morphTargetDictionary;
      const values = mesh.morphTargetInfluences;
      if (dict.Smile != null) values[dict.Smile] = smile;
      if (dict.BrowRaise != null) values[dict.BrowRaise] = eyebrows;
      if (dict.MouthOpen != null) values[dict.MouthOpen] = mouth;
      if (dict.Blink != null) values[dict.Blink] = blink;
    }
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let height = 0;
  let active = false;
  let disposed = false;
  let frame = 0;
  let clock = 0;
  let lastFrame = 0;
  let mood = root.dataset.sophiaMood || 'idle';
  let moodAt = performance.now();
  let pointerX = 0;
  let pointerY = 0;
  let interactive = 0;
  let ready = false;
  let contextLost = false;

  function resize() {
    if (disposed || contextLost) return;
    const bounds = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(bounds.width));
    const h = Math.max(1, Math.round(bounds.height));
    if (w === width && h === height) return;
    width = w;
    height = h;
    const mobile = matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.5));
    renderer.setSize(w, h, false);
    const aspect = w / h;
    // The portrait frames head, ears and paws; the lounge shows the whole figure.
    const narrow = w < 600;
    const viewHeight = portrait ? 2.75 : (narrow ? 4.15 : 5.15);
    if (!portrait) {
      actor.position.x = narrow ? -0.55 : -1.55;
      actor.position.z = narrow ? 1.15 : 1.2;
    }
    camera.left = -viewHeight * aspect / 2;
    camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);

  function onPointerMove(event) {
    const bounds = root.getBoundingClientRect();
    pointerX = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width) * 2 - 1, -1, 1);
    pointerY = clamp((event.clientY - bounds.top) / Math.max(1, bounds.height) * 2 - 1, -1, 1);
    interactive = 1;
  }
  root.addEventListener('pointermove', onPointerMove, { passive: true });
  root.addEventListener('pointerleave', onPointerLeave, { passive: true });
  function onPointerLeave() { interactive = 0; }

  function tick(now) {
    frame = 0;
    if (!active || disposed || contextLost) return;
    const mobile = matchMedia('(pointer: coarse)').matches;
    const budget = mobile ? 33 : 16;
    if (now - lastFrame < budget) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const dt = Math.min(0.05, Math.max(0, (now - (lastFrame || now)) / 1000));
    lastFrame = now;
    clock += dt;
    const t = clock;
    const calm = reduce.matches;
    const shortReaction = clamp(1 - (now - moodAt) / 1600, 0, 1);
    const celebrate = mood === 'cheer' ? shortReaction : 0;
    const upset = mood === 'over' ? 1 : 0;
    const playing = mood === 'playing';
    const sleep = mood === 'paused' || mood === 'over';
    const sway = calm ? 0 : Math.sin(t * 2.25);
    const breath = calm ? 0 : Math.sin(t * 1.6);
    const blink = calm ? 0 : (Math.sin(t * 0.82) > 0.992 ? 1 : 0);
    const shake = calm ? 0 : Math.sin(t * 15) * celebrate;
    const look = interactive ? pointerX : (playing ? 0.22 : -0.10);

    actor.rotation.y = (portrait ? 0 : 0.035) + look * 0.08;
    actor.rotation.z = calm ? 0 : sway * 0.016 + shake * 0.045;
    actor.position.y = calm ? 0 : Math.max(0, celebrate * Math.abs(Math.sin(t * 12)) * 0.11);
    rotate('hips', breath * 0.025, 0, sway * 0.02);
    rotate('head', (sleep ? -0.13 : 0.04) + (interactive ? -pointerY * 0.12 : 0) - celebrate * 0.12,
      look * 0.26, (sway + shake) * 0.045);
    rotate('ear_L_1', 0, 0, -0.06 - celebrate * 0.22 + (calm ? 0 : Math.sin(t * 3.7) * 0.05));
    rotate('ear_R_1', 0, 0, 0.06 + celebrate * 0.22 - (calm ? 0 : Math.sin(t * 3.4) * 0.05));
    rotate('tail_1', 0, calm ? 0 : Math.sin(t * (celebrate ? 7 : 2)) * (0.15 + celebrate * 0.28), 0);
    // Restrained arm gestures; never rely on nonexistent named animation clips.
    rotate('upper_arm_L', portrait ? -0.12 : 0.42 + celebrate * 0.18, 0, celebrate * 0.14);
    rotate('upper_arm_R', portrait ? -0.12 : 0.42 + celebrate * 0.18, 0, -celebrate * 0.14);
    if (controller) {
      controller.position.y = 1.12 + (calm ? 0 : Math.sin(t * (playing ? 8 : 2.5)) * 0.015);
      controller.rotation.z = shake * 0.07;
    }
    expression(clamp(0.16 + celebrate * 0.74 - upset * 0.14, 0, 1),
      clamp(celebrate * 0.8 + upset * 0.3, 0, 1), celebrate * 0.6,
      blink);
    resize();
    room?.update(t);
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      root.dataset.sophiaReady = 'true';
    }
    frame = requestAnimationFrame(tick);
  }
  const onContextLost = (event) => {
    event.preventDefault();
    contextLost = true;
    root.dataset.sophiaReady = 'false';
    root.dataset.sophiaFailed = 'true';
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  function setActive(next) {
    if (disposed || contextLost) return;
    active = Boolean(next);
    if (active && !frame) {
      lastFrame = 0;
      frame = requestAnimationFrame(tick);
    } else if (!active && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  function react(next) {
    mood = next;
    moodAt = performance.now();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    setActive(false);
    if (frame) cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    root.dataset.sophiaReady = 'false';
    // GLTF geometries/materials/textures belong to the shared cached source;
    // releasing them here would break other clones.
    shellCleanup(controller);
    room?.dispose();
    releaseTail();
    renderer.dispose();
    renderer.forceContextLoss();
  }
  function shellCleanup(group) {
    group?.traverse((obj) => {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material?.dispose();
    });
  }
  return { setActive, react, dispose };
}
