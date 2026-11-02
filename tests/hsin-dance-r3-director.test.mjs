/** Moon Fox Reverie director contract with stub poses (no three, no GLB): exclusivity, rarity, cooldown, interruption, fallback, R2 untouched. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createDanceDirector,REVERIE,REVERIE_GRAND} from '../src/scripts/hsin-dance-director.mjs';
import {DANCE_R3,reverieSettings,REVERIE_FACE_CUES} from '../src/scripts/hsin-dance-config.mjs';
import {createMusicState} from '../src/scripts/hsin-music-state.mjs';
import {createMusicTransport} from '../src/scripts/hsin-music-transport.mjs';

const R2={'moon-breathing':3.8,'silk-sway':4.2,'fox-invitation':3.6,'crescent-turn':4.4,'lunar-waltz':5.6,'ballet-flourish':4.6,'petal-flourish':3.7,'lunar-repose':1.4};
function stubPose(durations,{meta={},owner}={}){
  const calls=[];let reference=true,applies=0,lastPhase=null;
  const pose={ready:true,lowerBody:true,calls,
    has:n=>n in durations,duration:n=>durations[n],meta:n=>meta[n]??null,
    apply(n,t,w=1,a=1){assert.ok(owner.claim(pose),'only one pose writes the same bones at a time');reference=false;applies++;lastPhase=t;calls.push(['apply',n,t,a]);},
    restore(){reference=true;calls.push(['restore']);owner.release(pose);},beginRecovery(){calls.push(['beginRecovery']);},
    recover(t){reference=t>=1;calls.push(['recover',t]);if(t>=1)owner.release(pose);},
    atReference:()=>reference,get applies(){return applies;},get lastPhase(){return lastPhase;}};
  return pose;
}
const owner={current:null,claim(p){if(this.current&&this.current!==p)return false;this.current=p;return true;},release(p){if(this.current===p)this.current=null;}};
// A pose that has been restored may hand the bones to the other pose; claim() models "one writer per bone at a time".
const makeMeta=(degrees,pass=true)=>({seconds:13.6,bow:{degrees},safety:{pass},exits:{unsafe:[[.46,.76]]}});
function setup({seed=7,reverie={},withSpecial=true,dramatic=false,reduced=false,clockFactory=null,intensity='flowing'}={}){
  owner.current=null;
  const r2=stubPose(R2,{owner}),conservative=stubPose({[REVERIE]:13.6},{meta:{[REVERIE]:makeMeta(33)},owner}),grand=stubPose({[REVERIE_GRAND]:14.4},{meta:{[REVERIE_GRAND]:makeMeta(62)},owner});
  let now=0,position=0,token;const music=createMusicState({now:()=>now}),transport=clockFactory?clockFactory(()=>now):createMusicTransport({now:()=>now}),events=[];
  const director=createDanceDirector({idle:{advance(){assert.ok(!director.owns(),'idle never writes while the dance owns the body');},busy:()=>false,release(){}},pose:r2,music,transport,seed,intensity,onEvent:e=>events.push(e),special:withSpecial?{conservative,dramatic:dramatic?grand:null}:null,reverie,reducedMotion:()=>reduced});
  const status=s=>music.observe(token,{status:s,trackId:'fixture',positionSeconds:position,durationSeconds:1000});
  const api={r2,conservative,grand,music,director,events,
    start(){token=music.select('youtube');status('playing');},
    set status(s){status(s);},
    tick(n=1){for(let i=0;i<n;i++){now+=1000/30;if(music.sample().status==='playing'){position+=1/30;if(i%15===0)status('playing');}director.advance(1/30);}},
    get position(){return position;}};
  return api;
}
const permissive={chance:.5,cooldownSeconds:45,minPlayingSeconds:0,minPhrasesBefore:0};
function until(s,cond,limit=60*30*10){for(let i=0;i<limit;i++){s.tick();if(cond())return i;}throw Error('condition never reached');}

// 1. Settings are clamped: no setting can make the event frequent, fast or deep beyond the safe envelope.
{const c=reverieSettings({chance:5,cooldownSeconds:1,speed:9,maxBowDegrees:900,intensity:3});assert.equal(c.chance,.5);assert.equal(c.cooldownSeconds,45);assert.equal(c.speed,1.2);assert.equal(c.maxBowDegrees,70);assert.equal(c.intensity,1);
 assert.equal(DANCE_R3.reverie.dramaticEnabled,false,'dramatic variant is off by default');assert.ok(DANCE_R3.reverie.chance<=.2&&DANCE_R3.reverie.cooldownSeconds>=120,'rare by default');assert.equal(DANCE_R3.reverie.reducedMotion,'skip');
 assert.ok(Object.isFrozen(DANCE_R3.reverie)&&Object.isFrozen(c));assert.ok(REVERIE_FACE_CUES.every(c=>c.at>=0&&c.at<1&&c.alternativeAt>=0&&c.alternativeAt<1));}

// 2. Without a special pose the director is the R2 director; a disabled special consumes no R2 randomness.
function phraseTrace(options){const s=setup(options);s.start();const seen=[];let last=null;for(let i=0;i<900*30/3;i++){s.tick();const d=s.director.diagnostics();if(d.phrase!==last){last=d.phrase;seen.push([d.state,d.phrase]);}}return seen;}
{const base=phraseTrace({withSpecial:false}),disabled=phraseTrace({reverie:{enabled:false}}),noChance=phraseTrace({reverie:{chance:0}});
 assert.deepEqual(disabled,base,'disabled reverie leaves the R2 sequence identical');assert.deepEqual(noChance,base,'the special event has its own random stream');assert.ok(!base.some(([,p])=>/reverie/.test(p??'')));assert.ok(base.length>10);}

// 3. A 600 s session: rare, cooldown respected, exclusive writer, complete episodes, deterministic.
function session(seed){
  const s=setup({seed,dramatic:false});s.start();const episodes=[];let current=null,start=0;
  for(let i=0;i<600*30;i++){
    s.tick();const d=s.director.diagnostics();
    if(d.special&&!current){current={at:i/30,variant:d.special.variant,phases:[]};}
    if(current&&d.special)current.phases.push(+d.phase.toFixed(4));
    if(current&&!d.special&&d.phrase!==REVERIE){current.end=i/30;episodes.push(current);current=null;}
  }
  assert.ok(s.conservative.applies>0||episodes.length===0);
  return {episodes,specials:s.director.diagnostics().specials,events:s.events.slice(),hash:createHash('sha256').update(JSON.stringify(episodes)).digest('hex')};
}
{let total=0,sessions=0;const hashes=[];
 for(let seed=1;seed<=12;seed++){const a=session(seed),b=session(seed);assert.equal(a.hash,b.hash,'seed '+seed+' reproduces exactly');hashes.push(a.hash);sessions++;total+=a.specials;
  assert.ok(a.specials<=Math.floor(600/DANCE_R3.reverie.cooldownSeconds)+1,'never more than the cooldown allows');
  for(let i=1;i<a.episodes.length;i++)assert.ok(a.episodes[i].at-a.episodes[i-1].at>=DANCE_R3.reverie.cooldownSeconds-1,'cooldown between episodes');
  for(const e of a.episodes){assert.equal(e.variant,REVERIE);assert.ok(e.phases.every((p,i)=>i===0||p>=e.phases[i-1]),'phase never runs backwards');assert.ok(e.phases.at(-1)>=.999,'a normal episode plays to the end');assert.ok(e.at>=DANCE_R3.reverie.minPlayingSeconds);}
 }
 assert.ok(total>0,'the event does happen in 600 s sessions across seeds');assert.ok(total/sessions<=3.5,'but rarely: '+(total/sessions).toFixed(2)+' per 10 minutes');assert.ok(new Set(hashes).size>6,'seeds differ');}

// 4. Exclusivity and clean hand-back (also verified by the owner token inside every stub apply).
{const s=setup({seed:3,reverie:permissive});s.start();until(s,()=>s.director.diagnostics().special);assert.equal(s.director.diagnostics().state,'DANCE_EXPRESSIVE');
 const before=s.r2.applies;s.tick(60);assert.equal(s.r2.applies,before,'R2 pose is silent while the reverie owns the body');
 until(s,()=>!s.director.diagnostics().special,60*30);assert.ok(s.conservative.calls.some(c=>c[0]==='restore'),'reverie pose restored to rest when it ends');assert.ok(s.conservative.atReference());}

// 5. Interruptions. In the upright parts the inertial return starts at once; inside the bow window it waits for the torso (accelerated).
function interrupted(phase){
  const s=setup({seed:3,reverie:permissive});s.start();until(s,()=>s.director.diagnostics().special);
  until(s,()=>s.director.diagnostics().phase>=phase,20*30);const interruptAt=s.director.diagnostics().phase,before=s.conservative.calls.length;
  s.status='paused';let waited=0,pendingSeen=false,recoverAt=null;
  for(let i=0;i<20*30;i++){s.tick();const d=s.director.diagnostics();if(d.special?.pending)pendingSeen=true;if(d.state==='DANCE_RECOVERY'&&recoverAt===null){recoverAt=d.phase;waited=i/30;}if(d.state==='CONTEMPLATIVE_IDLE')break;}
  const d=s.director.diagnostics();assert.equal(d.state,'CONTEMPLATIVE_IDLE');assert.ok(s.conservative.atReference(),'reverie bones restored');assert.ok(s.r2.atReference(),'R2 bones untouched');assert.equal(owner.current,null,'no writer left holding the body');
  assert.ok(s.conservative.calls.slice(before).some(c=>c[0]==='beginRecovery'),'inertial recovery used, never a replay through the bow');
  assert.ok(s.events.includes('gesture:release'),'face released');
  return {interruptAt,recoverAt,waited,pendingSeen};
}
for(const p of [.1,.3,.44,.9]){const r=interrupted(p);assert.ok(r.recoverAt-r.interruptAt<.02,'upright interruption recovers at once '+JSON.stringify(r));}
for(const p of [.47,.56,.7]){const r=interrupted(p);assert.ok(r.recoverAt>=.76-1e-6,'support phase completes before leaving the bow '+JSON.stringify(r));assert.ok(r.pendingSeen);assert.ok(r.waited<=(.76-p)*13.6/1.45+.25,'accelerated wait '+r.waited);}

// 6. Never over a mapped musical clock.
{const mapped=now=>{const clock={playing:true,mode:'mapped',revision:1,phase:0,region:0,phraseId:'silk-sway',phraseSeconds:4.2,intensity:.2};return {advance(dt){clock.phase=(clock.phase+dt/4.2)%1;return clock;},diagnostics:()=>clock};};
 const s=setup({seed:3,reverie:permissive,clockFactory:mapped});s.start();s.tick(60*30*5);assert.equal(s.director.diagnostics().specials,0);assert.equal(s.conservative.applies,0);}

// 7. Reduced motion, ready/safety gates, bow cap, dramatic gating and fallback.
{const s=setup({seed:3,reverie:permissive,reduced:true});s.start();s.tick(60*30*4);assert.equal(s.director.diagnostics().specials,0,'reduced motion skips the event by default');}
{const s=setup({seed:3,reverie:{...permissive,reducedMotion:'soft'},reduced:true});s.start();until(s,()=>s.director.diagnostics().special);s.tick(5);const a=s.conservative.calls.filter(c=>c[0]==='apply').at(-1)[3];assert.ok(a<=0.9*0.6+1e-9,'soft reduced motion scales the amplitude down: '+a);}
{const s=setup({seed:3,reverie:permissive,withSpecial:true});s.conservative.ready=false;s.start();s.tick(60*30*3);assert.equal(s.director.diagnostics().specials,0,'an unready pose never plays');}
{const s=setup({seed:3,reverie:{...permissive,dramaticEnabled:true,maxBowDegrees:70},dramatic:true,intensity:'expressive'});const seen=new Set();s.start();for(let i=0;i<2400*30/3;i++){s.tick();const v=s.director.diagnostics().special?.variant;if(v)seen.add(v);}assert.ok(seen.has(REVERIE),'conservative plays');assert.ok(seen.has(REVERIE_GRAND),'dramatic plays when enabled, safe, expressive and within the cap');}
{const s=setup({seed:3,reverie:{...permissive,dramaticEnabled:true},dramatic:true,intensity:'expressive'});const seen=new Set();s.start();for(let i=0;i<1500*30/3;i++){s.tick();const v=s.director.diagnostics().special?.variant;if(v)seen.add(v);}assert.ok(!seen.has(REVERIE_GRAND),'the default 36 degree cap alone keeps the dramatic variant away');}
{const s=setup({seed:3,reverie:{...permissive,dramaticEnabled:true,maxBowDegrees:40},dramatic:true,intensity:'expressive'});const seen=new Set();s.start();for(let i=0;i<1500*30/3;i++){s.tick();const v=s.director.diagnostics().special?.variant;if(v)seen.add(v);}assert.ok(seen.has(REVERIE)&&!seen.has(REVERIE_GRAND),'a lower bow cap falls back to the safe variant automatically');}
{const s=setup({seed:3,reverie:{...permissive,dramaticEnabled:true},dramatic:true,intensity:'flowing'});const seen=new Set();s.start();for(let i=0;i<1500*30/3;i++){s.tick();const v=s.director.diagnostics().special?.variant;if(v)seen.add(v);}assert.ok(!seen.has(REVERIE_GRAND),'dramatic needs the expressive level');}
{const s=setup({seed:3,reverie:{...permissive,dramaticEnabled:true,maxBowDegrees:20},dramatic:true,intensity:'expressive'});s.start();until(s,()=>s.director.diagnostics().special);s.tick(3);const apply=s.conservative.calls.filter(c=>c[0]==='apply').at(-1);assert.ok(Math.abs(apply[3]-20/33)<1e-6,'bow cap scales the phrase when even the safe variant is deeper than the cap: '+apply[3]);}
{const s=setup({seed:3,reverie:{...permissive,dramaticEnabled:true,maxBowDegrees:70},dramatic:true,intensity:'expressive'});s.grand.meta=()=>makeMeta(62,false);const seen=new Set();s.start();for(let i=0;i<1500*30/3;i++){s.tick();const v=s.director.diagnostics().special?.variant;if(v)seen.add(v);}assert.ok(!seen.has(REVERIE_GRAND),'a variant whose own safety gate failed never plays');}

// 8. Facial cues are suggestions: they vary between episodes, always end released, and only use the existing vocabulary.
{const sets=new Set();for(const seed of [3,4,5,6,8,9,10,11]){const s=setup({seed,reverie:permissive});s.start();until(s,()=>s.director.diagnostics().special);const from=s.events.length;until(s,()=>!s.director.diagnostics().special,60*30);const ev=s.events.slice(from);sets.add(ev.join('|'));assert.ok(ev.every(e=>['gesture:prepare','gesture:hold','gesture:release'].includes(e)));assert.equal(ev.at(-1),'gesture:release');}
 assert.ok(sets.size>=2,'facial direction differs between episodes: '+[...sets].join(' / '));}

// 9. Live reconfiguration and late asset arrival.
{const s=setup({seed:3,reverie:permissive,withSpecial:false});s.start();s.tick(60*30);assert.equal(s.director.diagnostics().specials,0);s.director.setSpecial({conservative:s.conservative,dramatic:null});until(s,()=>s.director.diagnostics().special,60*30*30);assert.equal(s.director.diagnostics().specials,1,'a late-loaded asset joins without restarting the dance');
 s.director.configureReverie({enabled:false});s.director.dispose();assert.ok(s.conservative.atReference()&&s.r2.atReference());}

console.log('Moon Fox Reverie director: rare, exclusive, cooldown, safe interruption windows, fallback, R2 sequence identical PASS');
