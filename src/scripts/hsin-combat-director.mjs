/** One deterministic simulation clock. No renderer, timer, mixer or bone writes here. */
export const COMBAT_STATES=Object.freeze(['IDLE','PREPARATION','BASIC','SKILL','HEAVY','RECOVERY','COMPLETE','INTERRUPTED']);
export const COMBAT_FORMS=Object.freeze({
 ANSWERING_FORM:true,FORMSHIFT:false,ILLUMINING_FORM:false,MECHANISM_DOMINION:false,FINISHER:false,RETURN:false,
});
export const COMBAT_MARKERS=Object.freeze(['answering-heart','illumining-heart','formshift','xuanfang','pillars','recovery']);
const phases=[['PREPARATION',0],['BASIC',1.3],['SKILL',2.2],['RECOVERY',3.85],['COMPLETE',5.8]];
const markers=[['energy',.7],['arc',1.65],['ring',3.35],['recovery',3.85]];
export function createCombatDirector({pose,onEvent=()=>{},onState=()=>{},onRelease=()=>{}}){
 let state='IDLE',time=0,paused=false,owned=false,disposed=false,cycle=0,recovery=0;
 const trace=[];
 const record=kind=>{trace.push({cycle,time:+time.toFixed(6),state,event:kind});if(trace.length>2048)trace.shift();};
 function set(next){state=next;record('state');onState(next);}
 function release(){if(!owned)return;pose.restore();owned=false;onRelease();}
 return {
  start(){if(disposed||owned)return false;cycle++;time=0;paused=false;owned=true;pose.apply(0);set('PREPARATION');return true;},
  advance(dt){
   if(disposed||paused||!owned)return;
   if(!Number.isFinite(dt)||dt<0)throw Error('Invalid combat dt');
   if(state==='INTERRUPTED'){recovery=Math.min(1,recovery+dt/.65);pose.recover(recovery,.65);if(recovery===1){release();set('COMPLETE');}return;}
   const prior=time;time=Math.min(5.8,time+dt);
   pose.apply(time/5.8);
   for(const [next,at] of phases)if(at>prior&&at<=time)set(next);
   for(const [event,at] of markers)if(at>prior&&at<=time){record(event);onEvent(event);}
   if(time===5.8)release();
  },
  interrupt(){if(!owned||state==='INTERRUPTED')return;paused=false;recovery=0;pose.beginRecovery();set('INTERRUPTED');onEvent('clear');},
  pause(){paused=true;},resume(){paused=false;},
  reset(){release();paused=false;time=0;onEvent('clear');set('IDLE');},
  dispose(){if(disposed)return;release();onEvent('clear');disposed=true;},
  owns:()=>owned,
  sample:()=>({state,time,paused}),
  diagnostics:()=>({state,time,paused,cycle,owned,available:{BASIC:true,SKILL:true,HEAVY:false},trace:trace.map(row=>({...row}))}),
 };
}
