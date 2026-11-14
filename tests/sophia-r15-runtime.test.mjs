import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{parseGLB,readAccessor,Skeleton}from'../public/experimental/gltf-skel.js';
import{makeMorphChannel,updateMorphChannel}from'../public/experimental/gltf-morph.js';
import{browserFixture,ActorElement,flush,fakeGL}from'./sophia-r15-fixture.mjs';
const bytes=fs.readFileSync(process.env.SOPHIA_R15_MODEL || 'public/assets/models/sophia/sophia-lab.glb'),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{json,bin}=parseGLB(buffer);
test('sparse overrides a dense normalized base, including subarray offsets',()=>{
 const data=Buffer.from([99,99,0,128,255,1,64,99]),g={bufferViews:[{byteOffset:0,byteLength:3},{byteOffset:3,byteLength:1},{byteOffset:4,byteLength:1}],accessors:[{bufferView:0,type:'SCALAR',componentType:5121,normalized:true,count:3,sparse:{count:1,indices:{bufferView:1,componentType:5121},values:{bufferView:2}}}]};
 const a=readAccessor(g,new Uint8Array(data.buffer,data.byteOffset+2,5),0);assert.deepEqual(Array.from(a),[0,64/255,1].map(Math.fround));
});
test('all 48 actual body morph slots and actor palettes remain independent',()=>{
 const a=new Skeleton(json,bin),b=new Skeleton(json,bin);assert.equal(a.joints.length,90);assert.equal(a.clips,b.clips);assert.equal(a.nodeMorph[92].length,48);assert.notEqual(a.nodeMorph[92],b.nodeMorph[92]);
 const clips=['Sophia_Expr_Feliz_R6','Sophia_Expr_Triste_R6','Correr_R6','Danca_R6'];
 for(const name of clips){a.evaluate([{clip:a.clips[name],time:.6,weight:1}]);const snapshot=b.nodeMorph[92].slice();a.nodeMorph[92][0]=.123;assert.deepEqual(b.nodeMorph[92],snapshot)}
 let max=0;
 for(const prim of json.meshes[2].primitives){const c=makeMorphChannel(json,bin,prim,'POSITION');assert.ok(c);const base=readAccessor(json,bin,prim.attributes.POSITION);
  for(let k=0;k<48;k++){const w=new Float32Array(48);w[k]=.73;updateMorphChannel(c,w);const delta=readAccessor(json,bin,prim.targets[k].POSITION);for(let v=0;v<base.length;v++)max=Math.max(max,Math.abs(c.cur[v]-Math.fround(base[v]+delta[v]*w[k])));updateMorphChannel(c,new Float32Array(48));assert.deepEqual(c.cur,base)}
 }
 assert.ok(max<1e-6,'real morph delta drift '+max);
});
test('four actual actors resume from DecorativeMotion, keep per-node morphs and clean up',async()=>{
 const els=[new ActorElement('runner','Correr_R6'),new ActorElement('lab','Sophia_ExpressionFlow_R6'),new ActorElement('portrait','Sophia_Expr_Triste_R6'),new ActorElement('mascot','Sophia_Expr_Feliz_R6')];const f=browserFixture(els);let fetches=0;globalThis.fetch=async()=>{fetches++;return new Response(bytes)};
 const mod=await import('../public/experimental/sophia-actor.js?r15-api-qa');assert.equal(fetches,0);f.ios[0].trigger(true);await flush();assert.equal(fetches,1);assert.equal(f.glCanvases,1);
 const actors=els.map(mod.actorOf);assert.ok(actors.every(Boolean));assert.equal(new Set(actors.map(a=>a.sk)).size,4);assert.ok(els.every(e=>e.children.length===1));f.pump(1000);f.pump(1034);assert.ok(actors.every(a=>a.ctx.draws>=2));
 const motion=f.mos.find(m=>m.opts?.attributeFilter?.includes('data-motion-playing'));for(const e of els)e.motion.dataset.motionPlaying='false';motion.cb([]);assert.equal(f.rafs.size,0);const before=actors.map(a=>a.ctx.draws);for(const e of els)e.motion.dataset.motionPlaying='true';motion.cb([]);assert.equal(f.rafs.size,1);f.pump(1100);assert.ok(actors.every((a,i)=>a.ctx.draws>before[i]));
 const a=actors[2];a.sk.nodeMorph[90][0]=.25;a.sk.nodeMorph[91][0]=.8;const start=f.gl.calls.length;a.draw();const draws=f.gl.calls.slice(start),model=a.stage.model;for(const ni of[90,91]){const d=model.draws.find(d=>d.node===ni),call=draws.find(x=>x.vao===d.vao);assert.equal(call.morph[0],a.sk.nodeMorph[ni][0]);assert.equal(call.blend,1)}
 let error;a.el.addEventListener('sophia:actor-error',e=>error=e.detail);a.setClip('DOES_NOT_EXIST');assert.equal(error.code,'MISSING_CLIP');assert.equal(a.clipName,mod.MOODS.idle.clip);for(let i=0;i<30;i++)a.setClip(i%2?mod.MOODS.idle.clip:mod.MOODS.over.clip);assert.ok(a.layers.length<=2);
 f.media.matches=true;f.media.dispatchEvent(new Event('change'));assert.equal(f.rafs.size,0);assert.ok(els.every(e=>e.dataset.sophia3d==='off'));f.media.matches=false;f.media.dispatchEvent(new Event('change'));f.pump(1200);
 f.connection.saveData=true;f.connection.dispatchEvent(new Event('change'));assert.equal(f.rafs.size,0);f.connection.saveData=false;f.connection.dispatchEvent(new Event('change'));
 f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));assert.equal(f.rafs.size,0);f.document.hidden=false;f.document.dispatchEvent(new Event('visibilitychange'));f.pump(1300);
 const oldStage=actors[0].stage;oldStage.renderer.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));assert.equal(f.rafs.size,0);assert.ok(els.every(e=>e.dataset.sophia3d==='off'));oldStage.renderer.canvas.dispatchEvent(new Event('webglcontextrestored'));await flush();assert.equal(fetches,1);assert.equal(f.glCanvases,2);assert.ok(els.every(e=>e.children.length===1&&e.dataset.sophia3d==='on'));assert.notEqual(mod.actorOf(els[0]).stage,oldStage);
 const bfcache=new Event('pagehide');Object.defineProperty(bfcache,'persisted',{value:true});f.window.dispatchEvent(bfcache);assert.equal(f.rafs.size,0);assert.ok(mod.actorOf(els[0]));const back=new Event('pageshow');Object.defineProperty(back,'persisted',{value:true});f.window.dispatchEvent(back);assert.equal(f.rafs.size,1);
 f.window.dispatchEvent(new Event('pagehide'));await flush();assert.ok(els.every(e=>e.children.length===0));assert.equal(f.rafs.size,0);assert.ok([...f.gl.buffers.keys()].every(b=>f.gl.deleted.has(b)));
});

test('failed decode cannot allocate late textures after renderer disposal',async()=>{
 const f=browserFixture([]);let calls=0,closed=0;globalThis.createImageBitmap=async()=>{if(calls++===0)throw Error('decode failed');await new Promise(r=>setImmediate(r));return{width:2,height:2,close(){closed++}}};
 const{Renderer}=await import('../public/experimental/gltf-gl.js');const r=new Renderer(document.createElement('canvas'));await assert.rejects(r.loadModel(buffer),/decode failed/);r.dispose();await flush();assert.equal(r.textures.size,0);assert.ok(closed>0);
});
