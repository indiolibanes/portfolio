// Camera-dependent silhouette library: projection and occlusion rules only. It does not judge the gesture (that is the
// report from scripts/measure-hsin-silhouette.mjs and a visual review). No three.
import assert from 'node:assert/strict';
import {publicCamera, project, eyeCoverage} from '../scripts/lib/hsin-silhouette.mjs';

const cam = publicCamera(16 / 9);
const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
const toModel = ([x, y, z]) => [x * c - z * s, y, x * s + z * c]; // inverse of the root yaw the stage applies
const at = (w) => toModel(w);
const along = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];

// 1. A point on the optical axis projects to the screen centre at the expected depth.
const ahead = along(cam.eye, cam.f, 2);
const pr = project(cam, at(ahead));
assert.ok(Math.abs(pr.sx) < 1e-9 && Math.abs(pr.sy) < 1e-9 && Math.abs(pr.z - 2) < 1e-9, `optical axis at the centre: ${pr.sx}, ${pr.sy}, ${pr.z}`);

// 2. The camera is fitted, finite and in front of the character.
assert.ok([cam.eye, cam.f, cam.r, cam.u].flat().every(Number.isFinite) && cam.eye[2] > 0, 'camera finite and on the viewer side');

// 3. Occlusion counts only arm points in front of the eye. An eye of one point, grid of 8.
const eye = [at(along(cam.eye, cam.f, 3))];
const front = [at(along(cam.eye, cam.f, 2.9))], behind = [at(along(cam.eye, cam.f, 3.1))];
const hidden = eyeCoverage(cam, eye, front, {grid: 8, discMetres: .05});
const passing = eyeCoverage(cam, eye, behind, {grid: 8, discMetres: .05});
assert.equal(hidden.fraction, 1, 'a disc in front of the eye covers it');
assert.equal(passing.fraction, 0, 'a disc behind the eye does not occlude it');

// 4. Far from the eye, nothing covers it.
const far = [at(along(along(cam.eye, cam.f, 2.9), cam.r, .5))];
assert.equal(eyeCoverage(cam, eye, far, {grid: 8, discMetres: .02}).fraction, 0, 'an arm off to the side does not cover the eye');

console.log('Hsin silhouette library: projection on the optical axis, camera finite, occlusion only in front of the eye, off-axis clear PASS (the gesture itself is judged by the report and by eye)');
