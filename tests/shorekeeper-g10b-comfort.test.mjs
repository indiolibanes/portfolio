import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {planComfortYaw,arenaWeight,G10B_COMFORT,createRigCameraReader,prepareCameraGuide} from '../public/experimentos/sk-g9/runtime/smart-camera.mjs';
import {flightGeometry,skillFlightPoints,SKILL_MAX_DRAW_CALLS} from '../public/experimentos/sk-g9/runtime/combat-vfx-skill.mjs';
import {createR61Director} from '../public/experimentos/sk-g9/runtime/r61-cinematic.mjs';
import {createS3CombatVfx} from '../public/experimentos/sk-g9/runtime/combat-vfx-adapter.mjs';
import {ShorekeeperVfxR5Director} from '../public/experimentos/sk-g9/runtime/vfx-r5.mjs';
import {R61_SOURCE_IDS} from '../public/experimentos/sk-g9/runtime/r61-plan.mjs';
const HZ=30,rad=d=>d*Math.PI/180;
// body yaw path: slow 180 deg turn, hold, a 3-turn spin in 1 s (not followable), a -195 deg unwind in 0.35 s, hold
function bodyYaw(){const out=[];for(let i=0;i<=12*HZ;i++){const t=i/HZ;let y=0;
 if(t<4)y=Math.PI*Math.min(1,Math.max(0,(t-1)/3)); else y=Math.PI;
 if(t>=6&&t<7)y+=6*Math.PI*((t-6)); else if(t>=7)y+=6*Math.PI;
 if(t>=9&&t<9.35)y-=rad(195)*((t-9)/.35); else if(t>=9.35)y-=rad(195);out.push(y);}return out;}
test('comfort yaw planner: bounded speed/acceleration, ignores unfollowable spins and the end unwind, history-free',()=>{
 const by=bodyYaw(),a=planComfortYaw(by,HZ,12),b=planComfortYaw(by,HZ,12);assert.deepEqual(a,b);
 let vmax=0,amax=0;for(let i=1;i<a.length;i++){vmax=Math.max(vmax,Math.abs(a[i]-a[i-1])*HZ);if(i>1)amax=Math.max(amax,Math.abs(a[i]-2*a[i-1]+a[i-2])*HZ*HZ);}
 assert.ok(vmax<=rad(G10B_COMFORT.yawMaxDegPerS)+1e-6,'speed '+vmax);assert.ok(amax<=rad(G10B_COMFORT.yawAccDegPerS2)*1.3,'accel '+amax);
 const travel=(t0,t1)=>Math.abs(a[Math.round(t1*HZ)]-a[Math.round(t0*HZ)]);
 assert.ok(travel(6,7)<rad(45),'must not chase a 1080 deg/s spin');assert.ok(travel(8.9,9.8)<rad(30),'must not whip with the unwind');
 // the slow sustained 180 deg turn IS followed (anatomical front preferred over a long back view)
 assert.ok(travel(1,5.5)>rad(60));
});
test('arena weight is continuous (no phase-regexp step) and bounded',()=>{
 const tl={revealStart:23.5,revealPeak:24.6,peak:25.3,revealEnd:27.5,recoveryStart:27.2};let prev=arenaWeight(0,tl),maxStep=0;
 for(let t=.001;t<=30;t+=.001){const w=arenaWeight(t,tl);assert.ok(w>=0&&w<=1);maxStep=Math.max(maxStep,Math.abs(w-prev));prev=w;}
 assert.ok(maxStep<.004,'step '+maxStep);assert.equal(arenaWeight(10,tl),0);assert.equal(arenaWeight(10,null),0);assert.ok(arenaWeight(25,tl)>.99);
});
test('five butterflies fly distinct arcs to distinct targets, and every flight stays inside the camera envelope',()=>{
 const fr={pel:[0,.9,0],chest:[0,1.2,0],fwd:[0,0,1],right:[-1,0,0],h:1.6},tg=[];
 for(let i=0;i<5;i++)tg.push(flightGeometry(i,fr).TG);
 for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)assert.ok(Math.hypot(...tg[i].map((x,k)=>x-tg[j][k]))>.3*fr.h,'targets '+i+','+j);
 const env=skillFlightPoints(fr),lo=[0,1,2].map(a=>Math.min(...env.map(p=>p[a]))),hi=[0,1,2].map(a=>Math.max(...env.map(p=>p[a])));
 for(let i=0;i<5;i++){const g=flightGeometry(i,fr);for(let s=0;s<=1;s+=.02){const a=1-s,w=[a*a*a,3*a*a*s,3*a*s*s,s*s*s],p=[0,1,2].map(k=>w[0]*g.S[k]+w[1]*g.C1[k]+w[2]*g.C2[k]+w[3]*g.TG[k]);p.forEach((x,k)=>assert.ok(x>=lo[k]-1e-9&&x<=hi[k]+1e-9));}}
 assert.equal(SKILL_MAX_DRAW_CALLS,5);
});
function fixture(){const root=new T.Group(),body=new T.Bone();body.name='Root';root.add(body);const coords={Bip001Pelvis:[0,.8,0],Bip001Spine2:[0,1.1,0],Bip001Head:[0,1.5,0],Bip001RHand:[-.55,1.2,.05],Bip001LHand:[.55,1.2,.05],Bip001RForearm:[-.45,1.2,0],Bip001LForearm:[.45,1.2,0],Bip001RThigh:[-.1,.75,0],Bip001LThigh:[.1,.75,0],Bip001RFoot:[-.1,.1,0],Bip001LFoot:[.1,.1,0],Bip001RToe0:[-.1,0,.15],Bip001LToe0:[.1,0,.15]};for(const [n,p]of Object.entries(coords)){const b=new T.Bone();b.name=n;b.position.fromArray(p);body.add(b);}root.updateMatrixWorld(true);return root;}
test('director integration: a fast-spinning, translating body yields a bounded camera path at 60 Hz (no snap, no safety-net fit)',()=>{
 const root=fixture(),camera=new T.PerspectiveCamera(34,16/9,.005,100),orbit=new OrbitControls(camera);camera.position.set(0,1,5);orbit.target.set(0,1,0);orbit.minDistance=.1;orbit.maxDistance=5;orbit.update();
 const stage={T,camera,orbit,canvas:{width:960,height:540},scene:new T.Scene(),cameraConfig(){return {position:camera.position.toArray(),target:orbit.target.toArray(),fov:camera.fov,minDistance:orbit.minDistance,maxDistance:orbit.maxDistance};},restoreCamera(c){camera.position.fromArray(c.position);orbit.target.fromArray(c.target);camera.fov=c.fov??camera.fov;camera.updateProjectionMatrix();orbit.minDistance=c.minDistance??orbit.minDistance;orbit.maxDistance=c.maxDistance??orbit.maxDistance;orbit.update();camera.updateMatrixWorld(true);}};
 const clips=R61_SOURCE_IDS.map(id=>new T.AnimationClip(id,5,[new T.VectorKeyframeTrack('Root.position',[0,5],[0,0,0,2,0,1]),new T.QuaternionKeyframeTrack('Root.quaternion',[0,2.4,2.6,5],[0,0,0,1, 0,Math.sin(1.5),0,Math.cos(1.5), 0,Math.sin(1.5),0,Math.cos(1.5), 0,0,0,1])]));
 const v=new ShorekeeperVfxR5Director(stage.scene,{butterflies:3,camera});v.bindModel(root);
 let adapter;const d=createR61Director(T,root,clips,stage,{getVfx:()=>v,scoreVfx:({plan})=>(adapter=createS3CombatVfx(T,{scene:stage.scene,model:root,plan,scale:1.6,stageAnchor:{x:0,z:0,floorY:0}})),cameraProfile:{smart:true,model:root,period:18,returnSeconds:.7},liberationMode:'layer'});
 try{d.start();assert.ok(adapter.skillWindow&&adapter.skillWindow.end>adapter.skillWindow.start);const D=d.plan.schedule.duration,P=[];
  for(let t=0;t<=D;t+=1/60){d.seek(t);P.push({p:camera.position.toArray(),n:d.cameraTelemetry()});}
  let maxAcc=0,maxStep=0;for(let i=2;i<P.length;i++){const a=P[i].p.map((x,k)=>x-2*P[i-1].p[k]+P[i-2].p[k]);maxAcc=Math.max(maxAcc,Math.hypot(...a)*3600);maxStep=Math.max(maxStep,Math.hypot(...P[i].p.map((x,k)=>x-P[i-1].p[k])));}
  assert.ok(maxAcc<60,'camera acceleration '+maxAcc);assert.ok(maxStep<.35,'camera step '+maxStep);
  assert.equal(P.filter(x=>x.n.safetyNet).length,0);assert.equal(P.filter(x=>x.n.outside>0).length,0);
 }finally{d.dispose();v.dispose();if(orbit.domElement)orbit.dispose();}
});
