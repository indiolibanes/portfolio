import test from 'node:test';
import assert from 'node:assert/strict';
import {createS6Autonomy,S6_AUTO_STATUS,S6_AUTO_FACE_ROSTER} from '../src/scripts/shorekeeper/s6-autonomy.mjs';

function harness(){
 const events=[],available=new Set(S6_AUTO_FACE_ROSTER.map(x=>x.id));
 const p=createS6Autonomy({
   startCinematic:()=>{events.push('cinematic');return true;},
   enterIdles:()=>{events.push('idles');return true;},
   expressionAvailable:id=>available.has(id),
   triggerExpression:id=>{events.push(id);return true;}
 });
 const ready={canonical:true,completeLibraries:true,allIdles:true,stage:true,visible:true,
   loading:false,paused:false,reducedMotion:false,bodyPhase:'idle',bodyMode:'REFERENCE_QA',
   cameraReturning:false,faceBusy:false,faceWritable:true};
 return {p,events,ready,available};
}
test('S6 starts no cinematic until canonical bytes and all source libraries are ready',()=>{
 const h=harness();for(const key of ['canonical','completeLibraries','allIdles','stage','visible']){
  h.p.advance(1,{...h.ready,[key]:false});assert.deepEqual(h.events,[]);
 }
 for(const key of ['loading','paused','reducedMotion']){
  h.p.advance(1,{...h.ready,[key]:true});assert.deepEqual(h.events,[]);
 }
 h.p.advance(1,{...h.ready,bodyPhase:'run',bodyMode:'COMBO_EXPERIMENTAL'});assert.deepEqual(h.events,[]);
 h.p.advance(1,{...h.ready,bodyPhase:'run',bodyMode:'REFERENCE_QA',bodyClip:'SK_IDLE_01_ORIGINAL'});assert.deepEqual(h.events,['cinematic']);
 assert.equal(h.p.state.phase,S6_AUTO_STATUS.CINEMATIC);
 h.p.advance(1,{...h.ready,bodyMode:'R61_EXPERIMENTAL',bodyPhase:'run'});
 assert.deepEqual(h.events,['cinematic']);
 h.p.advance(1,{...h.ready,bodyMode:'R61_EXPERIMENTAL',cameraReturning:true});
 assert.deepEqual(h.events,['cinematic']);
 h.p.advance(1,{...h.ready,bodyMode:'R61_EXPERIMENTAL'});
 assert.deepEqual(h.events,['cinematic','idles']);
 assert.equal(h.p.state.phase,S6_AUTO_STATUS.IDLES);
});
test('S6 uses one curated facial family at a time, skips unavailable and paused, not duplicate aliases',()=>{
 const h=harness();assert.equal(new Set(S6_AUTO_FACE_ROSTER.map(x=>x.family)).size,S6_AUTO_FACE_ROSTER.length);
 h.p.advance(1,h.ready);h.p.advance(1,{...h.ready,bodyMode:'R61_EXPERIMENTAL'});
 h.p.advance(4,{...h.ready,faceBusy:true});
 assert.deepEqual(h.events,['cinematic','idles']);
 h.available.delete('MY_STAR_V2');
 h.p.advance(6,h.ready);assert.equal(h.events.at(-1),'SURPRISE_SOFT');
 h.p.advance(30,{...h.ready,paused:true});assert.equal(h.events.at(-1),'SURPRISE_SOFT');
 h.p.advance(20,{...h.ready,reducedMotion:true});assert.equal(h.events.at(-1),'SURPRISE_SOFT');
 h.p.advance(20,h.ready);assert.equal(h.events.at(-1),'HOPE');
 assert.equal(h.events.filter(x=>x==='cinematic').length,1);
});
test('S6 manual stop prevents replay and reset permits reentry',()=>{
 const h=harness();h.p.stop();h.p.advance(10,h.ready);assert.deepEqual(h.events,[]);
 h.p.restart();h.p.advance(1,h.ready);assert.deepEqual(h.events,['cinematic']);
 h.p.advance(1,{...h.ready,bodyMode:'REFERENCE_QA',bodyPhase:'idle'});
 assert.equal(h.p.state.phase,S6_AUTO_STATUS.BLOCKED);
 assert.equal(h.p.state.reason,'CINEMATIC_OWNER_LOST');
});
test('S6 rejects duplicate expression families and invalid cadence',()=>{
 assert.throws(()=>createS6Autonomy({}),/callbacks/);
 assert.throws(()=>createS6Autonomy({startCinematic:()=>true,enterIdles:()=>true,expressionAvailable:()=>true,triggerExpression:()=>true,roster:[{family:'x',id:'a'},{family:'x',id:'b'}]}),/Duplicate/);
 const h=harness();assert.throws(()=>h.p.advance(-1,h.ready),/delta/);
});
