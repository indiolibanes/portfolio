import assert from 'node:assert/strict';
import * as T from 'three';
import {createOriginalIdleDirector} from '../src/scripts/shorekeeper/original-idle-director.mjs';
import {createGentleFace,createContemplativeScheduler,GENTLE_MORPHS} from '../src/scripts/shorekeeper/gentle-acting.mjs';
const weights={},writes=[];
const inspection={names:GENTLE_MORPHS,setMorph(n,v){assert(GENTLE_MORPHS.includes(n));assert(v>=0&&v<=1);if(n.startsWith('Pupil_'))assert(v<=.3);weights[n]=v;writes.push(n);}};
const face=createGentleFace(inspection);
const root=new T.Group(),head=new T.Bone();head.name='Bip001Head';root.add(head);
let seed=97123;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
const clips=[1,2,3].map(i=>new T.AnimationClip(`SK_IDLE_0${i}_ORIGINAL`,2,[new T.QuaternionKeyframeTrack('Bip001Head.quaternion',[0,2],[0,0,0,1,0,.2,0,Math.sqrt(.96)])]));
let director=null,active=0,started=[],scheduler;
function start(id){assert.equal(active,0);director?.dispose();const clip=clips.find(c=>c.name===id);director=createOriginalIdleDirector(T,root,clip,{enter:.1,exit:.1,onEvent:e=>{scheduler.onEvent(e);if(e.type==='start')active++;if(e.type==='end')active--;}});started.push(id);director.start();return true;}
scheduler=createContemplativeScheduler({face,available:()=>clips.map(c=>c.name),start,random});
for(const c of clips){start(c.name);for(const expression of ['blink','smile','look']){face.trigger(expression);for(let i=0;i<12;i++){director.advance(.05);scheduler.advance(.05);}assert(writes.length);};director.interrupt();for(let i=0;i<5;i++){director.advance(.1);scheduler.advance(.1);}assert.equal(active,0);assert.deepEqual(head.quaternion.toArray(),[0,0,0,1]);}
face.trigger('blink');scheduler.advance(.13);assert(weights.E_Close>.99);scheduler.advance(.09);scheduler.advance(.2);assert(weights.E_Close<1e-8);
face.trigger('smile');scheduler.advance(.8);assert(weights.M_Smile_L>.2);face.trigger('neutral');scheduler.advance(.65);assert(weights.M_Smile_L<1e-8);
face.trigger('look');scheduler.advance(.8);assert(weights.Pupil_L<=.3&&weights.Pupil_L>0);face.setPaused(true);const before=weights.Pupil_L;scheduler.advance(2);assert.equal(weights.Pupil_L,before);face.setPaused(false);
scheduler.setEnabled(true);for(let i=0;i<6000;i++){director?.advance(.1);scheduler.advance(.1);}assert(started.length>8);assert(clips.every(c=>started.includes(c.name)));assert(active<=1);
scheduler.setReducedMotion(true);const count=started.length;scheduler.advance(100);assert.equal(started.length,count);scheduler.setEnabled(false);face.trigger('neutral');scheduler.advance(1);assert(Object.values(weights).every(x=>x<1e-8));
const missingFace=createGentleFace({names:[],setMorph(){throw Error('unexpected write');}});missingFace.trigger('smile');missingFace.advance(2);assert.equal(missingFace.state.missing.length,GENTLE_MORPHS.length);
console.log('Gentle acting: three idles, ownership, pause, recovery, reduced motion and 10-minute deterministic session passed.');
