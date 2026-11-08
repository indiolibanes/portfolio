/** One deterministic simulation clock. No renderer, timer, mixer or bone writes here. */
export const COMBAT_STATES=Object.freeze(['IDLE','PREPARATION','BASIC','SKILL','HEAVY','RECOVERY','COMPLETE','INTERRUPTED']);
export const COMBAT_FORMS=Object.freeze({
 ANSWERING_FORM:true,FORMSHIFT:false,ILLUMINING_FORM:false,MECHANISM_DOMINION:false,FINISHER:false,RETURN:false,
});
export const COMBAT_MARKERS=Object.freeze(['answering-heart','illumining-heart','formshift','xuanfang','pillars','recovery']);
const phases=[['PREPARATION',0],['BASIC',1.3],['SKILL',2.2],['RECOVERY',3.85],['COMPLETE',5.8]];
const markers=[['energy',.7],['arc',1.65],['ring',3.35],['recovery',3.85]];
export function createCombatDirector({pose,onEvent=()=>{},onState=()=>{},onRelease=()=>{},sequence=null}){
 let duration=sequence?.seconds??5.8,steps=sequence?.phases??phases,events=sequence?.markers??markers;
 let state='IDLE',time=0,paused=false,owned=false,disposed=false,cycle=0,recovery=0;
 const trace=[];
 const record=kind=>{trace.push({cycle,time:+time.toFixed(6),state,event:kind});if(trace.length>2048)trace.shift();};
 function set(next){state=next;record('state');onState(next);}
 function release(){if(!owned)return;pose.restore();owned=false;onRelease();}
 return {
  select(next){if(disposed||owned)return false;duration=next.seconds;steps=next.phases;events=next.markers;time=0;paused=false;return true;},
  start(){if(disposed||owned)return false;cycle++;time=0;paused=false;owned=true;pose.apply(0);set('PREPARATION');return true;},
  advance(dt){
   if(disposed||paused||!owned)return;
   if(!Number.isFinite(dt)||dt<0)throw Error('Invalid combat dt');
   if(state==='INTERRUPTED'){recovery=Math.min(1,recovery+dt/.65);pose.recover(recovery,.65);if(recovery===1){release();set('COMPLETE');}return;}
   const prior=time,end=Math.min(duration,time+dt);
   // Sample exact marker poses, even across a dropped frame; effects belong to the impact pose.
   for(const [event,at] of events)if(at>prior&&at<=end){time=at;pose.apply(time/duration);record(event);onEvent(event);}
   time=end;pose.apply(time/duration);
   for(const [next,at] of steps)if(at>prior&&at<=time)set(next);
   if(time===duration)release();
  },
  interrupt(){if(!owned||state==='INTERRUPTED')return;paused=false;recovery=0;pose.beginRecovery();set('INTERRUPTED');onEvent('clear');},
  pause(){paused=true;},resume(){paused=false;},
  reset(){release();paused=false;time=0;onEvent('clear');set('IDLE');},
  dispose(){if(disposed)return;release();onEvent('clear');disposed=true;},
  owns:()=>owned,
  sample:()=>({state,time,paused,recovery}),
  diagnostics:()=>({state,time,paused,cycle,owned,available:{BASIC:true,SKILL:true,HEAVY:false},trace:trace.map(row=>({...row}))}),
 };
}
