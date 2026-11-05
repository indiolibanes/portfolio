import * as T from 'three';
import {cloneSamplingModel} from './sampling-model.mjs';
import {createRebasedBurstClip,createBindRootBurstClip} from './liberation-rotation.mjs';
const hash=/^[a-f0-9]{64}$/;
const unit=q=>{if(!q.toArray().every(Number.isFinite)||q.lengthSq()<1e-12)throw Error('Invalid quaternion');return q.normalize();};
function continuous(q,previous){unit(q);if(previous&&q.dot(previous)<0)q.set(-q.x,-q.y,-q.z,-q.w);return q;}
export function unwrapYaw(forward,previous,epsilon=1e-6){
 if(Math.hypot(forward.x,forward.z)<epsilon)return null;
 const yaw=Math.atan2(forward.x,forward.z);
 return previous===null?yaw:previous+Math.atan2(Math.sin(yaw-previous),Math.cos(yaw-previous));
}
/** Actual key times plus uniform sampling (1e-7 s deduplication); never inferred PSA frames. */
export function auditTimes(clip,fps){
 if(![30,60].includes(fps)||!Number.isFinite(clip.duration)||clip.duration<=0)throw Error('Invalid audit duration/FPS');
 const times=new Set([0,clip.duration]);
 for(let i=0;i/fps<clip.duration;i++)times.add(i/fps);
 for(const tr of clip.tracks)for(const t of tr.times){if(!Number.isFinite(t)||t<0||t>clip.duration+1e-6)throw Error('Invalid source time');times.add(Math.min(t,clip.duration));}
 const result=[];for(const t of [...times].sort((a,b)=>a-b)){if(!result.length||t-result.at(-1)>1e-7)result.push(t);else if(t===clip.duration)result[result.length-1]=t;}return result;
}
function probesFor(model,selections){
 if(!Array.isArray(selections)||selections.length!==2||new Set(selections.map(s=>s.side)).size!==2)throw Error('Explicit L/R skinned sole selections required');
 return selections.map(s=>{
  const matches=[];model.traverse(o=>{if(o.name===s.mesh)matches.push(o);});const mesh=matches[0];
  if(matches.length!==1||!mesh?.isSkinnedMesh||!['L','R'].includes(s.side)||!s.evidence||!Array.isArray(s.indices)||!s.indices.length||new Set(s.indices).size!==s.indices.length||s.indices.some(i=>!Number.isInteger(i)||i<0||i>=mesh.geometry.attributes.position.count))throw Error('Invalid calibrated sole selection');
  return {...s,mesh};
 });
}
/** Read-only numeric QA. No renderer, live mixer, source edit or automatic canonical marker. */
export function sampleSourceMotion(model,original,{fps=60,variant='ORIGINAL',sourceHash,clipHash,provenance,calibration}={}){
 if(!hash.test(sourceHash)||!hash.test(clipHash)||!['VERIFIED_BYTES','SYNTHETIC_FIXTURE'].includes(provenance))throw Error('Verified source identity required');
 const c=calibration;
 if(!c?.evidence||!c.units||!['Root','Bip001'].every(name=>Array.isArray(c.forwardLocalByBone?.[name])&&c.forwardLocalByBone[name].length===3&&c.forwardLocalByBone[name].every(Number.isFinite))||!Number.isFinite(c.floorY)||![c.heightTolerance,c.velocityTolerance,c.sustainSeconds].every(v=>Number.isFinite(v)&&v>0))throw Error('Explicit floor/forward/contact calibration required');
 const forwardByBone=Object.fromEntries(['Root','Bip001'].map(name=>{const v=new T.Vector3().fromArray(c.forwardLocalByBone[name]);if(v.length()<1e-6)throw Error('Invalid forward');return [name,v.normalize()];}));
 model.updateWorldMatrix(true,true);const copy=cloneSamplingModel(model);copy.matrixAutoUpdate=false;copy.matrix.copy(model.matrixWorld);copy.updateMatrixWorld(true);
 const mixer=new T.AnimationMixer(copy),tracked=['Root','Bip001',c.pelvis??'Bip001Pelvis',c.head??'Bip001Head',c.leftHand??'Bip001LHand',c.rightHand??'Bip001RHand'];
 const bones=Object.fromEntries(tracked.map(name=>{const rows=[];copy.traverse(o=>{if(o.isBone&&o.name===name)rows.push(o);});if(rows.length!==1)throw Error('Unique tracked bone required: '+name);return [name,rows[0]];}));
 const soles=probesFor(copy,c.soles),previous={},yawState={},rotation={},rows=[];
 let clip;
 if(variant==='ORIGINAL')clip=original.clone();else if(variant==='REBASED')clip=createRebasedBurstClip(T,copy,original).clip;else if(variant==='ROOT_BODY_OWNED')clip=createBindRootBurstClip(T,copy,original).clip;else throw Error('Invalid variant');
 // Normalize diagnostic copies only; source bytes and original tracks stay untouched.
 for(const tr of clip.tracks)if(tr.name.endsWith('.quaternion')){let qPrev=null;for(let i=0;i<tr.values.length;i+=4){const q=continuous(new T.Quaternion().fromArray(tr.values,i),qPrev);q.toArray(tr.values,i);qPrev=q;}}
 const times=auditTimes(clip,fps),action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;
 try{
  for(let sampleFrame=0;sampleFrame<times.length;sampleFrame++){
   const clipTime=times[sampleFrame];action.time=clipTime;mixer.update(0);copy.updateMatrixWorld(true);
   const row={sampleFrame,clipTime,sourceFrame:null,bones:{},soles:{}};
   for(const [name,bone] of Object.entries(bones)){
    const local=unit(bone.quaternion.clone()),world=continuous(bone.getWorldQuaternion(new T.Quaternion()),previous[name]),forward=forwardByBone[name]?.clone().applyQuaternion(world)??null;
    const unwrapped=forward?unwrapYaw(forward,yawState[name]??null):null;yawState[name]=unwrapped;
    rotation[name]=(rotation[name]??0)+(previous[name]?2*Math.acos(Math.min(1,Math.abs(world.dot(previous[name])))):0);previous[name]=world.clone();
    row.bones[name]={localQuaternion:local.toArray(),worldQuaternion:world.toArray(),worldPosition:bone.getWorldPosition(new T.Vector3()).toArray(),worldMatrix:bone.matrixWorld.toArray(),forward:forward?.toArray()??null,forwardLocal:forwardByBone[name]?.toArray()??null,yaw:!forward||Math.hypot(forward.x,forward.z)<1e-6?null:Math.atan2(forward.x,forward.z),yawUnwrapped:unwrapped,rotationPathRadians:rotation[name]};
   }
   for(const s of soles){
    s.mesh.skeleton.update();const points=s.indices.map(i=>s.mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(s.mesh.matrixWorld).toArray()),before=rows.at(-1),dt=before?clipTime-before.clipTime:0;
    if(!points.flat().every(Number.isFinite))throw Error('Nonfinite skinned sole');
    const inBand=points.map((p,i)=>Math.abs(p[1]-c.floorY)<=c.heightTolerance?i:-1).filter(i=>i>=0),prior=before?.soles[s.side]?.points;
    const speed=dt>0&&prior&&inBand.length?Math.max(...inBand.map(i=>Math.hypot(...points[i].map((v,j)=>v-prior[i][j]))/dt)):null;
    const soleY=Math.min(...points.map(p=>p[1]));row.soles[s.side]={points,soleY,clearance:soleY-c.floorY,maxContactVertexSpeed:speed,candidate:inBand.length>0&&soleY>=c.floorY-c.heightTolerance&&speed!==null&&speed<=c.velocityTolerance,sustained:false};
   }
   rows.push(row);
  }
  const contacts={};
  for(const side of ['L','R']){
   contacts[side]=[];let start=null;
   const close=end=>{if(start!==null&&rows[end].clipTime-rows[start].clipTime>=c.sustainSeconds-1e-9){for(let i=start;i<=end;i++)rows[i].soles[side].sustained=true;contacts[side].push({firstSample:rows[start].clipTime,lastSample:rows[end].clipTime});}start=null;};
   for(let i=0;i<rows.length;i++){if(rows[i].soles[side].candidate){if(start===null)start=i;}else if(start!==null)close(i-1);}if(start!==null)close(rows.length-1);
  }
  const peak=rows.reduce((best,r)=>r.bones[tracked[2]].worldPosition[1]>best.bones[tracked[2]].worldPosition[1]?r:best,rows[0]);
  return {schema:'shorekeeper.source-motion-audit/1',sourceHash,clipHash,provenance,clipId:original.name,variant,fps,duration:clip.duration,units:c.units,calibration:c,sourceFramePolicy:'UNRESOLVED: sampleFrame is a diagnostic index, not a PSA frame',tracks:original.tracks.map(t=>({name:t.name,times:Array.from(t.times),values:Array.from(t.values)})),rows,contacts,pelvisPeak:{clipTime:peak.clipTime,y:peak.bones[tracked[2]].worldPosition[1]},markers:[],visualQA:'PENDING',mapping:'LIBERATION_MAPPING_UNVERIFIED'};
 }finally{mixer.stopAllAction();mixer.uncacheRoot(copy);copy.removeFromParent();}
}
