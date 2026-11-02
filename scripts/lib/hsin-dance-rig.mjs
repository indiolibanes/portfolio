import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCinematicReference} from '../../src/scripts/hsin-cinematic-idle.mjs';
import {createLunarPresentation} from '../../src/scripts/hsin-lunar-presentation.mjs';
export async function danceRig(){
 globalThis.self=globalThis;globalThis.createImageBitmap??=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent??=class{};
 const bytes=await readFile('public/assets/models/hsin/hsin-v2.0.glb'),profileBytes=await readFile('public/assets/models/hsin/hsin-v2.1-profile.json'),profile=JSON.parse(profileBytes),{scene:model}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const meshes=[];model.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))],by=new Map(bones.map(b=>[b.name,b]));model.position.y-=profile.bounds.min[1];createCinematicReference({bones,profile}).apply();model.updateMatrixWorld(true);createLunarPresentation({THREE:T,model,bones,bounds:profile.bounds}).apply();model.updateMatrixWorld(true);
 return {T,bytes,profileBytes,profile,model,meshes,bones,by};
}
