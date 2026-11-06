import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {makeAuditFixture} from './shorekeeper-r605/fixture.mjs';
import {sampleSourceMotion,unwrapYaw,auditTimes} from '../src/scripts/shorekeeper/source-motion-audit.mjs';
import {createAdaptiveQuality} from '../src/scripts/shorekeeper/adaptive-quality.mjs';
import {createGpuTimer} from '../src/scripts/shorekeeper/gpu-timer.mjs';
import {clipFingerprint,parseDataOnly,runPrivateAudit} from '../scripts/shorekeeper/audit-private-source.mjs';
import {createOriginalIdleDirector} from '../src/scripts/shorekeeper/original-idle-director.mjs';
import {createPresentationClock} from '../src/scripts/shorekeeper/presentation-clock.mjs';
const identity={sourceHash:'a'.repeat(64),clipHash:'b'.repeat(64),provenance:'SYNTHETIC_FIXTURE'};
test('30/60 Hz A/B/C preserves source bytes and measures world yaw separately from rotation and soles',()=>{
 const {model,clip,calibration}=makeAuditFixture(),before=JSON.stringify(clip.toJSON()),bind=model.getObjectByName('Root').quaternion.toArray();
 for(const fps of [30,60])for(const variant of ['ORIGINAL','REBASED','ROOT_BODY_OWNED']){
  const r=sampleSourceMotion(model,clip,{...identity,calibration,fps,variant}),first=r.rows[0].bones.Root,last=r.rows.at(-1).bones.Root;
  assert.ok(Math.abs(last.yawUnwrapped-first.yawUnwrapped-(variant==='ROOT_BODY_OWNED'?0:4*Math.PI))<1e-5);
  assert.ok(Math.abs(last.rotationPathRadians-(variant==='ROOT_BODY_OWNED'?0:4*Math.PI))<1e-5);
  assert.equal(r.pelvisPeak.clipTime,1);assert.equal(r.pelvisPeak.y,3);
  assert.ok(r.contacts.L[0].firstSample>2&&r.contacts.L[0].firstSample<2.05);assert.equal(r.rows.at(-1).soles.L.sustained,true);
  assert.ok(r.rows.every(row=>row.sourceFrame===null));assert.deepEqual(r.markers,[]);
 }
 assert.equal(JSON.stringify(clip.toJSON()),before);assert.deepEqual(model.getObjectByName('Root').quaternion.toArray(),bind);
});
test('calibration, hashes and actual key times fail closed; vertical forward has no invented yaw',()=>{
 const {model,clip,calibration}=makeAuditFixture();assert.throws(()=>sampleSourceMotion(model,clip,identity),/calibration/);
 assert.throws(()=>sampleSourceMotion(model,clip,{...identity,calibration,sourceHash:null}),/identity/);
 assert.throws(()=>sampleSourceMotion(model,clip,{...identity,calibration:{...calibration,soles:[]}}),/selections/);
 assert.equal(unwrapYaw(new T.Vector3(0,1,0),0),null);
 const c=clip.clone();c.tracks.push(new T.VectorKeyframeTrack('Bip001.position',[0,.12345,3],[0,0,0,0,0,0,0,0,0]));assert.ok(auditTimes(c,60).includes(c.tracks.at(-1).times[1]));
 const fingerprint=clipFingerprint(clip);clip.tracks[1].values[4]+=.01;assert.notEqual(clipFingerprint(clip),fingerprint);
});
test('adaptive DPR requires opt-in, sustained measured cost and cooldown; pacing alone is not input',()=>{
 const off=createAdaptiveQuality();for(let i=0;i<1000;i++)assert.equal(off.sample(1000,i*1000,33),null);
 const q=createAdaptiveQuality({enabled:true,window:4,cooldownMs:100});let t=0;const feed=(cost,n)=>{for(let i=0;i<n;i++)q.sample(cost,t+=20,20);};
 feed(30,8);assert.equal(q.state.current,1.75);feed(30,8);assert.equal(q.state.current,1.5);
 feed(1,16);assert.equal(q.state.current,1.75);q.setCeiling(1);assert.equal(q.state.current,1);assert.throws(()=>q.setCeiling(3));
});
function mockGL(){let disjoint=false,available=false,deletes=0,id=0;return {TIME:100,DISJOINT:101,QUERY_RESULT_AVAILABLE:102,QUERY_RESULT:103,getExtension:()=>({TIME_ELAPSED_EXT:100,GPU_DISJOINT_EXT:101}),getParameter:()=>disjoint,isContextLost:()=>false,createQuery:()=>({id:++id}),beginQuery(){},endQuery(){},deleteQuery(){deletes++;},getQueryParameter:(_,p)=>p===102?available:2e6,setAvailable:v=>available=v,setDisjoint:v=>disjoint=v,get deletes(){return deletes;}};}
test('GPU queries are bounded, asynchronous, invalidated on disjoint and disposed without another RAF',()=>{
 const gl=mockGL(),q=createGpuTimer(gl,{enabled:true,maxPending:2});assert.equal(q.begin(),true);q.end();q.begin();q.end();assert.equal(q.begin(),false);assert.equal(q.report().samples,0);
 gl.setAvailable(true);assert.equal(q.report().timerQueryMs.p95,2);assert.equal(q.report().physicalGpuValidation,'NOT_VALIDATED');assert.equal(gl.deletes,2);
 gl.setAvailable(false);q.begin();q.end();gl.setDisjoint(true);assert.equal(q.report().samples,0);assert.equal(q.report().discarded,1);q.dispose();assert.equal(q.begin(),false);
 const no=createGpuTimer({...gl,getExtension:()=>null},{enabled:true});assert.match(no.report().status,/UNSUPPORTED/);
});
test('data-only parser verifies format without renderer and offline audit rejects public/repo output',async()=>{
 const json=Buffer.from(JSON.stringify({asset:{version:'2.0'},scenes:[{nodes:[]}],scene:0}).padEnd(96,' '));const b=Buffer.alloc(20+json.length);b.writeUInt32LE(0x46546c67);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);
 const r=await parseDataOnly(b);assert.equal(r.gltf.scene.children.length,0);
 await assert.rejects(runPrivateAudit({directory:'.',calibrationFile:'unused',output:'public/private-audit'}),/outside the repository/);
});
test('rejected PR250 RAF change is excluded and the R5 static auto-invalidation contract is intact',()=>{
 const loop=fs.readFileSync(new URL('../src/scripts/shorekeeper/render-loop.mjs',import.meta.url));assert.equal(createHash('sha256').update(loop).digest('hex'),'93d7483b5dcd2c9ecf95ca102c08a8d787661d8c8753008b3ad07c9f3e91d7a6');
});
test('forensic world space includes a transformed model parent without changing the live rig',()=>{
 const {model,clip,calibration}=makeAuditFixture(),parent=new T.Group();parent.position.z=2;parent.rotation.y=.4;parent.add(model);
 const r=sampleSourceMotion(model,clip,{...identity,calibration});assert.ok(Math.abs(r.rows[0].bones.Root.worldPosition[2]-2)<1e-9);assert.ok(Math.abs(r.rows[0].bones.Root.yaw-(-Math.PI+.4))<1e-5);assert.equal(model.parent,parent);assert.equal(model.position.z,0);
});
test('200/1000ms drops retain source time and one mixer evaluation per presentation step',()=>{
 for(const fps of [60,30,15,5]){
  const {model,clip}=makeAuditFixture(),clock=createPresentationClock(),d=createOriginalIdleDirector(T,model,clip,{enter:.1,exit:.1});let now=0;clock.tick(now);d.start();
  for(let i=0;i<fps*6&&d.state.phase!=='idle';i++){now+=i===2?200:i===5?1000:1000/fps;const before=d.state.updates;d.advance(clock.tick(now));assert.equal(d.state.updates,before+1);}
  assert.equal(d.state.phase,'idle');assert.ok(now/1000>=3.2-1e-8&&now/1000<=3.2+1/fps+1e-8);d.dispose();
 }
});
