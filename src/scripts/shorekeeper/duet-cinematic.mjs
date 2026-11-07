/** G11.3 shot adapter: keep the authored azimuth/lens/beat, widen for both performers. */
export function createDuetCinematicFrame(T,{camera,host,guest,margin=.25,exclusionRects=()=>[]}){
 const initial={position:camera.position.clone(),direction:camera.getWorldDirection(new T.Vector3()),fov:camera.fov};
 const box=new T.Box3(),p=new T.Vector3(),target=new T.Vector3(),probe=new T.PerspectiveCamera();
 // A single geometry envelope per actor, then cheap world-space bone reads each frame.
 let exclusions=[],exclusionTime=-Infinity,lastAspect=null;
 const actors=[host,guest].filter(Boolean).map(root=>{
  root.updateMatrixWorld(true);const local=new T.Box3().setFromObject(root);const corners=[];
  for(const x of [local.min.x,local.max.x])for(const y of [local.min.y,local.max.y])for(const z of [local.min.z,local.max.z])corners.push(root.worldToLocal(new T.Vector3(x,y,z)));
  const bones=[];root.traverse(o=>{if(o.isBone&&/Root|Pelvis|Head|Hand|Foot|Toe|Spine2/.test(o.name))bones.push(o);});
  return {root,corners,bones};
 });
 return (frame,time)=>{
  box.makeEmpty();for(const a of actors){a.root.updateMatrixWorld(true);for(const c of a.corners)box.expandByPoint(p.copy(c).applyMatrix4(a.root.matrixWorld));for(const bone of a.bones)box.expandByPoint(bone.getWorldPosition(p));}
  box.expandByScalar(margin);box.getCenter(target);
  const authoredTarget=new T.Vector3().fromArray(frame.target),direction=new T.Vector3().fromArray(frame.position).sub(authoredTarget).normalize();
  const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new T.Vector3(x,y,z));
  if(time<exclusionTime||time-exclusionTime>=.2||camera.aspect!==lastAspect){exclusions=exclusionRects();exclusionTime=time;lastAspect=camera.aspect;}
  const excluded=exclusions;
  probe.aspect=camera.aspect;probe.fov=frame.fov;probe.near=camera.near;probe.updateProjectionMatrix();
  const fits=r=>{probe.position.copy(target).addScaledVector(direction,r);probe.lookAt(target);probe.updateMatrixWorld(true);if(!points.every(q=>{const v=q.clone().project(probe);return Math.abs(v.x)<=.82&&Math.abs(v.y)<=.70&&v.z<1&&v.z>-1;}))return false;
   for(const a of actors){const projected=a.corners.map(c=>c.clone().applyMatrix4(a.root.matrixWorld).project(probe));const bounds={left:Math.min(...projected.map(p=>p.x)),right:Math.max(...projected.map(p=>p.x)),bottom:Math.min(...projected.map(p=>p.y)),top:Math.max(...projected.map(p=>p.y))};if(excluded.some(r=>bounds.right>r.left&&bounds.left<r.right&&bounds.top>r.bottom&&bounds.bottom<r.top))return false;}return true;};
  let lo=.1,hi=Math.max(1,new T.Vector3().fromArray(frame.position).distanceTo(authoredTarget));for(let i=0;i<20&&!fits(hi);i++)hi*=1.5;
  for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(fits(mid))hi=mid;else lo=mid;}
  const position=target.clone().addScaledVector(direction,hi);
  // Blend into the first shot rather than snapping from the shared resting view.
  const u=Math.min(1,Math.max(0,time/.7)),s=u*u*(3-2*u);
  if(s<1){const initialTarget=initial.position.clone().add(initial.direction.clone().multiplyScalar(initial.position.distanceTo(target)));position.lerp(initial.position,1-s);target.lerp(initialTarget,1-s);}
  return {...frame,position:position.toArray(),target:target.toArray(),fov:initial.fov+(frame.fov-initial.fov)*s,duet:{fitDistance:hi,performers:actors.length,marginNdc:[.82,.70],visualQA:'PENDING'}};
 };
}
/** Bounded traces contain poses/clip metadata only, never private GLB bytes. */
export function createDuetTrace(T,model,group,limit=1800){
 const rows=[];let elapsed=0,next=0;
 const world=o=>{if(!o)return null;o.updateWorldMatrix(true,false);return {position:o.getWorldPosition(new T.Vector3()).toArray(),quaternion:o.getWorldQuaternion(new T.Quaternion()).toArray()};};
 return {sample(dt,{body,music,vfx,camera}){elapsed+=dt;if(elapsed<next)return;next=elapsed+.1;
  const row={t:elapsed,body,music,Root:world(model.getObjectByName('Root')),Pelvis:world(model.getObjectByName('Bip001Pelvis')),group:world(group),vfx,camera};rows.push(row);if(rows.length>limit)rows.shift();},report(){return rows.slice();}};
}
