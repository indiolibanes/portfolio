import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {make} from './shorekeeper-r65-fixture.mjs';
import {createR62Integration} from '../src/scripts/shorekeeper/r62-integration.mjs';
import {createOriginalIdleDirector} from '../src/scripts/shorekeeper/original-idle-director.mjs';
import {createDuetCinematicFrame,createDuetTrace} from '../src/scripts/shorekeeper/duet-cinematic.mjs';
import {bodyOwner} from '../src/scripts/shorekeeper/animation-ownership.mjs';
import {duetMusicSnapshot} from '../src/scripts/shorekeeper/duet-music-contract.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
test('reproduces old transient VFX capture: first frame interrupts with VFX_UNAVAILABLE',()=>{
 const f=make();let temporary=f.v;const d=createR62Integration(T,f.model,f.library,f.stage,{getVfx:()=>temporary,camera:false});
 try{d.start();temporary=null;d.advance(1/60);assert.equal(d.state.termination,'VFX_UNAVAILABLE');assert.equal(d.state.phase,'exit');}finally{d.dispose();f.dispose();}
});
test('stable lease plays all seven complete source windows for three cycles and records effective actions',()=>{
 const f=make(),activeVfx=f.v,d=createR62Integration(T,f.model,f.library,f.stage,{getVfx:()=>activeVfx,camera:false,entry:.65,preservePoseOnDispose:true});
 const hash=JSON.stringify(f.library.map(c=>c.toJSON())),trace=createDuetTrace(T,f.model,f.model.parent??f.model),seen=new Set();
 try{for(let cycle=0;cycle<3;cycle++){d.start();let frames=0;while(d.state.phase!=='idle'){
  d.advance(1/60);const s=d.state;for(const a of s.actions)if(a.weight>.01)seen.add(a.clip);
  trace.sample(1/60,{body:s,music:{playbackConfirmed:true},vfx:d.scoreAdapter.last,camera:null});
  assert.equal(s.termination,null);assert.ok(frames++<9000);
 }assert.ok(d.state.actions.at(-1).time>=1.44);}
 assert.equal(seen.size,7);assert.equal(hash,JSON.stringify(f.library.map(c=>c.toJSON())));
 mkdirSync('docs/qa/shorekeeper-r65',{recursive:true});writeFileSync('docs/qa/shorekeeper-r65/synthetic-trace.json',JSON.stringify({evidence:'SYNTHETIC_RIG_NOT_PRIVATE_SOURCE_OR_VISUAL_APPROVAL',seen:[...seen],rows:trace.report().filter((_,i)=>i%10===0)}));
 }finally{d.dispose();f.dispose();}
});
test('exclusive idle/combo handoffs preserve TRS at dispose, construction and start; entry is gradual',()=>{
 const f=make(),bone=f.model.getObjectByName('Root');bone.position.x=3;
 const clip=new T.AnimationClip('SK_IDLE_01_ORIGINAL',2,[new T.VectorKeyframeTrack('Root.position',[0,2],[3,0,0,4,0,0])]);
 const idle=createOriginalIdleDirector(T,f.model,clip,{preservePoseOnDispose:true});idle.start();idle.advance(1);const p=bone.position.clone();idle.dispose();assert.ok(bone.position.distanceTo(p)<1e-9);assert.equal(bodyOwner(f.model),null);
 const d=f.create({camera:false,entry:.65,preservePoseOnDispose:true});try{assert.ok(bone.position.distanceTo(p)<1e-9);d.start();assert.ok(bone.position.distanceTo(p)<1e-9);d.advance(.001);assert.ok(bone.position.distanceTo(p)<.001);d.advance(1);const end=bone.position.clone();d.dispose();assert.ok(bone.position.distanceTo(end)<1e-9);}finally{d.dispose();f.dispose();}
});
test('interrupt stops advancing attack time and completes recovery, preserving final pose for idle',()=>{
 const f=make(),d=f.create({camera:false,preservePoseOnDispose:true});try{d.start();d.advance(2);const attack=d.state.actions[0].time;d.interrupt();for(let i=0;i<40;i++)d.advance(1/60);assert.equal(d.state.phase,'idle');assert.equal(d.state.actions[0].time,attack);assert.equal(d.state.presentationActive,false);}finally{d.dispose();f.dispose();}
});
test('adapted G11 frame fits two actors at desktop, portrait and landscape aspect without another mixer',()=>{
 for(const [w,h] of [[1280,720],[390,844],[832,384]]){
 const camera=new T.PerspectiveCamera(36,w/h,.03,100);camera.position.set(0,1,8);camera.lookAt(0,1,0);
 const host=new T.Mesh(new T.BoxGeometry(1,2,.6)),guest=host.clone();host.position.set(-1.6,1,0);guest.position.set(1.6,1,0);
 const fit=createDuetCinematicFrame(T,{camera,host,guest}),frame=fit({position:[2,1,3],target:[1.6,1,0],fov:36},2);
 camera.position.fromArray(frame.position);camera.lookAt(new T.Vector3().fromArray(frame.target));camera.updateMatrixWorld(true);
 for(const root of [host,guest]){const b=new T.Box3().setFromObject(root);for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new T.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<.83&&Math.abs(p.y)<.71);}}
 host.geometry.dispose();host.material.dispose();
 }
});
test('only confirmed provider PLAYING grants music start eligibility, including pause/end/resume',()=>{
 const sample=status=>duetMusicSnapshot({provider:'youtube',status,playbackConfirmed:true});
 for(const state of ['no_music','ready','paused','buffering','ended','unavailable'])assert.equal(sample(state).playbackConfirmed,false);
 assert.equal(sample('playing').playbackConfirmed,true);assert.equal(sample('paused').playbackConfirmed,false);assert.equal(sample('playing').playbackConfirmed,true);
});
