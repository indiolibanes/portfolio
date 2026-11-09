import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {FIDELITY_REFERENCE,FIDELITY_SHOTS,fidelityShotAt,fidelityCameraFrame,createFidelityFrameTransform} from '../src/scripts/shorekeeper/fidelity-camera.mjs';
import {buildR61Plan,R61_SOURCE_IDS} from '../src/scripts/shorekeeper/r61-plan.mjs';
import {weightsAt} from '../src/scripts/shorekeeper/combo-sequencer.mjs';
import {createLiberationLayer,LIBERATION_MAX_DRAW_CALLS,liberationColorScore} from '../src/scripts/shorekeeper/combat-vfx-liberation.mjs';
import {createS3CombatVfx} from '../src/scripts/shorekeeper/combat-vfx-adapter.mjs';
import {createS3Score} from '../src/scripts/shorekeeper/combat-vfx-events.mjs';
import {buildTrailHistory} from '../src/scripts/shorekeeper/combat-vfx-trails.mjs';

const DUR={SK_ATTACK_01_ORIGINAL:3.633,SK_ATTACK_02_ORIGINAL:5.733,SK_ATTACK_03_ORIGINAL:3.867,SK_ATTACK_L02_ORIGINAL:4.667,SK_SKILL_01_ORIGINAL:5.233,SK_BURST_02_ORIGINAL:5.433,SK_IDLE_01_ORIGINAL:2.5};
const lib=()=>R61_SOURCE_IDS.map(id=>new T.AnimationClip(id,DUR[id],[new T.VectorKeyframeTrack('Bip001.position',[0,DUR[id]],[0,0,0,0,0,0])]));
const ANCH={head:[0,1.6,0],rh:[.4,1.2,.25],lh:[-.35,1.25,.3]},FULL={...ANCH,pel:[0,1,0],rf:[.1,.05,0],lf:[-.1,.05,0]},FRONT=[0,0,1],H=1.6;
const BASE=Object.freeze({position:[0,1.2,6],target:[0,1,0],fov:34});
const frame=(tClip,o={})=>fidelityCameraFrame({base:BASE,tClip,anchors:ANCH,front:FRONT,h:H,aspect:16/9,...o});

test('F2 camera: shots follow the two reference hard cuts (proportional candidate mapping) and the base frame is used outside the clip',()=>{
 const [c1,c2]=FIDELITY_REFERENCE.cutsS,K=FIDELITY_REFERENCE.clipDurationS/FIDELITY_REFERENCE.durationS;
 assert.equal(FIDELITY_REFERENCE.confidence,'MEDIUM');assert.equal(FIDELITY_REFERENCE.mapping,'PROPORTIONAL_CANDIDATE');
 assert.equal(fidelityShotAt(-0.01),null);
 assert.equal(fidelityShotAt(0).id,'S1_CLOSE_BEHIND_TO_PROFILE');
 assert.equal(fidelityShotAt(c1*K-1e-6).id,'S1_CLOSE_BEHIND_TO_PROFILE');
 assert.equal(fidelityShotAt(c1*K).id,'S2_HAND_FLARE_CLOSE');
 assert.equal(fidelityShotAt(c2*K-1e-6).id,'S2_HAND_FLARE_CLOSE');
 assert.equal(fidelityShotAt(c2*K).id,'S3_STELLAREALM_LOW_LOOK_UP');
 assert.equal(fidelityShotAt(FIDELITY_REFERENCE.clipDurationS-1e-6).id,'S3_STELLAREALM_LOW_LOOK_UP');
 assert.equal(fidelityShotAt(FIDELITY_REFERENCE.clipDurationS),null,'after the clip: the existing camera');
 assert.equal(frame(FIDELITY_REFERENCE.clipDurationS+0.1),BASE,'after the Burst clip: exactly the existing approved frame (same object)');
 assert.equal(frame(-1),BASE);assert.throws(()=>fidelityShotAt(NaN),/finite/);
 assert.equal(FIDELITY_SHOTS.length,3);
});
test('F2 camera: pure, deterministic, flags real cuts, and never invents a direction or compensates body motion',()=>{
 const a=frame(1.3),b=frame(1.3);assert.deepEqual(a,b);assert.equal(a.cut,true);assert.equal(a.preset,'f2-fidelity-cuts');
 assert.equal(frame(1.3,{reduced:true}),BASE,'reduced motion: existing camera');
 assert.equal(frame(1.3,{front:[0,0,0]}),BASE,'singular front: existing camera');
 assert.equal(frame(1.3,{anchors:{head:ANCH.head}}),BASE,'missing anchors: existing camera');
 assert.ok(Object.isFrozen(a));
 // the camera follows the anchors rigidly: moving all anchors by d moves position and target by exactly d
 const d=[0.7,-0.2,1.1],sh=v=>[v[0]+d[0],v[1]+d[1],v[2]+d[2]],m=frame(2.0,{anchors:{head:sh(ANCH.head),rh:sh(ANCH.rh),lh:sh(ANCH.lh)}}),o=frame(2.0);
 for(let i=0;i<3;i++){assert.ok(Math.abs(m.position[i]-o.position[i]-d[i])<1e-9);assert.ok(Math.abs(m.target[i]-o.target[i]-d[i])<1e-9);}
});
test('F2 camera: shot 1 is continuous at 30/60 Hz (no tremor, no jumps), only the declared cuts jump; head and both hands stay in frame at 16:9 and 9:16',()=>{
 const [c1]=FIDELITY_REFERENCE.cutsS,K=FIDELITY_REFERENCE.clipDurationS/FIDELITY_REFERENCE.durationS,end=c1*K;
 for(const dt of [1/60,1/30]){let prev=frame(0),maxStep=0;for(let t=dt;t<end-1e-9;t+=dt){const f=frame(t);maxStep=Math.max(maxStep,Math.hypot(f.position[0]-prev.position[0],f.position[1]-prev.position[1],f.position[2]-prev.position[2]));prev=f;}
  assert.ok(maxStep<0.06*H*(dt*60),`shot 1 step ${maxStep} at dt=${dt}`);}
 const jump=(a,b)=>Math.hypot(a.position[0]-b.position[0],a.position[1]-b.position[1],a.position[2]-b.position[2]);
 assert.ok(jump(frame(end-1e-3),frame(end))>0.1*H,'cut 1 is a real cut');
 for(const aspect of [16/9,9/16])for(const t of [0,0.5,1.0,2.0,3.0,end-0.01,end+0.05]){
  const f=frame(t,{aspect}),cam=new T.PerspectiveCamera(f.fov,aspect,0.01,100);cam.position.set(...f.position);cam.lookAt(...f.target);cam.updateMatrixWorld(true);cam.updateProjectionMatrix();
  for(const [n,p] of Object.entries(ANCH)){const v=new T.Vector3(...p).project(cam);assert.ok(Math.abs(v.x)<=0.98&&Math.abs(v.y)<=0.98&&v.z<1,`${n} in frame at t=${t} aspect=${aspect.toFixed(2)}: ${v.x.toFixed(2)},${v.y.toFixed(2)}`);}
 }
});
test('F2 camera: shot 3 is a LOW camera looking UP at the dome with her small at the bottom centre (16:9 and 9:16), fixed relative to her ground point',()=>{
 const t0=FIDELITY_REFERENCE.cutsS[1]*FIDELITY_REFERENCE.clipDurationS/FIDELITY_REFERENCE.durationS+0.2;
 for(const aspect of [16/9,9/16]){
  const f=frame(t0,{aspect,anchors:FULL}),cam=new T.PerspectiveCamera(f.fov,aspect,0.01,100);cam.position.set(...f.position);cam.lookAt(...f.target);cam.updateMatrixWorld(true);cam.updateProjectionMatrix();
  const dir=new T.Vector3(...f.target).sub(new T.Vector3(...f.position)).normalize();assert.ok(dir.y>0.35,'looks up: '+dir.y);assert.ok(f.position[1]<0.4*H,'camera is low');
  for(const [n,p] of Object.entries({head:FULL.head,pel:FULL.pel,rf:FULL.rf,lf:FULL.lf})){const v=new T.Vector3(...p).project(cam);assert.ok(Math.abs(v.x)<=1&&Math.abs(v.y)<=1&&v.z<1,`${n} visible (aspect ${aspect.toFixed(2)}): ${v.x.toFixed(2)},${v.y.toFixed(2)}`);assert.ok(v.y<0,`${n} sits in the lower half: ${v.y.toFixed(2)}`);}
  const g=new T.Vector3(...f.position).sub(new T.Vector3(...FULL.pel));assert.ok(Math.abs(g.x)<1e-9&&g.z>0,'in front of her along her front');
  assert.deepEqual(frame(t0+0.5,{aspect,anchors:FULL}).position,f.position,'held: fixed relative to her ground point');
 }
});
test('F2 timeline: FIDELIDADE places the Stellarealm after the second reference cut and the trigger butterfly through shot 1; authorial placement untouched',()=>{
 const plan=buildR61Plan(lib()),burst=plan.schedule.segments.find(s=>s.id==='SK_BURST_02_ORIGINAL'),len=burst.end-burst.start;
 const F=createS3Score(plan.schedule,{fidelity:true}),A=createS3Score(plan.schedule),Ad=createS3Score(plan.schedule,{});
 const K=FIDELITY_REFERENCE.clipDurationS/FIDELITY_REFERENCE.durationS,cut2=burst.start+FIDELITY_REFERENCE.cutsS[1]*K,cut1=burst.start+FIDELITY_REFERENCE.cutsS[0]*K;
 assert.equal(F.placement,'F2_REFERENCE_DERIVED');assert.equal(A.placement,'AUTHORIAL');
 assert.ok(Math.abs(F.index.get('LIB.reveal').start-cut2)<0.01,'reveal starts at the 2nd cut: '+(F.index.get('LIB.reveal').start-cut2));
 assert.ok(F.index.get('LIB.reveal').start>cut1,'no Stellarealm in shot 1/2');
 const g=F.timeline.g11;assert.ok(g.triggerStart<burst.start+0.8,'trigger butterfly appears early');assert.ok(g.triggerDissolve>cut1-0.4&&g.triggerDissolve<cut1+0.2,'trigger holds through shot 1 and flares at the arm raise: '+(g.triggerDissolve-burst.start));
 assert.ok(g.triggerEnd<g.violetStart&&g.absorbStart>cut2+0.5&&g.butterflyStart>g.absorbStart,'ordering contract holds; the field is held >0.5 s before absorption');
 const ga=A.timeline.g11;assert.ok(Math.abs(A.index.get('LIB.reveal').start-(burst.start+0.26*len))<1e-6,'authorial reveal fraction unchanged');assert.ok(Math.abs(ga.absorbStart-(burst.end-1.05))<1e-9&&Math.abs(ga.butterflyStart-(burst.end-0.30))<1e-9);
 assert.deepEqual(JSON.parse(JSON.stringify(Ad.timeline)),JSON.parse(JSON.stringify(A.timeline)),'default == authorial');
});
test('F2 camera: frameTransform reads the Burst segment of the plan and composes with an inner transform',()=>{
 const plan=buildR61Plan(lib(),{burstEntry:'cut'}),seg=plan.schedule.segments.find(s=>s.id==='SK_BURST_02_ORIGINAL');
 const calls=[],tr=createFidelityFrameTransform((f,t)=>{calls.push(t);return f;}),ctx={plan,rig:{anchors:ANCH,front:FRONT},h:H,aspect:16/9,reduced:false};
 assert.equal(tr(BASE,seg.start-0.5,ctx),BASE,'before the Burst: untouched');
 assert.equal(tr(BASE,seg.start+1,ctx).preset,'f2-fidelity-cuts');
 assert.equal(tr(BASE,seg.start+4.5,ctx).phase,'S3_STELLAREALM_LOW_LOOK_UP');
 assert.equal(tr(BASE,seg.start+5.6,ctx),BASE,'after the clip: the base frame again');
 assert.equal(calls.length,4,'inner transform applied after');
 assert.equal(tr(BASE,seg.start+1,{plan,h:H,aspect:16/9}),BASE,'no rig: base');
});
test('F2 plan: burstEntry cut is half-open (exactly one clip owns every instant, no 0.2 s blend), blend stays the default',()=>{
 const blend=buildR61Plan(lib()),cut=buildR61Plan(lib(),{burstEntry:'cut'});
 assert.equal(blend.burstEntry??'blend','blend');assert.equal(cut.burstEntry,'cut');
 assert.throws(()=>buildR61Plan(lib(),{burstEntry:'nope'}),/unknown burstEntry/);
 const bi=s=>s.schedule.segments.findIndex(x=>x.id==='SK_BURST_02_ORIGINAL');
 const i=bi(cut),s=cut.schedule.segments[i];assert.equal(s.fade,0,'hard cut entry');
 for(const dt of [1/60,1/30,0.05,0.5]){
  for(const t of [s.start-dt,s.start-1e-9,s.start,s.start+1e-9,s.start+dt]){const w=weightsAt(cut.schedule,t);const sum=w.reduce((a,b)=>a+b,0);assert.ok(Math.abs(sum-1)<1e-9,`weights sum 1 at ${t}: ${sum}`);
   if(t<s.start)assert.equal(w[i],0,'Burst not blended in before the cut');else assert.equal(w[i],1,'Burst fully owns from the cut');}
 }
 const bl=blend.schedule.segments[bi(blend)];assert.ok(bl.fade>0,'artistic/default keeps the cross-fade');
 const wb=weightsAt(blend.schedule,bl.start+bl.fade/2);assert.ok(wb[bi(blend)]>0&&wb[bi(blend)]<1,'blend: mid fade is a mix');
 // long frame: the weights are a pure function of time, so a 1 s hitch lands on the right owner
 assert.equal(weightsAt(cut.schedule,s.start+1.0)[i],1);
});

const rig=()=>{const root=new T.Group(),scene=new T.Scene();scene.add(root);for(const [n,p] of Object.entries({Bip001Pelvis:[0,1,0],Bip001Spine2:[0,1.3,0],Bip001Head:[0,1.6,0],Bip001RFoot:[.1,.05,0],Bip001LFoot:[-.1,.05,0],Bip001RThigh:[.1,.9,0],Bip001LThigh:[-.1,.9,0],Bip001RHand:[.4,1.2,.2],Bip001LHand:[-.4,1.2,.2],Bip001RForearm:[.3,1.2,.1],Bip001LForearm:[-.3,1.2,.1]})){const o=new T.Bone();o.name=n;o.position.set(...p);root.add(o);}root.updateMatrixWorld(true);return {root,scene};};
test('F2 trigger is frozen; F3 replaces only the fidelity giant wings, artistic keeps G11.1; budgets unchanged',()=>{
 const mk=palette=>{const scene=new T.Scene(),root=new T.Group();scene.add(root);const plan=buildR61Plan(lib()),bundle=createS3Score(plan.schedule);return {scene,L:createLiberationLayer(T,{parent:root,h:1.6,bundle,palette}),root};};
 const f=mk('fidelity'),a=mk('authorial');
 try{
  const fs=(r,n)=>r.getObjectByName(n).material.fragmentShader;
  assert.match(fs(f.root,'liberationTriggerButterfly'),/bfFidShade/);assert.doesNotMatch(fs(a.root,'liberationTriggerButterfly'),/bfFidShade/);
  assert.ok(a.root.getObjectByName('liberationGiantButterfly'));assert.equal(f.root.getObjectByName('liberationGiantButterfly'),undefined);
  assert.doesNotMatch(fs(f.root,'liberationEnergyRupture'),/bfFidShade|bfEmbers|bfWing/);
  assert.equal(f.root.children.length,a.root.children.length);assert.ok(f.root.children.length<=LIBERATION_MAX_DRAW_CALLS,'draw-call budget kept (no extra mesh)');
 }finally{f.L.dispose?.();a.L.dispose?.();}
});
test('F2 butterflies: trigger butterfly leaves the fingers on a short arc (0.04-0.17 h above the live hand), blue-white, ember trail is bounded; burst has anticipation -> open -> dissolve',()=>{
 const plan=buildR61Plan(lib(),{burstEntry:'cut'}),g=createS3Score(plan.schedule,{fidelity:true}).timeline.g11,{root,scene}=rig();
 const a=createS3CombatVfx(T,{scene,model:root,plan,scale:1.6,stageAnchor:{x:0,z:0,floorY:0},fidelity:true});
 try{
  a.setTrailHistory(buildTrailHistory(root,()=>{},plan.schedule.duration));
  const lh=new T.Vector3();root.getObjectByName('Bip001LHand').getWorldPosition(lh);let seen=0,prevY=-1;
  for(let t=g.triggerStart+0.02;t<g.triggerEnd;t+=0.05){const p=a.apply(t)?.liberation??a.last?.liberation;const tr=a.last?.liberation?.trigger;if(!tr)continue;seen++;
   const dy=tr.anchor[1]-lh.y;assert.ok(dy>=0.04*1.6*0.97&&dy<=0.17*1.6*1.02,`rise ${dy.toFixed(3)} at ${t.toFixed(2)}`);assert.ok(dy>=prevY-0.02,'rises monotonically (no wandering)');prevY=dy;
   const tu=scene.getObjectByName('liberationTriggerButterfly').material.uniforms;assert.ok(tu.uViolet.value.z>=0.95&&tu.uViolet.value.x<=0.6,'trigger halo is blue-white');
  }
  assert.ok(seen>5,'trigger butterfly observed');
  // coverage: it must exist at EVERY sample between appearing and the flare (the field events do not cover the gap in the FIDELIDADE timeline)
  let miss=0,n=0;for(let t=g.triggerFull;t<g.triggerDissolve;t+=0.1){a.apply(t);n++;if(!a.last?.liberation?.trigger)miss++;}
  assert.equal(miss,0,miss+' of '+n+' samples without the trigger butterfly');
  const sc=(t)=>liberationColorScore(t,g,false,'fidelity').bf;
  assert.ok(sc(g.butterflyStart+0.01).open<0.3,'anticipation: wings start folded');
  assert.ok(sc(g.butterflyOpen).open>=0.95,'wings open');
  assert.ok(sc(g.butterflyEnd-0.01).burn>0.9,'dissolved by the end');
  assert.equal(liberationColorScore(g.butterflyOpen,g,false,'fidelity').violet,0);
 }finally{a.dispose();}
});

test('F2 body ribbons: FIDELIDADE hides them during the Burst clip only; artistic keeps them',()=>{
 const plan=buildR61Plan(lib(),{burstEntry:'cut'}),burst=plan.schedule.segments.find(x=>x.id==='SK_BURST_02_ORIGINAL');
 const run=fid=>{const {root,scene}=rig();const a=createS3CombatVfx(T,{scene,model:root,plan,scale:1.6,stageAnchor:{x:0,z:0,floorY:0},fidelity:fid});
  try{const hist=buildTrailHistory(root,t=>{root.getObjectByName('Bip001RHand').position.set(.4+.9*Math.sin(t*14),1.2+.5*Math.cos(t*14),.2);root.updateMatrixWorld(true);},plan.schedule.duration);a.setTrailHistory(hist);
   const vis=t=>{a.apply(t);const m=scene.getObjectByName('blueMotionTrails');return !!m?.visible;};let inB=0,outB=0;
   for(let t=burst.start+0.3;t<burst.end-0.05;t+=0.25)inB+=vis(t)?1:0;
   for(let t=1;t<burst.start-0.2;t+=0.25)outB+=vis(t)?1:0;
   return {inB,outB};}finally{a.dispose();}};
 const F=run(true);assert.equal(F.inB,0,'no ribbons inside the Burst clip');
 const A=run(false);assert.ok(A.inB>0,'artistic still draws them: '+JSON.stringify(A));
 assert.ok(F.outB>0||A.outB>0,'outside the Burst the ribbons are untouched (same as artistic): '+JSON.stringify({F,A}));
});
