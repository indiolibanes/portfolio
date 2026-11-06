import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {deriveStabilizedBurst,BODY_STABILITY_CLIP,BODY_STABILITY_WINDOW,stabilityWeight} from '../public/experimentos/sk-g9/runtime/body-stability.mjs';
import {buildR61Plan,R61_SOURCE_IDS} from '../public/experimentos/sk-g9/runtime/r61-plan.mjs';
import {createS3Score,g11Timeline,resolveClipId} from '../public/experimentos/sk-g9/runtime/combat-vfx-events.mjs';
import {createLiberationLayer,liberationColorScore,G11_TINTS} from '../public/experimentos/sk-g9/runtime/combat-vfx-liberation.mjs';
import {createTrailLayer,buildTrailHistory,trailPosition,TRAIL_POINTS} from '../public/experimentos/sk-g9/runtime/combat-vfx-trails.mjs';
const DUR={SK_ATTACK_01_ORIGINAL:3.633,SK_ATTACK_02_ORIGINAL:5.733,SK_ATTACK_03_ORIGINAL:3.867,SK_ATTACK_L02_ORIGINAL:4.667,SK_SKILL_01_ORIGINAL:5.233,SK_BURST_02_ORIGINAL:5.433,SK_IDLE_01_ORIGINAL:2.5};
const lib=(burstTracks)=>R61_SOURCE_IDS.map(id=>{const d=DUR[id];return new T.AnimationClip(id,d,id===BODY_STABILITY_CLIP&&burstTracks?burstTracks(d):[new T.VectorKeyframeTrack('Bip001.position',[0,d],[0,0,0,0,0,0])]);});
// synthetic Burst: Root yaws +-5 deg at 2.9 Hz (the measured source sway) on top of a constant yaw, hips offset 0.8 from the pivot
const rq=(t)=>new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),0.3+rad(5)*Math.sin(2*Math.PI*2.9*t));
const rad=d=>d*Math.PI/180;
function burstTracks(d){const ts=[],q=[],p=[],bq=[];for(let t=0;t<=d+1e-9;t+=1/30){ts.push(t);q.push(...rq(t).toArray());p.push(0.8,1.6,0);bq.push(0,0,0,1);}
 return [new T.QuaternionKeyframeTrack('Root.quaternion',ts,q),new T.VectorKeyframeTrack('Bip001.position',ts,p),new T.QuaternionKeyframeTrack('Bip001.quaternion',ts,bq)];}
function world(clip,t){const root=new T.Bone();root.name='Root';const hip=new T.Bone();hip.name='Bip001';root.add(hip);const m=new T.AnimationMixer(root);m.clipAction(clip).play();m.setTime(t);root.updateMatrixWorld(true);return hip.getWorldPosition(new T.Vector3());}
test('G11 body stability: damps the Root sway through the hips tracks, leaves outside the window and the source untouched',()=>{
 const original=new T.AnimationClip(BODY_STABILITY_CLIP,5.433,burstTracks(5.433));const snapshot=original.tracks.map(t=>Array.from(t.values));
 const r=deriveStabilizedBurst(original,'standard');assert.equal(r.blocked,null);assert.notEqual(r.clip,original);assert.deepEqual(r.changedTracks,['Bip001.position','Bip001.quaternion']);
 assert.deepEqual(original.tracks.map(t=>Array.from(t.values)),snapshot,'source clip must not be modified');
 assert.deepEqual(Array.from(r.clip.tracks.find(t=>t.name==='Root.quaternion').values),snapshot[0],'Root curve untouched');
 const lat=(c,a,b)=>{let mn=1e9,mx=-1e9;for(let t=a;t<=b;t+=1/120){const x=world(c,t).z;mn=Math.min(mn,x);mx=Math.max(mx,x);}return mx-mn;};
 const before=lat(original,0.6,1.7),after=lat(r.clip,0.6,1.7);assert.ok(after<before*0.45,`sway ${before} -> ${after}`);assert.ok(after>before*0.1,'expressiveness is kept (not frozen)');
 for(const t of [0.05,0.15,2.2,3,5]){assert.ok(world(original,t).distanceTo(world(r.clip,t))<1e-3,'identical outside the window at '+t);}
 assert.equal(deriveStabilizedBurst(original,'off').clip,original);assert.ok(r.peakCorrection.angleDeg<8);
 assert.equal(stabilityWeight(0.1),0);assert.equal(stabilityWeight(BODY_STABILITY_WINDOW.rampOut[1]+0.01),0);assert.ok(stabilityWeight(1)>0.99);
 const blocked=deriveStabilizedBurst(new T.AnimationClip(BODY_STABILITY_CLIP,5.4,[new T.VectorKeyframeTrack('Bip001.position',[0,5.4],[0,0,0,0,0,0])]),'standard');
 assert.match(blocked.blocked,/BODY_JITTER_SOURCE_BLOCKED/);assert.equal(deriveStabilizedBurst(original,'soft').strength,0.55);assert.throws(()=>deriveStabilizedBurst(original,'x'));
});
test('G11 plan: stability preset is carried by the plan; off keeps the library clip object',()=>{
 const l=lib(burstTracks);const on=buildR61Plan(l),off=buildR61Plan(l,{bodyStability:'off'});
 assert.equal(on.bodyStability.preset,'standard');assert.equal(off.clips[BODY_STABILITY_CLIP],l.find(c=>c.name===BODY_STABILITY_CLIP));assert.notEqual(on.clips[BODY_STABILITY_CLIP],off.clips[BODY_STABILITY_CLIP]);
 assert.equal(on.sourceFrame,null);assert.equal(on.identity,'SOURCE_ROLE_UNVERIFIED');
});
const plan=buildR61Plan(lib(null),{bodyStability:'off'}),bundle=createS3Score(plan.schedule),g=bundle.timeline.g11,burst=plan.schedule.segments[5];
test('G11(.1) colour/burst timeline: blue -> violet -> gold (overlapping ramps) -> absorption BEFORE the butterfly, monotonic, inside the real schedule, no PSA frame',()=>{
 assert.equal(g.sourceFrame,null);assert.equal(g.basis,'AUTHORIAL_DERIVED_FROM_SCHEDULE');
 const k=['violetStart','goldStart','violetFull','absorbStart','goldFull','butterflyStart','butterflyOpen','butterflyPeak','butterflyDissolve','butterflyEnd'];for(let i=1;i<k.length;i++)assert.ok(g[k[i]]>g[k[i-1]],k[i]);
 assert.ok(g.violetStart>burst.start&&g.goldFull<g.butterflyStart,'gold is fully present before the cancel');assert.ok(g.butterflyEnd<plan.schedule.duration);
 const c=t=>liberationColorScore(t,g);
 assert.equal(c(g.violetStart-0.1).violet,0);assert.equal(c(g.violetStart-0.1).phase,'BLUE');assert.ok(c(g.violetFull+0.1).phase==='VIOLET'&&c(g.violetFull+0.1).violet>0.99&&c(g.violetFull+0.1).gold<0.5);
 assert.equal(c(g.absorbStart-0.05).phase,'GOLD');assert.equal(c(g.goldFull).phase,'ABSORB');assert.ok(c(g.butterflyStart-0.01).gold>0.99,'gold is at full strength just before the burst');
 // gold is a real warm colour (not a white mix): R >> B
 const h=c(g.butterflyStart-0.01).hue;assert.ok(h[0]>2*h[2]);assert.deepEqual(h,G11_TINTS.gold);
 assert.equal(c(g.butterflyStart-0.001).bf.a,0);assert.equal(c(g.butterflyEnd).bf.a,0);assert.equal(c(g.butterflyEnd+1).phase,'CLEAR');assert.ok(c(g.butterflyPeak).bf.a>0.95);
 assert.equal(c(g.butterflyPeak).collapse,1);assert.deepEqual(liberationColorScore(g.butterflyPeak,g,true).bf.open,1);
 assert.deepEqual(c(26.5),c(26.5),'pure');
});
function layerFrame(layer,t,rm=false){const cue=bundle.score.cueAt(t,resolveClipId(plan.schedule,t),16/9),V=(x,y,z)=>new T.Vector3(x,y,z);
 const p=layer.update({t,cue,rm,bundle,headW:V(0,1.5,0),P:{chest:V(0,1.1,0),rh:V(-.5,1.1,.1),lh:V(.5,1.1,.1)},stage:{x:0,z:0,floorY:0}});return {p,u:JSON.stringify(layer.uniformsProbe()),b:layer.meshes.butterfly.visible,f:layer.meshes.field.visible};}
test('G11(.1) liberation layer: no premature giant butterfly, a bounded burst phase with start/peak/end, nothing left afterwards, seek-order independent',()=>{
 const parent=new T.Group(),L=createLiberationLayer(T,{parent,h:1.6,bundle});
 const grid=[];for(let t=22.2;t<=28.6;t+=0.05)grid.push(+t.toFixed(3));
 const fwd=grid.map(t=>layerFrame(L,t)),rev=[...grid].reverse().map(t=>layerFrame(L,t)).reverse();
 grid.forEach((t,i)=>{assert.equal(fwd[i].u,rev[i].u,'frame differs by seek order at '+t);
  if(t<g.butterflyStart-1e-9)assert.equal(fwd[i].b,false,'premature butterfly at '+t);if(t>=g.butterflyEnd)assert.equal(fwd[i].b,false,'residual butterfly at '+t);if(t>=g.butterflyEnd)assert.equal(fwd[i].f,false,'residual field at '+t);});
 const vis=grid.filter((t,i)=>fwd[i].b);assert.ok(vis.length>=10&&vis[0]>=g.butterflyStart-0.05&&vis.at(-1)<g.butterflyEnd,'phase is short and bounded');
 assert.ok(layerFrame(L,g.butterflyPeak).p.g11.butterfly.alpha>0.95);assert.equal(layerFrame(L,g.butterflyPeak).p.stage,'BUTTERFLY_BURST');
 // the gap between the reveal tail and the decay head must not drop the burst
 const gap=layerFrame(L,(burst.end+g.butterflyPeak)/2);assert.ok(gap.b,'burst survives the reveal->decay gap');
 const rmf=layerFrame(L,g.butterflyPeak,true);assert.equal(rmf.p.g11.butterfly.open,1);
 L.dispose();
});
test('G11(.1) trails: pure function of absolute time from a 30 Hz history; nothing while still; fast body segments show; reduced motion hides',()=>{
 // a body that is still, then dashes along +x at 30 u/s between t=1 and t=1.2
 const x=t=>t<1?0:t<1.2?(t-1)*30:6;const bones={};const root=new T.Group();
 for(const n of ['Bip001Pelvis','Bip001Spine2','Bip001RFoot','Bip001LFoot','Bip001RHand','Bip001LHand']){const b=new T.Bone();b.name=n;root.add(b);bones[n]=b;}
 const hist=buildTrailHistory(root,t=>{for(const b of Object.values(bones))b.position.set(x(t),1,0);},3);
 assert.equal(TRAIL_POINTS.length,6);assert.ok(Math.abs(trailPosition(hist,0,1.1)[0]-3)<0.2);
 const layer=createTrailLayer(T,{parent:new T.Group(),h:1.6});
 assert.equal(layer.update(hist,0.8),null,'still body: no trail');assert.ok(layer.update(hist,1.25)?.strength>0.5,'dash: trail');
 const a=Array.from(layer.mesh.geometry.attributes.position.array);layer.update(hist,2.9);layer.update(hist,1.25);assert.deepEqual(Array.from(layer.mesh.geometry.attributes.position.array),a,'same time -> same ribbon');
 assert.equal(layer.update(hist,1.25,true),null,'reduced motion hides trails');assert.equal(layer.mesh.visible,false);assert.equal(layer.update(null,1.25),null);layer.dispose();
});
