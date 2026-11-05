/** Optional authored preview, independent of combat. Driven ONLY by the lab's existing RAF. */
import {claimCameraOwner} from './camera-ownership.mjs';
const CUES=[[0,'AMBIENT'],[3,'PREPARATION'],[6,'STELLAREALM'],[12,'RESONANCE_PEAK'],[15,'RECOVERY'],[18,'AMBIENT']];
export function createVfxNarrative(vfx,stage,{cameraFit=null,endState='AMBIENT'}={}){
 if(!['OFF','AMBIENT'].includes(endState))throw Error('Invalid narrative endpoint');
 let running=false,time=0,next=0,saved=null,controlsEnabled=true,cinematic=false,release=null,damping=true;const fit={position:[0,0,0],target:[0,0,0]};
 function stop(){if(!running)return;running=false;try{if(saved)stage.restoreCamera(saved);}finally{if(saved){stage.orbit.enabled=controlsEnabled;stage.orbit.enableDamping=damping;}release?.();release=null;saved=null;}}
 return {
 start({camera=false}={}){stop();cinematic=!!camera;if(cinematic){release=claimCameraOwner(stage,'vfx-narrative');saved=stage.cameraConfig();controlsEnabled=stage.orbit.enabled;damping=stage.orbit.enableDamping;stage.orbit.enabled=false;stage.orbit.enableDamping=false;}time=0;next=0;running=true;},
 stop,
 advance(dt){if(!running||!Number.isFinite(dt)||dt<=0)return;time=Math.min(18,time+dt);while(next<CUES.length&&time>=CUES[next][0]){const cue=CUES[next++];vfx.setState(cue[0]===18?endState:cue[1]);}
  if(cinematic&&cameraFit){const cfg=cameraFit({center:vfx.center.toArray(),height:vfx.scale,aspect:stage.camera.aspect,azimuth:-.22+.5*time/18},fit);if(cfg.minDistance!==undefined)stage.orbit.minDistance=cfg.minDistance;if(cfg.maxDistance!==undefined)stage.orbit.maxDistance=cfg.maxDistance;stage.camera.fov=cfg.fov;stage.camera.updateProjectionMatrix();stage.camera.position.fromArray(cfg.position);stage.orbit.target.fromArray(cfg.target);}else if(cinematic){const u=time/18,a=-.22+.5*u,c=vfx.center,h=vfx.scale,r=h*4.65;stage.camera.position.set(c.x+Math.sin(a)*r,c.y+h*(1.0+.12*Math.sin(u*Math.PI)),c.z+Math.cos(a)*r);stage.orbit.target.set(c.x,c.y+h*.35,c.z);}
  if(time>=18)stop();
 },
 get state(){return {running,time,cinematic,source:'AUTHORED_MANUAL_NOT_COMBAT_MARKERS',visualQA:'VISUAL_QA_PENDING'};}
 };
}
