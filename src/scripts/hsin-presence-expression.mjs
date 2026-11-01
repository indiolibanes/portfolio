import {createAutoB1Director} from './hsin-iconic-expressions.mjs';
const ease=t=>{t=Math.max(0,Math.min(1,t));return Math.max(0,Math.min(1,t*t*t*(t*(t*6-15)+10)));};
/** Adds neutral breathing room and sided smiles to the existing B.1 composer.
 * No new morphs or larger limits. Manual comparisons keep the original B.1 output. */
export function createPresenceExpression({seed=1,limits={}}={}){
 const base=createAutoB1Director({seed,limits});let random=(seed^0x8e31)>>>0,time=0,phase='neutral',elapsed=0;
 const rng=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 const range=(a,b)=>a+(b-a)*rng();
 let neutral=range(5,9),hold=3,side='R',lastSide='',streak=0,lastSupport=0,body=false,intent='Neutral Presence';
 let lastOutput={smileR:0,smileL:0,overlays:{}},wasManual=false,blendElapsed=1,blendFrom=lastOutput;
 const mix=(target,progress)=>{const a=ease(progress),keys=new Set([...Object.keys(blendFrom.overlays),...Object.keys(target.overlays)]),overlays={};for(const n of keys)overlays[n]=(blendFrom.overlays[n]??0)+((target.overlays[n]??0)-(blendFrom.overlays[n]??0))*a;return {...target,smileR:blendFrom.smileR+(target.smileR-blendFrom.smileR)*a,smileL:blendFrom.smileL+(target.smileL-blendFrom.smileL)*a,overlays};};
 const swap=name=>name.endsWith('_R')?name.slice(0,-2)+'_L':name.endsWith('_L')?name.slice(0,-2)+'_R':name;
 const begin=options=>{phase='entry';elapsed=0;hold=range(2.8,4.8);side=streak>=2?(lastSide==='R'?'L':'R'):(rng()<.55?'R':'L');streak=side===lastSide?streak+1:1;lastSide=side;
  const choice=rng();intent=body?'Warm Presence':options.attending?(choice<.4?'Curious Attention':choice<.7?'Subtle Smirk':'Seductive Gaze'):(choice<.35?'Seductive Gaze':'Subtle Smirk');};
 return {
  signal(event){body=event!=='gesture:release';base.signal(event);if(body&&phase==='neutral')elapsed=Math.max(elapsed,neutral-.8);},
  testProfile:base.testProfile,testMorph:base.testMorph,testBeat:base.testBeat,isLab:base.isLab,
  isCalm:()=>intent==='Curious Attention'||base.isCalm(),
  preferredWinkSide:()=>side,
  supportsWink:()=>!base.isLab()&&!body&&lastSupport>=.12&&phase==='hold',
  requestCoy(){if(body||base.isLab())return false;return base.requestCoy();},
  step(dt,options={}){
   if(!Number.isFinite(dt)||dt<0)throw Error('Presence dt must be finite and nonnegative.');
   time+=dt;const result=base.step(dt,options);
   if(base.isLab()||result.isolated){if(!wasManual){blendFrom=lastOutput;blendElapsed=0;}wasManual=true;blendElapsed+=dt;lastSupport=0;lastOutput=mix(result,blendElapsed/.4);return lastOutput;}
   if(wasManual){wasManual=false;blendFrom=lastOutput;blendElapsed=0;}else blendElapsed+=dt;
   elapsed+=dt;
   if(phase==='neutral'&&elapsed>=neutral)begin(options);
   else if(phase==='entry'&&elapsed>=1.6){phase='hold';elapsed=0;}
   else if(phase==='hold'&&elapsed>=hold){phase='exit';elapsed=0;}
   else if(phase==='exit'&&elapsed>=2){phase='neutral';elapsed=0;neutral=range(5,11);intent='Neutral Presence';}
   const envelope=phase==='neutral'?0:phase==='entry'?ease(elapsed/1.6):phase==='hold'?1:1-ease(elapsed/2);
   // Preserve authored channel ratios and lids. Returning to neutral removes only our overlays.
   const amount=envelope*.72,out={};
   for(const [name,value]of Object.entries({...result.overlays,M_Smile_R:result.smileR,M_Smile_L:result.smileL})){
    const dest=side==='L'?swap(name):name;out[dest]=limits[dest]>0?Math.min(value*amount,dest.startsWith('M_Smile_')?(intent==='Seductive Gaze'?.30:.24):1):0;
   }
   if(intent==='Seductive Gaze')for(const suffix of ['R','L']){const n='E_Squint_'+suffix;out[n]=Math.max(out[n]??0,(limits[n]??0)*.45*envelope*(options.intensity??.75));}
   const {M_Smile_R=0,M_Smile_L=0,...overlays}=out;
   lastSupport=Math.max(M_Smile_R,M_Smile_L);
   const target={...result,smileR:M_Smile_R,smileL:M_Smile_L,overlays,wink:result.wink&&phase==='hold'};lastOutput=blendElapsed<.7?mix(target,blendElapsed/.7):target;return lastOutput;
  },
  diagnostics:()=>({...base.diagnostics(),presence:{phase,intent,side,time,elapsed,neutral,hold},context:body?'Warm Presence':intent}),
 };
}
