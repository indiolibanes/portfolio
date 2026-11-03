import assert from 'node:assert/strict';
import {onRequestGet,onRequestHead,SHOREKEEPER_MODEL_KEY,SHOREKEEPER_MODEL_SHA256,SHOREKEEPER_MODEL_SIZE} from '../functions/api/shorekeeper/model.js';
const body=new Uint8Array([1,2,3]);
let requests=[];
const object={size:SHOREKEEPER_MODEL_SIZE,httpEtag:'"r2-test"',body};
const bucket={
 async head(key){requests.push(['head',key]);return object;},
 async get(key){requests.push(['get',key]);return object;}
};
const disabled={env:{SHOREKEEPER_ASSETS_R2:bucket,SHOREKEEPER_MODEL_PUBLIC:'false'}};
assert.equal((await onRequestGet(disabled)).status,404);
assert.equal((await onRequestHead(disabled)).status,404);
assert.equal(requests.length,0,'Disabled feature must not access private bucket');
const ctx={env:{SHOREKEEPER_ASSETS_R2:bucket,SHOREKEEPER_MODEL_PUBLIC:'true'}};
const h=await onRequestHead(ctx);
assert.equal(h.status,200);
assert.equal(h.headers.get('Content-Type'),'model/gltf-binary');
assert.equal(Number(h.headers.get('Content-Length')),SHOREKEEPER_MODEL_SIZE);
assert.equal(h.headers.get('X-Asset-SHA256'),SHOREKEEPER_MODEL_SHA256);
const g=await onRequestGet(ctx);
assert.equal(g.status,200);
assert.deepEqual([...new Uint8Array(await g.arrayBuffer())],[1,2,3]);
assert.deepEqual(requests,[['head',SHOREKEEPER_MODEL_KEY],['get',SHOREKEEPER_MODEL_KEY]]);
const invalid={env:{SHOREKEEPER_MODEL_PUBLIC:'true',SHOREKEEPER_ASSETS_R2:{head:async()=>({size:12}),get:async()=>({size:12,body})}}};
assert.equal((await onRequestHead(invalid)).status,409);
assert.equal((await onRequestGet(invalid)).status,409);
const missing={env:{SHOREKEEPER_MODEL_PUBLIC:'true',SHOREKEEPER_ASSETS_R2:{head:async()=>null,get:async()=>null}}};
assert.equal((await onRequestHead(missing)).status,404);
assert.equal((await onRequestGet(missing)).status,404);
console.log('Shorekeeper hosted asset: opt-in, exact model manifest, R2 stream, missing/mismatched payload PASS');
