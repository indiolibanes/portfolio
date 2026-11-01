import { SMILE_PROFILES, createFacialB1Director } from './hsin-face-b1.mjs';
import {ICONIC_PROFILES} from './hsin-iconic-profiles.mjs';
export const ALL_FACE_PROFILES=Object.freeze({...SMILE_PROFILES,...ICONIC_PROFILES});
const CONTEXTS={
 'Idle Allure':['S1','S1','I1','I2','S2'],
 'Curious Attention':['S2','S2','I4','I1'],
 'Coy Response':['S3','I2','I5'],
 'Warm Presence':['I3','S1','I1'],
};
export function createAutoB1Director({seed=1,limits={}}={}){
 const manual=createFacialB1Director({seed,limits});let random=seed>>>0,time=0,next=0,context='Idle Allure',profile='S1',current={},body='gesture:release',lastManual=false;
 const rng=()=>{random=(Math.imul(1664525,random)+1013904223)>>>0;return random/4294967296;};
 const pick=a=>a[Math.floor(rng()*a.length)];
 const names=[...new Set(Object.values(ALL_FACE_PROFILES).flatMap(p=>Object.keys(p)).filter(n=>n!=='label'))];
 return {
  signal(event){body=event;manual.signal(event);},
  testProfile:(name,strength)=>manual.testProfile(name,strength),testMorph:(name,strength)=>manual.testMorph(name,strength),testBeat:kind=>manual.testBeat(kind),isLab:()=>manual.isLab(),
  step(dt,options={}){
   time+=dt;
   if(manual.isLab()) {lastManual=true;return manual.step(dt,options);}
   if(lastManual){current={};next=time+3;lastManual=false;}
   if(time>=next){
    const desired=body==='gesture:hold'?'Warm Presence':options.attending?'Curious Attention':pick(['Idle Allure','Idle Allure','Coy Response','Warm Presence']);
    const candidates=CONTEXTS[desired].filter(p=>p!==profile);context=desired;profile=pick(candidates.length?candidates:CONTEXTS[desired]);next=time+8+rng()*9;
   }
   const weights=ALL_FACE_PROFILES[profile],amount=options.enabled?(options.intensity??.75)*(.88+.12*Math.sin(time*.17)):0;
   const alpha=1-Math.exp(-dt/1.15),out={};
   for(const n of names){const target=limits[n]>0?(weights[n]??0)*amount:0;current[n]=(current[n]??0)+(target-(current[n]??0))*alpha;out[n]=current[n];}
   const smileR=out.M_Smile_R??0,smileL=out.M_Smile_L??0;delete out.M_Smile_R;delete out.M_Smile_L;
   return {smileR,smileL,overlays:out,isolated:false,authored:true,wink:false};
  },
  diagnostics:()=>({context,profile,next,time,manual:manual.diagnostics(),noseAutomatic:false}),
 };
}
