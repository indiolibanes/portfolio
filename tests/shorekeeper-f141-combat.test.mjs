import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {readFileSync} from 'node:fs';
import {createQATargetTrack,planTargetFlight,sampleTargetFlight,cubicPoint,cubicVelocity} from '../src/scripts/shorekeeper/qa-target.mjs';
import {createVolumetricHeavy} from '../src/scripts/shorekeeper/heavy-volumetric.mjs';
import {createTargetedSkill} from '../src/scripts/shorekeeper/skill-targeted.mjs';
import {elevatedLiberationFrame} from '../src/scripts/shorekeeper/combat-study-camera.mjs';
import {fidelityCameraFrame,FIDELITY_SHOTS} from '../src/scripts/shorekeeper/fidelity-camera.mjs';
import {bodyOwner} from '../src/scripts/shorekeeper/animation-ownership.mjs';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
test('F141 target history: five distinct surface contacts, deterministic moving targets and zero damage API',()=>{
 const target=createQATargetTrack({position:[0,0,2],radius:.2});target.record(0,{motion:true});
 const contacts=[];for(let i=0;i<5;i++){const p=planTargetFlight({target,origin:[(i-2)*.05,0,0],index:i,start:i*.1,duration:1.2,h:1});const hit=sampleTargetFlight(p,p.end);assert(hit.impact);assert(Math.abs(distance(hit.position,target.at(p.end).position)-.2)<1e-10);contacts.push(hit.position);
  for(const hz of [24,30,60])for(let t=p.start;t<p.end;t+=1/hz)assert.deepEqual(sampleTargetFlight(p,t),sampleTargetFlight(p,t));assert.equal(sampleTargetFlight(p,p.end+1).alpha,0);}
 assert.equal(new Set(contacts.map(x=>x.join(','))).size,5);assert(!('hp' in target));assert(!('damage' in target));
});
test('F141 moving target edits splice C1 rather than teleport; removal dissipates at last world position',()=>{
 const target=createQATargetTrack({position:[0,0,2],radius:.2});target.record(.5,{position:[.6,.1,2]});
 const p=planTargetFlight({target,origin:[0,0,0],index:2,start:0,duration:1.2,h:1});assert.equal(p.segments.length,2);
 assert(distance(cubicPoint(p.segments[0],.5),cubicPoint(p.segments[1],.5))<1e-12);assert(distance(cubicVelocity(p.segments[0],.5),cubicVelocity(p.segments[1],.5))<1e-10);
 target.record(.7,{enabled:false});target.record(.8,{enabled:true});const removed=planTargetFlight({target,origin:[0,0,0],index:2,start:0,duration:1.2,h:1});
 const a=sampleTargetFlight(removed,.7),b=sampleTargetFlight(removed,.8),c=sampleTargetFlight(removed,1.2);assert.deepEqual(a.position,b.position);assert(b.alpha<a.alpha);assert.equal(c.alpha,0);assert(!c.impact);assert.equal(b.phase,'CANCEL_DISSIPATE');assert.throws(()=>target.record(.2,{enabled:true}));
});
test('F141 absent or out-of-range target never generates a substitute hit',()=>{
 for(const opts of [{position:[0,0,20]},{position:[0,0,2],enabled:false}]){const target=createQATargetTrack({position:opts.position,radius:.2});if(opts.enabled===false)target.record(0,{enabled:false});const p=planTargetFlight({target,origin:[0,0,0],index:0,start:0,duration:1,h:1});assert.equal(p.status,'NO_VALID_QA_TARGET');assert.equal(sampleTargetFlight(p,.8),null);}
});
test('F141 Heavy uses 3D sphere and noncoplanar toroids; cameras do not determine placement; ten lifecycles release resources',()=>{
 const scene=new T.Scene();for(let k=0;k<10;k++){const h=createVolumetricHeavy(T,{parent:scene,h:1}),resources=new Set();h.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});let freed=0;for(const r of resources)r.addEventListener('dispose',()=>freed++);
  const probe=h.update({position:[.2,.5,1],radius:.4,level:1,time:3});assert.equal(probe.drawCalls,4);const sphere=h.root.children[0];assert(sphere.geometry.isSphereGeometry||sphere.geometry.type==='SphereGeometry');sphere.geometry.computeBoundingBox();const b=sphere.geometry.boundingBox.getSize(new T.Vector3());assert(Math.min(b.x,b.y,b.z)>1.9);
  const rings=h.root.children[2];rings.geometry.computeBoundingBox();const bb=rings.geometry.boundingBox.getSize(new T.Vector3());assert(Math.min(bb.x,bb.y,bb.z)>1);const before=scene.children.length;assert.equal(before,1);h.dispose();h.dispose();assert.equal(scene.children.length,0);assert.equal(freed,resources.size);assert.equal(h.update({position:[0,0,0],radius:1,level:1,time:1}),null);}
});
test('F141 skill batches wings and real ribbons along flight samples; endpoint contacts and ten disposals retain no children',()=>{
 const scene=new T.Scene(),target=createQATargetTrack({position:[0,0,2],radius:.2}),bundle={index:new Map([['SKILL.butterflies',{start:1,end:3.4}]])};
 const data=Array.from({length:6},()=>new Float32Array(6*3));const history={n:6,hz:1,duration:5,data};
 for(let k=0;k<10;k++){const layer=createTargetedSkill(T,{parent:scene,h:1,bundle,target});layer.setHistory(history);const state=layer.update({t:2});assert.equal(state.butterflies.length,5);assert(state.butterflies.some(x=>x.alpha>0));assert.equal(state.ribbonBasis,'SAME_FLIGHT_SAMPLES');
  const ribbons=layer.root.getObjectByName('qaTargetFlightRibbons');assert(ribbons.visible);assert.equal(ribbons.geometry.attributes.position.count,5*24*2);const positions=ribbons.geometry.attributes.position.array;const p=state.butterflies[0].position;const a=Array.from(positions.slice(0,3)),b=Array.from(positions.slice(3,6));assert(distance(p,a.map((v,i)=>(v+b[i])/2))<1e-6);
  assert(layer.root.getObjectByName('QA_TARGET').geometry.type==='IcosahedronGeometry');layer.dispose();layer.dispose();assert.equal(scene.children.length,0);assert.equal(layer.update({t:2}),null);}
 const src=readFileSync(new URL('../src/scripts/shorekeeper/skill-targeted.mjs',import.meta.url),'utf8');assert(!src.includes('viewMatrix[0][0]'));assert(!/requestAnimationFrame|setInterval|setTimeout/.test(src));
});
test('F141 elevated camera preserves both close shots and cuts, frames protagonist above eyes across 16:9/9:16',()=>{
 const A={head:[0,1.8,0],pel:[0,1,0],rh:[.4,1.5,.1],lh:[-.4,1.6,.1],rf:[.1,0,0],lf:[-.1,0,0]},ctx={h:2,rig:{anchors:A,front:[0,0,1]},plan:{schedule:{segments:[{id:'SK_BURST_02_ORIGINAL',start:10,end:15.433333}]}}};
 const base={position:[0,1,4],target:[0,1,0],fov:35};for(const aspect of [16/9,9/16]){
  ctx.aspect=aspect;for(const t of [10.2,10+FIDELITY_SHOTS[1].from+.01]){const frame=fidelityCameraFrame({base,tClip:t-10,anchors:A,front:[0,0,1],h:2,aspect});assert.equal(elevatedLiberationFrame(frame,t,ctx),frame);}
  const f=elevatedLiberationFrame(base,14.5,ctx);assert(f.position[1]>A.head[1]);assert(f.cut);const c=new T.PerspectiveCamera(f.fov,aspect,.01,100);c.position.fromArray(f.position);c.lookAt(new T.Vector3(...f.target));c.updateMatrixWorld(true);for(const p of [A.head,A.pel,A.rh,A.lh]){const ndc=new T.Vector3(...p).project(c);assert(Math.abs(ndc.x)<.95&&Math.abs(ndc.y)<.95);}
  ctx.reduced=true;assert.equal(elevatedLiberationFrame(base,14.5,ctx),base);ctx.reduced=false;
 }
});

test('F141 late impossible homing is cancelled under a conservative 4h/s derivative bound',()=>{
 const target=createQATargetTrack({position:[0,0,2],radius:.2});target.record(1.19,{position:[2,0,1]});
 const p=planTargetFlight({target,origin:[0,0,0],index:2,start:0,duration:1.2,h:1});assert.equal(p.cancelAt,1.19);
 assert.equal(sampleTargetFlight(p,1.3).phase,'CANCEL_DISSIPATE');assert(!sampleTargetFlight(p,1.3).impact);
});

test('F141 skill reuses the original atlas without taking its disposal ownership',()=>{
 const scene=new T.Scene(),atlas=new T.DataTexture(new Uint8Array(4),1,1);let freed=0;atlas.addEventListener('dispose',()=>freed++);
 const layer=createTargetedSkill(T,{parent:scene,h:1,bundle:{index:new Map()},target:createQATargetTrack({position:[0,0,1]}),wingAtlas:atlas});
 layer.dispose();assert.equal(freed,0);atlas.dispose();assert.equal(freed,1);
});

import {createR62Integration} from '../src/scripts/shorekeeper/r62-integration.mjs';
test('F141 invalid profile/target fails before any body, camera or VFX allocation',()=>{
 const model=new T.Object3D(),stage={scene:new T.Scene()};let called=false;const getVfx=()=>{called=true;throw Error('unexpected allocation');};
 assert.throws(()=>createR62Integration(T,model,[],stage,{getVfx,profile:'ARTISTICO_G113',combatStudy:{id:'F141'}}),/FIDELIDADE/);
 assert.throws(()=>createR62Integration(T,model,[],stage,{getVfx,profile:'FIDELIDADE',combatStudy:{id:'F141',target:{}}}),/QA_TARGET/);
 assert.equal(called,false);assert.equal(bodyOwner(model),null);assert.equal(stage.scene.children.length,0);
});
