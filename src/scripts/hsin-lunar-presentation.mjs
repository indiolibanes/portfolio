/** Public experience version; the reversible V2.1 acting artifact remains unchanged. */
export const HSIN_LUNAR_PRESENTATION=Object.freeze({
 version:'2.0.1',apparentBodyDegrees:55,neckShare:.36,maxCompensationDegrees:35,
});

/** A static presentation transform, applied after #170's reference and before actors.
 * No arm writes, timers, frame updates, solver or modification of the acting profile. */
export function createLunarPresentation({THREE:T,model,bones,bounds,cameraAzimuthDegrees=8,apparentBodyDegrees=HSIN_LUNAR_PRESENTATION.apparentBodyDegrees}){
 if(!(apparentBodyDegrees>=35&&apparentBodyDegrees<=65))throw Error('Uncalibrated lunar presentation angle.');
 const by=new Map(bones.map(b=>[b.name,b])),names=['ORG-Bip001Neck','DEF-Bip001Neck','ORG-Bip001Head','DEF-Bip001Head'];
 const entries=names.map(name=>{const bone=by.get(name);if(!bone)throw Error('Missing presentation bone '+name);return {bone,quaternion:bone.quaternion.clone()};});
 const root=model.quaternion.clone(),v=()=>new T.Vector3(),q=()=>new T.Quaternion();
 const compensation=Math.min(HSIN_LUNAR_PRESENTATION.maxCompensationDegrees,Math.max(0,apparentBodyDegrees-30));
 const neck=compensation*HSIN_LUNAR_PRESENTATION.neckShare,head=compensation-neck,rootDegrees=cameraAzimuthDegrees-apparentBodyDegrees;
 const restore=()=>{model.quaternion.copy(root);model.updateMatrix();for(const row of entries){row.bone.quaternion.copy(row.quaternion);row.bone.updateMatrix();}model.updateWorldMatrix(true,true);};
 function apply(){
  restore();
  const up=by.get('ORG-Bip001Neck').getWorldPosition(v()).sub(by.get('ORG-Bip001Spine2').getWorldPosition(v())).normalize();
  for(const [part,degrees]of [['Neck',neck],['Head',head]])for(const prefix of ['ORG','DEF']){
   const bone=by.get(prefix+'-Bip001'+part),desired=q().setFromAxisAngle(up,T.MathUtils.degToRad(degrees)).multiply(bone.getWorldQuaternion(q()));
   bone.quaternion.copy(bone.parent.getWorldQuaternion(q()).invert().multiply(desired)).normalize();bone.updateMatrix();bone.updateWorldMatrix(true,true);
  }
  // Root yaw is around the vertical of the stone floor, not the inclined anatomical axis.
  const axis=new T.Vector3(0,1,0);if(model.parent)axis.applyQuaternion(model.parent.getWorldQuaternion(q()).invert());
  model.quaternion.copy(root).premultiply(q().setFromAxisAngle(axis,T.MathUtils.degToRad(rootDegrees)));model.updateMatrix();model.updateWorldMatrix(true,true);
 }
 const fitBounds=()=>{
  const box=new T.Box3();for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])box.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(model.matrixWorld));
  return {min:box.min.toArray(),max:box.max.toArray()};
 };
 return {apply,restore,fitBounds,
  feet:()=>['R','L'].map(side=>{const bone=by.get('ORG-Bip001Foot'+side);if(!bone)throw Error('Foot anchor missing');const p=bone.getWorldPosition(v());return [p.x,.003,p.z];}),
  parameters:{apparentBodyDegrees,rootDegrees,neckDegrees:neck,headDegrees:head,cameraAzimuthDegrees},
 };
}
