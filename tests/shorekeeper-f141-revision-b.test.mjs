import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createQATargetTrack} from '../src/scripts/shorekeeper/qa-target.mjs';
import {createTargetedSkill} from '../src/scripts/shorekeeper/skill-targeted.mjs';
import {createLiberationLayer} from '../src/scripts/shorekeeper/combat-vfx-liberation.mjs';
import {fidelityReleaseScore,butterflyDetonationScore} from '../src/scripts/shorekeeper/fidelity-release.mjs';
import {createS3Score} from '../src/scripts/shorekeeper/combat-vfx-events.mjs';
import {buildR61Plan,R61_SOURCE_IDS} from '../src/scripts/shorekeeper/r61-plan.mjs';
import {elevatedLiberationFrame} from '../src/scripts/shorekeeper/combat-study-camera.mjs';
const history=()=>({n:8,hz:1,duration:7,data:Array.from({length:6},()=>new Float32Array(24))});
test('Revision B: presentation target is invisible from construction; diagnostic visibility never changes flight or target history',()=>{
 const target=createQATargetTrack({position:[0,0,2],radius:.2}),layer=createTargetedSkill(T,{parent:new T.Scene(),h:1,bundle:{index:new Map([['SKILL.butterflies',{start:1,end:3.4}]])},target});
 assert.equal(layer.targetVisible,false);assert.equal(layer.root.getObjectByName('QA_TARGET').visible,false);layer.setHistory(history());
 const events=target.events,revision=target.revision,a=layer.update({t:2}),positions=a.butterflies.map(x=>x.position);
 assert.equal(a.targetVisible,false);assert.equal(layer.root.getObjectByName('QA_TARGET').visible,false);
 layer.setTargetVisible(true);const b=layer.update({t:2});assert(b.targetVisible);assert.deepEqual(b.butterflies.map(x=>x.position),positions);assert.deepEqual(b.butterflies,a.butterflies);assert.equal(b.drawCalls,a.drawCalls+1);
 layer.setTargetVisible(false);const c=layer.update({t:2});assert.equal(c.targetVisible,false);assert.deepEqual(c.butterflies,a.butterflies);assert.equal(target.revision,revision);assert.deepEqual(target.events,events);layer.dispose();
});
test('Revision B: contact is a short local instanced star burst, not a debug wireframe; beams remain tied to real flight samples',()=>{
 const target=createQATargetTrack({position:[0,0,2],radius:.2}),layer=createTargetedSkill(T,{parent:new T.Scene(),h:1,bundle:{index:new Map([['SKILL.butterflies',{start:1,end:3.4}]])},target});layer.setHistory(history());
 const r=layer.update({t:2.35}),impact=layer.root.getObjectByName('qaTargetImpactPulses');assert(r.impactCount>0&&r.impactCount<=30);assert.equal(impact.material.wireframe,false);assert.equal(impact.geometry.attributes.position.count,34);assert.equal(impact.material.depthTest,true);
 const contacted=r.butterflies.find(x=>x.impact);assert(contacted);const m=new T.Matrix4(),p=new T.Vector3();for(let i=0;i<6;i++){impact.getMatrixAt(i,m);p.setFromMatrixPosition(m);assert(p.distanceTo(new T.Vector3(...contacted.position))<.2);}
 const ribbon=layer.root.getObjectByName('qaTargetFlightRibbons');const a=ribbon.geometry.attributes.position.array;const center=[0,1,2].map(i=>(a[i]+a[i+3])/2);assert(new T.Vector3(...center).distanceTo(new T.Vector3(...r.butterflies[0].position))<1e-6);assert.equal(r.ribbonBasis,'SAME_FLIGHT_SAMPLES');
 layer.update({t:4});assert.equal(layer.root.visible,false);layer.dispose();
});
const durations=[3.633333445,5.733333111,3.866666555,4.666666508,5.233333111,5.433333397,25];
function bundle(){const lib=R61_SOURCE_IDS.map((name,i)=>new T.AnimationClip(name,durations[i],[new T.VectorKeyframeTrack('Root.position',[0,durations[i]],[0,0,0,0,0,0])]));return createS3Score(buildR61Plan(lib,{burstEntry:'cut'}).schedule,{fidelity:true});}
function context(b,t){return {t,rm:false,cue:{liberationField:1},bundle:b,front:new T.Vector3(0,0,1),headW:new T.Vector3(0,1.6,0),P:{chest:new T.Vector3(0,1,0),rh:new T.Vector3(.3,1.4,.2),lh:new T.Vector3(-.3,1.3,.2)},stage:{x:0,z:0,floorY:0}};}
test('Revision B: the small butterfly has fixed baseline size; expansion belongs only to one F3 release, not to a competing hand-over bloom',()=>{
 const b=bundle(),base=createLiberationLayer(T,{parent:new T.Scene(),h:2,bundle:b,palette:'fidelity'}),layer=createLiberationLayer(T,{parent:new T.Scene(),h:2,bundle:b,palette:'fidelity',triggerDetonation:true});
 const burst=b.schedule.segments.find(x=>x.id==='SK_BURST_02_ORIGINAL'),onset=burst.start+(burst.end-burst.start)*3.8/5.51;
 for(let t=b.timeline.g11.triggerStart+.02;t<b.timeline.g11.triggerEnd;t+=.02){base.update(context(b,t));layer.update(context(b,t));const u=layer.meshes.trigger.material.uniforms;assert.equal(u.uSize.value,.31*2);assert.equal(layer.meshes.trigger.material.depthTest,true);}
 layer.update(context(b,onset-.08));assert(layer.meshes.core.visible);assert(!layer.meshes.butterfly.visible);
 layer.update(context(b,onset+.01));const probe=layer.uniformsProbe(),tu=layer.meshes.trigger.material.uniforms,ru=layer.meshes.butterfly.material.uniforms;
 assert.deepEqual(ru.uCenter.value.toArray(),tu.uCenter.value.toArray());assert.equal(ru.uPush.value,tu.uPush.value);assert.deepEqual(ru.uFaceFwd.value.toArray(),tu.uFaceFwd.value.toArray());assert.equal(ru.uClear.value,tu.uClear.value);assert.equal(layer.meshes.core.visible,false);assert.equal(layer.probe?.release?.competingBloom??false,false);
 layer.update(context(b,onset+.04));assert.equal(layer.meshes.trigger.visible,false);assert.equal(layer.meshes.core.visible,false);assert(layer.meshes.butterfly.visible);
 assert.equal(layer.meshes.trigger.material.fragmentShader,base.meshes.trigger.material.fragmentShader);assert.equal(layer.meshes.trigger.material.vertexShader,base.meshes.trigger.material.vertexShader);
 base.dispose();layer.dispose();
});
test('Revision B: one release onset at every sampling rate, <=100ms flash, bounded concentration and unchanged F3 base score',()=>{
 const b=bundle(),burst=b.schedule.segments.find(x=>x.id==='SK_BURST_02_ORIGINAL'),onset=burst.start+(burst.end-burst.start)*3.8/5.51;
 for(const hz of [15,24,30,60]){let starts=0,was=false;for(let t=onset-.3;t<onset+1.2;t+=1/hz){const a=butterflyDetonationScore(t,b.schedule),old=fidelityReleaseScore(t,b.schedule);assert.deepEqual(a,butterflyDetonationScore(t,b.schedule));if(a.flash>0&&!was)starts++;was=a.flash>0;if(t>=onset+.1)assert.equal(a.flash,0);if(t>=onset)assert.equal(a.concentration,0);assert.equal(a.onset,old.onset);}assert.equal(starts,1);}
 assert.equal(butterflyDetonationScore(onset-.2,b.schedule).active,false);assert.equal(butterflyDetonationScore(onset+.901,b.schedule).active,false);
});
test('Revision B: elevated framing is confined to Burst shot three; Basic/Heavy/Skill/exposition and reduced motion retain the original frame',()=>{
 const frame={position:[0,2,4],target:[0,1,0],fov:35},ctx={h:2,aspect:16/9,rig:{front:[0,0,1],anchors:{head:[0,1.8,0],pel:[0,1,0],rh:[.4,1.5,0],lh:[-.4,1.5,0]}},plan:{schedule:{segments:[{id:'SK_BURST_02_ORIGINAL',start:22,end:27.433}]}}};
 for(const t of [0,12,16,20,22,25,27.433,40,75])assert.equal(elevatedLiberationFrame(frame,t,ctx),frame);
 for(const aspect of [16/9,9/16]){ctx.aspect=aspect;const f=elevatedLiberationFrame(frame,26.5,ctx);assert.equal(f.phase,'F141_ELEVATED_PROTAGONIST');assert(f.position[1]>ctx.rig.anchors.head[1]);}
 ctx.reduced=true;assert.equal(elevatedLiberationFrame(frame,26.5,ctx),frame);
});
