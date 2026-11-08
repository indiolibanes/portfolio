/**
 * Hsin Combat R2.1 — authored score (pure data and curves, no three.js, no rig).
 *
 * The R2.0.1 anatomical contract is untouched: arms are still driven by hand targets in the torso frame through the
 * hinge solver, and every limit in scripts/qa-hsin-combat-arms.mjs still applies. R2.1 changes what is authored:
 *   - body leads the arm: head fixes the direction, hips transfer weight, spine winds, only then the hand arcs;
 *   - Basic 01 is a low outward-to-inward crescent (right hand); Basic 02 is a rising crescent (left hand) with a
 *     different anticipation (a drop, not a coil) and its own weight transfer;
 *   - per-channel timing instead of one easing: pole leads the hand, palm lags it, hips lead the spine;
 *   - Skill: palms face each other (neutral forearm rotation) instead of a palm-up left hand, which hit the 70° supination
 *     limit in R2.0.1; the sphere is sized at runtime from the hands that actually form it;
 *   - secondary motion is driven per group (hair by head and torso, sleeves by the hand that carries them, tail by hips).
 * Conventions (torso frame): yaw/hip + = towards Hsin's left; lean + = forward; headPitch + = chin down.
 * Arm units: metres from the shoulder, [out (away from midline), up, forward].
 */
export const SECONDS=8.4;
export const PHASES=[['PREPARATION',0],['BASIC',1.5],['SKILL',3.6],['RECOVERY',6],['COMPLETE',8.4]];
// Events: trails start before the hand arrives; impact markers are unchanged so R2 lab contracts hold.
export const MARKERS=[['energy',.8],['trail',1.8],['arc',2.2],['trail-left',2.78],['arc-left',3.32],['charge',3.95],['ring',5.45],['recovery',6]];

/** Monotone cubic Hermite, zero slope at the ends and at extrema: C1, no overshoot, no stop-and-go at every key. */
export function pchip(xs,ys,t){
 const n=xs.length;if(t<=xs[0])return ys[0];if(t>=xs[n-1])return ys[n-1];let i=0;while(i<n-2&&t>xs[i+1])i++;
 const h=[],d=[];for(let j=0;j<n-1;j++){h[j]=xs[j+1]-xs[j];d[j]=(ys[j+1]-ys[j])/h[j];}
 const m=j=>{if(j===0||j===n-1)return 0;if(d[j-1]*d[j]<=0)return 0;const w1=2*h[j]+h[j-1],w2=h[j]+2*h[j-1];return (w1+w2)/(w1/d[j-1]+w2/d[j]);};
 const u=(t-xs[i])/h[i],u2=u*u,u3=u2*u;return (2*u3-3*u2+1)*ys[i]+(u3-2*u2+u)*h[i]*m(i)+(-2*u3+3*u2)*ys[i+1]+(u3-u2)*h[i]*m(i+1);
}
const clampT=t=>Math.max(0,Math.min(SECONDS,t));
const smooth=(a,b,x)=>{const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);};

/* ---------- torso, hips, head ---------- */
// [t, yaw°, hip m, sink m, lean°, headYaw°, headPitch°]
export const TORSO_FIELDS=['yaw','hip','sink','lean','headYaw','headPitch'];
export const TORSO_KEYS=[
 [0,0,0,0,0,0,0],
 [.5,-2,-.01,-.012,1,0,0],
 [.8,-4,-.02,-.028,1.5,0,1],
 // Basic 01: the head fixes the direction first, hips load the right leg, the spine winds, the right shoulder recedes.
 [1.2,-9,-.04,-.045,2,6,0],
 [1.55,-20,-.062,-.06,-1,12,0],
 // Hips lead: weight crosses to the left leg before the hand arrives, the spine follows, then the impact settles.
 [1.85,-8,-.02,-.05,2,10,0],
 [2.1,19,.062,-.04,5,4,0],
 [2.2,22,.066,-.044,4.5,3,0],
 [2.5,15,.052,-.042,3,1,0],
 // Basic 02: a quick drop (not a coil) on the already loaded left leg, then the drive across to the right.
 [2.65,17,.06,-.062,1,-6,0],
 [2.88,5,.03,-.05,2,-12,0],
 [3.14,-18,-.062,-.046,4,-6,0],
 [3.3,-22,-.066,-.05,3.5,-5,0],
 [3.7,-5,-.025,-.03,2,0,0],
 // Skill: gaze follows the hands, spine gathers, coil on the right leg, release thrusts through the left.
 [4.0,-2,-.02,-.04,3,0,5],
 [4.5,0,0,-.05,4,0,8],
 [5.0,0,.005,-.06,3,0,6],
 [5.15,-7,-.028,-.06,1,4,2],
 [5.5,11,.05,-.035,6,5,-1],
 [5.75,14,.058,-.034,5,4,-1],
 [6,8,.028,-.026,3,3,0],
 [7,-2,0,-.008,1,0,0],
 [8.4,0,0,0,0,0,0],
];
// Seconds a field is sampled ahead of (+) or behind (-) the key clock: hips initiate, the head leads, the lean trails.
export const TORSO_LEAD={yaw:.03,hip:.07,sink:.05,lean:-.03,headYaw:.1,headPitch:.06};
const torsoXs=TORSO_KEYS.map(k=>k[0]);
export function torso(t,out={}){
 TORSO_FIELDS.forEach((field,i)=>{out[field]=pchip(torsoXs,TORSO_KEYS.map(k=>k[i+1]),clampT(t+TORSO_LEAD[field]));});
 return out;
}

/* ---------- arms ---------- */
const mixIntent=(a,b,w)=>({to:a.to.map((v,i)=>v+(b.to[i]-v)*w),pole:a.pole.map((v,i)=>v+(b.pole[i]-v)*w),palm:a.palm.map((v,i)=>v+(b.palm[i]-v)*w),ext:a.ext+(b.ext-a.ext)*w});
/** Timing offsets per channel: the elbow direction leads the hand, the wrist orientation trails it. */
export const ARM_LEAD={to:0,pole:.05,palm:-.03,ext:-.03};

/**
 * @param restIntent per-side hand/pole/palm at the reference pose (measured from the rig)
 * @param halfWidth half the shoulder distance in metres (measured); sphere hands are placed relative to the midline
 */
export function createArmScore({restIntent,halfWidth}){
 const GUARD={to:[.08,-.22,.20],pole:[.55,-.75,-.35],palm:[-.8,-.4,.2],ext:0};
 const LOW_GUARD={to:[.10,-.26,.14],pole:[.55,-.75,-.35],palm:[-.7,-.6,.2],ext:0};
 const GUARD2={to:[.09,-.24,.17],pole:[.55,-.75,-.35],palm:[-.75,-.5,.2],ext:0};
 // Basic 01 (right): wind low and slightly behind, swing out with the elbow ahead, curve in and forward, settle.
 const WIND_R={to:[.20,-.30,.02],pole:[.55,-.45,-.7],palm:[-.4,-.85,.15],ext:0};
 const ARC_OUT_R={to:[.33,-.17,.12],pole:[.7,-.5,-.45],palm:[-.2,-.95,.1],ext:4};
 const NEAR_R={to:[.25,-.12,.26],pole:[.5,-.8,-.3],palm:[-.1,-1,.05],ext:8};
 const APEX_R={to:[.17,-.10,.32],pole:[.45,-.85,-.25],palm:[0,-1,0],ext:12};
 const SETTLE_R={to:[.13,-.15,.28],pole:[.5,-.8,-.3],palm:[-.3,-.9,.1],ext:5};
 // The left arm braces: it counterbalances the swing, close to the chest.
 const L_BRACE={to:[.10,-.25,.16],pole:[.5,-.75,-.3],palm:[-.6,-.7,.2],ext:0};
 const L_BRACE2={to:[.12,-.22,.20],pole:[.5,-.75,-.3],palm:[-.65,-.6,.25],ext:0};
 // Basic 02 (left): a rising crescent. Low and out, then up and forward, elbow high and out, palm turned in (thumb up).
 const L_WIND={to:[.22,-.32,.02],pole:[.55,-.45,-.7],palm:[-.4,-.85,.15],ext:0};
 const L_ARC={to:[.35,-.22,.05],pole:[.8,-.2,-.5],palm:[-.4,-.7,.3],ext:2};
 const L_NEAR={to:[.30,-.08,.22],pole:[.75,-.25,-.5],palm:[-.35,-.8,.3],ext:6};
 const L_APEX={to:[.22,.01,.30],pole:[.72,-.25,-.45],palm:[-.2,-.9,.3],ext:8};
 const L_SETTLE={to:[.17,-.06,.27],pole:[.6,-.20,-.45],palm:[-.4,-.8,.3],ext:3};
 // Skill: hands hold a sphere between them, palms facing (neutral forearm rotation, no supination demand).
 // out is measured from the shoulder joint, which sits halfWidth from the midline: a hand gap/2 from the midline is gap/2-halfWidth out.
 const sphere=(gap,up,fwd)=>({to:[gap/2-halfWidth,up,fwd],pole:[.7,-.65,-.3],palm:[-1,-.1,.15],ext:0});
 const RELEASE_R={to:[.14,-.05,.37],pole:[.55,-.6,-.35],palm:[-.3,-.85,.15],ext:22};
 const FOLLOW_R={to:[.17,-.04,.35],pole:[.6,-.65,-.3],palm:[-.1,-.95,.1],ext:14};
 const OPEN_L={to:[.28,-.22,.14],pole:[0,-.55,-.85],palm:[-.4,-.4,.7],ext:5};
 const OPEN_L2={to:[.25,-.24,.15],pole:[.2,-.6,-.7],palm:[-.4,-.6,.5],ext:3};
 const DECAY={to:[.18,-.06,.30],pole:[.6,-.75,-.2],palm:[0,-1,0],ext:8};
 const DECAY_L={to:[.20,-.30,.12],pole:[.4,-.6,-.6],palm:[-.3,-.9,.2],ext:0};
 const rows=[
  [0,'rest','rest'],[.8,GUARD,GUARD],[1.2,GUARD,GUARD],
  [1.55,WIND_R,L_BRACE],[1.84,ARC_OUT_R,L_BRACE],[2.08,NEAR_R,L_BRACE2],[2.24,APEX_R,L_BRACE2],[2.5,SETTLE_R,mixIntent(L_BRACE2,L_WIND,.45)],
  [2.72,LOW_GUARD,L_WIND],[2.92,GUARD2,L_ARC],[3.2,GUARD2,L_NEAR],[3.36,GUARD2,L_APEX],[3.6,GUARD,L_SETTLE],[4.0,GUARD,GUARD],
  [4.15,sphere(.45,-.20,.25),sphere(.45,-.20,.25)],[4.65,sphere(.30,-.19,.29),sphere(.30,-.19,.29)],
  [5.0,sphere(.25,-.18,.31),sphere(.25,-.18,.31)],[5.2,sphere(.235,-.17,.315),sphere(.235,-.17,.315)],
  [5.45,RELEASE_R,sphere(.24,-.17,.31)],[5.85,FOLLOW_R,OPEN_L],[6.12,DECAY,OPEN_L2],[6.42,DECAY,DECAY_L],[7,'settle','settle'],[8.4,'rest','rest'],
 ].map(([t,R,L])=>({t,R,L}));
 for(const row of rows)for(const s of ['R','L'])row[s]=row[s]==='rest'?restIntent[s]:row[s]==='settle'?mixIntent(restIntent[s],GUARD,.35):row[s];
 const xs=rows.map(r=>r.t),polar=v=>{const d=Math.hypot(...v);return {d,u:v.map(x=>x/d)};};
 const reach=rows.map(r=>({R:polar(r.R.to),L:polar(r.L.to)}));
 // Hand targets interpolate in reach and direction separately (a straight blend can pass through the shoulder).
 function intent(side,t){
  const at=ARM_LEAD,pick=(f,time)=>pchip(xs,rows.map(f),clampT(time));
  const d=pchip(xs,reach.map(r=>r[side].d),clampT(t+at.to)),u=[0,1,2].map(i=>pchip(xs,reach.map(r=>r[side].u[i]),clampT(t+at.to))),n=Math.hypot(...u);
  return {to:u.map(x=>x/n*d),pole:[0,1,2].map(i=>pick(r=>r[side].pole[i],t+at.pole)),palm:[0,1,2].map(i=>pick(r=>r[side].palm[i],t+at.palm)),ext:pick(r=>r[side].ext,t+at.ext)};
 }
 return {intent,rows};
}
export const armWeight=t=>smooth(0,.5,t)*(1-smooth(7.7,8.4,t));

/* ---------- secondary layer ---------- */
const CAP={hair:1.1,ornament:1.5,sleeve:1.8,tail:1.4};
const RESPONSE={hair:{f:2.0,z:.45,k:.02},ornament:{f:3.2,z:.35,k:.026},sleeve:{f:2.6,z:.4,k:.03},tail:{f:1.5,z:.5,k:.026}};
const SUB=120,ACTIVE_DEGREES=.02;
/**
 * Offline secondary response. One damped second-order response per kind, each fed by what physically moves it:
 * hair and ornaments by head and torso turn, sleeves by the hand that carries them (lateral velocity) plus the turn,
 * tail by hip travel. Per-channel delay follows the rig's depth, the elbow-side roots stay quiet (the cuff must not
 * detach from the arm) and the free ends move most. No physics at runtime: the result is baked.
 */
export function createSecondary(secondary,intentFn){
 const n=Math.round(SECONDS*SUB)+1,dt=1/SUB;
 const sample=t=>torso(t),prev=t=>torso(Math.max(0,t-dt));
 const outSign=s=>s==='R'?-1:1;
 const drivers={hair:new Float64Array(n),ornament:new Float64Array(n),tail:new Float64Array(n),sleeveL:new Float64Array(n),sleeveR:new Float64Array(n)};
 for(let i=0;i<n;i++){
  const t=i*dt,a=sample(t),b=prev(t),yawRate=((a.yaw+a.headYaw)-(b.yaw+b.headYaw))/dt,torsoRate=(a.yaw-b.yaw)/dt,pitchRate=(a.headPitch-b.headPitch)/dt+(a.lean-b.lean)/dt*.5;
  const hipV=(a.hip-b.hip)/dt,sinkV=(a.sink-b.sink)/dt;
  drivers.hair[i]=yawRate*.6+pitchRate*.4;
  drivers.ornament[i]=torsoRate*.5+yawRate*.25+pitchRate*.25;
  drivers.tail[i]=hipV*150+sinkV*60+torsoRate*.25;
  for(const side of ['L','R']){
   const x=intentFn(side,t).to,y=intentFn(side,Math.max(0,t-dt)).to;
   drivers['sleeve'+side][i]=40*outSign(side)*(x[0]-y[0])/dt+.25*torsoRate;
  }
 }
 const filtered={};
 const respond=(key,response)=>{
  const w=2*Math.PI*response.f,out=new Float64Array(n),u=drivers[key];let x=0,v=0;
  for(let i=0;i<n;i++){const h=dt/4;for(let k=0;k<4;k++){const a=w*w*(u[i]-x)-2*response.z*w*v;v+=a*h;x+=v*h;}out[i]=x;}
  return out;
 };
 filtered.hair=respond('hair',RESPONSE.hair);filtered.ornament=respond('ornament',RESPONSE.ornament);filtered.tail=respond('tail',RESPONSE.tail);
 filtered.sleeveL=respond('sleeveL',RESPONSE.sleeve);filtered.sleeveR=respond('sleeveR',RESPONSE.sleeve);
 const at=(series,t)=>{const p=Math.max(0,Math.min(n-1,t*SUB)),i=Math.min(n-2,Math.floor(p)),m=p-i;return series[i]*(1-m)+series[i+1]*m;};
 const kinds=secondary.names.map((name,i)=>{
  const g=secondary.groups[secondary.group[i]].id;
  if(g==='sleeveL'||g==='sleeveR')return g;
  if(g==='tail')return 'tail';
  return /Piao/.test(name)?'ornament':'hair';
 });
 const groupDelay=Object.fromEntries(secondary.groups.map(g=>[g.id,g.delayPerDepth]));
 const stats={},peak=new Float64Array(kinds.length);
 for(const kind of kinds)stats[kind]??={max:0,clamped:0,channels:0};
 /** Rotation angle in degrees for secondary channel i at time t. */
 function angle(i,t){
  const kind=kinds[i],g=secondary.groups[secondary.group[i]].id,depth=secondary.depth[i];
  const response=kind==='sleeveL'||kind==='sleeveR'?RESPONSE.sleeve:RESPONSE[kind];
  // Roots next to the elbow and shoulder stay quiet; the free ends carry the motion.
  const shape=(kind==='sleeveL'||kind==='sleeveR')?.3+.7*smooth(0,4,depth):1;
  const delay=depth*groupDelay[g]*.7,time=Math.max(0,t-delay);
  const cap=kind==='sleeveL'||kind==='sleeveR'?CAP.sleeve:CAP[kind];
  const raw=at(filtered[kind],time)*response.k*secondary.gain[i]*shape*(1-smooth(7.6,8.4,t));
  const value=Math.max(-cap,Math.min(cap,raw));
  const s=stats[kind];s.max=Math.max(s.max,Math.abs(value));if(Math.abs(raw)>cap)s.clamped++;
  if(Math.abs(value)>peak[i])peak[i]=Math.abs(value);
  return value;
 }
 /**
  * Per-kind accounting. `channels` is the number of rig channels of that kind (it used to stay 0 because nothing counted it),
  * `active` those whose baked angle ever exceeded ACTIVE_DEGREES, `idle` the names of the rest (their rig gain or shape is ~0).
  */
 function summary(names){
  const out={};
  for(const [kind,s] of Object.entries(stats)){
   const ids=kinds.map((k,i)=>k===kind?i:-1).filter(i=>i>=0),idle=ids.filter(i=>peak[i]<=ACTIVE_DEGREES);
   out[kind]={max:s.max,clamped:s.clamped,channels:ids.length,active:ids.length-idle.length,idle:idle.length,idleNames:idle.slice(0,12).map(i=>names[i])};
  }
  return out;
 }
 return {angle,kinds,stats,drivers,filtered,summary};
}
