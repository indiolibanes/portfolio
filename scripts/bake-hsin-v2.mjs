/** Offline-only authoring pass. Geometry audits and pose solvers never ship with the stage. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {calibratePupils,measuredGazeAxes} from '../src/scripts/hsin-face-rig.mjs';
import {auditFacialMorphs} from '../src/scripts/hsin-face-morph-audit.mjs';
import {createRightSignaturePose} from '../src/scripts/hsin-right-signature.mjs';
import {createChestPose} from '../src/scripts/hsin-chest-gesture.mjs';
import {createHairPose} from '../src/scripts/hsin-hair-gesture.mjs';
import {sampleHandSurface} from '../src/scripts/hsin-hand-clearance.mjs';
import {NEAR_COMPOSITION} from '../src/scripts/hsin-hand-composition.mjs';
import {classifyArmSides,isArmRoleVerified} from '../src/scripts/hsin-arm-roles.mjs';
const file=process.argv[2],output=process.argv[3];if(!file||!output)throw Error('Usage: node scripts/bake-hsin-v2.mjs MODEL.glb PROFILE.json');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{};
const bytes=await readFile(file),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))],find=n=>bones.find(b=>b.name===n),head=find('ORG-Bip001Head'),v=()=>new THREE.Vector3();
const baseline=new Map(bones.map(b=>[b,b.quaternion.clone()]));
const calibration=calibratePupils(THREE,meshes,head),audit=auditFacialMorphs(THREE,meshes,head,calibration,{includeB1:true});
if(!calibration.ready)throw Error('Pupil calibration failed.');
const root=find('ORG-Bip001Spine2').getWorldPosition(v()),up=find('ORG-Bip001Neck').getWorldPosition(v()).sub(root).normalize(),eyes=head.localToWorld(new THREE.Vector3(...calibration.focusCenter));
const sides=classifyArmSides({root:root.toArray(),up:up.toArray(),forward:eyes.clone().sub(head.getWorldPosition(v())).toArray(),shoulderR:find('ORG-Bip001UpperArmR').getWorldPosition(v()).toArray(),shoulderL:find('ORG-Bip001UpperArmL').getWorldPosition(v()).toArray()});if(!isArmRoleVerified(sides))throw Error('Unverified arm sides.');
const right=createRightSignaturePose({THREE,bones,meshes,head,calibration});if(!right.diagnostics().ready)throw Error(right.diagnostics().reason);
right.apply(1);const companion=find('ORG-Bip001HandR').getWorldPosition(v()),companionSurface=sampleHandSurface({THREE,meshes,side:'R'});right.restore();
const chest=createChestPose({THREE,bones,meshes,head,calibration,collar:true,companion,companionSurface,compositionPolicy:NEAR_COMPOSITION}),hair=createHairPose({THREE,bones,meshes,head,calibration});
if(!chest.diagnostics().ready||!hair.diagnostics().ready)throw Error(JSON.stringify({chest:chest.diagnostics(),hair:hair.diagnostics()}));
const round=n=>Math.round(n*1e8)/1e8;const poses={};let maxAngularError=0;
for(const [name,pose,variant,side]of [['signature',right,null,'R'],['chest',chest,'plain','L'],['composition',chest,'composed','L'],['hair',hair,null,'L']]){
 if(variant&&!pose.select(variant))continue;
 const chain=bones.filter(b=>new RegExp('^(ORG|DEF)-Bip001(UpperArm|Forearm|Hand)'+side+'$').test(b.name));if(chain.length!==6)throw Error('Expected six driven bones.');
 const capture=breath=>{const frames=[];for(let i=0;i<=64;i++){if(!pose.apply(i/64,{breath}))throw Error('Pose cannot be applied.');frames.push(chain.flatMap(b=>b.quaternion.toArray().map(round)));}pose.restore();return frames;};
 const data={names:chain.map(b=>b.name),rest:chain.flatMap(b=>baseline.get(b).toArray()),frames:capture(0)};
 if(variant){data.negative=capture(-1);data.positive=capture(1);}
 // Bound interpolation against the actual authoring adapter, between baked samples.
 for(let i=0;i<128;i++){const t=(i+.5)/128,index=Math.min(63,Math.floor(t*64)),blend=t*64-index;pose.apply(t);for(let j=0;j<chain.length;j++){
  const a=new THREE.Quaternion().fromArray(data.frames[index],j*4),b=new THREE.Quaternion().fromArray(data.frames[index+1],j*4);a.slerp(b,blend);maxAngularError=Math.max(maxAngularError,THREE.MathUtils.radToDeg(a.angleTo(chain[j].quaternion)));
 }}pose.restore();poses[name]=data;
}
for(const[b,q]of baseline)if(b.quaternion.toArray().some((n,i)=>n!==q.toArray()[i]))throw Error('Pose bake did not restore '+b.name);
const bounds=new THREE.Box3();for(const m of meshes){m.updateWorldMatrix(true,false);m.skeleton.update();for(let i=0;i<m.geometry.getAttribute('position').count;i++)bounds.expandByPoint(m.getVertexPosition(i,v()).applyMatrix4(m.matrixWorld));}
const profile={version:'2.0',modelSha256:createHash('sha256').update(bytes).digest('hex'),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},calibration,gazeAxes:measuredGazeAxes(THREE,calibration),limits:audit.limits,sideStatus:sides.status,poses,validation:{maxAngularErrorDegrees:maxAngularError,chest:chest.diagnostics().variants,hair:hair.diagnostics(),visual:'ANDROID_QA_PENDING'}};
await mkdir(new URL('.',new URL(output,'file://'+process.cwd()+'/')),{recursive:true});await writeFile(output,JSON.stringify(profile)+'\n');console.log(JSON.stringify({ready:true,poses:Object.keys(poses),bytes:Buffer.byteLength(JSON.stringify(profile)),maxAngularErrorDegrees:maxAngularError}));
