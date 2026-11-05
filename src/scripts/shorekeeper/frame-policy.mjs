/** Pure demand policy; a visible animated sky is legitimate even with VFX OFF. */
export function needsContinuousFrame({paused=false,body=false,face=false,scheduler=false,sweep=false,narrative=false,vfx=false,camera=false}={}) {
 return !paused&&!!(body||face||scheduler||sweep||narrative||vfx||camera);
}
