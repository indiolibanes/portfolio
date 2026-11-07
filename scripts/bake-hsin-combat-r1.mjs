/** Authored in-place Answering Form study. All world-to-local conversion is offline. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {danceRig} from './lib/hsin-dance-rig.mjs';
const r=await danceRig(),{T,model,by}=r;
const secondary=JSON.parse(await readFile('public/assets/animations/hsin/lunar-dance-r3.json')).secondary;
const parts=['Spine2','Neck','Head','ClavicleR','ClavicleL','UpperArmR','ForearmR','HandR','UpperArmL','ForearmL','HandL'];
const names=[...parts.flatMap(p=>['ORG-Bip001'+p,'DEF-Bip001'+p]),...secondary.names];
if(new Set(names).size!==names.length)throw Error('Overlapping ownership');
const bones=names.map(n=>by.get(n)),rest=bones.flatMap(b=>b.quaternion.toArray());
const worlds=new Map(bones.map(b=>[b.name,b.getWorldQuaternion(new T.Quaternion())]));
const point=n=>by.get('ORG-Bip001'+n).getWorldPosition(new T.Vector3());
const up=point('Neck').sub(point('Spine2')).normalize();
const lateral=point('UpperArmL').sub(point('UpperArmR')).normalize();
const forward=new T.Vector3().crossVectors(lateral,up).normalize();
const keys=[
 {t:0},{t:.7,outR:8,elbowR:18,outL:5,elbowL:12,yaw:-2},
 {t:1.3,outR:13,elbowR:28,liftR:8,yaw:-5,headYaw:3},
 {t:1.65,outR:32,elbowR:12,liftR:14,yaw:5,headYaw:-3},
 {t:2.2,outR:18,elbowR:18,liftR:10,yaw:2},
 {t:2.8,outR:14,elbowR:30,liftR:16,outL:10,elbowL:18,yaw:-3},
 {t:3.35,outR:26,elbowR:16,liftR:24,outL:12,elbowL:20,yaw:3,wristR:6},
 {t:3.85,outR:22,elbowR:18,liftR:20,yaw:2},
 {t:4.5,outR:8,elbowR:18,outL:5,elbowL:12,yaw:-2},
 {t:5.8}
];
const ease=t=>t*t*t*(t*(t*6-15)+10);
function value(field,t){let i=0;while(i<keys.length-2&&t>keys[i+1].t)i++;const a=keys[i],b=keys[i+1],u=ease(Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t))));return (a[field]??0)+((b[field]??0)-(a[field]??0))*u;}
function setWorld(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q)).normalize();b.updateMatrix();model.updateMatrixWorld(true);}
function rotate(b,axis,angle){setWorld(b,new T.Quaternion().setFromAxisAngle(axis,angle*Math.PI/180).multiply(b.getWorldQuaternion(new T.Quaternion())));}
const frames=[];
for(let f=0;f<=174;f++){
 const t=f/30;
 bones.forEach((b,i)=>{b.quaternion.fromArray(rest,i*4);b.updateMatrix();});model.updateMatrixWorld(true);
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
  const envelope=Math.sin(Math.PI*t/5.8)**2;
  const angle=(value('yaw',time)-value('yaw',Math.max(0,time-.12)))*.18*envelope*secondary.gain[i];
  const ax=secondary.axes[i],b=by.get(name);
  b.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...ax.slice(0,3)),angle*Math.PI/180));b.updateMatrix();
 });
 frames.push(bones.flatMap(b=>b.quaternion.toArray()));
}
frames[0]=rest.slice();frames[frames.length-1]=rest.slice();
const hash=b=>createHash('sha256').update(b).digest('hex');
const data={version:'combat-r1',provenance:'EXPERIMENTAL_AUTHORED',modelSha256:hash(r.bytes),profileSha256:hash(r.profileBytes),seconds:5.8,names,rest,frames};
const packed=Buffer.alloc(frames.length*rest.length*2);
frames.forEach((frame,f)=>frame.forEach((value,k)=>packed.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),(f*rest.length+k)*2)));
data.frameCount=frames.length;data.quaternions=packed.toString('base64');delete data.frames;
const text=JSON.stringify(data);
await writeFile('public/assets/animations/hsin/combat-r1.json',text);
await writeFile('src/data/hsin-combat-r1.json',JSON.stringify({url:'/assets/animations/hsin/combat-r1.json',sha256:hash(text),bytes:Buffer.byteLength(text),modelSha256:data.modelSha256,profileSha256:data.profileSha256},null,2)+'\n');
console.log({bones:names.length,frames:frames.length,bytes:Buffer.byteLength(text)});
