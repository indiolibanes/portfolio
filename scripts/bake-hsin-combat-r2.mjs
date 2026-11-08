/**
 * Hsin Combat R2.0.1 — authored in-place Answering Form study. All world-to-local conversion is offline.
 *
 * R2.0.1 replaces the R2 arm rotations (world-axis swings plus a flexion axis borrowed from contemplative poses) with
 * hand targets expressed in the torso frame, an explicit elbow pole and a hand intent, solved by a two-bone hinge
 * solver on the real rig (scripts/lib/hsin-arm-anatomy.mjs). Hips, sink, torso yaw, head, legs, support and the
 * secondary layer keep the R2 curves, so the validated support and recovery lattice are unchanged.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createLowerSolver} from './lib/hsin-dance-lower.mjs';
import {danceRig} from './lib/hsin-dance-rig.mjs';
import {SIDES,armNames,measureArmRest,createArmSolver} from './lib/hsin-arm-anatomy.mjs';
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
// R2 torso/support curves, unchanged.
const keys=[
 {t:0},{t:.8,yaw:-8,hip:-.025,sink:-.028},{t:1.5,yaw:-18,hip:-.055,sink:-.055},{t:2.05,yaw:20,hip:.06,sink:-.04,headYaw:-8},
 {t:2.5,yaw:2,hip:.015,sink:-.05},{t:3.05,yaw:-18,hip:-.055,sink:-.04,headYaw:8},{t:3.6,yaw:-5,hip:-.025,sink:-.03},
 {t:4.5,yaw:-14,hip:-.05,sink:-.06},{t:5.35,yaw:16,hip:.055,sink:-.035},{t:6,yaw:6,hip:.025,sink:-.025},{t:7,yaw:-3,hip:0,sink:-.008},{t:8.4}
];
const ease=t=>t*t*t*(t*(t*6-15)+10);
function value(field,t){let i=0;while(i<keys.length-2&&t>keys[i+1].t)i++;const a=keys[i],b=keys[i+1],u=ease(Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t))));return (a[field]??0)+((b[field]??0)-(a[field]??0))*u;}
/*
 * R2.0.1 arm score. Units: metres from the shoulder joint in the torso frame [out (away from the midline), up, forward].
 * pole = elbow direction; palm = where the palm faces; ext = wrist extension towards the back of the hand (degrees).
 * The hand leads every action; the elbow only articulates; the wrist orients; the clavicle follows high reaches.
 */
const GUARD={to:[.08,-.22,.20],pole:[.55,-.75,-.35],palm:[-.8,-.4,.2],ext:0};
const LOW_GUARD={to:[.10,-.27,.15],pole:[.55,-.75,-.35],palm:[-.7,-.6,.2],ext:0};
const WIND={to:[.16,-.34,-.05],pole:[.3,-.5,-.8],palm:[-.3,-.9,-.2],ext:5};
const STRIKE={to:[.08,.04,.41],pole:[.75,-.65,0],palm:[0,.1,1],ext:25};
const GATHER={to:[-.07,-.26,.26],pole:[.8,-.55,-.1],palm:[-1,0,.1],ext:0};
const RELEASE={to:[.14,.22,.32],pole:[.75,-.6,-.2],palm:[0,.45,.9],ext:30};
const OPEN_LOW={to:[.30,-.22,.12],pole:[0,-.55,-.85],palm:[.2,-.9,.3],ext:5};
const DECAY={to:[.12,0,.30],pole:[.7,-.65,-.15],palm:[0,.1,1],ext:15};
const DECAY_L={to:[.20,-.30,.12],pole:[.4,-.6,-.6],palm:[-.3,-.9,.2],ext:0};
const mix=(a,b,w)=>({to:a.to.map((v,i)=>v+(b.to[i]-v)*w),pole:a.pole.map((v,i)=>v+(b.pole[i]-v)*w),palm:a.palm.map((v,i)=>v+(b.palm[i]-v)*w),ext:a.ext+(b.ext-a.ext)*w});
const armKeys=[
 [0,'rest','rest'],[.8,GUARD,GUARD],[1.5,WIND,GUARD],[2.05,STRIKE,LOW_GUARD],[2.5,GUARD,WIND],[3.05,LOW_GUARD,STRIKE],[3.6,GUARD,GUARD],
 [4.5,GATHER,GATHER],[5.35,RELEASE,OPEN_LOW],[6,DECAY,DECAY_L],[7,'settle','settle'],[8.4,'rest','rest'],
].map(([t,R,L])=>({t,R,L}));
for(const k of armKeys)for(const s of SIDES)k[s]=k[s]==='rest'?restIntent[s]:k[s]==='settle'?mix(restIntent[s],GUARD,.35):k[s];
/** Monotone cubic Hermite, zero slope at the ends: C1 between keys, no stop-and-go at every key. */
function pchip(xs,ys,t){
 const n=xs.length;if(t<=xs[0])return ys[0];if(t>=xs[n-1])return ys[n-1];let i=0;while(i<n-2&&t>xs[i+1])i++;
 const h=[],d=[];for(let j=0;j<n-1;j++){h[j]=xs[j+1]-xs[j];d[j]=(ys[j+1]-ys[j])/h[j];}
 const m=j=>{if(j===0||j===n-1)return 0;if(d[j-1]*d[j]<=0)return 0;const w1=2*h[j]+h[j-1],w2=h[j]+2*h[j-1];return (w1+w2)/(w1/d[j-1]+w2/d[j]);};
 const u=(t-xs[i])/h[i],u2=u*u,u3=u2*u;return (2*u3-3*u2+1)*ys[i]+(u3-2*u2+u)*h[i]*m(i)+(-2*u3+3*u2)*ys[i+1]+(u3-u2)*h[i]*m(i+1);
}
const xs=armKeys.map(k=>k.t);
function intent(side,t){const k=armKeys,pick=f=>pchip(xs,k.map(f),t);return {to:[0,1,2].map(i=>pick(x=>x[side].to[i])),pole:[0,1,2].map(i=>pick(x=>x[side].pole[i])),palm:[0,1,2].map(i=>pick(x=>x[side].palm[i])),ext:pick(x=>x[side].ext)};}
const smooth=(a,b,x)=>{const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);};
const armWeight=t=>smooth(0,.5,t)*(1-smooth(7.7,8.4,t));
function setWorld(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q)).normalize();b.updateMatrix();model.updateMatrixWorld(true);}
function rotate(b,axis,angle){setWorld(b,new T.Quaternion().setFromAxisAngle(axis,angle*Math.PI/180).multiply(b.getWorldQuaternion(new T.Quaternion())));}
const solvers=Object.fromEntries(SIDES.map(s=>[s,createArmSolver(T,by,model,armRest[s])]));
const armIndex=Object.fromEntries(SIDES.map(s=>[s,armChannels(s).map(n=>names.indexOf(n))]));
const report={reachClamped:0,maxWristErrorMm:0,maxElbowErrorMm:0,maxClavicleLift:0,maxPronation:0,maxRoll:0,restMismatchDegrees:0,flexRange:{R:[Infinity,-Infinity],L:[Infinity,-Infinity]}};
const frames=[],positionFrames=[];
const tmpA=new T.Quaternion(),tmpB=new T.Quaternion();
for(let f=0;f<=252;f++){
 const t=f/30;
 support.reset();
 support.setRootWorldDelta(support.axes.lateral.clone().multiplyScalar(value('hip',t)).addScaledVector(support.axes.up,value('sink',t)));
 for(const side of ['L','R'])support.solve(side,support.world.get('ORG-Bip001Foot'+side).p.clone());
 for(const part of torsoParts){
  const driver=by.get('ORG-Bip001'+part),def=by.get('DEF-Bip001'+part);
  if(part==='Spine2')rotate(driver,up,value('yaw',t));
  if(part==='Head')rotate(driver,up,value('headYaw',t));
  setWorld(def,driver.getWorldQuaternion(new T.Quaternion()).multiply(worlds.get(driver.name).clone().invert()).multiply(worlds.get(def.name)));
 }
 // Torso frame follows Spine2: the arms are authored relative to the body that carries them, never to world axes.
 const D=by.get('ORG-Bip001Spine2').getWorldQuaternion(new T.Quaternion()).multiply(spineRest.clone().invert());
 const frame={lateral:lateral.clone().applyQuaternion(D),up:up.clone().applyQuaternion(D),forward:forward.clone().applyQuaternion(D)};
 const w=armWeight(t);
 for(const side of SIDES){
  const it=intent(side,t),n=armNames(side);
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
// Recovery support lattice: interpolate pre-solved leg poses, never run IK in the player. Same as R2.
const recoveryNames=lowerParts.flatMap(part=>['ORG-Bip001'+part,'DEF-Bip001'+part]);
const recoverySteps=17,recoveryPacked=Buffer.alloc(frames.length*recoverySteps*recoveryNames.length*4*2);
for(let frame=0;frame<frames.length;frame++)for(let step=0;step<recoverySteps;step++){
 const t=frame/30,gain=1-step/(recoverySteps-1);
 support.reset();
 support.setRootWorldDelta(support.axes.lateral.clone().multiplyScalar(value('hip',t)*gain).addScaledVector(support.axes.up,value('sink',t)*gain));
 for(const side of ['L','R'])support.solve(side,support.world.get('ORG-Bip001Foot'+side).p.clone());
 recoveryNames.forEach((name,i)=>by.get(name).quaternion.toArray().forEach((v,k)=>recoveryPacked.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),((frame*recoverySteps+step)*recoveryNames.length*4+i*4+k)*2)));
}
support.reset();
const hash=b=>createHash('sha256').update(b).digest('hex');
const data={version:'combat-r2',revision:'r2.0.1',provenance:'EXPERIMENTAL_AUTHORED',arms:'TORSO_FRAME_HAND_TARGETS_HINGE_SOLVER',modelSha256:hash(r.bytes),profileSha256:hash(r.profileBytes),seconds:8.4,names,rest,frames,positionNames:[support.root.name],positionRest:support.root.position.toArray(),positionFrames,sequence:{seconds:8.4,phases:[['PREPARATION',0],['BASIC',1.5],['SKILL',3.6],['RECOVERY',6],['COMPLETE',8.4]],markers:[['energy',.8],['arc',2.05],['arc-left',3.05],['ring',5.35],['recovery',6]]}};
const packed=Buffer.alloc(frames.length*rest.length*2);
frames.forEach((frame,f)=>frame.forEach((value,k)=>packed.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),(f*rest.length+k)*2)));
data.recovery={names:recoveryNames,steps:recoverySteps,quaternions:recoveryPacked.toString('base64')};
data.frameCount=frames.length;data.quaternions=packed.toString('base64');delete data.frames;
const text=JSON.stringify(data);
await writeFile('public/assets/animations/hsin/combat-r2.json',text);
await writeFile('src/data/hsin-combat-r2.json',JSON.stringify({url:'/assets/animations/hsin/combat-r2.json',sha256:hash(text),bytes:Buffer.byteLength(text),modelSha256:data.modelSha256,profileSha256:data.profileSha256},null,2)+'\n');
report.restIntent=restIntent;report.armRest=Object.fromEntries(SIDES.map(s=>[s,{l1:armRest[s].l1,l2:armRest[s].l2,flex:armRest[s].flex,sigma:armRest[s].sigma,hingeOffPlaneDegrees:armRest[s].hingeOffPlaneDegrees}]));
console.log(JSON.stringify({bones:names.length,frames:frames.length,bytes:Buffer.byteLength(text),report},null,1));
await mkdir('docs/hsin-combat-r201',{recursive:true});
await writeFile('docs/hsin-combat-r201/bake-report.json',JSON.stringify({bones:names.length,frames:frames.length,bytes:Buffer.byteLength(text),...report},null,2)+'\n');
