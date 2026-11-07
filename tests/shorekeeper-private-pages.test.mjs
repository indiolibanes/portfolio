import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest as duo} from '../functions/experimentos/duo/index.js';
import {onRequest as sk} from '../functions/experimentos/sk/index.js';

const makeContext=(method='GET',env={})=>{
 let downstream=0;
 return {
  ctx:{
   request:new Request('https://example.pages.dev/experimentos/duo/',{method}),
   env,
   next:async()=>{downstream++;return new Response('<h1>PRIVATE</h1>',{status:200,headers:{'Content-Type':'text/html'}});}
  },
  calls:()=>downstream
 };
};

for(const [name,gate] of [['duo',duo],['lab',sk]]){
 test(name+' HTML fails closed without Access/R2 bindings',async()=>{
  const c=makeContext();
  const r=await gate(c.ctx);
  assert.equal(r.status,503);
  assert.equal(c.calls(),0,'unauthorized requests must not reach static HTML');
  assert.match(r.headers.get('Cache-Control')??'',/no-store/);
  assert.match(r.headers.get('X-Robots-Tag')??'',/noindex/);
  assert.doesNotMatch(await r.text(),/PRIVATE/);
 });
 test(name+' HTML rejects unsigned Access assertions without rendering',async()=>{
  const c=makeContext('GET',{
   SHOREKEEPER_ASSETS_R2:{get:async()=>{throw Error('R2 must not be read during authorization');}},
   SK_ACCESS_TEAM_DOMAIN:'https://example.cloudflareaccess.com',
   SK_ACCESS_AUD:'a'.repeat(24)
  });
  c.ctx.request=new Request('https://example.pages.dev/experimentos/duo/',{headers:{'Cf-Access-Jwt-Assertion':'not-a-valid-jwt'}});
  const r=await gate(c.ctx);
  assert.equal(r.status,403);
  assert.equal(c.calls(),0);
  assert.match(r.headers.get('X-Robots-Tag')??'',/noindex/);
 });
}
