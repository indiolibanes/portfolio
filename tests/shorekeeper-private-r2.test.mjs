import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {validateManifest,verifyAccessJwt,normalizeAccessTeamDomain,MANIFEST_KEY} from '../functions/_lib/shorekeeper-private.mjs';
import {onRequestGet as manifestGet} from '../functions/api/shorekeeper/manifest.js';
import {onRequestGet as assetGet,onRequestHead as assetHead} from '../functions/api/shorekeeper/asset.js';
const domain='https://sk-private-test.cloudflareaccess.com',aud='f'.repeat(32);
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'test-key',alg:'RS256',use:'sig'};
const encode=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
function token(claims={}){
 const now=Math.floor(Date.now()/1000),h=encode({alg:'RS256',kid:'test-key'}),p=encode({iss:domain,aud:[aud],exp:now+900,iat:now-10,...claims});
 const input=h+'.'+p;
 return input+'.'+sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url');
}
const keyFetch=async()=>new Response(JSON.stringify({keys:[jwk]}),{status:200});
const model={key:'characters/shorekeeper/models/shorekeeper-f20a-abcdefabcdefabcd.glb',name:'shorekeeper-f20a-abcdefabcdefabcd.glb',bytes:24,sha256:'a'.repeat(64)};
const lib={id:'combat',key:'characters/shorekeeper/animations/combat/combat-abcdefabcdefabcd.glb',name:'combat-abcdefabcdefabcd.glb',bytes:24,sha256:'b'.repeat(64)};
const manifest={schema:'shorekeeper-private-assets/v1',updatedAt:'2026-11-03T00:00:00.000Z',model,libraries:[lib]};
function bucket(){
 const bytes=new Uint8Array(24);bytes[0]=103;bytes[1]=108;bytes[2]=84;bytes[3]=70;
 return {get:async key=>{
  if(key===MANIFEST_KEY)return {size:JSON.stringify(manifest).length,text:async()=>JSON.stringify(manifest)};
  if(key===model.key||key===lib.key)return {size:24,body:new Blob([bytes]).stream()};
  return null;
 },head:async key=>key===model.key||key===lib.key?{size:24}:null};
}
const env={SHOREKEEPER_ASSETS_R2:bucket(),SK_ACCESS_TEAM_DOMAIN:domain,SK_ACCESS_AUD:aud};
const req=(path,t)=>new Request('https://kaue.pages.dev'+path,{headers:t?{'Cf-Access-Jwt-Assertion':t}:{}});
test('R2 manifest rejects traversal, unknown hashes, duplicates and overlimit',()=>{
 assert.equal(validateManifest(manifest),manifest);
 assert.throws(()=>validateManifest({...manifest,model:{...model,key:'../secret.glb'}}));
 assert.throws(()=>validateManifest({...manifest,model:{...model,sha256:'123'}}));
 assert.throws(()=>validateManifest({...manifest,libraries:[lib,lib]}));
 assert.throws(()=>validateManifest({...manifest,libraries:Array(5).fill(lib)}));
});
test('Access JWT validates RS256, issuer, audience and expiration',async()=>{
 const good=token();
 assert.equal(await verifyAccessJwt(good,domain,aud,keyFetch),true);
 assert.equal(await verifyAccessJwt(token({exp:Math.floor(Date.now()/1000)+3*86400}),domain,aud,keyFetch),true,'Cloudflare-signed 72-hour application sessions are valid');
 assert.equal(await verifyAccessJwt(token({aud:['x'.repeat(32)]}),domain,aud,keyFetch),false);
 assert.equal(await verifyAccessJwt(token({iss:'https://other.cloudflareaccess.com'}),domain,aud,keyFetch),false);
 assert.equal(await verifyAccessJwt(token({exp:1}),domain,aud,keyFetch),false);
 assert.equal(await verifyAccessJwt(good.slice(0,-3)+'aaa',domain,aud,keyFetch),false);
 assert.equal(await verifyAccessJwt(good,'https://evil.invalid',aud,keyFetch),false);
});
test('only HTTPS Cloudflare Access team origins are accepted and normalized',()=>{
 const host='sk-private-test.cloudflareaccess.com';
 for(const input of [
  host,'https://'+host,'https://'+host+'/',"  \"https://"+host+"/\"  ",
  host+'/',host.toUpperCase()
 ])assert.equal(normalizeAccessTeamDomain(input),domain);
 for(const invalid of [
  null,'', 'sk-private-test','http://'+host,'https://'+host+'/cdn-cgi/access',
  'https://'+host+'@evil.test','https://evil.test','https://'+host+'?token=x',
  'https://sub.'+host,'https://'+host+'.evil.test','https://'+host+'/#fragment'
 ])assert.equal(normalizeAccessTeamDomain(invalid),null);
});
test('valid Access JWT signature is still required after origin normalization',async()=>{
 const jwt=token();
 for(const input of [domain,domain+'/',domain.replace('https://',''),"  '"+domain+"/'  "])
  assert.equal(await verifyAccessJwt(jwt,input,aud,keyFetch),true);
 assert.equal(await verifyAccessJwt(jwt.slice(0,-4)+'abcd',domain+'/',aud,keyFetch),false);
});
test('Endpoints fail closed without binding, Access vars or JWT',async()=>{
 assert.equal((await manifestGet({request:req('/api/shorekeeper/manifest'),env})).status,403);
 assert.equal((await assetGet({request:req('/api/shorekeeper/asset?kind=model'),env})).status,403);
 assert.equal((await manifestGet({request:req('/api/shorekeeper/manifest',token()),env:{SHOREKEEPER_ASSETS_R2:bucket()}})).status,503);
});
test('Authenticated manifest and models remain private and no-store',async()=>{
 assert.equal(await verifyAccessJwt(token(),domain,aud,keyFetch),true);
 const m=await manifestGet({request:req('/api/shorekeeper/manifest',token()),env});
 assert.equal(m.status,200);assert.equal(m.headers.get('Cache-Control'),'private, no-store');
 assert.equal((await m.json()).model.key,model.key);
 const h=await assetHead({request:req('/api/shorekeeper/asset?kind=model',token()),env});
 assert.equal(h.status,200);assert.equal(h.headers.get('X-Asset-SHA256'),model.sha256);
 const data=await assetGet({request:req('/api/shorekeeper/asset?kind=library&id=combat',token()),env});
 assert.equal(data.status,200);assert.equal((await data.arrayBuffer()).byteLength,24);
 assert.equal((await assetGet({request:req('/api/shorekeeper/asset?kind=library&id=..',token()),env})).status,404);
});
