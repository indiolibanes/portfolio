/**
 * Duet-only actuation policy. Rotates the scene guest group (not the skeleton
 * or Root bone), using the already-owned Hsin RAF. No music beat inference.
 */
export const BASIC_TURN_SECONDS=14;
const TAU=Math.PI*2;
export function createNonRepeatingChoice(count,{random=Math.random}={}){
 if(!Number.isInteger(count)||count<1)throw Error('Choice count must be positive');
 let previous=-1;
 return {
  next(){
   const value=random();
   if(!Number.isFinite(value)||value<0||value>=1)throw Error('Random source must be in [0,1)');
   const n=previous<0||count===1?count:count-1;
   const draw=Math.floor(value*n);
   const index=previous<0||count===1?draw:draw>=previous?draw+1:draw;
   previous=index;
   return index;
  },
  get last(){return previous;}
 };
}
export function createDuetBasicTurn(group,{periodSeconds=BASIC_TURN_SECONDS}={}){
 if(!group?.rotation||!Number.isFinite(periodSeconds)||periodSeconds<3)throw Error('Invalid turn group or period');
 const original=group.rotation.y;
 const speed=TAU/periodSeconds;
 let yaw=0,velocity=0,turns=0,disposed=false;
 function advance(dt,{playing=false,paused=false,reducedMotion=false}={}){
  if(!Number.isFinite(dt)||dt<0)throw Error('Invalid turn delta');
  if(disposed||paused||reducedMotion||dt===0)return;
  // The same animation clock as the body; no independent timer, RAF or mixer.
  if(playing){
   velocity=Math.min(speed,velocity+speed*dt/.8);
   yaw+=velocity*dt;
   if(yaw>=TAU){yaw-=TAU;turns++;}
  }else{
   velocity=0;
   // Return to the nearest front-facing angle, no sudden 360-degree rewind.
   const offset=Math.atan2(Math.sin(-yaw),Math.cos(-yaw));
   const move=Math.sign(offset)*Math.min(Math.abs(offset),.9*dt);
   yaw+=move;
   if(Math.abs(yaw)<1e-7||Math.abs(offset)<=Math.abs(move))yaw=0;
  }
  group.rotation.y=original+yaw;
 }
 return {
  advance,
  dispose(){if(disposed)return;disposed=true;group.rotation.y=original;},
  get state(){return {mode:'APPROVED_BASIC_ROTATION',yaw,angularVelocity:velocity,turns,disposed,beatSynced:false};}
 };
}
export function quietFaceWait(random=Math.random){
 const draw=random();
 if(!Number.isFinite(draw)||draw<0||draw>=1)throw Error('Invalid face interval random source');
 return 5+draw*9;
}
