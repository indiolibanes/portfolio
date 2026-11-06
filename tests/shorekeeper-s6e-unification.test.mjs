import test from 'node:test';
import assert from 'node:assert/strict';
import {validateS6ExpressionCatalog,S6_EXPRESSION_FAMILIES,S6_APPROVED_ARCHIVE,playS6Expression} from '../src/scripts/shorekeeper/s6-expression-catalog.mjs';
import {s6MusicActive,createS6DuoChoreographer} from '../src/scripts/shorekeeper/s6-duo-choreography.mjs';

test('deduplicate by facial family but keep all approved baselines untouched',()=>{
  assert.equal(validateS6ExpressionCatalog(),S6_EXPRESSION_FAMILIES);
  assert.equal(new Set(S6_EXPRESSION_FAMILIES.map(x=>x.family)).size,S6_EXPRESSION_FAMILIES.length);
  for(const id of ['LITTLE_SMILE_V2','MY_STAR_V2','MY_STAR_R3_EYES_SOFT','HELLO_R2_CANDIDATE','LOVE','HOPE','SURPRISE_SOFT'])assert.ok(S6_APPROVED_ARCHIVE.includes(id));
  assert.throws(()=>validateS6ExpressionCatalog([S6_EXPRESSION_FAMILIES[0],S6_EXPRESSION_FAMILIES[0]]),/Duplicate/);
});
test('R6 latest candidate wins; an approved older baseline is fallback, not a duplicate',()=>{
 const row=S6_EXPRESSION_FAMILIES.find(x=>x.family==='small-smile');
 const calls=[];const face={playCandidate:id=>(calls.push(id),false),triggerQA:id=>(calls.push(id),true)};
 assert.deepEqual(playS6Expression(face,row),{ok:true,source:'APPROVED_BASELINE_PROFILE_PENDING',id:'LITTLE_SMILE_V2'});
 assert.deepEqual(calls,[row.r6,row.approved]);
 assert.deepEqual(playS6Expression({...face,playCandidate:()=>true},row).source,'R6_ACTING_CANDIDATE');
 assert.equal(playS6Expression(face,row,{allowExperimental:false}).id,'LITTLE_SMILE_V2');
});
test('music classification requires verified playback, never mere selection or buffering',()=>{
 const playing={provider:'youtube',status:'playing',playbackConfirmed:true,synchronizationQuality:'verified'};
 assert.equal(s6MusicActive(playing),true);
 assert.equal(s6MusicActive({...playing,status:'paused'}),false);
 assert.equal(s6MusicActive({...playing,status:'buffering'}),false);
 assert.equal(s6MusicActive({...playing,status:'ready'}),false);
 assert.equal(s6MusicActive({...playing,playbackConfirmed:false}),false);
 assert.equal(s6MusicActive({...playing,provider:'none'}),false);
});
test('conductor swaps modes once, respects pause/reduced motion, and leaves separate owners alone',()=>{
 const e=[],c=createS6DuoChoreographer({onEnterMusic:()=>{e.push('music');return true},onEnterQuiet:()=>e.push('quiet'),quietTick:()=>e.push('idle-face'),musicTick:()=>e.push('rotate-combat')});
 const music={provider:'youtube',status:'playing',playbackConfirmed:true,synchronizationQuality:'verified'};
 c.advance(1,{music:{...music,status:'ready'}});assert.deepEqual(e,['idle-face']);
 c.advance(1,{music});assert.deepEqual(e.slice(-2),['music','rotate-combat']);
 c.advance(1,{music,paused:true});assert.equal(e.length,3);
 c.advance(1,{music,reducedMotion:true});assert.equal(e.length,3);
 c.advance(1,{music:{...music,status:'paused'}});assert.deepEqual(e.slice(-2),['quiet','idle-face']);
 assert.equal(c.state.mode,'quiet');assert.equal(c.state.transitions,2);
});
