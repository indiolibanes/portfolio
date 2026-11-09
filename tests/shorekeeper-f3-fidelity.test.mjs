import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
import {fidelityReleaseScore} from '../src/scripts/shorekeeper/fidelity-release.mjs';
import {fidelityRestFrame} from '../src/scripts/shorekeeper/fidelity-rest-frame.mjs';
import {CANONICAL_ABILITIES,canonicalCatalogue,createCanonicalSourceInspection,createStellarealmContract} from '../src/scripts/shorekeeper/canonical-abilities.mjs';
import {createLiberationLayer} from '../src/scripts/shorekeeper/combat-vfx-liberation.mjs';
import {createS3Score} from '../src/scripts/shorekeeper/combat-vfx-events.mjs';
import {buildR61Plan,R61_SOURCE_IDS} from '../src/scripts/shorekeeper/r61-plan.mjs';
import {make} from './shorekeeper-r65-fixture.mjs';
import {createCanonicalProvenance,canonicalClipSignature} from '../src/scripts/shorekeeper/canonical-source-provenance.mjs';
import {createSourceRigLines} from '../scripts/shorekeeper/qa-f3-rig-lines.mjs';
import {bodyOwner} from '../src/scripts/shorekeeper/animation-ownership.mjs';
const durations=[3.633,5.733,3.867,4.667,5.233,5.433,2.5];
const library=()=>R61_SOURCE_IDS.map((id,i)=>new T.AnimationClip(id,durations[i],[new T.VectorKeyframeTrack('Root.position',[0,durations[i]],[0,0,0,0,0,0])]));
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
test('F3 fast radial release is deterministic, bounded, independent of frame rate; brief flash and no Discernment/wing ending',()=>{
 const schedule=buildR61Plan(library(),{burstEntry:'cut'}).schedule,seg=schedule.segments.find(x=>x.id==='SK_BURST_02_ORIGINAL');
 const start=seg.start+(seg.end-seg.start)*3.8/5.51;
 assert(!fidelityReleaseScore(start-.001,schedule).active);assert.throws(()=>fidelityReleaseScore(NaN,schedule),/finite/);
 for(const hz of [60,30,15]){let prev=0,flashes=0,waveSeen=0;for(let i=0;i<hz;i++){const t=start+i/hz,r=fidelityReleaseScore(t,schedule);assert.deepEqual(r,fidelityReleaseScore(t,schedule));if(r.active){assert(r.radius>=prev);prev=r.radius;if(r.flash>0)flashes++;if(r.wave>.5)waveSeen++;}if(r.age>=.1)assert.equal(r.flash,0);assert.equal(r.evidence.discernment,'SEPARATE_ACTION_NOT_AUTOMATICALLY_TRIGGERED');}assert(waveSeen>=2);assert(flashes<=Math.ceil(hz*.1));}
 assert.equal(fidelityReleaseScore(seg.end+.1,schedule).active,false,'no late giant wing explosion after the clip');
 const reduced=fidelityReleaseScore(start+.1,schedule,true);assert.equal(reduced.flash,0);assert.equal(reduced.fragments,0);assert(reduced.wave<.23);
});
test('F3 artistic uniforms/shaders and F2 small butterfly are identical to base golden over the complete synthetic timeline',()=>{
 const golden=JSON.parse(readFileSync('docs/qa/shorekeeper-f3/baseline-synthetic.json','utf8'));
 for(const palette of ['authorial','fidelity']){const parent=new T.Group(),plan=buildR61Plan(library(),{burstEntry:palette==='fidelity'?'cut':'blend'}),bundle=createS3Score(plan.schedule,{fidelity:palette==='fidelity'}),L=createLiberationLayer(T,{parent,h:1.6,bundle,palette}),actual=[],anim=[];
  try{for(let t=0;t<plan.schedule.duration;t+=.125){L.update({t,rm:false,cue:{liberationField:1},bundle,headW:new T.Vector3(0,1.6,0),P:{chest:new T.Vector3(0,1,0),rh:new T.Vector3(.3,1.1,.2),lh:new T.Vector3(-.3,1.2,.2)},stage:{x:0,z:0,floorY:0}});actual.push(hash(palette==='authorial'?L.uniformsProbe():L.uniformsProbe().trigger));if(palette==='fidelity'){const o=JSON.parse(JSON.stringify(L.uniformsProbe().trigger));for(const k of ['uFaceFwd','uClear','uFaceR'])delete o[k];anim.push(hash(o));}}
   // F1.4 P0: besides the face mask / clearance uniforms, the trigger butterfly (silhouette, transparency, venation, animation) is IDENTICAL to the F1.3 base.
   if(palette==='fidelity')assert.deepEqual(anim,golden.triggerAnimationUnchangedF2);
   assert.deepEqual(actual,golden[palette==='authorial'?'artistic':'trigger']);
   assert.equal(hash(palette==='authorial'?parent.children.map(o=>[o.name,o.material.vertexShader,o.material.fragmentShader]):[L.meshes.trigger.material.vertexShader,L.meshes.trigger.material.fragmentShader]),golden[palette+'Shaders']);
   assert.equal(parent.children.length,6,'no added mesh/draw slot');
  }finally{L.dispose();L.dispose();assert.equal(parent.children.length,0);assert.equal(L.update({}),null);}
 }
});
test('F3 rest camera follows anatomical front and never writes body transforms',()=>{
 const f=make();try{for(const n of ['Bip001RToe0','Bip001LToe0'])assert(f.model.getObjectByName(n));
 const before=[];f.model.traverse(o=>before.push([o,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray()]));
 for(const aspect of [16/9,9/16])for(const view of ['front','quarter','side']){const p=fidelityRestFrame(T,f.model,{h:1.6,aspect,view});assert(p.position.every(Number.isFinite));assert.equal(p.evidence.bodyWrites,0);assert.equal(p.evidence.sourceIdleComparison,'PENDING');}
 for(const [o,p,q,s]of before){assert.deepEqual(o.position.toArray(),p);assert.deepEqual(o.quaternion.toArray(),q);assert.deepEqual(o.scale.toArray(),s);}
 f.model.rotation.y=.7;const p=fidelityRestFrame(T,f.model,{h:1.6,aspect:16/9,view:'front'}),front=new T.Vector3(0,0,1).applyQuaternion(f.model.quaternion),d=new T.Vector3(...p.position).sub(new T.Vector3(...p.target));d.y=0;assert(d.normalize().dot(front)>.99);
 }finally{f.dispose();}
});
test('F3 catalogue keeps four Basics and distinguishes unbound, Illation, End Loop and Discernment; no name-only promotion',()=>{
 const rows=canonicalCatalogue(library());for(const row of rows){assert.equal(row.playable,false);assert.equal(row.motion,'CANONICAL_PENDING');assert(row.entry&&row.recovery&&row.disposal&&row.reference);}
 assert.equal(rows.filter(r=>/^basic-/.test(r.id)).length,4);assert.deepEqual(rows.find(r=>r.id==='basic-4').candidates,['SK_ATTACK_04_ORIGINAL']);assert(!rows.find(r=>r.id==='basic-4').candidates.includes('SK_ATTACK_L02_ORIGINAL'));
 assert.equal(rows.find(r=>r.id==='heavy-unbound').sources.length,0);assert.equal(rows.find(r=>r.id==='heavy-illation').sources.length,0);assert.notEqual(rows.find(r=>r.id==='intro-discernment'),rows.find(r=>r.id==='liberation-end-loop'));
});
test('F3 isolated source QA requires explicit choice, obeys one owner, pause/seek/interruption and ten disposals without source edits',async()=>{
 const f=make(),source=f.library.find(c=>c.name==='SK_ATTACK_01_ORIGINAL'),before=source.toJSON();try{
 const snapshot=source.clone(),provenance=createCanonicalProvenance({readOriginal:async()=>new Map([[snapshot.name,await canonicalClipSignature(snapshot)]])});provenance.record({sha256:'2efd607ea7d47f9d43c67eb1e0da7bb08445acb63eed60b66296966bb6fd318e',gltf:{animations:[source]}},{file:{arrayBuffer(){}}});
 await assert.rejects(()=>createCanonicalSourceInspection(T,f.model,f.library,{actionId:'basic-1',sourceId:source.name}),/opt-in/);
 await assert.rejects(()=>createCanonicalSourceInspection(T,f.model,f.library,{actionId:'heavy-unbound',sourceId:source.name,explicitSourceQA:true,provenance}),/no verified source/);
 for(let i=0;i<10;i++){const d=await createCanonicalSourceInspection(T,f.model,f.library,{actionId:'basic-1',sourceId:source.name,explicitSourceQA:true,provenance});assert.equal(d.canonicalStatus,'CANONICAL_PENDING');d.start();d.advance(.5);d.setPaused(true);const t=d.state.clock;d.advance(1);assert.equal(d.state.clock,t);await assert.rejects(()=>createCanonicalSourceInspection(T,f.model,f.library,{actionId:'basic-1',sourceId:source.name,explicitSourceQA:true,provenance}),/owner|already/i);d.setPaused(false);d.seek(1);d.interrupt();d.dispose();d.dispose();assert.equal(bodyOwner(f.model),null);}
 assert.deepEqual(source.toJSON(),before);
 }finally{f.dispose();}
});
test('F3 Stellarealm stages require validated Intro events, not elapsed time or color; Discernment ends only Supernal',()=>{
 const s=createStellarealmContract();assert.equal(s.state,'NONE');assert(s.event({type:'END_LOOP',validated:true,id:'a',sequence:0}));assert.equal(s.state,'OUTER');assert(!s.event({type:'INTRO',id:'b',sequence:1,actor:'hsin',inside:true}));assert(!s.event({type:'DISCERNMENT',id:'c',sequence:2,actor:'shorekeeper',validated:true}));
 assert(s.event({type:'INTRO',id:'b',sequence:1,actor:'hsin',inside:true,validated:true}));assert.equal(s.state,'INNER');assert(!s.event({type:'INTRO',id:'b',sequence:1,actor:'hsin',inside:true,validated:true}));assert(!s.event({type:'TICK',id:'t',sequence:99,seconds:1000}));assert.equal(s.state,'INNER');
 assert(s.event({type:'INTRO',id:'d',sequence:3,actor:'sophia',inside:true,validated:true}));assert.equal(s.state,'SUPERNAL');assert(s.event({type:'DISCERNMENT',id:'e',sequence:4,actor:'shorekeeper',validated:true}));assert.equal(s.state,'NONE');assert(!s.event({type:'END_LOOP',validated:true,id:'a',sequence:0}),'old event cannot reopen a closed cycle');s.dispose();assert(!s.event({type:'END_LOOP',id:'z'}));
});

test('F3 provenance rejects same-name unverified replacements, altered curves and late async admission',async()=>{
 const f=make(),source=f.library[0],sha='2efd607ea7d47f9d43c67eb1e0da7bb08445acb63eed60b66296966bb6fd318e';
 const snapshot=source.clone();let parses=0;const provenance=createCanonicalProvenance({readOriginal:async()=>{parses++;return new Map([[snapshot.name,await canonicalClipSignature(snapshot)]]);}}),file={arrayBuffer(){}};
 try{assert.equal(provenance.record({sha256:'0'.repeat(64),gltf:{animations:[source]}},{file}),0);assert(!await provenance.verified(source));
 provenance.record({sha256:sha,gltf:{animations:[source]}},{file});assert.equal(parses,0,'ART receipt records no JSON/digest/reparse');source.tracks[0].values[0]+=1;assert(!await provenance.verified(source),'mutation before first FID check detected against immutable source');source.tracks[0].values[0]-=1;assert(await provenance.verified(source));assert.equal(parses,1);assert(!await provenance.verified(source.clone()));
 await assert.rejects(createCanonicalSourceInspection(T,f.model,f.library,{actionId:'basic-1',sourceId:source.name,explicitSourceQA:true,admit:()=>false,provenance}),{name:'AbortError'});assert.equal(bodyOwner(f.model),null);
 const replacement=source.clone();await assert.rejects(createCanonicalSourceInspection(T,f.model,[replacement],{actionId:'basic-1',sourceId:source.name,explicitSourceQA:true,provenance}),/UNVERIFIED/);
 }finally{f.dispose();}
});
test('local rig diagnostic observes Object3D parent-child segments without creating bones or changing their pose',()=>{const root=new T.Group();root.name='Root';const node=new T.Object3D();node.name='joint';node.position.set(0,1,0);root.add(node);const q=createSourceRigLines(T,root);try{assert.equal(q.segments,1);q.update();assert.equal(q.lines.geometry.attributes.position.count,2);assert.equal(q.lines.geometry.attributes.position.getY(1),1);root.position.x=2;q.update();assert.equal(q.lines.geometry.attributes.position.getX(0),2);assert.equal(node.position.x,0);assert(!node.isBone);}finally{q.dispose();q.dispose();}});
