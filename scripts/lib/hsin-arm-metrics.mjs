/** Geometric report of one arm pose against the real, posed meshes (offline). */
import {forward} from './hsin-rig.mjs';
import {withPose} from './hsin-arm.mjs';
import {sub, len} from './hsin-math.mjs';

export const GROUPS = ['distalIndex', 'index', 'otherFingers', 'thumb', 'hand', 'forearm', 'upper'];

/** Smallest distance (m, unsigned) between a moving vertex group and a static surface, within `radius`.
 * Hair, bangs and clothing are open sheets, so a vertex-normal sign is meaningless there; unsigned distance is the safe test.
 * `signed` (used for the face) is negative only when a sample is behind the skin. */
function distances(ctx, world, group, surface, radius) {
 let min = radius, signed = radius; const p = [0, 0, 0];
 for (const s of group) { ctx.point(world, s, p); const q = surface.query(p, radius); if (!q) continue; min = Math.min(min, q.distance); signed = Math.min(signed, q.signed); }
 return {distance: min, signed};
}

/** Per group and static surface: unsigned distance (all surfaces) and signed distance (face). */
export function measurePose(ctx, chain6, extra, {radius = .08, groups = GROUPS} = {}) {
 const world = forward(ctx.rig, withPose(ctx, chain6, extra)), out = {};
 for (const g of groups) {
  const group = ctx.groups[g], face = distances(ctx, world, group, ctx.surfaces.face, radius);
  out[`${g}:face`] = face.distance; out[`${g}:face:signed`] = face.signed;
  for (const key of ['bangs', 'hair']) out[`${g}:${key}`] = distances(ctx, world, group, ctx.surfaces[key], radius).distance;
  out[`${g}:torso`] = Math.min(...ctx.surfaces.torso.map((surface) => distances(ctx, world, group, surface, radius).distance));
 }
 return {world, clearance: out};
}

/** Point of a vertex sample, for tracking a contact point along a trajectory. */
export const pointOf = (ctx, world, sample) => ctx.point(world, sample, [0, 0, 0]);

/** Distance between the closest distal-index vertex and a target point. */
export function nearestTo(ctx, world, group, target) {
 let best = Infinity, at = null; const p = [0, 0, 0];
 for (const s of group) { ctx.point(world, s, p); const d = len(sub(p, target)); if (d < best) { best = d; at = p.slice(); } }
 return {distance: best, at};
}
