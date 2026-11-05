/** One presentation clock, fed by the existing RAF. No simulation-step clamp. */
export function createPresentationClock() {
 let presentationTime=0,cycleId=0,speed=1,paused=false,anchor=null;
 const reanchor=()=>{anchor=null;};
 return {
  tick(now){
   if(!Number.isFinite(now))throw Error('Invalid frame time');
   if(anchor===null){anchor=now;return 0;}
   if(now<anchor)throw Error('Non-monotonic frame time');
   const dt=(now-anchor)/1000;anchor=now;
   const step=paused?0:dt*speed;presentationTime+=step;return step;
  },
  reanchor,
  setPaused(v){if(paused!==!!v){paused=!!v;reanchor();}},
  setSpeed(v){if(!Number.isFinite(v)||v<.1||v>2)throw Error('Invalid speed');speed=v;},
  seek(t){if(!Number.isFinite(t)||t<0)throw Error('Invalid seek');presentationTime=t;reanchor();},
  reset(){presentationTime=0;cycleId++;reanchor();},
  get state(){return {presentationTime,cycleId,speed,paused};}
 };
}
