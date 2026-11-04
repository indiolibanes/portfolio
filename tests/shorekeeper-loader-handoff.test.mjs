import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createLocalLoader} from '../src/scripts/shorekeeper/local-model.mjs';

function buffer() {
 const raw=Buffer.from(JSON.stringify({asset:{version:'2.0'}}));
 const json=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]),out=Buffer.alloc(20+json.length);
 out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.write('JSON',16);json.copy(out,20);
 return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength);
}
function fixture() {
 const scene=new T.Group(),geometry=new T.BufferGeometry(),material=new T.MeshBasicMaterial();
 scene.add(new T.Mesh(geometry,material));const counts={geometry:0,material:0};
 geometry.addEventListener('dispose',()=>counts.geometry++);material.addEventListener('dispose',()=>counts.material++);
 return {gltf:{scene,animations:[]},counts};
}
const file={size:100};
const options=parse=>({read:async()=>buffer(),hash:async()=>'fixture',parse});

test('cancelling at pre-parse progress does not start GLTF parsing',async()=>{
 let parsed=0;const loader=createLocalLoader(options(async()=>{parsed++;return fixture().gltf;}));
 assert.equal(await loader.load(file,p=>{if(p.value===.85)loader.cancel();}),null);
 assert.equal(parsed,0);
});
test('cancelling at completion releases the unadopted scene exactly once',async()=>{
 const {gltf,counts}=fixture(),loader=createLocalLoader(options(async()=>gltf));
 assert.equal(await loader.load(file,p=>{if(p.value===1)loader.cancel();}),null);
 assert.deepEqual(counts,{geometry:1,material:1});loader.cancel();
 assert.deepEqual(counts,{geometry:1,material:1});
});
test('throwing completion observer releases the scene and preserves the error',async()=>{
 const {gltf,counts}=fixture(),loader=createLocalLoader(options(async()=>gltf)),error=new Error('observer failed');
 await assert.rejects(loader.load(file,p=>{if(p.value===1)throw error;}),e=>e===error);
 assert.deepEqual(counts,{geometry:1,material:1});
});
test('successful handoff leaves disposal to the consumer',async()=>{
 const {gltf,counts}=fixture(),loader=createLocalLoader(options(async()=>gltf));
 assert.equal((await loader.load(file)).gltf,gltf);loader.cancel();
 assert.deepEqual(counts,{geometry:0,material:0});
});
test('replacement load from completion cannot receive or dispose its predecessor resources',async()=>{
 const old=fixture(),fresh=fixture();let parsed=0,next;
 const loader=createLocalLoader(options(async()=>parsed++?fresh.gltf:old.gltf));
 const result=await loader.load(file,p=>{if(p.value===1)next=loader.load(file);});
 assert.equal(result,null);assert.equal((await next).gltf,fresh.gltf);
 assert.deepEqual(old.counts,{geometry:1,material:1});assert.deepEqual(fresh.counts,{geometry:0,material:0});
});
test('cancellation during an asynchronous parse disposes only its own result',async()=>{
 const {gltf,counts}=fixture();let resolveParse,started;
 const ready=new Promise(resolve=>{started=resolve;});
 const loader=createLocalLoader(options(()=>new Promise(resolve=>{resolveParse=resolve;started();})));
 const result=loader.load(file);await ready;loader.cancel();resolveParse(gltf);
 assert.equal(await result,null);assert.deepEqual(counts,{geometry:1,material:1});
});
