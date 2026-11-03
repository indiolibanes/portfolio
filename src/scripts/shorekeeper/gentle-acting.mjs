import {EXPRESSION_LIBRARY,EXPRESSION_MORPHS,expressionId,expressionSupport} from './expression-library.mjs';
export const GENTLE_MORPHS=EXPRESSION_MORPHS;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** The single facial writer. Expression and bilateral blink have explicit bounded composition. */
export function createGentleFace(inspection){
 const names=GENTLE_MORPHS.filter(n=>inspection.names.includes(n)),base=Object.fromEntries(names.map(n=>[n,0]));
 let current='neutral',phase='idle',from={...base},target={},elapsed=0,timing=null,paused=false,intensity=1,blink=null,weights={...base},source='manual';
 const support=id=>expressionSupport(names,id);
 function write(){weights={...base};for(const [a,b]of [['Pupil_L','Pupil_R'],['Pupil_Up','Pupil_Down']]){const signed=(weights[a]??0)-(weights[b]??0);if(a in weights)weights[a]=Math.max(0,signed);if(b in weights)weights[b]=Math.max(0,-signed);}const closure=blink?.value??0;if(names.includes('E_Close'))weights.E_Close=Math.max(base.E_Close??0,closure);for(const n of ['E_Smile_L','E_Smile_R'])if(n in weights)weights[n]*=1-closure;
  if(inspection.setMorphs)inspection.setMorphs(weights);else for(const n of names)inspection.setMorph(n,weights[n]);
 }
 function recover(){from={...base};target={};phase='exit';elapsed=0;}
 function advanceExpression(dt){let remaining=dt;for(let transitions=0;transitions<4&&phase!=='idle';transitions++){
  const duration=phase==='entry'?timing.enter:phase==='hold'?timing.hold:timing.exit,step=Math.min(remaining,Math.max(0,duration-elapsed));elapsed+=step;remaining-=step;
  if(phase!=='hold'){const k=smooth(duration?elapsed/duration:1);for(const n of names){let curve=k;if(phase==='entry'&&['PERFECT_GLANCE','HELLO'].includes(expressionId(current))&&!n.startsWith('Pupil_'))curve=smooth((elapsed/timing.enter-.25)/.75);base[n]=from[n]+((target[n]??0)-from[n])*curve;}}
  if(elapsed+1e-10<duration)break;
  if(phase==='entry'){phase='hold';elapsed=0;}else if(phase==='hold')recover();else{phase='idle';current='neutral';for(const n of names)base[n]=0;}
  if(remaining<=0)break;
 }}
 return {
  support,
  trigger(name,{automatic=false}={}){if(name==='blink'){if(!names.includes('E_Close'))return false;blink={clock:0,value:0};return true;}const id=expressionId(name),p=EXPRESSION_LIBRARY[id];if(!p)throw Error('Expressão desconhecida');if(!support(id).available)return false;if(automatic&&phase!=='idle')return false;
   current=name;source=automatic?'automatic':'manual';timing=name==='neutral'?{...p,exit:.65}:p;from={...base};target=Object.fromEntries(names.map(n=>[n,(p.weights[n]??0)*intensity]));elapsed=0;phase=id==='RETURN_TO_BASE'?'exit':'entry';return true;
  },
  setIntensity(v){if(!Number.isFinite(v)||v<.25||v>1)throw Error('Intensidade fora de 0,25–1');intensity=v;},
  advance(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid dt');if(paused||!dt)return;advanceExpression(dt);if(blink){blink.clock+=dt;const t=blink.clock;blink.value=t<.13?smooth(t/.13):t<.21?1:1-smooth((t-.21)/.20);if(t>=.41)blink=null;}write();},
  setPaused(v){paused=!!v;},
  reset(){for(const n of names)base[n]=0;current='neutral';phase='idle';blink=null;write();},
  get state(){return {expression:current,id:expressionId(current),phase,returning:phase==='exit',busy:phase!=='idle'||!!blink,paused,intensity,source,blink:blink?.value??0,weights:{...weights},available:[...names],missing:GENTLE_MORPHS.filter(n=>!names.includes(n))};}
 };
}
/** Uses original-director events and the central frame clock; never owns a mixer. */
export function createContemplativeScheduler({available,start,face,random=Math.random}){
 let enabled=false,paused=false,reduced=false,rest=0,blink=1.2,expression=3.2,last='',lastExpression='',active=false,events=[];
 const rng=()=>{const value=random();return Number.isFinite(value)?Math.max(0,Math.min(.999999,value)):0;},wait=(a,b)=>a+(b-a)*rng();
 function chooseExpression(){const rows=Object.entries(EXPRESSION_LIBRARY).filter(([id,p])=>p.automatic>0&&id!==lastExpression&&face.support(id).available),total=rows.reduce((n,[,p])=>n+p.automatic,0);let draw=rng()*total;for(const [id,p]of rows){draw-=p.automatic;if(draw<0)return id;}return rows[0]?.[0];}
 return {
  setEnabled(v){enabled=!!v;rest=wait(12,24);},setPaused(v){paused=!!v;},setReducedMotion(v){reduced=!!v;},
  onEvent(e){if(!['start','execution','recovery','end'].includes(e.type))return;events.push(e.type);if(events.length>12)events.shift();if(e.type==='start'){active=true;if(available().includes(e.clip))last=e.clip;}if(e.type==='end'){active=false;rest=wait(18,38);}},
  advance(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid dt');if(paused||!dt)return;face.advance(dt);if(reduced||!enabled)return;
   blink-=dt;expression-=dt;if(blink<=0){face.trigger('blink',{automatic:true});blink=wait(4,8);}if(expression<=0&&!face.state.busy){const id=chooseExpression();if(id&&face.trigger(id,{automatic:true})){lastExpression=id;expression=wait(9,17);}else expression=2;}
   if(!active){rest-=dt;if(rest<=0){const ids=available(),options=ids.filter(x=>x!==last),candidates=options.length?options:ids;if(candidates.length){const id=candidates[Math.floor(rng()*candidates.length)];if(start(id)!==false){last=id;active=true;}}rest=wait(18,38);}}
  },
  get state(){return {enabled,paused,reduced,active,last,lastExpression,rest,events:[...events]};}
 };
}
