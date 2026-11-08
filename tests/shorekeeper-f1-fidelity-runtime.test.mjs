import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {PROFILE_ARTISTIC,PROFILE_FIDELITY} from '../src/scripts/shorekeeper/fidelity-profile.mjs';
import {createR62Integration} from '../src/scripts/shorekeeper/r62-integration.mjs';
import {ShorekeeperVfxR5Director} from '../src/scripts/shorekeeper/vfx-r5.mjs';
import {R61_SOURCE_IDS} from '../src/scripts/shorekeeper/r61-plan.mjs';
import {bodyOwner} from '../src/scripts/shorekeeper/animation-ownership.mjs';
import {cameraOwner} from '../src/scripts/shorekeeper/camera-ownership.mjs';
function fixture(){const root=new T.Group(),body=new T.Bone();body.name='Root';root.add(body);const coords={Bip001Pelvis:[0,.8,0],Bip001Spine2:[0,1.1,0],Bip001Head:[0,1.5,0],Bip001RHand:[-.55,1.2,.05],Bip001LHand:[.55,1.2,.05],Bip001RForearm:[-.45,1.2,0],Bip001LForearm:[.45,1.2,0],Bip001RThigh:[-.1,.75,0],Bip001LThigh:[.1,.75,0],Bip001RFoot:[-.1,.1,0],Bip001LFoot:[.1,.1,0],Bip001RToe0:[-.1,0,.15],Bip001LToe0:[.1,0,.15]};for(const [name,p]of Object.entries(coords)){const b=new T.Bone();b.name=name;b.position.fromArray(p);body.add(b);}root.updateMatrixWorld(true);return root;}
function make(){const model=fixture(),camera=new T.PerspectiveCamera(34,16/9,.005,100),orbit=new OrbitControls(camera);camera.position.set(0,1,5);orbit.target.set(0,1,0);orbit.minDistance=.1;orbit.maxDistance=5;orbit.enableDamping=true;orbit.update();const stage={T,camera,orbit,scene:new T.Scene(),canvas:{width:960,height:540},cameraConfig(){return {position:camera.position.toArray(),target:orbit.target.toArray(),fov:camera.fov,minDistance:orbit.minDistance,maxDistance:orbit.maxDistance};},restoreCamera(c){camera.position.fromArray(c.position);orbit.target.fromArray(c.target);camera.fov=c.fov??camera.fov;camera.updateProjectionMatrix();orbit.minDistance=c.minDistance??orbit.minDistance;orbit.maxDistance=c.maxDistance??orbit.maxDistance;orbit.update();camera.updateMatrixWorld(true);}};
const REST=[Math.SQRT1_2,0,0,-Math.SQRT1_2],RIBQ=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),3.05),RIPQ=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),.09);
const library=[];for(const id of R61_SOURCE_IDS){const burst=/BURST/.test(id);const pos=new T.VectorKeyframeTrack('Root.position',[0,5],[0,0,0,1,0,0]);
 library.push(new T.AnimationClip(id,5,burst?[pos,new T.QuaternionKeyframeTrack('Root.quaternion',[0,1,5],[...RIBQ.toArray(),...RIBQ.clone().multiply(RIPQ).toArray(),...RIBQ.toArray()])]:[pos]));
 if(burst)library.push(new T.AnimationClip(id+'_BODY',5,[new T.QuaternionKeyframeTrack('Root.quaternion',[0,5],[...REST,...REST])]));}let v=new ShorekeeperVfxR5Director(stage.scene,{butterflies:3,camera});v.bindModel(model);const getVfx=()=>v,create=(o={})=>createR62Integration(T,model,library,stage,{getVfx,...o});return {model,library,stage,get v(){return v;},replace:()=>{const old=v;v=new ShorekeeperVfxR5Director(stage.scene,{butterflies:3,camera});v.bindModel(model);old.dispose();},create,dispose(){v.dispose();}};}

const REST=[Math.SQRT1_2,0,0,-Math.SQRT1_2];
const rootOf=(c)=>c.tracks.find(t=>t.name==='Root.quaternion');
const snap=lib=>JSON.stringify(lib.map(c=>c.toJSON()));
function runCycle(d){d.start();d.setPaused(false);let n=0;while(d.state.phase!=='idle'||d.state.camera?.returning){d.advance([1/30,1/60,.05][n++%3]);assert.ok(n<5000);}}
test('F1 FIDELIDADE integration: Burst plays the BODY-owned Root; status is honest; source library untouched; artistic unchanged',()=>{
 const f=make(),before=snap(f.library);
 try{
  const a=f.create({profile:PROFILE_ARTISTIC});
  try{assert.equal(a.integrationStatus.profile,PROFILE_ARTISTIC);assert.equal(rootOf(a.plan.clips.SK_BURST_02_ORIGINAL).values.length,12,'artistic keeps the original RIB Root');}finally{a.dispose();}
  const d=f.create({profile:PROFILE_FIDELITY});
  try{
   const root=rootOf(d.plan.clips.SK_BURST_02_ORIGINAL);assert.equal(root.values.length,8,'FIDELIDADE Burst Root = static BODY value');
   for(let i=0;i<4;i++)assert.ok(Math.abs(root.values[i]-REST[i])<1e-6);
   assert.equal(d.plan.clips.SK_ATTACK_01_ORIGINAL,f.library.find(c=>c.name==='SK_ATTACK_01_ORIGINAL'),'non-Burst clips are the very same source objects');
   const st=d.integrationStatus;assert.equal(st.profile,PROFILE_FIDELITY);assert.equal(st.G7,'NO_GO');assert.equal(st.visualDirection,'FIDELITY_NOT_CERTIFIED');assert.equal(st.fidelity.editedCurves,0);
  }finally{d.dispose();}
  assert.equal(snap(f.library),before,'the source library is never modified');
 }finally{f.dispose();}
});
test('F1 FIDELIDADE refuses to run without BODY twins (no silent authorial fallback)',()=>{
 const f=make();const lib=f.library.filter(c=>!/_BODY$/.test(c.name));
 try{assert.throws(()=>createR62Integration(T,f.model,lib,f.stage,{getVfx:()=>f.v,profile:PROFILE_FIDELITY}),/BODY layer source missing/);assert.equal(bodyOwner(f.model),null,'nothing allocated on failure');}finally{f.dispose();}
});
test('F1 toggle ARTISTICO <-> FIDELIDADE x3 with start/interrupt/restart: ownership released, no scene growth',()=>{
 const f=make();
 try{
  const base=f.stage.scene.children.length;let steady=null;
  for(let i=0;i<3;i++)for(const profile of [PROFILE_FIDELITY,PROFILE_ARTISTIC]){
   const d=f.create({profile});
   try{runCycle(d);d.start();d.seek(22.5);d.setPaused(true);d.start();runCycle(d);assert.equal(cameraOwner(f.stage),null);}finally{d.dispose();}
   assert.equal(bodyOwner(f.model),null);assert.equal(cameraOwner(f.stage),null);
   const n=f.stage.scene.children.length;if(steady===null)steady=n;assert.equal(n,steady,'scene child count stable across toggles');
  }
  assert.ok(steady>=base);
 }finally{f.dispose();}
});
