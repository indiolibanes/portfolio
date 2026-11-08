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

// F2: the F1 palette flag never reached the Liberation layer (adapter did not forward it). This test exercises the real adapter.
import {buildTrailHistory} from '../src/scripts/shorekeeper/combat-vfx-trails.mjs';
import {createS3CombatVfx} from '../src/scripts/shorekeeper/combat-vfx-adapter.mjs';
import {createS3Score} from '../src/scripts/shorekeeper/combat-vfx-events.mjs';
import {buildR61Plan as buildPlanF2} from '../src/scripts/shorekeeper/r61-plan.mjs';
test('F2 adapter: FIDELIDADE keeps the Stellarealm uniforms blue-white to the end; artistic still reaches violet and gold',()=>{
 const DUR={SK_ATTACK_01_ORIGINAL:3.633,SK_ATTACK_02_ORIGINAL:5.733,SK_ATTACK_03_ORIGINAL:3.867,SK_ATTACK_L02_ORIGINAL:4.667,SK_SKILL_01_ORIGINAL:5.233,SK_BURST_02_ORIGINAL:5.433,SK_IDLE_01_ORIGINAL:2.5};
 const lib=R61_SOURCE_IDS.map(id=>new T.AnimationClip(id,DUR[id],[new T.VectorKeyframeTrack('Bip001.position',[0,DUR[id]],[0,0,0,0,0,0])]));
 const plan=buildPlanF2(lib),g=createS3Score(plan.schedule).timeline.g11,gF=createS3Score(plan.schedule,{fidelity:true}).timeline.g11;
 const rig=()=>{const root=new T.Group(),scene=new T.Scene();scene.add(root);for(const [n,p] of Object.entries({Bip001Pelvis:[0,1,0],Bip001Spine2:[0,1.3,0],Bip001Head:[0,1.6,0],Bip001RFoot:[.1,.05,0],Bip001LFoot:[-.1,.05,0],Bip001RThigh:[.1,.9,0],Bip001LThigh:[-.1,.9,0],Bip001RHand:[.4,1.2,.2],Bip001LHand:[-.4,1.2,.2],Bip001RForearm:[.3,1.2,.1],Bip001LForearm:[-.3,1.2,.1]})){const o=new T.Bone();o.name=n;o.position.set(...p);root.add(o);}root.updateMatrixWorld(true);return {root,scene};};
 const hues=(fidelity,times)=>{const {root,scene}=rig(),a=createS3CombatVfx(T,{scene,model:root,plan,scale:1.6,stageAnchor:{x:0,z:0,floorY:0},fidelity});try{a.setTrailHistory(buildTrailHistory(root,()=>{},plan.schedule.duration));
  const out=[];for(const t of times){a.apply(t);const f=scene.getObjectByName('liberationOuterField');out.push(f.visible?Array.from(f.material.uniforms.uHor.value.toArray()):null);}return out;}finally{a.dispose();}};
 const fid=hues(true,[gF.absorbStart-0.55,gF.absorbStart-0.3,gF.absorbStart-0.05]),art=hues(false,[g.violetFull+0.1,(g.goldStart+g.goldFull)/2,g.goldFull+0.05]);
 for(const c of fid){assert.ok(c,'field visible');assert.ok(c[2]>=0.95&&c[0]<=0.55&&c[1]>=c[0],'blue-white, no violet (r<=g) and no amber: '+c);}
 assert.ok(art[1][0]>0.7&&art[1][2]<0.5,'artistic reaches the warm/gold hand-over: '+art[1]);
});

test('F2 runtime: 10 FIDELIDADE cycles keep resources flat; manual takeover keeps the camera; long frames and pause/resume across the Burst cut keep a single owner',()=>{
 const f=make();
 try{
  const uniq=()=>{const g=new Set(),m=new Set();f.stage.scene.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(x=>m.add(x));});return [g.size,m.size,f.stage.scene.children.length].join(',');};
  let steady=null;
  for(let i=0;i<10;i++){const d=f.create({profile:PROFILE_FIDELITY});try{runCycle(d);}finally{d.dispose();}
   assert.equal(bodyOwner(f.model),null);assert.equal(cameraOwner(f.stage),null);const u=uniq();if(i===1)steady=u;if(i>1)assert.equal(u,steady,'cycle '+i+' grew: '+u+' vs '+steady);}
  // manual takeover in the middle of shot 1: the automatic camera must not overwrite the user's camera on the next frames
  let d=f.create({profile:PROFILE_FIDELITY});
  try{
   const burst=d.plan.schedule.segments.find(s=>s.id==='SK_BURST_02_ORIGINAL');d.start();d.setPaused(false);d.seek(burst.start+1.0);d.advance(1/60);
   f.stage.camera.position.set(3,1,3);d.stopCamera({preserve:true});const p=f.stage.camera.position.toArray();
   for(let i=0;i<20;i++)d.advance(1/30);
   assert.deepEqual(f.stage.camera.position.toArray(),p,'camera untouched after manual takeover');
  }finally{d.dispose();}
  assert.equal(cameraOwner(f.stage),null);
  // long frames / pause-resume across the cut (30 and 60 Hz and a 1 s hitch): never throws, ownership single, clock monotonic
  for(const dt of [1/60,1/30,1.0]){
   d=f.create({profile:PROFILE_FIDELITY});
   try{const burst=d.plan.schedule.segments.find(s=>s.id==='SK_BURST_02_ORIGINAL');d.start();d.seek(burst.start-0.01);d.setPaused(true);d.advance(dt);d.setPaused(false);let last=-1;
    for(let i=0;i<8;i++){d.advance(dt);const t=d.state.clock??d.state.time??0;assert.ok(t>=last-1e-9,'clock monotonic');last=t;}
    assert.ok(bodyOwner(f.model)!==null,'one body owner while playing');
   }finally{d.dispose();}
   assert.equal(bodyOwner(f.model),null);assert.equal(cameraOwner(f.stage),null);
  }
 }finally{f.dispose();}
});
