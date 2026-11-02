/** All presentation, camera and GPU budgets live here; no Three/DOM dependency. */
export const HSIN_STAGE=Object.freeze({
 version:'2.0',model:'/assets/models/hsin/hsin-v2.0.glb',profile:'/assets/models/hsin/hsin-v2.0-profile.json',
 baseTargetY:.88,fps:30,mobileDpr:1,desktopDpr:1.25,maxPixels:1152000,fov:34,minDistance:1.05,
 rotateSpeed:.34,zoomSpeed:.65,damping:.09,minPolar:1.25,maxPolar:Math.PI/2-.025,maxAzimuth:Math.PI*.22,
 colors:{night:0x0a1430,fog:0x273b53,platform:0x27374d,ring:0xc6b28b},
});
export function pixelRatio(width,height,dpr=1,touch=false,config=HSIN_STAGE){
 if(!(width>0&&height>0))return 1;
 return Math.min(dpr,touch?config.mobileDpr:config.desktopDpr,Math.sqrt(config.maxPixels/(width*height)));
}
export function cameraFit(bounds,aspect,fov=HSIN_STAGE.fov){
 const height=bounds.max[1]-bounds.min[1],width=bounds.max[0]-bounds.min[0],tan=Math.tan(fov*Math.PI/360);
 return Math.max(height,width/Math.max(.2,aspect))/(2*tan)*1.16;
}
export function attentionHeight(distance,initial){
 const t=Math.max(0,Math.min(1,(initial-distance)/(initial-HSIN_STAGE.minDistance)));
 return HSIN_STAGE.baseTargetY+(1.39-HSIN_STAGE.baseTargetY)*t*t*(3-2*t);
}
