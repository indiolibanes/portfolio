import assert from 'node:assert/strict';
import {poseLandmarks,summarizePosePhases,HAIR_PHASES} from '../scripts/lib/hsin-stage-alignment.mjs';

// The original public path has 87 frames; the archived silhouette-E path has 109.
// Compare *semantic stages*, never fixed indices (36/50 refer to different phases).
const pose=(count,frames)=>({
  names:['ORG-Bip001HandL'],rest:[0,0,0,1],
  frames:Array.from({length:count},()=>[0,0,0,1]),
  stages:Object.fromEntries(['hoverIn','start','end','hoverOut'].map((n,i)=>[n,frames[i]/(count-1)])),
});
const publicHair=pose(87,[26,36,50,60]);
const experimental=pose(109,[34,44,58,68]);
assert.deepEqual(poseLandmarks(publicHair),{rest:0,restEnd:86,hoverIn:26,start:36,end:50,hoverOut:60});
assert.deepEqual(poseLandmarks(experimental),{rest:0,restEnd:108,hoverIn:34,start:44,end:58,hoverOut:68});
assert.equal(HAIR_PHASES.length,5);
const signal=(p,value)=>Array.from({length:p.frames.length},(_,n)=>{
 const marks=poseLandmarks(p);
 return n>=marks.start&&n<=marks.end?value:0;
});
for(const p of [publicHair,experimental]){
 const result=summarizePosePhases(p,signal(p,.75));
 assert.equal(result.phases.caress.worst,.75);
 assert.equal(result.phases.approach.worst,0);
 assert.equal(result.phases.return.worst,0);
 assert.equal(result.phases.caress.worstFrame,result.landmarks.start);
 assert.equal(result.frameCount,p.frames.length);
}
// A peak at index 43 is in the public *caress* phase but in E's
// contact-approach phase. Same absolute index is not the same gesture instant.
const publicPeak=Array(87).fill(0),experimentalPeak=Array(109).fill(0);
publicPeak[43]=1;experimentalPeak[43]=1;
assert.equal(summarizePosePhases(publicHair,publicPeak).phases.caress.worst,1);
assert.equal(summarizePosePhases(experimental,experimentalPeak).phases.caress.worst,0);
assert.equal(summarizePosePhases(experimental,experimentalPeak).phases.contactApproach.worst,1);
assert.throws(()=>poseLandmarks({...publicHair,stages:{hoverIn:.7,start:.2,end:.5,hoverOut:.9}}),/unordered/);
assert.throws(()=>summarizePosePhases(publicHair,[0,1]),/per-frame/);
assert.throws(()=>poseLandmarks({...publicHair,frames:[]}),/frames/);
assert.throws(()=>poseLandmarks({...publicHair,rest:[NaN,0,0,1]}),/rest/);
assert.throws(()=>poseLandmarks({...publicHair,stages:{hoverIn:.01,start:.011,end:.012,hoverOut:.013}}),/collapse/);
console.log('Hsin stage alignment: semantic phases across 87/109 frames, coverage partitioning and invalid-input guards PASS');
