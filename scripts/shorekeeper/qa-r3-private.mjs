/** CPU-only private regression. Usage: node scripts/shorekeeper/qa-r3-private.mjs model.glb out.json [libraries.glb...]
 * Textures are omitted from an IN-MEMORY parsing copy only; not a WebGL render or visual approval.
 */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createMouthR3} from '../../src/scripts/shorekeeper/mouth-r3.mjs';
import {createRebasedBurstClip,createBindRootBurstClip} from '../../src/scripts/shorekeeper/liberation-rotation.mjs';
import {sampleMotion} from '../../src/scripts/shorekeeper/motion-matching.mjs';
import {ShorekeeperVfxR3Director} from '../../src/scripts/shorekeeper/vfx-r3.mjs';
const [modelPath,out,...libraries]=process.argv.slice(2);if(!modelPath||!out)throw Error('model.glb out.json [libraries] required');
async function load(path){
 const raw=await fs.readFile(path),len=raw.readUInt32LE(12),json=JSON.parse(raw.subarray(20,20+len));
 const originalClips=json.animations?.map(c=>c.name)??[];
 // No fetches, image decode or GPU: the CPU parser needs only geometry, rig and animation accessors.
 for(const mesh of json.meshes??[])for(const prim of mesh.primitives)delete prim.material;
 delete json.materials;delete json.images;delete json.textures;
 const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
 const tail=raw.subarray(20+len),header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+tail.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const bytes=Buffer.concat([header,padded,tail]);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 return {gltf,originalClips,sha256:crypto.createHash('sha256').update(raw).digest('hex')};
}
const result=await load(modelPath),model=result.gltf.scene,clips=[...result.gltf.animations];
assert.equal(result.sha256,'4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30');
for(const path of libraries)clips.push(...(await load(path)).gltf.animations);
const face=model.getObjectByName('Shorekeeper_Face'),source=face.geometry;
const hashGeometry=()=>crypto.createHash('sha256').update(source.attributes.position.array).update(Buffer.concat(source.morphAttributes.position.map(a=>Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength)))).digest('hex');
const before=hashGeometry(),candidate=createMouthR3(model);
const mouth={report:candidate.report,thickness:candidate.thickness,lift:candidate.lift,status:candidate.status};candidate.dispose();assert.equal(face.geometry,source);assert.equal(hashGeometry(),before);
const idles=[];for(let i=1;i<=3;i++){
 const clip=clips.find(c=>c.name===`SK_IDLE_0${i}_ORIGINAL`);assert.ok(clip);const hash=crypto.createHash('sha256').update(Buffer.concat(clip.tracks.map(t=>Buffer.from(t.values.buffer,t.values.byteOffset,t.values.byteLength)))).digest('hex');
 const samples=sampleMotion(model,clip);assert.ok(samples.frames.every(f=>f.positions.every(Number.isFinite)));
 idles.push({name:clip.name,duration:clip.duration,tracks:clip.tracks.length,sampledFrames:samples.frames.length,trackHash:hash});
}
const bursts=[];for(const clip of clips.filter(c=>/^SK_BURST_0[12]_ORIGINAL$/.test(c.name))){
 const original=sampleMotion(model,clip),rebase=createRebasedBurstClip(T,model,clip),owned=createBindRootBurstClip(T,model,clip);
 for(const row of [rebase,owned]){
  assert.equal(row.clip.duration,clip.duration);
  for(let i=0;i<clip.tracks.length;i++)if(clip.tracks[i].name!=='Root.quaternion')assert.deepEqual(row.clip.tracks[i].values,clip.tracks[i].values);
 }
 const selected=clip.name.includes('02')?[0,54,107,163]:[0,105,135,180];const fps=clip.name.includes('02')?30.184049606323242:30.16666603088379;
 const variants=[clip,rebase.clip,owned.clip].map(c=>{
  const samples=sampleMotion(model,c),mixer=new T.AnimationMixer(model),action=mixer.clipAction(c);action.setLoop(T.LoopOnce,1);action.play();action.paused=true;
  const frames=selected.map(frame=>{const time=frame/fps;action.time=time;mixer.update(0);model.updateMatrixWorld(true);return {sourceFrame:frame,time,Root:model.getObjectByName('Root')?.quaternion.toArray(),Rib:model.getObjectByName('Rib')?.quaternion.toArray(),sample:samples.frames[Math.min(samples.frames.length-1,Math.round(time*samples.fps))]};});
  mixer.stopAllAction();mixer.uncacheRoot(model);return {name:c.name,frames};
 });bursts.push({name:clip.name,spinTracksPreserved:true,variants});
}
const attacks=clips.filter(c=>/^SK_ATTACK_0[1234]_ORIGINAL$/.test(c.name)).map(c=>{
 const m=sampleMotion(model,c),last=m.frames.at(-1);return {name:c.name,duration:c.duration,sampledFrames:m.frames.length,contactsAtEnd:last.contacts,feetAndPelvisPositions:last.positions,joints:m.joints,contactStatus:m.contactStatus};
});
const scene=new T.Scene(),vfx=new ShorekeeperVfxR3Director(scene);vfx.setState('RESONANCE_PEAK');
const cpuStart=performance.now();for(let i=0;i<18000;i++)vfx.update(1/30,1);const vfxReport=vfx.report(),cpuWallMs=performance.now()-cpuStart;vfx.dispose();assert.equal(scene.children.length,0);
await fs.writeFile(out,JSON.stringify({schema:'shorekeeper-r3-private-cpu/1',canonicalSha256:result.sha256,canonicalClips:result.originalClips,sourceGeometryUnchanged:true,mouth,idles,attacks,bursts,vfx:{...vfxReport,syntheticSeconds:600,cpuWallMs},rendering:'NOT_RUN_NO_WEBGL2',gpu:'NOT_TESTED',samsung:'NOT_TESTED',visualQA:'VISUAL_QA_PENDING'},null,2));
console.log('Canonical CPU regressions PASS; textures/GPU/visual approval NOT tested. Output:',out);
