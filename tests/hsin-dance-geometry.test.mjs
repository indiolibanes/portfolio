/** Actual skinned surface samples and screen-space forearm triangles. Not a continuous cloth collision proof. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {danceRig} from '../scripts/lib/hsin-dance-rig.mjs';
import {createDancePose} from '../src/scripts/hsin-dance-pose.mjs';
import {lunarCameraFit} from '../src/scripts/hsin-lunar-framing.mjs';
const r=await danceRig(),{T}=r,data=JSON.parse(await readFile('public/assets/animations/hsin/lunar-dance-r1.json')),pose=createDancePose({THREE:T,data,bones:r.bones}),samples=[];
for(const mesh of r.meshes){const g=mesh.geometry,skin=g.attributes.skinIndex,weight=g.attributes.skinWeight,foot=[],left=[],moving=[];
 for(let i=0;i<g.attributes.position.count;i++){let f=0,l=0,a=0;for(let k=0;k<4;k++){const n=mesh.skeleton.bones[skin.getComponent(i,k)]?.name??'',w=weight.getComponent(i,k);if(/^(ORG|DEF)-Bip001Foot[LR]/.test(n))f+=w;if(/^(ORG|DEF)-Bip001(Forearm|Hand)L/.test(n))l+=w;if(/^(ORG|DEF)-Bip001(Forearm|Hand)[LR]/.test(n))a+=w;}if(f>.75)foot.push(i);if(l>.6)left.push(i);if(a>.6&&i%3===0)moving.push(i);}
 samples.push({mesh,foot,left:new Set(left),moving,baseline:new Map()});mesh.skeleton.update();for(const i of foot)samples.at(-1).baseline.set(i,mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld));
}
const metrics={frames:0,maxFootSurfaceDrift:0,leftForearmScreenIntrusions:0,screenTriangleProbes:0,footVertices:samples.reduce((n,s)=>n+s.foot.length,0),bounds:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},limitation:'Surface sampling and screen triangle probes, not continuous cloth/hair collision detection or artistic approval.',viewports:[]};
const cameras=[];for(const [w,h,yaw]of [[393,852,8],[1280,720,8],[1280,720,28]]){const fit=lunarCameraFit(w/h),target=new T.Vector3(...fit.target),c=new T.PerspectiveCamera(34,w/h,.03,45),a=yaw*Math.PI/180;c.position.set(target.x+Math.sin(a)*fit.distance,target.y+.23,target.z+Math.cos(a)*fit.distance);c.lookAt(target);c.updateMatrixWorld();cameras.push(c);metrics.viewports.push({w,h,yaw});}
const v=new T.Vector3(),head=r.by.get('ORG-Bip001Head');let minArmFaceHeight=Infinity;
for(const [name,p]of Object.entries(data.phrases))for(let frame=0;frame<=32;frame++){
 pose.apply(name,frame/32);r.model.updateMatrixWorld(true);for(const m of r.meshes)m.skeleton.update();metrics.frames++;
 const face=head.localToWorld(new T.Vector3(...r.profile.calibration.focusCenter));
 for(const sample of samples){const {mesh}=sample;
  for(const i of sample.foot){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);metrics.maxFootSurfaceDrift=Math.max(metrics.maxFootSurfaceDrift,v.distanceTo(sample.baseline.get(i)));}
  for(const i of sample.moving){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);minArmFaceHeight=Math.min(minArmFaceHeight,face.y-v.y);}
  if(!sample.left.size)continue;const idx=mesh.geometry.index?.array??Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i);
  for(const c of cameras){const center=face.clone().project(c),right=new T.Vector3(1,0,0).applyQuaternion(c.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(c.quaternion),rx=face.clone().addScaledVector(right,.048).project(c).distanceTo(center),ry=face.clone().addScaledVector(up,.068).project(c).distanceTo(center);
   for(let i=0;i<idx.length;i+=3){if(!sample.left.has(idx[i])||!sample.left.has(idx[i+1])||!sample.left.has(idx[i+2]))continue;metrics.screenTriangleProbes++;const tri=[0,1,2].map(j=>mesh.getVertexPosition(idx[i+j],new T.Vector3()).applyMatrix4(mesh.matrixWorld).project(c));
    // Triangles can cross the face even when none of their vertices do: include edges and interior barycentric probes.
    for(const w of [[1,0,0],[0,1,0],[0,0,1],[.5,.5,0],[0,.5,.5],[.5,0,.5],[1/3,1/3,1/3]]){v.set(0,0,0);for(let j=0;j<3;j++)v.addScaledVector(tri[j],w[j]);if(((v.x-center.x)/rx)**2+((v.y-center.y)/ry)**2<1&&v.z<center.z+.0001)metrics.leftForearmScreenIntrusions++;}
   }
  }
 }
 if(frame%8===0)for(const mesh of r.meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i+=4){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);for(let k=0;k<3;k++){metrics.bounds.min[k]=Math.min(metrics.bounds.min[k],v.getComponent(k));metrics.bounds.max[k]=Math.max(metrics.bounds.max[k],v.getComponent(k));}}
}
pose.restore();metrics.minArmBelowEyeCenter=minArmFaceHeight;assert.ok(metrics.footVertices>20&&metrics.screenTriangleProbes>1000,'geometry checks cannot be empty');assert.ok(metrics.maxFootSurfaceDrift<1e-10,'actual strongly weighted foot vertices remain planted');assert.equal(metrics.leftForearmScreenIntrusions,0,'left forearm/hand must not cover the face from principal/profile cameras');assert.ok(minArmFaceHeight>.1,'new dance paths keep arms away from the head, without reusing the hair contact pose');assert.ok(metrics.bounds.min[1]>-.001&&metrics.bounds.max[0]<1.1&&metrics.bounds.min[0]>-.8);
console.log('Dance geometry PASS: actual skinned foot surfaces, sampled silhouette envelope, left forearm/hand screen triangle probes in portrait, landscape and profile. VISUAL_QA_PENDING');console.log(JSON.stringify(metrics));if(process.env.HSIN_DANCE_REPORT)await writeFile('docs/hsin-dance-geometry-qa.json',JSON.stringify(metrics,null,2)+'\n');
