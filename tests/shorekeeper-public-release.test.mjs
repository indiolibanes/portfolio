import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RELEASE_SCHEMA,CANONICAL_MODEL_SHA,releaseEnabled,publicReleaseManifest,releaseEntry} from '../functions/_lib/shorekeeper-public.mjs';
import {onRequestGet as manifestGet} from '../functions/api/stage/shorekeeper/manifest.js';
import {onRequestGet as assetGet,onRequestHead as assetHead} from '../functions/api/stage/shorekeeper/asset.js';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manifest={
 schema:'shorekeeper-private-assets/v1',
 model:{key:'characters/shorekeeper/models/shorekeeper-v1.glb',name:'shorekeeper-v1.glb',bytes:39487548,sha256:CANONICAL_MODEL_SHA},
 libraries:['basic','advanced','burst'].map((id,i)=>({
  id,key:'characters/shorekeeper/animations/combat/'+id+'.glb',name:id+'.glb',
  bytes:22+i,sha256:('a'+i).repeat(64)
 }))
};
const body=new TextEncoder().encode(JSON.stringify(manifest));
function fixture(active=true){
 const objects=new Map([[ 'characters/shorekeeper/manifests/current.json',{size:body.byteLength,async text(){return new TextDecoder().decode(body)}} ]]);
 for(const lib of manifest.libraries)objects.set(lib.key,{size:lib.bytes,body:new ReadableStream({start(controller){controller.enqueue(new Uint8Array(lib.bytes));controller.close()}})});
 objects.set(manifest.model.key,{size:manifest.model.bytes,body:new ReadableStream({start(controller){controller.close()}})});
 let reads=0;
 const bucket={async get(key){reads++;return objects.get(key)??null;},async head(key){reads++;const value=objects.get(key);return value?{size:value.size}:null;}};
 return {env:{SK_PUBLIC_STAGE_ENABLED:active?'1':'0',SHOREKEEPER_ASSETS_R2:bucket},get reads(){return reads;}};
}
test('public release is fail-closed without exact environment opt-in',async()=>{
 const f=fixture(false);
 assert.equal(releaseEnabled(f.env),false);
 assert.equal((await manifestGet({env:f.env})).status,404);
 assert.equal((await assetGet({env:f.env,request:new Request('https://stage.example/api/stage/shorekeeper/asset?kind=model&v='+CANONICAL_MODEL_SHA)})).status,404);
 assert.equal(f.reads,0,'disabled public release must not touch R2');
});
test('read-only release manifest drops R2 paths and internal source filenames',async()=>{
 const f=fixture(),res=await manifestGet({env:f.env});
 assert.equal(res.status,200);
 assert.equal(res.headers.get('Cache-Control').includes('max-age=60'),true);
 const data=await res.json();
 assert.equal(data.schema,RELEASE_SCHEMA);
 assert.equal(data.model.name,'shorekeeper-main.glb');
 assert.equal(data.model.sha256,CANONICAL_MODEL_SHA);
 assert.equal(data.libraries.length,3);
 assert(!JSON.stringify(data).includes('characters/shorekeeper'));
 assert(!JSON.stringify(data).includes('PRIVATE_'));
 assert(!JSON.stringify(data).includes('key'));
 assert.equal(publicReleaseManifest(manifest).schema,RELEASE_SCHEMA);
});
test('version-pinned allowlist permits only published R2 objects',async()=>{
 const f=fixture(),u='https://stage.example/api/stage/shorekeeper/asset';
 const wrong=await assetGet({env:f.env,request:new Request(u+'?kind=model&v='+('f'.repeat(64)))});
 assert.equal(wrong.status,404);
 const arbitrary=await assetGet({env:f.env,request:new Request(u+'?kind=../../../secret&v='+CANONICAL_MODEL_SHA)});
 assert.equal(arbitrary.status,404);
 assert.equal(releaseEntry(manifest,{kind:'model',version:CANONICAL_MODEL_SHA}),manifest.model);
 const head=await assetHead({env:f.env,request:new Request(u+'?kind=model&v='+CANONICAL_MODEL_SHA,{method:'HEAD'})});
 assert.equal(head.status,200);
 assert.equal(head.headers.get('Content-Length'),'39487548');
 assert.match(head.headers.get('Cache-Control'),/immutable/);
 assert.equal(head.headers.get('X-Asset-SHA256'),CANONICAL_MODEL_SHA);
 assert.equal(head.headers.get('Content-Disposition'),'inline; filename="shorekeeper-main.glb"');
 const lib=manifest.libraries[0];
 const res=await assetGet({env:f.env,request:new Request(u+'?kind=library&id=basic&v='+lib.sha256)});
 assert.equal(res.status,200);
 assert.equal((await res.arrayBuffer()).byteLength,lib.bytes);
 assert.equal(res.headers.get('Content-Type'),'model/gltf-binary');
});
test('mismatched canonical model fails closed; private endpoints remain Access-protected',async()=>{
 const tampered={...manifest,model:{...manifest.model,bytes:100}};
 assert.throws(()=>publicReleaseManifest(tampered));
 assert.match(src('functions/api/shorekeeper/manifest.js'),/checkPrivateAccess/);
 assert.match(src('functions/api/shorekeeper/asset.js'),/checkPrivateAccess/);
});
test('public stage is separate from internal QA and never displays backend details',()=>{
 const publicPage=src('src/pages/experimentos/palco/index.astro');
 const stage=src('src/scripts/hsin-stage.ts');
 const remote=src('src/scripts/shorekeeper/remote-private-model.mjs');
 assert.match(publicPage,/data-public-stage="true"/);
 assert.match(stage,/publicRelease=duetRequested&&root\.dataset\.publicStage==='true'/);
 assert.match(stage,/releaseSource:publicRelease\?'public':'private'/);
 assert.match(remote,/shorekeeper-stage-assets\/v1/);
 assert.match(remote,/source==='public'\?'default':'no-store'/);
 assert(!/Cloudflare Access|private R2|acervo privado|armazenamento separado|private shared-stage/.test(publicPage));
 assert.match(src('src/pages/experimentos/index.astro'),/Hsin/,'original public route remains unchanged until QA');
});
