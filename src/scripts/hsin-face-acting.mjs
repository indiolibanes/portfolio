import { createAttentionDirector, createExpressionDirector } from './hsin-face-pass-b.mjs';
/** Pure, deterministic facial clock. Eye events share one arbiter; mouth/gaze own separate channels. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function createFacialActing({seed=2718,enabled={},pass='a',intensity=.55,morphLimits={},gazeAxes,attentionMode='auto'}={}) {
  let random=seed>>>0, clock=0, lid=null, gaze=[0,0,0], target=[0,0,0], attentionUntil=0;
  let flags={blink:true,wink:true,smirk:true,gaze:true,...enabled};
  let level=Number.isFinite(intensity)?clamp(intensity,0,1):.55,mode=attentionMode;
  const attention=createAttentionDirector({seed:seed^0x5ac3,axes:gazeAxes});
  const expressions=createExpressionDirector({seed:seed^0x77ac,limits:morphLimits});
  let extra={smileR:0,smileL:0,overlays:{},isolated:false};
  const useB=()=>pass==='b'&&level>0;
  const rng=()=>{random=(Math.imul(1664525,random)+1013904223)>>>0;return random/4294967296;};
  const range=(a,b)=>a+(b-a)*rng();
  let nextBlink=range(3.4,6.8), nextWink=range(18,30);
  function trigger(kind) {
    if(lid || !['blink','wink'].includes(kind))return false;
    const wink=kind==='wink';
    if(wink)nextWink=clock+range(18,32);
    lid={kind,start:clock,close:wink?.12:range(.075,.105),hold:wink?range(.16,.24):range(.022,.042),open:wink?range(.24,.32):range(.145,.205)};
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
    return {closeR:closure,closeL:lid?.kind==='wink'?0:closure,
      smileR:useB()?extra.smileR:smile,smileL:useB()?extra.smileL:smile*.18,
      policy:useB()?'b':'a',overlays:useB()?extra.overlays:{},gaze:useB()&&extra.isolated?[0,0,0]:[...gaze],clock,event:lid?.kind??null};
  }
  return {
    advance(dt) {
      if(!Number.isFinite(dt)||dt<0)throw Error('Facial dt must be finite and nonnegative.');
      dt=Math.min(dt,.1);clock+=dt;
      if(lid && clock>=lid.start+lid.close+lid.hold+lid.open) {lid=null;nextBlink=clock+range(3.4,7.8);}
      if(!lid&&!(useB()&&expressions.isLab())){if(flags.blink&&clock>=nextBlink)trigger('blink');else if(!useB()&&flags.wink&&clock>=nextWink){trigger('wink');}}
      if(clock>attentionUntil)target=[0,0,0];
      if(useB()) {
        extra=expressions.step(dt,{intensity:level,enabled:flags.smirk,closed:closureValue()>.1});
        if(extra.wink&&flags.wink)trigger('wink');
        if(extra.isolated){attention.reset();gaze=[0,0,0];}
        else gaze=attention.step(dt,flags.gaze?target:[0,0,0],{intensity:level,closed:closureValue()>.1,mode:flags.gaze?mode:'neutral'});
      }else {
        const damp=1-Math.exp(-dt/.18);
        gaze=gaze.map((v,i)=>{const next=v+((flags.gaze?target[i]:0)-v)*damp;return Math.abs(next)<1e-7?0:next;});
      }
      return sample();
    },
    attention(vector,seconds=1.3) {
      if(!Array.isArray(vector)||vector.length!==3||!vector.every(Number.isFinite))return false;
      const length=Math.hypot(...vector), dead=.08;
      const strength=length<=dead?0:Math.min(1,(length-dead)/(1-dead))*.24;
      target=vector.map(v=>length? v/length*strength:0);attentionUntil=clock+clamp(seconds,0,2);return true;
    },
    clearAttention(){target=[0,0,0];attentionUntil=clock;},
    trigger,
    configure(next) {
      const {intensity,attentionMode,...channels}=next;flags={...flags,...channels};
      if(Number.isFinite(intensity))level=clamp(intensity,0,1);
      if(['auto','cursor','neutral'].includes(attentionMode))mode=attentionMode;
    },
    signal(event){if(['gesture:prepare','gesture:hold','gesture:release'].includes(event))expressions.signal(event);},
    testMorph(name){return useB()&&!lid&&expressions.testMorph(name);},
    testBeat(kind){return useB()&&!lid&&expressions.testBeat(kind);},
    sample,
    diagnostics(){return {clock,event:lid?{...lid}:null,nextBlink,nextWink,flags:{...flags},gaze:[...gaze],pass,intensity:level,attentionMode:mode,attention:attention.diagnostics(),expressions:expressions.diagnostics()};},
  };
}
