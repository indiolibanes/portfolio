import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ShorekeeperVfxR3Director} from '../src/scripts/shorekeeper/vfx-r3.mjs';

test('R3 lifecycle owns scenery, preserves character, bounds budgets and restores AMBIENT after recovery',()=>{
 for(const mobile of [false,true]){
  const scene=new T.Scene(),model=new T.Group(),head=new T.Bone();head.name='Bip001Head';head.position.y=1;model.add(head);scene.add(model);
  const v=new ShorekeeperVfxR3Director(scene,{mobile});v.bindModel(model);const before=head.matrix.toArray();
  assert.ok(v.environment.root.visible,'scenery survives OFF');v.setState('RESONANCE_PEAK');for(let i=0;i<90;i++)v.update(1/30,1);
  const r=v.report();assert.ok(r.counts.butterflies<=(mobile?8:18));assert.ok(r.counts.coreParticles<=(mobile?12:40));assert.ok(r.counts.canopyStars+r.counts.fieldMotes<=(mobile?110:320));
  v.setState('RECOVERY');v.next();assert.equal(v.state,'AMBIENT');
  v.setReducedMotion(true);const t=v.time;v.update(.1);assert.equal(v.time,t);assert.equal(v.coreCrystal.visible,false);
  v.setSuspended(true);const phase=v.transition;v.update(.1);assert.equal(v.transition,phase);
  assert.deepEqual(head.matrix.toArray(),before);v.dispose();v.dispose();assert.deepEqual(scene.children,[model]);
 }
});
test('narrative camera is optional and restores manual camera and controls at completion',async()=>{
 const {createVfxNarrative}=await import('../src/scripts/shorekeeper/vfx-narrative.mjs');
 const saved={position:[0,1,4],target:[0,1,0],preset:'custom'},states=[];
 const stage={camera:new T.PerspectiveCamera(),orbit:{enabled:true,target:new T.Vector3()},cameraConfig:()=>structuredClone(saved),restoreCamera(c){this.restored=c;}};
 const v={center:new T.Vector3(),scale:2,setState:s=>states.push(s)},story=createVfxNarrative(v,stage);
 story.start({camera:true});assert.equal(stage.orbit.enabled,false);for(let i=0;i<181;i++)story.advance(.1);
 assert.equal(story.state.running,false);assert.equal(stage.orbit.enabled,true);assert.deepEqual(stage.restored,saved);assert.equal(states.at(-1),'AMBIENT');
});
