/** Authored in-place Answering Form study. All world-to-local conversion is offline. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createLowerSolver} from './lib/hsin-dance-lower.mjs';
import {danceRig} from './lib/hsin-dance-rig.mjs';
const r=await danceRig(),{T,model,by}=r,support=createLowerSolver(r);
const secondary=JSON.parse(await readFile('public/assets/animations/hsin/lunar-dance-r3.json')).secondary;
const parts=['Spine2','Neck','Head','ClavicleR','ClavicleL','UpperArmR','ForearmR','HandR','UpperArmL','ForearmL','HandL'];
const lowerParts=['ThighL','CalfL','FootL','Toe0L','ThighR','CalfR','FootR','Toe0R'];
const names=[...lowerParts.flatMap(p=>['ORG-Bip001'+p,'DEF-Bip001'+p]),...parts.flatMap(p=>['ORG-Bip001'+p,'DEF-Bip001'+p]),...secondary.names];
if(new Set(names).size!==names.length)throw Error('Overlapping ownership');
const bones=names.map(n=>by.get(n)),rest=bones.flatMap(b=>b.quaternion.toArray());
const worlds=new Map(bones.map(b=>[b.name,b.getWorldQuaternion(new T.Quaternion())]));
const point=n=>by.get('ORG-Bip001'+n).getWorldPosition(new T.Vector3());
const up=point('Neck').sub(point('Spine2')).normalize();
const lateral=point('UpperArmL').sub(point('UpperArmR')).normalize();
const forward=new T.Vector3().crossVectors(lateral,up).normalize();
const keys=[
 {t:0},{t:.8,outR:12,elbowR:30,liftR:16,outL:10,elbowL:26,liftL:12,yaw:-8,hip:-.025,sink:-.028},
 {t:1.5,outR:16,elbowR:60,liftR:28,outL:14,elbowL:32,liftL:15,yaw:-18,hip:-.055,sink:-.055},
 {t:2.05,outR:42,elbowR:22,liftR:58,outL:18,elbowL:26,liftL:16,yaw:20,hip:.06,sink:-.04,headYaw:-8},
 {t:2.5,outR:22,elbowR:40,liftR:22,outL:18,elbowL:48,liftL:28,yaw:2,hip:.015,sink:-.05},
 {t:3.05,outR:24,elbowR:30,liftR:18,outL:42,elbowL:20,liftL:56,yaw:-18,hip:-.055,sink:-.04,headYaw:8},
 {t:3.6,outR:18,elbowR:34,liftR:20,outL:20,elbowL:34,liftL:18,yaw:-5,hip:-.025,sink:-.03},
 {t:4.5,outR:16,elbowR:55,liftR:32,outL:18,elbowL:32,liftL:20,yaw:-14,hip:-.05,sink:-.06},
 {t:5.35,outR:30,elbowR:26,liftR:72,outL:24,elbowL:30,liftL:24,yaw:16,hip:.055,sink:-.035,wristR:8},
 {t:6,outR:24,elbowR:30,liftR:34,outL:14,elbowL:24,liftL:14,yaw:6,hip:.025,sink:-.025},
 {t:7,outR:12,elbowR:24,outL:8,elbowL:18,yaw:-3,hip:0,sink:-.008},{t:8.4}
];
const ease=t=>t*t*t*(t*(t*6-15)+10);
function value(field,t){let i=0;while(i<keys.length-2&&t>keys[i+1].t)i++;const a=keys[i],b=keys[i+1],u=ease(Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t))));return (a[field]??0)+((b[field]??0)-(a[field]??0))*u;}
function setWorld(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q)).normalize();b.updateMatrix();model.updateMatrixWorld(true);}
function rotate(b,axis,angle){setWorld(b,new T.Quaternion().setFromAxisAngle(axis,angle*Math.PI/180).multiply(b.getWorldQuaternion(new T.Quaternion())));}
const frames=[],positionFrames=[],positionRest=support.root.position.toArray();
for(let f=0;f<=252;f++){
 const t=f/30;
 support.reset();
 support.setRootWorldDelta(support.axes.lateral.clone().multiplyScalar(value('hip',t)).addScaledVector(support.axes.up,value('sink',t)));
 for(const side of ['L','R'])support.solve(side,support.world.get('ORG-Bip001Foot'+side).p.clone());
 for(const part of parts){
  const driver=by.get('ORG-Bip001'+part),def=by.get('DEF-Bip001'+part);
  if(part==='Spine2')rotate(driver,up,value('yaw',t));
  if(part==='Head')rotate(driver,up,value('headYaw',t));
  if(part.startsWith('UpperArm')){const side=part.at(-1);rotate(driver,forward,value('out'+side,t)*(side==='R'?-1:1));rotate(driver,lateral,-value('lift'+side,t));}
  if(part.startsWith('Forearm')||part.startsWith('Hand')){
   const side=part.at(-1),source=r.profile.poses[side==='R'?'signature':'chest'],i=source.names.indexOf(driver.name);
   const delta=new T.Quaternion().fromArray(source.frames[24],i*4).multiply(new T.Quaternion().fromArray(source.rest,i*4).invert()).normalize();
   if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
   driver.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(delta.x,delta.y,delta.z).normalize(),value((part.startsWith('Forearm')?'elbow':'wrist')+side,t)*Math.PI/180));driver.updateMatrix();model.updateMatrixWorld(true);
  }
  setWorld(def,driver.getWorldQuaternion(new T.Quaternion()).multiply(worlds.get(driver.name).clone().invert()).multiply(worlds.get(def.name)));
 }
 // R3 local axes, group gain and depth delay; bounded 1 degree travelling response.
 secondary.names.forEach((name,i)=>{
  const time=Math.max(0,t-secondary.depth[i]*.025);
  const envelope=Math.sin(Math.PI*t/8.4)**2;
  const angle=(value('yaw',time)-value('yaw',Math.max(0,time-.12)))*.28*envelope*secondary.gain[i];
  const ax=secondary.axes[i],b=by.get(name);
  b.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...ax.slice(0,3)),angle*Math.PI/180));b.updateMatrix();
 });
 positionFrames.push(support.root.position.toArray());
 frames.push(bones.flatMap(b=>b.quaternion.toArray()));
}
frames[0]=rest.slice();frames[frames.length-1]=rest.slice();
// Recovery support lattice: interpolate pre-solved leg poses, never run IK in the player.
const recoveryNames=lowerParts.flatMap(part=>['ORG-Bip001'+part,'DEF-Bip001'+part]);
const recoverySteps=17,recoveryPacked=Buffer.alloc(frames.length*recoverySteps*recoveryNames.length*4*2);
for(let frame=0;frame<frames.length;frame++)for(let step=0;step<recoverySteps;step++){
 const t=frame/30,gain=1-step/(recoverySteps-1);
 support.reset();
 support.setRootWorldDelta(support.axes.lateral.clone().multiplyScalar(value('hip',t)*gain).addScaledVector(support.axes.up,value('sink',t)*gain));
 for(const side of ['L','R'])support.solve(side,support.world.get('ORG-Bip001Foot'+side).p.clone());
 recoveryNames.forEach((name,i)=>by.get(name).quaternion.toArray().forEach((v,k)=>recoveryPacked.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),((frame*recoverySteps+step)*recoveryNames.length*4+i*4+k)*2)));
}
const hash=b=>createHash('sha256').update(b).digest('hex');
const data={version:'combat-r2',provenance:'EXPERIMENTAL_AUTHORED',modelSha256:hash(r.bytes),profileSha256:hash(r.profileBytes),seconds:8.4,names,rest,frames,positionNames:[support.root.name],positionRest,positionFrames,sequence:{seconds:8.4,phases:[['PREPARATION',0],['BASIC',1.5],['SKILL',3.6],['RECOVERY',6],['COMPLETE',8.4]],markers:[['energy',.8],['arc',2.05],['arc-left',3.05],['ring',5.35],['recovery',6]]}};
const packed=Buffer.alloc(frames.length*rest.length*2);
frames.forEach((frame,f)=>frame.forEach((value,k)=>packed.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),(f*rest.length+k)*2)));
data.recovery={names:recoveryNames,steps:recoverySteps,quaternions:recoveryPacked.toString('base64')};
data.frameCount=frames.length;data.quaternions=packed.toString('base64');delete data.frames;
const text=JSON.stringify(data);
await writeFile('public/assets/animations/hsin/combat-r2.json',text);
await writeFile('src/data/hsin-combat-r2.json',JSON.stringify({url:'/assets/animations/hsin/combat-r2.json',sha256:hash(text),bytes:Buffer.byteLength(text),modelSha256:data.modelSha256,profileSha256:data.profileSha256},null,2)+'\n');
console.log({bones:names.length,frames:frames.length,bytes:Buffer.byteLength(text)});
