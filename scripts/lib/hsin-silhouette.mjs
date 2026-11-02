/** Camera-dependent silhouette check for the arm gestures. Offline only; never imported by the runtime.
 * The clearance tests measure distance to the mesh in 3D, which says nothing about how a pose reads on screen. This module
 * projects the public camera (the same framing function the stage uses), the eyes, and every vertex the left arm drives,
 * then asks how much of each eye is covered by the arm IN FRONT of it. Occlusion behind the head does not count.
 *
 * Frame convention (checked against src/scripts/hsin-lunar-presentation.mjs and hsin-stage.ts):
 *   - the presented pose is presentationState(rig, profile) (cinematic reference + neck/head compensation);
 *   - the stage then yaws the whole model by cameraAzimuth - bodyApparentYaw about +Y (the root);
 *   - the camera sits at target + (sin az, .23, cos az) * distance, target and distance from lunarCameraFit(aspect).
 */
import {forward, skinMatrices, skinVertices, skinVertexAt, verticesInfluencedBy, presentationState} from './hsin-rig.mjs';
import {chainNames, fingerNames} from './hsin-arm.mjs';
import {HSIN_LUNAR_PRESENTATION} from '../../src/scripts/hsin-lunar-presentation.mjs';
import {HSIN_STAGE} from '../../src/scripts/hsin-stage-config.mjs';
import {lunarCameraFit} from '../../src/scripts/hsin-lunar-framing.mjs';

/** Every joint whose skin weight moves with the left arm (same set the arm authoring context uses). */
export const armJointNames = (side) => [...chainNames(side), `DEF-Bip001UpperArm${side}001`, `DEF-Bip001Forearm${side}001`, ...fingerNames(side)];

/** The public camera for an aspect ratio, in the rig's coordinates (already yawed into the camera frame). */
export function publicCamera(aspect = 16 / 9, {fov = HSIN_STAGE.fov} = {}) {
 const fit = lunarCameraFit(aspect), az = HSIN_LUNAR_PRESENTATION.cameraAzimuth * Math.PI / 180;
 const target = fit.target, eye = [target[0] + Math.sin(az) * fit.distance, target[1] + .23, target[2] + Math.cos(az) * fit.distance];
 const f = unit(sub(target, eye)), r = unit(cross(f, [0, 1, 0])), u = cross(r, f);
 return {eye, f, r, u, tanY: Math.tan(fov * Math.PI / 360), aspect, yaw: (HSIN_LUNAR_PRESENTATION.cameraAzimuth - HSIN_LUNAR_PRESENTATION.bodyApparentYaw) * Math.PI / 180};
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };

/** Model-space point -> camera-space {x, y, z} (z = depth in front of the camera) and the NDC scale for that depth. */
export function project(cam, p) {
 const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
 const w = [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; // root yaw, as the stage applies it
 const d = sub(w, cam.eye);
 const z = dot(d, cam.f), x = dot(d, cam.r), y = dot(d, cam.u);
 return {sx: x / (z * cam.tanY * cam.aspect), sy: y / (z * cam.tanY), z, ndcPerMetre: 1 / (z * cam.tanY)};
}

/** World matrices for a presented pose with the given local quaternions on the named bones (rows of 4 floats). */
export function poseWorld(rig, base, names, row) {
 const ov = new Map(base);
 names.forEach((n, i) => ov.set(rig.bone(n), [row[i * 4], row[i * 4 + 1], row[i * 4 + 2], row[i * 4 + 3]]));
 return forward(rig, ov);
}

/** Static scene for the silhouette check: presented base, eye points (the eyes do not move with the arm) and arm vertex lists. */
export function silhouetteScene(rig, profile, side = 'L') {
 const base = presentationState(rig, profile), restMatrices = skinMatrices(rig, forward(rig, base));
 const eyes = rig.meshes.filter((m) => /Eye/.test(m.material)).map((mesh) => {
  const pos = skinVertices(rig, mesh, restMatrices);
  return {name: mesh.name, pts: Array.from({length: pos.length / 3}, (_, v) => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]])};
 });
 const arm = [], joints = armJointNames(side);
 for (const mesh of rig.meshes) {
  if (/Eye|Face Xin|Bangs Xin|Hair Xin/.test(mesh.material)) continue;
  const list = verticesInfluencedBy(rig, mesh, joints, .5);
  if (list.length) arm.push({mesh, list});
 }
 return {base, eyes, arm};
}

/** Coverage of one eye by the arm, in front of the eye. Returns the covered fraction of a grid over the eye's screen box. */
export function eyeCoverage(cam, eyePts, armPts, {grid = 12, discMetres = .018, margin = 1.15} = {}) {
 const eye = eyePts.map((p) => project(cam, p));
 let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, zEye = 0;
 for (const e of eye) { x0 = Math.min(x0, e.sx); x1 = Math.max(x1, e.sx); y0 = Math.min(y0, e.sy); y1 = Math.max(y1, e.sy); zEye += e.z / eye.length; }
 const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = (x1 - x0) / 2 * margin, hy = (y1 - y0) / 2 * margin;
 const discs = [];
 for (const p of armPts) { const e = project(cam, p); if (e.z < zEye - .02) discs.push([e.sx, e.sy, discMetres * e.ndcPerMetre]); } // in front of the eye only
 let covered = 0, total = 0;
 for (let i = 0; i < grid; i++) for (let j = 0; j < grid; j++) {
  const gx = cx - hx + (2 * hx) * (i + .5) / grid, gy = cy - hy + (2 * hy) * (j + .5) / grid; total++;
  if (discs.some(([dx, dy, r]) => (dx - gx) ** 2 + (dy - gy) ** 2 <= r * r)) covered++;
 }
 return {fraction: covered / total, box: [x0, y0, x1, y1]};
}

/** Arm vertices (world space) for a solved world matrix set. Cheap: only the vertices the left arm drives are skinned. */
export function armPoints(rig, scene, world) {
 const out = [];
 for (const {mesh, list} of scene.arm) for (const v of list) out.push(skinVertexAt(rig, mesh, v, world, null, [0, 0, 0]));
 return out;
}

/** Per-frame silhouette report for one arm pose row (names = the pose's bone names, rows of 4 floats). */
export function frameSilhouette(rig, scene, cam, row, names) {
 const world = poseWorld(rig, scene.base, names, row);
 const armPts = armPoints(rig, scene, world);
 const eyes = scene.eyes.map(({name, pts}) => ({name, ...eyeCoverage(cam, pts, armPts)}));
 const worst = Math.max(...eyes.map((e) => e.fraction));
 return {eyes, worst, armPoints: armPts.length};
}

/** Worst eye coverage over a list of frames. Report only: thresholds are set by the review, never by this function. */
export function sequenceSilhouette(rig, scene, cam, rows, names) {
 const frames = rows.map((row, i) => ({i, ...frameSilhouette(rig, scene, cam, row, names)}));
 return {frames, worst: Math.max(...frames.map((f) => f.worst)), mean: frames.reduce((s, f) => s + f.worst, 0) / frames.length};
}
