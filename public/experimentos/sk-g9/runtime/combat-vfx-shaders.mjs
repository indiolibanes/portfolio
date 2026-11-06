/** Shared GLSL for the R6.2 combat VFX (billboard vertex stage, screen-space face mask, tail includes). */
export const BILLBOARD_VS = `
uniform vec3 uCenter, uDirW, uHeadW; uniform float uSize, uPush, uFaceR;
varying vec2 vP; varying vec2 vD; varying vec3 vFace;
void main(){
  vP=position.xy*2.;
  mat4 mvm=viewMatrix*modelMatrix; vec4 mv=mvm*vec4(uCenter,1.);
  vec3 dv=mat3(mvm)*uDirW; vD=dv.xy/max(length(dv.xy),1e-4);
  // Screen-space face mask: head projected onto this billboard plane, in vP units (z = radius, 0 = off).
  vec4 hv=mvm*vec4(uHeadW,1.); vec2 hp=hv.xy*(mv.z/min(hv.z,-1e-3));
  vFace=vec3((hp-mv.xy)/uSize*2., hv.z<-1e-3?uFaceR/uSize*2.:0.);
  mv.z+=uPush; mv.xy+=position.xy*uSize;
  gl_Position=projectionMatrix*mv;
}`;
export const FACE_FS = `
varying vec3 vFace;
float faceMask(vec2 p){ if(vFace.z<=0.) return 1.; return smoothstep(vFace.z*.75,vFace.z*1.35,length(p-vFace.xy)); }`;
export const TAIL = `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
