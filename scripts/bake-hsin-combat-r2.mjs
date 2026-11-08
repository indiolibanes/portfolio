/**
 * Hsin Combat R2.1 — expressive acting on the R2.0.1 anatomical contract.
 *
 * Arms still come from hand targets in the torso frame through the hinge solver (scripts/lib/hsin-arm-anatomy.mjs), so every
 * R2.0.1 limit is unchanged. R2.1 authors a new score (scripts/lib/hsin-combat-r21-score.mjs): body-led Basic 01/02, a Skill
 * whose palms face each other, per-channel timing, spine lean and head pitch, and a per-group secondary layer.
 * Legs, support and the recovery lattice keep the R2 solver; all conversion to local quaternions is offline.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createLowerSolver} from './lib/hsin-dance-lower.mjs';
import {danceRig} from './lib/hsin-dance-rig.mjs';
import {SIDES,armNames,measureArmRest,createArmSolver} from './lib/hsin-arm-anatomy.mjs';
import {PHASES,MARKERS,SECONDS,torso as torsoAt,createArmScore,armWeight,createSecondary} from './lib/hsin-combat-r21-score.mjs';
const r=await danceRig(),{T,model,by}=r,support=createLowerSolver(r);
const secondary=JSON.parse(await readFile('public/assets/animations/hsin/lunar-dance-r3.json')).secondary;
const torsoParts=['Spine2','Neck','Head'];
const armChannels=side=>{const n=armNames(side);return [n.clav,n.defClav,n.upper,n.defUpper,n.defUpper2,n.fore,n.defFore,n.defFore2,n.hand,n.defHand];};
const lowerParts=['ThighL','CalfL','FootL','Toe0L','ThighR','CalfR','FootR','Toe0R'];
const names=[...lowerParts.flatMap(p=>['ORG-Bip001'+p,'DEF-Bip001'+p]),...torsoParts.flatMap(p=>['ORG-Bip001'+p,'DEF-Bip001'+p]),...SIDES.flatMap(armChannels),...secondary.names];
if(new Set(names).size!==names.length)throw Error('Overlapping ownership');
const missing=names.filter(n=>!by.get(n));if(missing.length)throw Error('Missing bones '+missing.join(','));
const bones=names.map(n=>by.get(n)),rest=bones.flatMap(b=>b.quaternion.toArray());
const worlds=new Map(bones.map(b=>[b.name,b.getWorldQuaternion(new T.Quaternion())]));
const point=n=>by.get('ORG-Bip001'+n).getWorldPosition(new T.Vector3());
const up=point('Neck').sub(point('Spine2')).normalize();
const lateral=point('UpperArmL').sub(point('UpperArmR')).normalize();
const forward=new T.Vector3().crossVectors(lateral,up).normalize();
const spineRest=by.get('ORG-Bip001Spine2').getWorldQuaternion(new T.Quaternion());
const armRest=Object.fromEntries(SIDES.map(s=>[s,measureArmRest(T,by,s)]));
const outSign=s=>s==='R'?-1:1;
const toTorso=(v,s)=>[v.dot(lateral)*outSign(s),v.dot(up),v.dot(forward)];
const restIntent=Object.fromEntries(SIDES.map(s=>{const a=armRest[s];return [s,{to:toTorso(a.W.clone().sub(a.S),s),pole:toTorso(a.E.clone().sub(a.S).addScaledVector(a.W.clone().sub(a.S).normalize(),-a.E.clone().sub(a.S).dot(a.W.clone().sub(a.S).normalize())).normalize(),s),palm:toTorso(a.palmLocal.clone().applyQuaternion(a.world.hand),s),ext:0}];}));
const halfWidth=Math.abs(point('UpperArmL').sub(point('UpperArmR')).dot(lateral))/2;
const armScore=createArmScore({restIntent,halfWidth});
const secondaryModel=createSecondary(secondary,armScore.intent);
const secondaryIndex=secondary.names.map(n=>names.indexOf(n));
function setWorld(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q)).normalize();b.updateMatrix();model.updateMatrixWorld(true);}
function rotate(b,axis,angle){setWorld(b,new T.Quaternion().setFromAxisAngle(axis,angle*Math.PI/180).multiply(b.getWorldQuaternion(new T.Quaternion())));}
const solvers=Object.fromEntries(SIDES.map(s=>[s,createArmSolver(T,by,model,armRest[s])]));
const armIndex=Object.fromEntries(SIDES.map(s=>[s,armChannels(s).map(n=>names.indexOf(n))]));
const report={reachClamped:0,maxWristErrorMm:0,maxElbowErrorMm:0,maxClavicleLift:0,maxPronation:0,maxRoll:0,restMismatchDegrees:0,flexRange:{R:[Infinity,-Infinity],L:[Infinity,-Infinity]}};
const frames=[],positionFrames=[];
const tmpA=new T.Quaternion(),tmpB=new T.Quaternion(),tmpAxis=new T.Vector3();
for(let f=0;f<=252;f++){
 const t=f/30,tr=torsoAt(t);
 support.reset();
 support.setRootWorldDelta(support.axes.lateral.clone().multiplyScalar(tr.hip).addScaledVector(support.axes.up,tr.sink));
 for(const side of ['L','R'])support.solve(side,support.world.get('ORG-Bip001Foot'+side).p.clone());
 for(const part of torsoParts){
  const driver=by.get('ORG-Bip001'+part),def=by.get('DEF-Bip001'+part);
  if(part==='Spine2'){rotate(driver,up,tr.yaw);rotate(driver,lateral,tr.lean);}
  if(part==='Head'){rotate(driver,up,tr.headYaw);rotate(driver,lateral,tr.headPitch);}
  setWorld(def,driver.getWorldQuaternion(new T.Quaternion()).multiply(worlds.get(driver.name).clone().invert()).multiply(worlds.get(def.name)));
 }
 // Torso frame follows Spine2: the arms are authored relative to the body that carries them, never to world axes.
 const D=by.get('ORG-Bip001Spine2').getWorldQuaternion(new T.Quaternion()).multiply(spineRest.clone().invert());
 const frame={lateral:lateral.clone().applyQuaternion(D),up:up.clone().applyQuaternion(D),forward:forward.clone().applyQuaternion(D)};
 const w=armWeight(t);
 for(const side of SIDES){
  const it=armScore.intent(side,t),n=armNames(side);
  by.get(n.clav).quaternion.copy(armRest[side].local.clav);by.get(n.clav).updateMatrix();model.updateMatrixWorld(true);
  const S0=by.get(n.upper).getWorldPosition(new T.Vector3()),vec=a=>frame.lateral.clone().multiplyScalar(a[0]*outSign(side)).addScaledVector(frame.up,a[1]).addScaledVector(frame.forward,a[2]);
  const solved=solvers[side].solve({target:S0.clone().add(vec(it.to)),pole:vec(it.pole).normalize(),palm:vec(it.palm).normalize(),extension:it.ext,frame});
  if(solved.reachClamped)report.reachClamped++;
  report.maxWristErrorMm=Math.max(report.maxWristErrorMm,solved.wristError*1000);report.maxElbowErrorMm=Math.max(report.maxElbowErrorMm,solved.elbowError*1000);
  report.maxClavicleLift=Math.max(report.maxClavicleLift,solved.clavicleLift);report.maxPronation=Math.max(report.maxPronation,Math.abs(solved.pronationDegrees));report.maxRoll=Math.max(report.maxRoll,Math.abs(solved.rollDegrees));
  report.flexRange[side][0]=Math.min(report.flexRange[side][0],solved.flexDegrees);report.flexRange[side][1]=Math.max(report.flexRange[side][1],solved.flexDegrees);
  if(f===0)for(const i of armIndex[side])report.restMismatchDegrees=Math.max(report.restMismatchDegrees,bones[i].quaternion.angleTo(tmpA.fromArray(rest,i*4))*180/Math.PI);
  // Fade the solved arm in from, and back out to, the exact reference relation (local slerp between two near poses).
  if(w<1)for(const i of armIndex[side]){tmpA.fromArray(rest,i*4);tmpB.copy(bones[i].quaternion);bones[i].quaternion.copy(tmpA.slerp(tmpB,w));bones[i].updateMatrix();}
  model.updateMatrixWorld(true);
 }
 // Per-group secondary response (hair, ornaments, sleeves, tail), set from the reference so frames never accumulate.
 secondary.names.forEach((name,i)=>{
  const b=by.get(name),ax=secondary.axes[i];
  b.quaternion.fromArray(rest,secondaryIndex[i]*4).premultiply(tmpA.setFromAxisAngle(tmpAxis.set(ax[0],ax[1],ax[2]),secondaryModel.angle(i,t)*Math.PI/180));b.updateMatrix();
 });
 positionFrames.push(support.root.position.toArray());
 frames.push(bones.flatMap(b=>b.quaternion.toArray()));
}
frames[0]=rest.slice();frames[frames.length-1]=rest.slice();
// Recovery support lattice: interpolate pre-solved leg poses, never run IK in the player. Same as R2.
const recoveryNames=lowerParts.flatMap(part=>['ORG-Bip001'+part,'DEF-Bip001'+part]);
const recoverySteps=17,recoveryPacked=Buffer.alloc(frames.length*recoverySteps*recoveryNames.length*4*2);
for(let frame=0;frame<frames.length;frame++)for(let step=0;step<recoverySteps;step++){
 const t=frame/30,gain=1-step/(recoverySteps-1),tr=torsoAt(t);
 support.reset();
 support.setRootWorldDelta(support.axes.lateral.clone().multiplyScalar(tr.hip*gain).addScaledVector(support.axes.up,tr.sink*gain));
 for(const side of ['L','R'])support.solve(side,support.world.get('ORG-Bip001Foot'+side).p.clone());
 recoveryNames.forEach((name,i)=>by.get(name).quaternion.toArray().forEach((v,k)=>recoveryPacked.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),((frame*recoverySteps+step)*recoveryNames.length*4+i*4+k)*2)));
}
support.reset();
const hash=b=>createHash('sha256').update(b).digest('hex');
const data={version:'combat-r2',revision:'r2.1',provenance:'EXPERIMENTAL_AUTHORED',arms:'TORSO_FRAME_HAND_TARGETS_HINGE_SOLVER',score:'R21_BODY_LED_BASIC_PALMS_FACING_SKILL',modelSha256:hash(r.bytes),profileSha256:hash(r.profileBytes),seconds:SECONDS,names,rest,frames,positionNames:[support.root.name],positionRest:support.root.position.toArray(),positionFrames,sequence:{seconds:SECONDS,phases:PHASES,markers:MARKERS}};
const packed=Buffer.alloc(frames.length*rest.length*2);
frames.forEach((frame,f)=>frame.forEach((value,k)=>packed.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),(f*rest.length+k)*2)));
data.recovery={names:recoveryNames,steps:recoverySteps,quaternions:recoveryPacked.toString('base64')};
data.frameCount=frames.length;data.quaternions=packed.toString('base64');delete data.frames;
const text=JSON.stringify(data);
await writeFile('public/assets/animations/hsin/combat-r2.json',text);
await writeFile('src/data/hsin-combat-r2.json',JSON.stringify({url:'/assets/animations/hsin/combat-r2.json',sha256:hash(text),bytes:Buffer.byteLength(text),modelSha256:data.modelSha256,profileSha256:data.profileSha256},null,2)+'\n');
report.restIntent=restIntent;report.halfWidth=halfWidth;report.secondary=secondaryModel.summary(secondary.names);report.armRest=Object.fromEntries(SIDES.map(s=>[s,{l1:armRest[s].l1,l2:armRest[s].l2,flex:armRest[s].flex,sigma:armRest[s].sigma,hingeOffPlaneDegrees:armRest[s].hingeOffPlaneDegrees}]));
console.log(JSON.stringify({bones:names.length,frames:frames.length,bytes:Buffer.byteLength(text),report},null,1));
await mkdir('docs/hsin-combat-r21',{recursive:true});
await writeFile('docs/hsin-combat-r21/bake-report.json',JSON.stringify({bones:names.length,frames:frames.length,bytes:Buffer.byteLength(text),...report},null,2)+'\n');
