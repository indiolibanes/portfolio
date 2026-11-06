import {createComboDirector} from './combo-sequencer.mjs';
import {claimCameraOwner} from './camera-ownership.mjs';
import {setSourceReviewVfxIsolation} from './source-review-visuals.mjs';
import {buildR61Plan,r61CueAt,r61CameraPose,R61_STATUS} from './r61-plan.mjs';
import {r62CameraFrame,R62_DEFAULT_ORBIT_PERIOD} from './r62-camera.mjs';
import {buildTrailHistory} from './combat-vfx-trails.mjs';
import {ambientButterflyGate} from './combat-vfx-events.mjs';
import {createRigCameraReader,prepareCameraGuide,smartCameraFrame,projectCameraPoints} from './smart-camera.mjs';

/** No extra RAF, no alternate body mixer and no writes to GLB source tracks. */
function createR61Camera(stage,plan,getVfx,profile=null){
 let release=null,saved=null,enabled=true,damping=true,ret=null;
 // R6.2 S3 opt-in profile: anchors are READ (getWorldPosition), never written.
 const bone=n=>profile?.model?.getObjectByName?.(n)??null;
 const B=profile?{pel:bone('Bip001Pelvis'),head:bone('Bip001Head'),rh:bone('Bip001RHand'),lh:bone('Bip001LHand')}:null;
 const read=o=>{if(!o)return null;const p=new stage.camera.position.constructor();o.getWorldPosition(p);return p;};
 let lastFrame=null;
 // OrbitControls.update() also runs in restoreCamera/draw while controls are disabled.
 // Fit the authored pose without its distance being silently clamped. Limits derive
 // from the captured manual configuration, never from the previous sampled frame.
 // stop() restores that configuration on every exit path; no public stage API change.
 const applyProfileCamera=pose=>{
  const distance=Math.hypot(...pose.position.map((x,i)=>x-pose.target[i]));
  const min=Number.isFinite(saved?.minDistance)?saved.minDistance:0;
  const max=Number.isFinite(saved?.maxDistance)?saved.maxDistance:distance;
  stage.restoreCamera({...pose,minDistance:Math.min(min,distance),maxDistance:Math.max(max,distance+1e-6)});
 };
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
   if(!release||ret)return;
   if(profile){
    const vfx=getVfx(),h=Number.isFinite(vfx?.scale)&&vfx.scale>0?vfx.scale:2;
    let f=r62CameraFrame({plan,timeline:profile.timeline,t:time,aspect:stage.camera.aspect,h,center:vfx?.center??{x:0,y:1,z:0},arena:profile.arena?.()??null,
     anchors:{pel:read(B.pel),head:read(B.head),rh:read(B.rh),lh:read(B.lh)},period:profile.period??R62_DEFAULT_ORBIT_PERIOD,reduced:!!profile.reduced?.()});
    if(profile.smart && profile.rigReader && profile.guide){const rig=profile.rigReader.read(),secondary=profile.secondary?.()??[];f=smartCameraFrame(profile.T,{base:f,rig,guide:profile.guide,t:time,h,aspect:stage.camera.aspect,width:stage.canvas?.width??960,height:stage.canvas?.height??540,reduced:!!profile.reduced?.(),secondary,plan,timeline:profile.timeline,center:vfx?.center??{x:0,y:1,z:0},arena:profile.arena?.()??null,period:profile.period??R62_DEFAULT_ORBIT_PERIOD});}
    lastFrame=f;applyProfileCamera({position:f.position,target:f.target,fov:f.fov,preset:f.preset});return;
   }
   const pose=r61CameraPose(plan,time,stage.camera.aspect),vfx=getVfx();
   const center=vfx?.center??{x:0,y:1,z:0};
   const h=Number.isFinite(vfx?.scale)&&vfx.scale>0?vfx.scale:2;
   const r=h*pose.radius,a=pose.azimuth,look=center.y+h*pose.look;
   stage.restoreCamera({
    position:[center.x+Math.sin(a)*r,center.y+h*pose.elevation,center.z+Math.cos(a)*r],
    target:[center.x,look,center.z],fov:pose.fov,preset:pose.preset
   });
  },
  /** Natural end only: blend to the saved camera over `seconds`, same owner, driven by the director dt. */
  beginReturn(seconds){
   if(!release||!saved||!(seconds>0)){this.stop();return;}
   const now=stage.cameraConfig();ret={from:now,to:saved,t:0,seconds};
  },
  stepReturn(dt){
   if(!ret)return false;
   ret.t=Math.min(ret.seconds,ret.t+Math.max(0,dt));const x=ret.t/ret.seconds,u=x*x*(3-2*x),L=(a,b)=>a.map((v,i)=>v+(b[i]-v)*u);
   if(x>=1){this.stop();return false;}
   applyProfileCamera({position:L(ret.from.position,ret.to.position),target:L(ret.from.target,ret.to.target),fov:ret.from.fov+(ret.to.fov-ret.from.fov)*u,preset:'r62-return'});
   return true;
  },
  get returning(){return !!ret;},
  get lastFrame(){return lastFrame;},
  telemetry(){
   if(!profile?.rigReader)return null;const rig=profile.rigReader.read(),T=profile.T,c=stage.camera;
   const pos=c.position.clone().sub(new T.Vector3().fromArray(rig.anchors.chest));pos.y=0;pos.normalize();
   return {...lastFrame?.smart,...projectCameraPoints(T,c,rig.points,stage.canvas?.width??960,stage.canvas?.height??540),front:rig.front,frontFacingDot:pos.dot(new T.Vector3().fromArray(rig.front)),backView:pos.dot(new T.Vector3().fromArray(rig.front))<0,azimuth:Math.atan2(c.position.x-stage.orbit.target.x,c.position.z-stage.orbit.target.z),radius:c.position.distanceTo(stage.orbit.target),target:stage.orbit.target.toArray(),ownership:release?'r61-cinematic':'MANUAL',reason:release?lastFrame?.smart?.reason:'MANUAL',effectivePosition:c.position.toArray(),effectiveFov:c.fov,aspect:c.aspect};
  },
  stop(){
   ret=null;
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
export function createR62Cinematic(T,root,library,stage,{getVfx=()=>null,camera=true,onEvent=()=>{},scoreVfx=null,cameraProfile=null,liberationMode=null,boundsFollower=null,bodyStability='off'}={}){
 if(!stage?.camera||!stage?.orbit||!stage?.restoreCamera)throw Error('R6.1 stage required');
 if(bodyStability!=='off')throw Error('S5: derived body curves require a specific editorial authorization');
 const plan=buildR61Plan(library);
 const body=createComboDirector(T,root,plan.clips,plan.schedule,{entry:0,onEvent});
 // R6.2 opt-in: an isolated score adapter ({apply,release,dispose}) built from the plan. While it
 // is present the legacy R5 PREPARATION cue (R3 coreCrystal/coreCage) is held at AMBIENT until the
 // Burst starts, so Basic/Heavy/Skill beats are read only through the score. Burst+ stays legacy (S3).
 const score=typeof scoreVfx==='function'?scoreVfx({plan,stage}):null;
 const burstStart=plan.schedule.segments[5].start;
 // R6.2 S3: with the Liberation layer the legacy R5 director stays AMBIENT for the whole sequence (the
 // layer owns condense/field/peak; ambient butterflies remain); 'legacy' A/B keeps the R5 cues but only
 // after the complete Skill (never during it). Without S3 the S1/S2 rule (AMBIENT before Burst) holds.
 const lib=score?.liberationEnabled?score.timeline:null;
 if(liberationMode===null)liberationMode=score?.liberation?'layer':'legacy';
 if(!['layer','legacy'].includes(liberationMode)||(lib&&liberationMode==='layer'&&!score.liberation))throw Error('R6.2 liberation mode must be layer (with a layer) or legacy');
 const legacyState=(c,t)=>!score?c.state:lib?(liberationMode==='layer'?'AMBIENT':t<lib.start?'AMBIENT':c.state):t<burstStart?'AMBIENT':c.state;
 const starGate=t=>!lib?null:liberationMode==='layer'?(score.last?.starGate??0):(t<lib.start?0:1);
 // G11: deterministic motion-trail history (30 Hz table through the body director's own seek; no second mixer).
 if(score?.setTrailHistory){try{const th=buildTrailHistory(root,t=>body.seek(t),plan.schedule.duration);if(th)score.setTrailHistory(th);body.seek(0);}catch(e){score.setTrailHistory(null);body.seek(0);}}
 if(cameraProfile?.smart){
  const h=getVfx()?.scale??2;
  try{const rigReader=createRigCameraReader(T,root,h),key=Object.values(plan.clips).map(c=>c.uuid).join('|')+'|'+h;
   const guide=prepareCameraGuide({model:root,key,duration:plan.schedule.duration,samplePose:t=>body.seek(t),reader:rigReader,skillWindow:score?.skillWindow??null,h});body.seek(0);
   cameraProfile={...cameraProfile,T,rigReader,guide,secondary:()=>score?.last?.skill?.butterflies?.filter(b=>b.visible&&b.pos).map(b=>b.pos)??[]};
  }catch(e){score?.dispose();body.dispose();throw e;}
 }
 const cam=createR61Camera(stage,plan,getVfx,cameraProfile?{...cameraProfile,timeline:cameraProfile.timeline??lib}:null);
 let disposed=false,active=false,paused=false,sourceVfx=null,savedVfx=null,cue=r61CueAt(plan,0),interrupted=false,termination=null;
 const restoreVfx=()=>{
  const v=sourceVfx,old=savedVfx;sourceVfx=null;savedVfx=null;
  if(!v||v.disposed||!old)return;
  if(old.mode&&v.mode!==old.mode)v.setMode(old.mode);
  if(old.stage&&v.stage!==old.stage)v.setStage(old.stage);
  if(old.enabled)for(const [system,wasEnabled] of Object.entries(old.enabled))
   if(v.enabled?.[system]!==wasEnabled)v.setEnabled(system,wasEnabled);
  if(v.state!==old.state)v.setState(old.state);
  // Recreate the exact manual pose, including an in-progress fade. setState()
  // alone would start another transition from the cinematic's final levels.
  for(const [key,value] of Object.entries(old.values))v[key]=value;
  for(const [key,value] of Object.entries(old.arrays))v[key].set(value);
  v.renderPose?.();
  if(v.root)v.root.visible=old.rootVisible;
  if(v.environment?.root)v.environment.root.visible=old.environmentVisible;
 };
 const endPresentation=(natural=false)=>{
  active=false;
  try{if(natural&&cameraProfile?.returnSeconds>0&&cam.active)cam.beginReturn(cameraProfile.returnSeconds);else cam.stop();}
  finally{try{score?.release();}finally{try{boundsFollower?.release?.();}finally{restoreVfx();}}}
 };
 // Presentation resources and the body have separate lifetimes. Releasing the
 // camera/VFX must also start body recovery; otherwise advance() sleeps in run.
 const interruptPresentation=reason=>{
  if(!interrupted){interrupted=true;body.interrupt();}
  termination=reason;endPresentation();
 };
 const sourceAvailable=()=>!!sourceVfx&&!sourceVfx.disposed&&getVfx()===sourceVfx;
 const apply=time=>{
  cue=r61CueAt(plan,time);
  if(!sourceAvailable()){interruptPresentation('VFX_UNAVAILABLE');return;}
  const want=legacyState(cue,time);
  if(sourceVfx&&sourceVfx.state!==want)sourceVfx.setState(want);
  if(score){
   try{score.apply(time,undefined,stage.camera.aspect);}
   catch(error){interruptPresentation('SCORE_VFX_FAILED');return;}
   const g=starGate(time);if(g!==null&&sourceVfx?.setScoreStarGate){const k=Math.max(0,Math.min(1,g));sourceVfx.setScoreStarGate(k,liberationMode==='layer'?k:null);}
   if(lib?.g11&&sourceVfx?.setScoreButterflyGate)sourceVfx.setScoreButterflyGate(ambientButterflyGate(lib.g11,time));
  }
  if(boundsFollower){try{boundsFollower.update();}catch(error){interruptPresentation('BOUNDS_FOLLOWER_FAILED');return;}}
  if(camera&&cam.active)cam.sample(time);
 };
 return {
  start(){
   if(disposed)return;
   endPresentation();interrupted=false;termination=null;
   body.start();
   try{
    const v=getVfx();
    if(v&&!v.disposed){
     setSourceReviewVfxIsolation(v,false);
     sourceVfx=v;savedVfx={state:v.state,mode:v.mode,stage:v.stage,enabled:v.enabled?{...v.enabled}:null,
      rootVisible:v.root?.visible,environmentVisible:v.environment?.root.visible,
      values:Object.fromEntries(['time','corePhase','coreFrozen','transition','suspended','scoreStarGate','scoreStarCanopy','scoreButterflyGate'].filter(k=>k in v).map(k=>[k,v[k]])),
      arrays:Object.fromEntries(['levels','from','target'].filter(k=>v[k]?.set).map(k=>[k,Array.from(v[k])]))};
     if(v.mode!=='BOTH')v.setMode('BOTH');
     // R6.1 explicitly presents OUTER rather than inheriting a prior manual
     // Inner/Supernal tint or disabled field/canopy; restore both on exit.
     if(v.stage!=='outer'&&v.setStage)v.setStage('outer');
     for(const system of ['butterflies','field','canopy','collapsedCore'])
      if(v.enabled&&!v.enabled[system])v.setEnabled(system,true);
    }
    if(camera)cam.start();
    active=true;apply(0);
   }catch(e){interruptPresentation('START_FAILED');throw e;}
  },
  advance(dt){
   if(disposed)return;
   // Detect null, replacement and disposal BEFORE consuming this frame's time.
   // Do not adopt a replacement or overwrite its manual settings implicitly.
   if(active&&!sourceAvailable())interruptPresentation('VFX_UNAVAILABLE');
   if(paused||!Number.isFinite(dt)||dt<=0)return;
   if(!active&&cam.returning){cam.stepReturn(dt);}
   // An interrupted source recovery is still driven by the same clock.
   if(!active&&body.state.phase!=='exit')return;
   body.advance(dt);
   if(active){
    apply(body.state.clock);
    if(body.state.phase==='idle')endPresentation(true);
   }
  },
  seek(t){
   if(disposed)return;
   if(!Number.isFinite(t)||t<0||t>plan.schedule.duration)throw Error('Invalid R6.1 seek');
   if(cam.returning)cam.stop();
   if(!active)this.start();
   if(!active)return;
   body.seek(t);apply(t);
   // QA scrubbing must show the requested VFX phase immediately, including
   // while paused; otherwise an OFF -> STELLAREALM fade stays at its old pose.
   if(sourceVfx?.snapState)sourceVfx.snapState(legacyState(cue,t),{time:t});
  },
  interrupt(){
   if(disposed)return;
   interruptPresentation('USER_INTERRUPT');
  },
  // Manual camera changes and a new reduced-motion preference revoke only the
  // automatic camera. They must not be overwritten on the next body frame.
  stopCamera(){cam.stop();},
  setPaused(v){paused=!!v;body.setPaused(paused);},
  // Playback rate is owned solely by presentation-clock.mjs.
  setSpeed(v){if(v!==1)throw Error('Use presentation clock speed');body.setSpeed(1);},
  configure(){},
  dispose(){
   if(disposed)return;
   disposed=true;
   try{endPresentation();}finally{try{score?.dispose();}finally{try{boundsFollower?.dispose?.();}finally{body.dispose();}}}
  },
  get state(){
   const b=body.state;
   return {...b,mode:'R61_EXPERIMENTAL',sourceFrame:null,identity:'SOURCE_ROLE_UNVERIFIED',
    b1:'NOT_REPRODUCED',landing:'AUTHORED_RECOVERY_NO_FOOT_CONTACT_CERTIFICATION',
    cue:interrupted?'INTERRUPTED':cue.beat,vfxCue:active?legacyState(cue,b.clock):'MANUAL',scoreVfx:score?(score.liberationEnabled?'R62_S3_AUTHORIAL_SIMULATED':score.skillEnabled?'R62_S2_AUTHORIAL_SIMULATED':'R62_S1_AUTHORIAL_SIMULATED'):null,
    liberationMode:lib?liberationMode:null,camera:cameraProfile?{profile:'R62_S3',orbitPeriod:cameraProfile.period??R62_DEFAULT_ORBIT_PERIOD,returnSeconds:cameraProfile.returnSeconds??0,returning:cam.returning,phase:cam.lastFrame?.phase??null}:null,
    presentationActive:active,cameraActive:cam.active,termination,status:R61_STATUS,
    timeline:'AUTHORED_7_SOURCE_COMPOSITE_NO_GAME_TIMESTAMPS'};
  },
  cameraTelemetry(){return cam.telemetry();},
  get plan(){return plan;}
 };
}
