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
 assert.equal((await response.json()).state,'access_denied');
});
