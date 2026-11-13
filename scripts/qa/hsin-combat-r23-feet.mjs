/** Reproduces frozen-page matrix reads and measures the actual skinned sole vertices. No GPU claims. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {danceRig} from '../lib/hsin-dance-rig.mjs';
import {decodeCombatData} from '../../src/scripts/hsin-combat-data.mjs';
import {createCombatPose} from '../../src/scripts/hsin-combat-pose.mjs';
const r=await danceRig(),{T,model,by,meshes}=r;
const mesh=meshes.find(m=>m.material.name.includes('Down')),v=new T.Vector3();
const soles={L:[],R:[]};model.updateMatrixWorld(true);meshes.forEach(m=>m.skeleton.update());
for(let i=0;i<mesh.geometry.attributes.position.count;i++)for(const side of ['L','R']){
 let weight=0;for(let k=0;k<4;k++){const n=mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(i,k)].name;if(new RegExp('(Foot|Toe0)'+side).test(n))weight+=mesh.geometry.attributes.skinWeight.getComponent(i,k);}
 mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);
 if(weight>.7&&v.y<.012)soles[side].push(i);
}
assert.ok(soles.L.length>20&&soles.R.length>20);
model.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});
function sample(){meshes.forEach(m=>m.skeleton.update());return Object.fromEntries(['L','R'].map(s=>[s,{foot:by.get('ORG-Bip001Foot'+s).getWorldPosition(new T.Vector3()).toArray(),toe:by.get('ORG-Bip001Toe0'+s).getWorldPosition(new T.Vector3()).toArray(),soleMin:Math.min(...soles[s].map(i=>mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld).y))}]));}
const rest=sample(),report={modelScale:model.scale.toArray(),modelY:model.position.y,modelYaw:model.rotation.y,floorY:0,stoneTopY:0,soleSamples:{L:soles.L.length,R:soles.R.length},rest,clips:{},cause:'Frozen matrix ancestors can retain old root transforms after independent world reads. Propagate model.updateMatrixWorld(true) after all pose writes and before palm/foot reads. No bake, model or floor offset correction.'};
for(const id of ['legacy','basic01','basic02','combo','skill']){
 const d=decodeCombatData(JSON.parse(await readFile('public/assets/animations/hsin/'+(id==='legacy'?'combat-r2':`combat-r23-${id}`)+'.json'))),p=createCombatPose({T,data:d,bones:r.bones,model});
 const rows=[];let toeDrift=0,soleDrift=0;
 for(let f=0;f<d.frameCount;f++){
  p.apply(f/(d.frameCount-1));
  // The real lab reads upper-body transforms before its feet. No extra forced update in this test.
  by.get('ORG-Bip001HandR').getWorldPosition(v);
  const now=sample();
  for(const s of ['L','R']){toeDrift=Math.max(toeDrift,Math.abs(now[s].toe[1]-rest[s].toe[1]));soleDrift=Math.max(soleDrift,Math.abs(now[s].soleMin-rest[s].soleMin));}
  rows.push({time:f/30,root:model.getObjectByName(d.positionNames[0]).position.toArray(),feet:now});
 }
 p.restore();assert.ok(toeDrift<.0005,id+' toe drift '+toeDrift);assert.ok(soleDrift<.0005,id+' sole drift '+soleDrift);
 report.clips[id]={maxToeDriftMm:toeDrift*1000,maxSoleDriftMm:soleDrift*1000,rows};
}
await mkdir('docs/hsin-combat-r23',{recursive:true});await writeFile('docs/hsin-combat-r23/feet.json',JSON.stringify(report,null,2)+'\n');
console.log('Frozen-stage foot/sole contact PASS',Object.fromEntries(Object.entries(report.clips).map(([id,x])=>[id,{toeMm:x.maxToeDriftMm,soleMm:x.maxSoleDriftMm}])));
