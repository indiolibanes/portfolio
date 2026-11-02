/** Screen-space safety policy. No DOM, geometry, renderer, timer or per-frame allocations. */
const area=(a,b)=>b?Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)):0;
export function choosePavilionAnchor({width,height,panelWidth,panelHeight,paddingX=0,paddingTop=0,paddingBottom=0,preferred='right',onlySide=null,face=null,hands=[],moon=null,character=null,controls=null}){
 const margin=Math.max(28,paddingX+12),ph=panelHeight,pw=panelWidth,candidates=[];
 for(const side of onlySide?[onlySide]:[preferred,preferred==='right'?'left':'right'])for(const ratio of [.5,.66,.34]){
  const x=side==='left'?margin:width-margin-pw,y=Math.max(Math.max(82,paddingTop+20),Math.min(height-ph-paddingBottom-20,height*ratio-ph/2));
  const box={x:x-paddingX,y:y-paddingTop,w:pw+paddingX*2,h:ph+paddingTop+paddingBottom},hard=area(box,face)*100+hands.reduce((n,h)=>n+area(box,h)*35,0)+area(box,controls)*50;
  const score=hard+area(box,moon)*.8+area(box,character)*.02+(side===preferred?0:1400);
  candidates.push({x:x+pw/2,y:y+ph/2,side,score,hard});
 }
 candidates.sort((a,b)=>a.score-b.score);return candidates[0];
}
export function createPavilionMotion(){
 const out={x:0,y:0,vx:0,vy:0,tilt:0,side:'right',moving:false,constrained:false};
 let initialized=false,targetX=0,targetY=0,lastSwitch=-Infinity,pending=null,pendingAt=0,locked=false,route=0,routeY=0,finalX=0,finalY=0,lastPreferred=null,manualInProgress=false;
 function damp(axis,velocity,target,dt){
  const before=out[axis],delta=target-before,acceleration=64*delta-16*out[velocity];
  out[velocity]=Math.max(-380,Math.min(380,out[velocity]+acceleration*dt));out[axis]+=out[velocity]*dt;
  if(delta*(target-out[axis])<0){out[axis]=target;out[velocity]=0;}
 }
 return {
  retarget(input,{now=0,interacting=false,reduced=false}={}){
   let next=choosePavilionAnchor(input);const preferenceChanged=lastPreferred!==null&&lastPreferred!==input.preferred;lastPreferred=input.preferred;
   const manual=preferenceChanged&&next.side===input.preferred;
   if(manual)manualInProgress=true;locked=interacting&&!manualInProgress;out.constrained=next.hard>0;
   if(!initialized){out.x=targetX=next.x;out.y=targetY=next.y;out.side=next.side;initialized=true;}
   if(locked)return out;
   if(next.side===out.side)pending=null;
   if(next.side!==out.side&&!manual){
    if(pending!==next.side){pending=next.side;pendingAt=now;}
    if(now-pendingAt<.8||now-lastSwitch<2)return out;
   }
   if(next.side!==out.side&&!reduced){
    const protectedRects=[input.face,...(input.hands??[])].filter(Boolean),top=Math.min(...protectedRects.map(r=>r.y)),bottom=Math.max(...protectedRects.map(r=>r.y+r.h));
    const lower=input.height-input.panelHeight/2-(input.paddingBottom??0)-24,upper=Math.max(82,(input.paddingTop??0)+20)+input.panelHeight/2;
    if(lower-input.panelHeight/2-(input.paddingTop??0)>bottom+12)routeY=lower;
    else if(upper+input.panelHeight/2+(input.paddingBottom??0)<top-12)routeY=upper;
    else if(!manual){next=choosePavilionAnchor({...input,onlySide:out.side});out.constrained=true;}
    else routeY=lower; // Explicit manual move in a constrained frame; still protect the face via the lower lane.
    if(next.side!==out.side){route=1;targetX=out.x;targetY=routeY;}
   }
   if(next.side!==out.side){lastSwitch=now;pending=null;}
   out.side=next.side;finalX=next.x;finalY=next.y;if(!route){targetX=next.x;targetY=next.y;}out.constrained=out.constrained||next.hard>0;
   if(reduced){route=0;targetX=finalX;targetY=finalY;out.x=targetX;out.y=targetY;out.vx=out.vy=0;}return out;
  },
  advance(dt,reduced=false){
   dt=Math.min(.05,Math.max(0,dt));
   if(locked){out.vx=out.vy=0;out.moving=false;return out;}
   if(!reduced){damp('x','vx',targetX,dt);damp('y','vy',targetY,dt);}
   if(route&&Math.abs(targetX-out.x)+Math.abs(targetY-out.y)<2){if(route===1){route=2;targetX=finalX;targetY=routeY;}else{route=0;targetX=finalX;targetY=finalY;}}
   out.moving=Math.abs(targetX-out.x)+Math.abs(targetY-out.y)>.25||Math.abs(out.vx)+Math.abs(out.vy)>.5;
   if(!out.moving&&!route)manualInProgress=false;
   out.tilt=reduced?0:Math.max(-.035,Math.min(.035,-out.vx*.0001));return out;
  },setInteracting(value){locked=value&&!manualInProgress;},sample:()=>out,
 };
}
