/**
 * Hsin Combat R2.1 runtime curves: facial acting and the optional automatic camera. Pure functions of the combat clock,
 * no THREE, no DOM, no allocation per call (the caller passes the output object). The body, secondary motion and support
 * are baked offline; this file only authors what the baked asset cannot: the face overlay and the camera.
 */
const smoother=u=>u*u*u*(u*(u*6-15)+10);
const clamp01=v=>Math.max(0,Math.min(1,v));

/* ---------- facial acting ---------- */
// Channels sit under the arbiter ceilings (squint .15, mouth squint .08, brow .1, smile cut .8): the identity of the face is not changed.
// R2.1.1: the cut now holds .6-.8 from the first concentration to the release, so the habitual smile does not return between actions.
//        t    squint  mouthSq  brow   smileCut  smileAdd  close
export const FACE_KEYS=[
 [0,    0,     0,      0,     0,        0,        0],
 [.5,   .03,   .01,    .07,   .3,       0,        0],   // Preparation: the eyes settle on the task, the resting smile recedes
 [1.0,  .06,   .03,    .09,   .6,       0,        0],   // concentration: serious, brows lifted with attention
 [1.6,  .10,   .05,    .06,   .7,       0,        0],   // Basic 01: the weight loads, jaw set
 [2.1,  .13,   .07,    .03,   .8,       0,        0],   // impact: eyes narrowed, mouth tight
 [2.5,  .09,   .05,    .05,   .65,      0,        0],   // between the strikes the focus stays
 [2.9,  .12,   .06,    .04,   .72,      0,        0],   // Basic 02: quicker, tighter
 [3.1,  .145,  .075,   .03,   .8,       0,        0],
 [3.6,  .08,   .04,    .07,   .65,      0,        0],   // reset: still concentrated, not smiling
 [4.2,  .09,   .04,    .09,   .78,      0,        0],   // Skill charge: attention directed at the sphere
 [5.0,  .10,   .05,    .09,   .8,       0,        0],   // accumulation: held focus
 [5.45, .145,  .078,   .04,   .8,       0,        0],   // release: momentary peak of effort
 [5.75, .08,   .03,    .05,   .6,       .03,      0],   // exhale: the face softens
 [6.0,  .04,   .02,    .04,   .4,       .03,      0],
 [6.3,  .03,   .01,    .03,   .25,      .02,      0],
 [6.37, .03,   .01,    .03,   .25,      .02,      .9],  // one slow, contextual blink after the release
 [6.5,  .02,   .01,    .02,   .2,       .01,      0],
 [7.0,  .01,   0,      .02,   .1,       0,        0],   // serenity: the habitual smile returns on its own
 [8.4,  0,     0,      0,     0,        0,        0],
];
const FACE_N=FACE_KEYS.length;
/** Writes {squint, mouthSquint, brow, smileCut, smileAdd, close} for the combat clock `time`. */
export function faceCue(time,out={}){
 const t=Math.max(0,Math.min(FACE_KEYS[FACE_N-1][0],time));let i=0;while(i<FACE_N-2&&t>FACE_KEYS[i+1][0])i++;
 const a=FACE_KEYS[i],b=FACE_KEYS[i+1],u=smoother(clamp01((t-a[0])/(b[0]-a[0])));
 out.squint=a[1]+(b[1]-a[1])*u;out.mouthSquint=a[2]+(b[2]-a[2])*u;out.brow=a[3]+(b[3]-a[3])*u;
 out.smileCut=a[4]+(b[4]-a[4])*u;out.smileAdd=a[5]+(b[5]-a[5])*u;out.close=a[6]+(b[6]-a[6])*u;return out;
}

/* ---------- automatic camera ---------- */
// [t, yaw° (azimuth, negative = camera on Hsin's right), distance multiplier, target height m, camera lift m]
export const CAMERA_KEYS=[
 [0,   -28, 1.00, .86, .14],   // Preparation: wide, whole body, feet in frame
 [1.2, -28, 1.00, .86, .14],
 [1.55,-32, 1.00, .90, .14],   // Basic: the feet stay in frame while the weight transfers (R2.1.1)
 [2.2, -36, .98,  .93, .12],   // reveals the arc of the right arm from its side
 [2.7, -26, .98,  .93, .12],
 [3.25,-16, .96,  .94, .12],   // follows the left counter
 [3.7, -20, .94,  .95, .12],
 [4.3, -18, .78,  1.08,.10],   // Skill: hands, energy and face share the frame without the effect filling it (R2.1.1)
 [5.4, -15, .76,  1.10,.10],
 [5.9, -22, .84,  1.06,.10],
];
const CAMERA_N=CAMERA_KEYS.length,CAMERA_XS=CAMERA_KEYS.map(k=>k[0]);
function pchip(ys,t){
 if(t<=CAMERA_XS[0])return ys[0];if(t>=CAMERA_XS[CAMERA_N-1])return ys[CAMERA_N-1];let i=0;while(i<CAMERA_N-2&&t>CAMERA_XS[i+1])i++;
 const h=j=>CAMERA_XS[j+1]-CAMERA_XS[j],d=j=>(ys[j+1]-ys[j])/h(j);
 const m=j=>{if(j===0||j===CAMERA_N-1)return 0;if(d(j-1)*d(j)<=0)return 0;const w1=2*h(j)+h(j-1),w2=h(j)+2*h(j-1);return (w1+w2)/(w1/d(j-1)+w2/d(j));};
 const u=(t-CAMERA_XS[i])/h(i),u2=u*u,u3=u2*u;return (2*u3-3*u2+1)*ys[i]+(u3-2*u2+u)*h(i)*m(i)+(-2*u3+3*u2)*ys[i+1]+(u3-u2)*h(i)*m(i+1);
}
const CAMERA_COLUMNS=[1,2,3,4].map(c=>CAMERA_KEYS.map(k=>k[c]));
/** Distance that keeps head to toe and the arms' reach in frame for this lens and aspect (full-body plan). */
export function wideDistance(fovDegrees,aspect,{minDistance=1.05,maxDistance=7}={}){
 const tan=Math.tan(fovDegrees*Math.PI/360),vertical=1.02/tan,horizontal=.85/(tan*Math.max(.35,Math.min(2.2,aspect)));
 return Math.max(minDistance,Math.min(maxDistance,Math.max(vertical,horizontal)));
}
/**
 * Camera shot for the combat clock. The azimuth stays inside the stage's OrbitControls limit (±0.22π) so the
 * automatic move never fights the controller; manual input always wins in the lab (it switches this off).
 */
export function cameraShot(time,{fov=34,aspect=16/9,minDistance=1.05,maxDistance=7}={},out={}){
 const t=Math.max(0,Math.min(8.4,time)),base=wideDistance(fov,aspect,{minDistance,maxDistance});
 out.yaw=pchip(CAMERA_COLUMNS[0],t)*Math.PI/180;out.distance=Math.max(minDistance,Math.min(maxDistance,base*pchip(CAMERA_COLUMNS[1],t)));
 out.targetY=pchip(CAMERA_COLUMNS[2],t);out.lift=pchip(CAMERA_COLUMNS[3],t);
 out.home=smoother(clamp01((t-6)/2.2)); // 6.0 -> 8.2 s: blend back to the framing the user had
 return out;
}
