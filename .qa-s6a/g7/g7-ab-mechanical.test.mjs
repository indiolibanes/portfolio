/** Synthetic validation of the G7 A/B harness (no private data). Proves it detects a known discontinuity. */
import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {auditG7} from './g7-ab-mechanical.mjs';
function rig(){const model=new T.Group(),names=['Root','Bip001','Bip001Pelvis','Bip001Spine2','Bip001LFoot','Bip001RFoot'],b=Object.fromEntries(names.map(n=>{const x=new T.Bone();x.name=n;return [n,x];}));
 b.Root.add(b.Bip001);b.Bip001.add(b.Bip001Pelvis);b.Bip001Pelvis.add(b.Bip001Spine2,b.Bip001LFoot,b.Bip001RFoot);b.Bip001.position.y=.9;b.Bip001LFoot.position.set(-.1,-.9,0);b.Bip001RFoot.position.set(.1,-.9,0);model.add(b.Root);model.updateMatrixWorld(true);return {model,b};}
const q=(axis,d)=>new T.Quaternion().setFromAxisAngle(new T.Vector3(...axis),d*Math.PI/180).toArray();
function clip(name,{spine=[0,0],rootX=[0,0],yaw=[0,0]}={},duration=1){return new T.AnimationClip(name,duration,[
 new T.QuaternionKeyframeTrack('Bip001Spine2.quaternion',[0,duration],[...q([1,0,0],spine[0]),...q([1,0,0],spine[1])]),
 new T.VectorKeyframeTrack('Root.position',[0,duration],[rootX[0],0,0,rootX[1],0,0]),
 new T.QuaternionKeyframeTrack('Root.quaternion',[0,duration],[...q([0,1,0],yaw[0]),...q([0,1,0],yaw[1])])]);}
function library(burstYaw=0){return [...[1,2,3,4].map(i=>clip('SK_ATTACK_0'+i+'_ORIGINAL',{spine:[0,0]})),clip('SK_SKILL_01_ORIGINAL',{spine:[0,0]}),
 clip('SK_BURST_02_ORIGINAL',{spine:[40,0],rootX:[.3,.3],yaw:[burstYaw,burstYaw]},2),clip('SK_BURST_02_ROOT_BODY_OWNED',{spine:[40,0],rootX:[.3,.3]},2),clip('SK_IDLE_01_ORIGINAL',{spine:[0,0]},3)];}
test('detects the injected Skill→Burst gap, keeps rest pose and reports both Hz',()=>{const {model,b}=rig(),before=b.Bip001Spine2.quaternion.clone(),lib=library(90),r=auditG7(T,model,lib,{variants:['ORIGINAL','ROOT_BODY_OWNED','REBASED']});
 const o=r.variants.ORIGINAL;assert.equal(o.status,'ALL_SOURCE_CLIPS_PRESENT');assert.equal(r.variants.REBASED.status,'VARIANT_CLIP_ABSENT');
 const tb=o.transitions.find(t=>t.to==='SK_BURST_02_ORIGINAL');const spine=tb.sourceGap.topBones.find(x=>x.bone==='Bip001Spine2')?.deg;assert.ok(spine>39.9&&spine<40.1,'spine gap ≈40°, got '+JSON.stringify(tb.sourceGap.topBones));assert.equal(tb.sourceGap.maxLocalBone,'Root');assert.ok(Math.abs(tb.sourceGap.maxLocalDeg-90)<.01,'Root local yaw 90° dominates');assert.ok(Math.abs(tb.sourceGap.world.Root.displacementM-.3)<1e-3);assert.ok(Math.abs(Math.abs(tb.sourceGap.world.Root.yawDeltaDeg)-90)<.01);
 const calm=o.transitions.find(t=>t.to==='SK_ATTACK_02_ORIGINAL');assert.equal(calm.sourceGap.maxLocalDeg,0);
 for(const fps of [30,60]){const j=o.transitions.indexOf(tb);assert.ok(o.blended[fps].perTransition[j].maxLocalStepDeg>0);assert.ok(o.blended[fps].global.maxLocalStepDeg>=o.blended[fps].perTransition[j].maxLocalStepDeg);}
 assert.ok(o.blended[60].perTransition[o.transitions.indexOf(tb)].maxLocalStepDeg<o.blended[30].perTransition[o.transitions.indexOf(tb)].maxLocalStepDeg,'60 Hz steps are smaller');
 const bo=r.variants.ROOT_BODY_OWNED.transitions.find(t=>/BURST/.test(t.to));assert.ok(Math.abs(bo.sourceGap.world.Root.yawDeltaDeg??0)<.01,'body-owned variant removes Root yaw');
 assert.ok(b.Bip001Spine2.quaternion.angleTo(before)<1e-9,'rest pose restored');assert.equal(r.verdict,'NUMERIC_ONLY_NO_VISUAL_OR_CANONICAL_PARITY_CLAIM');});
