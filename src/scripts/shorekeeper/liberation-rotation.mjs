/**
 * Cinematic Liberation (CL.1): optional, non-destructive Root orientation rebase.
 * Does NOT rewrite original animation data or animate Bip001, head, face or clothing.
 * Source Burst clip is kept available as-is for visual A/B.
 */
export const BURST_ORIGINAL_IDS=Object.freeze(['SK_BURST_01_ORIGINAL','SK_BURST_02_ORIGINAL']);
export const BURST_REBASED_IDS=Object.freeze(BURST_ORIGINAL_IDS.map(id=>id.replace('_ORIGINAL','_REBASED')));

export function createRebasedBurstClip(T,model,original){
 if(!original||!BURST_ORIGINAL_IDS.includes(original.name))throw Error('CL rebase is restricted to original Burst candidates');
 if(!model?.traverse||!Array.isArray(original.tracks))throw Error('CL invalid model or animation');
 const roots=[];
 model.traverse(o=>{if(o.isBone&&o.name==='Root')roots.push(o)});
 if(roots.length!==1)throw Error('CL requires exactly one Root bone');
 const bindings=original.tracks.filter(track=>{
  const p=T.PropertyBinding.parseTrackName(track.name);
  return p.nodeName==='Root'&&p.propertyName==='quaternion'&&!p.objectName&&p.propertyIndex===undefined;
 });
 if(bindings.length!==1)throw Error('CL requires one Root.quaternion track');
 const originalTrack=bindings[0];
 if(originalTrack.values.length<8||originalTrack.values.length%4!==0||!originalTrack.validate())throw Error('CL invalid Root quaternion curve');
 const first=new T.Quaternion().fromArray(originalTrack.values,0);
 if(![first.x,first.y,first.z,first.w].every(Number.isFinite)||first.lengthSq()<1e-12)throw Error('CL nonfinite or zero initial Root rotation');
 first.normalize();
 const rest=roots[0].quaternion.clone();
 if(rest.lengthSq()<1e-12)throw Error('CL invalid Root bind quaternion');
 rest.normalize();
 // Left-multiply a CONSTANT correction to the full original quaternion curve.
 // q_rebased(t)=q_bind * inverse(q_source(0)) * q_source(t).
 // Thus q_rebased(0)=q_bind while all relative rotations remain unchanged.
 const correction=rest.clone().multiply(first.clone().invert());
 const output=original.clone();
 output.name=original.name.replace('_ORIGINAL','_REBASED');
 const track=output.tracks.find(t=>t.name===originalTrack.name);
 if(!track||track.values.length!==originalTrack.values.length)throw Error('CL failed to copy rotation track');
 const q=new T.Quaternion(),next=new T.Quaternion(),prev=new T.Quaternion();
 for(let i=0;i<track.values.length;i+=4){
  q.fromArray(originalTrack.values,i);
  if(![q.x,q.y,q.z,q.w].every(Number.isFinite)||q.lengthSq()<1e-12)throw Error('CL nonfinite quaternion at keyframe '+i/4);
  q.normalize();next.copy(correction).multiply(q).normalize();
  if(i>0&&prev.dot(next)<0)next.set(-next.x,-next.y,-next.z,-next.w);
  next.toArray(track.values,i);prev.copy(next);
 }
 if(!track.validate())throw Error('CL rebased Root track is invalid');
 const radians=2*Math.acos(Math.min(1,Math.abs(first.dot(rest))));
 return {clip:output,diagnostic:Object.freeze({source:original.name,variant:output.name,bindDeltaDegrees:Number((radians*180/Math.PI).toFixed(2)),rootKeyframes:track.values.length/4,changedTracks:['Root.quaternion'],visualQA:'PENDING'})};
}
