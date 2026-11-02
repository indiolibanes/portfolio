/**
 * Moon Fox Reverie bake. All support/IK, safety measurement and secondary-motion work happens here, never in the render loop.
 * Needs three (rig loader). Runs in CI: .github/workflows/hsin-dance-r3.yml.
 *   node scripts/bake-hsin-dance-r3.mjs            # conservative + dramatic assets
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {danceRig} from './lib/hsin-dance-rig.mjs';
import {createLowerSolver} from './lib/hsin-dance-lower.mjs';
import {REVERIE_NAME,REVERIE_GRAND_NAME,VARIANTS,KEYS,HIP_KEYS,MOVEMENTS,UNSAFE_WINDOWS,evaluate,sampleCount,bowDegrees} from './lib/hsin-reverie-authoring.mjs';
import {REVERIE_FACE_CUES as FACE_CUES} from '../src/scripts/hsin-dance-config.mjs';
import {SECONDARY_GROUPS,classifySecondary,chainWeights,buildTracks,quantise} from './lib/hsin-secondary-authoring.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const r=await danceRig(),{T,model,bones,by}=r,support=createLowerSolver(r);
const upperParts=['Spine1','Spine2','Neck','Head','ClavicleR','ClavicleL','UpperArmR','ForearmR','HandR','UpperArmL','ForearmL','HandL'];
const lowerParts=['ThighL','CalfL','FootL','Toe0L','ThighR','CalfR','FootR','Toe0R'];
const names=[...upperParts,...lowerParts].flatMap(p=>['ORG-Bip001'+p,'DEF-Bip001'+p]);
for(const n of names)if(!by.get(n))throw Error('Rig bone missing for Moon Fox Reverie: '+n);
const owned=names.map(n=>by.get(n)),rest=owned.flatMap(b=>b.quaternion.toArray());
const positionNames=[support.root.name],positionRest=support.root.position.toArray();

// Rest-pose geometry, captured before any posing.
const worldRest=new Map(bones.map(b=>[b.name,b.getWorldQuaternion(new T.Quaternion()).normalize()]));
const P=n=>by.get(n).getWorldPosition(new T.Vector3());
const up=P('ORG-Bip001Neck').sub(P('ORG-Bip001Spine2')).normalize(),lateral=support.axes.lateral.clone(),forward=support.axes.forward.clone();
// The characters' front is where the toes point. Everything that bends "forward" uses this sign, so a mirrored rig cannot bow backwards.
const toeDirection=P('ORG-Bip001Toe0L').sub(P('ORG-Bip001FootL')).setY(0).normalize(),frontSign=Math.sign(forward.dot(toeDirection))||1;
const front=forward.clone().multiplyScalar(frontSign),bowAxis=lateral.clone().multiplyScalar(frontSign);
const restFoot={L:P('ORG-Bip001FootL'),R:P('ORG-Bip001FootR')},restToe={L:P('ORG-Bip001Toe0L'),R:P('ORG-Bip001Toe0R')};

function setWorld(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).normalize().invert().multiply(q)).normalize();b.updateMatrix();model.updateMatrixWorld(true);}
function rotateWorld(b,axis,degrees){if(degrees)setWorld(b,new T.Quaternion().setFromAxisAngle(axis,degrees*Math.PI/180).multiply(b.getWorldQuaternion(new T.Quaternion()).normalize()));}

// Secondary chains (hair / sleeves / tail). Classified by name and ancestry, depth measured from the first non-secondary ancestor.
const ancestors=b=>{const out=[];for(let o=b.parent;o;o=o.parent)out.push(o.name);return out;};
const secondary=[];const secSet=new Set();
for(const b of bones){const group=classifySecondary(b.name,ancestors(b));if(group){secondary.push({bone:b,group});secSet.add(b);}}
secondary.sort((a,b)=>a.bone.name<b.bone.name?-1:1);
const depthOf=b=>b.parent&&secSet.has(b.parent)?depthOf(b.parent)+1:0,rootOf=b=>b.parent&&secSet.has(b.parent)?rootOf(b.parent):b;
const chainMax=new Map();for(const s of secondary){const root=rootOf(s.bone),d=depthOf(s.bone);chainMax.set(root,Math.max(chainMax.get(root)??0,d));}
const groupIds=Object.keys(SECONDARY_GROUPS);
const secondaryTable={groups:groupIds.map(id=>({id,maxDegrees:SECONDARY_GROUPS[id].maxDegrees,delayPerDepth:SECONDARY_GROUPS[id].delayPerDepth})),names:[],group:[],depth:[],gain:[],axes:[]};
for(const s of secondary){
  const depth=depthOf(s.bone),length=chainMax.get(rootOf(s.bone))+1,parentQ=s.bone.parent.getWorldQuaternion(new T.Quaternion()).normalize().invert();
  // Sway turns about the front direction, pitch about the bow axis; both expressed in the bone's parent frame at rest.
  const sway=front.clone().applyQuaternion(parentQ),pitch=bowAxis.clone().applyQuaternion(parentQ);
  secondaryTable.names.push(s.bone.name);secondaryTable.group.push(groupIds.indexOf(s.group));secondaryTable.depth.push(depth);secondaryTable.gain.push(chainWeights(depth,length).gain);
  secondaryTable.axes.push([...sway.toArray(),...pitch.toArray()].map(v=>+v.toFixed(5)));
}
const maxDepth=Math.max(...secondaryTable.depth);

// Anchors that drive each secondary group.
const anchors={hair:'ORG-Bip001Head',sleeveL:'ORG-Bip001HandL',sleeveR:'ORG-Bip001HandR',tail:'ORG-Bip001Pelvis'};
const massBones=[['ORG-Bip001Pelvis',.26],['ORG-Bip001Spine1',.12],['ORG-Bip001Spine2',.14],['ORG-Bip001Head',.08],['ORG-Bip001UpperArmL',.03],['ORG-Bip001ForearmL',.02],['ORG-Bip001HandL',.01],['ORG-Bip001UpperArmR',.03],['ORG-Bip001ForearmR',.02],['ORG-Bip001HandR',.01],['ORG-Bip001ThighL',.09],['ORG-Bip001ThighR',.09]];

function bakeVariant(variantName){
  const variant=VARIANTS[variantName],count=sampleCount(variantName),seconds=variant.seconds,dt=seconds/(count-1);
  const frames=[],positionFrames=[],contacts=[],trace={anchors:Object.fromEntries(groupIds.map(g=>[g,{p:[],q:[]}])),bow:[]};
  const metrics={footTargetErrorMax:0,orgDefGapMax:0,comMarginMin:Infinity,comMarginMinFrame:-1,spineDegreesMax:0,hipDropMax:0,hipBackMax:0,stepDegreesMax:0,accelerationJumpDegreesMax:0,quaternionSignFlips:0};
  const comPoint=new T.Vector3();
  for(let frame=0;frame<count;frame++){
    support.reset();const t=frame/(count-1),ev=evaluate(variantName,t);
    if(frame!==0&&frame!==count-1){
      support.setRootWorldDelta(lateral.clone().multiplyScalar(ev.hipX).addScaledVector(support.axes.up,ev.hipY).addScaledVector(front,ev.hipZ));
      for(const side of ['L','R']){const result=support.solve(side,support.world.get('ORG-Bip001Foot'+side).p.clone());metrics.footTargetErrorMax=Math.max(metrics.footTargetErrorMax,result.targetError);metrics.orgDefGapMax=Math.max(metrics.orgDefGapMax,result.gap);}
      for(const part of upperParts){
        const driver=by.get('ORG-Bip001'+part),deformer=by.get('DEF-Bip001'+part);
        if(part==='Spine1')rotateWorld(driver,bowAxis,ev.pitch1);
        if(part==='Spine2'){rotateWorld(driver,up,ev.yaw);rotateWorld(driver,forward,ev.roll);rotateWorld(driver,bowAxis,ev.pitch2);}
        if(part==='Neck')rotateWorld(driver,bowAxis,ev.neckPitch);
        if(part==='Head'){rotateWorld(driver,up,ev.headYaw);rotateWorld(driver,forward,ev.headRoll);rotateWorld(driver,bowAxis,ev.headPitch);}
        if(part.startsWith('Clavicle'))rotateWorld(driver,forward,ev['shoulder'+part.at(-1)]);
        if(part.startsWith('UpperArm')){const side=part.at(-1);rotateWorld(driver,forward,ev['out'+side]*(side==='R'?-1:1));rotateWorld(driver,lateral,-ev['lift'+side]);rotateWorld(driver,bowAxis,ev.armCounter);}
        if(part.startsWith('Forearm')||part.startsWith('Hand')){
          const side=part.at(-1),source=r.profile.poses[side==='R'?'signature':'chest'],i=source.names.indexOf(driver.name);
          const q0=new T.Quaternion().fromArray(source.rest,i*4),q1=new T.Quaternion().fromArray(source.frames[24],i*4),d=q1.multiply(q0.invert()).normalize();if(d.w<0)d.set(-d.x,-d.y,-d.z,-d.w);
          driver.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(d.x,d.y,d.z).normalize(),ev[(part.startsWith('Forearm')?'elbow':'wrist')+side]*Math.PI/180)).normalize();driver.updateMatrix();model.updateMatrixWorld(true);
        }
        setWorld(deformer,driver.getWorldQuaternion(new T.Quaternion()).normalize().multiply(worldRest.get(driver.name).clone().invert()).multiply(worldRest.get(deformer.name)));
      }
    }
    model.updateMatrixWorld(true);
    frames.push(owned.flatMap(b=>b.quaternion.toArray().map(v=>Math.round(v*32767))));
    positionFrames.push(support.root.position.toArray().map(v=>+v.toFixed(8)));contacts.push([true,true]);
    for(const g of groupIds){trace.anchors[g].p.push(P(anchors[g]).toArray());trace.anchors[g].q.push(by.get(anchors[g]).getWorldQuaternion(new T.Quaternion()).normalize().toArray());}
    trace.bow.push(ev.bow);
    // Centre of mass (rough mass model) against the support rectangle spanned by both feet, soles extended 5 cm behind the ankle.
    comPoint.set(0,0,0);let mass=0;for(const [n,m] of massBones){comPoint.addScaledVector(P(n),m);mass+=m;}comPoint.divideScalar(mass);
    const coordinate=(p,axis)=>p.dot(axis),lows=[],highs=[];
    for(const axis of [lateral,front]){const values=[restFoot.L,restFoot.R,restToe.L,restToe.R].map(p=>coordinate(p,axis));lows.push(Math.min(...values)-(axis===front?.05:0));highs.push(Math.max(...values));}
    const margin=Math.min(coordinate(comPoint,lateral)-lows[0],highs[0]-coordinate(comPoint,lateral),coordinate(comPoint,front)-lows[1],highs[1]-coordinate(comPoint,front));
    if(frame===0)metrics.comMarginRest=margin;
    if(margin<metrics.comMarginMin){metrics.comMarginMin=margin;metrics.comMarginMinFrame=frame;}
    metrics.spineDegreesMax=Math.max(metrics.spineDegreesMax,ev.spineDegrees);metrics.hipDropMax=Math.max(metrics.hipDropMax,-ev.hipY);metrics.hipBackMax=Math.max(metrics.hipBackMax,-ev.hipZ);
  }
  support.reset();
  // Continuity: step per sample, change of step (acceleration jump) and hemisphere flips of the stored quaternions.
  const q=new T.Quaternion(),prev=new T.Quaternion(),next=new T.Quaternion();
  for(let k=0;k<names.length;k++){
    let lastStep=null;
    for(let f=1;f<count;f++){
      prev.fromArray(frames[f-1].map(v=>v/32767),k*4).normalize();next.fromArray(frames[f].map(v=>v/32767),k*4).normalize();
      if(prev.dot(next)<0)metrics.quaternionSignFlips++;
      const step=prev.angleTo(next)*180/Math.PI;metrics.stepDegreesMax=Math.max(metrics.stepDegreesMax,step);
      if(lastStep!==null)metrics.accelerationJumpDegreesMax=Math.max(metrics.accelerationJumpDegreesMax,Math.abs(step-lastStep));lastStep=step;
    }
  }
  // Offline secondary tracks: velocity of each anchor on the lateral/front axes plus its yaw rate, run through a damped follower.
  const latDir=lateral.clone().multiplyScalar(frontSign),secondaryTracks={};
  for(const g of groupIds){
    const A=trace.anchors[g],vl=[],vf=[],wUp=[];
    for(let f=0;f<count;f++){
      const a=Math.max(0,f-1),b=Math.min(count-1,f+1),span=(b-a)*dt,pa=new T.Vector3().fromArray(A.p[a]),pb=new T.Vector3().fromArray(A.p[b]);
      const v=pb.sub(pa).divideScalar(span);vl.push(v.dot(latDir));vf.push(v.dot(front));
      const qa=new T.Quaternion().fromArray(A.q[a]),qb=new T.Quaternion().fromArray(A.q[b]),delta=qb.multiply(qa.invert());if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
      wUp.push(2*(delta.x*up.x+delta.y*up.y+delta.z*up.z)/span);
    }
    const smooth3=s=>s.map((v,i)=>(s[Math.max(0,i-1)]+2*v+s[Math.min(s.length-1,i+1)])/4);
    const tracks=buildTracks({vl:smooth3(vl),vf:smooth3(vf),wUp:smooth3(wUp),bow:trace.bow},dt,SECONDARY_GROUPS[g]);
    secondaryTracks[g]={sway:quantise(tracks.sway),pitch:quantise(tracks.pitch)};
  }
  const safe=metrics.comMarginMin>=variant.minComMargin;
  return {phrase:{seconds,energy:'special',frames,positionFrames,contacts,secondary:secondaryTracks,bow:{degrees:bowDegrees(variant),peakPhase:.58},exits:{unsafe:UNSAFE_WINDOWS},safety:{pass:safe,comMarginRest:+metrics.comMarginRest.toFixed(4),comMarginMin:+metrics.comMarginMin.toFixed(4),comMarginMinFrame:metrics.comMarginMinFrame,comMarginRequired:variant.minComMargin,estimate:'rough rigid-segment mass model against a rectangle spanned by both locked feet'}},metrics};
}

const rigBytes=r.bytes,profileBytes=r.profileBytes,common={publicVersion:'2.0.1',encoding:'quaternion-i16',modelSha256:hash(rigBytes),profileSha256:hash(profileBytes),names,rest,positionNames,positionRest,lowerStart:upperParts.length*2,secondary:secondaryTable,method:'OFFLINE_AUTHORED_PCHIP_KEYS_TWO_BONE_SUPPORT_LOCK_AND_DAMPED_SECONDARY_TRACKS',visual:'VISUAL_QA_PENDING',frontSign,ownership:{dance:names,translation:positionNames,secondary:secondaryTable.names.length,unchanged:['rig hierarchy','GLB','fingers','morph targets','skirt'],footPolicy:'Both feet locked for the whole phrase; the bow is hips back and down over planted feet with knees absorbing it'}};
const report={frontSign,secondaryBones:secondaryTable.names.length,secondaryByGroup:Object.fromEntries(groupIds.map((g,i)=>[g,secondaryTable.group.filter(x=>x===i).length])),maxSecondaryDepth:maxDepth,movements:MOVEMENTS,faceCues:FACE_CUES,variants:{}};
await mkdir('docs/qa/hsin-dance-r3',{recursive:true});
const manifest={modelSha256:common.modelSha256,profileSha256:common.profileSha256};
for(const [variantName,file,key] of [[REVERIE_NAME,'lunar-dance-r3.json','conservative'],[REVERIE_GRAND_NAME,'lunar-dance-r3-grand.json','dramatic']]){
  let baked;
  try{baked=bakeVariant(variantName);}catch(error){
    // The dramatic variant may legitimately fall outside the rig's safe reach: it is then simply not shipped and the safe variant stays.
    if(variantName===REVERIE_NAME)throw error;
    console.warn('Dramatic variant rejected:',error.message);report.variants[variantName]={rejected:true,reason:error.message};continue;
  }
  const {phrase,metrics}=baked;report.variants[variantName]={...metrics,seconds:phrase.seconds,samples:phrase.frames.length,safety:phrase.safety};
  if(variantName===REVERIE_NAME&&!phrase.safety.pass)throw Error('Conservative Lunar Bow fails the centre-of-mass margin: '+JSON.stringify(phrase.safety));
  if(!phrase.safety.pass){console.warn('Dramatic variant rejected, not written:',JSON.stringify(phrase.safety));report.variants[variantName].rejected=true;continue;}
  const data={version:'lunar-dance-experimental-r3',variant:key,...common,phrases:{[variantName]:phrase},authoredKeys:{keys:KEYS,hip:HIP_KEYS}};
  const text=JSON.stringify(data)+'\n';await writeFile('public/assets/animations/hsin/'+file,text);
  manifest[key]={url:'/assets/animations/hsin/'+file,sha256:hash(text),bytes:Buffer.byteLength(text)};
}
await writeFile('src/data/hsin-dance-r3.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('docs/qa/hsin-dance-r3/bake-metrics.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({manifest,report},null,1));
