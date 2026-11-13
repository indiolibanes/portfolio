/**
 * Combat R2.2 environment layer on the real GLB and the real runtime modules (no mocks of the skeleton):
 * palm-anchored trails, planted-foot detection from the real feet, pelvis weight transfer, floor ripples only on the stone plane,
 * camera independence, determinism, budget (draw calls / triangles / geometries / materials), colour ceiling (never white), disposal.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {decodeCombatData} from '../src/scripts/hsin-combat-data.mjs';
import {createCombatPose} from '../src/scripts/hsin-combat-pose.mjs';
import {createCombatDirector} from '../src/scripts/hsin-combat-director.mjs';
import {createCombatVfx} from '../src/scripts/hsin-combat-vfx.mjs';
import {createCombatEnv} from '../src/scripts/hsin-combat-env.mjs';
import {TINT,WORST_CASE_TRIANGLES} from '../src/scripts/hsin-combat-env-sim.mjs';
import {danceRig} from '../scripts/lib/hsin-dance-rig.mjs';
import {torso} from '../scripts/lib/hsin-combat-r21-score.mjs';
const r=await danceRig(),{T,model,bones,by}=r;
const bytes=readFileSync('public/assets/animations/hsin/combat-r2.json');
const report={};
// colours are linear-light tints that never approach white
for(const [i,c] of TINT.entries()){assert.ok(Math.max(...c)<=1&&Math.min(...c)/Math.max(...c)<=.75,'tint '+i+' stays warm');}
function simulate(cameraPosition,{density=1}={}){
 const scene=new T.Scene();scene.add(model);const camera=new T.PerspectiveCamera(34,16/9,.03,45);camera.position.copy(cameraPosition);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
 const vfx=createCombatVfx({T,scene,camera,by}),env=createCombatEnv({T,scene,camera,by,vfx,density});
 const p=createCombatPose({T,data:decodeCombatData(JSON.parse(bytes)),bones,model});
 const d=createCombatDirector({pose:p,sequence:decodeCombatData(JSON.parse(bytes)).sequence,onEvent:e=>{const t=d.sample().time;vfx.event(e,t);env.event(e,t);}});
 const group=scene.getObjectByName('Hsin combat R2.2 environment effects');assert.ok(group&&!group.visible,'hidden before the sequence');
 const trace=[],peak={calls:0,triangles:0,rings:0,shards:0,glints:0},colorMax={r:0,g:0,b:0,ratio:1};
 const palmR=new T.Vector3(),palmL=new T.Vector3(),near={trail:Infinity,trailLeft:Infinity};
 let floorY=new Set(),firstProbe=null,hipPairs=[],maxShift=0,uploadsWhileHidden=0;d.start();
 for(let i=0;i<300&&d.owns();i++){
  d.advance(1/30);if(!d.owns())break;const t=d.sample().time;vfx.update(t);env.update(t);
  const calls=group.children.filter(m=>m.visible&&m.count>0).length;if(!group.visible&&calls)uploadsWhileHidden++;
  const pr=env.probe();if(!firstProbe&&pr.baseline.measured)firstProbe={...pr};
  peak.calls=Math.max(peak.calls,calls);peak.triangles=Math.max(peak.triangles,pr.triangles);for(const k of ['rings','shards','glints'])peak[k]=Math.max(peak[k],pr.instances[k]);
  const [rings,shards,glints]=group.children;
  for(let k=0;k<rings.count;k++){floorY.add(+rings.instanceMatrix.array[k*16+13].toFixed(4));}
  for(const m of group.children)for(let k=0;k<m.count;k++){
   const c=m.instanceColor.array,R=c[k*3],G=c[k*3+1],B=c[k*3+2];colorMax.r=Math.max(colorMax.r,R);colorMax.g=Math.max(colorMax.g,G);colorMax.b=Math.max(colorMax.b,B);
   const mx=Math.max(R,G,B);if(mx>.05)colorMax.ratio=Math.min(colorMax.ratio,Math.min(R,G,B)/mx);
  }
  // Basic 01 / 02 shards are born on the palm that strikes
  vfx.palms(palmR,palmL);
  if(t>=1.85&&t<=2.15)for(let k=0;k<shards.count;k++){const x=shards.instanceMatrix.array[k*16+12],y=shards.instanceMatrix.array[k*16+13],z=shards.instanceMatrix.array[k*16+14];near.trail=Math.min(near.trail,Math.hypot(x-palmR.x,y-palmR.y,z-palmR.z));}
  if(t>=2.85&&t<=3.2)for(let k=0;k<shards.count;k++){const x=shards.instanceMatrix.array[k*16+12],y=shards.instanceMatrix.array[k*16+13],z=shards.instanceMatrix.array[k*16+14];near.trailLeft=Math.min(near.trailLeft,Math.hypot(x-palmL.x,y-palmL.y,z-palmL.z));}
  maxShift=Math.max(maxShift,Math.abs(pr.pelvisShift));hipPairs.push([t,pr.pelvisShift,torso(t).hip]);
  trace.push([+t.toFixed(4),rings.count,shards.count,glints.count,...[rings,shards,glints].map(m=>m.count?Array.from(m.instanceMatrix.array.slice(12,15)).map(x=>+x.toFixed(4)):null)]);
 }
 const probeEnd=env.probe(),statsEnd={...probeEnd.stats};
 const visibleAfter=group.visible||group.children.some(m=>m.visible);
 const disposed={geometry:0,material:0};for(const m of group.children)m.geometry.addEventListener('dispose',()=>disposed.geometry++);group.children[0].material.addEventListener('dispose',()=>disposed.material++);
 const budget={...env.budget};env.dispose();vfx.dispose();
 assert.equal(scene.getObjectByName('Hsin combat R2.2 environment effects'),undefined,'group removed');scene.remove(model);
 return {trace,peak,colorMax,near,floorY:[...floorY],firstProbe,hipPairs,maxShift,visibleAfter,disposed,budget,stats:statsEnd,uploadsWhileHidden};
}
const a=simulate(new T.Vector3(1.4,1.2,2.8)),b=simulate(new T.Vector3(-2.2,.9,2.4)),c=simulate(new T.Vector3(1.4,1.2,2.8));
// budget
assert.ok(a.peak.calls<=3,'env draw calls '+a.peak.calls);assert.ok(a.peak.triangles<=3000,'env triangles '+a.peak.triangles);assert.ok(WORST_CASE_TRIANGLES<=3000);
assert.equal(a.budget.meshes,3);assert.equal(a.budget.geometries,3);assert.equal(a.budget.materials,1);assert.equal(a.budget.textures,0);assert.equal(a.budget.renderTargets,0);assert.equal(a.budget.customShaders,0);
assert.ok(a.peak.rings>0&&a.peak.shards>0&&a.peak.glints>0,'all layers appear '+JSON.stringify(a.peak));
assert.equal(a.visibleAfter,false,'nothing visible when the sequence ends');assert.equal(a.disposed.geometry,3);assert.equal(a.disposed.material,1);
assert.equal(a.uploadsWhileHidden,0,'no hidden-but-active instances');
// colours never reach white
assert.ok(a.colorMax.r<=1&&a.colorMax.ratio<=.75,'instance colours stay warm '+JSON.stringify(a.colorMax));
// real feet: both planted at rest, baseline measured from the skeleton
assert.ok(a.firstProbe.baseline.measured,'baseline measured at the first update');assert.deepEqual(a.firstProbe.planted,[1,1],'both feet planted at rest');
// floor ripples live on the stone plane only
assert.deepEqual(a.floorY,[.006],'every ring is on the floor plane '+a.floorY);
// weight transfer comes from a real pelvis shift
assert.ok(a.maxShift>.045,'real pelvis shift '+a.maxShift);assert.ok(a.stats.transfers>=2,'verified weight transfers '+a.stats.transfers);
// trails follow the real palm path
assert.ok(a.near.trail<.16,'Basic 01 fragments stay on the right palm path '+a.near.trail);assert.ok(a.near.trailLeft<.16,'Basic 02 fragments stay on the left palm path '+a.near.trailLeft);
// camera independence (positions) and determinism
const strip=t=>t.map(r=>[r[0],r[1],r[2],r[3],r[4],r[5]]);
assert.deepEqual(strip(a.trace),strip(b.trace),'instance counts and ring/shard positions do not depend on the camera');
assert.deepEqual(a.trace,c.trace,'same camera, same clock -> identical frames');
// density only removes fragments
const lite=simulate(new T.Vector3(1.4,1.2,2.8),{density:.6});
assert.ok(lite.peak.shards<=a.peak.shards&&lite.stats.shards<a.stats.shards,'density .6 spawns fewer fragments ('+lite.stats.shards+' vs '+a.stats.shards+')');
assert.deepEqual(lite.firstProbe.planted,[1,1]);
// correlation of the real pelvis shift with the baked hip channel (recorded, not asserted: different offset conventions)
const mean=x=>x.reduce((s,v)=>s+v,0)/x.length,xs=a.hipPairs.map(p=>p[1]),ys=a.hipPairs.map(p=>p[2]),mx=mean(xs),my=mean(ys);
const corr=xs.reduce((s,v,i)=>s+(v-mx)*(ys[i]-my),0)/Math.sqrt(xs.reduce((s,v)=>s+(v-mx)**2,0)*ys.reduce((s,v)=>s+(v-my)**2,0));
report.env={peak:a.peak,colorMax:a.colorMax,nearestTrailFragmentM:{basic01:+a.near.trail.toFixed(3),basic02:+a.near.trailLeft.toFixed(3)},maxPelvisShiftM:+a.maxShift.toFixed(4),transfers:a.stats.transfers,spawned:a.stats,pelvisVsBakedHipCorrelation:+corr.toFixed(3),baseline:a.firstProbe.baseline,density06:{shards:lite.stats.shards,peak:lite.peak},budget:a.budget,frames:a.trace.length};
mkdirSync('docs/hsin-combat-r22',{recursive:true});writeFileSync('docs/hsin-combat-r22/env-glb-qa.json',JSON.stringify(report,null,1)+'\n');
console.log('hsin-combat-env GLB ok',JSON.stringify(report.env.peak),'transfers',a.stats.transfers,'corr',report.env.pelvisVsBakedHipCorrelation);
