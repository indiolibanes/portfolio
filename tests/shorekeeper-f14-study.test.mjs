import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {buildR61Plan,R61_SOURCE_IDS} from '../src/scripts/shorekeeper/r61-plan.mjs';
import {resolveStudyConfig,studyPlanOptions,studyPhaseAt,STUDY_LIMITS,STUDY_LABEL,STUDY_PRESENTATION_STATUS,STUDY_IDLE_ORDER} from '../src/scripts/shorekeeper/study-presentation.mjs';
import {s3Timeline,createS3Score,STUDY_RECOVERY_REF_S} from '../src/scripts/shorekeeper/combat-vfx-events.mjs';
import {createLiberationLayer,liberationColorScore,F14_TRIGGER_CLEARANCE_H,F14_TRIGGER_FACE_R_H} from '../src/scripts/shorekeeper/combat-vfx-liberation.mjs';
import {createStudyColorController,studyColorWeights,STUDY_COLOR_PROFILES,STUDY_COLOR_STATUS} from '../src/scripts/shorekeeper/study-color.mjs';
import {studyObservationFrame,STUDY_OBSERVATION_SHOTS} from '../src/scripts/shorekeeper/fidelity-camera.mjs';
import {BILLBOARD_VS,BILLBOARD_VS_FACING} from '../src/scripts/shorekeeper/combat-vfx-shaders.mjs';
import {PROFILE_ARTISTIC,PROFILE_FIDELITY} from '../src/scripts/shorekeeper/fidelity-profile.mjs';
import {make} from './shorekeeper-r65-fixture.mjs';
const durations=[3.633,5.733,3.867,4.667,5.233,5.433,2.5],IDLE={SK_IDLE_01_ORIGINAL:27.1,SK_IDLE_02_ORIGINAL:24,SK_IDLE_03_ORIGINAL:22};
const clip=(id,d)=>new T.AnimationClip(id,d,[new T.VectorKeyframeTrack('Root.position',[0,d],[0,0,0,0,0,0])]);
const base=()=>R61_SOURCE_IDS.map((id,i)=>clip(id,durations[i])); // short F3 library (Idle01 is the 7th source, 2.5 s in the fixture)
const libWith=(idle01,more=true)=>[...R61_SOURCE_IDS.map((id,i)=>clip(id,id==='SK_IDLE_01_ORIGINAL'?idle01:durations[i])),...(more?[['SK_IDLE_02_ORIGINAL',IDLE.SK_IDLE_02_ORIGINAL],['SK_IDLE_03_ORIGINAL',IDLE.SK_IDLE_03_ORIGINAL]].map(([id,d])=>clip(id,d)):[])];
const lib=()=>libWith(IDLE.SK_IDLE_01_ORIGINAL);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const plan=(cfg={})=>buildR61Plan(lib(),studyPlanOptions(lib(),cfg,{burstEntry:'cut'}));

test('F1.4 study config accepts only 60-90 s duration and 15-25 s hold',()=>{
 assert.deepEqual(resolveStudyConfig({}),{durationS:75,holdS:20});
 for(const bad of [{durationS:59.9},{durationS:90.1},{durationS:NaN},{holdS:14},{holdS:26},{holdS:Infinity}])assert.throws(()=>resolveStudyConfig(bad),RangeError);
 for(const ok of [{durationS:60,holdS:15},{durationS:90,holdS:25}])assert.doesNotThrow(()=>resolveStudyConfig(ok));
});
test('F1.4 study plan keeps the seven combat steps byte-identical to the short F3 plan and adds only ORIGINAL idles at 1x',()=>{
 const L=lib(),short=buildR61Plan(L,{burstEntry:'cut'});
 for(const dur of [60,75,90]){const p=buildR61Plan(L,studyPlanOptions(L,{durationS:dur},{burstEntry:'cut'}));
  assert(Math.abs(p.schedule.duration-dur)<0.11,`duration ${p.schedule.duration}`);
  for(let i=0;i<6;i++)assert.deepEqual(p.schedule.segments[i],short.schedule.segments[i],'combat segment '+i);
  const s=p.schedule.segments;assert.equal(new Set(s.map(x=>x.id)).size,s.length,'unique segment ids');
  assert.equal(s[6].id,'SK_IDLE_01_ORIGINAL');assert.equal(s[6].start,short.schedule.segments[6].start);
  for(const x of s.slice(7))assert(STUDY_IDLE_ORDER.includes(x.id));
  for(const x of s.slice(6))assert(x.end-x.start<=IDLE[x.id]-0.99,'never past the source clip');
  for(const id of R61_SOURCE_IDS.slice(0,6))assert.equal(p.clips[id],short.clips[id],'same clip object, unedited');
  assert.equal(p.study.tail.every(t=>/^SK_IDLE_0[23]_ORIGINAL$/.test(t.id)),true);
 }
 assert.equal(short.study,null);
});
test('F1.4 short F3 plan is unchanged when no study is requested (no hidden extension)',()=>{
 const a=buildR61Plan(base(),{burstEntry:'cut'}),b=buildR61Plan(lib(),{burstEntry:'cut'});
 assert.equal(a.schedule.duration,b.schedule.duration);assert(a.schedule.duration<30);
 assert.deepEqual(a.schedule.segments,b.schedule.segments);
});
test('F1.4 study plan rejects unsafe tails and impossible durations',()=>{
 assert.throws(()=>buildR61Plan(lib(),{burstEntry:'cut',study:{recoveryS:5,tail:[{id:'SK_ATTACK_01_ORIGINAL',exit:3}]}}),/invalid study tail/);
 assert.throws(()=>buildR61Plan(lib(),{burstEntry:'cut',study:{recoveryS:5,tail:[{id:'SK_IDLE_02_ORIGINAL',exit:3},{id:'SK_IDLE_02_ORIGINAL',exit:3}]}}),/invalid study tail/);
 assert.throws(()=>buildR61Plan(lib(),{burstEntry:'cut',study:{recoveryS:5,tail:[{id:'SK_IDLE_02_ORIGINAL',exit:99}]}}),/outside the clip/);
 assert.throws(()=>buildR61Plan(lib(),{burstEntry:'cut',study:{recoveryS:1,tail:[]}}),/invalid study plan/);
 assert.throws(()=>studyPlanOptions(libWith(6,false),{durationS:90}),/cannot fill|idle source missing/);
 assert.throws(()=>studyPlanOptions(libWith(2.5,false),{durationS:75}),/idle source missing/);
});
test('F1.4 study timeline holds the Stellarealm 15-25 s as exposition and keeps the decay on the combat recovery length',()=>{
 for(const holdS of [15,20,25]){const p=plan({holdS}),tl=s3Timeline(p.schedule,{fidelity:true,study:{holdS}}),h=tl.studyHold;
  assert.equal(h.label,STUDY_LABEL);assert.equal(h.label,'EXPOSITION_HOLD_NOT_CANONICAL_DURATION');assert(Math.abs(h.end-h.start-holdS)<1e-9);assert.equal(h.start,tl.revealStart);
  const burstEnd=p.schedule.segments[5].end;assert(h.end>burstEnd+3,'hold continues after the Burst clip');
  const short=s3Timeline(buildR61Plan(lib(),{burstEntry:'cut'}).schedule,{fidelity:true});
  assert.equal(tl.end,short.end,'decay window tied to the combat recovery, never to the exposition time');
  assert.equal(tl.revealStart,short.revealStart);assert.equal(tl.closeEnd,short.closeEnd);
 }
 assert.equal(s3Timeline(plan({}).schedule,{fidelity:true}).studyHold,null);
 const sc=plan({});assert.throws(()=>s3Timeline(sc.schedule,{fidelity:false,study:{holdS:20}}),/FIDELIDADE/);
 assert.throws(()=>s3Timeline(sc.schedule,{fidelity:true,study:{holdS:30}}),/15-25/);
 assert.equal(STUDY_RECOVERY_REF_S,1.45);
 const b=createS3Score(sc.schedule,{fidelity:true,study:{holdS:20}});assert(b.timeline.studyHold);
});
test('F1.4 study phases label every non-combat second as exposition and never as canonical duration',()=>{
 const p=plan({}),tl=s3Timeline(p.schedule,{fidelity:true,study:{holdS:20}}),end=p.schedule.segments[5].end;
 assert.equal(studyPhaseAt(p,tl,1).canonicalTiming,true);assert.equal(studyPhaseAt(p,tl,end-0.01).id,'COMBAT_SEQUENCE_PSA_1X');
 const hold=studyPhaseAt(p,tl,end+1);assert.equal(hold.canonicalTiming,false);assert.equal(hold.label,STUDY_LABEL);
 const idle=studyPhaseAt(p,tl,tl.studyHold.end+1);assert.equal(idle.canonicalTiming,false);assert.match(idle.label,/NOT_CANONICAL/);
 assert.throws(()=>studyPhaseAt(buildR61Plan(lib(),{burstEntry:'cut'}),s3Timeline(buildR61Plan(lib(),{burstEntry:'cut'}).schedule,{fidelity:true}),1),/study/);
 const st=STUDY_PRESENTATION_STATUS;assert.equal(st.stellarealmStage,'NOT_PROMOTED_NO_INNER_NO_SUPERNAL');assert.equal(st.discernment,'NOT_PLAYED');assert.equal(st.canonical,'CANONICAL_PENDING');assert.equal(st.G7,'NO_GO');
});

const layerFor=(palette,study=null)=>{const parent=new T.Group(),p=plan({}),bundle=createS3Score(p.schedule,{fidelity:palette==='fidelity',study:study&&palette==='fidelity'?{holdS:20}:null}),L=createLiberationLayer(T,{parent,h:1.6,bundle,palette});return {parent,p,bundle,L};};
const step=(L,bundle,t,extra={})=>L.update({t,rm:false,cue:{liberationField:1},bundle,headW:new T.Vector3(0,1.6,0),P:{chest:new T.Vector3(0,1,0),rh:new T.Vector3(.3,1.1,.2),lh:new T.Vector3(-.3,1.2,.2)},stage:{x:0,z:0,floorY:0},...extra});
test('F1.4 STUDY_COLOR: BLUE is byte-identical to FIDELIDADE, ARTISTICO ignores the study, VIOLET/GOLD differ and the change is reversible',()=>{
 const run=(palette,fn)=>{const {L,bundle,p}=layerFor(palette,true),out=[];try{fn?.(L);for(let t=22;t<p.schedule.duration;t+=1.25){step(L,bundle,t);out.push(hash(L.uniformsProbe()));}return out;}finally{L.dispose();}};
 const fid=run('fidelity'),blue=run('fidelity',L=>L.setStudyColor({violet:0,gold:0})),violet=run('fidelity',L=>L.setStudyColor({violet:1,gold:0})),gold=run('fidelity',L=>L.setStudyColor({violet:1,gold:1}));
 assert.deepEqual(blue,fid,'BLUE === FIDELIDADE');assert.notDeepEqual(violet,fid);assert.notDeepEqual(gold,fid);assert.notDeepEqual(gold,violet);
 const rev=run('fidelity',L=>{L.setStudyColor({violet:1,gold:1});L.setStudyColor(null);});assert.deepEqual(rev,fid,'reversible');
 const art=run('authorial'),artStudy=run('authorial',L=>L.setStudyColor({violet:1,gold:1}));assert.deepEqual(artStudy,art,'ARTISTICO unchanged');
 const {L}=layerFor('fidelity',true);try{assert.throws(()=>L.setStudyColor({violet:NaN,gold:0}),/finite/);assert.throws(()=>L.setStudyColor(undefined),/finite/);L.setStudyColor({violet:5,gold:-3});assert.deepEqual(L.studyColor,{violet:1,gold:0});}finally{L.dispose();}
 // the score is a pure state function: no time dependence for the FIDELIDADE colour weights
 const g=layerFor('fidelity',true).bundle.timeline.g11;for(const t of [0,10,20,30,40]){const c=liberationColorScore(t,g,false,'fidelity',{violet:.3,gold:.6});assert.equal(c.violet,.3);assert.equal(c.gold,.6);}
 assert.equal(liberationColorScore(10,g,false,'fidelity',null).gold,0);
});
test('F1.4 STUDY_COLOR controller is a reversible state machine with no stage association, clock or RAF',()=>{
 const calls=[],layer={setStudyColor:v=>calls.push(v)};const c=createStudyColorController(layer,{transitionS:2});
 assert.equal(c.profile,'BLUE');assert.deepEqual(c.apply(0),{violet:0,gold:0});assert.equal(calls.at(-1),null);
 c.select('GOLD',10);assert.equal(c.transitioning,true);
 assert.deepEqual(c.apply(10),{violet:0,gold:0});const mid=c.apply(11);assert(mid.violet>0&&mid.violet<1&&mid.gold>0&&mid.gold<1);assert.equal(c.transitioning,true);
 assert.deepEqual(c.apply(12),{violet:1,gold:1});assert.equal(c.transitioning,false);
 // reversing mid-transition continues from the CURRENT weights (no jump)
 c.select('BLUE',20);c.apply(21);const w=c.weights;c.select('VIOLET',21);const w2=c.apply(21);assert.deepEqual(w2,w);
 c.complete(30);assert.deepEqual(c.weights,{violet:1,gold:0});c.select('BLUE',31);c.complete(31);assert.deepEqual(c.weights,{violet:0,gold:0});assert.equal(calls.at(-1),null,'BLUE clears the layer (plain FIDELIDADE)');
 assert.throws(()=>c.select('RED',1),RangeError);assert.throws(()=>c.select('BLUE',NaN),TypeError);
 c.select('GOLD',40);c.complete(40);c.dispose();assert.equal(calls.at(-1),null);c.select('VIOLET',41);assert.equal(c.apply(41).violet,1,'disposed controller stays inert');
 assert.throws(()=>createStudyColorController({}),TypeError);assert.throws(()=>createStudyColorController(layer,{transitionS:-1}),RangeError);
 assert.deepEqual(studyColorWeights({violet:0,gold:0},{violet:1,gold:1},0),{violet:0,gold:0});assert.deepEqual(studyColorWeights({violet:0,gold:0},{violet:1,gold:1},1),{violet:1,gold:1});
 assert.equal(STUDY_COLOR_STATUS.stageAssociation,'NONE');assert.equal(STUDY_COLOR_STATUS.scope,'LABORATORY_ONLY');
 assert.deepEqual(Object.keys(STUDY_COLOR_PROFILES),['BLUE','VIOLET','GOLD']);
 const src=readFileSync(new URL('../src/scripts/shorekeeper/study-color.mjs',import.meta.url),'utf8');
 assert(!/^import /m.test(src),'no imports: cannot read a stage, a schedule or a clock');
 assert(!/requestAnimationFrame|setInterval|setTimeout|performance\.now|Date\.now/.test(src),'no clock or RAF of its own');
 for(const p of Object.values(STUDY_COLOR_PROFILES))assert(!('stage' in p)&&!('outer' in p)&&!('inner' in p)&&!('supernal' in p));
});

test('F1.4 P0 trigger butterfly: perspective-gated face mask + lateral clearance only in FIDELIDADE; shaders reused; historical path without facing',()=>{
 assert(BILLBOARD_VS_FACING.includes('uFaceFwd')&&BILLBOARD_VS_FACING.includes('uClear'));assert(!BILLBOARD_VS.includes('uClear'));
 const {L,bundle,parent,p}=layerFor('fidelity');const t=p.schedule.segments[5].start+1.2;
 try{const trig=L.meshes.trigger,u=trig.material.uniforms;assert(u.uFaceFwd&&u.uClear&&u.uFaceR);
  step(L,bundle,t,{front:new T.Vector3(0,0,1)});assert(u.uClear.value>0);assert.equal(+(u.uClear.value/1.6).toFixed(6),F14_TRIGGER_CLEARANCE_H);assert.equal(+(u.uFaceR.value/1.6).toFixed(6),F14_TRIGGER_FACE_R_H);assert.deepEqual(u.uFaceFwd.value.toArray(),[0,0,1]);
  for(const [k,m] of Object.entries(L.meshes)){if(k==='trigger'||!m.material.uniforms?.uFaceR)continue;assert.equal(+(m.material.uniforms.uFaceR.value/1.6).toFixed(6),0.14,k+' keeps the original face disc');assert(!m.material.uniforms.uClear,k+' has no clearance');}
  step(L,bundle,t,{front:null});assert.equal(u.uClear.value,0);assert.deepEqual(u.uFaceFwd.value.toArray(),[0,0,0],'front untrusted -> historical always-on mask, no clearance');
  assert.equal(parent.children.length,6,'no added mesh or draw slot');
 }finally{L.dispose();}
 const a=layerFor('authorial');try{assert(!a.L.meshes.trigger.material.uniforms.uClear,'ARTISTICO trigger keeps the original shader');assert(!a.L.meshes.trigger.material.vertexShader.includes('uClear'));}finally{a.L.dispose();}
 const src=readFileSync(new URL('../src/scripts/shorekeeper/combat-vfx-liberation.mjs',import.meta.url),'utf8')+readFileSync(new URL('../src/scripts/shorekeeper/combat-vfx-shaders.mjs',import.meta.url),'utf8');
 assert(!/__qa|__dbg|ablation|DIAG_|window\./.test(src),'no diagnostic toggles in production');
 assert(F14_TRIGGER_CLEARANCE_H<=0.4&&F14_TRIGGER_FACE_R_H<=0.14);
});

const frameBase=()=>({position:[0,1.6,4],target:[0,1,0],fov:46});
const anchors={pel:[0,.9,0],rf:[.1,0,0],lf:[-.1,0,0]};
test('F1.4 study observation camera: pure, bounded to the held window, three shots, finite in 16:9 and 9:16, off under reduced motion',()=>{
 const args=(t,extra={})=>({base:frameBase(),t,burstEnd:27.77,holdEnd:46.47,anchors,front:[0,0,1],h:1.7,aspect:16/9,...extra});
 assert.deepEqual(studyObservationFrame(args(27.7)),frameBase(),'before the Burst ends the base camera is untouched');
 assert.deepEqual(studyObservationFrame(args(46.47)),frameBase(),'after the hold the base camera returns');
 assert.deepEqual(studyObservationFrame(args(35,{reduced:true})),frameBase());
 assert.deepEqual(studyObservationFrame(args(35,{anchors:null})),frameBase());
 assert.deepEqual(studyObservationFrame(args(35,{front:[0,0,0]})),frameBase());
 const seen=new Set();
 for(const aspect of [16/9,9/16])for(let t=27.8;t<46.4;t+=.37){const f=studyObservationFrame(args(t,{aspect}));assert.deepEqual(f,studyObservationFrame(args(t,{aspect})),'deterministic');
  assert(f.position.every(Number.isFinite)&&f.target.every(Number.isFinite)&&Number.isFinite(f.fov));assert.equal(f.preset,'f14-study-observation');seen.add(f.phase);
  const d=Math.hypot(f.position[0]-anchors.pel[0],f.position[2]-anchors.pel[2]);assert(d>1.5&&d<12,'camera stays at an observation distance: '+d);assert(f.position[1]>-.5&&f.position[1]<3.5,'camera height sane: '+f.position[1]);}
 assert.deepEqual([...seen].sort(),STUDY_OBSERVATION_SHOTS.map(s=>s.id).sort());
 assert.throws(()=>studyObservationFrame(args(35,{holdEnd:20})),TypeError);assert.throws(()=>studyObservationFrame({...args(35),base:null}),TypeError);
});

test('F1.4 integration: STUDY_PRESENTATION is FIDELIDADE-only, validated before allocation, and ten create/dispose cycles leave no scene residue',()=>{
 const f=make();try{
  const REST=[Math.SQRT1_2,0,0,-Math.SQRT1_2],RIB=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),3.05).toArray(),pos=d=>new T.VectorKeyframeTrack('Root.position',[0,d],[0,0,0,1,0,0]);
  const lib2=[];for(const [i,id] of R61_SOURCE_IDS.entries()){const d=id==='SK_IDLE_01_ORIGINAL'?IDLE.SK_IDLE_01_ORIGINAL:durations[i],burst=/BURST/.test(id);lib2.push(new T.AnimationClip(id,d,burst?[pos(d),new T.QuaternionKeyframeTrack('Root.quaternion',[0,d],[...RIB,...RIB])]:[pos(d)]));if(burst)lib2.push(new T.AnimationClip(id+'_BODY',d,[new T.QuaternionKeyframeTrack('Root.quaternion',[0,d],[...REST,...REST])]));}
  for(const id of ['SK_IDLE_02_ORIGINAL','SK_IDLE_03_ORIGINAL'])lib2.push(clip(id,IDLE[id]));
  const kids=f.stage.scene.children.length;
  assert.throws(()=>f.create({profile:PROFILE_ARTISTIC,study:{durationS:75,holdS:20}}),/FIDELIDADE/);
  assert.throws(()=>f.create({profile:PROFILE_FIDELITY,study:{durationS:30,holdS:20}}),RangeError);
  assert.equal(f.stage.scene.children.length,kids,'nothing allocated on failure');
    for(let i=0;i<10;i++){
   const d=require_create(f,lib2,{durationS:75,holdS:20});
   const info=d.studyInfo;assert.equal(info.mode,'STUDY_PRESENTATION');assert.equal(info.holdS,20);assert(Math.abs(info.durationS-75)<.11);assert.equal(info.canonical,'CANONICAL_PENDING');assert.equal(info.G7,'NO_GO');
   const tl=d.scoreAdapter.timeline;assert.equal(tl.studyHold.label,STUDY_LABEL);assert.equal(info.phaseAt(tl.studyHold.end+.5).canonicalTiming,false);
   assert.equal(d.integrationStatus.profile,PROFILE_FIDELITY);assert.equal(d.integrationStatus.G7,'NO_GO');
   d.start();d.seek(40);d.seek(0);d.dispose();d.dispose();
  }
  const short=createR62Integration(T,f.model,lib2,f.stage,{getVfx:()=>f.v,profile:PROFILE_FIDELITY,camera:false});assert.equal(short.studyInfo,null);assert(short.plan.schedule.duration<30);short.dispose();
  const own=f.stage.scene.children.filter(o=>o.name&&/liberation|combat|r62|vfx/i.test(o.name)&&!/environment|ShorekeeperVfx/i.test(o.name));assert.equal(own.length,0,'no combat/liberation objects left');
 }finally{f.dispose();}
});
import {createR62Integration} from '../src/scripts/shorekeeper/r62-integration.mjs';
function require_create(f,library,study){return createR62Integration(T,f.model,library,f.stage,{getVfx:()=>f.v,profile:PROFILE_FIDELITY,camera:false,study});}
