import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {ShorekeeperVfxDirector,VFX_STATES} from '../src/scripts/shorekeeper/vfx-director.mjs';
const advance=(v,n=100,dt=1/60)=>{for(let i=0;i<n;i++)v.update(dt);};
test('budgets, one owned subtree, positive instance scales and independent systems',()=>{
 for(const mobile of [false,true]){const s=new T.Scene(),v=new ShorekeeperVfxDirector(s,{mobile});assert.equal(s.children.length,1);assert.deepEqual(v.counts,mobile?{butterflies:8,stars:110,energy:12}:{butterflies:18,stars:320,energy:40});
 assert.equal(v.report().estimatedAdditionalDrawCalls,0);v.setState('RESONANCE_PEAK');advance(v);assert.equal(v.report().estimatedAdditionalDrawCalls,5);v.setEnabled('butterflies',false);assert.equal(v.wings.visible,false);assert.equal(v.stars.visible,true);assert.equal(v.energy.visible,true);assert.equal(v.report().estimatedAdditionalDrawCalls,4);
 const m=new T.Matrix4();for(let i=0;i<v.wings.count;i++){v.wings.getMatrixAt(i,m);assert(m.determinant()>0);}v.dispose();assert.equal(s.children.length,0);}
});
test('manual phase holds, smooth retargeting, OFF and recovery',()=>{
 const v=new ShorekeeperVfxDirector(new T.Scene());v.setState('STELLAREALM');v.update(.1);const before=Array.from(v.levels);v.setState('AMBIENT');assert.deepEqual(Array.from(v.levels),before);v.update(1/60);assert(Math.abs(v.levels[0]-before[0])<.01);advance(v);assert.equal(v.state,'AMBIENT');assert.equal(v.levels[1],0);
 v.setState('RESONANCE_PEAK');advance(v,1500);assert.equal(v.state,'RESONANCE_PEAK');v.setState('RECOVERY');advance(v);assert.equal(v.state,'RECOVERY');assert.equal(v.levels[2],0);v.next();assert.equal(v.state,'AMBIENT');v.setState('OFF');advance(v);assert.equal(v.root.visible,false);assert.throws(()=>v.setState('BURST01'));v.dispose();
});
test('pause/context suspension, invalid dt and reduced motion preserve clocks',()=>{
 const v=new ShorekeeperVfxDirector(new T.Scene());v.setState('RESONANCE_PEAK');advance(v);const t=v.time;v.setSuspended(true);const n=v.stats.samples;advance(v);assert.equal(v.time,t);assert.equal(v.stats.samples,n);v.setSuspended(false);v.update(NaN);v.update(-1);assert.equal(v.time,t);
 v.setReducedMotion(true);advance(v);assert.equal(v.time,t);assert.equal(v.energy.visible,false);const a=v.wings.instanceMatrix.array.slice();advance(v);assert.deepEqual(v.wings.instanceMatrix.array,a);v.setReducedMotion(false);v.update(1/60);assert(v.time>t);v.dispose();
});
test('no writes to model bones, morphs, materials, clips or parents',()=>{
 const s=new T.Scene(),model=new T.Group(),bone=new T.Bone();bone.name='Bip001RHand';bone.position.set(.5,1,0);model.add(bone);const mesh=new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshBasicMaterial());mesh.morphTargetInfluences=[.12,.25];model.add(mesh);model.userData.skClips=[{name:'SK_BURST_02_ORIGINAL',tracks:[1,2,3]}];s.add(model);model.updateMatrixWorld(true);
 const snapshot=()=>JSON.stringify({position:bone.position,rotation:bone.quaternion,scale:bone.scale,morphs:mesh.morphTargetInfluences,material:mesh.material.toJSON(),clips:model.userData.skClips});const before=snapshot(),v=new ShorekeeperVfxDirector(s);v.bindModel(model);v.setState('RESONANCE_PEAK');advance(v);assert.equal(snapshot(),before);assert.equal(model.parent,s);v.bindModel(null);assert.equal(v.anchor,null);v.dispose();assert.equal(snapshot(),before);assert.equal(s.children[0],model);
});
test('deterministic 600-second alternation; finite buffers; resources disposed exactly once',()=>{
 const v=new ShorekeeperVfxDirector(new T.Scene(),{mobile:true}),geometries=[],materials=[];v.root.traverse(o=>{if(o.geometry)geometries.push(o.geometry);if(o.material)materials.push(o.material);});let gc=0,mc=0;for(const g of geometries)g.addEventListener('dispose',()=>gc++);for(const m of materials)m.addEventListener('dispose',()=>mc++);
 const b=v.wings.instanceMatrix.array,e=v.energy.geometry.attributes.position.array;
 for(let frame=0;frame<36000;frame++){if(frame%600===0)v.setState(VFX_STATES[(frame/600)%VFX_STATES.length]);v.update(1/60);if(frame%600===0){assert(b.every(Number.isFinite));assert(e.every(Number.isFinite));}}
 assert.equal(v.wings.instanceMatrix.array,b);assert.equal(v.energy.geometry.attributes.position.array,e);assert(Math.abs(v.stats.clockSeconds-600)<1e-6);assert.equal(v.stats.samples,36000);assert(v.report().cpuP95RecentMs!==null);v.dispose();v.dispose();assert.equal(gc,geometries.length);assert.equal(mc,materials.length);v.update(1);assert.equal(v.stats.samples,36000);
});
test('deterministic seed and asynchronous wing phases',()=>{
 const a=new ShorekeeperVfxDirector(new T.Scene()),b=new ShorekeeperVfxDirector(new T.Scene());a.setState('AMBIENT');b.setState('AMBIENT');advance(a);advance(b);assert.deepEqual(a.wings.instanceMatrix.array,b.wings.instanceMatrix.array);assert(new Set(Array.from(a.flight).filter((_,i)=>i%8===6)).size>10);a.dispose();b.dispose();
});
