import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {createR61Director} from '../src/scripts/shorekeeper/r61-cinematic.mjs';
import {R61_SOURCE_IDS} from '../src/scripts/shorekeeper/r61-plan.mjs';
import {bodyOwner} from '../src/scripts/shorekeeper/animation-ownership.mjs';
import {cameraOwner} from '../src/scripts/shorekeeper/camera-ownership.mjs';
import {ShorekeeperVfxR5Director} from '../src/scripts/shorekeeper/vfx-r5.mjs';
import {findMotionTransition,sampleMotion} from '../src/scripts/shorekeeper/motion-matching.mjs';
import {createPresentationClock} from '../src/scripts/shorekeeper/presentation-clock.mjs';

function fixture(){
 const root=new T.Group(),bone=new T.Bone();bone.name='Root';root.add(bone);
 const library=R61_SOURCE_IDS.map((id,i)=>new T.AnimationClip(id,2,[new T.VectorKeyframeTrack('Root.position',[0,2],[0,0,0,0,i*.02,0])]));
 const camera=new T.PerspectiveCamera(35,16/9,.01,100),orbit={enabled:true,enableDamping:true,target:new T.Vector3(0,1,0)};
 camera.position.set(0,1,5);
 const stage={camera,orbit,cameraConfig(){return {position:camera.position.toArray(),target:orbit.target.toArray(),fov:camera.fov};},restoreCamera(s){camera.position.fromArray(s.position);orbit.target.fromArray(s.target);camera.fov=s.fov;}};
 const makeVfx=()=>({state:'OFF',mode:'FIELD_GAMEPLAY',stage:'inner',disposed:false,center:new T.Vector3(),scale:2,
  enabled:{field:false,canopy:true,butterflies:false,collapsedCore:true},root:new T.Group(),environment:{root:new T.Group()},
  setState(v){this.state=v;},setMode(v){this.mode=v;},setStage(v){this.stage=v;},setEnabled(k,v){this.enabled[k]=v;},renderPose(){}});
 return {root,bone,library,stage,makeVfx};
}

for(const loss of ['dispose','null','replace'])test('R611 VFX '+loss+' recovers body within one second and releases camera immediately',()=>{
 const f=fixture(),original=f.makeVfx(),saved=f.stage.cameraConfig();let current=original;
 const d=createR61Director(T,f.root,f.library,f.stage,{getVfx:()=>current});
 try{
  d.start();d.seek(d.plan.cues[5].t);
  const replacement=f.makeVfx();replacement.state='RECOVERY';const untouched=JSON.stringify(replacement);
  if(loss==='dispose')original.disposed=true;else current=loss==='null'?null:replacement;
  d.advance(1/60);
  assert.equal(d.state.phase,'exit');assert.equal(d.state.presentationActive,false);
  assert.equal(d.state.termination,'VFX_UNAVAILABLE');assert.equal(cameraOwner(f.stage),null);
  assert.deepEqual(f.stage.cameraConfig(),saved);assert.equal(f.stage.orbit.enabled,true);
  for(let i=0;i<59;i++)d.advance(1/60);
  assert.equal(d.state.phase,'idle');assert.ok(d.state.weights.at(-1)>.999);
  assert.equal(JSON.stringify(replacement),untouched,'never write to replacement VFX');
  if(loss!=='dispose')assert.equal(original.mode,'FIELD_GAMEPLAY');
 }finally{d.dispose();}
 assert.equal(bodyOwner(f.root),null);
});

test('R611 absent VFX at start and seek cannot create a frozen run',()=>{
 const f=fixture(),d=createR61Director(T,f.root,f.library,f.stage);
 try{
  d.start();d.seek(.5);assert.equal(d.state.phase,'exit');assert.equal(cameraOwner(f.stage),null);
  d.advance(.6);assert.equal(d.state.phase,'idle');
  assert.throws(()=>d.seek(NaN));assert.throws(()=>d.seek(-1));
 }finally{d.dispose();}
});

test('R611 resource loss while paused releases camera without advancing the presentation clock',()=>{
 const f=fixture(),v=f.makeVfx(),d=createR61Director(T,f.root,f.library,f.stage,{getVfx:()=>v});
 try{
  d.start();d.advance(.3);d.setPaused(true);const clock=d.state.clock;v.disposed=true;
  d.advance(0);assert.equal(cameraOwner(f.stage),null);assert.equal(d.state.phase,'exit');assert.equal(d.state.clock,clock);
  d.advance(1);assert.equal(d.state.clock,clock);d.setPaused(false);d.advance(.6);assert.equal(d.state.phase,'idle');
 }finally{d.dispose();}
});

test('R611 repeated interruption is idempotent; pause holds recovery and restart clears termination',()=>{
 const f=fixture(),v=f.makeVfx(),d=createR61Director(T,f.root,f.library,f.stage,{getVfx:()=>v});
 try{
  for(let cycle=0;cycle<3;cycle++){
   d.start();assert.equal(d.state.termination,null);d.advance(.3);d.interrupt();
   d.setPaused(true);const clock=d.state.clock;d.advance(.8);assert.equal(d.state.clock,clock);
   d.setPaused(false);
   for(let i=0;i<30;i++){d.interrupt();d.advance(1/60);}
   assert.equal(d.state.phase,'idle');assert.equal(cameraOwner(f.stage),null);
  }
 }finally{d.dispose();d.dispose();}
 assert.equal(bodyOwner(f.root),null);
});

test('R611 revoking automatic camera preserves manual view through later advance and seek',()=>{
 const f=fixture(),v=f.makeVfx(),d=createR61Director(T,f.root,f.library,f.stage,{getVfx:()=>v});
 try{
  d.start();d.advance(.1);d.stopCamera();assert.equal(cameraOwner(f.stage),null);
  f.stage.camera.position.set(3,2,7);const manual=f.stage.cameraConfig();d.advance(.3);d.seek(1.2);
  assert.deepEqual(f.stage.cameraConfig(),manual);assert.equal(d.state.cameraActive,false);
 }finally{d.dispose();}
 const lab=readFileSync(new URL('../src/scripts/shorekeeper-sk-lab.mjs',import.meta.url),'utf8');
 assert.match(lab,/function stopCameraOwners\(\)\{director\?\.stopCamera\?\.\(\)/);
 assert.match(lab,/if\(motion\.matches\)\{stopCameraOwners\(\);\}/);
});

test('R611 restores exact R5 manual fade, time, toggles and hidden environment in both disposal orders',()=>{
 for(const vfxFirst of [false,true]){
  const f=fixture(),v=new ShorekeeperVfxR5Director(new T.Scene(),{butterflies:2,mobile:true});
  const snapshot=()=>({state:v.state,mode:v.mode,stage:v.stage,enabled:{...v.enabled},time:v.time,corePhase:v.corePhase,coreFrozen:v.coreFrozen,
   transition:v.transition,levels:[...v.levels],from:[...v.from],target:[...v.target],root:v.root.visible,environment:v.environment.root.visible,suspended:v.suspended});
  v.setMode('FIELD_GAMEPLAY');v.setStage('inner');v.setEnabled('field',false);v.setState('STELLAREALM');v.update(.3);v.setSuspended(true);
  v.root.visible=false;v.environment.root.visible=false;const saved=snapshot();
  const d=createR61Director(T,f.root,f.library,f.stage,{getVfx:()=>v});
  d.start();d.seek(d.plan.cues[5].t);d.interrupt();assert.deepEqual(snapshot(),saved);
  d.advance(.6);d.start();
  if(vfxFirst){v.dispose();d.advance(.6);assert.equal(d.state.phase,'idle');d.dispose();}
  else{d.dispose();assert.deepEqual(snapshot(),saved);v.dispose();}
  assert.equal(bodyOwner(f.root),null);assert.equal(cameraOwner(f.stage),null);
 }
});

test('R611 single presentation clock: speed, pause and reverse seek give identical source pose and camera',()=>{
 const f=fixture(),v=f.makeVfx(),d=createR61Director(T,f.root,f.library,f.stage,{getVfx:()=>v}),clock=createPresentationClock();
 try{
  d.start();clock.setSpeed(2);clock.tick(1000);d.advance(clock.tick(1250));assert.equal(d.state.clock,.5);
  const pose=f.bone.position.toArray(),camera=f.stage.cameraConfig();
  clock.setPaused(true);clock.tick(1500);const frozen=d.state.clock;d.advance(clock.tick(1750));assert.equal(d.state.clock,frozen);
  d.seek(1);d.seek(.5);assert.deepEqual(f.bone.position.toArray(),pose);assert.deepEqual(f.stage.cameraConfig(),camera);
  assert.throws(()=>d.setSpeed(2),/presentation clock/);
 }finally{d.dispose();}
});

test('R611 matching respects closed source windows and exact last sample time',()=>{
 const frame=time=>({time,positions:[0,0,0],quaternions:[0,0,0,1],velocities:[0,0,0],contacts:[]});
 const a={fps:60,joints:['Root'],frames:[frame(0),frame(1/60),frame(.025)]};
 const cut=findMotionTransition(a,a,{exitFrom:.02,exitTo:.025,enterFrom:.02,enterTo:.025});
 assert.equal(cut.exit,.025);assert.equal(cut.enter,.025);
 assert.throws(()=>findMotionTransition(a,a,{exitFrom:.018,exitTo:.019,enterTo:.01}),/No samples/);
 assert.throws(()=>findMotionTransition(a,a,{exitFrom:NaN,exitTo:.02}),/Invalid motion/);
 // Backward-compatible callers without explicit sample time remain bounded.
 const b={...a,frames:a.frames.map(({time,...rest})=>rest)};
 assert.equal(findMotionTransition(b,b,{exitFrom:.01,exitTo:.02,enterTo:.02}).exit,1/60);
 const f=fixture(),samples=sampleMotion(f.root,new T.AnimationClip('short',.025,[new T.VectorKeyframeTrack('Root.position',[0,.025],[0,0,0,.025,0,0])]),{fps:60});
 assert.equal(samples.frames.at(-1).time,.025);
 for(const frame of samples.frames)assert.ok(Math.abs(frame.velocities[0]-1)<1e-6,'actual shortened final interval determines velocity');
});
