/** Shared standard R4 framing, also used by the optional story camera. No debug-only fit. */
export function celestialCameraFit({center=[0,1,0],height=2,aspect=1,azimuth=0,radius=3},out={position:[0,0,0],target:[0,0,0]}){
 const fov=44,r=height*Math.max(5.7,Math.hypot(radius,radius/(Math.tan(22*Math.PI/180)*Math.max(.35,aspect))));out.maxDistance=r*1.05;out.minDistance=height*.08;out.fov=fov;out.preset='celestial';out.target[0]=center[0];out.target[1]=center[1]+height*.35;out.target[2]=center[2];out.position[0]=center[0]+Math.sin(azimuth)*r;out.position[1]=out.target[1]+height*.55;out.position[2]=center[2]+Math.cos(azimuth)*r;return out;
}

/** R5 tilted/offset ring envelope, including portrait perspective. */
export function celestialCameraFitR5(options,out){return celestialCameraFit({...options,radius:3.65},out);}
