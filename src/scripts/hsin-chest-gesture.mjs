import {createArmClearanceAudit} from './hsin-arm-clearance.mjs';
import {resolveHsinBones} from './hsin-gesture-ik.mjs';
import {solveSignatureElbow} from './hsin-left-signature.mjs';
import {measuredGazeAxes} from './hsin-face-rig.mjs';
/** Hsin adapter: per-side geometry; guarded left route, original right reference. */
export function createChestPose({THREE,bones,meshes,head,calibration,side='R'}){
 const opposite=side==='L'?'R':'L';
 const names=['ORG-Bip001Spine2','ORG-Bip001Neck',...['ORG-Bip001UpperArm','ORG-Bip001Forearm','ORG-Bip001Hand','ORG-Bip001Finger1','DEF-Bip001UpperArm','DEF-Bip001Forearm','DEF-Bip001Hand'].map(n=>`${n}.${side}`)];
 const found=resolveHsinBones(bones,names),map=found.resolved;let path=null,candidate=null,reason='Rig do braço selecionado ou calibração ausentes.',metrics={};
 const changed=names.slice(2,5).concat(names.slice(6)).map(n=>map.get(n)).filter(Boolean),base=new Map(changed.map(b=>[b,b.quaternion.clone()]));
 const v=()=>new THREE.Vector3(),q=()=>new THREE.Quaternion();
 const restore=()=>{for(const[b,value]of base)b.quaternion.copy(value);changed.forEach(b=>b.updateWorldMatrix(true,true));};
 const diagnostic=()=>({ready:!!candidate,reason,collision:'VISUAL_QA_PENDING',...metrics});
 if(found.missing.length||found.ambiguous.length||!head||!calibration?.ready)return {apply:()=>false,restore,atBaseline:()=>false,diagnostics:diagnostic};
 const spine=map.get(names[0]),neck=map.get(names[1]),upper=map.get(names[2]),fore=map.get(names[3]),hand=map.get(names[4]),finger=map.get(names[5]);
 if(fore.parent!==upper||hand.parent!==fore){reason='Cadeia selecionada não contígua.';return {apply:()=>false,restore,atBaseline:()=>false,diagnostics:diagnostic};}
 changed.forEach(b=>b.updateWorldMatrix(true,true));const restWorld=new Map(changed.map(b=>[b,b.getWorldQuaternion(q())]));
 const influence=new Map(changed.map(b=>[b,0]));
 for(const mesh of meshes){const j=mesh.geometry.getAttribute('skinIndex'),w=mesh.geometry.getAttribute('skinWeight');if(!j||!w)continue;for(let i=0;i<j.count;i++)for(let k=0;k<4;k++){if(w.getComponent(i,k)<=.001)continue;const bone=mesh.skeleton.bones[j.getComponent(i,k)];for(const branch of changed){let cursor=bone;while(cursor&&cursor!==branch)cursor=cursor.parent;if(cursor===branch)influence.set(branch,influence.get(branch)+1);}}}
 if([names[4],names[6],names[7]].some(n=>!influence.get(map.get(n)))){reason='Cadeia selecionada sem influência comprovada no skin.';return {apply:()=>false,restore,atBaseline:()=>false,diagnostics:diagnostic};}
 const spineRest=spine.getWorldQuaternion(q()).normalize();
 const root=spine.getWorldPosition(v()),neckPos=neck.getWorldPosition(v()),shoulder=upper.getWorldPosition(v()),elbow=fore.getWorldPosition(v()),wrist=hand.getWorldPosition(v());
 const up=neckPos.clone().sub(root).normalize(),right=shoulder.clone().sub(root).addScaledVector(up,-shoulder.clone().sub(root).dot(up)).normalize();
 const eye=head.localToWorld(new THREE.Vector3(...calibration.focusCenter)),headPos=head.getWorldPosition(v()),forward=eye.clone().sub(headPos).addScaledVector(up,-eye.clone().sub(headPos).dot(up));forward.addScaledVector(right,-forward.dot(right)).normalize();
 const eyeSpan=calibration.radius/2.5*head.getWorldScale(v()).length()/Math.sqrt(3),center=root.clone().lerp(neckPos,side==='L'?.84:.61).addScaledVector(right,eyeSpan*(side==='L'?.15:.35));
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
 const knuckleTarget=surface.clone().addScaledVector(forward,eyeSpan*(side==='L'?2.1:.45)),target=knuckleTarget.clone().addScaledVector(desiredLong,-fingerLength);
 const pole=right.clone().multiplyScalar(.9).addScaledVector(up,-1).addScaledVector(forward,side==='L'?1.4:.7);
 const solution=solveSignatureElbow(THREE,shoulder,target,shoulder.distanceTo(elbow),elbow.distanceTo(wrist),pole);
 if(!solution){reason='Alvo do peito fora do alcance da cadeia selecionada.';return {apply:()=>false,restore,atBaseline:()=>false,diagnostics:diagnostic};}
 const orient=(bone,from,to)=>{bone.updateWorldMatrix(true,false);const desired=q().setFromUnitVectors(from.normalize(),to.normalize()).multiply(bone.getWorldQuaternion(q()));bone.quaternion.copy(bone.parent.getWorldQuaternion(q()).invert().multiply(desired)).normalize();bone.updateWorldMatrix(true,true);};
 try{
  orient(upper,fore.getWorldPosition(v()).sub(shoulder),solution.elbow.clone().sub(shoulder));orient(fore,hand.getWorldPosition(v()).sub(fore.getWorldPosition(v())),target.clone().sub(fore.getWorldPosition(v())));orient(hand,fingerLocal.clone().applyQuaternion(hand.getWorldQuaternion(q())),desiredLong.clone());
  for(const[org,def]of [[names[2],names[6]],[names[3],names[7]],[names[4],names[8]]]){const driver=map.get(org),deform=map.get(def);driver.updateWorldMatrix(true,false);const desired=driver.getWorldQuaternion(q()).multiply(restWorld.get(driver).clone().invert()).multiply(restWorld.get(deform));deform.quaternion.copy(deform.parent.getWorldQuaternion(q()).invert().multiply(desired)).normalize();deform.updateWorldMatrix(true,true);}
  const error=hand.getWorldPosition(v()).distanceTo(target),flex=THREE.MathUtils.radToDeg(solution.flexion),wristAngle=THREE.MathUtils.radToDeg(base.get(hand).angleTo(hand.quaternion)),upperAngle=THREE.MathUtils.radToDeg(base.get(upper).angleTo(upper.quaternion));
  const left=bones.find(b=>b.name.replace(/[^a-z0-9]/gi,'').toLowerCase()===`orgbip001hand${opposite.toLowerCase()}`),separation=left?left.getWorldPosition(v()).distanceTo(hand.getWorldPosition(v())):Infinity;
  metrics={samples,weightedBranchReferences:Object.fromEntries([...influence].map(([b,n])=>[b.name,n])),eyeSpan,wristTargetError:error,elbowFlexionDegrees:flex,wristRotationDegrees:wristAngle,upperRotationDegrees:upperAngle,handSeparation:separation,estimatedSurfaceOffset:eyeSpan*.45,fingerRotations:'PRESERVED',matches:found.matches};
  if(error>eyeSpan*.05||flex>148||wristAngle>75||upperAngle>110||separation<eyeSpan*.5||!changed.every(b=>b.quaternion.toArray().every(Number.isFinite)))reason='Limites geométricos excedidos; gesto indisponível.';
  else{candidate=new Map(changed.map(b=>[b,b.quaternion.clone()]));reason='Candidata calculada; colisões, roupas e anatomia aguardam QA visual.';}
 }finally{restore();}
 const quintic=t=>t*t*t*(t*(t*6-15)+10);
 const apply=t=>{
  if(!candidate)return false;const weight=Math.max(0,Math.min(1,t));
  if(weight===0){restore();return true;}
  if(path){
   let i=0;while(i<path.length-2&&weight>path[i+1].time)i++;
   const a=path[i],b=path[i+1],mix=quintic((weight-a.time)/(b.time-a.time));
   for(const bone of changed)bone.quaternion.copy(a.pose.get(bone)).slerp(b.pose.get(bone),mix);
  }else for(const[b,start]of base)b.quaternion.copy(start).slerp(candidate.get(b),weight);
  changed.forEach(b=>b.updateWorldMatrix(true,true));return true;
 };
 if(candidate&&side==='L'){
  const final=candidate;
  const solveWaypoint=(point,direction)=>{
   restore();const solved=solveSignatureElbow(THREE,shoulder,point,shoulder.distanceTo(elbow),elbow.distanceTo(wrist),pole);
   if(!solved||THREE.MathUtils.radToDeg(solved.flexion)>148)return null;
   orient(upper,fore.getWorldPosition(v()).sub(shoulder),solved.elbow.clone().sub(shoulder));
   orient(fore,hand.getWorldPosition(v()).sub(fore.getWorldPosition(v())),point.clone().sub(fore.getWorldPosition(v())));
   orient(hand,fingerLocal.clone().applyQuaternion(hand.getWorldQuaternion(q())),direction.clone());
   for(const[org,def]of [[names[2],names[6]],[names[3],names[7]],[names[4],names[8]]]){
    const driver=map.get(org),deform=map.get(def);driver.updateWorldMatrix(true,false);
    const desired=driver.getWorldQuaternion(q()).multiply(restWorld.get(driver).clone().invert()).multiply(restWorld.get(deform));
    deform.quaternion.copy(deform.parent.getWorldQuaternion(q()).invert().multiply(desired)).normalize();deform.updateWorldMatrix(true,true);
   }
   if(THREE.MathUtils.radToDeg(base.get(hand).angleTo(hand.quaternion))>75)return null;
   return new Map(changed.map(b=>[b,b.quaternion.clone()]));
  };
  try{
   const startLong=fingerLocal.clone().applyQuaternion(restWorld.get(hand));
   const depart=solveWaypoint(wrist.clone().addScaledVector(forward,eyeSpan).addScaledVector(up,eyeSpan*.35),startLong);
   const approach=solveWaypoint(target.clone().addScaledVector(forward,eyeSpan*.7).addScaledVector(right,eyeSpan*.2).addScaledVector(up,-eyeSpan*.15),desiredLong);
   if(!depart||!approach){candidate=null;reason='Trajetória esquerda fora dos limites: gesto suspenso.';}
   else{
    path=[{time:0,pose:base},{time:.28,pose:depart},{time:.68,pose:approach},{time:1,pose:final}];
    const guard=createArmClearanceAudit({THREE,meshes,side,origin:root,outward:right,up,forward,scale:eyeSpan});
    const worst={torso:0,sleeve:0},clearances={torso:Infinity,sleeve:Infinity};let covered=0;const failures=[];
    for(let i=0;i<=48;i++){
     apply(i/48);const sample=guard.check();if(sample.torso.violations||sample.sleeve.violations)failures.push({progress:i/48,torso:sample.torso,sleeve:sample.sleeve});
     for(const kind of ['torso','sleeve']){worst[kind]=Math.max(worst[kind],sample[kind].violations);if(sample[kind].minClearance!==null){covered++;clearances[kind]=Math.min(clearances[kind],sample[kind].minClearance);}}
    }
    metrics.pathGuard={...guard.diagnostics(),samples:49,failures,worstViolations:worst,minClearance:Object.fromEntries(Object.entries(clearances).map(([k,n])=>[k,Number.isFinite(n)?n:null]))};
    metrics.staging='DEPART_FORWARD_APPROACH_SETTLE';
    metrics.estimatedSurfaceOffset=eyeSpan*2.1;
    if(!covered||worst.torso||worst.sleeve){candidate=null;path=null;reason='Folga do tórax/manga reprovada: gesto esquerdo suspenso até revisão.';}
    else reason='Trajetória esquerda passou pelo envelope amostrado; manga, busto e cabelo exigem QA visual.';
   }
  }finally{restore();}
 }

 return {apply,restore,atBaseline(){
   if(!candidate||![...base].every(([b,start])=>b.quaternion.toArray().every((x,i)=>Math.abs(x-start.toArray()[i])<1e-7)))return false;
   if(spine.getWorldPosition(v()).distanceTo(root)>eyeSpan*.1||spine.getWorldQuaternion(q()).normalize().angleTo(spineRest)>0.02)return false;
   const oppositeName=`ORG-Bip001Hand.${opposite}`;const left=resolveHsinBones(bones,[oppositeName]);if(left.missing.length||left.ambiguous.length)return false;
   const leftPos=left.resolved.get(oppositeName).getWorldPosition(v());apply(1);const clear=leftPos.distanceTo(hand.getWorldPosition(v()))>eyeSpan*.8;restore();return clear;
  },diagnostics:diagnostic};
}
/** One clock, injected by the existing visible facial rAF; no timers or extra writers. */
export function createChestDirector({pose,seed=1,onEvent=()=>{},invalidate=()=>{}}){
 let rng=seed>>>0,time=0,next=35,phase='idle',elapsed=0,weight=0,exitFrom=1;const random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296;};
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
 function start(canStart=true){if(phase!=='idle'||!canStart||!pose.diagnostics().ready||!pose.atBaseline())return false;phase='entry';elapsed=0;onEvent('gesture:prepare');return true;}
 return {start,advance(dt,{automatic=false,canStart=false,warm=false}={}){
  if(!Number.isFinite(dt)||dt<0)return;time+=dt;if(phase==='idle'){if(automatic&&warm&&time>=next&&canStart&&!start(true))next=time+8;return;}
  elapsed+=dt;
  if(phase==='entry'){weight=ease(elapsed/1.8);pose.apply(weight);if(elapsed>=1.8){phase='hold';elapsed=0;onEvent('gesture:hold');}}
  else if(phase==='hold'){weight=1;pose.apply(1);if(elapsed>=2.2){exitFrom=1;phase='exit';elapsed=0;onEvent('gesture:release');}}
  else{weight=exitFrom*(1-ease(elapsed/1.8));pose.apply(weight);if(elapsed>=1.8){pose.restore();phase='idle';elapsed=0;next=time+55+random()*45;}}
  invalidate();
 },release(){if(phase==='idle'||phase==='exit')return false;exitFrom=weight;phase='exit';elapsed=0;onEvent('gesture:release');return true;},cancel(){if(phase!=='idle')pose.restore();phase='idle';elapsed=0;weight=0;exitFrom=1;next=time+55+random()*45;onEvent('gesture:release');invalidate();},busy:()=>phase!=='idle',diagnostics:()=>({phase,elapsed,time,next,pose:pose.diagnostics()})};
}
