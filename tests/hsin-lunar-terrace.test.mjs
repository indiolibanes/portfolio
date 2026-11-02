import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import sharp from 'sharp';
import {createCinematicReference} from '../src/scripts/hsin-cinematic-idle.mjs';
import {createLunarPresentation} from '../src/scripts/hsin-lunar-presentation.mjs';
import {LUNAR_TERRACE,createLunarTerrace} from '../src/scripts/hsin-lunar-terrace.mjs';
import {createBakedPose,createBakedChest} from '../src/scripts/hsin-baked-pose.mjs';
import {createPoseTransition} from '../src/scripts/hsin-pose-transition.mjs';
import {createChestDirector} from '../src/scripts/hsin-chest-director.mjs';
import {createBodyRepertoire} from '../src/scripts/hsin-body-repertoire.mjs';
import {createRestBreath} from '../src/scripts/hsin-rest-breath.mjs';
import {createFacialActing} from '../src/scripts/hsin-face-acting.mjs';
import {HSIN_STAGE,cameraFit} from '../src/scripts/hsin-stage-config.mjs';
const file=p=>new URL('../'+p,import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=await readFile(file('public/assets/models/hsin/hsin-v2.0.glb')),profileBytes=await readFile(file('public/assets/models/hsin/hsin-v2.1-profile.json')),profile=JSON.parse(profileBytes),manifest=JSON.parse(await readFile(file('src/data/hsin-v21-pose.json')));
assert.equal(hash(bytes),manifest.modelSha256);assert.equal(hash(profileBytes),manifest.profileSha256);assert.equal(HSIN_STAGE.version,'2.0.1');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{};
async function rig(){
 const g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const model=g.scene,meshes=[];model.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
 const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))],original=bones.map(b=>({bone:b,q:b.quaternion.toArray(),p:b.position.toArray(),s:b.scale.toArray()}));
 model.position.y-=profile.bounds.min[1];model.updateMatrixWorld(true);const ref=createCinematicReference({bones,profile});ref.apply();model.updateMatrixWorld(true);
 model.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});return {model,meshes,bones,original,ref,by:new Map(bones.map(b=>[b.name,b]))};
}
const a=await rig(),b=await rig(),metrics={studies:[],maxRigidHandError:0,soleY:null,simulationSeconds:600};
const bonePosition=(r,name)=>new T.Vector3().setFromMatrixPosition(r.by.get(name).matrixWorld);
for(const angle of [35,45,55,65]){
 const before=b.bones.map(b=>b.quaternion.toArray()),present=createLunarPresentation({THREE:T,model:b.model,bones:b.bones,bounds:profile.bounds,apparentBodyDegrees:angle});present.apply();
 const h=b.by.get('ORG-Bip001Head'),forward=h.localToWorld(new T.Vector3(...profile.calibration.focusCenter)).sub(bonePosition(b,h.name)),face=8-T.MathUtils.radToDeg(Math.atan2(forward.x,forward.z));
 assert.ok(face>=15&&face<=30,'face must remain less oblique than the torso');
 const idempotent=b.bones.map(b=>b.quaternion.toArray());present.apply();assert.deepEqual(b.bones.map(b=>b.quaternion.toArray()),idempotent);
 for(const side of ['R','L'])for(const prefix of ['ORG','DEF'])for(const part of ['UpperArm','Forearm','Hand']){const n=`${prefix}-Bip001${part}${side}`,i=b.bones.findIndex(b=>b.name===n);assert.deepEqual(b.by.get(n).quaternion.toArray(),before[i],'presentation cannot write arm channels');}
 metrics.studies.push({...present.parameters,faceApparentDegrees:face});present.restore();assert.deepEqual(b.bones.map(b=>b.quaternion.toArray()),before);
}
const present=createLunarPresentation({THREE:T,model:b.model,bones:b.bones,bounds:profile.bounds});present.apply();
const delta=b.model.matrixWorld.clone().multiply(a.model.matrixWorld.clone().invert()),point=(r,n)=>bonePosition(r,n);
// Control/deformer chains receive the same world rotation despite different parents.
for(const part of ['Neck','Head']){
 const worldDelta=prefix=>b.by.get(`${prefix}-Bip001${part}`).getWorldQuaternion(new T.Quaternion()).normalize().multiply(a.by.get(`${prefix}-Bip001${part}`).getWorldQuaternion(new T.Quaternion()).normalize().invert()).normalize();
 assert.ok(worldDelta('ORG').angleTo(worldDelta('DEF'))<1e-7,'ORG/DEF presentation rotation cannot diverge');
}

for(const [name,data]of Object.entries(profile.poses)){
 const side=name==='signature'?'R':'L',p0=createBakedPose({THREE:T,data,bones:a.bones}),p1=createBakedPose({THREE:T,data,bones:b.bones});
 for(let i=0;i<=128;i++){
  p0.apply(i/128);p1.apply(i/128);a.model.updateMatrixWorld();b.model.updateMatrixWorld();
  for(const prefix of ['ORG','DEF'])for(const part of ['UpperArm','Forearm','Hand']){
   const n=`${prefix}-Bip001${part}${side}`;assert.deepEqual(b.by.get(n).quaternion.toArray(),a.by.get(n).quaternion.toArray());
   const error=point(a,n).applyMatrix4(delta).distanceTo(point(b,n));metrics.maxRigidHandError=Math.max(metrics.maxRigidHandError,error);assert.ok(error<1e-9,'world trajectory must be a rigid root transformation, never a new arm path');
  }
 }
 p0.restore();p1.restore();
}
b.model.updateMatrixWorld(true);let minY=Infinity;
for(const mesh of b.meshes){mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++)minY=Math.min(minY,mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld).y);}
metrics.soleY=minY;assert.ok(Math.abs(minY-LUNAR_TERRACE.floorY)<1e-6,'sole must rest on the actual stone surface');
// Root orientation is static; the original directors still produce exactly the same trace.
function actors(r){
 const signature=createPoseTransition({pose:createBakedPose({THREE:T,data:profile.poses.signature,bones:r.bones})}),chest=createChestDirector({pose:createBakedChest({THREE:T,profile:profile.poses,bones:r.bones}),seed:2,organic:true}),hair=createChestDirector({pose:createBakedPose({THREE:T,data:profile.poses.hair,bones:r.bones}),seed:3,organic:true}),spine=r.by.get('ORG-Bip001Spine2');
 const body=createBodyRepertoire({signature,chest,hair,seed:77,breath:createRestBreath({THREE:T,bone:spine,update:()=>spine.updateMatrix()}),capabilities:()=>({signature:true,chest:true,composition:true,hair:true})});
 const face=createFacialActing({pass:'auto-b1',autonomous:true,seed:77,intensity:.75,morphLimits:profile.limits,gazeAxes:profile.gazeAxes});return {body,face,chest,hair};
}
const old=actors(a),next=actors(b);
for(let i=0;i<18000;i++){
 const f0=old.face.advance(1/30),f1=next.face.advance(1/30);assert.deepEqual(f1,f0);
 for(const actor of [old,next])actor.body.advance(1/30,{enabled:true,context:actor.face.diagnostics().expressions.context});
 assert.deepEqual(next.body.diagnostics(),old.body.diagnostics());assert.ok(!(next.chest.busy()&&next.hair.busy()));
 if(i%30===0){a.model.updateMatrixWorld();b.model.updateMatrixWorld();for(const side of ['R','L']){const n='ORG-Bip001Hand'+side;assert.ok(point(a,n).applyMatrix4(delta).distanceTo(point(b,n))<1e-9);}}
}
// The pointer-to-head transform remains invertible under the root and cervical compensation.
b.model.updateMatrixWorld(true);const head=b.by.get('ORG-Bip001Head'),local=new T.Vector3(...profile.calibration.focusCenter).add(new T.Vector3(.02,.01,.01)),world=head.localToWorld(local.clone());assert.ok(head.worldToLocal(world).distanceTo(local)<1e-10);
old.body.dispose();next.body.dispose();present.restore();b.ref.restore();
for(const row of b.original){assert.deepEqual(row.bone.quaternion.toArray(),row.q);assert.deepEqual(row.bone.position.toArray(),row.p);assert.deepEqual(row.bone.scale.toArray(),row.s);}assert.deepEqual(b.model.quaternion.toArray(),[0,0,0,1]);

const textures={skyTexture:new T.Texture(),moonTexture:new T.Texture(),stoneTexture:new T.Texture(),atlasTexture:new T.Texture(),waterTexture:new T.Texture()},env=createLunarTerrace({THREE:T,...textures}),scene=new T.Scene();scene.add(env.group);
const meshes=[];env.group.traverse(o=>{if(o.isMesh)meshes.push(o);});
metrics.sceneMeshes=meshes.length;metrics.sceneTriangles=meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0);
const passes=m=>m.transparent&&m.side===T.DoubleSide&&!m.forceSinglePass?2:1;metrics.scenePassCeiling=meshes.reduce((n,m)=>n+passes(m.material),0);metrics.totalPassCeiling=metrics.scenePassCeiling+a.meshes.reduce((n,m)=>n+passes(m.material),0)+1; // One additional textured-background pass.
assert.ok(metrics.sceneTriangles<9000);assert.ok(metrics.totalPassCeiling<=30);assert.equal(meshes.length,13);
assert.ok(!meshes.some(m=>['CircleGeometry','RingGeometry'].includes(m.geometry.type)||/pedestal|platform/i.test(m.name)));
assert.equal(meshes.find(m=>m.name==='Continuous stone terrace').position.y,0);assert.ok(!env.group.children.some(o=>o.isLight));
for(const aspect of [393/852,16/9])for(const azimuth of [-2,8,18]){
 const camera=new T.PerspectiveCamera(34,aspect,.03,45),distance=cameraFit(profile.bounds,aspect),target=new T.Vector3(0,.88,0),yaw=azimuth*Math.PI/180;camera.position.set(Math.sin(yaw)*distance,1.11,Math.cos(yaw)*distance);camera.lookAt(target);camera.updateMatrixWorld();env.frameSky(camera,target);scene.updateMatrixWorld(true);
 const moon=env.group.getObjectByName('Full moon · sculpted static sphere'),center=moon.getWorldPosition(new T.Vector3());
 assert.equal(moon.geometry.type,'SphereGeometry');assert.deepEqual(center.toArray(),[LUNAR_TERRACE.moonPosition[0],LUNAR_TERRACE.moonPosition[1]+.88,LUNAR_TERRACE.moonPosition[2]]);assert.deepEqual(moon.getWorldQuaternion(new T.Quaternion()).toArray(),[0,0,0,1]);
 assert.ok(!('time' in moon.material.uniforms),'moon never animates or follows the camera');
 // A world-fixed moon has honest parallax; it is not forced into every orbited viewport.
 const panes=env.group.getObjectByName('Warm windows and lantern panels'),p=panes.geometry.attributes.position;let visible=0;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(panes.matrixWorld).project(camera);if(Math.abs(v.x)<1&&Math.abs(v.y)<1&&v.z<1)visible++;}assert.ok(visible>0,'architecture/lanterns must survive small camera rotations');
}
metrics.textureBytes=0;metrics.textures=[];
for(const url of [LUNAR_TERRACE.sky,LUNAR_TERRACE.moon,LUNAR_TERRACE.stone,LUNAR_TERRACE.atlas,LUNAR_TERRACE.water]){
 const path=file('public'+url),b=await readFile(path),meta=await sharp(path.pathname).metadata();assert.equal(b.readUInt32LE(4)+8,b.length);await sharp(path.pathname).raw().toBuffer();assert.ok(meta.width<=1024&&meta.height<=1024);metrics.textureBytes+=b.length;metrics.textures.push({url,bytes:b.length,width:meta.width,height:meta.height,sha256:hash(b)});
 if(process.env.HSIN_CHECK_DIST==='1')assert.equal(hash(await readFile(file('dist'+url))),hash(b),'build must contain intact scenery textures');
}assert.ok(metrics.textureBytes<200*1024);
const geometries=new Set(meshes.map(m=>m.geometry)),materials=new Set(meshes.map(m=>m.material));let disposed=0;for(const resource of [...geometries,...materials,...Object.values(textures)])resource.addEventListener('dispose',()=>disposed++);for(const resource of [...geometries,...materials,...Object.values(textures)])resource.dispose();assert.equal(disposed,geometries.size+materials.size+5);
const runtime=await readFile(file('src/scripts/hsin-stage.ts'),'utf8');assert.ok(!runtime.includes('CylinderGeometry')&&!runtime.includes('RingGeometry')&&!runtime.includes('shadowCanvas'));assert.ok(runtime.includes('presentation?.restore()'));assert.equal(HSIN_STAGE.fps,30);assert.equal(HSIN_STAGE.maxPixels,1152000);
console.log('Lunar Terrace V2.0.1: static root/face studies, unchanged arm trajectories and 600s traces, stone contact, reversible frozen matrices, gaze, framing, disposal, textures and budgets PASS (not GPU/FPS or artistic approval)');console.log(JSON.stringify(metrics));
if(process.env.HSIN_WRITE_TERRACE_REPORT==='1')await writeFile(file('docs/hsin-v201-validation.json'),JSON.stringify(metrics,null,2)+'\n');
