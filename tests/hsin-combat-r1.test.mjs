import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createCombatDirector,COMBAT_FORMS} from '../src/scripts/hsin-combat-director.mjs';
import {decodeCombatData} from '../src/scripts/hsin-combat-data.mjs';
import {createBakedPose} from '../src/scripts/hsin-baked-pose.mjs';
import {danceRig} from '../scripts/lib/hsin-dance-rig.mjs';
const r=await danceRig(),{T,model,bones,meshes,by}=r;
const bytes=readFileSync('public/assets/animations/hsin/combat-r1.json'),data=decodeCombatData(JSON.parse(bytes));
const manifest=JSON.parse(readFileSync('src/data/hsin-combat-r1.json'));
assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sha256);
const pose=createBakedPose({THREE:T,data,bones});
assert.ok(pose.diagnostics().ready);
const feet=[],baseline=new Map(),v=new T.Vector3();
model.updateMatrixWorld(true);
for(const mesh of meshes){
 mesh.skeleton.update();const {skinIndex,skinWeight}=mesh.geometry.attributes;
 for(let i=0;i<skinIndex.count;i++){let w=0;for(let k=0;k<4;k++)if(/^(ORG|DEF)-Bip001(Foot|Toe)/.test(mesh.skeleton.bones[skinIndex.getComponent(i,k)].name))w+=skinWeight.getComponent(i,k);
 if(w>.75){const p=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld);if(p.y<.025)feet.push({mesh,i,p});}}
}
assert.ok(feet.length>100);
const roots=['ORG-Bip001Pelvis','DEF-Bip001Pelvis','root','ORG-Root'].map(n=>by.get(n));roots.forEach(b=>baseline.set(b,b.matrixWorld.clone()));
let maxSlide=0,maxStep=0;
const previous=data.rest.slice();
for(let f=0;f<data.frameCount;f++){
 pose.apply(f/(data.frameCount-1));model.updateMatrixWorld(true);meshes.forEach(m=>m.skeleton.update());
 for(const foot of feet)maxSlide=Math.max(maxSlide,foot.mesh.getVertexPosition(foot.i,v).applyMatrix4(foot.mesh.matrixWorld).distanceTo(foot.p));
 for(const b of roots)assert.deepEqual(b.matrixWorld.elements,baseline.get(b).elements);
 for(let i=0;i<data.names.length;i++){
  const q=bones.find(b=>b.name===data.names[i]).quaternion;
  const prior=new T.Quaternion().fromArray(previous,i*4);maxStep=Math.max(maxStep,q.angleTo(prior)*180/Math.PI);q.toArray(previous,i*4);
 }
}
assert.ok(maxSlide<.0005);assert.ok(maxStep<8);pose.restore();assert.ok(pose.atBaseline());
function session(){
 const events=[],states=[],d=createCombatDirector({pose:{apply(){},restore(){},beginRecovery(){},recover(){}},onEvent:e=>events.push(e),onState:s=>states.push(s)});
 const start=performance.now();
 for(let frame=0;frame<18000;frame++){
  if(!d.owns())d.start();
  if(frame%301===0)d.pause();
  if(frame%301===3)d.resume();
  if(frame%997===100)d.interrupt();
  d.advance(1/30);
 }
 const cpu=performance.now()-start;d.dispose();assert.ok(!d.owns());return {trace:d.diagnostics().trace,events,states,cpu};
}
const one=session(),two=session();assert.deepEqual(one.trace,two.trace);assert.deepEqual(one.events,two.events);
assert.ok(one.states.includes('INTERRUPTED'));assert.ok(!one.states.includes('HEAVY'));assert.equal(COMBAT_FORMS.ILLUMINING_FORM,false);
const d=createCombatDirector({pose:{apply(){},restore(){},beginRecovery(){},recover(){}}});d.start();d.advance(1);d.pause();d.advance(1);assert.equal(d.sample().time,1);d.resume();d.advance(4.8);assert.equal(d.sample().state,'COMPLETE');assert.ok(!d.owns());
const report={secondsSimulated:600,frames:18000,feet:feet.length,maxSlideMm:maxSlide*1000,maxAngularStepDegrees:maxStep,bakeBytes:bytes.length,decodedBytes:data.frameCount*data.rest.length*4,sequencerTotalMs:one.cpu,sequencerMeanMs:one.cpu/18000,traceDeterministic:true,limitations:'Node CPU and geometric support evidence. Collision and artistic gates require separate review.'};
writeFileSync('docs/hsin-combat-r1/structural-qa.json',JSON.stringify(report,null,2)+'\n');console.log(report);
