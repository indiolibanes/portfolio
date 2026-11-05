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
   frames.push({positions,quaternions});yield {phase:'sampling'};
  }
 }finally{mixer.stopAllAction();mixer.uncacheRoot(copy);copy.removeFromParent();}
 for(let i=0;i<frames.length;i++){
  const before=frames[Math.max(0,i-1)],after=frames[Math.min(n,i+1)],dt=(i>0&&i<n?2:1)/fps,frame=frames[i];
  frame.velocities=frame.positions.map((_,k)=>(after.positions[k]-before.positions[k])/dt);
  frame.contacts=footIndices.map(k=>k>=0&&frame.positions[k*3+1]-floor<.025&&Math.hypot(...frame.velocities.slice(k*3,k*3+3))<.18);if(i%32===0)yield {phase:'contacts'};
 }
 return {fps,frames,joints:bones.map(b=>b.name),floor,contactStatus:'INFERRED_GEOMETRY_NOT_VISUAL_APPROVAL'};
}
export function findMotionTransition(a,b,{exitFrom,exitTo,enterFrom=0,enterTo=.15}){
 if(a.joints.join()!==b.joints.join())throw Error('Joint samples differ');
 const ix=(v,s)=>Math.max(0,Math.min(s.frames.length-1,Math.round(v*s.fps)));
 if(exitTo<exitFrom||enterTo<enterFrom)throw Error('Invalid motion windows');let best=null;
 for(let i=ix(exitFrom,a);i<=ix(exitTo,a);i++)for(let j=ix(enterFrom,b);j<=ix(enterTo,b);j++){
  const score=motionDistance(a.frames[i],b.frames[j]);
  if(!best||score<best.score)best={exit:i/a.fps,enter:j/b.fps,score,contacts:[a.frames[i].contacts,b.frames[j].contacts]};
 }
 return best;
}
