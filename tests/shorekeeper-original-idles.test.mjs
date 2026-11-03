import assert from 'node:assert/strict';
import * as T from 'three';
import {createOriginalIdleDirector,findOriginalClip,ORIGINAL_IDLE_IDS} from '../src/scripts/shorekeeper/original-idle-director.mjs';
const root=new T.Group(),bone=new T.Bone();bone.name='bone';root.add(bone);bone.position.set(.1,.2,.3);const p=bone.position.clone(),q=bone.quaternion.clone(),s=bone.scale.clone();
const clip=new T.AnimationClip(ORIGINAL_IDLE_IDS[0],1,[new T.VectorKeyframeTrack('bone.position',[0,.5,1],[0,0,0,0,1,0,0,0,0]),new T.QuaternionKeyframeTrack('bone.quaternion',[0,1],[0,0,0,1,0,.2,0,Math.sqrt(.96)]),new T.VectorKeyframeTrack('bone.scale',[0,1],[1,1,1,1.1,1,1])]);
assert.equal(findOriginalClip([],ORIGINAL_IDLE_IDS[0]),null);assert.equal(findOriginalClip([clip],clip.name),clip);assert.throws(()=>findOriginalClip([clip],clip.name,'unknown'));
let calls=0,events=[];const d=createOriginalIdleDirector(T,root,clip,{enter:.1,exit:.1,onEvent:e=>events.push(e.type),mixerFactory:r=>{const m=new T.AnimationMixer(r),step=m.update.bind(m);m.update=dt=>{calls++;return step(dt)};return m;}});
const advance=dt=>{const before=calls;const active=d.state.phase!=='idle'&&!d.state.paused&&dt>0;d.advance(dt);assert.equal(calls-before,active?1:0);};
for(let repeat=0;repeat<3;repeat++){
 d.start();advance(repeat===0?.1:.2);assert.equal(d.state.phase,'run');advance(.25);assert.equal(d.state.clock,.25);const current=bone.position.clone();d.setPaused(true);advance(4);assert.deepEqual(bone.position.toArray(),current.toArray());d.setPaused(false);d.configure({enter:.2});assert.equal(d.state.parameters.enter,repeat===0?.1:.2);assert.equal(d.state.pending.enter,.2);
 if(repeat===0)d.interrupt();else for(let i=0;i<8;i++)advance(.1);
 for(let i=0;i<8;i++)advance(.1);assert.equal(d.state.phase,'idle');assert.deepEqual(bone.position.toArray(),p.toArray());assert.deepEqual(bone.quaternion.toArray(),q.toArray());assert.deepEqual(bone.scale.toArray(),s.toArray());
}
d.start();d.start();for(let i=0;i<40;i++)advance(.1);assert.equal(d.state.phase,'idle');assert(events.includes('start')&&events.includes('execution')&&events.includes('recovery')&&events.includes('end'));d.dispose();assert.throws(()=>createOriginalIdleDirector(T,root,new T.AnimationClip('duplicate',1,[clip.tracks[0],clip.tracks[0]])),/Duplicate/);
console.log('Original idles PASS: single-owner TRS, exact rest, original clock, queued timing, pause, interruption, repeat, single mixer update and missing clips.');
