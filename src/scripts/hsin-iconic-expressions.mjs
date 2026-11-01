import { SMILE_PROFILES, createFacialB1Director } from './hsin-face-b1.mjs';
import {ICONIC_PROFILES} from './hsin-iconic-profiles.mjs';
export const ALL_FACE_PROFILES=Object.freeze({...SMILE_PROFILES,...ICONIC_PROFILES});
const CONTEXTS={
 'Idle Allure':['S1','S1','I1','I2','S2'],
 'Curious Attention':['S2','S2','I4','I1'],
 'Coy Response':['S3','I2','I5'],
 'Warm Presence':['I3','S1','I1'],
 // Rare, softened state: low amplitude, sustained gaze (see calm hold in the attention director).
 'Quiet Intimacy':['I1','S1'],
};
// Minimum seconds before the autonomous calendar may choose a context again. Gesture cues bypass this.
const COOLDOWN=Object.freeze({'Coy Response':30,'Warm Presence':26,'Quiet Intimacy':75});
// Weighted, not forced: a present viewer raises the odds of Curious Attention but never locks it in.
// Magnetic presence (Idle Allure / Curious Attention) stays dominant; Coy and Quiet are the exceptions.
const SELECTION=Object.freeze({
 attended:[['Curious Attention',3],['Idle Allure',2.4],['Coy Response',.9],['Warm Presence',1.2],['Quiet Intimacy',.8]],
 alone:[['Idle Allure',3],['Coy Response',1.4],['Warm Presence',1.4],['Quiet Intimacy',.3]],
});
// A requested context may not cut the previous one shorter than this, so the face never flaps.
const MIN_CONTEXT_DWELL=5;
// A wink needs a smile that already supports it; below this the face reads as a stray twitch.
export const WINK_SUPPORT_SMILE=.28;
export function createAutoB1Director({seed=1,limits={}}={}){
 const manual=createFacialB1Director({seed,limits});let random=seed>>>0,time=0,next=0,context='Idle Allure',profile='S1',current={},body='gesture:release',lastManual=false,manualFrom={},manualElapsed=0,contextStarted=0,winkAttempted=false;
 let coyRequested=false,winkChance=.65,lastSmileR=0;const lastAt={};
 const rng=()=>{random=(Math.imul(1664525,random)+1013904223)>>>0;return random/4294967296;};
 const pick=a=>a[Math.floor(rng()*a.length)];
 const ready=name=>time-(lastAt[name]??-Infinity)>=(COOLDOWN[name]??0);
 const weighted=table=>{const open=table.filter(([name])=>ready(name)),total=open.reduce((n,[,w])=>n+w,0);let r=rng()*total;for(const [name,w] of open){r-=w;if(r<=0)return name;}return open[open.length-1][0];};
 const names=[...new Set(Object.values(ALL_FACE_PROFILES).flatMap(p=>Object.keys(p)).filter(n=>n!=='label'))];
 return {
  signal(event){
   if((event==='gesture:prepare'||event==='gesture:hold')&&body==='gesture:release'){
    context='Warm Presence';contextStarted=time;winkAttempted=false;lastAt['Warm Presence']=time;profile=profile==='I3'?'S1':'I3';next=Math.max(next,time+6);
   }
   body=event;manual.signal(event);
  },
  testProfile:(name,strength)=>manual.testProfile(name,strength),testMorph:(name,strength)=>manual.testMorph(name,strength),testBeat:kind=>manual.testBeat(kind),isLab:()=>manual.isLab(),
  /** Calm contexts ask the attention director to sustain eye contact for longer. */
  isCalm:()=>context==='Quiet Intimacy',
  /** True only while the current expression already supports a playful wink. */
  supportsWink:()=>!manual.isLab()&&context!=='Quiet Intimacy'&&context!=='Warm Presence'&&lastSmileR>=WINK_SUPPORT_SMILE,
  /** A due wink asks for a playful context instead of firing on a calm face. Deferred during body gestures. */
  requestCoy(){
   if(manual.isLab()||coyRequested||(context==='Coy Response'&&!winkAttempted))return false;
   coyRequested=true;
   // Calm and reverent contexts are never cut short: the request waits for them to end (both last well under the 25 s wink release).
   if(body==='gesture:release'&&context!=='Quiet Intimacy'&&context!=='Warm Presence')next=Math.min(next,Math.max(time+1.2,contextStarted+MIN_CONTEXT_DWELL));
   return true;
  },
  step(dt,options={}){
   time+=dt;
   if(manual.isLab()) {
    if(!lastManual){manualFrom={...current};manualElapsed=0;}
    const result=manual.step(dt,options);manualElapsed+=dt;
    const t=Math.min(1,manualElapsed/.4),blend=t*t*(3-2*t);
    const target={...result.overlays,M_Smile_R:result.smileR,M_Smile_L:result.smileL};
    const keys=new Set([...names,...Object.keys(target)]),mixed={};
    for(const n of keys)mixed[n]=(manualFrom[n]??0)+((target[n]??0)-(manualFrom[n]??0))*blend;
    current={...mixed};lastManual=true;
    const {M_Smile_R=0,M_Smile_L=0,...overlays}=mixed;
    return {...result,smileR:M_Smile_R,smileL:M_Smile_L,overlays};
   }
   if(lastManual){next=time+3;lastManual=false;}
   if(time>=next){
    const attended=!!(options.attending||options.recent);
    const desired=body==='gesture:hold'?'Warm Presence':coyRequested?'Coy Response':weighted(attended?SELECTION.attended:SELECTION.alone);
    const candidates=CONTEXTS[desired].filter(p=>p!==profile);
    winkChance=coyRequested&&desired==='Coy Response'?1:.65;if(desired==='Coy Response')coyRequested=false;
    context=desired;contextStarted=time;winkAttempted=false;lastAt[desired]=time;profile=pick(candidates.length?candidates:CONTEXTS[desired]);
    // Quiet Intimacy lingers; Coy Response is a brief provocation (smile builds, wink, recover); the rest keep 8-17 s.
    next=time+(desired==='Quiet Intimacy'?12+rng()*8:desired==='Coy Response'?6+rng()*4:8+rng()*9);
   }
   let wink=false;if(options.enabled&&context==='Coy Response'&&!winkAttempted&&time>=contextStarted+2.5){winkAttempted=true;wink=rng()<winkChance;}
   const weights=ALL_FACE_PROFILES[profile],amount=options.enabled?(options.intensity??.75)*(.88+.12*Math.sin(time*.17))*(context==='Quiet Intimacy'?.85:1):0;
   const alpha=1-Math.exp(-dt/1.15),out={};
   for(const n of names){const target=limits[n]>0?(weights[n]??0)*amount:0;current[n]=(current[n]??0)+(target-(current[n]??0))*alpha;out[n]=current[n];}
   const smileR=out.M_Smile_R??0,smileL=out.M_Smile_L??0;delete out.M_Smile_R;delete out.M_Smile_L;lastSmileR=smileR;
   return {smileR,smileL,overlays:out,isolated:false,authored:true,wink};
  },
  diagnostics:()=>({context,profile,next,time,started:contextStarted,coyRequested,calm:context==='Quiet Intimacy',manual:manual.diagnostics(),noseAutomatic:false}),
 };
}
