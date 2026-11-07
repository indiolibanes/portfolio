import test from 'node:test';import assert from 'node:assert/strict';
import {getPrivateFile} from '../src/scripts/shorekeeper/remote-private-model.mjs';
import {releaseDigest,CANONICAL_MODEL_SHA} from '../functions/_lib/shorekeeper-public.mjs';
import {onRequestHead as manifestHead} from '../functions/api/stage/shorekeeper/manifest.js';
test('verified downloader hands off original ArrayBuffer without wrapping/copying a File',async t=>{
 const buffer=new Uint8Array(32).buffer;const sha=Buffer.from(await crypto.subtle.digest('SHA-256',buffer)).toString('hex');
 t.mock.method(globalThis,'fetch',async()=>({ok:true,headers:new Headers({'Content-Type':'model/gltf-binary','Content-Length':'32','X-Asset-SHA256':sha}),arrayBuffer:async()=>buffer}));
 const entry={name:'test.glb',bytes:32,sha256:sha};assert.equal(await getPrivateFile(entry,{asBuffer:true}),buffer);
 const file=await getPrivateFile(entry);assert(file instanceof File);assert.equal(file.size,32);
});
test('wrong MIME and corruption fail before GLTF parsing',async t=>{
 const entry={name:'test.glb',bytes:32,sha256:'a'.repeat(64)};
 t.mock.method(globalThis,'fetch',async()=>new Response(new Uint8Array(32),{headers:{'Content-Type':'text/html','Content-Length':'32','X-Asset-SHA256':entry.sha256}}));
 await assert.rejects(getPrivateFile(entry,{asBuffer:true}),/MIME/);
 globalThis.fetch.mock.mockImplementation(async()=>new Response(new Uint8Array(32),{headers:{'Content-Type':'model/gltf-binary','Content-Length':'32','X-Asset-SHA256':entry.sha256}}));
 await assert.rejects(getPrivateFile(entry,{asBuffer:true}),/SHA-256/);
});
test('release digest changes for library ID/hash/key/size substitutions; HEAD closed without pin',async()=>{
 const m={schema:'shorekeeper-private-assets/v1',model:{key:'characters/shorekeeper/models/a.glb',name:'a.glb',bytes:39487548,sha256:CANONICAL_MODEL_SHA},libraries:['basic','advanced','burst'].map(id=>({id,key:'characters/shorekeeper/animations/combat/'+id+'.glb',name:id+'.glb',bytes:32,sha256:'a'.repeat(64)}))};
 const original=await releaseDigest(m);
 for(const [field,value] of [['key','characters/shorekeeper/animations/combat/replaced.glb'],['sha256','b'.repeat(64)],['bytes',33]]){const clone=structuredClone(m);clone.libraries[0][field]=value;assert.notEqual(await releaseDigest(clone),original);}
 const response=await manifestHead({env:{SK_PUBLIC_STAGE_ENABLED:'1',SHOREKEEPER_ASSETS_R2:{get(){throw Error('must not read');}}}});assert.equal(response.status,404);assert.equal(await response.text(),'');
});
