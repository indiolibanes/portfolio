import {createArmClearanceAudit} from './hsin-arm-clearance.mjs';
import {resolveHsinBones} from './hsin-gesture-ik.mjs';
import {solveSignatureElbow} from './hsin-left-signature.mjs';
import {measuredGazeAxes} from './hsin-face-rig.mjs';
import {createPathTiming} from './hsin-path-timing.mjs';
import {ARM_ROLES,oppositeSide} from './hsin-arm-roles.mjs';
import {CHEST_TIMING,breathAngles,breathSignal,limbWeights,organicChestTiming} from './hsin-limb-motion.mjs';
import {COMPOSITION,composeChestTarget} from './hsin-hand-composition.mjs';
/** Hsin adapter: the chest gesture belongs to one arm (ARM_ROLES.chest). The right arm keeps the under-chin signature. */
export function createChestPose({THREE,bones,meshes,head,calibration,side=ARM_ROLES.chest.side,companion=null}){
 if(side!==ARM_ROLES.chest.side){
  const reason=`Papel do braço ${side}: este braço não executa o gesto de peito (${ARM_ROLES.chest.label}); a assinatura ${ARM_ROLES.signature.label} permanece exclusiva.`;
  return {apply:()=>false,restore:()=>{},atBaseline:()=>false,diagnostics:()=>({ready:false,reason,role:'REFUSED',collision:'VISUAL_QA_PENDING'})};
 }
 const opposite=oppositeSide(side);
 const names=['ORG-Bip001Spine2','ORG-Bip001Neck',...['ORG-Bip001UpperArm','ORG-Bip001Forearm','ORG-Bip001Hand','ORG-Bip001Finger1','DEF-Bip001UpperArm','DEF-Bip001Forearm','DEF-Bip001Hand'].map(n=>`${n}.${side}`)];
 const found=resolveHsinBones(bones,names),map=found.resolved;let candidate=null,reason='Rig do braço selecionado ou calibração ausentes.',metrics={};
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
 const eyeSpan=calibration.radius/2.5*head.getWorldScale(v()).length()/Math.sqrt(3),center=root.clone().lerp(neckPos,.84).addScaledVector(right,eyeSpan*.15);
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
 const knuckleTarget=surface.clone().addScaledVector(forward,eyeSpan*2.1),target=knuckleTarget.clone().addScaledVector(desiredLong,-fingerLength);
 const pole=right.clone().multiplyScalar(.9).addScaledVector(up,-1).addScaledVector(forward,1.4);
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
 // Which part of the arm each driven bone belongs to: lag and breath are applied per part, so ORG and DEF chains stay matched.
 const PART=new Map([[names[2],'upper'],[names[3],'fore'],[names[4],'hand'],[names[6],'upper'],[names[7],'fore'],[names[8],'hand']].map(([n,part])=>[map.get(n),part]));
 const companionPoint=companion?(companion.toArray?companion.toArray():[...companion]):null,companionVector=companionPoint&&companionPoint.length===3&&companionPoint.every(Number.isFinite)?new THREE.Vector3(...companionPoint):null;
 const variants={plain:null,composed:null};let active='plain';
 /**
  * The executed pose is a stateless function of (variant, weight, breath): the guard samples exactly what is performed.
  * Each part samples the same route at its own lagged weight (exact 0 and 1 at the ends), then the breath nudges the whole arm.
  */
 const render=(variant,t,breath=0)=>{
  const weight=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
  if(weight===0){restore();return true;}
  const lag=limbWeights(weight);
  for(const bone of changed){
   const {index,mix}=variant.timing.sample(lag[PART.get(bone)]),a=variant.route[index],b=variant.route[index+1];
   bone.quaternion.copy(a.pose.get(bone)).slerp(b.pose.get(bone),mix);
  }
  const swing=breathAngles(breath,weight);
  if(swing.upper||swing.fore||swing.hand){
   // World-axis nudge about the character's forward direction, parents first so the chain compounds like a real arm.
   for(const bone of changed){
    const angle=swing[PART.get(bone)];if(!angle)continue;
    bone.parent.updateWorldMatrix(true,false);const parent=bone.parent.getWorldQuaternion(q());
    bone.quaternion.premultiply(parent.clone().invert().multiply(q().setFromAxisAngle(forward,angle)).multiply(parent)).normalize();bone.updateWorldMatrix(true,true);
   }
  }
  changed.forEach(b=>b.updateWorldMatrix(true,true));return true;
 };
 const apply=(t,{breath=0}={})=>{const variant=variants[active]??variants.plain;if(!candidate||!variant)return false;return render(variant,t,breath);};
 const select=label=>{active=variants[label]?.ok?label:'plain';return active===label;};
 const solveWaypoint=(point,direction,strict=false)=>{
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
  // A resting pose that replaces the approved target must meet the same limits as that target did.
  if(strict&&(hand.getWorldPosition(v()).distanceTo(point)>eyeSpan*.05||THREE.MathUtils.radToDeg(base.get(upper).angleTo(upper.quaternion))>110))return null;
  return new Map(changed.map(b=>[b,b.quaternion.clone()]));
 };
 const guard=createArmClearanceAudit({THREE,meshes,side,origin:root,outward:right,up,forward,scale:eyeSpan});
 const SAMPLES=64,BREATH_PROBES=[[.9,-1],[.9,1],[.95,-1],[.95,1],[1,-1],[1,1]];
 let departPose=null;
 /** Route, timing and guard for one resting target. Never leaves a pose applied. */
 const buildVariant=(label,tgt,final)=>{
  const out={label,ok:false,reason:'',route:null,timing:null,final,minHandGap:null,guard:null};
  const approach=solveWaypoint(tgt.clone().addScaledVector(forward,eyeSpan*.7).addScaledVector(right,eyeSpan*.2).addScaledVector(up,-eyeSpan*.15),desiredLong);
  if(!departPose||!approach||!final){restore();out.reason=label==='plain'?'Trajetória esquerda fora dos limites: gesto suspenso.':'Composição fora dos limites: gesto simples mantido.';return out;}
  out.route=[{time:0,pose:base},{time:.28,pose:departPose},{time:.68,pose:approach},{time:1,pose:final}];
  out.timing=createPathTiming(out.route.map(p=>p.time),out.route.slice(1).map((p,i)=>Math.hypot(...changed.map(b=>out.route[i].pose.get(b).angleTo(p.pose.get(b))))));
  const worst={torso:0,sleeve:0},clearances={torso:Infinity,sleeve:Infinity},failures=[];let covered=0,handGap=Infinity;
  const probe=(progress,breath)=>{
   render(out,progress,breath);const sample=guard.check();
   if(sample.torso.violations||sample.sleeve.violations)failures.push({progress,breath,torso:sample.torso,sleeve:sample.sleeve});
   for(const kind of ['torso','sleeve']){worst[kind]=Math.max(worst[kind],sample[kind].violations);if(sample[kind].minClearance!==null){covered++;clearances[kind]=Math.min(clearances[kind],sample[kind].minClearance);}}
   if(companionVector)handGap=Math.min(handGap,hand.getWorldPosition(v()).distanceTo(companionVector),finger.getWorldPosition(v()).distanceTo(companionVector));
  };
  try{for(let i=0;i<=SAMPLES;i++)probe(i/SAMPLES,0);for(const[progress,breath]of BREATH_PROBES)probe(progress,breath);}finally{restore();}
  out.minHandGap=Number.isFinite(handGap)?handGap:null;
  out.guard={...guard.diagnostics(),samples:SAMPLES+1+BREATH_PROBES.length,failures,worstViolations:worst,minClearance:Object.fromEntries(Object.entries(clearances).map(([k,n])=>[k,Number.isFinite(n)?n:null]))};
  const crowded=label==='composed'&&(out.minHandGap===null||out.minHandGap<COMPOSITION.hardGap*eyeSpan);
  out.ok=!!covered&&!worst.torso&&!worst.sleeve&&!crowded;
  out.reason=!covered||worst.torso||worst.sleeve?(label==='plain'?'Folga do tórax/manga reprovada: gesto esquerdo suspenso até revisão.':'Folga do tórax/manga reprovada na composição: gesto simples mantido.'):crowded?'As mãos chegariam perto demais: composição suspensa, gesto simples mantido.':'Trajetória passou pelo envelope amostrado; manga, busto e cabelo exigem QA visual.';
  return out;
 };
 if(candidate){
  try{
   departPose=solveWaypoint(wrist.clone().addScaledVector(forward,eyeSpan).addScaledVector(up,eyeSpan*.35),fingerLocal.clone().applyQuaternion(restWorld.get(hand)));
   variants.plain=buildVariant('plain',target,candidate);
  }finally{restore();}
  if(!variants.plain.ok){candidate=null;reason=variants.plain.reason;}
  else{
   reason=variants.plain.reason;metrics.pathGuard=variants.plain.guard;metrics.staging='DEPART_FORWARD_APPROACH_SETTLE';metrics.estimatedSurfaceOffset=eyeSpan*2.1;
   // Optional composition: the left hand rests a little nearer to the right hand's chin pose. Guarded, and plain is always the fallback.
   if(companionVector){
    const verdict=composeChestTarget({target:target.toArray(),companion:companionPoint,forward:forward.toArray(),eyeSpan});
    metrics.composition={accepted:verdict.accepted,shiftEyeSpans:verdict.shift/eyeSpan,gapEyeSpans:Number.isFinite(verdict.gap)?verdict.gap/eyeSpan:null,reason:verdict.reason};
    if(verdict.accepted){
     try{const composedTarget=new THREE.Vector3(...verdict.target);variants.composed=buildVariant('composed',composedTarget,solveWaypoint(composedTarget,desiredLong,true));}finally{restore();}
    }
   }else metrics.composition={accepted:false,reason:'Mão de apoio não medida: composição indisponível.'};
  }
  metrics.variants=Object.fromEntries(Object.entries(variants).filter(([,x])=>x).map(([k,x])=>[k,{ok:x.ok,reason:x.reason,minHandGapEyeSpans:x.minHandGap===null?null:x.minHandGap/eyeSpan,guard:x.guard}]));
  metrics.motion='LIMB_OVERLAP+BREATH';
 }
 return {apply,select,restore,atBaseline(){
   if(!candidate||![...base].every(([b,start])=>b.quaternion.toArray().every((x,i)=>Math.abs(x-start.toArray()[i])<1e-7)))return false;
   if(spine.getWorldPosition(v()).distanceTo(root)>eyeSpan*.1||spine.getWorldQuaternion(q()).normalize().angleTo(spineRest)>0.02)return false;
   const oppositeName=`ORG-Bip001Hand.${opposite}`;const left=resolveHsinBones(bones,[oppositeName]);if(left.missing.length||left.ambiguous.length)return false;
   const leftPos=left.resolved.get(oppositeName).getWorldPosition(v());render(variants.plain,1,0);const clear=leftPos.distanceTo(hand.getWorldPosition(v()))>eyeSpan*.8;restore();return clear;
  },diagnostics:()=>({...diagnostic(),activeVariant:active})};
}
/** One clock, injected by the existing visible facial rAF; no timers or extra writers. */
export function createChestDirector({pose,seed=1,onEvent=()=>{},invalidate=()=>{},organic=false,compose=null}){
 let rng=seed>>>0,time=0,next=35,phase='idle',elapsed=0,weight=0,exitFrom=1,spans={...CHEST_TIMING},variant='plain';const random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296;};
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
 // The breath signal rides the same clock; the pose fades it in only near the final pose.
 const perform=w=>pose.apply(w,{breath:breathSignal(time)});
 function start(canStart=true){
  if(phase!=='idle'||!canStart||!pose.diagnostics().ready||!pose.atBaseline())return false;
  // Per gesture: how long it takes, and whether the hands compose. A draw is only spent when the feature is wired in.
  spans=organic?organicChestTiming(random):{...CHEST_TIMING};
  const composed=typeof compose==='function'&&compose()&&random()<COMPOSITION.chance,label=composed?'composed':'plain';
  variant=pose.select?.(label)?label:'plain';
  phase='entry';elapsed=0;onEvent('gesture:prepare');return true;
 }
 return {start,advance(dt,{automatic=false,canStart=false,warm=false}={}){
  if(!Number.isFinite(dt)||dt<0)return;time+=dt;if(phase==='idle'){if(automatic&&warm&&time>=next&&canStart&&!start(true))next=time+8;return;}
  elapsed+=dt;
  if(phase==='entry'){weight=ease(elapsed/spans.entry);perform(weight);if(elapsed>=spans.entry){phase='hold';elapsed=0;onEvent('gesture:hold');}}
  else if(phase==='hold'){weight=1;perform(1);if(elapsed>=spans.hold){exitFrom=1;phase='exit';elapsed=0;onEvent('gesture:release');}}
  else{weight=exitFrom*(1-ease(elapsed/spans.exit));perform(weight);if(elapsed>=spans.exit){pose.restore();phase='idle';elapsed=0;next=time+55+random()*45;}}
  invalidate();
 },release(){if(phase==='idle'||phase==='exit')return false;exitFrom=weight;phase='exit';elapsed=0;onEvent('gesture:release');return true;},cancel(){if(phase!=='idle')pose.restore();phase='idle';elapsed=0;weight=0;exitFrom=1;next=time+55+random()*45;onEvent('gesture:release');invalidate();},busy:()=>phase!=='idle',diagnostics:()=>({phase,elapsed,time,next,spans:{...spans},variant,pose:pose.diagnostics()})};
}
