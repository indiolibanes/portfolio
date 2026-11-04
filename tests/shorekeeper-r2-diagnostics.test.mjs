import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectShorekeeperR2,onRequestGet} from '../functions/api/shorekeeper/diagnostics.js';

const model={key:'characters/shorekeeper/models/model.glb',name:'model.glb',sha256:'a'.repeat(64),bytes:39487548};
const libraries=['basic','advanced','burst'].map((id,i)=>({id,key:'characters/shorekeeper/animations/combat/'+id+'.glb',name:id+'.glb',sha256:(''+(i+1)).repeat(64),bytes:1000+i}));
const manifest={schema:'shorekeeper-private-assets/v1',model,libraries};
function fakeBucket({missingManifest=false,absent=[],wrongSize=[]}={}){
 const known=new Map([model,...libraries].map(entry=>[entry.key,entry.bytes]));
 return {
  async get(key){assert.equal(key,'characters/shorekeeper/manifests/current.json');return missingManifest?null:{size:1200,text:async()=>JSON.stringify(manifest)};},
  async head(key){assert.ok(known.has(key));if(absent.includes(key))return null;return {size:known.get(key)+(wrongSize.includes(key)?1:0)};}
 };
}
test('read-only diagnosis finds the exact manifest path and four objects',async()=>{
 const r=await inspectShorekeeperR2(fakeBucket());
 assert.equal(r.state,'all_objects_present');
 assert.equal(r.model,'present');
 assert.deepEqual(r.libraries.map(x=>[x.id,x.state]),[['basic','present'],['advanced','present'],['burst','present']]);
 assert.equal(r.allPresent,true);
 assert.ok(!JSON.stringify(r).includes('characters/shorekeeper'));
});
test('missing manifest is different from missing GLBs',async()=>{
 const empty=await inspectShorekeeperR2(fakeBucket({missingManifest:true}));
 assert.equal(empty.state,'manifest_missing');
 assert.deepEqual(empty.libraries,[]);
 const missing=await inspectShorekeeperR2(fakeBucket({absent:[model.key,libraries[2].key]}));
 assert.equal(missing.state,'objects_missing_or_mismatched');
 assert.equal(missing.model,'missing');
 assert.equal(missing.libraries[2].state,'missing');
});
test('wrong size cannot be reported as a valid asset',async()=>{
 const r=await inspectShorekeeperR2(fakeBucket({wrongSize:[libraries[1].key]}));
 assert.equal(r.allPresent,false);
 assert.equal(r.libraries[1].state,'size_mismatch');
});
test('missing Access configuration fails closed with no names or secrets',async()=>{
 const response=await onRequestGet({request:new Request('https://example.test/api/shorekeeper/diagnostics'),env:{}});
 assert.equal(response.status,503);
 assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 const body=await response.text();
 assert.match(body,/private_access_config_unavailable/);
 assert.ok(!body.includes('SK_ACCESS_AUD'));
});
test('invalid or absent JWT is rejected even if R2 binding is present',async()=>{
 const response=await onRequestGet({request:new Request('https://example.test/api/shorekeeper/diagnostics'),env:{
  SK_ACCESS_TEAM_DOMAIN:'https://test.cloudflareaccess.com',SK_ACCESS_AUD:'aaaaaaaaaaaaaaaaaaaa',
  SHOREKEEPER_ASSETS_R2:fakeBucket()
 }});
 assert.equal(response.status,403);
 const denied=await response.json();
 assert.equal(denied.state,'access_denied');
 assert.equal(denied.reason,'token_missing');
});

test('rejected JWT diagnostics provide hints but never bypass signature checks',async()=>{
 const payload=(obj)=>Buffer.from(JSON.stringify(obj)).toString('base64url');
 const now=Math.floor(Date.now()/1000);
 const domain='https://sk-private-test.cloudflareaccess.com',aud='f'.repeat(32);
 const badToken=(claims)=>payload({alg:'RS256',kid:'test'})+'.'+payload({
  iss:domain,aud:[aud],exp:now+3600,iat:now-5,...claims
 })+'.'+Buffer.from('unsigned').toString('base64url');
 const request=(token)=>new Request('https://example.test/api/shorekeeper/diagnostics',{
  headers:{'Cf-Access-Jwt-Assertion':token}
 });
 const env={SK_ACCESS_TEAM_DOMAIN:domain,SK_ACCESS_AUD:aud,SHOREKEEPER_ASSETS_R2:fakeBucket()};
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({keys:[]}),{status:200});
 try{
 const cases=[
  [badToken({aud:['0'.repeat(32)]}),'audience_mismatch'],
  [badToken({iss:'https://other.cloudflareaccess.com'}),'issuer_mismatch'],
  [badToken({exp:1}),'token_expired'],
  [badToken({}),'signature_or_public_key_failed'],
 ];
 for(const [token,reason] of cases){
  const response=await onRequestGet({request:request(token),env});
  assert.equal(response.status,403);
  const body=await response.json();
  assert.equal(body.state,'access_denied');
  assert.equal(body.reason,reason);
  assert.deepEqual(Object.keys(body).sort(),['reason','state']);
 }
 }finally{globalThis.fetch=originalFetch;}
});
