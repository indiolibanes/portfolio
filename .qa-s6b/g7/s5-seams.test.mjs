import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {auditS6bG7,S6B_STATUS} from './s5-seams.mjs';
import {buildR61Plan,R61_SOURCE_IDS} from '../../src/scripts/shorekeeper/r61-plan.mjs';

const q=(degrees)=>new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),degrees*Math.PI/180).toArray();
function fixture(){
 const model=new T.Group(),names=['Root','Bip001','Bip001Pelvis','Bip001LFoot','Bip001RFoot','Bip001Spine2'];
 const bones=Object.fromEntries(names.map(n=>{const b=new T.Bone();b.name=n;return [n,b];}));
 bones.Root.add(bones.Bip001);bones.Bip001.add(bones.Bip001Pelvis);
 bones.Bip001Pelvis.add(bones.Bip001LFoot,bones.Bip001RFoot,bones.Bip001Spine2);
 bones.Bip001.position.y=1;bones.Bip001LFoot.position.set(-.1,-1,0);bones.Bip001RFoot.position.set(.1,-1,0);
 model.add(bones.Root);model.updateMatrixWorld(true);
 const c=(name,duration,spin=0,dx=0)=>new T.AnimationClip(name,duration,[
  new T.QuaternionKeyframeTrack('Root.quaternion',[0,duration],[...q(spin),...q(spin)]),
  new T.VectorKeyframeTrack('Root.position',[0,duration],[dx,0,0,dx,0,0]),
  new T.QuaternionKeyframeTrack('Bip001Spine2.quaternion',[0,duration],[...q(spin/2),...q(spin/2)])]);
 const library=R61_SOURCE_IDS.map((id,i)=>c(id,i===5?2.5:1.8,i===5?90:0,i===5?.35:0));
 library.push(c('SK_BURST_02_ROOT_BODY_OWNED',2.5,0,.35));
 return {model,library,bones};
}
test('S6-B audits exactly six S5 joins, including L02, without modifying the source',()=>{
 const f=fixture(),plan=buildR61Plan(f.library),snapshot=JSON.stringify(f.library.map(c=>c.toJSON()));
 const r=auditS6bG7(T,f.model,f.library);
 assert.equal(r.transitions.length,6);
 assert.deepEqual(r.transitions.map(x=>x.to),R61_SOURCE_IDS.slice(1));
 assert.equal(r.transitions[3].from,'SK_ATTACK_L02_ORIGINAL');
 assert.deepEqual(r.transitions.map(x=>x.start),plan.schedule.segments.slice(1).map(x=>x.start));
 assert.equal(r.status,S6B_STATUS);assert.equal(r.canonical,'NO_GO');assert.equal(r.visual,'PENDING_AUTHENTICATED_30_60HZ_AB');
 assert.equal(r.variants.REBASED.status,'DIAGNOSTIC_VARIANT_ABSENT');
 assert.equal(r.variants.ORIGINAL.joins.length,6);
 assert.equal(JSON.stringify(f.library.map(c=>c.toJSON())),snapshot);
});
test('S6-B captures nonzero Skill-to-Burst Root displacement/yaw and 30/60 Hz steps, A/B remains diagnostic',()=>{
 const f=fixture(),r=auditS6bG7(T,f.model,f.library),a=r.variants.ORIGINAL,b=r.variants.ROOT_BODY_OWNED;
 const j=a.joins[4];assert.equal(j.to,'SK_BURST_02_ORIGINAL');
 assert.ok(j.sourceGapAtBlendStart.world.Root.step>.34);
 assert.ok(Math.abs(j.sourceGapAtBlendStart.world.Root.yawDeltaDeg)>89);
 assert.ok(b.joins[4].sourceGapAtBlendStart.world.Root.rotationDeg<1e-4);
 for(const hz of ['30','60']){assert.equal(a.cadences[hz].length,6);assert.ok(a.cadences[hz][4].maxLocalStepDeg>0);}
 assert.equal(r.variants.ORIGINAL.joins[4].soleContact,'NOT_MEASURED_WITH_SKINNED_VERTICES');
});
test('S6-B refuses missing canonical L02, duplicate rig bones, unsupported cadence',()=>{
 const f=fixture();assert.throws(()=>auditS6bG7(T,f.model,f.library.filter(c=>c.name!=='SK_ATTACK_L02_ORIGINAL')),/incomplete sources/);
 assert.throws(()=>auditS6bG7(T,f.model,f.library,{fpsList:[24]}),/Unsupported/);
 const duplicate=new T.Bone();duplicate.name='Bip001Pelvis';f.model.add(duplicate);
 assert.throws(()=>auditS6bG7(T,f.model,f.library),/Duplicate bone/);
});
