// Reads a local canonical file; never uploads it. Image decoding is mocked: no visual evidence.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {facialGeometryInventory} from '../../src/scripts/shorekeeper/mouth-forensics.mjs';
import {GLB_SHA256} from '../../src/scripts/shorekeeper/shorekeeper-face-expressions.mjs';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/qa/audit-shorekeeper-mouth.mjs LOCAL.glb PRIVATE-output.json');
const repo=path.resolve(fileURLToPath(new URL('../../',import.meta.url))),dest=path.resolve(output);if(dest===repo||dest.startsWith(repo+path.sep))throw Error('Private report must be outside repository');
const b=fs.readFileSync(input),sha=createHash('sha256').update(b).digest('hex');if(sha!==GLB_SHA256)throw Error('Canonical GLB hash mismatch');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const inventory=facialGeometryInventory(gltf.scene),weights=gltf.animations.flatMap(a=>a.tracks.filter(t=>t.name.includes('morphTargetInfluences')).map(t=>({clip:a.name,track:t.name})));
fs.writeFileSync(output,JSON.stringify({sha256:sha,bytes:b.length,textureDecode:'MOCKED_NOT_RENDERED',...inventory,weightTracks:weights},null,2));
console.log(JSON.stringify({sha256:sha,bytes:b.length,bones:inventory.bones,morphInstances:inventory.morphInstances,uniqueMorphNames:inventory.uniqueMorphNames,weightTracks:weights.length,visualQA:'B_VISUAL_QA_PENDING'}));
