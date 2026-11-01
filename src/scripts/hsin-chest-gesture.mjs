import {resolveHsinBones} from './hsin-gesture-ik.mjs';
import {solveSignatureElbow} from './hsin-left-signature.mjs';
import {measuredGazeAxes} from './hsin-face-rig.mjs';
/** Hsin-only right-arm candidate, calculated once; no mesh or GLB edits. */
export function createChestPose({THREE,bones,meshes,head,calibration}){
 const names=['ORG-Bip001Spine2','ORG-Bip001Neck','ORG-Bip001UpperArm.R','ORG-Bip001Forearm.R','ORG-Bip001Hand.R','ORG-Bip001Finger1.R','DEF-Bip001UpperArm.R','DEF-Bip001Forearm.R','DEF-Bip001Hand.R'];
 const found=resolveHsinBones(bones,names),map=found.resolved;let candidate=null,reason='Rig direito ou calibração ausentes.',metrics={};
 const changed=names.slice(2,5).concat(names.slice(6)).map(n=>map.get(n)).filter(Boolean),base=new Map(changed.map(b=>[b,b.quaternion.clone()]));
 const v=()=>new THREE.Vector3(),q=()=>new THREE.Quaternion();
 const restore=()=>{for(const[b,value]of base)b.quaternion.copy(value);changed.forEach(b=>b.updateWorldMatrix(true,true));};
 const diagnostic=()=>({ready:!!candidate,reason,collision:'VISUAL_QA_PENDING',...metrics});
 if(found.missing.length||found.ambiguous.length||!head||!calibration?.ready)return {apply:()=>false,restore,atBaseline:()=>false,diagnostics:diagnostic};
 const spine=map.get(names[0]),neck=map.get(names[1]),upper=map.get(names[2]),fore=map.get(names[3]),hand=map.get(names[4]),finger=map.get(names[5]);
 if(fore.parent!==upper||hand.parent!==fore){reason='Cadeia direita não contígua.';return {apply:()=>false,restore,atBaseline:()=>false,diagnostics:diagnostic};}
 changed.forEach(b=>b.updateWorldMatrix(true,true));const restWorld=new Map(changed.map(b=>[b,b.getWorldQuaternion(q())]));
 const influence=new Map(changed.map(b=>[b,0]));
 for(const mesh of meshes){const j=mesh.geometry.getAttribute('skinIndex'),w=mesh.geometry.getAttribute('skinWeight');if(!j||!w)continue;for(let i=0;i<j.count;i++)for(let k=0;k<4;k++){if(w.getComponent(i,k)<=.001)continue;const bone=mesh.skeleton.bones[j.getComponent(i,k)];for(const branch of changed){let cursor=bone;while(cursor&&cursor!==branch)cursor=cursor.parent;if(cursor===branch)influence.set(branch,influence.get(branch)+1);}}}
 if([names[4],names[6],names[7]].some(n=>!influence.get(map.get(n)))){reason='Cadeia direita sem influência comprovada no skin.';return {apply:()=>false,restore,atBaseline:()=>false,diagnostics:diagnostic};}
 const spineRest=spine.getWorldQuaternion(q()).normalize();
 const root=spine.getWorldPosition(v()),neckPos=neck.getWorldPosition(v()),shoulder=upper.getWorldPosition(v()),elbow=fore.getWorldPosition(v()),wrist=hand.getWorldPosition(v());
 const up=neckPos.clone().sub(root).normalize(),right=shoulder.clone().sub(root).addScaledVector(up,-shoulder.clone().sub(root).dot(up)).normalize();
 const eye=head.localToWorld(new THREE.Vector3(...calibration.focusCenter)),headPos=head.getWorldPosition(v()),forward=eye.clone().sub(headPos).addScaledVector(up,-eye.clone().sub(headPos).dot(up));forward.addScaledVector(right,-forward.dot(right)).normalize();
 const eyeSpan=calibration.radius/2.5*head.getWorldScale(v()).length()/Math.sqrt(3),center=root.clone().lerp(neckPos,.61).addScaledVector(right,eyeSpan*.35);
 // Sample the user's own skinned torso surface, excluding vertices dominated by arms.
 let surface=null,best=-Infinity,samples=0;
 for(const mesh of meshes){if(!/up xin/i.test(mesh.material?.name??''))continue;const j=mesh.geometry.getAttribute('skinIndex'),w=mesh.geometry.getAttribute('skinWeight');if(!j||!w)continue;mesh.updateWorldMatrix(true,false);mesh.skeleton.update();
  for(let i=0;i<j.count;i++){let trunk=0;for(let k=0;k<4;k++){const bone=mesh.skeleton.bones[j.getComponent(i,k)];if(/spine|pelvis|neck/i.test(bone?.name??''))trunk+=w.getComponent(i,k);}if(trunk<.5)continue;
   const p=mesh.getVertexPosition(i,v()).applyMatrix4(mesh.matrixWorld),d=p.clone().sub(center),h=d.dot(right),vertical=d.dot(up),depth=d.dot(forward);
   if(Math.abs(h)>eyeSpan*.8||Math.abs(vertical)>eyeSpan*.55)continue;samples++;
   const score=depth*.55-Math.abs(h)*1.2-Math.abs(vertical)*1.2;if(score>best){best=score;surface=p;}
  }
 }
 if(!surface||samples<5){reason='Superfície do torso não identificada com segurança.';return {apply:()=>false,restore,atBaseline:()=>false,diagnostics:diagnostic};}
 const desiredLong=up.clone().multiplyScalar(.84).addScaledVector(right,-.42).addScaledVector(forward,.12).normalize();
 const fingerLocal=hand.worldToLocal(finger.getWorldPosition(v())).normalize(),fingerLength=finger.getWorldPosition(v()).distanceTo(wrist);
 const knuckleTarget=surface.clone().addScaledVector(forward,eyeSpan*.45),target=knuckleTarget.clone().addScaledVector(desiredLong,-fingerLength);
 const pole=right.clone().multiplyScalar(.9).addScaledVector(up,-1).addScaledVector(forward,.7);
 const solution=solveSignatureElbow(THREE,shoulder,target,shoulder.distanceTo(elbow),elbow.distanceTo(wrist),pole);
 if(!solution){reason='Alvo do peito fora do alcance da cadeia direita.';return {apply:()=>false,restore,atBaseline:()=>false,diagnostics:diagnostic};}
 const orient=(bone,from,to)=>{bone.updateWorldMatrix(true,false);const desired=q().setFromUnitVectors(from.normalize(),to.normalize()).multiply(bone.getWorldQuaternion(q()));bone.quaternion.copy(bone.parent.getWorldQuaternion(q()).invert().multiply(desired)).normalize();bone.updateWorldMatrix(true,true);};
 try{
  orient(upper,fore.getWorldPosition(v()).sub(shoulder),solution.elbow.clone().sub(shoulder));orient(fore,hand.getWorldPosition(v()).sub(fore.getWorldPosition(v())),target.clone().sub(fore.getWorldPosition(v())));orient(hand,fingerLocal.clone().applyQuaternion(hand.getWorldQuaternion(q())),desiredLong.clone());
  for(const[org,def]of [[names[2],names[6]],[names[3],names[7]],[names[4],names[8]]]){const driver=map.get(org),deform=map.get(def);driver.updateWorldMatrix(true,false);const desired=driver.getWorldQuaternion(q()).multiply(restWorld.get(driver).clone().invert()).multiply(restWorld.get(deform));deform.quaternion.copy(deform.parent.getWorldQuaternion(q()).invert().multiply(desired)).normalize();deform.updateWorldMatrix(true,true);}
  const error=hand.getWorldPosition(v()).distanceTo(target),flex=THREE.MathUtils.radToDeg(solution.flexion),wristAngle=THREE.MathUtils.radToDeg(base.get(hand).angleTo(hand.quaternion)),upperAngle=THREE.MathUtils.radToDeg(base.get(upper).angleTo(upper.quaternion));
  const left=bones.find(b=>b.name.replace(/[^a-z0-9]/gi,'').toLowerCase()==='orgbip001handl'),separation=left?left.getWorldPosition(v()).distanceTo(hand.getWorldPosition(v())):Infinity;
  metrics={samples,weightedBranchReferences:Object.fromEntries([...influence].map(([b,n])=>[b.name,n])),eyeSpan,wristTargetError:error,elbowFlexionDegrees:flex,wristRotationDegrees:wristAngle,upperRotationDegrees:upperAngle,handSeparation:separation,estimatedSurfaceOffset:eyeSpan*.45,fingerRotations:'PRESERVED',matches:found.matches};
  if(error>eyeSpan*.05||flex>148||wristAngle>75||upperAngle>110||separation<eyeSpan*.5||!changed.every(b=>b.quaternion.toArray().every(Number.isFinite)))reason='Limites geométricos excedidos; gesto indisponível.';
  else{candidate=new Map(changed.map(b=>[b,b.quaternion.clone()]));reason='Candidata calculada; colisões, roupas e anatomia aguardam QA visual.';}
 }finally{restore();}
 const apply=t=>{if(!candidate)return false;for(const[b,start]of base)b.quaternion.copy(start).slerp(candidate.get(b),Math.max(0,Math.min(1,t)));changed.forEach(b=>b.updateWorldMatrix(true,true));return true;};
 return {apply,restore,atBaseline(){
   if(!candidate||![...base].every(([b,start])=>b.quaternion.toArray().every((x,i)=>Math.abs(x-start.toArray()[i])<1e-7)))return false;
   if(spine.getWorldPosition(v()).distanceTo(root)>eyeSpan*.1||spine.getWorldQuaternion(q()).normalize().angleTo(spineRest)>0.02)return false;
   const left=resolveHsinBones(bones,['ORG-Bip001Hand.L']);if(left.missing.length||left.ambiguous.length)return false;
   const leftPos=left.resolved.get('ORG-Bip001Hand.L').getWorldPosition(v());apply(1);const clear=leftPos.distanceTo(hand.getWorldPosition(v()))>eyeSpan*.8;restore();return clear;
  },diagnostics:diagnostic};
}
/** One clock, injected by the existing visible facial rAF; no timers or extra writers. */
export function createChestDirector({pose,seed=1,onEvent=()=>{},invalidate=()=>{}}){
 let rng=seed>>>0,time=0,next=35,phase='idle',elapsed=0;const random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296;};
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 function start(canStart=true){if(phase!=='idle'||!canStart||!pose.diagnostics().ready||!pose.atBaseline())return false;phase='entry';elapsed=0;onEvent('gesture:prepare');return true;}
 return {start,advance(dt,{automatic=false,canStart=false,warm=false}={}){
  if(!Number.isFinite(dt)||dt<0)return;time+=dt;if(phase==='idle'){if(automatic&&warm&&time>=next&&canStart&&!start(true))next=time+8;return;}
  elapsed+=dt;
  if(phase==='entry'){pose.apply(ease(elapsed/1.8));if(elapsed>=1.8){phase='hold';elapsed=0;onEvent('gesture:hold');}}
  else if(phase==='hold'){pose.apply(1);if(elapsed>=2.2){phase='exit';elapsed=0;onEvent('gesture:release');}}
  else{pose.apply(1-ease(elapsed/1.8));if(elapsed>=1.8){pose.restore();phase='idle';elapsed=0;next=time+55+random()*45;}}
  invalidate();
 },cancel(){if(phase!=='idle')pose.restore();phase='idle';elapsed=0;next=time+55+random()*45;onEvent('gesture:release');invalidate();},busy:()=>phase!=='idle',diagnostics:()=>({phase,elapsed,time,next,pose:pose.diagnostics()})};
}
