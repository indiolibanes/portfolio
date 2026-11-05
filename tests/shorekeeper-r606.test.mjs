import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSourceReviewDirector} from '../src/scripts/shorekeeper/source-review.mjs';
import {createPresentationClock} from '../src/scripts/shorekeeper/presentation-clock.mjs';
import {bodyOwner} from '../src/scripts/shorekeeper/animation-ownership.mjs';
import {makeAuditFixture} from './shorekeeper-r605/fixture.mjs';
import {sampleSourceMotion} from '../src/scripts/shorekeeper/source-motion-audit.mjs';
import {summarizeMotionAudit} from '../src/scripts/shorekeeper/motion-landmarks.mjs';
import {sampleMotionSteps} from '../src/scripts/shorekeeper/motion-matching.mjs';

test('manual source transport samples exact source times without fades or a second clock',()=>{
 for(const fps of [60,30,15,5])for(const speed of [.5,1,1.5]){
  const root=new T.Group(),bone=new T.Bone();bone.name='Root';root.add(bone);
  const clip=new T.AnimationClip('candidate',2,[new T.VectorKeyframeTrack('Root.position',[0,2],[0,0,0,0,2,0])]);
  const before=JSON.stringify(clip.toJSON()),clock=createPresentationClock();clock.setSpeed(speed);clock.tick(0);
  const events=[],d=createSourceReviewDirector(T,root,clip,{onEvent:e=>events.push(e)});d.start();
  assert.equal(bodyOwner(root),'source-review');assert.throws(()=>createSourceReviewDirector(T,root,clip),/owned/);
  let now=0;
  while(d.state.phase!=='idle'){now+=now===0?1000:1000/fps;d.advance(clock.tick(now));assert.ok(Math.abs(bone.position.y-d.state.clock)<1e-6);}
  assert.equal(d.state.clock,2);assert.equal(bone.position.y,2);assert.equal(events.filter(e=>e.type==='end').length,1);
  const n=d.state.updates;d.advance(1);assert.equal(d.state.updates,n);assert.equal(JSON.stringify(clip.toJSON()),before);
  d.dispose();d.dispose();assert.equal(bodyOwner(root),null);assert.equal(bone.position.y,0);
 }
});
test('pause, seek, restart, offscreen reanchor and interrupt do not manufacture recovery frames',()=>{
 const {model,clip}=makeAuditFixture(),d=createSourceReviewDirector(T,model,clip),clock=createPresentationClock();clock.tick(0);d.start();
 d.advance(clock.tick(200));d.setPaused(true);d.advance(1);assert.equal(d.state.clock,.2);
 d.seek(2);assert.equal(d.state.clock,2);assert.equal(d.state.sourceFrame,null);d.seek(.5);assert.equal(d.state.clock,.5);
 d.setPaused(false);clock.reanchor();assert.equal(clock.tick(20000),0);d.advance(clock.tick(20100));assert.equal(d.state.clock,.6);
 d.interrupt();assert.equal(d.state.phase,'idle');assert.equal(d.state.clock,0);d.start();d.advance(.25);assert.equal(d.state.clock,.25);
 d.interrupt();d.seek(.75);assert.equal(d.state.clock,.75);assert.notEqual(model.getObjectByName('Bip001Pelvis').position.y,0);
 assert.throws(()=>d.seek(-1));assert.throws(()=>d.seek(NaN));assert.throws(()=>d.setSpeed(1.5));d.dispose();
});
test('motion preparation yields each pose and matrix decomposition matches world getters',()=>{
 const root=new T.Group(),bone=new T.Bone();bone.name='Root';bone.position.set(1,2,3);root.rotation.y=.4;root.scale.setScalar(2);root.add(bone);root.updateMatrixWorld(true);
 const p=bone.getWorldPosition(new T.Vector3()),q=bone.getWorldQuaternion(new T.Quaternion());
 const clip=new T.AnimationClip('still',1,[new T.VectorKeyframeTrack('Root.position',[0,1],[1,2,3,1,2,3])]);
 const iterator=sampleMotionSteps(root,clip,{fps:30});let samples=0,step;
 do{step=iterator.next();if(step.value?.phase==='sampling')samples++;}while(!step.done);
 assert.equal(samples,31);for(const frame of step.value.frames){assert.ok(frame.positions.every((v,i)=>Math.abs(v-p.toArray()[i])<1e-12));assert.ok(Math.abs(new T.Quaternion().fromArray(frame.quaternions).dot(q)-1)<1e-12);}
});
test('numeric observations keep source, diagnostic and presentation times distinct and never create game markers',()=>{
 const {model,clip,calibration}=makeAuditFixture();const trace=sampleSourceMotion(model,clip,{fps:60,variant:'ORIGINAL',sourceHash:'a'.repeat(64),clipHash:'b'.repeat(64),provenance:'SYNTHETIC_FIXTURE',calibration});
 const s=summarizeMotionAudit(trace);assert.equal(s.orientation.Root.yawDeltaDeg,720);assert.equal(s.observations.find(x=>x.kind==='PELVIS_HEIGHT_MAX').clipTime,1);
 assert.ok(s.observations.every(x=>x.sourceFrame===null&&x.sequenceTime===null&&x.provenance==='MEASURED_GLB_SAMPLE'));
 assert.equal(s.soles.L.canonicalFootContact,null);assert.equal(s.identity,'MANUAL_QA_PENDING');assert.deepEqual(s.semanticMarkers,[]);
});
