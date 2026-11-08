/**
 * Hsin Combat R2.2 environmental effects: the pure simulation. No THREE, no DOM, no allocation per call.
 *
 * Everything on screen is an analytic function of (spawn record, combat clock): a shard at age `a` is
 * p0 + (g/k)a + (v0 - g/k)(1 - e^-ka)/k, a ripple at age `a` is a ring of radius lerp(r0, r1, ease(a/dur)). Nothing is integrated
 * per frame, so pause (same clock value), seek, restart and frame-rate drops cannot desynchronise the effects from the choreography.
 * Spawns happen on a fixed 60 Hz clock tick; between two frames the sampled hand positions are interpolated, so the spawn
 * sequence depends only on the sequence of clock values, never on wall time. Randomness is a counter-seeded hash (tick, emitter).
 *
 * The wrapper (hsin-combat-env.mjs) samples the real skeleton (palms, feet, pelvis) and owns the THREE objects; this file only
 * decides what exists, where and how bright. Budget: 8 ring slots, 56 shards, 20 glints.
 */
export const TICK=1/60;
export const CAPACITY={rings:8,shards:56,glints:20};
const MAX_TICKS=24,MANDALA=2;
const clamp01=v=>v<0?0:v>1?1:v;
const smooth=(a,b,x)=>{const u=clamp01((x-a)/(b-a));return u*u*(3-2*u);};
// Linear-light tints (the shader output is encoded to sRGB afterwards): warm gold, crimson, rose, pale gold. None reaches white.
export const TINT=[[.95,.5,.12],[.62,.05,.1],[.95,.3,.38],[1,.72,.38]];
const GOLD=0,CRIMSON=1,ROSE=2,PALE=3;
let rs=1;
const seed=(a,b)=>{rs=(Math.imul(a|0,0x9E3779B1)^Math.imul((b|0)+0x7F4A7C15,0x85EBCA6B))>>>0||1;};
const rand=()=>{rs=(rs+0x6D2B79F5)>>>0;let t=rs;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
const gauss=()=>(rand()+rand()+rand()-1.5)*2;
const f64=n=>new Float64Array(n),u8=n=>new Uint8Array(n);

export function createEnvSim({density=1}={}){
 const N=CAPACITY.shards,G=CAPACITY.glints,R=CAPACITY.rings;
 const d=Math.max(.2,Math.min(1,density));
 // shards (struct of arrays)
 const sAlive=u8(N),sKind=u8(N),sColor=u8(N),sBorn=f64(N),sLife=f64(N),sSize=f64(N),sStretch=f64(N),sK=f64(N),sGy=f64(N),sSpin=f64(N);
 const sP=f64(N*3),sV=f64(N*3);
 // glints (camera-facing four-point stars)
 const gAlive=u8(G),gColor=u8(G),gBorn=f64(G),gLife=f64(G),gSize=f64(G),gRoll=f64(G),gP=f64(G*3);
 // ripples on the floor (slots MANDALA..R-1); the mandala is derived from the events
 const rAlive=u8(R),rColor=u8(R),rBorn=f64(R),rDur=f64(R),rR0=f64(R),rR1=f64(R),rAmp=f64(R),rX=f64(R),rZ=f64(R),rSpin=f64(R);
 let rippleCursor=MANDALA;
 const ev={trailR:-1,trailL:-1,charge:-1,release:-1,floorY:.006,reverbDone:0};
 const inp={prP:f64(3),prL:f64(3),prC:f64(3),pcP:f64(3),pcL:f64(3),pcC:f64(3),s:0,ps:0,gap:.24,footX:f64(2),footZ:f64(2),planted:u8(2),mid:f64(3),have:0,rd:f64(3),ro:f64(3)};
 const state={last:-1,tick:-1,sm:0,smPrev:0,slope:0,cool:f64(2).fill(-9),stats:{ripples:0,shards:0,glints:0,bursts:0,transfers:0}};
 const cur={pr:f64(3),pl:f64(3),vr:f64(3),vl:f64(3),c:f64(3),s:0};

 function reset(){
  sAlive.fill(0);gAlive.fill(0);rAlive.fill(0);ev.trailR=ev.trailL=ev.charge=ev.release=-1;ev.reverbDone=0;rippleCursor=MANDALA;
  state.last=-1;state.tick=-1;state.sm=state.smPrev=state.slope=0;state.cool.fill(-9);inp.have=0;
  for(const k of Object.keys(state.stats))state.stats[k]=0;
 }
 const freeShard=()=>{for(let i=0;i<N;i++)if(!sAlive[i])return i;return -1;};
 const freeGlint=()=>{for(let i=0;i<G;i++)if(!gAlive[i])return i;return -1;};
 function shard(t,kind,color,px,py,pz,vx,vy,vz,k,gy,life,size,stretch,spin=0){
  const i=freeShard();if(i<0)return -1;state.stats.shards++;
  sAlive[i]=1;sKind[i]=kind;sColor[i]=color;sBorn[i]=t;sLife[i]=life;sSize[i]=size;sStretch[i]=stretch;sK[i]=k;sGy[i]=gy;sSpin[i]=spin;
  sP[i*3]=px;sP[i*3+1]=py;sP[i*3+2]=pz;sV[i*3]=vx;sV[i*3+1]=vy;sV[i*3+2]=vz;return i;
 }
 function glint(t,color,px,py,pz,life,size,roll=0){
  const i=freeGlint();if(i<0)return;state.stats.glints++;gAlive[i]=1;gColor[i]=color;gBorn[i]=t;gLife[i]=life;gSize[i]=size;gRoll[i]=roll;gP[i*3]=px;gP[i*3+1]=py;gP[i*3+2]=pz;
 }
 function ripple(t,x,z,r0,r1,dur,amp,color,spin=0){
  const i=rippleCursor;rippleCursor=rippleCursor+1>=R?MANDALA:rippleCursor+1;
  rAlive[i]=1;rColor[i]=color;rBorn[i]=t;rDur[i]=dur;rR0[i]=r0;rR1[i]=r1;rAmp[i]=amp;rX[i]=x;rZ[i]=z;rSpin[i]=spin;state.stats.ripples++;
 }
 /** Weight on a foot is verifiable only when the foot is planted and the pelvis is displaced towards it. */
 function loadedFoot(minShift){
  const s=inp.s;if(Math.abs(s)<minShift)return -1;const f=s>0?1:0;return inp.planted[f]?f:-1; // 1 = Hsin's left
 }
 function footRipple(t,f,color,amp){
  if(f<0||t-state.cool[f]<.5)return;state.cool[f]=t;
  const k=Math.min(1,Math.abs(inp.s)*8);
  ripple(t,inp.footX[f],inp.footZ[f],.06,.22+.3*k,.8+.25*k,Math.max(.45,Math.min(1,amp*(.55+.6*k))),color,(f?1:-1)*.8);
  // a few fragments lifted from the ring edge, close to the stone
  seed(Math.round(t*1000),90+f);const n=Math.round((3+3*k)*d);
  for(let j=0;j<n;j++){
   const a=rand()*6.2832,rr=.07+.05*rand();
   shard(t,0,color===ROSE?ROSE:GOLD,inp.footX[f]+Math.cos(a)*rr,ev.floorY+.004,inp.footZ[f]+Math.sin(a)*rr,Math.cos(a)*.08,.1+.1*rand(),Math.sin(a)*.08,1.8,-.22,.5+.25*rand(),.007+.006*rand(),2.2);
  }
 }
 /** Marker events. `now` carries the freshly sampled pose at the marker: {pr,pl,vr,vl,c,s,...} (same layout as cur). */
 function event(name,t,now){
  const bursts=(n,x,y,z,dx,dy,dz,spread,speed,colors,life,size,stretch,gy,k)=>{
   seed(Math.round(t*1000),7);const m=Math.max(1,Math.round(n*d));
   for(let j=0;j<m;j++){
    const sp=speed*(.65+.7*rand()),px=gauss()*spread,py=gauss()*spread,pz=gauss()*spread;
    shard(t,0,colors[(rand()*colors.length)|0],x+gauss()*.01,y+gauss()*.01,z+gauss()*.01,dx*sp+px*sp,dy*sp+py*sp,dz*sp+pz*sp,k,gy,life*(.8+.4*rand()),size*(.8+.5*rand()),stretch);
   }
   state.stats.bursts++;
  };
  const unit=(v,out)=>{const l=Math.hypot(v[0],v[1],v[2]);if(l<.15){out[0]=0;out[1]=.3;out[2]=1;return;}out[0]=v[0]/l;out[1]=v[1]/l;out[2]=v[2]/l;};
  const u=[0,0,0];
  switch(name){
   case 'trail':ev.trailR=t;break;
   case 'trail-left':ev.trailL=t;break;
   case 'arc':{
    unit(now.vr,u);bursts(8,now.pr[0],now.pr[1],now.pr[2],u[0],u[1],u[2],.45,.7,[GOLD,GOLD,CRIMSON],.5,.014,2.6,-.1,2.4);
    glint(t,PALE,now.pr[0],now.pr[1],now.pr[2],.24,.05,.2);
    footRipple(t,loadedFoot(.02),GOLD,.85);break;}
   case 'arc-left':{
    unit(now.vl,u);u[1]=u[1]*.5+.8;const l=Math.hypot(u[0],u[1],u[2]);u[0]/=l;u[1]/=l;u[2]/=l;
    bursts(7,now.pl[0],now.pl[1],now.pl[2],u[0],u[1],u[2],.4,.5,[ROSE,GOLD,ROSE],.65,.01,3,.14,1.7);
    glint(t,ROSE,now.pl[0],now.pl[1],now.pl[2],.26,.042,.7);
    footRipple(t,loadedFoot(.02),ROSE,.8);break;}
   case 'charge':ev.charge=t;break;
   case 'ring':{
    ev.release=t;inp.ro[0]=now.pr[0];inp.ro[1]=now.pr[1];inp.ro[2]=now.pr[2];
    const dx=inp.rd[0],dy=inp.rd[1],dz=inp.rd[2];
    // directional pulse: a tight fan of streaks along the launch direction, from the dominant palm
    seed(Math.round(t*1000),11);const n=Math.max(4,Math.round(14*d));
    // two vectors perpendicular to the direction
    let ax=0,ay=1,az=0;if(Math.abs(dy)>.9){ax=1;ay=0;}
    let bx=dy*az-dz*ay,by=dz*ax-dx*az,bz=dx*ay-dy*ax;const bl=Math.hypot(bx,by,bz)||1;bx/=bl;by/=bl;bz/=bl;
    const cx=dy*bz-dz*by,cy=dz*bx-dx*bz,cz=dx*by-dy*bx;
    for(let j=0;j<n;j++){
     const sp=1.7+1,a=rand()*6.2832,w=Math.tan(.12)*rand(),sx=dx+(bx*Math.cos(a)+cx*Math.sin(a))*w,sy=dy+(by*Math.cos(a)+cy*Math.sin(a))*w,sz=dz+(bz*Math.cos(a)+cz*Math.sin(a))*w;
     const v=sp*(.62+.38*rand());
     shard(t,0,rand()<.28?ROSE:rand()<.5?PALE:GOLD,now.pr[0]+dx*.04*j/n,now.pr[1]+dy*.04*j/n,now.pr[2]+dz*.04*j/n,sx*v,sy*v,sz*v,3.2,0,.3+.12*rand(),.011,5.5);
    }
    glint(t,PALE,now.pr[0],now.pr[1],now.pr[2],.2,.085,.1);
    glint(t,GOLD,now.pr[0]+dx*.16,now.pr[1]+dy*.16,now.pr[2]+dz*.16,.26,.05,.8);
    ripple(t,now.mid[0],now.mid[2],.15,1.15,1.05,.75,PALE,.4);
    footRipple(t,loadedFoot(.02),PALE,.9);state.stats.bursts++;break;}
   case 'clear':reset();break;
   default:break;
  }
 }
 /** Free everything whose life has ended at clock `t`, so pool pressure depends only on the clock, not on when frames were drawn. */
 function sweep(t){
  for(let i=0;i<N;i++)if(sAlive[i]&&t-sBorn[i]>=sLife[i])sAlive[i]=0;
  for(let i=0;i<G;i++)if(gAlive[i]&&t-gBorn[i]>=gLife[i])gAlive[i]=0;
  for(let i=MANDALA;i<R;i++)if(rAlive[i]&&t-rBorn[i]>=rDur[i])rAlive[i]=0;
 }
 const lerp3=(a,b,f,o)=>{o[0]=a[0]+(b[0]-a[0])*f;o[1]=a[1]+(b[1]-a[1])*f;o[2]=a[2]+(b[2]-a[2])*f;};
 /** Per-tick emitters. */
 function emit(tt,k,pr,pl,vr,vl,c){
  const dens=d;
  // Basic 01: low horizontal gold-crimson trail with a short dispersion; the dissipation settles downwards
  if(ev.trailR>=0&&tt>=ev.trailR&&tt<ev.trailR+.62){
   seed(k,1);
   if(rand()<.62*dens)shard(tt,0,rand()<.3?CRIMSON:GOLD,pr[0]+gauss()*.01,pr[1]+gauss()*.01,pr[2]+gauss()*.01,vr[0]*.15+gauss()*.03,vr[1]*.15+gauss()*.03,vr[2]*.15+gauss()*.03,2.4,-.06,.34+.2*rand(),.01+.008*rand(),2.4);
  }
  // Basic 02: lighter and rising, rose-gold, longer and thinner
  if(ev.trailL>=0&&tt>=ev.trailL&&tt<ev.trailL+.62){
   seed(k,2);
   if(rand()<.5*dens)shard(tt,0,rand()<.55?ROSE:GOLD,pl[0]+gauss()*.008,pl[1]+gauss()*.008,pl[2]+gauss()*.008,vl[0]*.12+gauss()*.025,vl[1]*.12+.16+gauss()*.025,vl[2]*.12+gauss()*.025,1.6,.12,.55+.25*rand(),.007+.006*rand(),3);
  }
  if(ev.charge>=0&&tt>=ev.charge){
   const age=tt-ev.charge,toRelease=ev.release<0||tt<ev.release;
   if(toRelease){
    // Concentration: a few small glints close to the palms, the surroundings stay quiet
    if(age<.75){seed(k,3);let alive=0;for(let i=0;i<G;i++)alive+=gAlive[i];
     if(alive<3&&rand()<7/60*dens){const rr=Math.max(.04,inp.gap*.5);glint(tt,rand()<.5?PALE:GOLD,c[0]+gauss()*rr*.6,c[1]+gauss()*rr*.6,c[2]+gauss()*rr*.6,.38,.016+.012*rand(),rand()*1.5);}
    }else{
     // Accumulation: small bodies of light converge on the sphere, faster and denser as it fills
     seed(k,4);const build=smooth(0,.7,age-.75);let alive=0;for(let i=0;i<N;i++)alive+=sAlive[i]&&sKind[i]===1?1:0;
     if(alive<Math.round(34*dens)&&rand()<(7+30*build)/60*dens){
      const a=rand()*6.2832,z=rand()*2-1,r=Math.sqrt(1-z*z),R0=.34+.2*rand(),pick=rand();
      shard(tt,1,pick<.7?GOLD:pick<.9?ROSE:CRIMSON,c[0],c[1],c[2],Math.cos(a)*r*R0,z*R0,Math.sin(a)*r*R0,0,0,.5+.28*rand(),.011+.007*rand(),2.4,(rand()<.5?-1:1)*(.9+rand()));
     }
    }
   }else{
    // Reverberation: embers lift from the mandala's outer line while the field answers
    const age2=tt-ev.release;
    if(age2>=.15&&age2<.95){seed(k,5);
     if(rand()<11/60*dens){const a=rand()*6.2832,rad=mandalaRadius(1,tt);
      shard(tt,0,rand()<.6?GOLD:ROSE,inp.mid[0]+Math.cos(a)*rad,ev.floorY+.01,inp.mid[2]+Math.sin(a)*rad,Math.cos(a)*.04,.2+.1*rand(),Math.sin(a)*.04,.6,.05,.9+.4*rand(),.008+.004*rand(),2.2);}
    }
    if(!(ev.reverbDone&1)&&age2>=.3){ev.reverbDone|=1;ripple(ev.release+.3,inp.mid[0],inp.mid[2],.2,1,.95,.5,ROSE,-.5);}
    if(!(ev.reverbDone&2)&&age2>=.62){ev.reverbDone|=2;ripple(ev.release+.62,inp.mid[0],inp.mid[2],.2,.9,.9,.32,GOLD,.5);}
   }
  }
 }
 function mandalaRadius(i,t){
  const base=i?.94:.62;if(ev.release<0||t<ev.release)return base;
  const u=t-ev.release;return i?base+.5*smooth(0,.9,u):base-.08*smooth(0,.5,u);
 }
 function mandalaBrightness(t){
  if(ev.charge<0)return 0;
  const fadeIn=smooth(ev.charge+.6,ev.charge+1.35,t);if(fadeIn<=0)return 0;
  if(ev.release<0||t<ev.release)return fadeIn*.34*(.8+.2*Math.sin(6.9*(t-ev.charge)));
  const u=t-ev.release;return (.34+.5*Math.exp(-u*6))*(1-smooth(.95,1.75,u));
 }
 /**
  * Advance the effects to the combat clock `t`. `pose` carries the freshly sampled skeleton:
  * {pr,pl,c (xyz), s (pelvis lateral offset, + = Hsin's left), gap, footX/Z[2], planted[2], mid (feet midpoint), rd (launch direction)}.
  */
 function update(t,pose){
  const first=state.last<0||t<state.last-1e-9;
  if(first&&state.last>=0)reset();
  // roll the sampled inputs
  inp.prP.set(inp.pcP);inp.prL.set(inp.pcL);inp.prC.set(inp.pcC);inp.ps=inp.s;
  inp.pcP.set(pose.pr);inp.pcL.set(pose.pl);inp.pcC.set(pose.c);inp.s=pose.s;inp.gap=pose.gap;
  inp.have=1;inp.footX.set(pose.footX);inp.footZ.set(pose.footZ);inp.planted.set(pose.planted);inp.mid.set(pose.mid);inp.rd.set(pose.rd);
  if(first){inp.prP.set(inp.pcP);inp.prL.set(inp.pcL);inp.prC.set(inp.pcC);inp.ps=inp.s;state.last=t;state.tick=Math.floor(t/TICK);state.sm=state.smPrev=inp.s;return;}
  if(t>state.last){
   const t0=state.last;let k=state.tick+1;const kEnd=Math.floor(t/TICK+1e-9);
   if(kEnd-k>MAX_TICKS){k=kEnd-MAX_TICKS;}
   for(;k<=kEnd;k++){
    const tt=k*TICK,f=clamp01((tt-t0)/(t-t0));sweep(tt);
    lerp3(inp.prP,inp.pcP,f,cur.pr);lerp3(inp.prL,inp.pcL,f,cur.pl);lerp3(inp.prC,inp.pcC,f,cur.c);
    const dtt=Math.max(1e-3,t-t0);for(let j=0;j<3;j++){cur.vr[j]=(inp.pcP[j]-inp.prP[j])/dtt;cur.vl[j]=(inp.pcL[j]-inp.prL[j])/dtt;}
    cur.s=inp.ps+(inp.s-inp.ps)*f;
    // weight transfer: a verified peak of the pelvis shift over a planted foot makes a ripple under that foot
    state.smPrev=state.sm;state.sm+=(cur.s-state.sm)*.35;const slope=state.sm-state.smPrev;
    if(state.slope*slope<0&&Math.abs(state.sm)>.045){const f2=state.sm>0?1:0;if(inp.planted[f2]){const old=inp.s;inp.s=state.sm;footRipple(tt,f2,f2?ROSE:GOLD,.7);inp.s=old;state.stats.transfers++;}}
    if(Math.abs(slope)>1e-5)state.slope=slope;
    emit(tt,k,cur.pr,cur.pl,cur.vr,cur.vl,cur.c);
   }
   state.tick=kEnd;
  }
  sweep(t);state.last=t;
 }
 /** Write the instances for the clock `t` into the wrapper's arrays. Returns counts via `out`. */
 function write(t,view,out){
  const {ringM,ringC,shardM,shardC,glintM,glintC}=out;let nr=0,ns=0,ng=0;
  // mandala: two seal rings on the floor between the feet
  const mb=mandalaBrightness(t);
  if(mb>.004&&inp.have===1){
   for(let i=0;i<2;i++){
    const rad=mandalaRadius(i,t),a=(i?-.22:.3)*(t-ev.charge)+i*.5,cs=Math.cos(a)*rad,sn=Math.sin(a)*rad,b=mb*(i?.7:1),o=nr*16,tint=TINT[GOLD];
    ringM[o]=cs;ringM[o+1]=0;ringM[o+2]=-sn;ringM[o+3]=0;ringM[o+4]=0;ringM[o+5]=1;ringM[o+6]=0;ringM[o+7]=0;ringM[o+8]=sn;ringM[o+9]=0;ringM[o+10]=cs;ringM[o+11]=0;
    ringM[o+12]=inp.mid[0];ringM[o+13]=ev.floorY;ringM[o+14]=inp.mid[2];ringM[o+15]=1;
    ringC[nr*3]=tint[0]*b;ringC[nr*3+1]=tint[1]*b;ringC[nr*3+2]=tint[2]*b;nr++;
   }
  }
  for(let i=MANDALA;i<R;i++){
   if(!rAlive[i])continue;const age=t-rBorn[i];
   if(age<0||age>=rDur[i])continue;
   const u=age/rDur[i],e=1-(1-u)*(1-u),rad=rR0[i]+(rR1[i]-rR0[i])*e,a=rSpin[i]*age,cs=Math.cos(a)*rad,sn=Math.sin(a)*rad,b=rAmp[i]*Math.pow(1-u,1.5)*smooth(0,.06,u)*.62,o=nr*16,tint=TINT[rColor[i]];
   ringM[o]=cs;ringM[o+1]=0;ringM[o+2]=-sn;ringM[o+3]=0;ringM[o+4]=0;ringM[o+5]=1;ringM[o+6]=0;ringM[o+7]=0;ringM[o+8]=sn;ringM[o+9]=0;ringM[o+10]=cs;ringM[o+11]=0;
   ringM[o+12]=rX[i];ringM[o+13]=ev.floorY;ringM[o+14]=rZ[i];ringM[o+15]=1;
   ringC[nr*3]=tint[0]*b;ringC[nr*3+1]=tint[1]*b;ringC[nr*3+2]=tint[2]*b;nr++;
  }
  for(let i=0;i<N;i++){
   if(!sAlive[i])continue;const age=t-sBorn[i];
   if(age<0||age>=sLife[i])continue;
   const u=age/sLife[i];let px,py,pz,vx,vy,vz,b,sz;
   if(sKind[i]===1){
    // converge on the live sphere centre, ease-in, with a short spiral
    const e=Math.pow(u,1.7),rem=1-e,ang=sSpin[i]*e,cs=Math.cos(ang),sn=Math.sin(ang),ox=sV[i*3],oy=sV[i*3+1],oz=sV[i*3+2];
    px=inp.pcC[0]+(ox*cs-oz*sn)*rem;py=inp.pcC[1]+oy*rem;pz=inp.pcC[2]+(ox*sn+oz*cs)*rem;
    const de=1.7*Math.pow(u,.7)/sLife[i];vx=-(ox)*de;vy=-(oy)*de;vz=-(oz)*de;
    b=smooth(0,.15,u)*(1-smooth(.9,1,u))*.8;sz=sSize[i]*(1-.55*e);
   }else{
    const k=sK[i],g=sGy[i],ek=Math.exp(-k*age),gk=g/k;
    px=sP[i*3]+(sV[i*3]*(1-ek))/k;pz=sP[i*3+2]+(sV[i*3+2]*(1-ek))/k;
    py=sP[i*3+1]+gk*age+(sV[i*3+1]-gk)*(1-ek)/k;
    vx=sV[i*3]*ek;vz=sV[i*3+2]*ek;vy=gk+(sV[i*3+1]-gk)*ek;
    b=smooth(0,.12,u)*(1-smooth(.55,1,u))*.78;sz=sSize[i]*(.6+.4*smooth(0,.2,u))*(1-.5*smooth(.7,1,u));
   }
   // orientation: long axis along the velocity
   let yx=vx,yy=vy,yz=vz,yl=Math.hypot(yx,yy,yz);if(yl<.02){yx=0;yy=1;yz=0;yl=1;}yx/=yl;yy/=yl;yz/=yl;
   let rx=0,ry=0,rz=1;if(Math.abs(yz)>.95){rx=1;rz=0;}
   let xx=yy*rz-yz*ry,xy=yz*rx-yx*rz,xz=yx*ry-yy*rx;const xl=Math.hypot(xx,xy,xz)||1;xx/=xl;xy/=xl;xz/=xl;
   const zx=xy*yz-xz*yy,zy=xz*yx-xx*yz,zz=xx*yy-xy*yx,st=sStretch[i]*.6,o=ns*16,tint=TINT[sColor[i]];
   shardM[o]=xx*sz;shardM[o+1]=xy*sz;shardM[o+2]=xz*sz;shardM[o+3]=0;
   shardM[o+4]=yx*sz*st;shardM[o+5]=yy*sz*st;shardM[o+6]=yz*sz*st;shardM[o+7]=0;
   shardM[o+8]=zx*sz;shardM[o+9]=zy*sz;shardM[o+10]=zz*sz;shardM[o+11]=0;
   shardM[o+12]=px;shardM[o+13]=py;shardM[o+14]=pz;shardM[o+15]=1;
   shardC[ns*3]=tint[0]*b;shardC[ns*3+1]=tint[1]*b;shardC[ns*3+2]=tint[2]*b;ns++;
  }
  for(let i=0;i<G;i++){
   if(!gAlive[i])continue;const age=t-gBorn[i];
   if(age<0||age>=gLife[i])continue;
   const u=age/gLife[i],env=Math.sin(Math.PI*u),s=gSize[i]*Math.pow(env,.6),b=Math.pow(env,.5)*.85,cr=Math.cos(gRoll[i]+u*.6),sr=Math.sin(gRoll[i]+u*.6),o=ng*16,tint=TINT[gColor[i]];
   glintM[o]=(view.rx*cr+view.ux*sr)*s;glintM[o+1]=(view.ry*cr+view.uy*sr)*s;glintM[o+2]=(view.rz*cr+view.uz*sr)*s;glintM[o+3]=0;
   glintM[o+4]=(-view.rx*sr+view.ux*cr)*s;glintM[o+5]=(-view.ry*sr+view.uy*cr)*s;glintM[o+6]=(-view.rz*sr+view.uz*cr)*s;glintM[o+7]=0;
   glintM[o+8]=view.fx;glintM[o+9]=view.fy;glintM[o+10]=view.fz;glintM[o+11]=0;
   glintM[o+12]=gP[i*3];glintM[o+13]=gP[i*3+1];glintM[o+14]=gP[i*3+2];glintM[o+15]=1;
   glintC[ng*3]=tint[0]*b;glintC[ng*3+1]=tint[1]*b;glintC[ng*3+2]=tint[2]*b;ng++;
  }
  out.rings=nr;out.shards=ns;out.glints=ng;return out;
 }
 const active=()=>{let n=0;for(let i=0;i<N;i++)n+=sAlive[i];for(let i=0;i<G;i++)n+=gAlive[i];for(let i=MANDALA;i<R;i++)n+=rAlive[i];return n+(ev.charge>=0&&ev.release<0?1:0)+(ev.release>=0?1:0);};
 return {event,update,write,reset,active,state,ev,inp,mandalaBrightness};
}
