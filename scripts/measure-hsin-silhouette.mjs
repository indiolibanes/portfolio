/** Camera-dependent silhouette report for the baked arm gestures (offline, Node, no WebGL).
 * Usage: node scripts/measure-hsin-silhouette.mjs [ACTING.json]   (default: the public acting profile)
 * Prints, per gesture, the worst fraction of each eye covered by the moving arm IN FRONT of it, for the public
 * landscape camera and a portrait camera. These are geometric projections, not visual approval. */
import {readFileSync} from 'node:fs';
import {loadRig} from './lib/hsin-rig.mjs';
import {publicCamera, silhouetteScene, sequenceSilhouette} from './lib/hsin-silhouette.mjs';
import {summarizePosePhases} from './lib/hsin-stage-alignment.mjs';

const root = new URL('../', import.meta.url).pathname;
const acting = JSON.parse(readFileSync(process.argv[2] ?? root + 'public/assets/models/hsin/hsin-v2.1-acting.json', 'utf8'));
const rig = loadRig(readFileSync(root + 'public/assets/models/hsin/hsin-v2.0.glb'));
const profile = JSON.parse(readFileSync(root + 'public/assets/models/hsin/hsin-v2.1-profile.json', 'utf8'));
const cams = {landscape: publicCamera(16 / 9), portrait: publicCamera(.6)};
const summary = {};
for (const [gesture, side] of [['hairCaress', 'L'], ['lipTouch', 'R']]) {
 const pose = acting.poses[gesture], scene = silhouetteScene(rig, profile, side);
 const rows = pose.frames.map((f) => f);
 for (const [cname, cam] of Object.entries(cams)) {
  const r = sequenceSilhouette(rig, scene, cam, rows, pose.names);
  const at = (i) => r.frames[i].worst.toFixed(3);
  if(!r.frames.length||!Number.isFinite(r.worst)||!Number.isFinite(r.mean))throw Error('Invalid silhouette measurements for '+gesture+'.'+cname);
  const perFrame = r.frames.map((f) => +f.worst.toFixed(3));
  const stageAligned = gesture==='hairCaress'?summarizePosePhases(pose,perFrame):null;
  summary[`${gesture}.${cname}`] = {worst: +r.worst.toFixed(3), mean: +r.mean.toFixed(3), worstFrame: r.frames.reduce((b, f) => f.worst > b.worst ? f : b).i, perFrame,
    ...(stageAligned?{stageAligned}:{}),sampling:'eye-grid with projected vertex discs; not raster pixel coverage'};
  console.log(`${gesture} ${cname}: worst ${r.worst.toFixed(3)} (frame ${summary[`${gesture}.${cname}`].worstFrame}), mean ${r.mean.toFixed(3)}`);
  console.log('  eyes at worst frame:', JSON.stringify(r.frames[summary[`${gesture}.${cname}`].worstFrame].eyes.map((e) => [e.name, +e.fraction.toFixed(3)])));
  if(stageAligned)console.log('  stage-aligned landmarks and worst coverage:',JSON.stringify({landmarks:stageAligned.landmarks,phases:Object.fromEntries(Object.entries(stageAligned.phases).map(([key,p])=>[key,{worst:p.worst,worstFrame:p.worstFrame}]))}));
 }
}
if (process.env.SILHOUETTE_JSON) (await import('node:fs')).writeFileSync(process.env.SILHOUETTE_JSON, JSON.stringify(summary, null, 1));
