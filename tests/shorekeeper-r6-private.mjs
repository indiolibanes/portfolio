/** Optional private canonical-asset integration check. MODEL [OUTPUT_JSON]; no raw buffers exported. */
import fs from 'node:fs/promises';import crypto from 'node:crypto';import assert from 'node:assert/strict';import * as T from 'three';
import {loadPrivateCpuGLB} from '../scripts/shorekeeper/private-cpu-loader.mjs';import {createInspection} from '../src/scripts/shorekeeper/inspection.mjs';
import {createAnatomicalFaceDirector,R6_CANDIDATES} from '../src/scripts/shorekeeper/anatomical-face.mjs';import {createOriginalIdleDirector} from '../src/scripts/shorekeeper/original-idle-director.mjs';
const [input,out]=process.argv.slice(2);if(!input)throw Error('MODEL [OUTPUT_JSON]');const {gltf,sha256}=await loadPrivateCpuGLB(input);assert.equal(sha256,'4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30');
const model=gltf.scene,inspection=createInspection(model);const hash=()=>{const h=crypto.createHash('sha256');model.traverse(o=>{for(const a of [...Object.values(o.geometry?.attributes??{}),...Object.values(o.geometry?.morphAttributes??{}).flat(),o.geometry?.index].filter(Boolean))h.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));});return h.digest('hex');};
const materials=()=>{const a=[];model.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])a.push(m.toJSON());});return JSON.stringify(a);};
const buffersBefore=hash(),materialsBefore=materials(),clipsBefore=JSON.stringify(gltf.animations.map(c=>c.toJSON()));
const bones=[];model.traverse(o=>{if(o.isBone)bones.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()});});assert.equal(bones.length,249);
const results=[];
for(let cycle=0;cycle<3;cycle++){
 const face=createAnatomicalFaceDirector(inspection);
 for(const [j,clip]of gltf.animations.filter(c=>/^SK_IDLE_0[123]_ORIGINAL$/.test(c.name)).entries()){
  assert(!clip.tracks.some(t=>/morphTargetInfluences/.test(t.name)));const d=createOriginalIdleDirector(T,model,clip,{enter:.3,exit:.3});d.start();face.playCandidate(Object.keys(R6_CANDIDATES)[j]);face.trigger('blink');for(let n=0;n<Math.ceil((clip.duration+1)*30);n++){d.advance(1/30);face.advance(1/30);}d.dispose();face.restore();results.push({cycle,clip:clip.name,sourceDuration:clip.duration,facialWeightsRestored:inspection.morphMeshes.filter(m=>['Shorekeeper_Face','Shorekeeper_Eye'].includes(m.name)).every(m=>m.morphTargetInfluences.every(v=>v===0))});
 }
 face.dispose();face.dispose();assert.equal(hash(),buffersBefore);assert.equal(materials(),materialsBefore);assert.equal(JSON.stringify(gltf.animations.map(c=>c.toJSON())),clipsBefore);
 for(const b of bones){assert(b.o.position.distanceTo(b.p)<1e-6);assert(Math.max(...b.o.quaternion.toArray().map((v,j)=>Math.abs(v-b.q.toArray()[j])))<1e-6,'quaternion components changed: '+b.o.name);assert(b.o.scale.distanceTo(b.s)<1e-6);}
}
assert(results.every(r=>r.facialWeightsRestored));const report={status:'PRIVATE_CANONICAL_INTEGRATION_PASS',canonicalSha256:sha256,buffersBefore,buffersAfter:hash(),materialsUnchanged:true,clipsUnchanged:true,bones:249,results,realGpu:false,humanApproval:null,postCombo:'PENDING_PRIVATE_COMBAT_LIBRARIES'};if(out)await fs.writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
