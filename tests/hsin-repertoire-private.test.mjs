/** Optional local real-skin audit. Never downloads or uploads a model. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {calibratePupils} from '../src/scripts/hsin-face-rig.mjs';
import {createChestPose,createChestDirector} from '../src/scripts/hsin-chest-gesture.mjs';
import {createRightSignaturePose} from '../src/scripts/hsin-right-signature.mjs';
import {createPoseTransition} from '../src/scripts/hsin-pose-transition.mjs';
import {createHairPose} from '../src/scripts/hsin-hair-gesture.mjs';
import {sampleHandSurface} from '../src/scripts/hsin-hand-clearance.mjs';
import {NEAR_COMPOSITION} from '../src/scripts/hsin-hand-composition.mjs';
import {createBodyRepertoire} from '../src/scripts/hsin-body-repertoire.mjs';
import {createRestBreath} from '../src/scripts/hsin-rest-breath.mjs';
const file=process.argv[2];if(!file){console.log('SKIP private repertoire: provide an authorized local GLB.');process.exit(0);}
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{};
const bytes=await readFile(file),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))],find=n=>bones.find(b=>b.name===n),head=find('ORG-Bip001Head');
const before=new Map(bones.map(b=>[b,{q:b.quaternion.toArray(),p:b.position.toArray(),s:b.scale.toArray()}]));
const exact=()=>{for(const[b,t]of before){assert.deepEqual(b.quaternion.toArray(),t.q,b.name);assert.deepEqual(b.position.toArray(),t.p,b.name);assert.deepEqual(b.scale.toArray(),t.s,b.name);}};
const calibration=calibratePupils(THREE,meshes,head),right=createRightSignaturePose({THREE,bones,meshes,head,calibration});assert.equal(right.diagnostics().ready,true);right.apply(1);
const companion=find('ORG-Bip001HandR').getWorldPosition(new THREE.Vector3()),companionSurface=sampleHandSurface({THREE,meshes,side:'R'});right.restore();exact();
const chest=createChestPose({THREE,bones,meshes,head,calibration,collar:true,companion,companionSurface,compositionPolicy:NEAR_COMPOSITION});
assert.equal(chest.diagnostics().ready,true,chest.diagnostics().reason);assert.equal(chest.diagnostics().variants.composed.ok,true,JSON.stringify(chest.diagnostics().variants.composed));assert.equal(chest.diagnostics().variants.composed.handSurfaceChecked,true);
const hair=createHairPose({THREE,bones,meshes,head,calibration});assert.equal(hair.diagnostics().ready,true,hair.diagnostics().reason);assert.ok(hair.diagnostics().nearestHairDistance>0&&hair.diagnostics().nearestHairDistance<.05);exact();
for(const pose of [chest,hair]){
 for(const t of [0,.1,.3,.6,.9,1,.7,.4,.1,0]){
  assert.equal(pose.apply(t),true);for(const[b,q]of before)if(/R(?:\d+)?$/.test(b.name))assert.deepEqual(b.quaternion.toArray(),q.q,'left gesture cannot write right bones');
 }
 pose.restore();exact();
}
const signature=createPoseTransition({pose:right}),leftActor=createChestDirector({pose:chest,seed:2,organic:true}),hairActor=createChestDirector({pose:hair,seed:3,organic:true});
const episodes=new Set(),body=createBodyRepertoire({seed:77,signature,chest:leftActor,hair:hairActor,breath:createRestBreath({THREE,bone:find('ORG-Bip001Spine2')}),capabilities:()=>({signature:true,chest:true,composition:true,hair:true}),onState:e=>{if(e.action)episodes.add(e.action);}});
for(let i=0;i<6000;i++){body.advance(.1,{enabled:true,context:i%1000<500?'Warm Presence':'Neutral Presence'});assert.ok(!(leftActor.busy()&&hairActor.busy()));}
assert.ok(episodes.has('hair')&&episodes.has('composition')&&episodes.has('chest')&&episodes.has('signature'));
body.release();for(let i=0;i<200;i++)body.advance(.1,{enabled:false});assert.equal(body.busy(),false);body.dispose();exact();
console.log(JSON.stringify({privateRepertoire:'PASS',episodes:[...episodes],chest:chest.diagnostics().variants,hair:hair.diagnostics(),exactRestore:true,visual:'NOT A WEBGL OR ANDROID TEST'}));
