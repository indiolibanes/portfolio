/** Stage-aware diagnostic alignment for baked Hsin gestures.
 * Pure data helpers: no GLB, DOM, renderer or rig. Indexing by normalized
 * stages avoids comparing unrelated absolute frames after a re-bake.
 */
const invalid=(reason)=>{throw Error('Invalid Hsin baked pose: '+reason);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export const HAIR_PHASES=Object.freeze([
  ['approach','rest','hoverIn'], ['contactApproach','hoverIn','start'],
  ['caress','start','end'], ['release','end','hoverOut'],
  ['return','hoverOut','restEnd'],
]);
export function poseLandmarks(pose){
  if(!pose||!Array.isArray(pose.frames)||pose.frames.length<2)invalid('missing or empty frames');
  const total=pose.frames.length-1;
  if(!Array.isArray(pose.names)||pose.names.length===0||!pose.names.every(n=>typeof n==='string'&&n))invalid('missing bone names');
  if(!Array.isArray(pose.rest)||pose.rest.length!==pose.names.length*4||!pose.rest.every(finite))invalid('invalid rest quaternions');
  if(!pose.frames.every(row=>Array.isArray(row)&&row.length===pose.rest.length&&row.every(finite)))invalid('invalid frame row');
  const stages=pose.stages??{},keys=['hoverIn','start','end','hoverOut'];
  const progress=keys.map(k=>stages[k]);
  if(!progress.every(finite)||progress.some(v=>v<=0||v>=1)||progress.some((v,i)=>i>0&&v<=progress[i-1]))invalid('missing or unordered stages');
  const landmarks={rest:0,restEnd:total};
  for(let i=0;i<keys.length;i++)landmarks[keys[i]]=Math.round(progress[i]*total);
  const indices=[landmarks.rest,...keys.map(k=>landmarks[k]),landmarks.restEnd];
  if(indices.some((v,i)=>i>0&&v<=indices[i-1]))invalid('stages collapse after frame quantization');
  return landmarks;
}
/** Same semantic phase, regardless of 87 or 109 baked frames. */
export function summarizePosePhases(pose,perFrame){
  const marks=poseLandmarks(pose);
  if(!Array.isArray(perFrame)||perFrame.length!==pose.frames.length||!perFrame.every(v=>finite(v)&&v>=0&&v<=1))invalid('invalid per-frame coverage');
  const phases={};
  for(const [name,fromKey,toKey] of HAIR_PHASES){
    const from=marks[fromKey],to=marks[toKey],values=perFrame.slice(from,to+1);
    const max=Math.max(...values),worst=from+values.indexOf(max);
    phases[name]={from,to,worstFrame:worst,worst:+max.toFixed(5),mean:+(values.reduce((a,b)=>a+b,0)/values.length).toFixed(5)};
  }
  return {landmarks:marks,frameCount:pose.frames.length,phases};
}
