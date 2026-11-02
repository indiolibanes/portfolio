/** R2 authored choreography. All support/IK work happens here, never in the render loop. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {danceRig} from './lib/hsin-dance-rig.mjs';
import {createLowerSolver} from './lib/hsin-dance-lower.mjs';
const r=await danceRig(),{T,model,bones,by}=r,support=createLowerSolver(r),hash=b=>createHash('sha256').update(b).digest('hex');
const original=JSON.parse(await readFile('public/assets/animations/hsin/lunar-dance-r1.json'));
const upperParts=['Spine2','Neck','Head','ClavicleR','ClavicleL','UpperArmR','ForearmR','HandR','UpperArmL','ForearmL','HandL'];
const lowerParts=['ThighL','CalfL','FootL','Toe0L','ThighR','CalfR','FootR','Toe0R'];
const names=[...upperParts,...lowerParts].flatMap(p=>['ORG-Bip001'+p,'DEF-Bip001'+p]),owned=names.map(n=>by.get(n)),rest=owned.flatMap(b=>b.quaternion.toArray());
const positionNames=[support.root.name],positionRest=support.root.position.toArray();
const definitions=structuredClone(original.authoredKeys);delete definitions['lunar-step'];
const timing={'moon-breathing':3.8,'silk-sway':4.2,'fox-invitation':3.6,'crescent-turn':4.4,'petal-flourish':3.7,'lunar-repose':1.4};
for(const [name,p]of Object.entries(definitions)){
 p.seconds=timing[name];
 for(const k of p.keys)for(const field of Object.keys(k)){
  if(field==='t')continue;
  const gain=/yaw|roll/i.test(field)?2.5:/out/.test(field)?1.3:/elbow/.test(field)?1.25:1.5;
  k[field]=+(k[field]*gain).toFixed(3);
 }
}
definitions['lunar-waltz']={seconds:5.6,energy:'flowing',keys:[{t:0},{t:.12,roll:-2,yaw:-4,outL:10,elbowL:20,outR:15,elbowR:22,headRoll:2},{t:.4,roll:3,yaw:7,outL:28,outR:20,elbowL:27,elbowR:30,headYaw:-4,wristL:5},{t:.64,roll:-2,yaw:-3,outL:14,outR:26,elbowR:32,headRoll:2},{t:.86,yaw:3,outL:18,elbowL:20,headYaw:-2},{t:1}]};
definitions['ballet-flourish']={seconds:4.6,energy:'flowing',keys:[{t:0},{t:.16,yaw:-3,elbowL:16,elbowR:20},{t:.38,roll:-2,yaw:5,outR:38,outL:28,elbowR:32,elbowL:26,wristR:8,headRoll:3},{t:.58,roll:2,yaw:8,outR:24,outL:40,elbowR:28,elbowL:32,wristL:8,headYaw:-4},{t:.78,yaw:2,outR:10,outL:18,elbowR:12,elbowL:20},{t:1}]};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const interpolate=(keys,field,t)=>{let i=0;while(i<keys.length-2&&t>keys[i+1].t)i++;const a=keys[i],b=keys[i+1],u=smooth((t-a.t)/(b.t-a.t));return (a[field]??0)+((b[field]??0)-(a[field]??0))*u;};
function value(keys,field,t){const lag=/wrist/.test(field)?.025:/elbow/.test(field)?.012:/head/.test(field)?.008:0;return interpolate(keys,field,Math.max(0,(t-lag)/(1-lag)));}
const worldRest=new Map(bones.map(b=>[b.name,b.getWorldQuaternion(new T.Quaternion()).normalize()]));
const pos=n=>by.get('ORG-Bip001'+n).getWorldPosition(new T.Vector3()),up=pos('Neck').sub(pos('Spine2')).normalize(),lateral=support.axes.lateral,forward=support.axes.forward;
function setWorld(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).normalize().invert().multiply(q)).normalize();b.updateMatrix();model.updateMatrixWorld(true);}
function rotateWorld(b,axis,degrees){if(degrees)setWorld(b,new T.Quaternion().setFromAxisAngle(axis,degrees*Math.PI/180).multiply(b.getWorldQuaternion(new T.Quaternion()).normalize()));}
const swing=(t,a,b,from,to)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return {x:from+(to-from)*smooth(u),y:t>a&&t<b?.023*Math.sin(Math.PI*u)**2:0};};
export function supportPath(name,t){
 let left={x:0,y:0},right={x:0,y:0},hipX=0,hipY=0;
 if(name==='lunar-waltz'){
  left=t<.5?swing(t,.08,.26,0,.065):swing(t,.57,.75,.065,0);
  right=t<.65?swing(t,.34,.52,0,.09):swing(t,.80,.98,.09,0);
  const keys=[{t:0,x:0},{t:.08,x:-.05},{t:.27,x:-.04},{t:.34,x:.10},{t:.53,x:.09},{t:.57,x:.015},{t:.76,x:.02},{t:.80,x:.055},{t:.98,x:0},{t:1,x:0}];
  hipX=interpolate(keys,'x',t);hipY=-.035*smooth(t/.08)*smooth((1-t)/.04);
 }else if(name==='ballet-flourish'){
  hipX=.018*Math.sin(2*Math.PI*t)*Math.sin(Math.PI*t)**2;hipY=-.032*Math.sin(Math.PI*t)**2;
 }else if(name!=='lunar-repose'){
  hipX=(name==='silk-sway'?.022:.012)*Math.sin(2*Math.PI*t)*Math.sin(Math.PI*t)**2;hipY=-.012*Math.sin(Math.PI*t)**2;
 }
 return {left,right,hipX,hipY};
}
const phrases={};
for(const [name,def]of Object.entries(definitions)){
 const frames=[],positionFrames=[],contacts=[],count=name==='lunar-waltz'?145:name==='ballet-flourish'?97:65;
 for(let frame=0;frame<count;frame++){
  support.reset();const t=frame/(count-1),get=field=>value(def.keys,field,t),path=supportPath(name,t);
  if(frame!==0&&frame!==count-1){
   support.setRootWorldDelta(lateral.clone().multiplyScalar(path.hipX).addScaledVector(support.axes.up,path.hipY));
   for(const side of ['L','R']){const step=side==='L'?path.left:path.right,target=support.world.get('ORG-Bip001Foot'+side).p.clone().addScaledVector(lateral,step.x).addScaledVector(support.axes.up,step.y);support.solve(side,target);}
   for(const part of upperParts){const driver=by.get('ORG-Bip001'+part),deformer=by.get('DEF-Bip001'+part);
    if(part==='Spine2'){rotateWorld(driver,up,get('yaw'));rotateWorld(driver,forward,get('roll'));}
    if(part==='Head'){rotateWorld(driver,up,get('headYaw'));rotateWorld(driver,forward,get('headRoll'));}
    if(part.startsWith('Clavicle'))rotateWorld(driver,forward,get('shoulder'+part.at(-1)));
    if(part.startsWith('UpperArm')){const side=part.at(-1);rotateWorld(driver,forward,get('out'+side)*(side==='R'?-1:1));rotateWorld(driver,lateral,-get('lift'+side));}
    if(part.startsWith('Forearm')||part.startsWith('Hand')){const side=part.at(-1),source=r.profile.poses[side==='R'?'signature':'chest'],i=source.names.indexOf(driver.name),q0=new T.Quaternion().fromArray(source.rest,i*4),q1=new T.Quaternion().fromArray(source.frames[24],i*4),d=q1.multiply(q0.invert()).normalize();if(d.w<0)d.set(-d.x,-d.y,-d.z,-d.w);driver.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(d.x,d.y,d.z).normalize(),get((part.startsWith('Forearm')?'elbow':'wrist')+side)*Math.PI/180)).normalize();driver.updateMatrix();model.updateMatrixWorld(true);}
    setWorld(deformer,driver.getWorldQuaternion(new T.Quaternion()).normalize().multiply(worldRest.get(driver.name).clone().invert()).multiply(worldRest.get(deformer.name)));
   }
  }
  frames.push(owned.flatMap(b=>b.quaternion.toArray().map(v=>Math.round(v*32767))));
  positionFrames.push(support.root.position.toArray().map(v=>+v.toFixed(8)));contacts.push([path.left.y<1e-9,path.right.y<1e-9]);
 }
 phrases[name]={seconds:def.seconds,energy:def.energy,frames,positionFrames,contacts};
}
support.reset();
const data={version:'lunar-dance-experimental-r2',publicVersion:'2.0.1',encoding:'quaternion-i16',modelSha256:hash(r.bytes),profileSha256:hash(r.profileBytes),names,rest,positionNames,positionRest,lowerStart:upperParts.length*2,phrases,method:'OFFLINE_TWO_BONE_SUPPORT_LOCK_AND_AUTHORED_UPPER_KEYS',visual:'VISUAL_QA_PENDING',authoredKeys:definitions,ownership:{dance:names,translation:positionNames,unchanged:['rig hierarchy','GLB','fingers','morph targets'],footPolicy:'Four small lateral/closing/return swings in Lunar Waltz; other phrases lock both feet; no releve or pirouette'}};
const text=JSON.stringify(data)+'\n';await writeFile('public/assets/animations/hsin/lunar-dance-r2.json',text);await writeFile('src/data/hsin-dance.json',JSON.stringify({url:'/assets/animations/hsin/lunar-dance-r2.json',sha256:hash(text),bytes:Buffer.byteLength(text),modelSha256:data.modelSha256,profileSha256:data.profileSha256},null,2)+'\n');
console.log(JSON.stringify({bones:names.length,phrases:Object.keys(phrases),bytes:Buffer.byteLength(text)}));
