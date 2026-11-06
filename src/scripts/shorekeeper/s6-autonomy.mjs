/**
 * S6 autonomy pilot — one orchestration clock, zero mixers/RAF/morph writers.
 * Starts the approved S5/G11.3 cycle only after canonical model AND original
 * libraries are verified. Then returns to the existing original-idle scheduler
 * and gently schedules three distinct facial families via the existing face owner.
 * The recipes remain experimental; no inferred canonical animation claims.
 */
export const S6_AUTO_FACE_ROSTER=Object.freeze([
  Object.freeze({id:'MY_STAR_V2',family:'warm-smile'}),
  Object.freeze({id:'SURPRISE_SOFT',family:'surprise'}),
  Object.freeze({id:'HOPE',family:'serene'})
]);
export const S6_AUTO_STATUS=Object.freeze({
  WAITING:'WAITING_VERIFIED_PRIVATE_ASSETS',CINEMATIC:'PLAYING_S5_G113',
  IDLES:'AUTOMATIC_ORIGINAL_IDLES',BLOCKED:'BLOCKED',STOPPED:'MANUAL_CONTROL'
});
export function createS6Autonomy({startCinematic,enterIdles,triggerExpression,expressionAvailable,roster=S6_AUTO_FACE_ROSTER}={}){
  if([startCinematic,enterIdles,triggerExpression,expressionAvailable].some(fn=>typeof fn!=='function'))throw Error('S6 autonomy callbacks required');
  if(!Array.isArray(roster)||!roster.length||new Set(roster.map(x=>x.family)).size!==roster.length)throw Error('Duplicate or empty expression family');
  const modes=Object.values(S6_AUTO_STATUS);
  let phase=S6_AUTO_STATUS.WAITING,reason=null,expressionIndex=0,faceWait=9,cycles=0,attempts=0;
  function ready(x){return !!x?.canonical&&!!x?.completeLibraries&&!!x?.allIdles&&!!x?.stage&&!!x?.visible&&!x?.loading&&!x?.paused&&!x?.reducedMotion;}
  function advance(dt,snapshot){
    if(!Number.isFinite(dt)||dt<0)throw Error('S6 invalid frame delta');
    if(phase===S6_AUTO_STATUS.BLOCKED||phase===S6_AUTO_STATUS.STOPPED||!ready(snapshot)||!dt)return;
    if(phase===S6_AUTO_STATUS.WAITING){
      if(snapshot.bodyPhase!=='idle'||snapshot.cameraReturning)return;
      attempts++;
      try{
        if(startCinematic()===true){phase=S6_AUTO_STATUS.CINEMATIC;cycles++;reason=null;}
      }catch(error){phase=S6_AUTO_STATUS.BLOCKED;reason='S5_START_FAILED';}
      return;
    }
    if(phase===S6_AUTO_STATUS.CINEMATIC){
      if(snapshot.bodyMode!=='R61_EXPERIMENTAL'){phase=S6_AUTO_STATUS.BLOCKED;reason='CINEMATIC_OWNER_LOST';return;}
      if(snapshot.bodyPhase!=='idle'||snapshot.cameraReturning)return;
      try{
        if(enterIdles()===true){phase=S6_AUTO_STATUS.IDLES;reason=null;faceWait=9;}
      }catch(error){phase=S6_AUTO_STATUS.BLOCKED;reason='IDLE_HANDOFF_FAILED';}
      return;
    }
    if(phase!==S6_AUTO_STATUS.IDLES)return;
    if(snapshot.bodyMode==='R61_EXPERIMENTAL'){phase=S6_AUTO_STATUS.BLOCKED;reason='UNEXPECTED_CINEMATIC';return;}
    faceWait=Math.max(0,faceWait-dt);
    if(faceWait>0||snapshot.faceBusy||snapshot.faceWritable===false)return;
    let accepted=false;
    for(let n=0;n<roster.length;n++){
      const row=roster[expressionIndex%roster.length];
      expressionIndex++;
      try{if(expressionAvailable(row.id)===true&&triggerExpression(row.id)===true){accepted=true;break;}}
      catch{reason='FACIAL_RECIPE_UNAVAILABLE';}
    }
    faceWait=accepted?17:5;
  }
  return {
    advance,
    stop(){phase=S6_AUTO_STATUS.STOPPED;reason='MANUAL_OVERRIDE';},
    restart(){phase=S6_AUTO_STATUS.WAITING;reason=null;faceWait=9;},
    reset(){phase=S6_AUTO_STATUS.WAITING;reason=null;faceWait=9;},
    get state(){return Object.freeze({phase,reason,cycles,attempts,curatedFaces:roster.map(row=>row.id),release:'S6_G7_NO_GO_PREVIEW_ONLY'});},
  };
}
