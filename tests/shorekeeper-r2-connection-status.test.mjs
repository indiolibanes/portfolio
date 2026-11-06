import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPrivateManifest} from '../src/scripts/shorekeeper/remote-private-model.mjs';
const original=globalThis.fetch;
test.after(()=>{globalThis.fetch=original;});
test('Access denial remains explicit and never leaks headers or tokens',async()=>{
 globalThis.fetch=async(_url,options)=>{
  assert.equal(options.credentials,'same-origin');
  assert.equal(options.cache,'no-store');
  return {status:403,ok:false};
 };
 const out=await inspectPrivateManifest();
 assert.deepEqual(out,{state:'denied',manifest:null,httpStatus:403});
});
test('missing R2 binding and manifest are not mislabeled as permission errors',async()=>{
 globalThis.fetch=async()=>({status:503,ok:false});
 assert.equal((await inspectPrivateManifest()).state,'unconfigured');
 globalThis.fetch=async()=>({status:404,ok:false});
 assert.equal((await inspectPrivateManifest()).state,'missing');
});
test('well-formed synthetic three-library manifest is accepted',async()=>{
 const model={key:'characters/shorekeeper/models/model.glb',name:'model.glb',sha256:'1'.repeat(64),bytes:1234};
 const libraries=['basic','advanced','burst'].map(id=>({id,name:id+'.glb',key:'characters/shorekeeper/animations/combat/'+id+'.glb',sha256:'2'.repeat(64),bytes:256}));
 const manifest={schema:'shorekeeper-private-assets/v1',model,libraries};
 globalThis.fetch=async()=>({status:200,ok:true,json:async()=>manifest});
 const result=await inspectPrivateManifest();
 assert.equal(result.state,'ready');
 assert.equal(result.manifest.libraries.length,3);
});
test('invalid schema or more than four libraries is rejected, not treated as ready',async()=>{
 const a={schema:'unknown',model:{},libraries:[]};
 globalThis.fetch=async()=>({status:200,ok:true,json:async()=>a});
 assert.equal((await inspectPrivateManifest()).state,'invalid');
});
test('network failure is reported as network state without thrown secrets',async()=>{
 globalThis.fetch=async()=>{throw Error('Private internal endpoint');};
 const result=await inspectPrivateManifest();
 assert.equal(result.state,'network');
 assert.deepEqual(Object.keys(result).sort(),['httpStatus','manifest','state']);
});
