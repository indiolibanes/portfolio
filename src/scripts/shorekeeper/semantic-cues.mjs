/** Source-gated event infrastructure. No inferred HA, Ult identity or fabricated seconds. */
const hash=/^[0-9a-f]{64}$/;
export function createSemanticCues(markers,{apply=()=>{},emit=()=>{}}={}) {
 const cues=markers.map(m=>{
  if(!Number.isFinite(m.sequenceTime)||m.sequenceTime<0||!Number.isFinite(m.clipTime)||m.clipTime<0||!Number.isInteger(m.sourceFrame)||m.sourceFrame<0||!hash.test(m.clipHash)||!m.clipId||!m.variant||!m.event||!m.provenance||!m.evidence)throw Error('Incomplete measured marker');
  return Object.freeze({...m});
 }).sort((a,b)=>a.sequenceTime-b.sequenceTime);
 let time=0,cycleId=0,next=0;
 const compose=()=>apply(cues.slice(0,next),{time,cycleId});
 return {
  reset(id){if(!Number.isSafeInteger(id)||id<0)throw Error('Invalid cycle');cycleId=id;time=0;next=0;compose();},
  advance(t){if(!Number.isFinite(t)||t<time)throw Error('Use seek for backwards movement');time=t;while(next<cues.length&&cues[next].sequenceTime<=time)emit({...cues[next++],cycleId});compose();},
  seek(t){if(!Number.isFinite(t)||t<0)throw Error('Invalid seek');time=t;next=0;while(next<cues.length&&cues[next].sequenceTime<=time)next++;compose();},
  get state(){return {time,cycleId,next,status:cues.length?'MEASURED_MARKERS_REQUIRED_FOR_RUNTIME':'ULT_SOURCE_GATE_PENDING'};}
 };
}
