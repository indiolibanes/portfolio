/** CPU sampling of the actual public astronaut GLB. No texture, WebGL or artistic approval.
 * node scripts/qa-sophia-launch-model.mjs MODEL.glb [report.json] */
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createLaunchDirector} from '../src/scripts/sophia-launch-director.ts';import {R3} from '../src/scripts/sophia-immersive-r3-timeline.mjs';
if(!process.argv[2])throw Error('Pass a read-only local GLB path');const bytes=await readFile(process.argv[2]),loader=new GLTFLoader();
loader.register(()=>({name:'CPU_QA_SKIP_TEXTURES',loadTexture:()=>Promise.resolve(new T.Texture())}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const originals=JSON.stringify(gltf.animations.map(c=>T.AnimationClip.toJSON(c))),scene=new T.Scene(),camera=new T.PerspectiveCamera(38,16/9,.005,1000);
const listeners=new Map(),controls={target:new T.Vector3(),addEventListener(n,fn){listeners.set(n,fn);},removeEventListener(n){listeners.delete(n);}};
const d=createLaunchDirector(gltf,scene,camera,controls,()=>false);assert.equal(d.supported,true);
const times=[0,.9,1.6,2.1,3.1,4.1,5.1,5.6,6.1,7.1,7.6,8.1,8.7,9.05,9.4,10.3,11.2,14],samples=[];
for(const time of times){d.apply(time);const s=d.snapshot();samples.push(s);assert.ok(s.riderWorld.every(Number.isFinite));
 if(time<R3.enter)assert.equal(s.riderVisible,false);if(time<=R3.pitchStart)assert.ok(s.rocketUpDotWorldY>.999);
 if(time>=R3.settleEnd)assert.ok(s.riderSeatError<1e-6);if(time<=R3.pitchStart)assert.equal(s.ribbonsVisible,false);assert.deepEqual(s.baseWorld,samples[0].baseWorld);}
const snapshotAt=t=>{d.apply(t);return d.snapshot();};
const first=snapshotAt(7.8);snapshotAt(18);snapshotAt(0);assert.deepEqual(snapshotAt(7.8),first);d.reset();assert.deepEqual(snapshotAt(7.8),first);
let maxGripError=0;const costs=[];
for(let i=0;i<=96;i++){const t=R3.launch+(R3.orbitEnd-R3.launch)*i/96,start=performance.now();d.apply(t);costs.push(performance.now()-start);const s=d.snapshot();for(const error of s.gripErrors){assert.ok(Number.isFinite(error),'Actual hands must resolve');maxGripError=Math.max(maxGripError,error);assert.ok(error<s.gripTolerance,'Grip target exceeds 3% hull diameter');}}
// Controls never change the authored character transforms; return to auto has no initial jump.
d.apply(8);const before=d.snapshot().riderWorld;listeners.get('start')();camera.position.add(new T.Vector3(1,0,1));const userP=camera.position.clone();d.apply(8);assert.deepEqual(d.snapshot().riderWorld,before);assert.equal(d.snapshot().cameraMode,'USER');d.resetCamera();d.apply(8,0);assert.ok(camera.position.distanceTo(userP)<1e-9);for(let i=0;i<60;i++)d.apply(8,1/60);assert.equal(d.snapshot().cameraMode,'AUTO');
// Conservative, pose-updated rider/rocket bounds projected in both aspects. Not a visual capture.
const projected=[];
for(const aspect of [16/9,390/640]){camera.aspect=aspect;let maxNdc=0;for(const t of [0,4,6.1,7.1,7.9,8.7,9.4,10.3,11.2,14]){
 d.reset();d.apply(t);camera.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(gltf.scene.getObjectByName('Fuselage'));
 if(t>=R3.enter){const rider=gltf.scene.getObjectByName('Sophia_Astronauta_Rider_Mount');rider.traverse(n=>{if(n.isSkinnedMesh)n.computeBoundingBox();});box.expandByObject(rider);}
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(camera);maxNdc=Math.max(maxNdc,Math.abs(p.x),Math.abs(p.y));}
 }
 projected.push({aspect,maxNdc,inside:maxNdc<=1});assert.ok(maxNdc<1,'Camera clips conservative pose bounds');}
assert.equal(JSON.stringify(gltf.animations.map(c=>T.AnimationClip.toJSON(c))),originals);assert.ok(d.stats.triangles<12000);
costs.sort((a,b)=>a-b);const report={result:'CPU_TRANSFORM_RIG_CONTACT_TARGET_PASS',visual:'VISUAL_QA_PENDING',modelSha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,preservedClips:gltf.animations.length,texturesSkipped:true,pad:d.stats,grip:{samples:97,maxTargetError:maxGripError,tolerance:d.snapshot().gripTolerance,note:'Bone palm-anchor error, not mesh collision or contact artwork approval'},cpu:{p50Ms:costs[Math.floor(costs.length*.5)],p95Ms:costs[Math.floor(costs.length*.95)],hardware:'container CPU; not Samsung/GPU'},projected,samples,limits:['Textures skipped; no WebGL or GPU timing','Conservative CPU NDC bounds are not visual composition approval','IK targets do not certify suit, palm or tail collision','No new Jump/Grip/Orbit clip in the original GLB']};
if(process.argv[3])await writeFile(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,samples:report.samples.length},null,2));d.dispose();
