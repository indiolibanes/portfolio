/** G10-B comfort revision on top of G10-A: see G10B_REPORT.md. The G10-A yaw tracker (2.4 rad/s slew,
 * 0.12 s smoothing) is replaced by a comfort-limited planner; everything remains a pure function of
 * absolute time prepared from the director's EXISTING body sampler.
 * G10-A: read-only anatomical framing. All smoothing is prepared on absolute time,
 * using the director's EXISTING body sampler; no mixer/clock/RAF or source edits.
 * Toe direction disambiguates anatomical front in bind pose. Face/silhouette QA
 * remains required: these bounds are a padded joint cloud, not a skinned surface.
 */
import {r62CameraFrame} from './r62-camera.mjs';
import {skillFlightPoints} from './combat-vfx-skill.mjs';
const cache = new WeakMap();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
/** G11.1: joint order used by the rig reader (8 padded corners per joint) - lets the arena shot shrink the pads about each joint. */
const JOINTS=['pel','chest','head','rh','lh','rf','lf','rtoe','ltoe','re','le'];
const B = {pel:'Bip001Pelvis',chest:'Bip001Spine2',head:'Bip001Head',rh:'Bip001RHand',lh:'Bip001LHand',rf:'Bip001RFoot',lf:'Bip001LFoot',rt:'Bip001RThigh',lt:'Bip001LThigh',rtoe:'Bip001RToe0',ltoe:'Bip001LToe0',re:'Bip001RForearm',le:'Bip001LForearm'};
export function createRigCameraReader(T, model, h) {
 const bones=Object.fromEntries(Object.entries(B).map(([k,n])=>[k,model.getObjectByName(n)]));
 if (Object.values(bones).some(b=>!b)) throw Error('Smart camera: anatomical anchors unresolved');
 const V=()=>new T.Vector3(), p=Object.fromEntries(Object.keys(B).map(k=>[k,V()]));
 const right=V(),front=V(),toes=V(),toe=V();let sign=1;
 const read=()=>{model.updateMatrixWorld(true);for(const [k,b] of Object.entries(bones))b.getWorldPosition(p[k]);};
 read();right.subVectors(p.rt,p.lt);right.y=0;right.normalize();front.set(right.z,0,-right.x);
 toes.subVectors(p.rtoe,p.rf).add(toe.subVectors(p.ltoe,p.lf));toes.y=0;
 const alignment=front.dot(toes.normalize());
 if(Math.abs(alignment)<.5)throw Error('Smart camera: ambiguous bind front/toes');
 sign=alignment<0?-1:1;
 const chestFront=front.clone().multiplyScalar(sign).applyQuaternion(bones.chest.getWorldQuaternion(new T.Quaternion()).invert());
 const calibration=Object.freeze({method:'ANATOMICAL_THIGHS_DISAMBIGUATED_BY_BIND_TOES',toeAlignment:Math.abs(alignment),sign,visualConvention:'PENDING'});
 return {calibration,read(){
  read();right.subVectors(p.rt,p.lt);right.y=0;
  // A singular thigh axis uses the actual chest orientation, never a frame-history fallback.
  const horizontal=right.length();right.normalize();front.set(right.z,0,-right.x).multiplyScalar(sign);
  if(horizontal<.005*h){const q=bones.chest.getWorldQuaternion(new T.Quaternion());front.copy(chestFront).applyQuaternion(q);front.y=0;front.normalize();}
  if(front.lengthSq()<.5)throw Error('Smart camera: front singularity');
  const pts=[];
  for(const k of ['pel','chest','head','rh','lh','rf','lf','rtoe','ltoe','re','le']){
   const pad=(k==='head'?.105:k==='chest'||k==='pel'?.13:.065)*h;
   for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])pts.push({id:k,position:[p[k].x+x*pad,p[k].y+y*pad,p[k].z+z*pad]});
  }
  return {points:pts,front:front.toArray(),frontSingularity:horizontal<.005*h,anchors:Object.fromEntries(Object.entries(p).map(([k,v])=>[k,v.toArray()])),calibration};
 }};
}

/** G10-B comfort limits. Every number is verified on the produced path (guide.metrics) and by tests. */
export const G10B_COMFORT = Object.freeze({
 version: 'G10-B', yawMaxDegPerS: 30, yawAccDegPerS2: 50, facingDeadZoneDeg: 70, spinIgnoreRadPerS: 2.5,
 targetSigmaS: 0.35, fovSigmaS: 0.8, radiusSlopeH: 1.2, radiusTempH: 0.06, plannerEdge: 0.80, finalEdge: 0.84, arenaEdgeGain: 0.16, arenaPadShrink: 0.62, arenaSlopeGain: 1.6, arenaFloorH: 0.12, arenaRadiusSigmaS: 0.30, offsetYaw: 0.12
});
const TAU = Math.PI * 2, wrapPi = x => x - TAU * Math.round(x / TAU);
const gaussSmooth = (rows, sigmaSamples, get) => { // symmetric, history-free, edge-normalized
 const half = Math.ceil(3 * sigmaSamples), n = rows.length, out = new Array(n), dim = get(0).length ?? 1;
 for (let i = 0; i < n; i++) {
  let w = 0; const acc = new Array(dim).fill(0);
  for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) { const k = Math.exp(-.5 * ((j - i) / sigmaSamples) ** 2), v = get(j); w += k; for (let a = 0; a < dim; a++) acc[a] += (dim === 1 && !Array.isArray(v) ? v : v[a]) * k; }
  out[i] = acc.map(x => x / w);
 }
 return out;
};
const smoothstep = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
/** G11.1: camera direction elevation (unit-ish y component). Low and looking up inside the Stellarealm (arena weight 1), the G10-B value otherwise. */
export const cameraDy=w=>.16-.27*clamp(w,0,1);
/** Continuous arena weight (replaces the G10-A phase regexp, which stepped the target at phase changes). */
export function arenaWeight(t, tl) {
 if (!tl) return 0;
 const up = smoothstep((t - tl.revealStart) / Math.max(.3, tl.revealPeak - tl.revealStart));
 // G11.1: with the burst timeline the close, low arena shot is HELD through absorption + burst, then released.
 const g = tl.g11, down = g ? 1 - smoothstep((t - g.butterflyPeak) / Math.max(.5, g.butterflyEnd + 0.4 - g.butterflyPeak)) : 1 - smoothstep((t - (tl.peak + 1.0)) / Math.max(.5, (tl.recoveryStart ?? tl.revealEnd) + 0.8 - (tl.peak + 1.0)));
 return up * down;
}

/** Comfort yaw planner: dynamic programming on the circle over KNOWN body yaw (absolute time, prepared once).
 *  Dead zone around the anatomical front, bounded speed and acceleration, spins faster than the eye can
 *  follow are not chased. Returns unwrapped camera yaw (before wobble/offset) per row. */
export function planComfortYaw(bodyYaw, hz, duration, C = G10B_COMFORT) {
 const DT = .1, BIN = Math.PI / 360, NBIN = 720, M = Math.round(C.yawMaxDegPerS / 5), NV = 2 * M + 1, steps = Math.max(1, Math.round(duration / DT));
 const at = k => bodyYaw[Math.min(bodyYaw.length - 1, Math.round(k * DT * hz))];
 const spinW = k => { const a = at(Math.max(0, k - 1)), b = at(Math.min(steps, k + 1)); const r = Math.abs(b - a) / (2 * DT); return 1 / (1 + (r / C.spinIgnoreRadPerS) ** 2); };
 const TH = C.facingDeadZoneDeg * Math.PI / 180, WF = 30, LAM = 12, MU = .8;
 const stage = new Float32Array(NBIN), INF = 1e30;
 const NS = NBIN * NV; let cost = new Float32Array(NS).fill(INF), next = new Float32Array(NS);
 const back = Array.from({length: steps}, () => new Int8Array(NS));
 const j0 = ((Math.round(wrapPi(at(0) - C.offsetYaw) / BIN) % NBIN) + NBIN) % NBIN; cost[j0 * NV + M] = 0;
 const vcost = Array.from({length: NV}, (_, q) => LAM * (((q - M) * 5 * Math.PI / 180) ** 2) * DT);
 for (let k = 1; k <= steps; k++) {
  const psi = at(k), w = spinW(k);
  for (let j = 0; j < NBIN; j++) { const e = Math.abs(wrapPi(j * BIN + C.offsetYaw - psi)), f = Math.max(0, e - TH) / (Math.PI - TH); stage[j] = WF * w * f * f; }
  next.fill(INF); const bk = back[k - 1];
  for (let j = 0; j < NBIN; j++) for (let q = 0; q < NV; q++) {
   const c0 = cost[j * NV + q]; if (c0 >= INF) continue;
   for (let d = -1; d <= 1; d++) {
    const q2 = q + d; if (q2 < 0 || q2 >= NV) continue;
    const m2 = q2 - M, j2 = (((j + m2) % NBIN) + NBIN) % NBIN, s2 = j2 * NV + q2, c = c0 + vcost[q2] + MU * d * d + stage[j2];
    if (c < next[s2]) { next[s2] = c; bk[s2] = d; }
   }
  }
  [cost, next] = [next, cost];
 }
 let best = 0; for (let s = 1; s < NS; s++) if (cost[s] < cost[best]) best = s;
 const ms = new Array(steps + 1); let s = best;
 for (let k = steps; k >= 1; k--) { const q2 = s % NV, j2 = (s - q2) / NV, d = back[k - 1][s], q = q2 - d, m2 = q2 - M, j = (((j2 - m2) % NBIN) + NBIN) % NBIN; ms[k] = m2; s = j * NV + q; }
 ms[0] = 0;
 const path = new Array(steps + 1); path[0] = j0 * BIN; for (let k = 1; k <= steps; k++) path[k] = path[k - 1] + ms[k] * BIN;
 // expand to row rate and low-pass (jerk limit); smoothing cannot raise the peak speed
 const n = bodyYaw.length, lin = new Array(n);
 for (let i = 0; i < n; i++) { const x = Math.min(steps, i / hz / DT), a = Math.floor(x), b = Math.min(steps, a + 1); lin[i] = path[a] + (path[b] - path[a]) * (x - a); }
 return gaussSmooth(lin, .3 * hz, i => lin[i]).map(v => v[0]);
}

/** Reuse preparation across viewport/ablation/restart. Cache only small camera
 * guides, not models/curves. The caller restores pose with its normal start(). */
export function prepareCameraGuide({model,key,duration,samplePose,reader,hz=30,skillWindow=null,h=null}) {
 const fullKey = key + '|' + G10B_COMFORT.version + '|' + (skillWindow ? skillWindow.start.toFixed(3) + ',' + skillWindow.end.toFixed(3) : '');
 let records=cache.get(model);if(!records){records=new Map();cache.set(model,records);}if(records.has(fullKey))return records.get(fullKey);
 const n=Math.ceil(duration*hz),rows=[];let prev=0;
 for(let i=0;i<=n;i++){
  const t=Math.min(duration,i/hz);samplePose(t);const r=reader.read(),box=r.points.reduce((b,p)=>{p.position.forEach((x,j)=>{b.min[j]=Math.min(b.min[j],x);b.max[j]=Math.max(b.max[j],x);});return b;},{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
  let yaw=Math.atan2(r.front[0],r.front[2]);if(i)yaw=prev+Math.atan2(Math.sin(yaw-prev),Math.cos(yaw-prev));prev=yaw;
  const flat=new Float32Array(r.points.length*3);r.points.forEach((p,j)=>flat.set(p.position,j*3));
  rows.push({t,yawRaw:yaw,center:box.min.map((x,j)=>(x+box.max[j])/2),span:Math.hypot(...box.min.map((x,j)=>(box.max[j]-x)/2)),anchors:r.anchors,front:r.front,points:flat});
 }
 const C=G10B_COMFORT, hh=h??(rows[0].anchors.head[1]-Math.min(rows[0].anchors.rf[1],rows[0].anchors.lf[1]))/.9;
 // ---- comfort yaw + smoother target ----
 const yawPath=planComfortYaw(rows.map(r=>r.yawRaw),hz,duration,C);
 const centers=gaussSmooth(rows,C.targetSigmaS*hz,i=>rows[i].center);
 const smooth=rows.map((r,i)=>({...r,yaw:yawPath[i],center:centers[i]}));
 // ---- skill flight envelope points (control polygon of every butterfly path): prepared, not reacted to ----
 if(skillWindow)for(const r of smooth){
  if(r.t<skillWindow.start-.25||r.t>skillWindow.end+.25){r.skillPts=null;continue;}
  const A=r.anchors,fw=r.front,rt=[A.rt[0]-A.lt[0],0,A.rt[2]-A.lt[2]],l=Math.hypot(rt[0],rt[2])||1;rt[0]/=l;rt[2]/=l;
  r.skillPts=skillFlightPoints({pel:A.pel,chest:A.chest,fwd:fw,right:rt,h:hh});
 }
 // metrics of the planned path (reported, never assumed)
 let maxRate=0,maxAcc=0;for(let i=1;i<smooth.length;i++){const v=(smooth[i].yaw-smooth[i-1].yaw)*hz;maxRate=Math.max(maxRate,Math.abs(v));if(i>1)maxAcc=Math.max(maxAcc,Math.abs((smooth[i].yaw-2*smooth[i-1].yaw+smooth[i-2].yaw)*hz*hz));}
 const worldMin=[Infinity,Infinity,Infinity],worldMax=[-Infinity,-Infinity,-Infinity];
 for(const r of rows)r.center.forEach((x,j)=>{worldMin[j]=Math.min(worldMin[j],x-r.span);worldMax[j]=Math.max(worldMax[j],x+r.span);});
 const staticCenter=worldMin.map((x,j)=>(x+worldMax[j])/2),staticSpan=Math.hypot(...worldMin.map((x,j)=>(worldMax[j]-x)/2));
 const shots=new Map();
 const wobble=t=>.28*Math.sin(t*Math.PI*2/18);
 function buildShot(ctx){
  const {plan,timeline,aspect,center,arena,period,reduced}=ctx,T3=[0,0,0];
  const base=smooth.map((r,i)=>{const a=Object.fromEntries(['pel','head','rh','lh'].map(k=>[k,r.anchors[k]]));return r62CameraFrame({plan,timeline,t:r.t,aspect,h:ctx.h,center,arena,period,reduced,anchors:a});});
  const fovS=gaussSmooth(smooth,C.fovSigmaS*hz,i=>base[i].fov).map(v=>v[0]),tgtS=gaussSmooth(smooth,C.targetSigmaS*hz,i=>base[i].target),arenaW=smooth.map(r=>arenaWeight(r.t,timeline));
  const req=smooth.map((r,i)=>{
   const w=arenaW[i],bt=tgtS[i],tg=r.center.map((x,a)=>x+(bt[a]-x)*.25*w);
   const yaw=r.yaw+wobble(r.t)+C.offsetYaw,dx=Math.sin(yaw),dz=Math.cos(yaw),dy=cameraDy(w),dl=Math.hypot(dx,dy,dz),d=[dx/dl,dy/dl,dz/dl];
   let rx=d[2],rz=-d[0];const rl=Math.hypot(rx,rz)||1;rx/=rl;rz/=rl; // right = up x dir (normalized)
   const rr=[d[2],0,-d[0]],rn=Math.hypot(...rr)||1,right=rr.map(x=>x/rn),vert=[d[1]*right[2]-d[2]*right[1],d[2]*right[0]-d[0]*right[2],d[0]*right[1]-d[1]*right[0]];
   const tanY=Math.tan(fovS[i]*Math.PI/360),tanX=tanY*aspect,E=C.plannerEdge+C.arenaEdgeGain*w;let dist=base[i].radius;
   const eat=(px,py,pz)=>{const ex=px-tg[0],ey=py-tg[1],ez=pz-tg[2],z=ex*d[0]+ey*d[1]+ez*d[2];dist=Math.max(dist,z+Math.abs(ex*right[0]+ey*right[1]+ez*right[2])/(tanX*E),z+Math.abs(ex*vert[0]+ey*vert[1]+ez*vert[2])/(tanY*E),z+.05*ctx.h);};
   {const sk=1-C.arenaPadShrink*w;for(let k=0;k<r.points.length;k+=3){const c=r.anchors[JOINTS[Math.floor(k/24)]];eat(c[0]+(r.points[k]-c[0])*sk,c[1]+(r.points[k+1]-c[1])*sk,c[2]+(r.points[k+2]-c[2])*sk);}}
   if(r.skillPts&&!reduced)for(const p of r.skillPts)eat(p[0],p[1],p[2]);
   return dist;
  });
  // G11.1: inside the arena the radius may close faster (past wide requirements - e.g. the Skill butterfly envelope in portrait - decay with a steeper slope), still a pure, prepared function of time.
  const s0=C.radiusSlopeH*ctx.h,temp=C.radiusTempH*ctx.h,eps=.22,radius=req.map((_,i)=>{const s=s0*(1+C.arenaSlopeGain*arenaW[i]);let mx=-Infinity;const vv=req.map((q,j)=>{const v=q-s*(Math.hypot(smooth[j].t-smooth[i].t,eps)-eps);mx=Math.max(mx,v);return v;});let sum=0;for(const v of vv)sum+=Math.exp((v-mx)/temp);return mx+temp*Math.log(sum);});
  // G11.1 comfort: the slope-limited envelope has acceleration kinks where the arena slope gain engages; inside the arena it is low-passed (symmetric, history-free) so the dolly eases in/out.
  const radG=gaussSmooth(smooth,C.arenaRadiusSigmaS*hz,i=>[radius[i]]).map(v=>v[0]),radiusF=radius.map((q,i)=>q+(radG[i]-q)*arenaW[i]);
  return {radius:radiusF,fov:fovS,arenaW,req,tgt:[0,1,2].map(a=>tgtS.map(v=>v[a]))};
 }
 const interp=(arr,t)=>{const x=clamp(t*hz,0,n),i=Math.min(n-1,Math.floor(x));return arr[i]+(arr[i+1]-arr[i])*(x-i);};
 const result=Object.freeze({staticFrame:{yaw:smooth[0].yaw,center:staticCenter,span:staticSpan},
 shotAt(t,ctx){
  const key=[ctx.aspect,ctx.h,ctx.period,ctx.reduced,ctx.center.x,ctx.center.y,ctx.center.z,ctx.arena?.x,ctx.arena?.z].join('|');
  let s=shots.get(key);if(!s){s=buildShot(ctx);if(shots.size>=4)shots.delete(shots.keys().next().value);shots.set(key,s);}
  return {radius:interp(s.radius,t),fov:interp(s.fov,t),arenaW:interp(s.arenaW,t),baseTarget:s.tgt.map(a=>interp(a,t)),skillEnvelope:!!skillWindow};
 },
 radiusAt(t,ctx){return this.shotAt(t,ctx).radius;},
 sample(t){const x=clamp(t*hz,0,n),i=Math.min(n-1,Math.floor(x)),a=smooth[i],b=smooth[i+1],u=clamp((t-a.t)/(b.t-a.t),0,1);return {yaw:a.yaw+(b.yaw-a.yaw)*u,center:a.center.map((v,j)=>v+(b.center[j]-v)*u)};},
 samples:rows.length,hz,maxYawSpeed:maxRate,metrics:Object.freeze({maxYawRateRadPerS:maxRate,maxYawAccRadPerS2:maxAcc,comfort:C}),skillWindow});
 if(records.size>=2)records.delete(records.keys().next().value);records.set(fullKey,result);return result;
}

export function projectCameraPoints(T,camera,points,width,height) {
 camera.updateMatrixWorld(true);const v=new T.Vector3(),view=new T.Vector3();
 const projected=points.map(p=>{v.fromArray(p.position);view.copy(v).applyMatrix4(camera.matrixWorldInverse);v.project(camera);return {id:p.id,ndc:v.toArray(),inFront:view.z<-camera.near,inFrustum:view.z<-camera.near&&view.z>-camera.far&&Math.abs(v.x)<=1&&Math.abs(v.y)<=1,pixels:[(v.x+1)*width/2,(1-v.y)*height/2]};});
 const b=projected.reduce((b,p)=>{b.minX=Math.min(b.minX,p.ndc[0]);b.maxX=Math.max(b.maxX,p.ndc[0]);b.minY=Math.min(b.minY,p.ndc[1]);b.maxY=Math.max(b.maxY,p.ndc[1]);return b;},{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});
 const area=Math.max(1e-12,(b.maxX-b.minX)*(b.maxY-b.minY)),visible=Math.max(0,Math.min(1,b.maxX)-Math.max(-1,b.minX))*Math.max(0,Math.min(1,b.maxY)-Math.max(-1,b.minY));
 return {points:projected,projectedBounds:b,visibleBoxPercent:100*visible/area,marginPixels:Math.min((1+b.minX)*width/2,(1-b.maxX)*width/2,(1+b.minY)*height/2,(1-b.maxY)*height/2),outside:projected.filter(p=>!p.inFrustum).length,boundsKind:'PADDED_ANATOMICAL_POINTS_NOT_SKIN_SURFACE'};
}

/** Exact perspective inequalities fit an oriented cloud including depth, not
 * just a span/tan estimate. The existing F1 shape is a MINIMUM shot distance.
 * G10-B: radius/fov/arena weight come from the prepared comfort shot plan; the exact fit below is a
 * safety net (its triggers are reported in smart.safetyNet). */
export function smartCameraFrame(T,{base,rig,guide,t,h,aspect,width=960,height=540,reduced=false,secondary=[],plan,timeline,center,arena:arenaAnchor,period=18}) {
 const g=reduced&&guide.staticFrame?guide.staticFrame:guide.sample(t),front=new T.Vector3().fromArray(rig.front);
 const shot=plan&&guide.shotAt&&!reduced?guide.shotAt(t,{plan,timeline,aspect,h,center,arena:arenaAnchor,period,reduced}):null;
 const yaw=g.yaw+(reduced?.12:.28*Math.sin(t*Math.PI*2/18)+.12);
 const arenaW=shot?shot.arenaW:(/OUTER|PEAK|DISSIPATION/.test(base.phase)?1:0),arena=arenaW>.5,dir=new T.Vector3(Math.sin(yaw),reduced?.12:cameraDy(arenaW),Math.cos(yaw)).normalize(),target=new T.Vector3().fromArray(g.center);
 if(arenaW>0)target.lerp(new T.Vector3().fromArray(shot?.baseTarget??base.target),.25*arenaW);
 const up=new T.Vector3(0,1,0),right=new T.Vector3().crossVectors(up,dir).normalize(),vertical=new T.Vector3().crossVectors(dir,right).normalize();
 const fov=shot?shot.fov:base.fov,tanY=Math.tan(fov*Math.PI/360),tanX=tanY*aspect,edge=G10B_COMFORT.finalEdge+G10B_COMFORT.arenaEdgeGain*arenaW,delta=new T.Vector3();
 let distance=shot?shot.radius:plan?guide.radiusAt(t,{plan,timeline,aspect,h,center,arena:arenaAnchor,period,reduced}):base.radius;
 const planned=distance;
 if(reduced&&g.span)distance=Math.max(base.radius,(g.span+2*h)/Math.sin(Math.min(2*Math.atan(tanX),2*Math.atan(tanY))*.84/2));
 // Live secondary points (butterflies) are bounded by the prepared flight envelope; they only join the
 // exact fit when the guide has no envelope (e.g. test doubles).
 const skf=1-G10B_COMFORT.arenaPadShrink*arenaW,shr=rig.points.map((p,i)=>{const c=rig.anchors[JOINTS[Math.floor(i/8)]];return {id:p.id,position:[c[0]+(p.position[0]-c[0])*skf,c[1]+(p.position[1]-c[1])*skf,c[2]+(p.position[2]-c[2])*skf]};});
 const pts=[...shr,...(!reduced?secondary:[]).map((p,i)=>({id:'skill-'+i,position:p}))],fitPts=shot?.skillEnvelope?shr:pts;
 for(const p of fitPts){delta.fromArray(p.position).sub(target);const z=delta.dot(dir);distance=Math.max(distance,z+Math.abs(delta.dot(right))/(tanX*edge),z+Math.abs(delta.dot(vertical))/(tanY*edge),z+.05*h);}
 const pos=target.clone().addScaledVector(dir,distance);
 if(arenaAnchor&&Number.isFinite(arenaAnchor.floorY))pos.y=Math.max(pos.y,arenaAnchor.floorY+G10B_COMFORT.arenaFloorH*h*Math.min(1,arenaW*2)); // G11.1: never below the stage floor
 const camera=new T.PerspectiveCamera(fov,aspect,.001,10000);camera.position.copy(pos);camera.lookAt(target);camera.updateMatrixWorld(true);
 const view=projectCameraPoints(T,camera,rig.points,width,height),secondaryView=secondary.length&&!reduced?projectCameraPoints(T,camera,pts.slice(rig.points.length),width,height):null;
 const facing=front.dot(pos.clone().sub(new T.Vector3().fromArray(rig.anchors.chest)).setY(0).normalize());
 return {...base,position:pos.toArray(),target:target.toArray(),radius:distance,fov,azimuth:yaw,preset:'g10b-smart-authorial',smart:{reason:reduced?'REDUCED':distance>planned+1e-6?'FIT':arena?'ARENA':'FACING',front:rig.front,frontFacingDot:facing,backView:facing<0,frontSingularity:rig.frontSingularity,ownership:'r61-cinematic',aspect,fov,radius:distance,plannedRadius:planned,safetyNet:distance>planned+1e-6,arenaWeight:arenaW,target:target.toArray(),azimuth:yaw,...view,secondary:secondaryView,calibration:rig.calibration,maxGuideYawSpeed:guide.maxYawSpeed,comfort:guide.metrics?.comfort?.version??null,temporalGuarantee:'ABSOLUTE_PREPARED_COMFORT_PLAN;FINAL_FIT_IS_A_REPORTED_SAFETY_NET'}};
}
