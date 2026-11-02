/** Original authored upper-body phrases. Offline only. No copied animation, audio, IK or leg/root translation. */
import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {danceRig} from './lib/hsin-dance-rig.mjs';
const {T,bytes,profileBytes,profile,model,bones,by}=await danceRig(),hash=b=>createHash('sha256').update(b).digest('hex');
const parts=['Spine2','Neck','Head','ClavicleR','ClavicleL','UpperArmR','ForearmR','HandR','UpperArmL','ForearmL','HandL'],names=parts.flatMap(p=>['ORG-Bip001'+p,'DEF-Bip001'+p]),owned=names.map(n=>{if(!by.has(n))throw Error('Missing '+n);return by.get(n);}),rest=owned.flatMap(b=>b.quaternion.toArray()),all=bones.map(b=>b.quaternion.clone());
const pos=n=>by.get('ORG-Bip001'+n).getWorldPosition(new T.Vector3()),up=pos('Neck').sub(pos('Spine2')).normalize(),lateral=pos('UpperArmL').sub(pos('UpperArmR')).normalize(),forward=lateral.clone().cross(up).normalize();
const worldRest=new Map(bones.map(b=>[b.name,b.getWorldQuaternion(new T.Quaternion()).normalize()]));
const ease=t=>t*t*t*(t*(t*6-15)+10),key=(t,values)=>({t,...values});
const definitions={
 'moon-breathing':{seconds:9,energy:'very-low',keys:[key(0,{}),key(.42,{roll:.6,yaw:.5,outR:1,outL:1.4,elbowR:2,elbowL:3,headRoll:-.7}),key(.78,{roll:-.4,yaw:-.4,elbowR:1.5,elbowL:1,headRoll:.4}),key(1,{})]},
 'silk-sway':{seconds:12,energy:'low',keys:[key(0,{}),key(.18,{roll:-1.5,yaw:-2,outR:3,outL:5,elbowR:6,elbowL:9,wristR:3,headRoll:1}),key(.48,{roll:1.8,yaw:2.5,outR:7,outL:3,elbowR:12,elbowL:5,wristL:-4,headYaw:-1.5}),key(.72,{roll:-.8,yaw:-1.2,outR:2,outL:6,elbowL:10,wristR:-2,headRoll:.6}),key(1,{})]},
 'fox-invitation':{seconds:11,energy:'moderate',keys:[key(0,{}),key(.15,{yaw:-1,headYaw:1,elbowR:5}),key(.44,{yaw:2,roll:-.8,outR:11,liftR:3,elbowR:17,wristR:5,outL:2,elbowL:5,headYaw:-1.5}),key(.58,{yaw:2,roll:-.8,outR:11,liftR:3,elbowR:17,wristR:5,elbowL:5,headYaw:-1.5}),key(.80,{yaw:.8,outR:4,elbowR:7,wristR:2}),key(1,{})]},
 'crescent-turn':{seconds:12,energy:'moderate',keys:[key(0,{}),key(.22,{yaw:-3,roll:-1,outL:5,elbowL:8,headYaw:1.5}),key(.52,{yaw:4,roll:1.2,outR:8,outL:4,elbowR:12,elbowL:6,headYaw:-2.5,headRoll:-.7}),key(.75,{yaw:1,roll:.3,outR:3,elbowR:5,headYaw:-.5}),key(1,{})]},
 'lunar-step':{seconds:10,energy:'moderate',fallback:'Planted-foot support sway; no hip/leg/root displacement',keys:[key(0,{}),key(.30,{roll:-1.8,yaw:-1,shoulderR:.8,shoulderL:-.6,outL:5,elbowL:7,headRoll:1.2}),key(.64,{roll:1.8,yaw:1.3,shoulderR:-.6,shoulderL:.8,outR:5,elbowR:7,headRoll:-1.2}),key(1,{})]},
 'petal-flourish':{seconds:14,energy:'expressive',keys:[key(0,{}),key(.15,{yaw:-1,roll:-.6,elbowR:5,elbowL:8}),key(.38,{yaw:2,outR:13,outL:9,elbowR:19,elbowL:13,wristR:5,wristL:-3,headRoll:-1}),key(.57,{yaw:3,outR:9,outL:16,elbowR:14,elbowL:22,wristR:2,wristL:5,headYaw:-1.5}),key(.70,{yaw:1.5,outR:5,outL:13,elbowR:7,elbowL:18,wristL:3}),key(.85,{outL:4,elbowL:6,headRoll:.4}),key(1,{})]},
 'lunar-repose':{seconds:3.2,energy:'decreasing',keys:[key(0,{}),key(.32,{roll:.3,headRoll:.6,headYaw:.3,elbowR:1,elbowL:1.2}),key(.66,{headRoll:.2}),key(1,{})]},
};
function value(keys,name,t){const delay=/wrist/.test(name)?.045:/elbow/.test(name)?.025:/head/.test(name)?.015:0;t=Math.max(0,Math.min(1,(t-delay)/(1-delay)));const i=Math.max(0,keys.findIndex((k,j)=>j<keys.length-1&&t>=k.t&&t<=keys[j+1].t)),a=keys[i],b=keys[i+1],u=ease(Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t))));return (a[name]??0)+((b[name]??0)-(a[name]??0))*u;}
function rotateWorld(b,axis,degrees){if(!degrees)return;const desired=new T.Quaternion().setFromAxisAngle(axis,degrees*Math.PI/180).multiply(b.getWorldQuaternion(new T.Quaternion()).normalize());b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).normalize().invert().multiply(desired)).normalize();b.updateMatrix();model.updateMatrixWorld(true);}
const phrases={};
for(const [name,def]of Object.entries(definitions)){
 const frames=[];for(let frame=0;frame<=64;frame++){
  bones.forEach((b,i)=>{b.quaternion.copy(all[i]);b.updateMatrix();});model.updateMatrixWorld(true);const t=frame/64,get=k=>value(def.keys,k,t);
  if(frame===0||frame===64){frames.push([...rest]);continue;}
  for(const part of parts){const driver=by.get('ORG-Bip001'+part),deformer=by.get('DEF-Bip001'+part);
   if(part==='Spine2'){rotateWorld(driver,up,get('yaw'));rotateWorld(driver,forward,get('roll'));}
   if(part==='Head'){rotateWorld(driver,up,get('headYaw'));rotateWorld(driver,forward,get('headRoll'));}
   if(part.startsWith('Clavicle'))rotateWorld(driver,forward,get('shoulder'+part.at(-1)));
   if(part.startsWith('UpperArm')){const side=part.at(-1);rotateWorld(driver,forward,get('out'+side)*(side==='R'?-1:1));rotateWorld(driver,lateral,-get('lift'+side));}
   if(part.startsWith('Forearm')||part.startsWith('Hand')){
    const side=part.at(-1),source=profile.poses[side==='R'?'signature':'chest'],i=source.names.indexOf(driver.name),q0=new T.Quaternion().fromArray(source.rest,i*4),q1=new T.Quaternion().fromArray(source.frames[24],i*4),d=q1.multiply(q0.invert()).normalize();if(d.w<0)d.set(-d.x,-d.y,-d.z,-d.w);const axis=new T.Vector3(d.x,d.y,d.z).normalize(),deg=get((part.startsWith('Forearm')?'elbow':'wrist')+side);driver.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(axis,deg*Math.PI/180)).normalize();driver.updateMatrix();model.updateMatrixWorld(true);
   }
   // Different DEF parents/split twist bones: reconcile actual driver WORLD delta, proximal first.
   const desired=driver.getWorldQuaternion(new T.Quaternion()).normalize().multiply(worldRest.get(driver.name).clone().invert()).multiply(worldRest.get(deformer.name));deformer.quaternion.copy(deformer.parent.getWorldQuaternion(new T.Quaternion()).normalize().invert().multiply(desired)).normalize();deformer.updateMatrix();model.updateMatrixWorld(true);
  }
  frames.push(owned.flatMap(b=>b.quaternion.toArray().map(v=>+v.toFixed(7))));
 }
 phrases[name]={seconds:def.seconds,energy:def.energy,...(def.fallback?{fallback:def.fallback}:{}),frames};
}
const data={version:'lunar-dance-experimental-r1',publicVersion:'2.0.1',modelSha256:hash(bytes),profileSha256:hash(profileBytes),method:'OFFLINE_AUTHORED_ANATOMICAL_KEYS_WORLD_DEF_RECONCILIATION',visual:'VISUAL_QA_PENDING',names,rest,phrases,ownership:{dance:names,unchanged:['root','pelvis','legs','feet','fingers','morph targets'],footPolicy:'Both feet planted; Lunar Step is an upper-body support sway fallback'},authoredKeys:definitions};
const text=JSON.stringify(data)+'\n';await mkdir('public/assets/animations/hsin',{recursive:true});await writeFile('public/assets/animations/hsin/lunar-dance-r1.json',text);await writeFile('src/data/hsin-dance.json',JSON.stringify({url:'/assets/animations/hsin/lunar-dance-r1.json',sha256:hash(text),bytes:Buffer.byteLength(text),modelSha256:data.modelSha256,profileSha256:data.profileSha256},null,2)+'\n');console.log(JSON.stringify({bones:names.length,phrases:Object.keys(phrases),bytes:Buffer.byteLength(text)}));
