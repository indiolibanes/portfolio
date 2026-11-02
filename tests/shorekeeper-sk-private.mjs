// Manual CPU checks. Image decode is mocked; this is NOT WebGL or visual approval.
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import * as T from 'three';
import {createInspection} from '../src/scripts/shorekeeper/inspection.mjs';import {assertSelfContainedGLB,disposeObject,F16_HASH} from '../src/scripts/shorekeeper/local-model.mjs';
if(!process.argv[2])throw Error('Usage: node tests/shorekeeper-sk-private.mjs /private/model.glb');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),bytes=fs.readFileSync(process.argv[2]),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);assertSelfContainedGLB(buffer);
const g=await new GLTFLoader().parseAsync(buffer,''),inspect=createInspection(g.scene);g.scene.updateMatrixWorld(true);let samples=0,assignments=0;
for(const n of inspect.names){for(const w of [0,.25,.5,.75,1]){inspect.setMorph(n,w);assignments++;for(const m of inspect.morphMeshes){for(const i of [0,Math.floor(m.geometry.attributes.position.count/2),m.geometry.attributes.position.count-1]){const p=m.getVertexPosition(i,new T.Vector3());assert(p.toArray().every(Number.isFinite));samples++;}}}inspect.setMorph(n,0);}
const bone=inspect.bones.find(b=>/Head/.test(b.name));if(bone){inspect.rotate(bone,[0,10,0]);assert(inspect.boneInfo(bone).name===bone.name);inspect.restore();assert(inspect.restError()<1e-7);}
const second=await new GLTFLoader().parseAsync(buffer,'');const disposed=disposeObject(g.scene,inspect.extraMaterials);const other=createInspection(second.scene);assert.equal(other.bones.length,inspect.bones.length);const summary=other.summary();disposeObject(second.scene,other.extraMaterials);
console.log(JSON.stringify({sha256:crypto.createHash('sha256').update(bytes).digest('hex'),expectedHash:F16_HASH,summary,assignments,finiteVertexSamples:samples,reloadCPU:true,disposal:disposed,imageDecode:'MOCKED',webgl:'NOT_TESTED'},null,2));
