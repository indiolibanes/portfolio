/** F1.4.1 shot-three replacement only. Hand/butterfly shots and their two cut times remain F2.
 * Elevated oblique composition is owner-requested, not a claim of original game camera. */
import {FIDELITY_SHOTS} from './fidelity-camera.mjs';
export function elevatedLiberationFrame(frame,time,ctx){
 const seg=ctx.plan?.schedule?.segments?.find(s=>s.id==='SK_BURST_02_ORIGINAL'),A=ctx.rig?.anchors,front=ctx.rig?.front;
 if(ctx.reduced||!seg||!A||!front||time-seg.start<FIDELITY_SHOTS[2].from||time>=seg.end)return frame;
 const h=ctx.h,aspect=ctx.aspect,target=[A.pel[0],A.head[1]-.24*h,A.pel[2]],theta=Math.PI/6,fl=Math.hypot(front[0],front[2]);if(!(h>0&&fl>.001))return frame;
 const fx=front[0]/fl,fz=front[2]/fl,dx=fx*Math.cos(theta)+fz*Math.sin(theta),dz=fz*Math.cos(theta)-fx*Math.sin(theta);
 const fov=aspect<1?38:34,vf=fov*Math.PI/180,hf=2*Math.atan(Math.tan(vf/2)*aspect),fit=Math.min(vf,hf);
 const points=[A.head,A.rh,A.lh,A.pel,[A.head[0],A.head[1]+.12*h,A.head[2]]];
 const radius=Math.max(...points.map(p=>Math.hypot(...p.map((x,i)=>x-target[i]))))+.10*h;
 // Sphere-fit bound, independent of aspect. Pitch may increase to keep eye line below camera.
 let dist=Math.max(.85*h,radius/Math.sin(fit/2));const pitch=Math.max(35*Math.PI/180,Math.asin(Math.min(.766,(A.head[1]+.05*h-target[1])/dist)));
 return {...frame,position:[target[0]+dx*dist*Math.cos(pitch),target[1]+dist*Math.sin(pitch),target[2]+dz*dist*Math.cos(pitch)],target,fov,cut:true,phase:'F141_ELEVATED_PROTAGONIST',preset:'f141-elevated-liberation',evidence:'OWNER_COMPOSITION_VISUAL_CANDIDATE'};
}
