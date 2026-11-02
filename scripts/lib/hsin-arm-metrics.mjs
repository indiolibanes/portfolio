/** Geometric report of one arm pose against the real, posed meshes (offline). */
import {forward} from './hsin-rig.mjs';
import {withPose, clearance} from './hsin-arm.mjs';
import {sub, len} from './hsin-math.mjs';

export const GROUPS = ['distalIndex', 'index', 'otherFingers', 'thumb', 'hand', 'forearm', 'upper'];

/** Minimum signed clearance (m, positive = outside) of every moving group against face, bangs, hair and each torso mesh. */
export function measurePose(ctx, chain6, extra, {radius = .08, groups = GROUPS} = {}) {
 const world = forward(ctx.rig, withPose(ctx, chain6, extra)), out = {};
 for (const g of groups) {
  for (const key of ['face', 'bangs', 'hair']) out[`${g}:${key}`] = clearance(ctx, world, ctx[g] ?? ctx.groups[g], ctx.surfaces[key], radius).min;
  out[`${g}:torso`] = Math.min(...ctx.surfaces.torso.map((s) => clearance(ctx, world, ctx.groups[g], s, radius).min));
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
