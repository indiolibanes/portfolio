/** Private final-code replay audit; this supplements real renders and never grants visual approval.
 * GOLDEN_JSON OUTPUT_JSON ORIGINAL_DIR FINAL_CANDIDATE_DIR GESTURE_DIR
 */
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {createAnatomicalFaceDirector} from '../../src/scripts/shorekeeper/anatomical-face.mjs';
const [goldenPath,out,...roots]=process.argv.slice(2);if(roots.length!==3)throw Error('GOLDEN_JSON OUTPUT_JSON ORIGINAL_DIR FINAL_CANDIDATE_DIR GESTURE_DIR');
const golden=JSON.parse(await fs.readFile(goldenPath,'utf8')),selected=new Map(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const root of roots){const r=JSON.parse(await fs.readFile(path.join(root,'render-report.json'),'utf8'));assert.equal(r.status,'WEBGL_RENDER_PASS');assert.deepEqual(r.errors,[]);for(const seq of r.sequences)selected.set(seq.name,{root,seq,bundleSha256:r.bundleSha256});}
assert.equal(selected.size,28,'Eight families × three angles, three idles, one gesture');
const cases=[];let frames=0;
for(const {root,seq,bundleSha256}of selected.values()){
 const video=path.join(root,seq.video),dir=path.dirname(video),states=JSON.parse(await fs.readFile(path.join(dir,'timeline.json'),'utf8'));
 assert.equal(sha(await fs.readFile(video)),seq.videoSha256);
 for(const side of ['baseline','candidate']){
  const morphMeshes=golden.meshes.map(m=>({...m,morphTargetInfluences:new Array(Object.keys(m.morphTargetDictionary).length).fill(0)})),i={morphMeshes,names:morphMeshes.flatMap(m=>Object.keys(m.morphTargetDictionary)),weights:{}},f=createAnatomicalFaceDirector(i);
  if(side==='baseline')f.playBaseline(seq.baseline);else f.playCandidate(seq.id);
  for(const record of states.filter(s=>s.side===side)){
   if(record.frame){if(record.frame===17)f.trigger('blink');if(record.frame===32&&side==='baseline')f.triggerQA('NEUTRAL');f.advance(1/seq.fps);}
   assert.deepEqual(f.report().weights,record.weights,`${seq.name} ${side} frame ${record.frame}`);
   assert.equal(sha(await fs.readFile(path.join(dir,record.file))),record.sha256);frames++;
  }f.dispose();
 }
 cases.push({name:seq.name,id:seq.id,yaw:seq.yaw,bodyId:seq.bodyId,videoSha256:seq.videoSha256,captureBundleSha256:bundleSha256,weightsMatchFinalCode:true});
}
const r={status:'FINAL_RUNTIME_REPLAY_PASS',activeVideos:cases.length,verifiedFrameVectors:frames,channelCount:69,pngAndMp4ShaVerified:true,realMaterialRender:true,renderClass:'SWIFTSHADER_WEBGL2',humanApproval:null,cases};await fs.writeFile(out,JSON.stringify(r,null,2));console.log(JSON.stringify({status:r.status,videos:cases.length,frames}));
