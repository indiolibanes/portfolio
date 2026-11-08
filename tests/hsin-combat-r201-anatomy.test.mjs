/**
 * Combat R2.0.1 anatomical gate on the real GLB: every baked frame (not a subsample), both arms.
 * Bone lengths, elbow hinge (direction, plane, no hyperextension), forearm roll, wrist alignment, silhouette in three
 * cameras, skinned surface stretch, clearances and temporal stability. Quaternion normalisation alone proves nothing here.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {auditArms,ARM_GATE} from '../scripts/qa-hsin-combat-arms.mjs';
const text=await readFile('public/assets/animations/hsin/combat-r2.json','utf8'),data=JSON.parse(text);
assert.equal(data.revision,'r2.0.1','R2.0.1 bake expected');
const report=await auditArms(text,{label:'R2.0.1'});
assert.equal(report.frames,253);
for(const [side,s] of Object.entries(report.summary)){
 assert.ok(s.samples.arm>200&&s.samples.triangles>200,'enough skinned arm samples '+side);
 const failing=Object.entries(s.fails).filter(([,x])=>x.frames);
 assert.deepEqual(failing.map(([k,x])=>`${k}@${x.first}s×${x.frames}`),[],`${side} arm anatomical gate`);
 assert.ok(s.maxBoneLengthDeltaMm<ARM_GATE.boneLengthMm,side+' bone length');
 assert.ok(s.flexRange[0]>=ARM_GATE.hyperextensionDegrees&&s.flexRange[1]<=ARM_GATE.maxFlexDegrees,side+' elbow range '+s.flexRange);
 // Linear skinning on this asset already stretches the armpit and folds the elbow crease in R2 (CI run 42432651050:
 // stretch R 3.56 / L 3.28, crease R 0.27 / L 0.18 on edges of 4 mm or more). R2.0.1 must stay within that envelope
 // (10 % margin) — the skin weights themselves are outside the Combat domain and were not edited.
 const R2_SURFACE={R:{stretch:3.563,compress:.267},L:{stretch:3.284,compress:.184}}[side];
 assert.ok(s.surface.maxStretch<=R2_SURFACE.stretch*1.1,side+' arm stretch vs R2 '+s.surface.maxStretch);
 assert.ok(s.surface.minCompress>=R2_SURFACE.compress*.8,side+' elbow crease vs R2 '+s.surface.minCompress);
}
const {perFrame,...summary}=report;
await mkdir('docs/hsin-combat-r201',{recursive:true});
await writeFile('docs/hsin-combat-r201/arm-anatomy-after.json',JSON.stringify(summary,null,2)+'\n');
console.log('Combat R2.0.1 arm anatomy PASS',JSON.stringify(Object.fromEntries(Object.entries(report.summary).map(([k,s])=>[k,{flex:s.flexRange,hinge:s.maxHingeOffPlane,roll:s.maxForearmRoll,wrist:s.maxWristSwing,pronation:s.maxPronation,projectedWrist:s.maxProjectedWrist,surface:s.surface,clearance:s.minClearanceMm,step:s.maxStep}]))));
