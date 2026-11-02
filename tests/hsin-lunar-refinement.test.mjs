import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import sharp from 'sharp';
import {createCinematicReference} from '../src/scripts/hsin-cinematic-idle.mjs';
import {HSIN_LUNAR_PRESENTATION as config,createLunarPresentation} from '../src/scripts/hsin-lunar-presentation.mjs';
import {lunarCameraFit,HSIN_ORIENTED_ENVELOPE as envelope} from '../src/scripts/hsin-lunar-framing.mjs';
import {createBakedPose} from '../src/scripts/hsin-baked-pose.mjs';
import {LUNAR_TERRACE,createLunarTerrace} from '../src/scripts/hsin-lunar-terrace.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=await readFile('public/assets/models/hsin/hsin-v2.0.glb'),profileBytes=await readFile('public/assets/models/hsin/hsin-v2.1-profile.json'),profile=JSON.parse(profileBytes);
assert.equal(hash(bytes),envelope.modelSha256);assert.equal(hash(profileBytes),envelope.profileSha256);assert.deepEqual(config,envelope.presentation);
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{};
async function rig(){const {scene:model}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const meshes=[];model.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))],snapshot=bones.map(b=>({q:b.quaternion.toArray(),p:b.position.toArray(),s:b.scale.toArray()})),by=new Map(bones.map(b=>[b.name,b]));model.position.y-=profile.bounds.min[1];const reference=createCinematicReference({bones,profile});reference.apply();model.updateMatrixWorld(true);model.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});return {model,meshes,bones,snapshot,by,reference};}
const current=await rig(),old=await rig(),metrics={studies:[],handFace:[],viewports:[],gpuMeasured:false};
const position=(r,name)=>r.by.get(name).getWorldPosition(new T.Vector3());
function faceYaw(r){const h=r.by.get('ORG-Bip001Head'),v=h.localToWorld(new T.Vector3(...profile.calibration.focusCenter)).sub(position(r,h.name));return config.cameraAzimuth-T.MathUtils.radToDeg(Math.atan2(v.x,v.z));}
const oldPresentation=createLunarPresentation({THREE:T,...old,bounds:profile.bounds,apparentBodyDegrees:55});oldPresentation.apply();metrics.previousFaceYaw=faceYaw(old);
for(const [body,target]of [[60,30],[65,35],[70,40],[75,45]]){const p=createLunarPresentation({THREE:T,...current,bounds:profile.bounds,bodyApparentYaw:body,headApparentYaw:target});p.apply();const actual=faceYaw(current);assert.ok(Math.abs(actual-target)<.25,'independent fixed cervical offsets must hit each studied face target');metrics.studies.push({...p.parameters,measuredFaceYaw:actual});p.restore();}
const p=createLunarPresentation({THREE:T,...current,bounds:profile.bounds});p.apply();assert.ok(faceYaw(current)>metrics.previousFaceYaw+16,'chosen face must be perceptibly more oblique');assert.equal(p.parameters.neckDegrees,4);assert.equal(p.parameters.headDegrees,18.8);
const delta=current.model.matrixWorld.clone().multiply(old.model.matrixWorld.clone().invert());
for(const [name,data]of Object.entries(profile.poses)){
 const a=createBakedPose({THREE:T,data,bones:old.bones}),b=createBakedPose({THREE:T,data,bones:current.bones});
 for(const weight of [0,.25,.5,.75,1]){a.apply(weight);b.apply(weight);for(const r of [old,current])r.model.updateMatrixWorld(true);
  for(const side of ['R','L'])for(const prefix of ['ORG','DEF'])for(const part of ['UpperArm','Forearm','Hand']){const n=`${prefix}-Bip001${part}${side}`;assert.deepEqual(current.by.get(n).quaternion.toArray(),old.by.get(n).quaternion.toArray());assert.ok(position(old,n).applyMatrix4(delta).distanceTo(position(current,n))<1e-9);}
 }
 a.restore();b.restore();
}
// Geometric hand/face proxy, including final approach and hold; not a collision/beauty claim.
function handToChin(r){const h=r.by.get('ORG-Bip001Head'),chin=h.localToWorld(new T.Vector3(...profile.calibration.focusCenter)).add(new T.Vector3(0,-.055,0));return Math.min(...['02','12','22','32','42'].map(n=>position(r,'ORG-Bip001Finger'+n+'R').distanceTo(chin)));}
for(const weight of [.85,1]){const poses=[old,current].map(r=>createBakedPose({THREE:T,data:profile.poses.signature,bones:r.bones}));poses.forEach(a=>a.apply(weight));for(const r of [old,current])r.model.updateMatrixWorld(true);const before=handToChin(old),after=handToChin(current);metrics.handFace.push({weight,before,after,delta:after-before});assert.ok(after<=before+.012,'neck compensation must not move the chin materially away from the approved signature hand');poses.forEach(a=>a.restore());}
for(const [w,h]of [[320,740],[393,852],[768,1024],[1280,720],[1920,1080]]){
 const framing=lunarCameraFit(w/h),camera=new T.PerspectiveCamera(34,w/h,.03,45),target=new T.Vector3(...framing.target),yaw=config.cameraAzimuth*Math.PI/180;camera.position.set(target.x+Math.sin(yaw)*framing.distance,target.y+.23,target.z+Math.cos(yaw)*framing.distance);camera.lookAt(target);camera.updateMatrixWorld();
 const headDirection=current.by.get('ORG-Bip001Head').localToWorld(new T.Vector3(...profile.calibration.focusCenter)).sub(position(current,'ORG-Bip001Head'));const toCamera=camera.position.clone().sub(position(current,'ORG-Bip001Head')),perspectiveFaceYaw=T.MathUtils.radToDeg(Math.atan2(toCamera.x,toCamera.z)-Math.atan2(headDirection.x,headDirection.z));assert.ok(perspectiveFaceYaw>35&&perspectiveFaceYaw<45);
 const samples=[];for(const name of ['signature','chest','hair']){const pose=createBakedPose({THREE:T,data:profile.poses[name],bones:current.bones});pose.apply(1);current.model.updateMatrixWorld(true);
  for(const n of ['ORG-Bip001Head','ORG-Bip001HandR','ORG-Bip001HandL']){const v=position(current,n).project(camera);assert.ok(Math.abs(v.x)<.87&&Math.abs(v.y)<.89,'face and gesture hands need safe initial margins at every viewport');samples.push([name,n,...v.toArray()]);}pose.restore();
 }
 assert.ok(framing.distance>=3&&framing.distance<=4.65);metrics.viewports.push({w,h,perspectiveFaceYaw,...framing});
}
// Resource budget includes the fifth, compact directional water texture.
const tex=Object.fromEntries(['sky','moon','stone','atlas','water'].map(n=>[n+'Texture',new T.Texture()])),env=createLunarTerrace({THREE:T,...tex}),meshes=[];env.group.traverse(o=>{if(o.isMesh)meshes.push(o);});
metrics.meshes=meshes.length;metrics.triangles=meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0);metrics.structuralPasses=meshes.reduce((n,m)=>n+(m.material.transparent&&m.material.side===T.DoubleSide&&!m.material.forceSinglePass?2:1),0)+10;
assert.equal(metrics.meshes,13);assert.ok(metrics.triangles<10000);assert.ok(metrics.structuralPasses<=28);metrics.textureBytes=0;metrics.estimatedTextureMiB=0;metrics.textures=[];
for(const name of ['sky','moon','stone','atlas','water']){const url=LUNAR_TERRACE[name],b=await readFile('public'+url),m=await sharp(b).metadata();await sharp(b).raw().toBuffer();assert.equal(b.readUInt32LE(4)+8,b.length);const memory=m.width*m.height*4*(name==='sky'?1:4/3);metrics.textureBytes+=b.length;metrics.estimatedTextureMiB+=memory/2**20;metrics.textures.push({url,bytes:b.length,width:m.width,height:m.height,sha256:hash(b)});if(process.env.HSIN_CHECK_DIST==='1')assert.equal(hash(await readFile('dist'+url)),hash(b));}
assert.ok(metrics.estimatedTextureMiB<=13);const resources=new Set([...meshes.flatMap(m=>[m.geometry,m.material]),...Object.values(tex)]);let disposed=0;for(const r of resources){r.addEventListener('dispose',()=>disposed++);r.dispose();}assert.equal(disposed,resources.size);
p.restore();current.reference.restore();oldPresentation.restore();old.reference.restore();for(const r of [current,old])for(const [i,b]of r.bones.entries()){assert.deepEqual(b.quaternion.toArray(),r.snapshot[i].q);assert.deepEqual(b.position.toArray(),r.snapshot[i].p);assert.deepEqual(b.scale.toArray(),r.snapshot[i].s);}assert.deepEqual(current.model.quaternion.toArray(),[0,0,0,1]);
console.log('Lunar refinement: independent body/face targets, unchanged arm paths, signature hand/face proxy, five camera aspects, exact restoration, textures/disposal/budget PASS; VISUAL_QA_PENDING');console.log(JSON.stringify(metrics));
if(process.env.HSIN_WRITE_REFINEMENT_REPORT==='1')await writeFile('docs/hsin-v201-refinement-validation.json',JSON.stringify(metrics,null,2)+'\n');
