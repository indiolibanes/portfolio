// Private structural runtime test. Texture decoding is mocked; no WebGL or visual QA.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import * as T from 'three';
import {validateCombatLibrary,createCombatDirector,ORIGINAL_ATTACK_IDS} from '../src/scripts/shorekeeper/combat-director.mjs';
import {disposeObject,assertSelfContainedGLB} from '../src/scripts/shorekeeper/local-model.mjs';
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
async function load(p){const b=fs.readFileSync(p),bytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),json=assertSelfContainedGLB(bytes);return {json,gltf:await new GLTFLoader().parseAsync(bytes,'')};}
if(!process.argv[2]||!process.argv[3])throw Error('Usage: node tests/shorekeeper-combat-private.mjs PRIVATE_MODEL PRIVATE_LIBRARIES');
const model=await load(process.argv[2]),bones=[];model.gltf.scene.traverse(o=>{if(o.isBone)bones.push(o)});assert.equal(bones.length,249);
const initial=bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);const clips=[];
for(const id of ORIGINAL_ATTACK_IDS){const lib=await load(path.join(process.argv[3],id+'.animations.glb'));const loaded=validateCombatLibrary(T,model.gltf.scene,lib);assert.equal(loaded.length,3);for(const c of loaded)assert.equal(c.tracks.length,729);clips.push(...loaded);disposeObject(lib.gltf.scene);}
let updates=0;const d=createCombatDirector(T,model.gltf.scene,clips,{enter:.1,exit:.2,mixerFactory:r=>{const m=new T.AnimationMixer(r),update=m.update.bind(m);m.update=dt=>{updates++;return update(dt)};return m;}});
for(const id of ORIGINAL_ATTACK_IDS){assert(d.playAttack(id));assert.equal(d.playAttack(id),false);d.advance(.1);d.advance(.2);d.pause();const clock=d.getState().animation.clock, count=updates;d.advance(5);assert.equal(d.getState().animation.clock,clock);assert.equal(updates,count);d.resume();d.interrupt();for(let i=0;i<7;i++)d.advance(.05);assert.equal(d.getState().animation.phase,'idle');assert(d.playAttack(id));for(let t=0;t<8;t+=.05)d.advance(.05);assert.equal(d.getState().animation.phase,'idle');}
let maxError=0;bones.forEach((b,i)=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()].forEach((v,j)=>{assert(Number.isFinite(v));maxError=Math.max(maxError,Math.abs(v-initial[i][j]));}));assert(maxError<1e-7);d.dispose();disposeObject(model.gltf.scene);
console.log(JSON.stringify({three:T.REVISION,bones:bones.length,clips:clips.length,restMaxError:maxError,updates,webgl:'NOT_TESTED',textureDecode:'MOCKED'}));
