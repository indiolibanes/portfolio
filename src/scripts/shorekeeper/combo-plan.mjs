import {sampleMotionSteps,findMotionTransition} from './motion-matching.mjs';import {buildComboSchedule} from './combo-sequencer.mjs';import {landingTransitionSteps} from './landing-transition.mjs';
import {finishSteps,runSteps} from './cooperative-task.mjs';
const cache=new WeakMap();
/** One shared, source-preserving plan used by the lab and private raster harness. */
export function buildInspectableCombo(model,library,options={}){return finishSteps(comboPlanSteps(model,library,options));}
export async function prepareInspectableCombo(model,library,options={}){const row=cache.get(model),warm=!!(row?.library===library&&row.plans.has((options.variant??'ORIGINAL')+':'+(options.landing??false)));const result=await runSteps(comboPlanSteps(model,library,options),options);result.metrics.cached=warm;return result;}
function* comboPlanSteps(model,library,{variant='ORIGINAL',landing=false,signal}={}){
 if(!['ORIGINAL','REBASED','ROOT_BODY_OWNED'].includes(variant))throw Error('Invalid Root variant');
 let row=cache.get(model);if(!row||row.library!==library){row={library,plans:new Map()};cache.set(model,row);}const key=variant+':'+landing;if(row.plans.has(key))return row.plans.get(key);
 const find=id=>library.find(c=>c.name===id),required=[1,2,3,4].map(i=>'SK_ATTACK_0'+i+'_ORIGINAL'),attacks=required.map(find),missing=required.filter((_,i)=>!attacks[i]);const burst=find('SK_BURST_02_'+variant),idle=find('SK_IDLE_01_ORIGINAL'),skill=find('SK_SKILL_01_ORIGINAL');if(!burst||!idle)throw Error('Burst02 and Idle01 required');if(!skill)missing.push('SK_SKILL_01_ORIGINAL');
 const sequence=missing.some(id=>id.startsWith('SK_ATTACK'))?[burst,idle]:[...attacks,...(skill?[skill]:[]),burst,idle],steps=sequence.map(c=>({id:c.name,duration:c.duration,fade:c===idle?.45:.18}));
 const samples=[];for(const c of sequence)samples.push(yield* sampleMotionSteps(model,c));for(let i=0;i<sequence.length-1;i++){const full=sequence[i]===burst,nextBurst=sequence[i+1]===burst;const cut=findMotionTransition(samples[i],samples[i+1],{exitFrom:full?sequence[i].duration:sequence[i].duration*.8,exitTo:sequence[i].duration,enterTo:nextBurst?0:.15});if(!full)steps[i].exit=Math.min(sequence[i].duration,cut.exit);steps[i+1].enter=Math.min(cut.enter,sequence[i+1].duration*.1);}
 const clips=Object.fromEntries(sequence.map(c=>[c.name,c]));let bridge=null;
 if(landing){bridge=yield* landingTransitionSteps(model,burst,idle,landing==='r5'?{duration:1.15,settleFeetEarly:true,contactFraction:.58}:{});clips[bridge.clip.name]=bridge.clip;steps.pop();steps.push({id:bridge.clip.name,duration:bridge.clip.duration,fade:0},{id:idle.name,duration:idle.duration,enter:0,exit:Math.min(idle.duration,1.2),fade:0});}else steps.at(-1).exit=Math.min(idle.duration,1.2);
 const result={clips,schedule:buildComboSchedule(steps),missing,bridge,status:missing.length?'EXPLICIT_SOURCE_FALLBACK':'ALL_SOURCE_CLIPS_PRESENT',rotation:'ROTATION_PENDING'};if(signal?.aborted)throw new DOMException('Preparation cancelled','AbortError');row.plans.set(key,result);return result;
}
