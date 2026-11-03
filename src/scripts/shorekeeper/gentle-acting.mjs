/** Morph-only acting: no bones, mixers, or source clips are touched. */
export const GENTLE_MORPHS = ['E_Close','E_Smile_L','E_Smile_R','M_Smile_L','M_Smile_R','B_Happy','E_Focus','Pupil_L','Pupil_R','Pupil_Up','Pupil_Down'];
// Candidate weights are visual hypotheses, not approved captures of the game cutscene.
const PRESETS={
 neutral:{},
 smile:{E_Smile_L:.28,E_Smile_R:.31,M_Smile_L:.43,M_Smile_R:.48,B_Happy:.16},
 myStar:{E_Smile_L:.34,E_Smile_R:.38,M_Smile_L:.58,M_Smile_R:.63,B_Happy:.23,E_Focus:.14,Pupil_R:.12},
 look:{Pupil_L:.21,E_Focus:.14},
 wonder:{E_Focus:.25,Pupil_Up:.16,B_Happy:.08},
 blink:{E_Close:1}
};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function createGentleFace(inspection){
 const names=GENTLE_MORPHS.filter(n=>inspection.names.includes(n)), weights=Object.fromEntries(names.map(n=>[n,0]));
 let current='neutral',from={...weights},target={},elapsed=0,duration=.5,hold=0,returning=false,paused=false;
 function apply(){if(inspection.setMorphs)inspection.setMorphs(weights);else for(const n of names)inspection.setMorph(n,weights[n]);}
 function transition(name,seconds,holdSeconds=0){if(!PRESETS[name])throw Error('Expressão desconhecida');from={...weights};target=PRESETS[name];elapsed=0;duration=seconds;hold=holdSeconds;current=name;returning=name==='neutral'&&Object.values(weights).some(v=>v>1e-8);}
 return {
  trigger(name){if(name==='blink')transition(name,.13,.08);else if(name==='neutral')transition(name,.65);else if(name==='myStar')transition(name,.65,1.5);else if(name==='wonder')transition(name,.55,1.2);else transition(name,.65,1.5);},
  advance(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid dt');if(paused||!dt)return;elapsed+=dt;const k=smooth(elapsed/duration);for(const n of names)weights[n]=from[n]+((target[n]??0)-from[n])*k;apply();if(current==='neutral'&&elapsed>=duration)returning=false;if(elapsed>=duration&&current!=='neutral'){if(elapsed>=duration+hold){const old=current;transition('neutral',old==='blink'?.2:.8);returning=true;}}},
  setPaused(value){paused=!!value;},
  reset(){for(const n of names)weights[n]=0;current='neutral';target={};from={...weights};elapsed=0;returning=false;apply();},
  get state(){return {expression:current,returning,paused,weights:{...weights},available:[...names],missing:GENTLE_MORPHS.filter(n=>!names.includes(n))};}
 };
}
/** Timers are advanced by the studio's single frame loop; actions start only after end. */
export function createContemplativeScheduler({available,start,face,random=Math.random}){
 let enabled=false,paused=false,reduced=false,rest=0,blink=1.2,expression=3.2,last='',active=false,events=[];
 const wait=(a,b)=>a+(b-a)*Math.max(0,Math.min(.999999,random()));
 return {
  setEnabled(v){enabled=!!v;rest=wait(12,24);},setPaused(v){paused=!!v;},setReducedMotion(v){reduced=!!v;},
  onEvent(e){if(!['start','execution','recovery','end'].includes(e.type))return;events.push(e.type);if(events.length>12)events.shift();if(e.type==='start')active=true;if(e.type==='end'){active=false;rest=wait(18,38);}},
  advance(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid dt');if(paused||!dt)return;face.advance(dt);if(reduced||!enabled)return;
   blink-=dt;expression-=dt;if(blink<=0){face.trigger('blink');blink=wait(4,8);}else if(expression<=0){face.trigger((()=>{const r=random();return r<.38?'myStar':r<.67?'smile':r<.86?'look':'wonder';})());expression=wait(9,17);}
   if(!active){rest-=dt;if(rest<=0){const options=available().filter(x=>x!==last);const candidates=options.length?options:available();if(candidates.length){const id=candidates[Math.floor(random()*candidates.length)];if(start(id)!==false){last=id;active=true;}}rest=wait(18,38);}}
  },
  get state(){return {enabled,paused,reduced,active,last,rest,events:[...events]};}
 };
}
