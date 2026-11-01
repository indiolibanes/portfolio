import {sampleHandSurface,createHandClearance} from './hsin-hand-clearance.mjs';
import {createSleeveIntersectionAudit} from './hsin-sleeve-intersections.mjs';
import {resolveHsinBones} from './hsin-gesture-ik.mjs';
import {solveSignatureElbow} from './hsin-left-signature.mjs';
import {createPathTiming} from './hsin-path-timing.mjs';
import {createArmClearanceAudit} from './hsin-arm-clearance.mjs';
import {inspectHsinWaypointContinuity} from './hsin-waypoint-safety.mjs';
/** Left-only hair caress candidate, baked from existing ORG/DEF and the loaded hair surface.
 * Right stays exclusively at mouth/chin. No finger, hair-bone, mesh or material edits. */
export function createHairPose({THREE,bones,meshes,head,calibration}){
 const names=['ORG-Bip001Spine2','ORG-Bip001Neck','ORG-Bip001UpperArm.L','ORG-Bip001Forearm.L','ORG-Bip001Hand.L','ORG-Bip001Finger1.L','DEF-Bip001UpperArm.L','DEF-Bip001Forearm.L','DEF-Bip001Hand.L'];
 const found=resolveHsinBones(bones,names),map=found.resolved,v=()=>new THREE.Vector3(),q=()=>new THREE.Quaternion();
 const changed=names.slice(2,5).concat(names.slice(6)).map(n=>map.get(n)).filter(Boolean),base=new Map(changed.map(b=>[b,b.quaternion.clone()]));
 const restore=()=>{for(const[b,r]of base)b.quaternion.copy(r);changed.forEach(b=>b.updateWorldMatrix(true,true));};
 let ready=false,reason='Rig ou cabelo não disponíveis.',route=[],timing=null,metrics={};
 const diagnostics=()=>({ready,reason,side:'L',visual:'PENDING',method:'SURFACE_APPROACH_AND_SHORT_STROKE',...metrics});
 const apply=t=>{
  if(!ready||!Number.isFinite(t))return false;t=Math.max(0,Math.min(1,t));if(t===0){restore();return true;}
  const {index,mix}=timing.sample(t);for(const b of changed)b.quaternion.copy(route[index].pose.get(b)).slerp(route[index+1].pose.get(b),mix);
  changed.forEach(b=>b.updateWorldMatrix(true,true));return true;
 };
 const api={apply,restore,atBaseline:()=>ready&&[...base].every(([b,r])=>b.quaternion.toArray().every((x,i)=>x===r.toArray()[i])),diagnostics};
 if(found.missing.length||found.ambiguous.length||!head||!calibration?.ready)return api;
 const [spine,neck,upper,fore,hand,finger]=names.slice(0,6).map(n=>map.get(n));
 if(fore.parent!==upper||hand.parent!==fore)return api;
 const root=spine.getWorldPosition(v()),up=neck.getWorldPosition(v()).sub(root).normalize(),shoulder=upper.getWorldPosition(v()),elbow=fore.getWorldPosition(v()),wrist=hand.getWorldPosition(v());
 const outward=shoulder.clone().sub(root);outward.addScaledVector(up,-outward.dot(up)).normalize();
 const eyes=head.localToWorld(new THREE.Vector3(...calibration.focusCenter)),forward=eyes.clone().sub(head.getWorldPosition(v()));forward.addScaledVector(up,-forward.dot(up)).addScaledVector(outward,-forward.dot(outward)).normalize();
 const scale=calibration.radius/2.5*head.getWorldScale(v()).length()/Math.sqrt(3),hair=[];
 for(const mesh of meshes)if(/hair|bangs/i.test(mesh.material?.name??'')){
  mesh.updateWorldMatrix(true,false);mesh.skeleton.update();
  for(let i=0;i<mesh.geometry.getAttribute('position').count;i++){
   const p=mesh.getVertexPosition(i,v()).applyMatrix4(mesh.matrixWorld),d=p.clone().sub(eyes),x=d.dot(outward),y=d.dot(up);
   if(x>scale*.4&&x<scale*1.7&&y>scale*1.45&&y<scale*2.2)hair.push(p);
  }
 }
 if(hair.length<8){reason='Superfície lateral de cabelo insuficiente.';return api;}
 // Frontmost point near the side of the face, below eye height. Start outside, stroke down.
 const ideal=eyes.clone().addScaledVector(outward,scale*.9).addScaledVector(up,scale*1.85);
 hair.sort((a,b)=>a.distanceToSquared(ideal)-b.distanceToSquared(ideal));const anchor=hair[0];
 const restWorld=new Map(changed.map(b=>[b,b.getWorldQuaternion(q())]));
 const localFinger=hand.worldToLocal(finger.getWorldPosition(v())).normalize(),fingerLength=finger.getWorldPosition(v()).distanceTo(wrist);
 const long=up.clone().multiplyScalar(.3).addScaledVector(outward,-.15).addScaledVector(forward,-.94).normalize();
 const pole=outward.clone().multiplyScalar(.7).addScaledVector(up,-3).addScaledVector(forward,.35);
 const orient=(bone,from,to)=>{const desired=q().setFromUnitVectors(from.normalize(),to.normalize()).multiply(bone.getWorldQuaternion(q()));bone.quaternion.copy(bone.parent.getWorldQuaternion(q()).invert().multiply(desired)).normalize();bone.updateWorldMatrix(true,true);};
 const snapshot=()=>({pose:new Map(changed.map(b=>[b,b.quaternion.clone()])),shoulder:upper.getWorldPosition(v()),elbow:fore.getWorldPosition(v()),wrist:hand.getWorldPosition(v()),quaternions:changed.map(b=>b.quaternion.clone())});
 const solve=(point,direction)=>{
  restore();const solution=solveSignatureElbow(THREE,shoulder,point,shoulder.distanceTo(elbow),elbow.distanceTo(wrist),pole);
  if(!solution||THREE.MathUtils.radToDeg(solution.flexion)>150){metrics.lastRejected={kind:'reach',flexion:solution?THREE.MathUtils.radToDeg(solution.flexion):null};return null;}
  orient(upper,fore.getWorldPosition(v()).sub(shoulder),solution.elbow.clone().sub(shoulder));

  orient(fore,hand.getWorldPosition(v()).sub(fore.getWorldPosition(v())),point.clone().sub(fore.getWorldPosition(v())));
  orient(hand,localFinger.clone().applyQuaternion(hand.getWorldQuaternion(q())),direction.clone());
  const handAngle=base.get(hand).angleTo(hand.quaternion),maxWrist=THREE.MathUtils.degToRad(75);
  if(handAngle>maxWrist){const limited=base.get(hand).clone().slerp(hand.quaternion,maxWrist/handAngle);hand.quaternion.copy(limited);hand.updateWorldMatrix(true,true);metrics.wristLimited=true;}
  for(const[org,def]of [[names[2],names[6]],[names[3],names[7]],[names[4],names[8]]]){
   const a=map.get(org),b=map.get(def),world=a.getWorldQuaternion(q()).multiply(restWorld.get(a).clone().invert()).multiply(restWorld.get(b));
   b.quaternion.copy(b.parent.getWorldQuaternion(q()).invert().multiply(world)).normalize();b.updateWorldMatrix(true,true);
  }
  if(hand.getWorldPosition(v()).distanceTo(point)>scale*.05||base.get(hand).angleTo(hand.quaternion)>Math.PI*.48){metrics.lastRejected={kind:'wrist',angle:THREE.MathUtils.radToDeg(base.get(hand).angleTo(hand.quaternion)),error:hand.getWorldPosition(v()).distanceTo(point)};return null;}
  return snapshot();
 };
 try{
  const rest=snapshot(),restDirection=localFinger.clone().applyQuaternion(restWorld.get(hand));
  metrics.anchor=anchor.toArray();
  const contact=anchor.clone().addScaledVector(forward,scale*.9).addScaledVector(outward,scale*.3),target=contact.clone().addScaledVector(long,-fingerLength);
  const depart=solve(wrist.clone().addScaledVector(forward,scale*1.3).addScaledVector(up,scale*.4),restDirection);
  const approach=solve(target.clone().addScaledVector(forward,scale*.9).addScaledVector(outward,scale*.55).addScaledVector(up,-scale*.4),long);
  const touch=solve(target,long),stroke=solve(target.clone().addScaledVector(up,-scale*.45).addScaledVector(outward,scale*.1).addScaledVector(forward,scale*.4),long);
  if(!depart||!approach||!touch||!stroke){metrics.stages={depart:!!depart,approach:!!approach,touch:!!touch,stroke:!!stroke};reason='Trajetória do cabelo fora dos limites conservadores.';return api;}
  route=[rest,depart,approach,touch,stroke];
  timing=createPathTiming([0,.20,.62,.82,1],route.slice(1).map((p,i)=>Math.hypot(...changed.map(b=>route[i].pose.get(b).angleTo(p.pose.get(b))))));
  ready=true;const guard=createArmClearanceAudit({THREE,meshes,side:'L',origin:root,outward,up,forward,scale,includeHead:true,includeMovingGarment:true});
  const sleeveGuard=createSleeveIntersectionAudit({THREE,meshes,side:'L',scale});
  const frames=[],failures=[],coverage={torso:0,sleeve:0,head:0,hair:0};
  for(let i=0;i<=64;i++){
   apply(i/64);frames.push(snapshot());const result=guard.check(),exact=sleeveGuard.check();if(exact.covered)result.sleeve={tested:exact.tested,violations:exact.intersections,minClearance:null};for(const[k,row]of Object.entries(result)){coverage[k]+=row.tested;if(row.violations)failures.push({frame:i,kind:k,count:row.violations,...(k==='sleeve'?{contacts:exact.contacts}:{})});}
  }
  const continuity=inspectHsinWaypointContinuity(frames);
  metrics={...metrics,continuity,hairSamples:hair.length,strokeEyeSpans:.45,pathGuard:{...guard.diagnostics(),sleeveSurface:sleeveGuard.diagnostics(),samples:65,coverage,failures},fingerRotations:'PRESERVED'};
  const nearHair=createHandClearance({points:hair.map(p=>p.toArray()),scale}).check(sampleHandSurface({THREE,meshes,side:'L'}));metrics.nearestHairDistance=nearHair.minDistance;
  ready=continuity.ok&&failures.length===0&&coverage.head+coverage.hair>0&&nearHair.minDistance!==null&&nearHair.minDistance<scale*.65;
  reason=ready?'Candidata de cabelo passou pelo envelope amostrado; contato e naturalidade exigem revisão visual.':'Cabelo/rosto/roupa sem folga na trajetória: gesto suspenso.';
 }finally{restore();}
 return api;
}
