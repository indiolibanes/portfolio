import {createChestPose,createChestDirector} from '../src/scripts/hsin-chest-gesture.mjs';
import {createRightSignaturePose} from '../src/scripts/hsin-right-signature.mjs';
/** Optional local audit. No model is fetched, bundled, uploaded, or required by CI. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {calibratePupils,snapshotFace,createFaceBinding,measuredGazeAxes} from '../src/scripts/hsin-face-rig.mjs';
import {auditFacialMorphs} from '../src/scripts/hsin-face-morph-audit.mjs';
import {createFacialActing} from '../src/scripts/hsin-face-acting.mjs';
const file=process.argv[2];
if(!file){console.log('SKIP private GLB audit: supply an authorized local .glb path.');process.exit(0);}
globalThis.self=globalThis;
// Node structural test only: image placeholders are deliberately NOT a visual renderer.
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
globalThis.ProgressEvent=class{constructor(type,data){this.type=type;Object.assign(this,data);}};
const data=await readFile(file), bytes=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
const gltf=await new GLTFLoader().parseAsync(bytes,'');gltf.scene.updateMatrixWorld(true);
const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh&&o.morphTargetDictionary)meshes.push(o);});
const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))], heads=bones.filter(b=>b.name.toLowerCase().replace(/[^a-z0-9]/g,'')==='orgbip001head');
assert.equal(heads.length,1);const baseline=snapshotFace(meshes), calibration=calibratePupils(THREE,meshes,heads[0]);
assert.equal(calibration.ready,true);assert.equal(calibration.records.length,8);
const audit=auditFacialMorphs(THREE,meshes,heads[0],calibration);assert.equal(audit.rows.length,12);assert.ok(audit.rows.every(row=>row.eligible));
assert.ok(audit.rows.filter(row=>row.name.startsWith('P_Nose')).every(row=>row.presentation==='LAB_ONLY_VISUAL_PENDING'));
for(const [mesh,values] of baseline)assert.deepEqual(mesh.morphTargetInfluences,values,'calibration must preserve all initial weights');
const binding=createFaceBinding(meshes,baseline,calibration,audit), clock=createFacialActing({pass:'b',morphLimits:audit.limits,gazeAxes:measuredGazeAxes(THREE,calibration)});
for(let i=0;i<3600;i++)binding.apply(clock.advance(1/60));
binding.restore();for(const [mesh,values] of baseline)assert.deepEqual(mesh.morphTargetInfluences,values);
assert.ok(binding.channels.includes('E_Close_R'));assert.ok(binding.channels.includes('E_Close_L'));assert.ok(binding.channels.includes('M_Smile_R'));assert.ok(binding.channels.includes('M_Smile_L'));
const transforms=new Map(bones.map(b=>[b,{position:b.position.toArray(),quaternion:b.quaternion.toArray(),scale:b.scale.toArray()}]));
const signature=createRightSignaturePose({THREE,bones,meshes,head:heads[0],calibration});
assert.equal(signature.diagnostics().ready,true);for(const [b,t]of transforms)assert.deepEqual(b.quaternion.toArray(),t.quaternion,'pose construction restores every bone');
assert.equal(signature.apply(),true);let changed=0;for(const [b,t]of transforms){assert.deepEqual(b.position.toArray(),t.position);assert.deepEqual(b.scale.toArray(),t.scale);if(!b.quaternion.toArray().every((v,i)=>v===t.quaternion[i])){assert.match(b.name,/^(ORG|DEF)-Bip001(UpperArm|Forearm|Hand)R$/);changed++;}}assert.equal(changed,6);
const presenting=createFacialActing({pass:'presentation',intensity:.75,morphLimits:audit.limits,gazeAxes:measuredGazeAxes(THREE,calibration)});for(let i=0;i<3600;i++)binding.apply(presenting.advance(1/60));binding.restore();signature.restore();
for(const [b,t]of transforms)assert.deepEqual(b.quaternion.toArray(),t.quaternion);for(const [mesh,values]of baseline)assert.deepEqual(mesh.morphTargetInfluences,values);
assert.equal(signature.apply(),true);const leftPose=new Map(bones.map(b=>[b,b.quaternion.toArray()]));
const chest=createChestPose({THREE,bones,meshes,head:heads[0],calibration,side:'L'});assert.equal(chest.diagnostics().ready,true);assert.equal(chest.atBaseline(),true);
for(const [b,values]of leftPose)assert.deepEqual(b.quaternion.toArray(),values,'candidate audit must restore transforms');
for(const t of [0,.25,.5,.75,1]){assert.equal(chest.apply(t),true);for(const [b,values]of leftPose)if(/R(?:\d+)?$/.test(b.name))assert.deepEqual(b.quaternion.toArray(),values,'left gesture must not overwrite right chain');}
assert.equal(chest.atBaseline(),false);chest.restore();assert.equal(chest.atBaseline(),true);for(const [b,values]of leftPose)assert.deepEqual(b.quaternion.toArray(),values);
const events=[],actor=createChestDirector({pose:chest,onEvent:e=>events.push(e)});assert.equal(actor.start(true),true);for(let i=0;i<500;i++)actor.advance(.02);assert.equal(actor.busy(),false);assert.deepEqual(events,['gesture:prepare','gesture:hold','gesture:release']);for(const [b,values]of leftPose)assert.deepEqual(b.quaternion.toArray(),values);signature.restore();
console.log(JSON.stringify({chest:chest.diagnostics(),rightSignature:signature.diagnostics(),privateAudit:'PASS',skinnedParts:meshes.length,joints:bones.length,calibratedPupilControls:calibration.records.length,auditedCandidates:audit.rows.length,exactRestore:true,rendering:'NOT TESTED — placeholder images, no WebGL'}));
