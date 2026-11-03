import assert from 'node:assert/strict';
import {createGentleFace,createContemplativeScheduler,GENTLE_MORPHS} from '../src/scripts/shorekeeper/gentle-acting.mjs';
import {FACIAL_VALIDATION} from '../src/scripts/shorekeeper/expression-library.mjs';
let values={};const face=createGentleFace({names:GENTLE_MORPHS,setMorphs(v){values={...v};}});
assert.equal(face.trigger('MY_STAR'),false);assert.equal(FACIAL_VALIDATION.LITTLE_SMILE,'EXPERIMENTAL');assert(face.trigger('LITTLE_SMILE'));face.advance(.65);for(const n of ['M_Smile_L','M_Smile_R','P_M_L_Add','P_M_R_Add'])assert.equal(values[n],1);assert.equal(values.E_Smile_L,0);face.advance(4);assert(Object.values(values).every(x=>x===0));
let starts=0;const scheduler=createContemplativeScheduler({face,available:()=>[],start(){starts++;},random:()=>.5});scheduler.setEnabled(true);for(let i=0;i<6000;i++)scheduler.advance(.1);assert.equal(starts,0);assert(Object.values(values).every(x=>x===0));console.log('B5 candidate, blocked presets, neutral recovery and 600s conservative scheduler PASS');
