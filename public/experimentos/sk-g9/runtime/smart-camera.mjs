/** G10-A: read-only anatomical framing. All smoothing is prepared on absolute time,
 * using the director's EXISTING body sampler; no mixer/clock/RAF or source edits.
 * Toe direction disambiguates anatomical front in bind pose. Face/silhouette QA
 * remains required: these bounds are a padded joint cloud, not a skinned surface.
 */
import {r62CameraFrame} from './r62-camera.mjs';
const cache = new WeakMap();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
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

/** Reuse preparation across viewport/ablation/restart. Cache only small camera
 * guides, not models/curves. The caller restores pose with its normal start(). */
export function prepareCameraGuide({model,key,duration,samplePose,reader,hz=30}) {
 let records=cache.get(model);if(!records){records=new Map();cache.set(model,records);}if(records.has(key))return records.get(key);
 const n=Math.ceil(duration*hz),rows=[];let prev=0;
 for(let i=0;i<=n;i++){
  const t=Math.min(duration,i/hz);samplePose(t);const r=reader.read(),box=r.points.reduce((b,p)=>{p.position.forEach((x,j)=>{b.min[j]=Math.min(b.min[j],x);b.max[j]=Math.max(b.max[j],x);});return b;},{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
  let yaw=Math.atan2(r.front[0],r.front[2]);if(i)yaw=prev+Math.atan2(Math.sin(yaw-prev),Math.cos(yaw-prev));prev=yaw;
  rows.push({t,yaw,center:box.min.map((x,j)=>(x+box.max[j])/2),span:Math.hypot(...box.min.map((x,j)=>(box.max[j]-x)/2)),anchors:r.anchors});
 }
 // Symmetric finite convolution is independent of seek/play history. A bounded
 // yaw slew trades brief rear views during fast authentic spins for a camera
 // that does not whip around. Such intervals are reported, never called approved.
 const smooth=rows.map((r,i)=>{let w=0,y=0,c=[0,0,0];for(let j=Math.max(0,i-8);j<=Math.min(n,i+8);j++){const k=Math.exp(-.5*((j-i)/3.5)**2);w+=k;y+=rows[j].yaw*k;c=c.map((x,a)=>x+rows[j].center[a]*k);}return {...r,yaw:y/w,center:c.map(x=>x/w)};});
 // Bidirectional projection uses known future poses to start a turn early,
 // reducing prolonged lag after a fast source spin without increasing yaw speed.
 for(let pass=0;pass<80;pass++)for(const reverse of [false,true])for(let j=1;j<smooth.length;j++){
  const i=reverse?smooth.length-j:j,a=smooth[i-1],b=smooth[i],limit=2.4*(b.t-a.t),delta=b.yaw-a.yaw;
  if(Math.abs(delta)>limit){const correction=(delta-Math.sign(delta)*limit)/2;a.yaw+=correction;b.yaw-=correction;}
 }
 for(let i=1;i<smooth.length;i++){const d=2.4*(smooth[i].t-smooth[i-1].t);smooth[i].yaw=clamp(smooth[i].yaw,smooth[i-1].yaw-d,smooth[i-1].yaw+d);}
 const radii=new Map();
 const worldMin=[Infinity,Infinity,Infinity],worldMax=[-Infinity,-Infinity,-Infinity];
 for(const r of rows)r.center.forEach((x,j)=>{worldMin[j]=Math.min(worldMin[j],x-r.span);worldMax[j]=Math.max(worldMax[j],x+r.span);});
 const staticCenter=worldMin.map((x,j)=>(x+worldMax[j])/2),staticSpan=Math.hypot(...worldMin.map((x,j)=>(worldMax[j]-x)/2));
 const result=Object.freeze({staticFrame:{yaw:smooth[0].yaw,center:staticCenter,span:staticSpan},
 radiusAt(t,{plan,timeline,aspect,h,center,arena,period,reduced}){
  const key=[aspect,h,period,reduced,center.x,center.y,center.z,arena?.x,arena?.z].join('|');
  let values=radii.get(key);
  if(!values){values=rows.map((r,i)=>{
   const a=Object.fromEntries(['pel','head','rh','lh'].map(k=>[k,r.anchors[k]]));
   const b=r62CameraFrame({plan,timeline,t:r.t,aspect,h,center,arena,period,reduced,anchors:a});
   const vf=b.fov*Math.PI/180,hf=2*Math.atan(Math.tan(vf/2)*aspect),shift=Math.hypot(...r.center.map((x,j)=>x-smooth[i].center[j]));
   const arenaShift=/OUTER|PEAK|DISSIPATION/.test(b.phase)?.25*Math.hypot(...b.target.map((x,j)=>x-smooth[i].center[j])):0;
   return Math.max(b.radius,(r.span+shift+arenaShift+.03*h)/Math.sin(Math.min(vf,hf)*.84/2));
  });if(radii.size>=4)radii.delete(radii.keys().next().value);radii.set(key,values);}
  // Smooth upper envelope: anticipate a needed dolly instead of an instantaneous
  // radius correction. Explicit absolute-time lookahead, not runtime damping.
  const speed=2*h,epsilon=.22,temp=.025*h;
  const vv=values.map((r,i)=>r-speed*(Math.hypot(rows[i].t-t,epsilon)-epsilon)),max=Math.max(...vv);
  return max+temp*Math.log(vv.reduce((sum,v)=>sum+Math.exp((v-max)/temp),0));
 },
 sample(t){const x=clamp(t*hz,0,n),i=Math.min(n-1,Math.floor(x)),a=smooth[i],b=smooth[i+1],u=clamp((t-a.t)/(b.t-a.t),0,1);return {yaw:a.yaw+(b.yaw-a.yaw)*u,center:a.center.map((v,j)=>v+(b.center[j]-v)*u)};},samples:rows.length,hz,maxYawSpeed:2.4});
 if(records.size>=2)records.delete(records.keys().next().value);records.set(key,result);return result;
}

export function projectCameraPoints(T,camera,points,width,height) {
 camera.updateMatrixWorld(true);const v=new T.Vector3(),view=new T.Vector3();
 const projected=points.map(p=>{v.fromArray(p.position);view.copy(v).applyMatrix4(camera.matrixWorldInverse);v.project(camera);return {id:p.id,ndc:v.toArray(),inFront:view.z<-camera.near,inFrustum:view.z<-camera.near&&view.z>-camera.far&&Math.abs(v.x)<=1&&Math.abs(v.y)<=1,pixels:[(v.x+1)*width/2,(1-v.y)*height/2]};});
 const b=projected.reduce((b,p)=>{b.minX=Math.min(b.minX,p.ndc[0]);b.maxX=Math.max(b.maxX,p.ndc[0]);b.minY=Math.min(b.minY,p.ndc[1]);b.maxY=Math.max(b.maxY,p.ndc[1]);return b;},{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});
 const area=Math.max(1e-12,(b.maxX-b.minX)*(b.maxY-b.minY)),visible=Math.max(0,Math.min(1,b.maxX)-Math.max(-1,b.minX))*Math.max(0,Math.min(1,b.maxY)-Math.max(-1,b.minY));
 return {points:projected,projectedBounds:b,visibleBoxPercent:100*visible/area,marginPixels:Math.min((1+b.minX)*width/2,(1-b.maxX)*width/2,(1+b.minY)*height/2,(1-b.maxY)*height/2),outside:projected.filter(p=>!p.inFrustum).length,boundsKind:'PADDED_ANATOMICAL_POINTS_NOT_SKIN_SURFACE'};
}

/** Exact perspective inequalities fit an oriented cloud including depth, not
 * just a span/tan estimate. The existing F1 shape is a MINIMUM shot distance. */
export function smartCameraFrame(T,{base,rig,guide,t,h,aspect,width=960,height=540,reduced=false,secondary=[],plan,timeline,center,arena:arenaAnchor,period=18}) {
 const g=reduced&&guide.staticFrame?guide.staticFrame:guide.sample(t),front=new T.Vector3().fromArray(rig.front);
 const yaw=g.yaw+(reduced?.12:.28*Math.sin(t*Math.PI*2/18)+.12),dir=new T.Vector3(Math.sin(yaw),reduced?.12:.16,Math.cos(yaw)).normalize();
 const arena=/OUTER|PEAK|DISSIPATION/.test(base.phase),target=new T.Vector3().fromArray(g.center);
 if(arena)target.lerp(new T.Vector3().fromArray(base.target),.25);
 const up=new T.Vector3(0,1,0),right=new T.Vector3().crossVectors(up,dir).normalize(),vertical=new T.Vector3().crossVectors(dir,right).normalize();
 const fov=base.fov,tanY=Math.tan(fov*Math.PI/360),tanX=tanY*aspect,edge=.84,delta=new T.Vector3();let distance=plan?guide.radiusAt(t,{plan,timeline,aspect,h,center,arena:arenaAnchor,period,reduced}):base.radius;
 if(reduced&&g.span)distance=Math.max(base.radius,(g.span+2*h)/Math.sin(Math.min(2*Math.atan(tanX),2*Math.atan(tanY))*.84/2));
 const pts=[...rig.points,...(!reduced?secondary:[]).map((p,i)=>({id:'skill-'+i,position:p}))];
 for(const p of pts){delta.fromArray(p.position).sub(target);const z=delta.dot(dir);distance=Math.max(distance,z+Math.abs(delta.dot(right))/(tanX*edge),z+Math.abs(delta.dot(vertical))/(tanY*edge),z+.05*h);}
 const pos=target.clone().addScaledVector(dir,distance),camera=new T.PerspectiveCamera(fov,aspect,.001,10000);camera.position.copy(pos);camera.lookAt(target);camera.updateMatrixWorld(true);
 const view=projectCameraPoints(T,camera,rig.points,width,height),secondaryView=secondary.length&&!reduced?projectCameraPoints(T,camera,pts.slice(rig.points.length),width,height):null;
 const facing=front.dot(pos.clone().sub(new T.Vector3().fromArray(rig.anchors.chest)).setY(0).normalize());
 return {...base,position:pos.toArray(),target:target.toArray(),radius:distance,azimuth:yaw,preset:'g10-smart-authorial',smart:{reason:reduced?'REDUCED':distance>base.radius+1e-6?'FIT':arena?'ARENA':'FACING',front:rig.front,frontFacingDot:facing,backView:facing<0,frontSingularity:rig.frontSingularity,ownership:'r61-cinematic',aspect,fov,radius:distance,target:target.toArray(),azimuth:yaw,...view,secondary:secondaryView,calibration:rig.calibration,maxGuideYawSpeed:guide.maxYawSpeed,temporalGuarantee:'ABSOLUTE_PREPARED_GUIDE;FINAL_FIT_MAY_REACT_TO_G7_DISCONTINUITY'}};
}
