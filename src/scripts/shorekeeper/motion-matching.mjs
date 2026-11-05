import * as T from 'three';
import {cloneSamplingModel} from './sampling-model.mjs';
import {finishSteps} from './cooperative-task.mjs';
import {motionDistance} from './combo-sequencer.mjs';
const JOINTS=['Root','Rib','Bip001Pelvis','Bip001Spine2','Bip001Head','Bip001LHand','Bip001RHand','Bip001LFoot','Bip001RFoot'];
/** Bounded CPU sampling on an unrendered skeleton clone. Canonical model/actions are never touched. */
export function sampleMotion(model,clip,options={}){return finishSteps(sampleMotionSteps(model,clip,options));}
export function* sampleMotionSteps(model,clip,{fps=30}={}){
 const copy=cloneSamplingModel(model),bones=JOINTS.map(n=>copy.getObjectByName(n)).filter(Boolean);
 const mixer=new T.AnimationMixer(copy),action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;
 const frames=[],p=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3(),footIndices=['Bip001LFoot','Bip001RFoot'].map(n=>bones.findIndex(b=>b.name===n));
 const n=Math.ceil(clip.duration*fps);let floor=Infinity;
 try{
  for(let i=0;i<=n;i++){
   action.time=Math.min(clip.duration,i/fps);mixer.update(0);copy.updateMatrixWorld(true);
   const positions=[],quaternions=[];
   for(const bone of bones){bone.matrixWorld.decompose(p,q,scale);positions.push(p.x,p.y,p.z);quaternions.push(q.x,q.y,q.z,q.w);}
   for(const k of footIndices)if(k>=0)floor=Math.min(floor,positions[k*3+1]);
   frames.push({time:action.time,positions,quaternions});yield {phase:'sampling'};
  }
 }finally{mixer.stopAllAction();mixer.uncacheRoot(copy);copy.removeFromParent();}
 for(let i=0;i<frames.length;i++){
  const before=frames[Math.max(0,i-1)],after=frames[Math.min(n,i+1)],dt=after.time-before.time,frame=frames[i];
  frame.velocities=frame.positions.map((_,k)=>dt>0?(after.positions[k]-before.positions[k])/dt:0);
  frame.contacts=footIndices.map(k=>k>=0&&frame.positions[k*3+1]-floor<.025&&Math.hypot(...frame.velocities.slice(k*3,k*3+3))<.18);if(i%32===0)yield {phase:'contacts'};
 }
 return {fps,frames,joints:bones.map(b=>b.name),floor,contactStatus:'INFERRED_GEOMETRY_NOT_VISUAL_APPROVAL'};
}
export function findMotionTransition(a,b,{exitFrom,exitTo,enterFrom=0,enterTo=.15}){
 if(a.joints.join()!==b.joints.join())throw Error('Joint samples differ');
 if(![exitFrom,exitTo,enterFrom,enterTo].every(Number.isFinite)||exitFrom<0||enterFrom<0||exitTo<exitFrom||enterTo<enterFrom)throw Error('Invalid motion windows');
 // Rounding both endpoints may select OUTSIDE a bounded source window. The
 // final sampled pose may also be at duration, not ceil(duration*fps)/fps.
 const candidates=(s,lo,hi)=>s.frames.map((frame,i)=>({frame,time:frame.time??i/s.fps})).filter(x=>x.time>=lo&&x.time<=hi);
 const aa=candidates(a,exitFrom,exitTo),bb=candidates(b,enterFrom,enterTo);let best=null;
 for(const x of aa)for(const y of bb){
  const score=motionDistance(x.frame,y.frame);
  if(!best||score<best.score)best={exit:x.time,enter:y.time,score,contacts:[x.frame.contacts,y.frame.contacts]};
 }
 if(!best)throw Error('No samples inside motion windows');
 return best;
}
