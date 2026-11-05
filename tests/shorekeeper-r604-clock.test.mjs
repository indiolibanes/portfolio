import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPresentationClock} from '../src/scripts/shorekeeper/presentation-clock.mjs';
import {createOriginalIdleDirector} from '../src/scripts/shorekeeper/original-idle-director.mjs';
import {createComboDirector,buildComboSchedule} from '../src/scripts/shorekeeper/combo-sequencer.mjs';
import {createSemanticCues} from '../src/scripts/shorekeeper/semantic-cues.mjs';
import {needsContinuousFrame} from '../src/scripts/shorekeeper/frame-policy.mjs';
import {createRenderLoop} from '../src/scripts/shorekeeper/render-loop.mjs';
import {ShorekeeperVfxR2Director} from '../src/scripts/shorekeeper/vfx-r2.mjs';
import {createFrameMetrics} from '../src/scripts/shorekeeper/frame-metrics.mjs';
import {createAnatomicalFaceDirector} from '../src/scripts/shorekeeper/anatomical-face.mjs';
import {facialOwner} from '../src/scripts/shorekeeper/facial-ownership.mjs';
import fs from 'node:fs';

function source(){const root=new T.Group(),bone=new T.Bone();bone.name='Body';root.add(bone);return {root,clip:new T.AnimationClip('SK_BURST_01_ORIGINAL',2,[new T.VectorKeyframeTrack('Body.position',[0,2],[0,0,0,0,2,0])])};}
test('original source and combo duration survive 60/30/15/5 FPS, drops and 0.5/1/1.5 speed',()=>{
 for(const fps of [60,30,15,5])for(const speed of [.5,1,1.5])for(const combo of [false,true]){
  const {root,clip}=source(),clock=createPresentationClock();clock.setSpeed(speed);clock.tick(0);
  const d=combo?createComboDirector(T,root,{[clip.name]:clip},buildComboSchedule([{id:clip.name,duration:2}]),{entry:.1}):createOriginalIdleDirector(T,root,clip,{enter:.1,exit:.1});
  d.start();let wall=0;const total=combo?2.1:2.2;
  for(let frame=0;frame<fps*10;frame++){
   const step=1000/fps*(frame%11===5?3:1);wall+=step;d.advance(clock.tick(wall));
   if(d.state.phase==='idle')break;
  }
  assert.ok(Math.abs(wall/1000-total/speed)<=3/fps+1e-7,`${fps}FPS ${speed}x combo=${combo} wall=${wall/1000}`);
  assert.equal(d.state.phase,'idle');d.dispose();
 }
});
test('pause, buffer/offscreen reanchor, seek and reset omit hidden wall time',()=>{
 const c=createPresentationClock();c.tick(0);assert.equal(c.tick(200),.2);c.setPaused(true);c.tick(200);c.tick(9000);assert.equal(c.state.presentationTime,.2);
 c.setPaused(false);c.tick(9000);assert.equal(c.tick(9200),.2);c.reanchor();c.tick(30000);assert.equal(c.tick(30200),.2);
 c.seek(7);c.tick(40000);assert.equal(c.state.presentationTime,7);c.reset();assert.equal(c.state.cycleId,1);assert.equal(c.state.presentationTime,0);
 assert.throws(()=>c.setSpeed(NaN));assert.throws(()=>c.tick(NaN));
});
test('VFX transition and time preserve a 200ms dropped frame without extra renders',()=>{
 const v=new ShorekeeperVfxR2Director(new T.Scene());v.setState('STELLAREALM');v.update(.2,1);assert.equal(v.time,.2);v.update(1,1);assert.equal(v.time,1.2);assert.ok(Math.abs(v.transition-1.2/v.transitionSeconds)<1e-9);v.setSuspended(true);v.update(20,1);assert.equal(v.time,1.2);v.dispose();
});
test('measured cue crossings emit once, seek recomposes silently and cycles reset',()=>{
 const emitted=[],states=[],m={clipId:'fixture',clipHash:'a'.repeat(64),variant:'ORIGINAL',sourceFrame:30,clipTime:1,sequenceTime:1,event:'HANDS_CLOSE',provenance:'SYNTHETIC_FIXTURE',evidence:'fixture-only'};
 const cues=createSemanticCues([m,{...m,sequenceTime:2,event:'FIELD_REVEAL'}],{emit:e=>emitted.push(e),apply:active=>states.push(active.map(x=>x.event))});
 cues.reset(4);cues.advance(3);cues.advance(4);assert.equal(emitted.length,2);assert.equal(emitted[0].cycleId,4);
 cues.seek(.5);assert.deepEqual(states.at(-1),[]);assert.equal(emitted.length,2);cues.seek(3);assert.deepEqual(states.at(-1),['HANDS_CLOSE','FIELD_REVEAL']);assert.equal(emitted.length,2);
 cues.reset(5);cues.advance(3);assert.equal(emitted.length,4);assert.throws(()=>createSemanticCues([{...m,evidence:null}]));
 assert.equal(createSemanticCues([]).state.status,'ULT_SOURCE_GATE_PENDING');
});
test('one pending RAF, zero static/offscreen/disposed, input wakes and animated sky stays active',()=>{
 let enabled=true,active=false,next=0;const pending=new Map();
 const loop=createRenderLoop({request:cb=>{pending.set(++next,cb);return next;},cancel:id=>pending.delete(id),eligible:()=>enabled,tick:()=>needsContinuousFrame({vfx:active})});
 const frame=()=>{const [id,cb]=pending.entries().next().value;pending.delete(id);cb(100);};
 loop.wake();loop.wake();assert.equal(pending.size,1);frame();assert.equal(pending.size,0);
 active=true;loop.wake();frame();assert.equal(pending.size,1);enabled=false;loop.reconcile();assert.equal(pending.size,0);
 enabled=true;loop.reconcile();assert.equal(pending.size,1);loop.dispose();assert.equal(pending.size,0);
 assert.equal(needsContinuousFrame({paused:true,vfx:true,body:true}),false);
});
test('telemetry bounds memory, reports rolling percentiles and does not invent GPU timings',()=>{
 const m=createFrameMetrics(4);for(const t of [100,10,20,30,40])m.add(t,t/2);
 const r=m.report();assert.equal(r.sampleCount,4);assert.equal(r.totalSamples,5);assert.deepEqual(r.intervalMs,{p50:20,p95:40,p99:40});assert.equal(r.gpuMs,'NOT_MEASURED');m.reset();assert.equal(m.report().intervalMs.p95,null);
});
test('three controller reloads release facial ownership after combat and recovery (numeric fixtures)',()=>{
 const golden=JSON.parse(fs.readFileSync(new URL('../docs/characters/shorekeeper-r6-baseline-golden.json',import.meta.url)));
 const inspection={morphMeshes:golden.meshes.map(m=>({...m,morphTargetInfluences:new Array(Object.keys(m.morphTargetDictionary).length).fill(0)})),weights:{}};
 inspection.names=inspection.morphMeshes.flatMap(m=>Object.keys(m.morphTargetDictionary));
 for(let reload=0;reload<3;reload++){
  const face=createAnatomicalFaceDirector(inspection),{root,clip}=source();
  assert.throws(()=>createAnatomicalFaceDirector(inspection));
  face.playCandidate('WORRIED_FIXED_R6');face.advance(.5);
  const body=createOriginalIdleDirector(T,root,clip,{enter:.1,exit:.1,onEvent:e=>face.onAnimationEvent(e)});
  body.start();assert.equal(face.report().combat,true);assert.equal(face.playCandidate('GLANCE_BILATERAL_R6'),false);
  for(let n=0;n<150;n++){body.advance(1/60);face.advance(1/60);}
  assert.equal(body.state.phase,'idle');assert.equal(face.report().combat,false);assert.equal(face.playCandidate('GLANCE_BILATERAL_R6'),true);
  body.dispose();face.dispose();assert.ok(facialOwner(inspection).every(row=>row.owner===null));
 }
});
