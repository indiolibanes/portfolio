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
 const countdownDigit=t<R3.countdown||t>=R3.launch+.32?null:t>=R3.launch?0:5-Math.floor(t-R3.countdown+1e-9);
 const phase=t<R3.reveal?'REVEAL_VERTICAL_PAD':t<R3.ignition?'ENGINE_PREIGNITION':t<R3.countdown?'ENGINE_IGNITION':t<R3.launch?'COUNTDOWN':t<R3.orbitEnd?'LIFT_AND_ORBIT':t<R3.settleEnd?'SETTLE_AND_CLEAR':t<R3.flight?'PITCH_TO_LEFT':'FLIGHT_LOOP';
 return {t,phase,countdownDigit,enginePower:t<R3.reveal?0:t<R3.ignition?.08*smooth((t-R3.reveal)/.7):.3+.35*smooth((t-R3.ignition)/.4)+.35*smooth(dt/.35),
  release:smooth(dt/.22),riderVisible:t>=R3.enter,walkTime:Math.max(0,Math.min(t,R3.prepare)-R3.enter),
  approach:smooth((t-R3.enter)/(R3.prepare-R3.enter)),jump:smooth((t-R3.jump)/(R3.grip-R3.jump)),
  grip:smooth((t-R3.jump-.25)/.75),orbit,orbitTheta:Math.PI*orbit,settle:smooth((t-R3.orbitEnd)/(R3.settleEnd-R3.orbitEnd)),
  pitch,flightMix:pitch,trailPower:smooth((t-R3.pitchStart)/1.2),height,x};
}
/** Alternating surface anchors. During each reach the OTHER hand remains planted. */
export function gripStepAt(progress,side) {
 const p=clamp(progress),v=p*4,step=Math.min(3,Math.floor(v)),f=p===1?1:v-step;
 const reach=side==='R'?smooth(f*2):smooth(f*2-1);
 return {angle:(step+reach)*Math.PI/4,holding:side==='R'?f>=.5:f<=.5};
}
export function startWipeScale(width,height,viewportWidth,viewportHeight) {
 return Math.max(2,Math.hypot(viewportWidth,viewportHeight)/Math.max(1,Math.min(width,height))*1.5);
}
