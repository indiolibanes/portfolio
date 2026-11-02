/** Declarative V2.1 reference. Bone parameters are baked offline; camera yaw is independent. */
export const HSIN_CINEMATIC_IDLE=Object.freeze({
 enabled:true,
 cameraAzimuthDegrees:8,
 fadeEnd:.375,
 proximalOffsets:Object.freeze({torsoYaw:0,torsoRoll:0,neck:0,clavicleR:0,clavicleL:0}),
 head:Object.freeze({yaw:4,roll:-2}),
 arms:Object.freeze({
  R:Object.freeze({adduction:1.5,elbowFlexion:4,wristFlexion:2}),
  L:Object.freeze({adduction:2,elbowFlexion:6,wristFlexion:2}),
 }),
});
export function cinematicDefinition(config=HSIN_CINEMATIC_IDLE){
 return {fadeEnd:config.fadeEnd,proximalOffsets:config.proximalOffsets,head:config.head,arms:config.arms};
}

/** Apply once before constructing actors. No render-loop writer or quaternion allocation. */
export function createCinematicReference({bones,profile,enabled=HSIN_CINEMATIC_IDLE.enabled}){
 if(!enabled)return {apply(){},restore(){},ready:false};
 const data=profile.cinematicIdle;
 if(!data||JSON.stringify(data.definition)!==JSON.stringify(cinematicDefinition()))throw Error('Cinematic profile requires an offline rebake.');
 const byName=new Map(bones.map(b=>[b.name,b])),entries=data.reference.map(row=>{
  const bone=byName.get(row.name);if(!bone)throw Error('Missing cinematic bone '+row.name);
  const original=bone.quaternion.toArray();
  if(original.some((v,i)=>Math.abs(v-row.original[i])>1e-7))throw Error('Cinematic rest mismatch: '+row.name);
  return {bone,original,next:row.quaternion};
 });
 return {
  ready:true,
  apply(){for(const {bone,next}of entries){bone.quaternion.fromArray(next);bone.updateMatrix();}},
  restore(){for(const {bone,original}of entries){bone.quaternion.fromArray(original);bone.updateMatrix();}},
 };
}
