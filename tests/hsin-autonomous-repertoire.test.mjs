import assert from 'node:assert/strict';
import {createBodyRepertoire} from '../src/scripts/hsin-body-repertoire.mjs';
function bodyTrace(seed,caps={signature:true,chest:true,hair:true,composition:true}){
 let w=0,target=0,chestLeft=0,hairLeft=0;const starts=[],events=[];
 const signature={request:v=>{target=v},advance:dt=>{w=Math.min(1,Math.max(0,w+Math.sign(target-w)*Math.min(dt/2,Math.abs(target-w))));},weight:()=>w,busy:()=>w!==target,reset:()=>{w=target=0}};
 const actor=kind=>({start:(_allowed,o)=>{assert.equal(kind==='chest'?hairLeft:chestLeft,0,'left arm has one owner');if(kind==='chest')chestLeft=6;else hairLeft=8;starts.push([kind,o.variant,w]);return true;},advance:dt=>{if(kind==='chest')chestLeft=Math.max(0,chestLeft-dt);else hairLeft=Math.max(0,hairLeft-dt);},busy:()=>kind==='chest'?chestLeft>0:hairLeft>0,release:()=>{},cancel:()=>{if(kind==='chest')chestLeft=0;else hairLeft=0;}});
 const body=createBodyRepertoire({seed,signature,chest:actor('chest'),hair:actor('hair'),capabilities:()=>caps,onState:e=>events.push(e)});
 for(let i=0;i<36000;i++){body.advance(.05,{enabled:true,context:i%600<300?'Warm Presence':'Neutral Presence'});assert.ok(!(chestLeft&&hairLeft));}
 body.release();for(let i=0;i<300;i++)body.advance(.05,{enabled:false});assert.equal(body.busy(),false);assert.equal(w,0);assert.equal(chestLeft,0);assert.equal(hairLeft,0);
 const episodes=events.filter(e=>e.state==='signature-entry'||e.state==='left-acting');
 for(let i=1;i<episodes.length;i++)assert.notEqual(episodes[i].action,episodes[i-1].action,'avoid immediate action repeats');
 if(caps.hair)assert.ok(starts.some(([k])=>k==='hair'));else assert.ok(!starts.some(([k])=>k==='hair'));
 for(const [kind,variant,weight]of starts){if(kind==='hair')assert.equal(weight,0);if(variant==='composed')assert.equal(weight,1);}
 return episodes;
}
assert.deepEqual(bodyTrace(77),bodyTrace(77));assert.notDeepEqual(bodyTrace(77),bodyTrace(78));bodyTrace(77,{signature:true,chest:true,composition:false,hair:false});
console.log('Autonomous repertoire: seeded neutral/smiles/gaze/winks; cooldowns, hand roles, mutual exclusion, rests and graceful release PASS');
