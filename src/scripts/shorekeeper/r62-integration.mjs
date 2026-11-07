/** Local S5 port of the owner-approved G11.3 visual score into the real lab.
 * Caller owns the existing presentation clock, RAF and facial controller.
 * This module neither loads assets nor starts playback. Source body plan stays
 * exactly PR256: G11's derived Bip001 curves are NOT an approved G7 exception.
 */
import {createR62Cinematic} from './r62-cinematic.mjs';
import {createS3CombatVfx} from './combat-vfx-adapter.mjs';
import {createSkinnedBoundsFollower} from './skinned-bounds.mjs';

export function createR62Integration(T,model,library,stage,{getVfx,camera=true,onEvent=()=>{},reducedMotion=false,bodyStability='off',entry=0,preservePoseOnDispose=false,cameraProfile:duetCameraProfile=null,arena:sharedArena=null}={}) {
 if(bodyStability!=='off')throw Error('S5: source body only; G7 editorial exception unavailable');
 const v=getVfx?.();
 if(!v||v.disposed||!v.r5||typeof v.setScoreStarGate!=='function'||typeof v.setScoreButterflyGate!=='function')
  throw Error('S5 requires the existing R5 VFX profile');
 if(!stage?.scene||!(v.scale>0))throw Error('S5 requires a ready stage and canonical model bounds');
 const reduced=typeof reducedMotion==='function'?reducedMotion:()=>!!reducedMotion;
 const arena=sharedArena??{x:v.center.x,z:v.center.z,floorY:v.center.y+v.floorY*v.scale};
 let adapter=null;const bounds=createSkinnedBoundsFollower(T,model,{h:v.scale});
 try {
  const director=createR62Cinematic(T,model,library,stage,{
   getVfx,camera,onEvent,entry,preservePoseOnDispose,bodyStability:'off',liberationMode:'layer',boundsFollower:bounds,
   scoreVfx:({plan})=>(adapter=createS3CombatVfx(T,{scene:stage.scene,model,plan,scale:v.scale,stageAnchor:arena,reducedMotion:reduced,...(sharedArena?.radius?{liberation:{radius:Math.max(8.6,sharedArena.radius/v.scale)}}:{})})),
   ...(camera?{cameraProfile:{smart:true,period:18,returnSeconds:.7,model,arena:()=>arena,reduced,...duetCameraProfile}}:{})
  });
  Object.defineProperties(director,{
   integrationStatus:{get:()=>({revision:'G113_S5_LOCAL',visualDirection:'HUMAN_ACCEPTED_DIRECTION',sourceBody:'PR256_ORIGINAL',G7:'NO_GO',S4:'INPUT_NOT_VERIFIED',release:'GATED'})},
   scoreAdapter:{get:()=>adapter}
  });
  return director;
 } catch(error) {adapter?.dispose();bounds.dispose();throw error;}
}
