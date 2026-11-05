import {claimBodyOwner} from './animation-ownership.mjs';

/** Manual source inspection: no transitions, retiming, facial tracks or inferred game identity. */
export function createSourceReviewDirector(T,root,clip,{onEvent=()=>{}}={}) {
 if(!clip||!Number.isFinite(clip.duration)||clip.duration<=0||!clip.tracks.length||clip.tracks.some(t=>! /\.(position|quaternion|scale)$/.test(t.name)))throw Error('Body source clip required');
 const release=claimBodyOwner(root,'source-review');
 let mixer,action,disposed=false,paused=false,running=false,time=0,updates=0;
 try{mixer=new T.AnimationMixer(root);action=mixer.clipAction(clip.clone());action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;}
 catch(e){mixer?.stopAllAction();mixer?.uncacheRoot(root);release();throw e;}
 const apply=()=>{action.time=time;mixer.update(0);updates++;};
 const end=()=>{if(running){running=false;onEvent({type:'end',clip:clip.name});}};
 return {
  start(){if(disposed)return;end();time=0;running=true;action.play();action.paused=true;apply();onEvent({type:'start',clip:clip.name});},
  seek(t){if(disposed)return;if(!Number.isFinite(t)||t<0||t>clip.duration)throw Error('Invalid source seek');time=t;action.play();action.paused=true;apply();if(time===clip.duration)end();},
  advance(dt){if(disposed||paused||!running||!(dt>0)||!Number.isFinite(dt))return;time=Math.min(clip.duration,time+dt);apply();if(time===clip.duration)end();},
  setPaused(v){paused=!!v;},
  // The presentation clock already applies playback speed. A second multiplier is forbidden.
  setSpeed(v){if(v!==1)throw Error('Use presentation clock speed');},configure(){},
  interrupt(){if(disposed)return;end();mixer.stopAllAction();time=0;},
  dispose(){if(disposed)return;disposed=true;try{end();mixer.stopAllAction();mixer.uncacheRoot(root);}finally{release();}},
  get state(){return {phase:running?'run':'idle',clip:clip.name,clock:time,duration:clip.duration,progress:time/clip.duration,paused,updates,mode:'SOURCE_REVIEW',sourceFrame:null,identity:'MANUAL_QA_PENDING',endpoint:'HOLD_SOURCE_ENDPOINT; interruption restores bind, not a certified landing'};}
 };
}
