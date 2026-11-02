import {DANCE_R2,dancePlaybackEligible} from './hsin-dance-config.mjs';
/** Exclusive handoff between existing acting and baked dance. One caller: the stage's existing 30 Hz loop. */
export const DANCE_STATES=Object.freeze(['CONTEMPLATIVE_IDLE','DANCE_PREPARATION','DANCE_SOFT','DANCE_EXPRESSIVE','DANCE_RECOVERY','DANCE_TO_IDLE']);
export function createDanceDirector({idle,pose,music,transport,seed=1,onEvent=()=>{},intensity='flowing'}){
 let state='CONTEMPLATIVE_IDLE',owns=false,elapsed=0,phrase=null,phase=0,duration=8,amplitude=1,random=seed>>>0,disposed=false,lastRevision=-1,episodes=0,region=null,lastMode='unavailable';
 const rng=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 const set=next=>{state=next;elapsed=0;};
 let clockSeconds=0,recoveryPhase=0,finishBaked=false;const recent=[],lastPlayed=new Map();
 const recovery=()=>{if(!owns){set('DANCE_TO_IDLE');return;}finishBaked=pose.lowerBody===true&&!!phrase;recoveryPhase=phase;if(!finishBaked)pose.beginRecovery();set('DANCE_RECOVERY');onEvent('gesture:release');};
 const choose=(clock)=>{
  if(phrase==='fox-invitation')onEvent('gesture:release');lastMode=clock.mode;
  const r2=pose.has('lunar-waltz'),level=DANCE_R2.levels[intensity]??DANCE_R2.levels.flowing;
  const choices=clock.mode==='mapped'?(clock.intensity>.65?['petal-flourish','crescent-turn']:['moon-breathing','silk-sway','fox-invitation']):r2?['moon-breathing','silk-sway','fox-invitation','crescent-turn','lunar-waltz','ballet-flourish','petal-flourish']:['moon-breathing','silk-sway','fox-invitation','crescent-turn','lunar-step','petal-flourish'];
  const available=choices.filter(n=>!recent.includes(n)&&clockSeconds-(lastPlayed.get(n)??-Infinity)>=DANCE_R2.cooldownSeconds);
  const pool=available.length?available:choices.filter(n=>n!==phrase);let total=0;for(const n of pool)total+=/flourish|waltz|turn/.test(n)?level.expressiveWeight:1;
  let pick=rng()*total,next=pool.at(-1);for(const n of pool){pick-=/flourish|waltz|turn/.test(n)?level.expressiveWeight:1;if(pick<=0){next=n;break;}}
  if(clock.mode==='mapped'&&pose.has(clock.phraseId))next=clock.phraseId;
  phrase=next;lastPlayed.set(next,clockSeconds);recent.push(next);if(recent.length>DANCE_R2.recentPhrases)recent.shift();duration=clock.phraseSeconds??pose.duration(phrase);amplitude=r2?level.amplitude*(.94+rng()*.06):.88+rng()*.12;phase=0;region=clock.region;set(['petal-flourish','crescent-turn','lunar-waltz'].includes(phrase)?'DANCE_EXPRESSIVE':'DANCE_SOFT');
  if(phrase==='fox-invitation')onEvent('gesture:prepare');episodes++;
 };
 return {
  advance(dt,{enabled=true,context='Neutral Presence'}={}){
   if(disposed||!enabled||!Number.isFinite(dt)||dt<0)return;dt=Math.min(dt,.05);
   const stateSample=music.sample(),clock=transport.advance(dt,stateSample),playing=enabled&&dancePlaybackEligible(stateSample)&&clock.playing&&pose.ready;
   elapsed+=dt;clockSeconds+=dt;
   if(state==='CONTEMPLATIVE_IDLE'){
    if(!playing){idle.advance(dt,{enabled:true,context});return;}
    idle.release();set('DANCE_PREPARATION');
   }
   if(state==='DANCE_PREPARATION'){
    if(!owns){idle.advance(dt,{enabled:false,context});if(!playing){set('CONTEMPLATIVE_IDLE');return;}if(idle.busy())return;idle.release();if(!pose.atReference()){set('CONTEMPLATIVE_IDLE');return;}pose.restore();owns=true;elapsed=0;lastRevision=clock.revision;if(pose.lowerBody){phrase='moon-breathing';phase=0;duration=DANCE_R2.preparationSeconds;}}
    if(!playing){recovery();return;}
    phase=Math.min(1,elapsed/DANCE_R2.preparationSeconds);pose.apply('moon-breathing',phase,phase,.8,dt);
    if(elapsed>=DANCE_R2.preparationSeconds&&(clock.mode!=='mapped'||clock.phase<.05)){pose.restore();choose(clock);}return;
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
    const t=Math.min(1,elapsed/DANCE_R2.recoverySeconds);
    if(finishBaked){
     // Complete the baked support path, rather than blending a raised foot through the floor.
     // Hermite time starts at the phrase's nominal phase velocity and ends stationary at its reference.
     const slope=Math.min(2,DANCE_R2.recoverySeconds/Math.max(.001,(1-recoveryPhase)*duration));
     const u=(-2*t*t*t+3*t*t)+(t*t*t-2*t*t+t)*slope;
     pose.apply(phrase,recoveryPhase+(1-recoveryPhase)*u,1,amplitude,dt);
    }else pose.recover(t,DANCE_R2.recoverySeconds);
    if(t>=1){pose.restore();set('DANCE_TO_IDLE');}return;
   }
   if(state==='DANCE_TO_IDLE'){
    if(owns&&elapsed<DANCE_R2.reposeSeconds){pose.apply('lunar-repose',elapsed/DANCE_R2.reposeSeconds,.5,1,dt);return;}pose.restore();owns=false;phrase=null;idle.release();set('CONTEMPLATIVE_IDLE');
   }
  },
  owns:()=>owns,
  diagnostics:()=>({state,owns,phrase,phase,elapsed,episodes,intensity,mode:transport.diagnostics().mode}),
  setIntensity(value){if(DANCE_R2.levels[value])intensity=value;},
  dispose(){if(disposed)return;pose.restore();owns=false;disposed=true;},
 };
}
