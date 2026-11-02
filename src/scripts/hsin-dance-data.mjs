/** Decode once at load. i16 authored quaternions become Float32 buffers, never decoded per frame. */
export function decodeDanceData(data){
 if(data.encoding!=='quaternion-i16')return data;
 for(const p of Object.values(data.phrases)){
  p.frames=p.frames.map(f=>Float32Array.from(f,v=>v/32767));
  p.frames[0]=data.rest;p.frames[p.frames.length-1]=data.rest;
  p.positionFrames=p.positionFrames.map(f=>Float32Array.from(f));
  p.positionFrames[0]=data.positionRest;p.positionFrames[p.positionFrames.length-1]=data.positionRest;
 }
 data.encoding='decoded-f32';return data;
}
