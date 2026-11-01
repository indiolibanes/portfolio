import { resolveHsinBones } from './hsin-gesture-ik.mjs';
import { measuredGazeAxes } from './hsin-face-rig.mjs';
/** Analytic two-segment geometry, reusable independently of any character's bone names. */
export function solveSignatureElbow(THREE,shoulder,target,upperLength,foreLength,pole) {
  const direction=target.clone().sub(shoulder),distance=direction.length();
  if(!(upperLength>0&&foreLength>0&&distance>Math.abs(upperLength-foreLength)+1e-5&&distance<upperLength+foreLength-1e-5))return null;
  direction.normalize();const transverse=pole.clone().addScaledVector(direction,-pole.dot(direction));
  if(transverse.length()<1e-5)return null;transverse.normalize();
  const along=(upperLength**2-foreLength**2+distance**2)/(2*distance);
  const height=Math.sqrt(Math.max(0,upperLength**2-along**2));
  const flexion=Math.acos(THREE.MathUtils.clamp((distance**2-upperLength**2-foreLength**2)/(2*upperLength*foreLength),-1,1));
  return {elbow:shoulder.clone().addScaledVector(direction,along).addScaledVector(transverse,height),flexion};
}

/** Hsin adapter: RIGHT chain audited independently. No mirroring/right solver/mesh edits. */
export function createRightSignaturePose({THREE,bones,meshes,head,calibration}) {
  const names=['ORG-Bip001UpperArm.R','ORG-Bip001Forearm.R','ORG-Bip001Hand.R',
    'ORG-Bip001Finger1.R','ORG-Bip001Finger4.R','DEF-Bip001UpperArm.R','DEF-Bip001Forearm.R','DEF-Bip001Hand.R',
    'ORG-Bip001Finger12.R','ORG-Bip001Finger22.R','ORG-Bip001Finger32.R','ORG-Bip001Finger42.R'];
  const match=resolveHsinBones(bones,names),map=match.resolved;
  let active=false,reason='Rig direito ausente/ambíguo ou calibração ocular indisponível.',candidate=null,report={};
  const q=()=>new THREE.Quaternion(),v=()=>new THREE.Vector3();
  const changed=names.filter(n=>!n.includes('Finger')).map(n=>map.get(n)).filter(Boolean);
  const baseline=new Map(changed.map(b=>[b,b.quaternion.clone()]));
  const restore=()=>{for(const[b,r]of baseline)b.quaternion.copy(r);head?.updateWorldMatrix(true,true);changed.forEach(b=>b.updateWorldMatrix(true,true));active=false;};
  const diagnostic=()=>({ready:!!candidate,active,reason,status:'VISUAL_QA_PENDING',...report});
  if(match.missing.length||match.ambiguous.length||!head||!calibration.ready)return {apply:()=>false,restore,diagnostics:diagnostic};
  const upper=map.get(names[0]),fore=map.get(names[1]),hand=map.get(names[2]);
  if(fore.parent!==upper||hand.parent!==fore){reason='Cadeia direita não contígua; pose não aplicada.';return {apply:()=>false,restore,diagnostics:diagnostic};}
  const influences=new Map(changed.map(b=>[b,0]));
  for(const mesh of meshes){const joints=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');if(!joints||!weights)continue;
    for(let i=0;i<joints.count;i++)for(let c=0;c<4;c++){const bone=mesh.skeleton.bones[joints.getComponent(i,c)];if(weights.getComponent(i,c)>.001)for(const branch of changed){let current=bone;while(current&&current!==branch)current=current.parent;if(current===branch)influences.set(branch,influences.get(branch)+1);}}}
  if(['DEF-Bip001UpperArm.R','DEF-Bip001Forearm.R','ORG-Bip001Hand.R'].some(n=>!influences.get(map.get(n)))){
    reason='Deformadores direitos sem influência comprovada; pose não aplicada.';return {apply:()=>false,restore,diagnostics:diagnostic};}
  changed.forEach(b=>b.updateWorldMatrix(true,true));
  const scale=head.getWorldScale(v());
  if(Math.max(scale.x,scale.y,scale.z)-Math.min(scale.x,scale.y,scale.z)>.01*Math.max(scale.x,scale.y,scale.z)){reason='Escala não uniforme: pose direita indisponível.';return {apply:()=>false,restore,diagnostics:diagnostic};}
  const restWorld=new Map(changed.map(b=>[b,b.getWorldQuaternion(q())]));
  const shoulder=upper.getWorldPosition(v()),elbow=fore.getWorldPosition(v()),wrist=hand.getWorldPosition(v());
  const l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(wrist),eyes=head.localToWorld(new THREE.Vector3(...calibration.focusCenter));
  const axes=measuredGazeAxes(THREE,calibration),headQ=head.getWorldQuaternion(q());
  const up=new THREE.Vector3(...axes.vertical).applyQuaternion(headQ).normalize();
  const left=shoulder.clone().sub(head.getWorldPosition(v())).addScaledVector(up,-shoulder.clone().sub(head.getWorldPosition(v())).dot(up)).normalize();
  const forward=eyes.clone().sub(head.getWorldPosition(v())).addScaledVector(up,-eyes.clone().sub(head.getWorldPosition(v())).dot(up));
  forward.addScaledVector(left,-forward.dot(left)).normalize();
  const eyeSpan=calibration.radius/2.5*head.getWorldScale(v()).length()/Math.sqrt(3);
  const knuckle=map.get(names[3]).getWorldPosition(v());
  const localLong=hand.worldToLocal(knuckle.clone()).normalize();
  const long=left.clone().multiplyScalar(-.8).addScaledVector(up,.25).addScaledVector(forward,-.85).normalize();
  const knuckleTarget=eyes.clone().addScaledVector(up,-1.9*eyeSpan).addScaledVector(left,.35*eyeSpan).addScaledVector(forward,.75*eyeSpan);
  const target=knuckleTarget.clone().addScaledVector(long,-wrist.distanceTo(knuckle));
  const pole=left.clone().multiplyScalar(.85).addScaledVector(up,-1).addScaledVector(forward,.35);
  const solution=solveSignatureElbow(THREE,shoulder,target,l1,l2,pole);
  if(!solution){reason='Alvo sob o queixo fora do alcance direito; pose não aplicada.';return {apply:()=>false,restore,diagnostics:diagnostic};}
  const orient=(bone,from,to)=>{
    bone.updateWorldMatrix(true,false);const desired=q().setFromUnitVectors(from.normalize(),to.normalize()).multiply(bone.getWorldQuaternion(q()));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(q()).invert().multiply(desired)).normalize();bone.updateWorldMatrix(true,true);
  };
  try {
    orient(upper,fore.getWorldPosition(v()).sub(shoulder),solution.elbow.clone().sub(shoulder));
    orient(fore,hand.getWorldPosition(v()).sub(fore.getWorldPosition(v())),target.clone().sub(fore.getWorldPosition(v())));
    orient(hand,localLong.clone().applyQuaternion(hand.getWorldQuaternion(q())),long.clone());
    for(const [org,def] of [[names[0],names[5]],[names[1],names[6]],[names[2],names[7]]]){
      const driver=map.get(org),deformer=map.get(def);driver.updateWorldMatrix(true,false);
      const desired=driver.getWorldQuaternion(q()).multiply(restWorld.get(driver).clone().invert()).multiply(restWorld.get(deformer));
      deformer.quaternion.copy(deformer.parent.getWorldQuaternion(q()).invert().multiply(desired)).normalize();deformer.updateWorldMatrix(true,true);
    }
    const error=hand.getWorldPosition(v()).distanceTo(target),wristAngle=baseline.get(hand).angleTo(hand.quaternion),upperAngle=baseline.get(upper).angleTo(upper.quaternion);
    const tip=map.get(names[3]).getWorldPosition(v());
    const belowEyes=eyes.clone().sub(tip).dot(up)/eyeSpan;
    const fingerTipsBelowEyes=Math.min(...names.slice(8).map(n=>eyes.clone().sub(map.get(n).getWorldPosition(v())).dot(up)/eyeSpan));
    report={matches:match.matches,weightedBranchReferences:Object.fromEntries([...influences].map(([b,n])=>[b.name,n])),
      wristTargetError:error,eyeSpan,elbowFlexionDegrees:THREE.MathUtils.radToDeg(solution.flexion),
      wristRotationDegrees:THREE.MathUtils.radToDeg(wristAngle),upperRotationDegrees:THREE.MathUtils.radToDeg(upperAngle),knuckleBelowEyesInEyeSpans:belowEyes,fingerTipsBelowEyesInEyeSpans:fingerTipsBelowEyes,
      collisionValidation:'NOT_A_COLLISION_SOLVER',fingerLocalRotations:'PRESERVED'};
    if(error>eyeSpan*.05||solution.flexion>THREE.MathUtils.degToRad(148)||wristAngle>THREE.MathUtils.degToRad(65)||upperAngle>THREE.MathUtils.degToRad(105)||belowEyes<1.4||fingerTipsBelowEyes<1.25||!changed.every(b=>b.quaternion.toArray().every(Number.isFinite)))
      reason='Candidata direita excedeu limites geométricos conservadores; pose não aplicada.';
    else {candidate=new Map(changed.map(b=>[b,b.quaternion.clone()]));reason='Candidata direita calculada sob o queixo; naturalidade e interpenetração exigem QA visual.';}
  }finally{restore();}
  return {
    apply(t=1){if(!candidate)return false;const weight=Math.max(0,Math.min(1,t));for(const[b,r]of candidate)b.quaternion.copy(baseline.get(b)).slerp(r,weight);changed.forEach(b=>b.updateWorldMatrix(true,true));active=weight>0;return true;},
    restore,diagnostics:diagnostic,
  };
}
