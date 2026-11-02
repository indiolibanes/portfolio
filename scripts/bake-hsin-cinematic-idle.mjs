/** Offline reference retarget. Preserves the existing actor format and gesture endpoints. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HSIN_CINEMATIC_IDLE,cinematicDefinition} from '../src/scripts/hsin-cinematic-idle.mjs';

export function buildCinematicProfile({scene,bones,source,config=HSIN_CINEMATIC_IDLE}){
 if(Object.values(config.proximalOffsets).some(v=>v!==0))throw Error('Proximal offsets require separate world-space trajectory recalibration.');
 if(!(config.fadeEnd>0&&config.fadeEnd<=1&&Number.isInteger(config.fadeEnd*64)))throw Error('Fade boundary must align to the original 65-frame grid.');
 for(const [value,limit]of [[config.head.yaw,6],[config.head.roll,5],...Object.values(config.arms).flatMap(arm=>[[arm.adduction,7],[arm.elbowFlexion,10],[arm.wristFlexion,6]])])if(!Number.isFinite(value)||Math.abs(value)>limit)throw Error('Offset exceeds the conservative cinematic bake limits.');
 const byName=new Map(bones.map(b=>[b.name,b])),q=()=>new THREE.Quaternion(),v=()=>new THREE.Vector3();
 const find=name=>{const b=byName.get(name);if(!b)throw Error('Missing bone '+name);return b;};
 const original=new Map(bones.map(b=>[b,b.quaternion.toArray()]));
 const restore=()=>{for(const[b,values]of original)b.quaternion.fromArray(values);scene.updateMatrixWorld(true);};
 scene.updateMatrixWorld(true);
 const up=find('ORG-Bip001Neck').getWorldPosition(v()).sub(find('ORG-Bip001Spine2').getWorldPosition(v())).normalize();
 const left=find('ORG-Bip001UpperArmL').getWorldPosition(v()).sub(find('ORG-Bip001UpperArmR').getWorldPosition(v()));
 left.addScaledVector(up,-left.dot(up)).normalize();const forward=v().crossVectors(left,up).normalize();
 const head=find('ORG-Bip001Head'),faceForward=head.localToWorld(new THREE.Vector3(...source.calibration.focusCenter)).sub(head.getWorldPosition(v()));
 if(forward.dot(faceForward)<=0)throw Error('Anatomical forward is inconsistent with face calibration.');
 const parentAxis=(bone,axis)=>axis.clone().applyQuaternion(bone.parent.getWorldQuaternion(q()).invert()).normalize();
 const delta=(bone,axis,degrees)=>q().setFromAxisAngle(parentAxis(bone,axis),THREE.MathUtils.degToRad(degrees));
 const deltas=new Map(),angles=[];
 for(const side of ['R','L']){
  const arm=config.arms[side],upper=find('ORG-Bip001UpperArm'+side),fore=find('ORG-Bip001Forearm'+side),hand=find('ORG-Bip001Hand'+side);
  const upperDirection=fore.getWorldPosition(v()).sub(upper.getWorldPosition(v())).normalize(),foreDirection=hand.getWorldPosition(v()).sub(fore.getWorldPosition(v())).normalize();
  const adduct=v().crossVectors(upperDirection,up.clone().negate()).normalize(),flex=v().crossVectors(foreDirection,forward).normalize();
  for(const [bone,axis,degrees,component]of [[upper,adduct,arm.adduction,'adduction'],[fore,flex,arm.elbowFlexion,'elbowFlexion'],[hand,flex,arm.wristFlexion,'wristFlexion']]){
   deltas.set(bone.name,delta(bone,axis,degrees));angles.push({name:bone.name,component,degrees,worldAxis:axis.toArray()});
  }
 }
 // Seventh-degree smootherstep: first three derivatives vanish at both limits.
 // The existing 65-frame SLERP remains piecewise; dense tests bound its residual knot speed.
 const fade=t=>{const u=Math.max(0,Math.min(1,t/config.fadeEnd));return 1-u**4*(35-84*u+70*u*u-20*u*u*u);};
 const poses={},reference=new Map();
 for(const [label,data]of Object.entries(source.poses)){
  const side=label==='signature'?'R':'L',chain=data.names.map(find),drivers=['UpperArm','Forearm','Hand'].map(p=>find('ORG-Bip001'+p+side)),deformers=['UpperArm','Forearm','Hand'].map(p=>find('DEF-Bip001'+p+side));
  function transform(frame,amount){
   restore();if(frame)chain.forEach((b,i)=>b.quaternion.fromArray(frame,i*4));scene.updateMatrixWorld(true);
   const driverWorld=drivers.map(b=>b.getWorldQuaternion(q())),deformerWorld=deformers.map(b=>b.getWorldQuaternion(q()));
   for(const driver of drivers){const offset=q().slerpQuaternions(q(),deltas.get(driver.name),amount);driver.quaternion.premultiply(offset).normalize();}
   scene.updateMatrixWorld(true);
   // Different DEF parents include split/twist segments. Match each driver's WORLD delta,
   // then solve the deformer LOCAL rotation under its already-updated parent, proximal first.
   for(let i=0;i<3;i++){
    const desired=drivers[i].getWorldQuaternion(q()).multiply(driverWorld[i].clone().invert()).multiply(deformerWorld[i]);
    deformers[i].quaternion.copy(deformers[i].parent.getWorldQuaternion(q()).invert().multiply(desired)).normalize();
    deformers[i].updateWorldMatrix(true,true);
   }
   return chain.flatMap(b=>b.quaternion.toArray());
  }
  const rest=transform(null,1);
  chain.forEach((b,i)=>reference.set(b.name,{name:b.name,original:original.get(b),quaternion:rest.slice(i*4,i*4+4)}));
  const retarget=frames=>frames.map((frame,i)=>i===0?[...rest]:i/(frames.length-1)>=config.fadeEnd?[...frame]:transform(frame,fade(i/(frames.length-1))).map(n=>Math.round(n*1e8)/1e8));
  poses[label]={...data,rest,frames:retarget(data.frames)};
  for(const key of ['negative','positive'])if(data[key])poses[label][key]=retarget(data[key]);
 }
 restore();
 // No trunk/clavicle offset: the 8-degree camera handles body obliquity without moving
 // shoulders or the approved world-space hand targets. Neck remains the exported reference.
 for(const prefix of ['ORG','DEF']){
  const bone=find(prefix+'-Bip001Head');
  const yaw=delta(bone,up,config.head.yaw),roll=delta(bone,forward,config.head.roll),offset=roll.multiply(yaw);
  const next=offset.multiply(bone.quaternion.clone()).normalize();reference.set(bone.name,{name:bone.name,original:original.get(bone),quaternion:next.toArray()});
  angles.push({name:bone.name,component:'yaw',degrees:config.head.yaw,worldAxis:up.toArray()},{name:bone.name,component:'roll',degrees:config.head.roll,worldAxis:forward.toArray()});
 }
 restore();
 return {
  profile:{...source,version:'2.1',poses,validation:{...source.validation,maxAngularErrorContext:'Source V2 bake only; cinematic early reference differs intentionally. VISUAL_QA_PENDING.'},cinematicIdle:{definition:cinematicDefinition(config),reference:[...reference.values()],method:'PARENT_SPACE_OFFSETS_WITH_WORLD_DELTA_DEF_RECONCILIATION',unchangedFromWeight:config.fadeEnd}},
  audit:{bones:bones.length,clips:0,axes:{up:up.toArray(),left:left.toArray(),forward:forward.toArray()},offsets:angles,
   appliedLocalOffsets:[...reference.values()].map(row=>({name:row.name,parent:find(row.name).parent.name,angleDegrees:THREE.MathUtils.radToDeg(q().fromArray(row.original).normalize().angleTo(q().fromArray(row.quaternion).normalize()))})),
   restQuaternions:Object.fromEntries(bones.map(b=>[b.name,{parent:b.parent.name,original:original.get(b)}])),cinematicOverrides:Object.fromEntries([...reference].map(([name,row])=>[name,row.quaternion])),
   untouched:['spine','neck','clavicles','hips','legs','feet','fingers','morphs','materials'],
   visual:'VISUAL_QA_PENDING'},
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const model=await readFile('public/assets/models/hsin/hsin-v2.0.glb'),sourceBytes=await readFile('public/assets/models/hsin/hsin-v2.0-profile.json');
 globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{};
 const gltf=await new GLTFLoader().parseAsync(model.buffer.slice(model.byteOffset,model.byteOffset+model.byteLength),'');
 const meshes=[];gltf.scene.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))];
 const {profile,audit}=buildCinematicProfile({scene:gltf.scene,bones,source:JSON.parse(sourceBytes)});
 const bytes=JSON.stringify(profile)+'\n',hash=b=>createHash('sha256').update(b).digest('hex');
 const manifest={version:'2.1',profileSha256:hash(bytes),bytes:Buffer.byteLength(bytes),sourceProfileSha256:hash(sourceBytes),modelSha256:hash(model)};
 await writeFile('public/assets/models/hsin/hsin-v2.1-profile.json',bytes);
 await writeFile('src/data/hsin-v21-pose.json',JSON.stringify(manifest,null,2)+'\n');
 await writeFile('docs/hsin-v21-rest-audit.json',JSON.stringify(audit,null,2)+'\n');
 console.log(JSON.stringify({manifest,modifiedBones:profile.cinematicIdle.reference.length,offsets:audit.offsets}));
}
