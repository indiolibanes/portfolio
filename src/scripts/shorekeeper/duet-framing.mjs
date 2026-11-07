/** Bounds-only camera fit at resize/reset, never an animation or per-frame skinned-vertex pass. */
export function duetFitDistance({width,height,depth=0,aspect,fov,azimuth=0,lift=.23,padding=.12,minDistance=1}){
 if(![width,height,depth,aspect,fov,azimuth,lift,padding,minDistance].every(Number.isFinite)||width<=0||height<=0||depth<0||aspect<=0||fov<=0||fov>=150||padding<0||padding>=.5||minDistance<=0)throw Error('Invalid duet framing envelope');
 const tan=Math.tan(fov*Math.PI/360),sin=Math.sin(azimuth),cos=Math.cos(azimuth),limit=1-padding;
 const fits=d=>{const radius=Math.hypot(d,lift),sp=lift/radius,cp=d/radius;
  for(const x of [-width/2,width/2])for(const y of [-height/2,height/2])for(const z of [-depth/2,depth/2]){
   const viewDepth=radius-(x*sin*cp+y*sp+z*cos*cp);if(viewDepth<=.03)return false;
   if(Math.abs(x*cos-z*sin)>viewDepth*tan*aspect*limit||Math.abs(-x*sin*sp+y*cp-z*cos*sp)>viewDepth*tan*limit)return false;
  }return true;
 };
 let lo=minDistance,hi=minDistance;for(let i=0;i<32&&!fits(hi);i++)hi*=2;
 if(!fits(hi))throw Error('Unbounded duet camera');if(fits(lo))return lo;
 for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(fits(mid))hi=mid;else lo=mid;}return hi;
}
/** setFromObject alone can reuse a stale SkinnedMesh boundingBox from an earlier pose. */
export function currentDuetBounds(T,root){
 root.updateMatrixWorld(true);const box=new T.Box3();
 root.traverse(o=>{if(!o.isMesh)return;if(o.isSkinnedMesh)o.computeBoundingBox();else if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const local=o.boundingBox??o.geometry.boundingBox;if(local)box.union(local.clone().applyMatrix4(o.matrixWorld));});
 return box;
}
