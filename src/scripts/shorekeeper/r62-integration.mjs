/** Local S5 port of the owner-approved G11.3 visual score into the real lab.
 * Caller owns the existing presentation clock, RAF and facial controller.
 * This module neither loads assets nor starts playback. Source body plan stays
 * exactly PR256: G11's derived Bip001 curves are NOT an approved G7 exception.
 */
import {createR62Cinematic} from './r62-cinematic.mjs';
import {createS3CombatVfx} from './combat-vfx-adapter.mjs';
import {createSkinnedBoundsFollower} from './skinned-bounds.mjs';
import {createFidelityFrameTransform} from './fidelity-camera.mjs';
import {studyPlanOptions,studyPhaseAt,STUDY_PRESENTATION_STATUS,resolveStudyConfig} from './study-presentation.mjs';
import {PROFILE_ARTISTIC,PROFILE_FIDELITY,applyFidelityBody,FIDELITY_STATUS,FIDELITY_REVISION} from './fidelity-profile.mjs';

export function createR62Integration(T,model,library,stage,{getVfx,camera=true,onEvent=()=>{},reducedMotion=false,bodyStability='off',entry=0,preservePoseOnDispose=false,cameraProfile:duetCameraProfile=null,arena:sharedArena=null,profile=PROFILE_ARTISTIC,study=null}={}) {
 if(![PROFILE_ARTISTIC,PROFILE_FIDELITY].includes(profile))throw Error('Unknown presentation profile');
 const fidelity=profile===PROFILE_FIDELITY;
 // F1.4 STUDY_PRESENTATION ({durationS,holdS} or null): FIDELIDADE only; validated here so a bad request never builds anything.
 const studyCfg=study===null?null:(fidelity?resolveStudyConfig(study):(()=>{throw Error('STUDY_PRESENTATION requires the FIDELIDADE profile')})());
 if(bodyStability!=='off')throw Error('S5: source body only; G7 editorial exception unavailable');
 const v=getVfx?.();
 if(!v||v.disposed||!v.r5||typeof v.setScoreStarGate!=='function'||typeof v.setScoreButterflyGate!=='function')
  throw Error('S5 requires the existing R5 VFX profile');
 if(!stage?.scene||!(v.scale>0))throw Error('S5 requires a ready stage and canonical model bounds');
 const reduced=typeof reducedMotion==='function'?reducedMotion:()=>!!reducedMotion;
 const arena=sharedArena??{x:v.center.x,z:v.center.z,floorY:v.center.y+v.floorY*v.scale};
 let adapter=null;const bounds=createSkinnedBoundsFollower(T,model,{h:v.scale});
 try {
  const fid=fidelity?applyFidelityBody(T,model,library):null;
  const director=createR62Cinematic(T,model,fid?fid.library:library,stage,{
   getVfx,camera,onEvent,entry,preservePoseOnDispose,bodyStability:'off',liberationMode:'layer',boundsFollower:bounds,...(fidelity?{planOptions:studyCfg?studyPlanOptions(fid.library,studyCfg,{burstEntry:'cut'}):{burstEntry:'cut'}}:{}),
   scoreVfx:({plan})=>(adapter=createS3CombatVfx(T,{scene:stage.scene,model,plan,scale:v.scale,stageAnchor:arena,reducedMotion:reduced,fidelity,study:studyCfg?{holdS:studyCfg.holdS}:null,...(sharedArena?.radius?{liberation:{radius:Math.max(8.6,sharedArena.radius/v.scale)}}:{})})),
   ...(camera?{cameraProfile:{smart:true,period:18,returnSeconds:.7,model,arena:()=>arena,reduced,...duetCameraProfile,...(fidelity?{frameTransform:createFidelityFrameTransform(duetCameraProfile?.frameTransform??null)}:{})}}:{})
  });
  Object.defineProperties(director,{
   integrationStatus:{get:()=>({revision:fidelity?FIDELITY_REVISION:'G113_S5_LOCAL',profile,visualDirection:fidelity?'FIDELITY_NOT_CERTIFIED':'HUMAN_ACCEPTED_DIRECTION',sourceBody:fidelity?'PR256_ORIGINAL_BURST_ROOT_BODY_OWNED':'PR256_ORIGINAL',...(fidelity?{burstEntry:'HARD_CUT_WITH_CAMERA_CUT',camera:'F2_REFERENCE_SHOTS_CANDIDATE',stellarealm:'F2_REFERENCE_DERIVED_ORDER_MEDIUM_CONFIDENCE',butterflies:'F2_TORN_WING_PROCEDURAL_CANDIDATE',palette:'BLUE_WHITE_FORWARDED_TO_LIBERATION_LAYER'}:{}),...(fidelity?{fidelity:fid.provenance}:{}),G7:'NO_GO',S4:'INPUT_NOT_VERIFIED',release:'GATED'})},
   scoreAdapter:{get:()=>adapter},
   studyInfo:{get:()=>studyCfg?Object.freeze({...STUDY_PRESENTATION_STATUS,durationS:director.plan.schedule.duration,holdS:studyCfg.holdS,requestedDurationS:studyCfg.durationS,phaseAt:t=>studyPhaseAt(director.plan,adapter.timeline,t)}):null}
  });
  return director;
 } catch(error) {adapter?.dispose();bounds.dispose();throw error;}
}
