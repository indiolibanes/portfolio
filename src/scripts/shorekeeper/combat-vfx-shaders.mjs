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
/**
 * F2 FIDELIDADE butterfly (reference: the isolated butterfly plate): forewing with a pointed apex + smaller hindwing with a pointed tail,
 * torn (ragged) translucent margins, radial + branching veins, a white-hot core at the body, wings that turn edge-on into a V.
 * Needs NOISE_GLSL (h21, vn, fbm) and BUTTERFLY_GLSL (bfEll, bfSmin, bfBody). Pure functions of (position, flap, time): no state.
 */
export const BUTTERFLY_FID_GLSL = `
float bfTap(vec2 p,vec2 a,vec2 b,float ra,float rb){ vec2 pa=p-a,ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-mix(ra,rb,h); }
float bfWingF(vec2 q,float rag,float seed){
  float fw=bfSmin(bfEll(q,vec2(.36,.30),vec2(.44,.26),.72),bfTap(q,vec2(.28,.24),vec2(.84,.64),.13,.012),.10);
  float hw=bfSmin(bfEll(q,vec2(.22,-.26),vec2(.25,.19),-.55),bfTap(q,vec2(.16,-.28),vec2(.30,-.70),.085,.010),.07);
  float w=bfSmin(fw,hw,.06), rr=length(q-vec2(.03,0.));
  return w+rag*((fbm(q*6.5+seed)-.5)*.17+(vn(q*22.+seed*1.7)-.5)*.045)*smoothstep(.16,.55,rr);
}
/** screen -> wing space. flap in [.1,1] (1 = wings fully open, small = turning edge-on into a V), yaw = near/far wing asymmetry, lift = V arm rise. */
vec2 bfFlapSpace(vec2 pb,float flap,float yaw,float lift){
  float side=pb.x<0.?-1.:1., f=max(flap*(1.+yaw*side),.10), u=abs(pb.x)/f;
  return vec2(u,pb.y-lift*(1.-f)*u);
}
/** x: inside, y: margin glow, z: veins, w: translucent membrane; rr: distance to the root (for colour grading) */
vec4 bfFidShade(vec2 q,float rag,float seed,float tt,out float rr,out float wing){
  wing=bfWingF(q,rag,seed);
  float ins=1.-smoothstep(-.010,.010,wing);
  vec2 r0=q-vec2(.03,.02); float ang=atan(r0.y,r0.x); rr=length(r0);
  float wob=fbm(vec2(ang*2.3,rr*5.))*1.1;
  float v1=pow(abs(cos(ang*7.+wob)),9.)*smoothstep(.05,.28,rr)*.62;
  float v2=pow(abs(cos(ang*15.+wob*1.4)),14.)*smoothstep(.34,.60,rr)*.38;
  float vein=(v1+v2)*ins*(1.-smoothstep(.78,1.,rr));
  float edge=exp(-pow(wing/.011,2.))*(.55+.4*vn(vec2(ang*9.,tt*5.+seed)));
  float memb=ins*(.24+.40*smoothstep(.9,.05,rr)+.14*vn(q*9.+seed));
  return vec4(ins,edge,vein,memb);
}
/** embers born INSIDE the wing silhouette, expanding radially from the body while the wing erodes (prog 0..1). One wing evaluation per pixel. */
float bfEmbers(vec2 pb,float prog,float rag,float seed){
  float k=1.+1.7*prog; vec2 g=pb/k*15., id=floor(g);
  float t0=h21(id+3.1)*.75; if(prog<=t0) return 0.;
  vec2 c=(id+.2+.6*vec2(h21(id+1.7),h21(id+9.3)))/15.;
  vec2 qc=vec2(abs(c.x),c.y); if(bfWingF(qc,rag,seed)>0.) return 0.;
  float life=clamp((prog-t0)/(1.-t0),0.,1.), d=length(pb-c*k);
  return exp(-pow(d/(.010*(1.-.55*life)),2.))*smoothstep(0.,.12,life)*(1.-smoothstep(.55,1.,life));
}
`;
/** Hash / value-noise helpers (pure, no time input). */
export const NOISE_GLSL = `
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<3;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
`;
