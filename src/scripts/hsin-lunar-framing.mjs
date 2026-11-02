import envelope from '../data/hsin-v201-framing.json' with {type:'json'};
import {HSIN_STAGE} from './hsin-stage-config.mjs';
import {HSIN_LUNAR_PRESENTATION} from './hsin-lunar-presentation.mjs';
export {envelope as HSIN_ORIENTED_ENVELOPE};
/** Mount/resize only. Full landscape envelope; bounded peripheral crop on narrow portrait. */
export function lunarCameraFit(aspect,config=HSIN_LUNAR_PRESENTATION){
 const portrait=aspect<.82,shift=portrait?.16:.10,angle=config.cameraAzimuth*Math.PI/180,tan=Math.tan(HSIN_STAGE.fov*Math.PI/360),b=envelope.camera;
 const offset=config.cameraTargetOffset,target=[Math.cos(angle)*shift+offset[0],HSIN_STAGE.baseTargetY+offset[1],-Math.sin(angle)*shift+offset[2]];
 const halfWidth=Math.max(Math.abs(b.min[0]-shift),Math.abs(b.max[0]-shift)),halfHeight=Math.max(target[1]-b.min[1],b.max[1]-target[1]);
 const full=Math.max(halfHeight/(tan*.90),halfWidth/(tan*Math.max(.25,aspect)*.94))+Math.max(0,b.max[2])*.35;
 // The tail may crop at the periphery; face, torso and acting hands retain priority.
 const distance=portrait?Math.min(full,4.65):full;
 return {distance,target,portrait,fullEnvelopeDistance:full,peripheralCrop:full>distance};
}
