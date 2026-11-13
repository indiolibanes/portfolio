/** Ability type describes the input/action; damage classification never selects a category. */
export const ABILITY_CATEGORIES=Object.freeze({
 BASIC:{name:'Basic Attacks',form:'Answering Form',stages:['basic01','basic02','combo']},
 SKILL:{name:'Resonance Skills',canonical:'Heartward by Moon',stages:['skill'],canonicalDemonstrated:false},
 ULTIMATE:{name:'Resonance Liberations / Ultimates',stages:['formshift','pillars'],implemented:false},
 HEAVY:{name:'Forte / Heavy',role:'Transitions between skills and forms',implemented:false},
});
export const ABILITIES=Object.freeze({
 basic01:{category:'BASIC',label:'Basic 01',implemented:true},
 basic02:{category:'BASIC',label:'Basic 02',implemented:true},
 combo:{category:'BASIC',label:'Combo 01 → 02',implemented:true},
 skill:{category:'SKILL',label:'Experimental Skill Study',implemented:true,canonicalDemonstrated:false},
 legacy:{category:'REFERENCE',label:'Sequência cinematográfica R2.2',implemented:true},
 formshift:{category:'ULTIMATE',label:'Formshift',implemented:false},
 pillars:{category:'ULTIMATE',label:'Pillars Across Heaven',implemented:false},
});
export function abilityEnvelope(data,time){
 if(!data.ability)return 1;
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
 return ease(time/.7)*(1-ease((time-data.presentation.recover)/(data.seconds-data.presentation.recover)));
}
export function abilitySourceTime(data,time){
 if(!data.ability)return time;
 const keys=data.presentation.keys;
 if(time<=0)return keys[0][1];
 for(let i=1;i<keys.length;i++)if(time<=keys[i][0]){
  const a=keys[i-1],b=keys[i],u=(time-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*u;
 }
 return keys[keys.length-1][1];
}
