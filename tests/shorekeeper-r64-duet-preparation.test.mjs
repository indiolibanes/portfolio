import test from 'node:test';import assert from 'node:assert/strict';
import {prepareDuetModel} from '../src/scripts/shorekeeper/duet-model-preparation.mjs';
import {SHOREKEEPER_CANONICAL as C} from '../src/scripts/shorekeeper/private-model-cache.mjs';
import {canPlayDuetR6Expression} from '../src/scripts/shorekeeper/s6-duet-guest.mjs';
import {R6_PRIMARY_CHOICES} from '../src/scripts/shorekeeper/facial-unified-menu.mjs';
const manifest={schema:'shorekeeper-private-assets/v1',model:{name:'canonical.glb',bytes:C.bytes,sha256:C.sha256},libraries:[]};
const inspect=async()=>({state:'ready',manifest});const file=()=>new File([new Uint8Array([1,2,3,4])],'canonical.glb');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('duet permits all nine manual candidates and keeps invalid/automatic names out',()=>{
 assert.equal(R6_PRIMARY_CHOICES.length,9);for(const x of R6_PRIMARY_CHOICES)assert.equal(canPlayDuetR6Expression(x.id),true,x.id);
 assert.equal(canPlayDuetR6Expression('SURPRISE_SOFT'),false);assert.equal(canPlayDuetR6Expression('AUTO_R7'),false);
});
test('Access denial prevents IndexedDB reads and model requests',async()=>{
 let reads=0,requests=0;
 const p=prepareDuetModel({inspect:async()=>({state:'denied'}),readCache:async()=>{reads++;},fetchFile:async()=>{requests++;}});
 assert.deepEqual(await p.take(),{ready:false,state:'denied'});assert.equal(reads,0);assert.equal(requests,0);
});
test('canonical mismatch fails closed before any cache or asset access',async()=>{
 const p=prepareDuetModel({inspect:async()=>({state:'ready',manifest:{...manifest,model:{...manifest.model,sha256:'0'.repeat(64)}}}),readCache:()=>{throw Error('cache forbidden');},fetchFile:()=>{throw Error('asset forbidden');}});
 assert.deepEqual(await p.take(),{ready:false,state:'incomplete'});
});
test('one preparation has one consumer and exactly one model request, zero libraries',async()=>{
 let requests=0,clock=0;
 const p=prepareDuetModel({inspect,readCache:async()=>null,fetchFile:async(e,o)=>{requests++;assert.equal(o.kind,'model');return file();},now:()=>++clock});
 const first=p.take();assert.equal(await p.take(),null);assert.equal((await first).ready,true);assert.equal(requests,1);
 assert.equal(p.report().libraryRequests,0);assert.equal(p.report().modelRequests,1);assert.ok(p.report().timingsMs.bytesReady>0);
});
test('verified cache hit requires full digest after authorization and makes no network model request',async(t)=>{
 const events=[];t.mock.method(crypto.subtle,'digest',async()=>{events.push('digest');return Uint8Array.from(C.sha256.match(/../g),n=>parseInt(n,16)).buffer;});
 const p=prepareDuetModel({inspect:async()=>{events.push('authorize');return {state:'ready',manifest};},readCache:async()=>{events.push('cache');return {sha256:C.sha256,file:{size:C.bytes,arrayBuffer:async()=>new ArrayBuffer(C.bytes)}};},fetchFile:async()=>{throw Error('no download on verified hit');}});
 assert.equal((await p.take()).ready,true);assert.deepEqual(events,['authorize','cache','digest']);assert.equal(p.report().cache,'verified_hit');assert.equal(p.report().modelRequests,0);
});
test('corrupted cache falls back to the existing verified downloader once',async(t)=>{
 t.mock.method(crypto.subtle,'digest',async()=>new Uint8Array(32).buffer);let requests=0;
 const p=prepareDuetModel({inspect,readCache:async()=>({sha256:C.sha256,file:{size:C.bytes,arrayBuffer:async()=>new ArrayBuffer(C.bytes)}}),fetchFile:async()=>{requests++;return file();}});
 assert.equal((await p.take()).ready,true);assert.equal(p.report().cache,'invalid');assert.equal(requests,1);
});
test('aborts before, during and after acquisition cannot hand off bytes',async()=>{
 const a=new AbortController();a.abort();const before=prepareDuetModel({signal:a.signal,inspect:()=>{throw Error('must not run');}});assert.equal(await before.take(),null);
 let resolve;const waiting=prepareDuetModel({inspect:()=>new Promise(r=>{resolve=r;}),readCache:async()=>null,fetchFile:async()=>file()});const taken=waiting.take();waiting.dispose();resolve({state:'ready',manifest});assert.equal(await taken,null);
 const after=prepareDuetModel({inspect,readCache:async()=>null,fetchFile:async()=>file()});await tick();after.dispose();assert.equal(await after.take(),null);
 const lateSignal=new AbortController();const late=prepareDuetModel({signal:lateSignal.signal,inspect,readCache:async()=>null,fetchFile:async()=>file()});await tick();lateSignal.abort();assert.equal(await late.take(),null);
 const failed=prepareDuetModel({inspect,readCache:async()=>null,fetchFile:async()=>{throw Error('private server detail');}});assert.deepEqual(await failed.take(),{ready:false,state:'failed'});
});
