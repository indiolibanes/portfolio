import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HSIN_CINEMATIC_IDLE,createCinematicReference} from '../src/scripts/hsin-cinematic-idle.mjs';
import {createBakedPose,createBakedChest} from '../src/scripts/hsin-baked-pose.mjs';
import {createPoseTransition} from '../src/scripts/hsin-pose-transition.mjs';
import {createChestDirector} from '../src/scripts/hsin-chest-director.mjs';
import {createBodyRepertoire} from '../src/scripts/hsin-body-repertoire.mjs';
import {createRestBreath} from '../src/scripts/hsin-rest-breath.mjs';
import {createFacialActing} from '../src/scripts/hsin-face-acting.mjs';
import {createFaceBinding,snapshotFace} from '../src/scripts/hsin-face-binding.mjs';
import {createStageLoop} from '../src/scripts/hsin-stage-loop.mjs';
import {buildCinematicProfile} from '../scripts/bake-hsin-cinematic-idle.mjs';
const file=p=>new URL('../'+p,import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=await readFile(file('public/assets/models/hsin/hsin-v2.0.glb')),oldBytes=await readFile(file('public/assets/models/hsin/hsin-v2.0-profile.json')),newBytes=await readFile(file('public/assets/models/hsin/hsin-v2.1-profile.json'));
const source=JSON.parse(oldBytes),profile=JSON.parse(newBytes),manifest=JSON.parse(await readFile(file('src/data/hsin-v21-pose.json')));
assert.equal(hash(bytes),manifest.modelSha256);assert.equal(hash(oldBytes),manifest.sourceProfileSha256);assert.equal(hash(newBytes),manifest.profileSha256);assert.equal(newBytes.length,manifest.bytes);
assert.ok(newBytes.length-oldBytes.length<8192,'compact profile increase under 8 KiB');
for(const key of ['bounds','calibration','gazeAxes','limits','sideStatus'])assert.deepEqual(profile[key],source[key]);
assert.deepEqual(Object.keys(profile.poses),Object.keys(source.poses));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{};
async function rig(){
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const meshes=[];gltf.scene.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))];gltf.scene.updateMatrixWorld(true);
 return {scene:gltf.scene,bones,meshes,by:new Map(bones.map(b=>[b.name,b])),original:new Map(bones.map(b=>[b,{q:b.quaternion.toArray(),p:b.position.toArray(),s:b.scale.toArray()}]))};
}
const a=await rig(),b=await rig();
assert.deepEqual(buildCinematicProfile({scene:a.scene,bones:a.bones,source}).profile,profile,'artifact must reproduce exactly from original rig and definition');
const reference=createCinematicReference({bones:b.bones,profile});reference.apply();b.scene.updateMatrixWorld(true);
assert.equal(a.bones.length,823);assert.equal(b.meshes.length,a.meshes.length);
const expected=new Map(b.bones.map(bone=>[bone,bone.quaternion.toArray()])),point=(r,name)=>r.by.get(name).getWorldPosition(new THREE.Vector3());
assert.equal([...expected].filter(([bone,values])=>values.some((v,i)=>v!==b.original.get(bone).q[i])).length,14,'only two heads and six bones per arm may change');
const metrics={maxHandDriftMetres:{},maxOrgDefWristGap:0,maxOrgDefRelativeOrientationErrorRadians:0,maxLateHandDrift:0,maxAddedAngularStep:0,maxFadeKnotAddedSpeedPerWeight:0,actionSamplesAt1Hz:{},profileExtraBytes:newBytes.length-oldBytes.length};
const headA=a.by.get('ORG-Bip001Head'),headB=b.by.get('ORG-Bip001Head');
metrics.eyeAnchorShift=headA.localToWorld(new THREE.Vector3(...source.calibration.focusCenter)).distanceTo(headB.localToWorld(new THREE.Vector3(...source.calibration.focusCenter)));
assert.ok(metrics.eyeAnchorShift<.008,'head tilt/yaw must not displace the eye anchor more than 8 mm');
for(const [name,data]of Object.entries(profile.poses)){
 const old=source.poses[name],side=name==='signature'?'R':'L',hand='ORG-Bip001Hand'+side;
 assert.deepEqual(data.names,old.names);assert.equal(data.frames.length,old.frames.length);
 for(const key of ['frames','negative','positive'])if(data[key]){
  assert.deepEqual(data[key][0],data.rest,'all variants begin at exactly the new reference');
  for(let i=24;i<65;i++)assert.deepEqual(data[key][i],old[key][i],`${name}/${key}: approved approach and hold unchanged`);
  const p0=createBakedPose({THREE,data:{...old,frames:old[key]},bones:a.bones}),p1=createBakedPose({THREE,data:{...data,frames:data[key]},bones:b.bones});
  let max=0;
  for(let i=0;i<=256;i++){
   const t=i/256;p0.apply(t);p1.apply(t);a.scene.updateMatrixWorld(true);b.scene.updateMatrixWorld(true);
   const drift=point(a,hand).distanceTo(point(b,hand));max=Math.max(max,drift);
   if(t>=HSIN_CINEMATIC_IDLE.fadeEnd){metrics.maxLateHandDrift=Math.max(metrics.maxLateHandDrift,drift);assert.ok(drift<1e-12,'world-space approved trajectory is exact after reference fade');}
   const gap=point(b,hand).distanceTo(point(b,'DEF-Bip001Hand'+side));metrics.maxOrgDefWristGap=Math.max(metrics.maxOrgDefWristGap,gap);assert.ok(gap<1e-6,'ORG/DEF position divergence');
   for(const part of ['UpperArm','Forearm','Hand']){
    const relative=r=>r.by.get('ORG-Bip001'+part+side).getWorldQuaternion(new THREE.Quaternion()).normalize().invert().multiply(r.by.get('DEF-Bip001'+part+side).getWorldQuaternion(new THREE.Quaternion()).normalize()).normalize();
    const error=relative(a).angleTo(relative(b));metrics.maxOrgDefRelativeOrientationErrorRadians=Math.max(metrics.maxOrgDefRelativeOrientationErrorRadians,error);assert.ok(error<5e-6,'ORG/DEF relative world rotation must remain coordinated');
   }
  }
  metrics.maxHandDriftMetres[name]=Math.max(metrics.maxHandDriftMetres[name]??0,max);assert.ok(max<(side==='R'?.022:.031));
  // The legacy 65-sample SLERP is not mathematically C1 at every knot. Bound the new
  // residual at the fade boundary rather than falsely claiming perfect differentiability.
  for(const t of [HSIN_CINEMATIC_IDLE.fadeEnd-1e-4,HSIN_CINEMATIC_IDLE.fadeEnd]){
   p0.apply(t);p1.apply(t);const prev0=old.names.map(n=>a.by.get(n).quaternion.clone().normalize()),prev1=data.names.map(n=>b.by.get(n).quaternion.clone().normalize());
   p0.apply(t+1e-4);p1.apply(t+1e-4);
   for(let j=0;j<6;j++){
    const velocity=(from,to)=>{const d=to.clone().multiply(from.clone().invert()).normalize();if(d.w<0)d.set(-d.x,-d.y,-d.z,-d.w);const angle=2*Math.acos(Math.min(1,d.w)),sin=Math.hypot(d.x,d.y,d.z);return new THREE.Vector3(d.x,d.y,d.z).multiplyScalar(sin>1e-12?angle/sin/1e-4:0);};
    const base=velocity(prev0[j],a.by.get(old.names[j]).quaternion.clone().normalize()),next=velocity(prev1[j],b.by.get(data.names[j]).quaternion.clone().normalize());
    const added=next.sub(base).length();metrics.maxFadeKnotAddedSpeedPerWeight=Math.max(metrics.maxFadeKnotAddedSpeedPerWeight,added);assert.ok(added<.002,'bounded angular velocity vector change at the reference fade knot');
   }
  }
  p0.restore();p1.restore();for(const n of data.names)assert.deepEqual(b.by.get(n).quaternion.toArray(),expected.get(b.by.get(n)));
 }
 // Unchanged quintic time law, including reversal: bounded steps and zero limiting speed.
 const pose0=createBakedPose({THREE,data:old,bones:a.bones}),pose1=createBakedPose({THREE,data,bones:b.bones});
 const t0=createPoseTransition({pose:pose0}),t1=createPoseTransition({pose:pose1});
 for(const goal of [1,0]){
  t0.request(goal);t1.request(goal);
  let prior0=old.names.map(n=>a.by.get(n).quaternion.clone().normalize()),prior1=data.names.map(n=>b.by.get(n).quaternion.clone().normalize()),lastStep=0;
  for(let step=0;step<300;step++){
   t0.advance(1/120);t1.advance(1/120);assert.equal(t1.weight(),t0.weight());
   const now0=old.names.map(n=>a.by.get(n).quaternion.clone().normalize()),now1=data.names.map(n=>b.by.get(n).quaternion.clone().normalize());lastStep=0;
   for(let j=0;j<6;j++){const d0=prior0[j].angleTo(now0[j]),d1=prior1[j].angleTo(now1[j]);metrics.maxAddedAngularStep=Math.max(metrics.maxAddedAngularStep,d1-d0);assert.ok(d1<=d0+.005,'no added angular snap');lastStep=Math.max(lastStep,d1);}
   prior0=now0;prior1=now1;
  }
  assert.ok(lastStep<1e-7,'gesture boundaries settle with zero speed');
 }
 t0.reset();t1.reset();
}
function actors(r,p,cinematic){
 let allocations=0;class CountedQuaternion extends THREE.Quaternion{constructor(...args){super(...args);allocations++;}}
 const T={...THREE,Quaternion:CountedQuaternion},signature=createPoseTransition({pose:createBakedPose({THREE:T,data:p.poses.signature,bones:r.bones})}),chest=createChestDirector({pose:createBakedChest({THREE:T,profile:p.poses,bones:r.bones}),seed:2,organic:true}),hair=createChestDirector({pose:createBakedPose({THREE:T,data:p.poses.hair,bones:r.bones}),seed:3,organic:true});
 const spine=r.by.get('ORG-Bip001Spine2'),body=createBodyRepertoire({seed:77,signature,chest,hair,breath:createRestBreath({THREE:T,bone:spine,update:()=>spine.updateMatrix()}),capabilities:()=>({signature:true,chest:true,composition:true,hair:true})});
 const face=createFacialActing({pass:'auto-b1',autonomous:true,seed:77,intensity:.75,morphLimits:p.limits,gazeAxes:p.gazeAxes}),binding=createFaceBinding(r.meshes,snapshotFace(r.meshes),p.calibration,{limits:p.limits});
 return {body,face,binding,chest,hair,signature,allocations:()=>allocations};
}
a.scene.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});b.scene.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});
const original=actors(a,source,false),cinematic=actors(b,profile,true);
// Production cadence, 600 seconds. States, cooldowns, events and face channels must match.
for(let i=0;i<18000;i++){
 const face0=original.face.advance(1/30),face1=cinematic.face.advance(1/30);assert.deepEqual(face1,face0);
 for(const actor of [original,cinematic])actor.body.advance(1/30,{enabled:true,context:actor.face.diagnostics().expressions.context});
 assert.deepEqual(cinematic.body.diagnostics(),original.body.diagnostics());
 if(i%30===0){const d=cinematic.body.diagnostics();if(d.action)metrics.actionSamplesAt1Hz[d.action]=(metrics.actionSamplesAt1Hz[d.action]??0)+1;}
 assert.ok(!(cinematic.chest.busy()&&cinematic.hair.busy()));
 original.binding.apply(face0);cinematic.binding.apply(face1);
 for(let j=0;j<a.meshes.length;j++)assert.deepEqual(b.meshes[j].morphTargetInfluences,a.meshes[j].morphTargetInfluences);
}
assert.deepEqual(Object.keys(metrics.actionSamplesAt1Hz).sort(),['chest','composition','hair','signature']);
assert.equal(cinematic.allocations(),original.allocations(),'no added per-frame Quaternion allocations');
metrics.quaternionAllocationsPer600Seconds=cinematic.allocations();
// Pausing the existing loop cannot run any controller or change the pose/reference.
let pending=null,active=true,steps=0,id=0;const loop=createStageLoop({requestFrame:f=>(pending=f,++id),cancelFrame:()=>{pending=null;},active:()=>active,step:dt=>{steps++;cinematic.body.advance(dt,{enabled:true});},draw(){},fps:30});
loop.invalidate();pending(0);active=false;loop.policyChanged();pending(34);const paused=b.bones.map(b=>b.quaternion.toArray()),savedSteps=steps;loop.setVisible(false);loop.setVisible(true);pending(999999);assert.equal(steps,savedSteps);assert.deepEqual(b.bones.map(b=>b.quaternion.toArray()),paused);loop.dispose();
for(const actor of [original,cinematic]){actor.body.dispose();actor.binding.restore();}
for(const [bone,values]of expected)assert.deepEqual(bone.quaternion.toArray(),values,'exact cinematic rest after long cycle/disposal');
reference.restore();
a.scene.updateMatrixWorld(true);b.scene.updateMatrixWorld(true);
for(const[bone,values]of b.original){assert.deepEqual(bone.quaternion.toArray(),values.q);assert.deepEqual(bone.position.toArray(),values.p);assert.deepEqual(bone.scale.toArray(),values.s);}
const disabled=createCinematicReference({bones:b.bones,profile:source,enabled:false});assert.equal(disabled.ready,false);disabled.apply();disabled.restore();
for(const[bone,values]of b.original)assert.deepEqual(bone.quaternion.toArray(),values.q);
console.log('Cinematic idle: references, exact approved late trajectories/holds, ORG/DEF, C1 time boundaries, both sides, unchanged face/state traces, 600s, pause, allocations and exact full-rig reversal PASS');
console.log(JSON.stringify(metrics));
if(process.env.HSIN_WRITE_CINEMATIC_REPORT==='1')await writeFile(file('docs/hsin-v21-validation.json'),JSON.stringify(metrics,null,2)+'\n');
