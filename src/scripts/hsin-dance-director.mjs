import {DANCE_R2,REVERIE_FACE_CUES,dancePlaybackEligible,reverieSettings} from './hsin-dance-config.mjs';
export const REVERIE='moon-fox-reverie',REVERIE_GRAND='moon-fox-reverie-grand';
/** Exclusive handoff between existing acting and baked dance. One caller: the stage's existing 30 Hz loop. */
export const DANCE_STATES=Object.freeze(['CONTEMPLATIVE_IDLE','DANCE_PREPARATION','DANCE_SOFT','DANCE_EXPRESSIVE','DANCE_RECOVERY','DANCE_TO_IDLE']);
/**
 * `special` is optional: {conservative, dramatic} baked reverie poses. Without it the director is exactly the R2 director.
 * The special event uses its own random stream, so R2 phrase sequences are unchanged for a given seed.
 */
export function createDanceDirector({idle,pose,music,transport,seed=1,onEvent=()=>{},intensity='flowing',special=null,reverie={},reducedMotion=()=>false}){
 let state='CONTEMPLATIVE_IDLE',owns=false,elapsed=0,phrase=null,phase=0,duration=8,amplitude=1,random=seed>>>0,disposed=false,lastRevision=-1,episodes=0,region=null,lastMode='unavailable';
 const rng=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 const set=next=>{state=next;elapsed=0;};
 let clockSeconds=0,recoveryPhase=0,recoveryAmplitude=1,recoveryGainVelocity=0,finishBaked=false;const recent=[],lastPlayed=new Map();
 // R3 special event: exclusive owner of its own pose, separate random stream, never during a mapped musical clock.
 let active=pose,episode=null,cfg=reverieSettings(reverie),specials=0,lastSpecial=-Infinity,danceSeconds=0,specialRandom=(seed^0x5eed1234)>>>0,lastVariant=null,specialSource=special;
 const sRng=()=>{specialRandom=(Math.imul(specialRandom,1664525)+1013904223)>>>0;return specialRandom/4294967296;};
 const recovery=()=>{if(!owns){set('DANCE_TO_IDLE');return;}finishBaked=!episode&&pose.lowerBody===true&&!!phrase;recoveryPhase=phase;recoveryAmplitude=state==='DANCE_PREPARATION'?phase*.8:amplitude;recoveryGainVelocity=state==='DANCE_PREPARATION'?.8/DANCE_R2.preparationSeconds:0;if(!finishBaked)active.beginRecovery();set('DANCE_RECOVERY');onEvent('gesture:release');};
 const finishEpisode=()=>{if(!episode)return;if(episode.faceActive)onEvent('gesture:release');active.restore();active=pose;episode=null;};
 /** A variant plays only when its asset is ready, its own safety gate passed and the configured bow cap allows it. */
 const pickVariant=level=>{
  const soft=reducedMotion()&&cfg.reducedMotion==='soft',options=[];
  const consider=(p,name,dramatic)=>{const meta=p?.ready&&p.has(name)?p.meta(name):null;if(!meta||!meta.safety?.pass)return;if(dramatic&&(!cfg.dramaticEnabled||soft||intensity!=='expressive'))return;options.push({pose:p,name,meta,dramatic});};
  consider(specialSource?.conservative,REVERIE,false);consider(specialSource?.dramatic,REVERIE_GRAND,true);
  const capped=options.filter(o=>o.meta.bow.degrees<=cfg.maxBowDegrees),pool=capped.length?capped:options.filter(o=>!o.dramatic);
  if(!pool.length)return null;
  const dramatic=pool.filter(o=>o.dramatic),choice=dramatic.length&&sRng()<.5?dramatic[0]:pool.find(o=>!o.dramatic)??pool[0];
  const bowScale=Math.min(1,cfg.maxBowDegrees/Math.max(1,choice.meta.bow.degrees));
  return {...choice,amplitude:level.amplitude*cfg.intensity*bowScale*(soft?.6:1),speed:cfg.speed*(soft?.85:1)};
 };
 const startEpisode=(clock,level)=>{
  const choice=pickVariant(level);if(!choice)return false;
  const cues=REVERIE_FACE_CUES.filter(c=>c.chance>=1||sRng()<c.chance).map(c=>({event:c.event,at:Math.max(0,Math.min(.99,(sRng()<.25?c.alternativeAt:c.at)+(sRng()*2-1)*cfg.cueJitter/Math.max(1,choice.pose.duration(choice.name)))),fired:false})).sort((a,b)=>a.at-b.at);
  active=choice.pose;phrase=choice.name;lastVariant=choice.name;duration=choice.pose.duration(choice.name)/choice.speed;amplitude=choice.amplitude;phase=0;
  episode={meta:choice.meta,pending:false,target:0,cues,faceActive:false};specials++;lastSpecial=clockSeconds;set('DANCE_EXPRESSIVE');episodes++;
  return true;
 };
 /** Gates, in order: configured, ready, free clock (never a mapped musical clock), warm-up, cooldown, then one controlled roll. */
 const trySpecial=clock=>{
  if(!specialSource||!cfg.enabled||clock.mode==='mapped'||(reducedMotion()&&cfg.reducedMotion!=='soft'))return false;
  if(episodes<cfg.minPhrasesBefore||danceSeconds<cfg.minPlayingSeconds||clockSeconds-lastSpecial<cfg.cooldownSeconds)return false;
  if(!(specialSource.conservative?.ready||specialSource.dramatic?.ready))return false;
  if(sRng()>=cfg.chance)return false;
  return startEpisode(clock,DANCE_R2.levels[intensity]??DANCE_R2.levels.flowing);
 };
 /** While the body is folded forward, an interruption waits (slightly accelerated) until the torso is upright again. */
 const safeTarget=p=>{for(const [a,b] of episode.meta.exits?.unsafe??[])if(p>=a&&p<b)return b;return p;};
 const choose=(clock)=>{
  if(phrase==='fox-invitation')onEvent('gesture:release');lastMode=clock.mode;
  if(trySpecial(clock))return;
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
   elapsed+=dt;clockSeconds+=dt;if(owns)danceSeconds+=dt;
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
    if(episode){
     // Support phase first: leaving the bow window is never abrupt. Outside that window the inertial return starts from an upright, grounded body.
     if(!episode.pending&&(!playing||clock.revision!==lastRevision||clock.mode!==lastMode)){episode.pending=true;episode.target=safeTarget(phase);}
     if(episode.pending&&phase>=episode.target){lastRevision=clock.revision;recovery();return;}
     phase=Math.min(1,phase+dt/duration*(episode.pending?cfg.interruptSpeed:1));
     active.apply(phrase,phase,1,amplitude,dt);
     for(const cue of episode.cues)if(!cue.fired&&phase>=cue.at){cue.fired=true;episode.faceActive=cue.event!=='gesture:release';onEvent(cue.event);}
     if(phase>=1){finishEpisode();pose.restore();choose(clock);}
     return;
    }
    if(!playing||clock.revision!==lastRevision||clock.mode!==lastMode){lastRevision=clock.revision;recovery();return;}
    if(clock.mode==='mapped'&&region!==clock.region){if(phase<.85||clock.phase>.08){recovery();return;}pose.restore();choose(clock);return;}
    phase=clock.mode==='mapped'?clock.phase:Math.min(1,phase+dt/duration);pose.apply(phrase,phase,1,amplitude,dt);
    if(phrase==='fox-invitation'&&phase>=.45&&phase-dt/duration<.45)onEvent('gesture:hold');
    if(phase>=1){pose.restore();choose(clock);}return;
   }
   if(state==='DANCE_RECOVERY'){
    // No idle writer runs while recovery owns the same bones. Buffering never advances a musical phrase.
    const recoverySeconds=episode?cfg.recoverySeconds:DANCE_R2.recoverySeconds,t=Math.min(1,elapsed/recoverySeconds);
    if(finishBaked){
     // Complete the baked support path, rather than blending a raised foot through the floor.
     // Hermite time starts at the phrase's nominal phase velocity and ends stationary at its reference.
     const slope=Math.min(2,DANCE_R2.recoverySeconds/Math.max(.001,(1-recoveryPhase)*duration));
     const u=(-2*t*t*t+3*t*t)+(t*t*t-2*t*t+t)*slope;
     const gain=recoveryAmplitude+recoveryGainVelocity*DANCE_R2.recoverySeconds*(t-2*t*t+t*t*t);
     pose.apply(phrase,recoveryPhase+(1-recoveryPhase)*u,1,gain,dt);
    }else active.recover(t,recoverySeconds);
    if(t>=1){if(active!==pose)active.restore();active=pose;episode=null;pose.restore();set('DANCE_TO_IDLE');}return;
   }
   if(state==='DANCE_TO_IDLE'){
    if(owns&&elapsed<DANCE_R2.reposeSeconds){pose.apply('lunar-repose',elapsed/DANCE_R2.reposeSeconds,.5,1,dt);return;}pose.restore();owns=false;phrase=null;idle.release();set('CONTEMPLATIVE_IDLE');
   }
  },
  owns:()=>owns,
  diagnostics:()=>({state,owns,phrase,phase,elapsed,episodes,intensity,mode:transport.diagnostics().mode,special:episode?{variant:phrase,pending:episode.pending,target:episode.target}:null,specials,lastVariant}),
  setSpecial(next){specialSource=next;},
  configureReverie(next){cfg=reverieSettings({...cfg,...next});},
  setIntensity(value){if(DANCE_R2.levels[value])intensity=value;},
  dispose(){if(disposed)return;if(active!==pose)active.restore();pose.restore();active=pose;episode=null;owns=false;disposed=true;},
 };
}
