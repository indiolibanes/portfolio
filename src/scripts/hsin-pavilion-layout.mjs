/** Screen-space safety policy. No DOM, geometry, renderer, timer or per-frame allocations. */
const area=(a,b)=>b?Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)):0;
export function choosePavilionAnchor({width,height,panelWidth,panelHeight,preferred='right',face=null,hands=[],moon=null,character=null,controls=null}){
 const margin=28,ph=panelHeight,pw=panelWidth,candidates=[];
 for(const side of [preferred,preferred==='right'?'left':'right'])for(const ratio of [.5,.66,.34]){
  const x=side==='left'?margin:width-margin-pw,y=Math.max(82,Math.min(height-ph-24,height*ratio-ph/2));
  const box={x,y,w:pw,h:ph},hard=area(box,face)*100+hands.reduce((n,h)=>n+area(box,h)*35,0)+area(box,controls)*50;
  const score=hard+area(box,moon)*.8+area(box,character)*.02+(side===preferred?0:1400);
  candidates.push({x:x+pw/2,y:y+ph/2,side,score,hard});
 }
 candidates.sort((a,b)=>a.score-b.score);return candidates[0];
}
export function createPavilionMotion(){
 const out={x:0,y:0,vx:0,vy:0,tilt:0,side:'right',moving:false,constrained:false};
 let initialized=false,targetX=0,targetY=0,lastSwitch=-Infinity,pending=null,pendingAt=0;
 function damp(axis,velocity,target,dt){
  const before=out[axis],delta=target-before,acceleration=64*delta-16*out[velocity];
  out[velocity]=Math.max(-380,Math.min(380,out[velocity]+acceleration*dt));out[axis]+=out[velocity]*dt;
  if(delta*(target-out[axis])<0){out[axis]=target;out[velocity]=0;}
 }
 return {
  retarget(input,{now=0,interacting=false,reduced=false}={}){
   const next=choosePavilionAnchor(input);
   if(!initialized){out.x=targetX=next.x;out.y=targetY=next.y;out.side=next.side;initialized=true;}
   if(interacting)return out;
   const manual=next.side===input.preferred;
   if(next.side!==out.side&&!manual){
    if(pending!==next.side){pending=next.side;pendingAt=now;}
    if(now-pendingAt<.8||now-lastSwitch<2)return out;
   }
   if(next.side!==out.side){lastSwitch=now;pending=null;}
   out.side=next.side;targetX=next.x;targetY=next.y;out.constrained=next.hard>0;
   if(reduced){out.x=targetX;out.y=targetY;out.vx=out.vy=0;}return out;
  },
  advance(dt,reduced=false){
   dt=Math.min(.05,Math.max(0,dt));
   if(!reduced){damp('x','vx',targetX,dt);damp('y','vy',targetY,dt);}
   out.moving=Math.abs(targetX-out.x)+Math.abs(targetY-out.y)>.25||Math.abs(out.vx)+Math.abs(out.vy)>.5;
   out.tilt=reduced?0:Math.max(-.035,Math.min(.035,-out.vx*.0001));return out;
  },sample:()=>out,
 };
}
