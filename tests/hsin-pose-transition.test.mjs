import assert from 'node:assert/strict';
import {createPoseTransition} from '../src/scripts/hsin-pose-transition.mjs';
let applied=0,restored=0;const pose={apply:t=>{applied=t},restore:()=>{applied=0;restored++}};
const t=createPoseTransition({pose,duration:2.4});t.request(1);let previous=0;
for(let i=0;i<120;i++){t.advance(.02);assert.ok(applied>=previous&&applied-previous<.02);previous=applied;}
assert.ok(Math.abs(applied-1)<1e-10);t.request(0);t.advance(.02);assert.ok(applied>.9999);
for(let i=0;i<35;i++)t.advance(.02);const beforeReverse=applied;t.request(1);assert.equal(applied,beforeReverse);t.advance(.02);assert.ok(applied-beforeReverse<.001);
for(let i=0;i<120;i++)t.advance(.02);assert.equal(t.weight(),1);t.request(0);for(let i=0;i<120;i++)t.advance(.02);assert.equal(t.weight(),0);t.reset();assert.equal(restored,1);assert.equal(applied,0);
console.log('Signature transition: bounded quintic entry, reversal, exit and reset PASS');
