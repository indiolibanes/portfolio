// Private manual CPU QA. PNG decoding is mocked; no WebGL/visual approval.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';import * as T from 'three';
import {createOriginalIdleDirector,findOriginalClip,ORIGINAL_IDLE_IDS,validateOriginalLibrary} from '../src/scripts/shorekeeper/original-idle-director.mjs';
import {disposeObject,assertSelfContainedGLB} from '../src/scripts/shorekeeper/local-model.mjs';
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
async function load(p){const b=fs.readFileSync(p),bytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),json=assertSelfContainedGLB(bytes);return {json,gltf:await new GLTFLoader().parseAsync(bytes,'')};}
if(!process.argv[2]||!process.argv[3])throw Error('Usage: node tests/shorekeeper-original-idles-private.mjs PRIVATE_MODEL.glb PRIVATE_LIBRARY_DIRECTORY');
let start=performance.now();const {gltf:g}=await load(process.argv[2]);const parseMs=performance.now()-start,bones=[];g.scene.traverse(o=>{if(o.isBone)bones.push(o)});const rest=bones.map(b=>({p:b.position.toArray(),q:b.quaternion.toArray(),s:b.scale.toArray()})),rows=[],clips=[];
for(const id of ORIGINAL_IDLE_IDS){const loaded=await load(path.join(process.argv[3],id+'.animations.glb'));clips.push(...validateOriginalLibrary(T,g.scene,loaded));disposeObject(loaded.gltf.scene);}
for(const id of ORIGINAL_IDLE_IDS)for(const layer of ['composed','body','rib']){
 const clip=findOriginalClip(clips,id,layer);assert(clip&&clip.validate());assert.equal(clip.tracks.length,729);let calls=0,events=[],updateTimes=[],paused=false;
 const d=createOriginalIdleDirector(T,g.scene,clip,{enter:.1,exit:.2,onEvent:e=>events.push(e.type),mixerFactory:r=>{const m=new T.AnimationMixer(r),step=m.update.bind(m);m.update=dt=>{calls++;return step(dt)};return m;}});
 const advance=dt=>{const before=calls,active=d.state.phase!=='idle'&&!d.state.paused;const begin=performance.now();d.advance(dt);updateTimes.push(performance.now()-begin);assert.equal(calls-before,active?1:0);};
 d.start();advance(.1);const step=1/30;
 for(let i=0;i<Math.ceil(clip.duration*30)+15;i++){
  if(i===90&&!paused){const pose=bones.map(b=>b.quaternion.toArray());const clock=d.state.clock;d.setPaused(true);advance(2);assert.equal(d.state.clock,clock);assert.deepEqual(bones.map(b=>b.quaternion.toArray()),pose);d.setPaused(false);paused=true;}
  advance(step);
 }
 assert.equal(d.state.phase,'idle');d.start();advance(.1);for(let i=0;i<30;i++)advance(step);d.interrupt();for(let i=0;i<10;i++)advance(step);assert.equal(d.state.phase,'idle');d.start();advance(.1);d.start();for(let i=0;i<Math.ceil(clip.duration*30)+50;i++)advance(step);assert.equal(d.state.phase,'idle');
 let error=0;bones.forEach((b,i)=>{for(const [k,arr] of [['p',b.position.toArray()],['q',b.quaternion.toArray()],['s',b.scale.toArray()]])arr.forEach((x,j)=>{assert(Number.isFinite(x));error=Math.max(error,Math.abs(x-rest[i][k][j]));});});assert(error<1e-7);assert(events.includes('execution')&&events.includes('recovery')&&events.includes('end'));d.dispose();updateTimes.sort((a,b)=>a-b);rows.push({id,layer,duration:clip.duration,updates:calls,restMaxComponentError:error,nodeAdvanceMeanMs:updateTimes.reduce((a,b)=>a+b,0)/updateTimes.length,nodeAdvanceP95Ms:updateTimes[Math.floor(updateTimes.length*.95)]});
}
disposeObject(g.scene);console.log(JSON.stringify({three:T.REVISION,parseNodeMs:parseMs,rows,webgl:'NOT_TESTED',pngDecode:'MOCKED',mobilePerformance:'NOT_MEASURED'},null,2));
