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

/** G11.1 shared procedural butterfly: signed distance of the two wings (+ tail lobe) in a unit box; pass q=(abs(x),y). */
export const BUTTERFLY_GLSL = `
float bfEll(vec2 p,vec2 c,vec2 r,float a){ vec2 q=p-c; float ca=cos(a),sa=sin(a); q=vec2(ca*q.x+sa*q.y,-sa*q.x+ca*q.y); return (length(q/r)-1.)*min(r.x,r.y); }
float bfSmin(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
float bfSeg(vec2 p,vec2 a,vec2 b){ vec2 pa=p-a,ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
float bfWing(vec2 q){ float up=bfEll(q,vec2(.40,.30),vec2(.50,.31),.62), lo=bfEll(q,vec2(.28,-.30),vec2(.31,.24),-.62), tl=bfEll(q,vec2(.17,-.50),vec2(.07,.15),-.28); return bfSmin(bfSmin(up,lo,.09),tl,.05); }
float bfBody(vec2 pb){ float bd=bfSeg(pb,vec2(0.,-.50),vec2(0.,.28))-.026, hd=length(pb-vec2(0.,.36))-.05; float an=min(bfSeg(vec2(abs(pb.x),pb.y),vec2(.01,.40),vec2(.13,.66)),bfSeg(vec2(abs(pb.x),pb.y),vec2(.13,.66),vec2(.17,.68)));
  return exp(-pow(min(bd,hd)/.014,2.))*1.1+(1.-smoothstep(-.004,.004,min(bd,hd)))*.55+exp(-pow(an/.007,2.))*.7; }
`;
/** Hash / value-noise helpers (pure, no time input). */
export const NOISE_GLSL = `
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<3;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
`;
