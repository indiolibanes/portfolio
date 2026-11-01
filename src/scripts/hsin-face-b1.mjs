import { createPresentationExpression } from './hsin-face-presentation.mjs';

/**
 * Pass B.1: visual candidates only. No private model data, renderer or DOM.
 * Larger weights bypass Pass B's conservative *automatic* caps only while
 * an explicit, isolated laboratory test owns the channels.
 */
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const FACE_B1_NAMES=new Set([
  'M_Smile_R','M_Smile_L','M_Squint_R','M_Squint_L','M_meow_R','M_meow_L',
  'E_Smile_R','E_Smile_L','E_Squint_R','E_Squint_L',
  'B_Cheerful_R','B_Cheerful_L','B_Up_Add_R','B_Up_Add_L',
  'P_Nose_Up','P_Nose_Down',
]);

export const SMILE_PROFILES=Object.freeze({
  S1:Object.freeze({label:'Subtle Smirk',M_Smile_R:.32,M_Smile_L:.06,M_Squint_R:.12,
    M_meow_R:.05,E_Smile_R:.12,E_Squint_R:.08,B_Up_Add_R:.19}),
  S2:Object.freeze({label:'Playful Smirk',M_Smile_R:.58,M_Smile_L:.14,M_Squint_R:.24,
    M_meow_R:.10,E_Smile_R:.23,E_Squint_R:.16,B_Up_Add_R:.34,B_Cheerful_R:.22}),
  S3:Object.freeze({label:'Signature Smile',M_Smile_R:.82,M_Smile_L:.23,M_Squint_R:.35,
    M_meow_R:.12,M_meow_L:.04,E_Smile_R:.30,E_Smile_L:.06,
    E_Squint_R:.20,E_Squint_L:.06,B_Up_Add_R:.43,B_Up_Add_L:.06,
    B_Cheerful_R:.34,B_Cheerful_L:.07}),
});

export function createFacialB1Director({seed=2,limits={}}={}) {
  const previous=createPresentationExpression({seed,limits});
  let clock=0,diagnostic=null;
  const allowed=name=>FACE_B1_NAMES.has(name)&&Number.isFinite(limits[name])&&limits[name]>0;
  function start(kind,name,strength=1) {
    if(diagnostic||previous.isLab()||!Number.isFinite(strength)||strength<=0)return false;
    if(kind==='morph'&&!allowed(name))return false;
    if(kind==='smile'&&(!SMILE_PROFILES[name]||!['M_Smile_R','M_Smile_L'].some(allowed)))return false;
    diagnostic={kind,name,start:clock,strength:clamp(strength),duration:2.1};
    return true;
  }
  return {
    signal:event=>previous.signal(event),
    testProfile:(name,strength=1)=>start('smile',name,strength),
    testMorph:(name,strength=1)=>start('morph',name,strength),
    testBeat:kind=>!diagnostic&&previous.testBeat(kind),
    isLab:()=>!!diagnostic||previous.isLab(),
    step(dt,options={}) {
      clock+=dt;
      const base=previous.step(dt,diagnostic?{...options,enabled:false}:options);
      if(!diagnostic)return {...base,diagnostic:false};
      const {kind,name,start:began,strength,duration}=diagnostic;
      const t=clock-began;
      const envelope=t<.55?ease(t/.55):t<1.25?1:1-ease((t-1.25)/.85);
      const amount=clamp(envelope*strength*(options.intensity??1));
      const weights=kind==='smile'?SMILE_PROFILES[name]:{[name]:1};
      const overlays={};let smileR=0,smileL=0;
      for(const [channel,weight] of Object.entries(weights)) {
        if(channel==='label'||!allowed(channel))continue;
        const influence=clamp(amount*weight);
        if(channel==='M_Smile_R')smileR=influence;
        else if(channel==='M_Smile_L')smileL=influence;
        else overlays[channel]=influence;
      }
      if(t>=duration)diagnostic=null;
      return {smileR,smileL,overlays,isolated:true,diagnostic:true,wink:false};
    },
    diagnostics:()=>({clock,diagnostic:diagnostic?{...diagnostic}:null,baseline:previous.diagnostics(),
      candidateProfiles:Object.keys(SMILE_PROFILES),noseAutomatic:false}),
  };
}
