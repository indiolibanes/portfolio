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
export const MARKERS=[['energy',.8],['trail',1.78],['arc',2.05],['trail-left',2.76],['arc-left',3.05],['charge',3.95],['ring',5.35],['recovery',6]];

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
 [1.8,-8,-.02,-.05,2,10,0],
 [2.05,19,.062,-.04,5,4,0],
 [2.14,22,.066,-.044,4.5,3,0],
 [2.4,15,.052,-.042,3,1,0],
 // Basic 02: a quick drop (not a coil) on the already loaded left leg, then the drive across to the right.
 [2.6,17,.06,-.062,1,-6,0],
 [2.82,5,.03,-.05,2,-12,0],
 [3.05,-19,-.062,-.046,4,-6,0],
 [3.15,-22,-.066,-.05,3.5,-5,0],
 [3.6,-5,-.025,-.03,2,0,0],
 // Skill: gaze follows the hands, spine gathers, coil on the right leg, release thrusts through the left.
 [4.0,-2,-.02,-.04,3,0,5],
 [4.5,0,0,-.05,4,0,8],
 [5.0,0,.005,-.06,3,0,6],
 [5.12,-7,-.028,-.06,1,4,2],
 [5.4,13,.05,-.035,6,5,-1],
 [5.6,16,.058,-.034,5,4,-1],
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
 const L_ARC={to:[.34,-.20,.10],pole:[.8,-.2,-.5],palm:[-.5,-.5,.35],ext:2};
 const L_NEAR={to:[.30,-.08,.22],pole:[.75,.15,-.45],palm:[-.7,-.2,.5],ext:6};
 const L_APEX={to:[.22,.01,.30],pole:[.7,.35,-.4],palm:[-.75,.05,.55],ext:8};
 const L_SETTLE={to:[.17,-.06,.27],pole:[.6,0,-.45],palm:[-.7,-.1,.4],ext:3};
 // Skill (R2.0.1 composition; replaced in the Skill commit): right palm down above, left palm up below.
 const GATHER_R={to:[-.04,-.16,.27],pole:[.8,-.55,-.1],palm:[0,-1,.1],ext:0};
 const GATHER_L={to:[-.04,-.36,.24],pole:[.8,-.55,-.1],palm:[0,1,.1],ext:0};
 const RELEASE_R={to:[.25,.03,.32],pole:[.7,-.65,-.2],palm:[0,-1,0],ext:22};
 const FOLLOW_R=RELEASE_R;
 const OPEN_L={to:[.30,-.22,.12],pole:[0,-.55,-.85],palm:[-.2,-.3,.9],ext:5};
 const OPEN_L2=OPEN_L;
 const DECAY={to:[.18,-.06,.30],pole:[.6,-.75,-.2],palm:[0,-1,0],ext:8};
 const DECAY_L={to:[.20,-.30,.12],pole:[.4,-.6,-.6],palm:[-.3,-.9,.2],ext:0};
 const rows=[
  [0,'rest','rest'],[.8,GUARD,GUARD],[1.2,GUARD,GUARD],
  [1.55,WIND_R,L_BRACE],[1.82,ARC_OUT_R,L_BRACE],[1.97,NEAR_R,L_BRACE2],[2.07,APEX_R,L_BRACE2],[2.3,SETTLE_R,L_BRACE2],
  [2.6,LOW_GUARD,L_WIND],[2.84,GUARD2,L_ARC],[2.97,GUARD2,L_NEAR],[3.05,GUARD2,L_APEX],[3.3,GUARD,L_SETTLE],[3.7,GUARD,GUARD],
  [4.5,GATHER_R,GATHER_L],
  [5.35,RELEASE_R,OPEN_L],[6,DECAY,DECAY_L],[7,'settle','settle'],[8.4,'rest','rest'],
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

/* ---------- secondary layer (generic envelope; replaced by the per-group model in the secondary commit) ---------- */
export function createSecondary(secondary){
 const stats={};
 function angle(i,t){
  const time=Math.max(0,t-secondary.depth[i]*.025),envelope=Math.sin(Math.PI*t/SECONDS)**2;
  const value=(torso(time).yaw-torso(Math.max(0,time-.12)).yaw)*.28*envelope*secondary.gain[i];
  const s=stats.all??={max:0,clamped:0};s.max=Math.max(s.max,Math.abs(value));return value;
 }
 return {angle,stats};
}
