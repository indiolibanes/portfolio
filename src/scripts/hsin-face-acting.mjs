import {createAutoB1Director} from './hsin-iconic-expressions.mjs';
import { createPresentationExpression, PRESENTATION_ATTENTION } from './hsin-face-presentation.mjs';
import { createFacialB1Director } from './hsin-face-b1.mjs';
import { createAttentionDirector, createExpressionDirector } from './hsin-face-pass-b.mjs';
/** Pure, deterministic facial clock. Eye events share one arbiter; mouth/gaze own separate channels. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function createFacialActing({seed=2718,enabled={},pass='a',intensity=.55,morphLimits={},gazeAxes,attentionMode='auto'}={}) {
  let random=seed>>>0, clock=0, lid=null, gaze=[0,0,0], target=[0,0,0], attentionUntil=0;
  let flags={blink:true,wink:true,smirk:true,gaze:true,...enabled};
  let level=Number.isFinite(intensity)?clamp(intensity,0,1):.55,mode=attentionMode;
  const presentation=pass==='presentation'||pass==='b1'||pass==='auto-b1';
  const attention=createAttentionDirector({seed:seed^0x5ac3,axes:gazeAxes,timing:presentation?PRESENTATION_ATTENTION:{}});
  const expressionFactory=pass==='auto-b1'?createAutoB1Director:pass==='b1'?createFacialB1Director:presentation?createPresentationExpression:createExpressionDirector;
  const expressions=expressionFactory({seed:seed^0x77ac,limits:morphLimits});
  let extra={smileR:0,smileL:0,overlays:{},isolated:false};
  const useB=()=>(pass==='b'||presentation)&&level>0;
  const rng=()=>{random=(Math.imul(1664525,random)+1013904223)>>>0;return random/4294967296;};
  const range=(a,b)=>a+(b-a)*rng();
  const blinkDelay=()=>presentation?range(5,10):range(3.4,7.8);
  let nextBlink=presentation?range(5,10):range(3.4,6.8), nextWink=range(18,30);
  let winkFallback=nextWink+(presentation?range(2,5):0);
  let autoWinkSide='wink';
  // Presentation-only arbiter state. Legacy passes never read or consume it, so their event sequence is unchanged.
  let lidFreeAt=0,lastAttendClock=-Infinity,lastAttentionState='neutral';
  const winkSupported=()=>typeof expressions.supportsWink==='function'?expressions.supportsWink():true;
  function automaticWink(origin){const kind=pass==='auto-b1'?autoWinkSide:(rng()<.5?'wink-left':'wink');if(trigger(kind,origin)&&pass==='auto-b1')autoWinkSide=kind==='wink'?'wink-left':'wink';}
  function trigger(kind,origin='manual') {
    if(kind==='wink-right')kind='wink';
    if(lid || !['blink','wink','wink-left'].includes(kind))return false;
    const wink=kind!=='blink';
    if(wink){nextWink=clock+(presentation?range(22,44):range(18,32));if(presentation)winkFallback=nextWink+range(2,5);}
    lid={kind,...(presentation?{origin}:{}),start:clock,close:wink?.12:range(.075,.105),hold:wink?range(.16,.24):range(.022,.042),open:wink?range(.24,.32):range(.145,.205)};
    return true;
  }
  function closureValue() {
    if(!lid)return 0;
    const t=clock-lid.start;
    if(t<lid.close)return smooth(t/lid.close);
    if(t<lid.close+lid.hold)return 1;
    return 1-smooth((t-lid.close-lid.hold)/lid.open);
  }
  function sample() {
    const closure=useB()&&extra.isolated?0:closureValue();
    const smile=flags.smirk ? smooth(clock/2)*(.055+.045*Math.sin(clock*.42)) : 0;
    return {closeR:lid?.kind==='wink-left'?0:closure,closeL:lid?.kind==='wink'?0:closure,
      smileR:useB()?extra.smileR:smile,smileL:useB()?extra.smileL:smile*.18,
      policy:pass==='b1'||pass==='auto-b1'?'b1':useB()?'b':'a',...(['b1','auto-b1'].includes(pass)?{diagnostic:!!extra.diagnostic,authored:!!extra.authored}:{}),overlays:useB()?extra.overlays:{},gaze:useB()&&extra.isolated?[0,0,0]:[...gaze],clock,event:lid?.kind??null};
  }
  return {
    advance(dt) {
      if(!Number.isFinite(dt)||dt<0)throw Error('Facial dt must be finite and nonnegative.');
      dt=Math.min(dt,.1);clock+=dt;
      if(lid && clock>=lid.start+lid.close+lid.hold+lid.open) {
        const ended=lid;lid=null;nextBlink=clock+blinkDelay();
        // Refractory period: an eyelid event that fell due during this one may not fire back-to-back.
        if(presentation)lidFreeAt=clock+(ended.kind==='blink'?range(2,3.2):range(1.8,2.8));
      }
      const lidReady=!presentation||clock>=lidFreeAt;
      if(!lid&&lidReady&&!(useB()&&expressions.isLab())){
        if(flags.blink&&clock>=nextBlink)trigger('blink','calendar');
        else if((!useB()||presentation)&&flags.wink&&clock>=(presentation?winkFallback:nextWink)){
          if(!presentation)trigger('wink','calendar');
          // A calendar wink waits for a smile that supports it; if none comes, it is released after 25 s.
          else if(winkSupported()||clock>=winkFallback+25)automaticWink('calendar');
        }
      }
      if(presentation&&!lid&&flags.wink&&clock>=nextWink&&!winkSupported())expressions.requestCoy?.();
      if(clock>attentionUntil)target=[0,0,0];
      if(useB()) {
        extra=expressions.step(dt,{intensity:level,enabled:flags.smirk,closed:closureValue()>.1,attending:clock<=attentionUntil&&Math.hypot(...target)>.02,recent:clock-lastAttendClock<4});
        if(extra.wink&&flags.wink&&(!presentation||(clock>=nextWink&&clock>=lidFreeAt)))presentation?automaticWink('expression'):trigger('wink','expression');
        if(extra.isolated){attention.reset();gaze=[0,0,0];}
        else gaze=attention.step(dt,flags.gaze?target:[0,0,0],{intensity:level,closed:closureValue()>.1,mode:flags.gaze?mode:'neutral',calm:presentation&&expressions.isCalm?.()===true});
        // Blinks cluster with gaze shifts: a blink that is nearly due is released with a glance aside.
        if(presentation){
          const state=attention.state();
          if(state!==lastAttentionState){
            if(state==='avert'&&!lid&&flags.blink&&clock>=lidFreeAt&&clock>=nextBlink-2&&!expressions.isLab()&&rng()<.65)trigger('blink','saccade');
            lastAttentionState=state;
          }
        }
      }else {
        const damp=1-Math.exp(-dt/.18);
        gaze=gaze.map((v,i)=>{const next=v+((flags.gaze?target[i]:0)-v)*damp;return Math.abs(next)<1e-7?0:next;});
      }
      return sample();
    },
    attention(vector,seconds=1.3) {
      if(!Array.isArray(vector)||vector.length!==3||!vector.every(Number.isFinite))return false;
      const length=Math.hypot(...vector), dead=presentation?.035:.08;
      const strength=length<=dead?0:Math.min(1,(length-dead)/(1-dead))*.24;
      target=vector.map(v=>length? v/length*strength:0);attentionUntil=clock+clamp(seconds,0,presentation?5:2);if(strength>0)lastAttendClock=clock;return true;
    },
    clearAttention(){target=[0,0,0];attentionUntil=clock;},
    trigger,
    configure(next) {
      const {intensity,attentionMode,...channels}=next;flags={...flags,...channels};
      if(Number.isFinite(intensity))level=clamp(intensity,0,1);
      if(['auto','cursor','neutral'].includes(attentionMode))mode=attentionMode;
    },
    signal(event){if(['gesture:prepare','gesture:hold','gesture:release'].includes(event))expressions.signal(event);},
    testMorph(name,strength){return useB()&&!lid&&expressions.testMorph(name,strength);},
    testSmileProfile(name,strength=1){return (pass==='b1'||pass==='auto-b1')&&!lid&&expressions.testProfile(name,strength);},
    testBeat(kind){return useB()&&!lid&&expressions.testBeat(kind);},
    sample,
    diagnostics(){return {clock,event:lid?{...lid}:null,nextBlink,nextWink,flags:{...flags},gaze:[...gaze],pass,intensity:level,attentionMode:mode,attention:attention.diagnostics(),expressions:expressions.diagnostics()};},
  };
}
