/** Exclusive handoff between existing acting and baked dance. One caller: the stage's existing 30 Hz loop. */
export const DANCE_STATES=Object.freeze(['CONTEMPLATIVE_IDLE','DANCE_PREPARATION','DANCE_SOFT','DANCE_EXPRESSIVE','DANCE_RECOVERY','DANCE_TO_IDLE']);
export function createDanceDirector({idle,pose,music,transport,seed=1,onEvent=()=>{}}){
 let state='CONTEMPLATIVE_IDLE',owns=false,elapsed=0,phrase=null,phase=0,duration=8,amplitude=1,random=seed>>>0,disposed=false,lastRevision=-1,episodes=0,region=null,lastMode='unavailable';
 const rng=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 const set=next=>{state=next;elapsed=0;};
 const recovery=()=>{if(!owns){set('DANCE_TO_IDLE');return;}pose.beginRecovery();set('DANCE_RECOVERY');onEvent('gesture:release');};
 const choose=(clock)=>{
  if(phrase==='fox-invitation')onEvent('gesture:release');lastMode=clock.mode;
  const choices=clock.mode==='mapped'?(clock.intensity>.65?['petal-flourish','crescent-turn']:['moon-breathing','silk-sway','fox-invitation']):['moon-breathing','silk-sway','fox-invitation','crescent-turn','lunar-step','petal-flourish'];
  let next=clock.mode==='mapped'&&pose.has(clock.phraseId)?clock.phraseId:choices[Math.floor(rng()*choices.length)];if(clock.mode!=='mapped'&&next===phrase)next=choices[(choices.indexOf(next)+1)%choices.length];phrase=next;duration=clock.phraseSeconds??pose.duration(phrase);amplitude=.88+rng()*.12;phase=0;region=clock.region;set(['petal-flourish','crescent-turn'].includes(phrase)?'DANCE_EXPRESSIVE':'DANCE_SOFT');
  if(phrase==='fox-invitation')onEvent('gesture:prepare');episodes++;
 };
 return {
  advance(dt,{enabled=true,context='Neutral Presence'}={}){
   if(disposed||!enabled||!Number.isFinite(dt)||dt<0)return;dt=Math.min(dt,.05);
   const clock=transport.advance(dt,music.sample()),playing=enabled&&clock.playing&&pose.ready;
   elapsed+=dt;
   if(state==='CONTEMPLATIVE_IDLE'){
    if(!playing){idle.advance(dt,{enabled:true,context});return;}
    idle.release();set('DANCE_PREPARATION');
   }
   if(state==='DANCE_PREPARATION'){
    if(!owns){idle.advance(dt,{enabled:false,context});if(!playing){set('CONTEMPLATIVE_IDLE');return;}if(idle.busy())return;idle.release();if(!pose.atReference()){set('CONTEMPLATIVE_IDLE');return;}pose.restore();owns=true;elapsed=0;lastRevision=clock.revision;}
    if(!playing){recovery();return;}
    pose.apply('moon-breathing',Math.min(1,elapsed/1.6),Math.min(1,elapsed/1.6),.8,dt);
    if(elapsed>=1.6&&(clock.mode!=='mapped'||clock.phase<.05)){pose.restore();choose(clock);}return;
   }
   if(state==='DANCE_SOFT'||state==='DANCE_EXPRESSIVE'){
    if(!playing||clock.revision!==lastRevision||clock.mode!==lastMode){lastRevision=clock.revision;recovery();return;}
    if(clock.mode==='mapped'&&region!==clock.region){if(phase<.85||clock.phase>.08){recovery();return;}pose.restore();choose(clock);return;}
    phase=clock.mode==='mapped'?clock.phase:Math.min(1,phase+dt/duration);pose.apply(phrase,phase,1,amplitude,dt);
    if(phrase==='fox-invitation'&&phase>=.45&&phase-dt/duration<.45)onEvent('gesture:hold');
    if(phase>=1){pose.restore();choose(clock);}return;
   }
   if(state==='DANCE_RECOVERY'){
    // No idle writer runs while recovery owns the same bones. Buffering never advances a musical phrase.
    pose.recover(Math.min(1,elapsed/2.4));if(elapsed>=2.4){pose.restore();set('DANCE_TO_IDLE');}return;
   }
   if(state==='DANCE_TO_IDLE'){
    if(owns&&elapsed<2.2){pose.apply('lunar-repose',elapsed/2.2,.5,1,dt);return;}pose.restore();owns=false;phrase=null;idle.release();set('CONTEMPLATIVE_IDLE');
   }
  },
  owns:()=>owns,
  diagnostics:()=>({state,owns,phrase,phase,elapsed,episodes,mode:transport.diagnostics().mode}),
  dispose(){if(disposed)return;pose.restore();owns=false;disposed=true;},
 };
}
