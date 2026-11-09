import {createRigCameraReader} from './smart-camera.mjs';
/** Camera only. Never edits Root, rest quaternions, an idle curve or the stage group.
 * Call at explicit rest/reference acquisition, never every frame during combat.
 */
export function fidelityRestFrame(T,model,{h,aspect=1,view='quarter'}={}){
 if(!['front','quarter','side'].includes(view)||!(h>0)||!(aspect>0))throw TypeError('F3 rest framing parameters');
 const reader=createRigCameraReader(T,model,h),rig=reader.read();
 const yaw=Math.atan2(rig.front[0],rig.front[2])+({front:0,quarter:Math.PI/12,side:Math.PI/2}[view]);
 const feet=Math.min(rig.anchors.rf[1],rig.anchors.lf[1]),target=[rig.anchors.pel[0],feet+.53*h,rig.anchors.pel[2]];
 const fov=34,distance=1.15*h/(2*Math.tan(fov*Math.PI/360)*Math.min(1,aspect));
 return {position:[target[0]+Math.sin(yaw)*distance,target[1]+.035*h,target[2]+Math.cos(yaw)*distance],target,fov,minDistance:h*.08,maxDistance:Math.max(h*8,distance*1.5),preset:'f3-anatomical-rest-'+view,
  evidence:{method:rig.calibration.method,bodyWrites:0,sourceIdleComparison:'PENDING',visual:'PRESENTATION_PARTIAL'}};
}
