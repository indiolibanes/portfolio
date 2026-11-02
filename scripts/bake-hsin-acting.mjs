/** Assembles public/assets/models/hsin/hsin-v2.1-acting.json: baked Lip & Hair acting data, guarded by the hash of the
 * approved profile and of the GLB. The approved profile (hsin-v2.1-profile.json) is never modified.
 * Usage: node scripts/bake-hsin-acting.mjs */
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {bakeLip, auditLip} from './bake-hsin-lip-touch.mjs';
import {bakeHair, auditHair} from './bake-hsin-hair-caress.mjs';

const root = new URL('../', import.meta.url).pathname, sha = (path) => createHash('sha256').update(readFileSync(root + path)).digest('hex');
const solution = JSON.parse(readFileSync(root + 'scripts/data/hsin-lip-touch-solution.json', 'utf8'));
const lip = bakeLip(solution), audit = auditLip(lip), keys = ['distalIndex:face', 'index:face', 'otherFingers:face', 'thumb:face', 'hand:face', 'hand:bangs', 'hand:torso', 'forearm:torso'];
const mm = (table) => Object.fromEntries(keys.map((k) => [k, +(table[k] * 1000).toFixed(1)]));
const hairSolutions = Object.fromEntries(['start', 'mid', 'end', 'hoverIn', 'hoverOut'].map((n) => [n, JSON.parse(readFileSync(root + `scripts/data/hsin-hair-caress-${n}.json`, 'utf8'))]));
const hair = bakeHair(hairSolutions), hairAudit = auditHair(hair), hairKeys = ['distalIndex:face', 'index:face', 'otherFingers:face', 'thumb:face', 'hand:face', 'distalIndex:hair', 'otherFingers:hair', 'hand:bangs', 'distalIndex:bangs', 'hand:torso', 'forearm:torso'];
const acting = {
 version: '2.0.1-acting-r1',
 modelSha256: sha('public/assets/models/hsin/hsin-v2.0.glb'), profileSha256: sha('public/assets/models/hsin/hsin-v2.1-profile.json'),
 method: 'OFFLINE_SOLVE_AND_BAKE', visual: 'PENDING',
 poses: {
  hairCaress: {
   ...hair, stageFrames: {rest: 0, hoverIn: 26, start: 36, mid: 43, end: 50, hoverOut: 60, homeMid: 73, home: 86},
   validation: {
    strokeToHairSurfaceMm: {min: +(Math.min(...hairAudit.contactStroke) * 1000).toFixed(1), max: +(Math.max(...hairAudit.contactStroke) * 1000).toFixed(1), targetGapMm: 3, surface: 'left side hair, 5 cm tangential stroke, index finger pad'},
    pathMinDistanceMm: Object.fromEntries(hairKeys.map((k) => [k, +(hairAudit.minClearance[k] * 1000).toFixed(1)])), note: 'Torso minima of 0 mm occur at the rest pose (the hand hangs against the dress) and are inherited, not introduced.',
    maxStepDegrees: +hairAudit.maxStepDegrees.toFixed(2), maxAccelerationDegrees: +hairAudit.accelerationDegrees.toFixed(2), solverCosts: Object.fromEntries(Object.entries(hairSolutions).map(([k, v]) => [k, +v.cost.toFixed(3)])),
   },
  },
  lipTouch: {
   ...lip, side: 'R', stage2Frames: lip.frames.length - 65,
   validation: {
    fingertipToLipTarget: {minMm: +(Math.min(...audit.contactTrack) * 1000).toFixed(2), holdMm: +(audit.contactTrack.at(-1) * 1000).toFixed(2), gapMm: 2.5, surface: 'lower lip, face mesh UV (0.5, 0.514)'},
    stage2MinDistanceMm: mm(audit.stage2), fullPathMinDistanceMm: mm(audit.minClearance), note: 'The full path includes the approved Signature stage (frames 0-64), whose own minima (e.g. hand to bangs) are inherited, not introduced.',
    maxStepDegrees: +Math.max(...Object.values(audit.maxStepDegrees)).toFixed(2), maxAccelerationDegrees: +audit.accelerationDegrees.toFixed(2),
    solver: {cost: +solution.cost.toFixed(3), elbowDegrees: +solution.report.elbow.toFixed(1), wristDegrees: +solution.report.wrist.toFixed(1)},
   },
  },
 },
};
const text = JSON.stringify(acting) + '\n';
writeFileSync(root + 'public/assets/models/hsin/hsin-v2.1-acting.json', text);
writeFileSync(root + 'src/data/hsin-v201-acting.json', JSON.stringify({version: acting.version, sha256: createHash('sha256').update(text).digest('hex'), bytes: Buffer.byteLength(text), modelSha256: acting.modelSha256, profileSha256: acting.profileSha256}, null, 2) + '\n');
console.log('acting profile written', JSON.stringify(acting.poses.lipTouch.validation));
