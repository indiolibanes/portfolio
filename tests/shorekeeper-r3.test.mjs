import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {bodyOwner} from '../src/scripts/shorekeeper/animation-ownership.mjs';
import {createOriginalIdleDirector} from '../src/scripts/shorekeeper/original-idle-director.mjs';
import {createComboSequencer,buildComboSchedule,motionDistance} from '../src/scripts/shorekeeper/combo-sequencer.mjs';
const clip=(name,a,b)=>new T.AnimationClip(name,1,[new T.VectorKeyframeTrack('Root.position',[0,1],[a,0,0,b,0,0])]);
test('body ownership rejects concurrent mixers and releases for the next controller',()=>{
 const root=new T.Group(),bone=new T.Bone();bone.name='Root';root.add(bone);
 const a=clip('A',0,1),clips={A:a},schedule=buildComboSchedule([{id:'A',duration:1}]);
 const idle=createOriginalIdleDirector(T,root,a);assert.ok(bodyOwner(root));
 assert.throws(()=>createComboSequencer(T,root,clips,schedule),/already owned/);
 idle.dispose();idle.dispose();assert.equal(bodyOwner(root),null);
 const combo=createComboSequencer(T,root,clips,schedule);combo.seek(.75);assert.ok(Math.abs(bone.position.x-.75)<1e-6);
 combo.setPaused(true);combo.advance(.1);assert.equal(combo.time,.75);
 combo.seek(.25);assert.ok(Math.abs(bone.position.x-.25)<1e-6);combo.seek(1);assert.equal(bone.position.x,1,'endpoint never wraps');
 combo.dispose();assert.equal(bodyOwner(root),null);assert.equal(bone.position.x,0,'rest restored on handoff');
});
test('repeated source clips have independent actions and deterministic back-seek',()=>{
 const root=new T.Group(),bone=new T.Bone();bone.name='Root';root.add(bone);
 const a=clip('A',0,1),schedule=buildComboSchedule([{id:'A',duration:1},{id:'A',duration:1,fade:.2}]);
 const combo=createComboSequencer(T,root,{A:a},schedule);
 combo.seek(.9);const first=bone.position.x;combo.seek(1.4);combo.seek(.9);assert.ok(Math.abs(bone.position.x-first)<1e-7);
 assert.ok(first>.4&&first<.6,'crossfade owns two distinct times from the same clip');combo.dispose();
});
test('motion distance penalizes feet changing contact and velocities even at equal orientation',()=>{
 const a={quaternions:[0,0,0,1],positions:[0,0,0],velocities:[0,0,0],contacts:[true,true]};
 assert.equal(motionDistance(a,a),0);assert.ok(motionDistance(a,{...a,contacts:[false,true]})>=30);
 assert.ok(motionDistance(a,{...a,velocities:[1,0,0]})>0);
});


test('combo playback speed is applied after the safety delta clamp',()=>{
 const root=new T.Group(),b=new T.Bone();b.name='Root';root.add(b);
 const seq=createComboSequencer(T,root,{A:clip('A',0,1)},buildComboSchedule([{id:'A',duration:1}]));seq.setSpeed(2);seq.advance(.1);assert.equal(seq.time,.2);seq.dispose();
});

test('interrupt recovery blends toward final idle, never jumps to bind pose',()=>{
 const root=new T.Group(),b=new T.Bone();b.name='Root';root.add(b);
 const seq=createComboSequencer(T,root,{A:clip('A',0,1),I:clip('I',.2,.2)},buildComboSchedule([{id:'A',duration:1},{id:'I',duration:1,fade:.2}]));
 seq.seek(.6);seq.recover();seq.advance(.05);assert.ok(b.position.x>.2&&b.position.x<.6);
 for(let i=0;i<9;i++)seq.advance(.05);assert.ok(Math.abs(b.position.x-.2)<1e-6);assert.equal(seq.done,true);seq.dispose();
});
