import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ShorekeeperVfxR2Director} from '../src/scripts/shorekeeper/vfx-r2.mjs';
import {buildR61Plan,R61_SOURCE_IDS} from '../src/scripts/shorekeeper/r61-plan.mjs';
import {createR61Director} from '../src/scripts/shorekeeper/r61-cinematic.mjs';

const fixture=()=>{
 const root=new T.Group(),bone=new T.Bone();bone.name='Root';root.add(bone);
 const library=R61_SOURCE_IDS.map((name,i)=>new T.AnimationClip(name,1+i*.2,[new T.VectorKeyframeTrack('Root.position',[0,1+i*.2],[0,0,0,0,.1,0])]));
 const camera=new T.PerspectiveCamera(34,16/9,.01,100),orbit={enabled:true,enableDamping:true,target:new T.Vector3()};
 const stage={camera,orbit,cameraConfig(){return {position:camera.position.toArray(),target:orbit.target.toArray(),fov:camera.fov};},
  restoreCamera(s){camera.position.fromArray(s.position);orbit.target.fromArray(s.target);camera.fov=s.fov;}};
 return {root,library,stage};
};

test('snapState changes all four VFX levels instantly and preserves independent authored clock',()=>{
 const vfx=new ShorekeeperVfxR2Director(new T.Scene(),{butterflies:2});
 try{
  vfx.setState('STELLAREALM');
  assert.ok(vfx.transition<1,'normal setState still fades');
  vfx.snapState('RESONANCE_PEAK',{time:7.5});
  assert.equal(vfx.state,'RESONANCE_PEAK');assert.equal(vfx.transition,1);
  assert.deepEqual([...vfx.levels],[1,1,1,1]);
  assert.equal(vfx.time,7.5);
  vfx.snapState('OFF',{time:0});
  assert.deepEqual([...vfx.levels],[0,0,0,0]);
  assert.throws(()=>vfx.snapState('INVALID'));
  assert.throws(()=>vfx.snapState('AMBIENT',{time:NaN}));
 }finally{vfx.dispose();}
});
test('R61 seek while paused renders the exact VFX cue instead of old fade target',()=>{
 const {root,library,stage}=fixture();
 const vfx=new ShorekeeperVfxR2Director(new T.Scene(),{butterflies:2});
 const d=createR61Director(T,root,library,stage,{getVfx:()=>vfx,camera:false});
 try{
  d.start();d.setPaused(true);
  const t=d.plan.cues.find(c=>c.beat==='LIBERATION_PEAK_AUTHORIAL').t;
  d.seek(t);
  assert.equal(d.state.vfxCue,'RESONANCE_PEAK');
  assert.equal(vfx.state,'RESONANCE_PEAK');
  assert.equal(vfx.transition,1);
  assert.deepEqual([...vfx.levels],[1,1,1,1]);
  assert.ok(Math.abs(vfx.time-t)<1e-9);
  const off=d.plan.cues[0].t;d.seek(off);
  assert.equal(vfx.state,'AMBIENT');
  assert.equal(vfx.transition,1);
 }finally{d.dispose();vfx.dispose();}
});
