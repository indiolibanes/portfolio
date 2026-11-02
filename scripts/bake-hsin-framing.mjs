/** Offline envelope from the real skinned GLB, including existing arm poses. No runtime IK. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCinematicReference} from '../src/scripts/hsin-cinematic-idle.mjs';
import {createLunarPresentation,HSIN_LUNAR_PRESENTATION} from '../src/scripts/hsin-lunar-presentation.mjs';
import {createBakedPose} from '../src/scripts/hsin-baked-pose.mjs';
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{};
const bytes=await readFile('public/assets/models/hsin/hsin-v2.0.glb'),profileBytes=await readFile('public/assets/models/hsin/hsin-v2.1-profile.json'),profile=JSON.parse(profileBytes),hash=b=>createHash('sha256').update(b).digest('hex');
const {scene:model}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');model.position.y-=profile.bounds.min[1];const meshes=[];model.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))];createCinematicReference({bones,profile}).apply();model.updateMatrixWorld(true);createLunarPresentation({THREE:T,model,bones,bounds:profile.bounds}).apply();
const box=new T.Box3(),cameraBox=new T.Box3(),rest=new T.Box3(),v=new T.Vector3(),rotate=new T.Matrix4().makeRotationY(-HSIN_LUNAR_PRESENTATION.cameraAzimuth*Math.PI/180);
function sample(isRest=false){model.updateMatrixWorld(true);for(const m of meshes){m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);box.expandByPoint(v);if(isRest)rest.expandByPoint(v);cameraBox.expandByPoint(v.applyMatrix4(rotate));}}}
sample(true);
for(const data of Object.values(profile.poses)){const pose=createBakedPose({THREE:T,data,bones});for(let i=0;i<=8;i++){pose.apply(i/8);sample();}pose.restore();}
const serialize=b=>({min:b.min.toArray(),max:b.max.toArray()});const result={modelSha256:hash(bytes),profileSha256:hash(profileBytes),presentation:HSIN_LUNAR_PRESENTATION,method:'Real skinned vertices at rest and 9 weights of each baked pose; camera-yaw-space envelope, not a continuous collision proof',world:serialize(box),camera:serialize(cameraBox),rest:serialize(rest)};
await writeFile('src/data/hsin-v201-framing.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
