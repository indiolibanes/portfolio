import {claimCameraOwner} from './camera-ownership.mjs';
/** Optional small orbit with full body/feet visible, never a substitute for body recovery. */
export function createComboCamera(stage,{center=[0,1,0],height=2}={}){
 let saved=null,release=null,enabled=true,damping=true;
 const stop=()=>{if(!release)return;stage.restoreCamera(saved);stage.orbit.enabled=enabled;stage.orbit.enableDamping=damping;release();release=null;saved=null;};
 return {start(){stop();release=claimCameraOwner(stage,'combo');saved=stage.cameraConfig();enabled=stage.orbit.enabled;damping=stage.orbit.enableDamping;stage.orbit.enabled=false;stage.orbit.enableDamping=false;},sample(u){if(!release)return;const a=.13*Math.sin(Math.max(0,Math.min(1,u))*Math.PI*2),r=height*3.15;stage.camera.fov=34;stage.camera.updateProjectionMatrix();stage.camera.position.set(center[0]+Math.sin(a)*r,center[1]+height*.23,center[2]+Math.cos(a)*r);stage.orbit.target.set(center[0],center[1]+height*.23,center[2]);},stop,get active(){return !!release;}};
}
