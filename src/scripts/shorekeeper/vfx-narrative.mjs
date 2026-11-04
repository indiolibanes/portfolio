/** Optional authored preview, independent of combat. Driven ONLY by the lab's existing RAF. */
const CUES=[[0,'AMBIENT'],[3,'PREPARATION'],[6,'STELLAREALM'],[12,'RESONANCE_PEAK'],[15,'RECOVERY'],[18,'AMBIENT']];
export function createVfxNarrative(vfx,stage){
 let running=false,time=0,next=0,saved=null,controlsEnabled=true,cinematic=false;
 function stop(){if(!running)return;running=false;if(saved)stage.restoreCamera(saved);stage.orbit.enabled=controlsEnabled;saved=null;}
 return {
 start({camera=false}={}){stop();time=0;next=0;running=true;cinematic=!!camera;saved=stage.cameraConfig();controlsEnabled=stage.orbit.enabled;if(cinematic)stage.orbit.enabled=false;},
 stop,
 advance(dt){if(!running||!Number.isFinite(dt)||dt<=0)return;time=Math.min(18,time+Math.min(dt,.1));while(next<CUES.length&&time>=CUES[next][0])vfx.setState(CUES[next++][1]);
  if(cinematic){const u=time/18,a=-.22+.5*u,c=vfx.center,h=vfx.scale,r=h*4.65;stage.camera.position.set(c.x+Math.sin(a)*r,c.y+h*(1.0+.12*Math.sin(u*Math.PI)),c.z+Math.cos(a)*r);stage.orbit.target.set(c.x,c.y+h*.35,c.z);}
  if(time>=18)stop();
 },
 get state(){return {running,time,cinematic,source:'AUTHORED_MANUAL_NOT_COMBAT_MARKERS',visualQA:'VISUAL_QA_PENDING'};}
 };
}
