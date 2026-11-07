import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPrivateManifest} from '../src/scripts/shorekeeper/remote-private-model.mjs';
import {loadS6DuetGuest,S6_DUO_STATUS} from '../src/scripts/shorekeeper/s6-duet-guest.mjs';
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
test('Access redirect is authentication, never corrupt manifest; service and validation states stay distinct',async()=>{
 globalThis.fetch=async()=>({status:200,ok:true,redirected:true,url:'https://example.cloudflareaccess.com/cdn-cgi/access/login/preview',json(){throw Error('HTML must not be parsed');}});
 assert.equal((await inspectPrivateManifest()).state,'auth_redirect');
 assert.equal((await loadS6DuetGuest(null,null)).status,S6_DUO_STATUS.NO_ACCESS);
 for(const [response,status] of [[{status:503,ok:false},S6_DUO_STATUS.CONFIGURATION],[{status:404,ok:false},S6_DUO_STATUS.MISSING],[{status:200,ok:true,json:async()=>({schema:'wrong'})},S6_DUO_STATUS.INVALID]]){
  globalThis.fetch=async()=>response;const guest=await loadS6DuetGuest(null,null);assert.equal(guest.status,status);assert.equal(guest.ready,false);guest.advance();guest.dispose();
 }
 for(const [state,status,reason] of [['failed',S6_DUO_STATUS.FAILED,'DOWNLOAD_OR_INTEGRITY'],['incomplete',S6_DUO_STATUS.INCOMPLETE,null]]){
  const guest=await loadS6DuetGuest(null,null,{experimentalR6:true,preparation:{take:async()=>({ready:false,state})}});assert.equal(guest.status,status);assert.equal(guest.reason,reason);
 }
});
