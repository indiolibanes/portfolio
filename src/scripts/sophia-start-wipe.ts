import {startWipeScale,startWipeFrames} from './sophia-immersive-r3-timeline.mjs';
export function createStartWipe(intro:HTMLElement,word:HTMLElement,reduced:()=>boolean) {
 let animation:Animation|null=null,clone:HTMLElement|null=null,veil:HTMLElement|null=null,disposed=false;
 function clear(){animation?.cancel();animation=null;clone?.remove();clone=null;veil?.remove();veil=null;}
 return {async play(){clear();if(disposed)return;const rect=word.getBoundingClientRect();
  veil=document.createElement('div');veil.setAttribute('aria-hidden','true');veil.dataset.startVeil='';Object.assign(veil.style,{position:'fixed',inset:'0',zIndex:'40',background:'#000',pointerEvents:'none'});document.body.append(veil);
  clone=word.cloneNode(false) as HTMLElement;clone.textContent='START';clone.setAttribute('aria-hidden','true');clone.dataset.startWipe='';const style=getComputedStyle(word);
  Object.assign(clone.style,{position:'fixed',left:rect.left+rect.width/2+'px',top:rect.top+rect.height/2+'px',font:style.font,color:style.color,letterSpacing:style.letterSpacing,lineHeight:style.lineHeight,whiteSpace:'nowrap',zIndex:'41',pointerEvents:'none',transformOrigin:'center center',textShadow:style.textShadow});document.body.append(clone);intro.classList.add('is-starting');
  const scale=startWipeScale(rect.width,rect.height,innerWidth,innerHeight),duration=reduced()?300:950;
  const transform=(angle:number,k:number)=>`translate3d(-50%,-50%,0) rotateZ(${angle}deg) scale(${k})`;
  animation=clone.animate(reduced()?[{transform:transform(0,1),opacity:1},{transform:transform(0,1.5),opacity:0}]:startWipeFrames(scale).map(f=>({transform:transform(f.angle,f.scale),opacity:f.opacity,offset:f.offset})),{duration,easing:reduced()?'ease-in':'linear',fill:'forwards'});
  try{await animation.finished;}catch{}clone?.remove();clone=null;
 },reveal(){if(disposed)return;intro.classList.add('is-started');const v=veil;veil=null;if(v){const fade=v.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'});fade.finished.finally(()=>v.remove()).catch(()=>v.remove());}animation=null;},dispose(){disposed=true;clear();intro.classList.remove('is-starting','is-started');}};
}
