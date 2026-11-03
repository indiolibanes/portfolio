import assert from 'node:assert/strict';
import {createGentleFace,createContemplativeScheduler,GENTLE_MORPHS} from '../src/scripts/shorekeeper/gentle-acting.mjs';
import {FACIAL_VALIDATION} from '../src/scripts/shorekeeper/expression-library.mjs';
let values={};const face=createGentleFace({names:GENTLE_MORPHS,setMorphs(v){values={...v};}});
assert.equal(face.trigger('MY_STAR'),false);assert.equal(FACIAL_VALIDATION.LITTLE_SMILE,'EXPERIMENTAL');assert(face.trigger('LITTLE_SMILE'));face.advance(.65);for(const n of ['M_Smile_L','M_Smile_R','P_M_L_Add','P_M_R_Add'])assert.equal(values[n],1);assert.equal(values.E_Smile_L,0);face.advance(4);assert(Object.values(values).every(x=>x===0));
let starts=0;const scheduler=createContemplativeScheduler({face,available:()=>[],start(){starts++;},random:()=>.5});scheduler.setEnabled(true);for(let i=0;i<6000;i++)scheduler.advance(.1);assert.equal(starts,0);assert(Object.values(values).every(x=>x===0));// B.5 accidentally advanced the blink timer without issuing E_Close.
// Restore only bilateral blinking, keeping all visually unapproved presets out of autoplay.
let automaticWeights={},blinkPeak=0,autoStarts=0;
const autoFace=createGentleFace({names:GENTLE_MORPHS,setMorphs(v){automaticWeights={...v};}});
const auto=createContemplativeScheduler({face:autoFace,available:()=>[],start(){autoStarts++;},random:()=>.5});
auto.setEnabled(true);
for(let i=0;i<240;i++){auto.advance(1/60);blinkPeak=Math.max(blinkPeak,automaticWeights.E_Close??0);}
assert(blinkPeak>.9,'Automatic contemplative mode must trigger the E_Close bilateral blink');
assert.equal(autoStarts,0,'Missing clips must not trigger animation playback');
assert.equal(autoFace.state.expression,'neutral','No unapproved facial presets should run automatically');
auto.setPaused(true);const pausedWeights={...automaticWeights};for(let i=0;i<120;i++)auto.advance(1/60);
assert.deepEqual(automaticWeights,pausedWeights,'Paused scheduler does not move facial weights');
auto.setPaused(false);auto.setReducedMotion(true);autoFace.reset();
for(let i=0;i<600;i++)auto.advance(1/60);
assert.equal(automaticWeights.E_Close,0,'Reduced motion suppresses automatic blink');
console.log('B5.1 PASS: candidate smile, blocked presets, exact neutral, scheduled bilateral blink, pause and reduced motion');
