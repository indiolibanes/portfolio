/** R3 authored timeline, seconds of ACTIVE scene time, never wall-clock timers. */
export const R3 = Object.freeze({reveal:.9, ignition:1.6, countdown:2.1, enter:3.1, prepare:4.8, jump:5.1, grip:6.1, launch:7.1, orbitEnd:8.7, settleEnd:9.4, pitchStart:9.4, flight:11.2});
const clamp=x=>Math.max(0,Math.min(1,x));
export const smooth=x=>{const u=clamp(x);return u*u*(3-2*u);};
export function sampleImmersiveR3At(seconds) {
 const t=Math.max(0,Number.isFinite(seconds)?seconds:0),dt=Math.max(0,t-R3.launch);
 const orbit=smooth((t-R3.launch)/(R3.orbitEnd-R3.launch));
 const pitch=smooth((t-R3.pitchStart)/(R3.flight-R3.pitchStart));
 // C1 at liftoff and at the flight-loop boundary. Continue translation without a reset.
 const flightDt=Math.max(0,t-R3.flight),duration=R3.flight-R3.launch,u=Math.min(dt,duration);
 const lift=.23*u*u,velocity=.46*duration;
 const height=lift+velocity*flightDt/(1+flightDt*.08);
 const pitchDuration=R3.flight-R3.pitchStart,pitchLinear=clamp((t-R3.pitchStart)/pitchDuration);
 const x=-1.4*(pitchLinear**3+3*flightDt/pitchDuration);
 const rocketVisible = t >= R3.launch + .32; // the 0 is fully displayed before the reveal
 const countdownDigit=t<R3.countdown||rocketVisible?null:t>=R3.launch?0:5-Math.floor(t-R3.countdown+1e-9);
 const phase=t<R3.reveal?'REVEAL_VERTICAL_PAD':t<R3.ignition?'ENGINE_PREIGNITION':t<R3.countdown?'ENGINE_IGNITION':t<R3.launch?'COUNTDOWN':t<R3.orbitEnd?'LIFT_AND_ORBIT':t<R3.settleEnd?'SETTLE_AND_CLEAR':t<R3.flight?'PITCH_TO_LEFT':'FLIGHT_LOOP';
 return {t,phase,countdownDigit,rocketVisible,enginePower:t<R3.reveal?0:t<R3.ignition?.08*smooth((t-R3.reveal)/.7):.08+.22*smooth((t-R3.ignition)/.16)+.35*smooth((t-R3.ignition)/.4)+.35*smooth(dt/.35),
  release:smooth(dt/.22),riderVisible:t>=R3.enter,walkTime:Math.max(0,Math.min(t,R3.prepare)-R3.enter),
  approach:smooth((t-R3.enter)/(R3.prepare-R3.enter)),jump:smooth((t-R3.jump)/(R3.grip-R3.jump)),
  grip:smooth((t-R3.jump-.25)/.75),orbit,orbitTheta:Math.PI*orbit,settle:smooth((t-R3.orbitEnd)/(R3.settleEnd-R3.orbitEnd)),
  pitch,flightMix:pitch,trailPower:smooth((t-R3.pitchStart)/1.2),height,x};
}
const bell=x=>Math.sin(Math.PI*clamp(x))**2;
/**
 * Engine flicker as a pure function of active time, so seek/replay stay reproducible.
 * Returns multipliers around 1 for the plume scale, the ignition light and the shock diamonds.
 * Before ignition the pilot flame is weak and stumbles; it catches with a bright pulse,
 * settles over ~1 s, gets one more pulse at release and then only shimmers.
 * Reduced motion (or no thrust) gets a steady flame.
 */
export function thrusterFx(seconds,s,reduced=false) {
 if(reduced||!(s.enginePower>0))return {plume:1,light:1,shock:1};
 const t=Math.max(0,seconds);
 const n1=Math.sin(t*23.1)*.5+Math.sin(t*37.7+1.3)*.3+Math.sin(t*61.3+2.1)*.2;
 const n2=Math.sin(t*29.3+.7)*.5+Math.sin(t*47.1+2.9)*.3+Math.sin(t*73.9+.4)*.2;
 const calm=smooth((t-R3.ignition)/1);
 const amp=.045+.155*(1-calm)+.05*bell((t-R3.launch)/.8);
 const stumble=t<R3.ignition+.3?Math.max(0,Math.sin(t*9.7)*Math.sin(t*4.1+1))**3*(1-smooth((t-R3.ignition)/.3)):0;
 const kick=.55*bell((t-R3.ignition)/.28)+.45*bell((t-R3.launch)/.5);
 return {plume:Math.max(.55,1+amp*n1-.3*stumble),light:Math.min(2.2,Math.max(.35,1+1.2*amp*n2+kick-.5*stumble)),shock:1+.5*amp*n2};
}
/** Alternating surface anchors. During each reach the OTHER hand remains planted. */
export function gripStepAt(progress,side) {
 const p=clamp(progress),v=p*4,step=Math.min(3,Math.floor(v)),f=p===1?1:v-step;
 const reach=side==='R'?smooth(f*2):smooth(f*2-1);
 return {angle:(step+reach)*Math.PI/4,holding:side==='R'?f>=.5:f<=.5};
}
/**
 * START wipe curve, sampled so the browser only interpolates short straight segments.
 * A brief wind-up (slight dip, small clockwise turn), then a spin that accelerates to
 * exactly +360° while the zoom is exponential, i.e. a constant rate of approach: the word
 * is still readable at mid-flight instead of idling and then exploding. Rotation never
 * goes backwards; the word fades only once it is far larger than the viewport.
 */
export function startWipeFrames(finalScale,samples=16) {
 const top=Math.max(2,finalScale)*1.12,dip=.93,lead=2/16,tilt=6,frames=[];
 for(let i=0;i<=samples;i++){
  const u=i/samples;let angle,scale;
  if(u<lead){const k=smooth(u/lead);angle=tilt*k;scale=1+(dip-1)*k;}
  else{const p=(u-lead)/(1-lead);angle=tilt+(360-tilt)*p**1.9;scale=dip*(top/dip)**(p**1.35);}
  frames.push({offset:u,angle,scale,opacity:u<=.86?1:Math.max(0,1-(u-.86)/.14)});
 }
 return frames;
}
export function startWipeScale(width,height,viewportWidth,viewportHeight) {
 return Math.max(2,Math.hypot(viewportWidth,viewportHeight)/Math.max(1,Math.min(width,height))*1.5);
}
