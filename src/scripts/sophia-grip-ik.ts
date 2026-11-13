import * as T from 'three';
/** Bounded CCD over the existing arm rotations, after the sole mixer sample.
 * No translations, weights, bind matrices or original animation tracks change. */
export function createGripSolver(root:T.Object3D,side:'Left'|'Right') {
 const find=(suffix:string)=>{let out:T.Object3D|undefined;root.traverse(n=>{if(n.name.endsWith(side+suffix))out=n;});return out;};
 const effector=find('HandMiddle1')??find('Hand'),joints=[find('ForeArm'),find('Arm'),find('Shoulder')].filter((x):x is T.Object3D=>!!x);
 const point=new T.Vector3(),pivot=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3();const q=new T.Quaternion(),world=new T.Quaternion(),parent=new T.Quaternion(),out=new T.Quaternion(),identity=new T.Quaternion();
 const baseline=joints.map(()=>new T.Quaternion());
 return {available:!!effector&&joints.length>=2,effector,
 solve(target:T.Vector3,weight:number) {
  if(!effector||weight<=0)return null;
  joints.forEach((j,i)=>baseline[i].copy(j.quaternion));
  for(let k=0;k<18;k++)for(let i=0;i<joints.length;i++){
   const joint=joints[i];joint.updateWorldMatrix(true,true);effector.getWorldPosition(point);joint.getWorldPosition(pivot);
   a.copy(point).sub(pivot).normalize();b.copy(target).sub(pivot).normalize();q.setFromUnitVectors(a,b);
   const angle=2*Math.acos(Math.min(1,Math.abs(q.w)));if(angle>.3)q.slerp(identity,1-.3/angle);
   joint.getWorldQuaternion(world);joint.parent!.getWorldQuaternion(parent);out.copy(parent).invert().multiply(q).multiply(world);
   const limit=i===2?.7:1.9,delta=baseline[i].angleTo(out);if(delta>limit)out.slerp(baseline[i],1-limit/delta);
   joint.quaternion.copy(out);joint.updateWorldMatrix(false,true);
  }
  joints.forEach((j,i)=>j.quaternion.slerp(baseline[i],1-weight));root.updateWorldMatrix(true,true);
  return effector.getWorldPosition(point).distanceTo(target);
 }};
}
