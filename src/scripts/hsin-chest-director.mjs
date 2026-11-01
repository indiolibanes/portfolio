import {CHEST_TIMING,organicChestTiming,breathSignal} from './hsin-limb-motion.mjs';
import {COMPOSITION} from './hsin-hand-composition.mjs';
/** One clock, injected by the existing visible facial rAF; no timers or extra writers. */
export function createChestDirector({pose,seed=1,onEvent=()=>{},invalidate=()=>{},organic=false,compose=null}){
 let rng=seed>>>0,time=0,next=35,phase='idle',elapsed=0,weight=0,exitFrom=1,spans={...CHEST_TIMING},variant='plain';const random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296;};
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
 // The breath signal rides the same clock; the pose fades it in only near the final pose.
 const perform=w=>pose.apply(w,{breath:breathSignal(time)});
 function start(canStart=true,{variant:requestedVariant}={}){
  if(phase!=='idle'||!canStart||!pose.diagnostics().ready||!pose.atBaseline())return false;
  // Per gesture: how long it takes, and whether the hands compose. A draw is only spent when the feature is wired in.
  spans=organic?organicChestTiming(random):{...CHEST_TIMING};
  const composed=requestedVariant==='composed'||requestedVariant===undefined&&typeof compose==='function'&&compose()&&random()<COMPOSITION.chance,label=composed?'composed':'plain';
  variant=pose.select?.(label)?label:'plain';
  phase='entry';elapsed=0;onEvent('gesture:prepare');return true;
 }
 return {start,advance(dt,{automatic=false,canStart=false,warm=false}={}){
  if(!Number.isFinite(dt)||dt<0)return;time+=dt;if(phase==='idle'){if(automatic&&warm&&time>=next&&canStart&&!start(true))next=time+8;return;}
  elapsed+=dt;
  if(phase==='entry'){weight=ease(elapsed/spans.entry);perform(weight);if(elapsed>=spans.entry){phase='hold';elapsed=0;onEvent('gesture:hold');}}
  else if(phase==='hold'){weight=1;perform(1);if(elapsed>=spans.hold){exitFrom=1;phase='exit';elapsed=0;onEvent('gesture:release');}}
  else{weight=exitFrom*(1-ease(elapsed/spans.exit));perform(weight);if(elapsed>=spans.exit){pose.restore();phase='idle';elapsed=0;next=time+55+random()*45;}}
  invalidate();
 },release(){if(phase==='idle'||phase==='exit')return false;exitFrom=weight;phase='exit';elapsed=0;onEvent('gesture:release');return true;},cancel(){if(phase!=='idle')pose.restore();phase='idle';elapsed=0;weight=0;exitFrom=1;next=time+55+random()*45;onEvent('gesture:release');invalidate();},busy:()=>phase!=='idle',diagnostics:()=>({phase,elapsed,time,next,spans:{...spans},variant,pose:pose.diagnostics()})};
}
