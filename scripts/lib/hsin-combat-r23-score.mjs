/** R2.3 authoring only. Reuses R2.1 hand intentions and its corrected elbow planes.
 * Explicit rest/entry, strike, outward lowering, guard and rest; no runtime clock slicing. */
import {torso as originalTorso,createArmScore as originalArms,pchip,TORSO_FIELDS,createSecondary} from './hsin-combat-r21-score.mjs';
export {createSecondary};
export const smooth=u=>{u=Math.max(0,Math.min(1,u));return u*u*u*(u*(u*6-15)+10);};
export const CLIPS=Object.freeze({
 basic01:{seconds:4.2,start:0,end:2.48,activeEnd:2.22,recover:2.55,keys:[[0,0],[.7,1.2],[1.08,1.55],[1.42,1.84],[1.7,2.08],[1.88,2.24],[2.22,2.48]],markers:[['energy',.46],['trail',1.37],['arc',1.84]],phase:'BASIC'},
 basic02:{seconds:3.8,start:2.54,end:3.62,activeEnd:1.85,recover:2.2,keys:[[0,2.54],[.8,2.72],[1.04,2.92],[1.34,3.2],[1.52,3.36],[1.85,3.62]],markers:[['trail-left',.87],['arc-left',1.48]],phase:'BASIC'},
 combo:{seconds:5.5,start:0,end:3.62,activeEnd:3.55,recover:3.9,keys:[[0,0],[.7,1.2],[1.08,1.55],[1.42,1.84],[1.7,2.08],[1.88,2.24],[2.22,2.48],[2.55,2.72],[2.79,2.92],[3.09,3.2],[3.27,3.36],[3.55,3.62]],markers:[['energy',.46],['trail',1.37],['arc',1.84],['trail-left',2.62],['arc-left',3.23]],phase:'BASIC'},
 skill:{seconds:6.1,start:3.9,end:6.0,activeEnd:3.8,recover:4.0,keys:[[0,3.9],[1.5,3.95],[1.9,4.15],[2.4,4.65],[2.75,5],[2.95,5.2],[3.2,5.45],[3.6,5.85],[3.8,6]],markers:[['charge',1.5],['ring',3.2],['recovery',3.8]],phase:'SKILL'},
});
const mix=(a,b,w)=>({to:a.to.map((v,i)=>v+(b.to[i]-v)*w),pole:a.pole.map((v,i)=>v+(b.pole[i]-v)*w),palm:a.palm.map((v,i)=>v+(b.palm[i]-v)*w),ext:a.ext+(b.ext-a.ext)*w});
export function createScore(id,{restIntent,halfWidth}){
 const c=CLIPS[id];if(!c)throw Error('Unknown ability '+id);
 const original=originalArms({restIntent,halfWidth}),xs=c.keys.map(k=>k[0]),ys=c.keys.map(k=>k[1]);
 const source=t=>pchip(xs,ys,Math.min(c.activeEnd,t));
 const entry=id==='basic02'?.8:id==='skill'?1.5:0;
 const last=originalTorso(c.end),lastArm=Object.fromEntries(['R','L'].map(s=>[s,original.intent(s,c.end)]));
 function torso(t,out={}){
  originalTorso(source(t),out);
  const enter=entry?smooth(t/entry):1,leave=smooth((t-c.activeEnd)/(c.seconds-c.activeEnd));
  for(const field of TORSO_FIELDS)out[field]*=enter*(1-leave);
  // B01 keeps the thorax turning briefly after reach, then lowers through guard. No marker moved to an early speed peak.
  if((id==='basic01'||id==='combo')&&t>1.88&&t<2.22)out.yaw+=1.8*Math.sin(Math.PI*(t-1.88)/.34)**2;
  if(t===0||t===c.seconds)for(const f of TORSO_FIELDS)out[f]=0;
  return out;
 }
 function intent(side,t){
  let it=original.intent(side,source(t));
  if(side==='L'&&(id==='basic02'||id==='combo')){
   const at=source(t),read=smooth((at-2.9)/.3)*(1-smooth((at-3.36)/.26));
   it={...it,to:[it.to[0]+.025*read,it.to[1]-.015*read,it.to[2]]};
  }
  if(entry)it=mix(restIntent[side],it,smooth(t/entry));
  if(t>c.activeEnd){
   // A separate down/out path before rest, rather than playing the attack backwards.
   const guard={to:[.12,-.25,.17],pole:[.55,-.70,-.35],palm:[-.65,-.6,.2],ext:0};
   const split=c.activeEnd+.48;
   it=t<split?mix(lastArm[side],guard,smooth((t-c.activeEnd)/.48)):mix(guard,restIntent[side],smooth((t-split)/(c.seconds-split)));
  }
  return it;
 }
 return {...c,source,torso,intent,armWeight:t=>smooth(t/.85)*(1-smooth((t-(c.seconds-.6))/.6)),sequence:{seconds:c.seconds,phases:[['PREPARATION',0],[c.phase,entry||.7],['RECOVERY',c.recover],['COMPLETE',c.seconds]],markers:c.markers}};
}
