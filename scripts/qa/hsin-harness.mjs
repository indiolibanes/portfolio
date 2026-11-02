/** Visual QA harness. Rebuilds the public stage scene from the same modules (presentation, terrace, rig lights,
 * face skin, baked poses) and renders single frames deterministically. QA only: never shipped to visitors.
 * Software WebGL (SwiftShader) is fine for colour and light; it is never evidence of frame rate or smoothness. */
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HSIN_STAGE, attentionHeight} from '/src/scripts/hsin-stage-config.mjs';
import {createBakedPose} from '/src/scripts/hsin-baked-pose.mjs';
import {LUNAR_TERRACE, createLunarTerrace} from '/src/scripts/hsin-lunar-terrace.mjs';
import {HSIN_CINEMATIC_IDLE, createCinematicReference} from '/src/scripts/hsin-cinematic-idle.mjs';
import {lunarCameraFit} from '/src/scripts/hsin-lunar-framing.mjs';
import {HSIN_LUNAR_PRESENTATION, createLunarPresentation} from '/src/scripts/hsin-lunar-presentation.mjs';
import {createStageLights} from '/src/scripts/hsin-stage-lighting.mjs';
import {createFaceSkin, HSIN_FACE_SKIN} from '/src/scripts/hsin-face-skin.mjs';

const WIDTH = 800, HEIGHT = 1100;
const state = {};

async function load({faceSkin = true, params = null, extraLights = null} = {}) {
 const canvas = document.getElementById('c'); canvas.width = WIDTH; canvas.height = HEIGHT; canvas.style.width = WIDTH + 'px'; canvas.style.height = HEIGHT + 'px';
 const renderer = new T.WebGLRenderer({canvas, antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power'});
 renderer.setPixelRatio(1); renderer.setSize(WIDTH, HEIGHT, false);
 renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.NoToneMapping; renderer.shadowMap.enabled = false; renderer.setClearColor(HSIN_STAGE.colors.night);
 const texture = async (url) => { const t = await new T.TextureLoader().loadAsync(url + '?v=lunar-terrace-r2'); t.colorSpace = T.SRGBColorSpace; return t; };
 const [profile, buffer, ...textures] = await Promise.all([
  fetch(HSIN_STAGE.cinematicProfile).then((r) => r.json()), fetch(HSIN_STAGE.model).then((r) => r.arrayBuffer()),
  ...[LUNAR_TERRACE.sky, LUNAR_TERRACE.moon, LUNAR_TERRACE.stone, LUNAR_TERRACE.atlas, LUNAR_TERRACE.water].map(texture)]);
 const [skyTexture, moonTexture, stoneTexture, atlasTexture, waterTexture] = textures;
 const acting = await fetch('/assets/models/hsin/hsin-v2.1-acting.json').then((r) => r.ok ? r.json() : null).catch(() => null);
 const gltf = await new GLTFLoader().parseAsync(buffer, ''), model = gltf.scene, scene = new T.Scene(); scene.matrixWorldAutoUpdate = false; scene.add(model);
 model.position.y -= profile.bounds.min[1]; scene.updateMatrixWorld(true);
 const meshes = []; model.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
 const bones = [...new Set(meshes.flatMap((m) => m.skeleton.bones))], byName = new Map(bones.map((b) => [b.name, b]));
 createCinematicReference({bones, profile, enabled: HSIN_CINEMATIC_IDLE.enabled}).apply(); scene.updateMatrixWorld(true);
 const presentation = createLunarPresentation({THREE: T, model, bones, bounds: profile.bounds, cameraAzimuth: HSIN_LUNAR_PRESENTATION.cameraAzimuth}); presentation.apply();
 const moonlit = createLunarTerrace({THREE: T, skyTexture, moonTexture, stoneTexture, atlasTexture, waterTexture, feet: presentation.feet(), rootDegrees: presentation.parameters.rootDegrees});
 scene.background = moonlit.background; scene.fog = moonlit.fog; scene.add(moonlit.group);
 scene.add(...createStageLights(T).all);
 if (extraLights) for (const l of extraLights) { const light = new T.DirectionalLight(l.color, l.intensity); light.position.set(...l.position); scene.add(light); }
 const skin = createFaceSkin({THREE: T, meshes, config: {...HSIN_FACE_SKIN, ...(params ?? {}), enabled: faceSkin}}); skin.apply();
 scene.traverse((o) => { o.updateMatrix(); o.matrixAutoUpdate = false; }); scene.updateMatrixWorld(true);
 const camera = new T.PerspectiveCamera(HSIN_STAGE.fov, WIDTH / HEIGHT, .03, 45);
 Object.assign(state, {renderer, scene, camera, moonlit, profile, acting, bones, byName, meshes, skin, model, framing: lunarCameraFit(WIDTH / HEIGHT), poses: {}});
 return {skin: skin.diagnostics(), renderer: renderer.getContext().getParameter(renderer.getContext().VERSION), info: {programs: renderer.info.programs?.length ?? null}};
}

/** azimuth in degrees around the target (the stage default is 8), zoom 0 = default framing, 1 = closest the stage allows. */
function view({azimuth = HSIN_LUNAR_PRESENTATION.cameraAzimuth, zoom = 0} = {}) {
 const {camera, framing, moonlit} = state, initial = framing.distance, distance = initial + (HSIN_STAGE.minDistance - initial) * zoom;
 const y = attentionHeight(distance, initial) + HSIN_LUNAR_PRESENTATION.cameraTargetOffset[1], a = azimuth * Math.PI / 180, target = new T.Vector3(framing.target[0], y, framing.target[2]);
 camera.position.set(target.x + Math.sin(a) * distance, target.y + .23, target.z + Math.cos(a) * distance);
 camera.lookAt(target); camera.updateMatrixWorld(); moonlit.frameSky(camera, target);
 return {distance, target: target.toArray(), position: camera.position.toArray()};
}

/** One pose by name, or several at once: pose([{name, weight}, ...]). Names come from the approved profile or the acting profile. */
function pose(name, weight) {
 const {profile, acting, bones, scene} = state, list = Array.isArray(name) ? name : name ? [{name, weight}] : [];
 for (const p of Object.values(state.poses)) p.restore();
 for (const item of list) if (item.weight > 0) {
  state.poses[item.name] ??= createBakedPose({THREE: T, data: profile.poses[item.name] ?? acting?.poses[item.name], bones});
  state.poses[item.name].apply(item.weight);
 }
 scene.updateMatrixWorld(true);
}

/** Face morph offsets (names -> added influence) on top of the GLB defaults; pass null to restore. */
function morphs(offsets) {
 const face = state.meshes.find((m) => /Face Xin/.test(m.material?.name ?? ''));
 state.baseMorph ??= [...face.morphTargetInfluences];
 face.morphTargetInfluences.forEach((_, i) => { face.morphTargetInfluences[i] = state.baseMorph[i]; });
 if (offsets) for (const [name, value] of Object.entries(offsets)) { const i = face.morphTargetDictionary[name]; if (i !== undefined) face.morphTargetInfluences[i] = Math.min(1, state.baseMorph[i] + value); }
}

function render() { const {renderer, scene, camera} = state; scene.updateMatrixWorld(); renderer.render(scene, camera); return {calls: renderer.info.render.calls, triangles: renderer.info.render.triangles}; }

window.hsinHarness = {WIDTH, HEIGHT, load, view, pose, morphs, render, state};
window.hsinHarnessReady = true;
