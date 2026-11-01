import assert from 'node:assert/strict';
import {createChestDirector,createChestPose} from '../src/scripts/hsin-chest-gesture.mjs';
import * as THREE from 'three';
let value=0,rest=0;const events=[],pose={diagnostics:()=>({ready:true}),atBaseline:()=>value===0,apply(t){value=t},restore(){value=0;rest++}};
const actor=createChestDirector({pose,seed:11,onEvent:e=>events.push(e)});assert.equal(actor.start(false),false);assert.equal(actor.start(true),true);assert.equal(actor.start(true),false);
actor.advance(.9);assert.ok(value>0&&value<1);actor.advance(.9);assert.equal(value,1);actor.advance(2.2);assert.equal(value,1);actor.advance(.9);assert.ok(value>0&&value<1);actor.advance(.9);assert.equal(value,0);assert.equal(actor.busy(),false);assert.deepEqual(events,['gesture:prepare','gesture:hold','gesture:release']);
const idle=rest;actor.cancel();assert.equal(rest,idle,'idle cancellation must not overwrite a manual pose');
for(let i=0;i<200;i++)actor.advance(.5,{automatic:true,canStart:true,warm:false});assert.equal(actor.busy(),false);actor.advance(.1,{automatic:true,canStart:false,warm:true});assert.equal(actor.busy(),false);actor.advance(.1,{automatic:true,canStart:true,warm:true});assert.equal(actor.busy(),true);actor.cancel();assert.equal(value,0);
const missing=createChestPose({THREE,bones:[],meshes:[],head:null,calibration:{ready:false}});assert.equal(missing.diagnostics().ready,false);assert.equal(missing.apply(1),false);assert.equal(missing.atBaseline(),false);missing.restore();
console.log('Chest gesture: staged entry/hold/release, warm-only calendar, ownership and exact cancellation PASS');
// The gesture clock is fed only by the facial session's active visible frames.
const {createFacialSession}=await import('../src/scripts/hsin-face-session.mjs');let serial=0,now=0,ticks=0,elapsed=0;const jobs=new Map(),listeners=new Map();
const canvas={addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n),getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})},camera=new THREE.PerspectiveCamera();
const session=createFacialSession({THREE,meshes:[],head:null,camera,canvas,invalidate(){},onFrame:dt=>{ticks++;elapsed+=dt;},requestFrame:f=>{jobs.set(++serial,f);return serial},cancelFrame:id=>jobs.delete(id)});
const frame=()=>{now+=20;const list=[...jobs.values()];jobs.clear();list.forEach(f=>f(now));};session.start();frame();frame();assert.equal(ticks,2);session.setVisible(false);const frozen=elapsed;now+=20000;assert.equal(jobs.size,0);session.setVisible(true);frame();assert.equal(elapsed,frozen);session.setReduced(true);assert.equal(jobs.size,0);session.setReduced(false);frame();assert.equal(elapsed,frozen);session.pause();assert.equal(jobs.size,0);session.dispose();assert.equal(listeners.size,0);
const {ATMOSPHERES,createAtmosphereTexture}=await import('../src/scripts/hsin-atmosphere.mjs');assert.notDeepEqual(ATMOSPHERES.gold.stops,ATMOSPHERES.scarlet.stops);
const paint={addColorStop(){}};const fakeDocument={createElement:()=>({getContext:()=>({createLinearGradient:()=>paint,createRadialGradient:()=>paint,fillRect(){}})})};
for(const mode of ['gold','scarlet']){const texture=createAtmosphereTexture(THREE,fakeDocument,mode);assert.ok(texture);assert.equal(texture.colorSpace,THREE.SRGBColorSpace);texture.dispose();}
const releaseActor=createChestDirector({pose,seed:5});assert.equal(releaseActor.start(true),true);releaseActor.advance(.7);const beforeRelease=value;releaseActor.release();releaseActor.advance(.01);assert.ok(Math.abs(value-beforeRelease)<.001);for(let i=0;i<200;i++)releaseActor.advance(.02);assert.equal(value,0);assert.equal(releaseActor.busy(),false);
