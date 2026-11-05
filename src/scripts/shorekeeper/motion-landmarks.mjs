/** Numeric observations only. No game event, scene floor or PSA-frame inference. */
export function summarizeMotionAudit(trace) {
 const rows=trace.rows;
 if(!rows?.length||!['Root','Bip001'].every(name=>rows.every(r=>r.bones[name])))throw Error('Complete motion trace required');
 const observation=(kind,row)=>({kind,clipId:trace.clipId,clipHash:trace.clipHash,variant:trace.variant,fps:trace.fps,sampleFrame:row.sampleFrame,sourceFrame:row.sourceFrame,clipTime:row.clipTime,sequenceTime:null,provenance:'MEASURED_GLB_SAMPLE',confidence:'NUMERIC_ONLY_NOT_CANONICAL',calibration:trace.calibration.confidence??trace.calibration.evidence});
 const extremum=(value,smaller=false)=>rows.reduce((a,b)=>(smaller?value(b)<value(a):value(b)>value(a))?b:a);
 const pelvis=trace.calibration.pelvis??'Bip001Pelvis';
 const handDistance=r=>Math.hypot(...r.bones[trace.calibration.leftHand??'Bip001LHand'].worldPosition.map((v,i)=>v-r.bones[trace.calibration.rightHand??'Bip001RHand'].worldPosition[i]));
 const first=rows[0],last=rows.at(-1),peak=extremum(r=>r.bones[pelvis].worldPosition[1]);
 return {
  clipId:trace.clipId,clipHash:trace.clipHash,variant:trace.variant,fps:trace.fps,duration:trace.duration,
  orientation:Object.fromEntries(['Root','Bip001'].map(name=>[name,{
   initialForward:first.bones[name].forward,finalForward:last.bones[name].forward,
   initialYawDeg:first.bones[name].yaw===null?null:first.bones[name].yaw*180/Math.PI,
   finalYawDeg:last.bones[name].yaw===null?null:last.bones[name].yaw*180/Math.PI,
   yawDeltaDeg:first.bones[name].yawUnwrapped===null||last.bones[name].yawUnwrapped===null?null:(last.bones[name].yawUnwrapped-first.bones[name].yawUnwrapped)*180/Math.PI,
   path3DDeg:last.bones[name].rotationPathRadians*180/Math.PI
  }])),
  observations:[observation('CLIP_START',first),observation('PELVIS_HEIGHT_MAX',peak),observation('HAND_SEPARATION_MIN',extremum(handDistance,true)),observation('CLIP_END',last)],
  soles:Object.fromEntries(['L','R'].map(side=>[side,{
   minClearance:Math.min(...rows.map(r=>r.soles[side].clearance)),maxClearance:Math.max(...rows.map(r=>r.soles[side].clearance)),
   firstProxyContact:trace.contacts[side][0]?.firstSample??null,sceneFloor:'PENDING',canonicalFootContact:null
  }])),
  semanticMarkers:[],identity:'MANUAL_QA_PENDING'
 };
}
