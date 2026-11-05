import {createComboDirector} from './combo-sequencer.mjs';
import {claimCameraOwner} from './camera-ownership.mjs';
import {setSourceReviewVfxIsolation} from './source-review-visuals.mjs';
import {buildR61Plan,r61CueAt,r61CameraPose,R61_STATUS} from './r61-plan.mjs';

/** No extra RAF, no alternate body mixer and no writes to GLB source tracks. */
function createR61Camera(stage,plan,getVfx){
 let release=null,saved=null,enabled=true,damping=true;
 return {
  start(){
   this.stop();
   release=claimCameraOwner(stage,'r61-cinematic');
   try{
    saved=stage.cameraConfig();enabled=stage.orbit.enabled;damping=stage.orbit.enableDamping;
    stage.orbit.enabled=false;stage.orbit.enableDamping=false;
   }catch(e){release();release=null;saved=null;throw e;}
  },
  sample(time){
   if(!release)return;
   const pose=r61CameraPose(plan,time,stage.camera.aspect),vfx=getVfx();
   const center=vfx?.center??{x:0,y:1,z:0};
   const h=Number.isFinite(vfx?.scale)&&vfx.scale>0?vfx.scale:2;
   const r=h*pose.radius,a=pose.azimuth,look=center.y+h*pose.look;
   stage.restoreCamera({
    position:[center.x+Math.sin(a)*r,center.y+h*pose.elevation,center.z+Math.cos(a)*r],
    target:[center.x,look,center.z],fov:pose.fov,preset:pose.preset
   });
  },
  stop(){
   if(!release)return;
   try{if(saved)stage.restoreCamera(saved);}
   finally{
    stage.orbit.enabled=enabled;stage.orbit.enableDamping=damping;
    release();release=null;saved=null;
   }
  },
  get active(){return !!release;}
 };
}

/**
 * Pure source-to-source sequence with an explicitly AUTHORIAL field/camera score.
 * B1 and the identity of Heavy Attack / Skill / Burst are not canonically proven.
 * The game timelines, sourceFrame PSA and foot-contact markers are NOT invented.
 */
export function createR61Director(T,root,library,stage,{getVfx=()=>null,camera=true,onEvent=()=>{}}={}){
 if(!stage?.camera||!stage?.orbit||!stage?.restoreCamera)throw Error('R6.1 stage required');
 const plan=buildR61Plan(library);
 const body=createComboDirector(T,root,plan.clips,plan.schedule,{entry:0,onEvent});
 const cam=createR61Camera(stage,plan,getVfx);
 let disposed=false,active=false,paused=false,sourceVfx=null,savedVfx=null,cue=r61CueAt(plan,0),interrupted=false;
 const restoreVfx=()=>{
  const v=sourceVfx,old=savedVfx;sourceVfx=null;savedVfx=null;
  if(!v||v.disposed||!old)return;
  if(old.mode&&v.mode!==old.mode)v.setMode(old.mode);
  if(v.state!==old.state)v.setState(old.state);
 };
 const endPresentation=()=>{
  active=false;
  try{cam.stop();}finally{restoreVfx();}
 };
 const apply=time=>{
  cue=r61CueAt(plan,time);
  if(sourceVfx&&sourceVfx.disposed){endPresentation();return;}
  if(sourceVfx&&sourceVfx.state!==cue.state)sourceVfx.setState(cue.state);
  if(camera&&cam.active)cam.sample(time);
 };
 return {
  start(){
   if(disposed)return;
   endPresentation();interrupted=false;
   body.start();
   try{
    const v=getVfx();
    if(v&&!v.disposed){
     setSourceReviewVfxIsolation(v,false);
     sourceVfx=v;savedVfx={state:v.state,mode:v.mode};
     if(v.mode!=='BOTH')v.setMode('BOTH');
    }
    if(camera)cam.start();
    active=true;apply(0);
   }catch(e){endPresentation();body.interrupt();throw e;}
  },
  advance(dt){
   if(disposed||paused||!Number.isFinite(dt)||dt<=0)return;
   // An interrupted source recovery is still driven by the same clock.
   if(!active&&body.state.phase!=='exit')return;
   body.advance(dt);
   if(active){
    apply(body.state.clock);
    if(body.state.phase==='idle')endPresentation();
   }
  },
  seek(t){
   if(disposed)return;
   if(!Number.isFinite(t)||t<0||t>plan.schedule.duration)throw Error('Invalid R6.1 seek');
   if(!active)this.start();
   body.seek(t);apply(t);
   // QA scrubbing must show the requested VFX phase immediately, including
   // while paused; otherwise an OFF -> STELLAREALM fade stays at its old pose.
   if(sourceVfx?.snapState)sourceVfx.snapState(cue.state,{time:t});
  },
  interrupt(){
   if(disposed)return;
   interrupted=true;body.interrupt();endPresentation();
  },
  setPaused(v){paused=!!v;body.setPaused(paused);},
  // Playback rate is owned solely by presentation-clock.mjs.
  setSpeed(v){if(v!==1)throw Error('Use presentation clock speed');body.setSpeed(1);},
  configure(){},
  dispose(){
   if(disposed)return;
   disposed=true;
   try{endPresentation();}finally{body.dispose();}
  },
  get state(){
   const b=body.state;
   return {...b,mode:'R61_EXPERIMENTAL',sourceFrame:null,identity:'SOURCE_ROLE_UNVERIFIED',
    b1:'NOT_REPRODUCED',landing:'AUTHORED_RECOVERY_NO_FOOT_CONTACT_CERTIFICATION',
    cue:interrupted?'INTERRUPTED':cue.beat,vfxCue:active?cue.state:'MANUAL',
    presentationActive:active,cameraActive:cam.active,status:R61_STATUS,
    timeline:'AUTHORED_7_SOURCE_COMPOSITE_NO_GAME_TIMESTAMPS'};
  },
  get plan(){return plan;}
 };
}
