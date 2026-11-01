import assert from 'node:assert/strict';
import {createFacialActing} from '../src/scripts/hsin-face-acting.mjs';
import {PASS_B_NAMES,PASS_B1_EXTRA_NAMES} from '../src/scripts/hsin-face-morph-audit.mjs';
const limits=Object.fromEntries([...PASS_B_NAMES,...PASS_B1_EXTRA_NAMES].map(n=>[n,.12]));
function faceTrace(seed){
 const face=createFacialActing({pass:'auto-b1',autonomous:true,seed,intensity:.75,morphLimits:limits});
 const sides=new Set(),winks=[],states=[],trace=[];let previous=null,neutral=0,closedAt=null,openAt=0;
 for(let i=0;i<36000;i++){
  if(i%2===0)face.attention([.9,.1,0],1.3);
  const s=face.advance(1/60),d=face.diagnostics().expressions;
  assert.ok(Object.values(s.overlays).every(v=>v>=0&&v<=1));
  assert.equal(s.overlays.P_Nose_Up??0,0);assert.equal(s.overlays.P_Nose_Down??0,0);
  if(d.presence.phase==='neutral'&&s.smileR<.001&&s.smileL<.001)neutral++;
  if(Math.max(s.smileR,s.smileL)>.07)sides.add(s.smileR>s.smileL?'R':'L');
  if(s.event&&!previous){
   if(s.event!=='blink'){winks.push(s.event);assert.ok(Math.max(s.smileR,s.smileL)>=.12,'wink has a supporting expression');}
   assert.ok(s.clock-openAt>=1.8||openAt===0);closedAt=s.clock;
  }
  if(!s.event&&previous)openAt=s.clock;
  previous=s.event;
  if(i%60===0){states.push(d.presence.intent);trace.push([d.presence.phase,d.presence.side,s.event,s.smileR,s.smileL]);}
 }
 assert.ok(neutral>36000*.25,'neutral is a substantial part of the performance');assert.equal(sides.size,2);
 assert.ok(states.includes('Curious Attention'));assert.ok(states.includes('Seductive Gaze'));assert.ok(states.includes('Subtle Smirk'));assert.ok(winks.includes('wink')&&winks.includes('wink-left'));
 for(let i=2;i<winks.length;i++)assert.ok(!(winks[i]===winks[i-1]&&winks[i]===winks[i-2]),'no three identical winks');
 return trace;
}
assert.deepEqual(faceTrace(15),faceTrace(15));assert.notDeepEqual(faceTrace(15),faceTrace(16));

console.log('Autonomous face: neutral returns, two-sided smiles, varied supported winks and contextual gaze PASS');
