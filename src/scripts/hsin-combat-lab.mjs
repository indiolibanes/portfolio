import {ABILITIES,abilitySourceTime,abilityEnvelope} from './hsin-combat-abilities.mjs';
import basic01Manifest from '../data/hsin-combat-r23-basic01.json' with {type:'json'};
import basic02Manifest from '../data/hsin-combat-r23-basic02.json' with {type:'json'};
import comboManifest from '../data/hsin-combat-r23-combo.json' with {type:'json'};
import skillManifest from '../data/hsin-combat-r23-skill.json' with {type:'json'};
import {createCombatDirector} from './hsin-combat-director.mjs';
import {decodeCombatData} from './hsin-combat-data.mjs';
import {createCombatPose} from './hsin-combat-pose.mjs';
import {createCombatVfx} from './hsin-combat-vfx.mjs';
import {createCombatEnv} from './hsin-combat-env.mjs';
import {faceCue,cameraShot} from './hsin-combat-r21.mjs';
/**
 * Loaded on explicit lab request. Uses the stage's camera, scene, loop and arbiter output.
 * `r1` keeps the first study (two rings). `r2` is Combat R2.1: baked body, face acting by combat clock, pooled effects
 * (hsin-combat-vfx.mjs) and an optional automatic camera that manual input always overrides.
 * `r22` is Combat R2.2: the same R2.1.2 sequence plus the environmental layer (hsin-combat-env.mjs), opt-in and created only for that choice.
 */
export async function createCombatLab({T,root,scene,model,bones,body,dance,camera,orbit,canvas,signal,invalidate,modelHash,profileHash}){
 const start=performance.now();
 const choice=root.querySelector('[data-combat-version]')?.value,r23=choice==='r23',env22=choice==='r22'||r23,version=choice==='r2'||env22?'r2':'r1',r2=version==='r2';
 const {default:legacyManifest}=r2?await import('../data/hsin-combat-r2.json',{with:{type:'json'}}):await import('../data/hsin-combat-r1.json',{with:{type:'json'}});
 const manifests={basic01:basic01Manifest,basic02:basic02Manifest,combo:comboManifest,skill:skillManifest,legacy:legacyManifest};
 async function readBake(manifest){
  const response=await fetch(manifest.url+'?v='+manifest.sha256.slice(0,12),{signal});
  if(!response.ok)throw Error('Combat bake unavailable');
  const text=await response.text(),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  const sha=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  const data=JSON.parse(text);
  if(sha!==manifest.sha256||data.modelSha256!==modelHash||data.profileSha256!==profileHash)throw Error('Combat identity mismatch');
  return decodeCombatData(data);
 }
 let selected=r23?'basic01':'legacy',manifest=manifests[selected],data=await readBake(manifest);
 const by=new Map(bones.map(b=>[b.name,b]));
 let pose=createCombatPose({T,data,bones,model});
 const abilityPanel=root.querySelector('[data-combat-abilities]');if(abilityPanel)abilityPanel.hidden=!r23;
 const versionSelect=root.querySelector('[data-combat-version]');if(versionSelect)versionSelect.disabled=true;
 // R2.1: pooled effects. R1: two rings, kept as the first study.
 const vfx=r2?createCombatVfx({T,scene,camera,by}):null;
 // R2.2: environmental layer, only when explicitly chosen. Fragment density follows the device class and never changes the body animation.
 const nav=typeof navigator==='undefined'?{}:navigator,lowPower=(nav.hardwareConcurrency||8)<=4||(nav.deviceMemory||8)<=3;
 const env=env22?createCombatEnv({T,scene,camera,by,vfx,density:lowPower?.6:1}):null;
 let legacy=null;
 if(!r2){
  const group=new T.Group();group.name='Hsin combat R1 pooled effects';scene.add(group);
  const geometry=new T.TorusGeometry(.19,.009,5,48),arcGeometry=new T.TorusGeometry(.19,.009,5,48,Math.PI*1.3),material=new T.MeshBasicMaterial({color:0xffd592,transparent:true,opacity:0,depthWrite:false});
  const ring=new T.Mesh(geometry,material);ring.visible=false;group.add(ring);
  const impactGeometry=new T.RingGeometry(.015,.07,24),impactMaterial=material.clone(),impact=new T.Mesh(impactGeometry,impactMaterial);impact.visible=false;group.add(impact);
  legacy={group,geometry,arcGeometry,material,ring,impactGeometry,impactMaterial,impact,hand:by.get('ORG-Bip001HandR'),age:0,effect:''};
 }
 const anchor=new T.Vector3(),direction=new T.Vector3(),target=new T.Vector3(),desired=new T.Vector3(),offset=new T.Vector3();
 const cameraOrigin=new T.Vector3(),cameraTargetOrigin=new T.Vector3(),desiredTarget=new T.Vector3(),shot={};
 let auto=false,disposed=false,lastPhase='',faceWeight=0,lastCpu=0,pendingRestart=false,pendingAbility=null,selecting=false,selectionGeneration=0;
 const status=root.querySelector('[data-combat-status]');
 // R2.1.1: the lab panel folds into a slim strip while the sequence plays so it never hides the body or the effects.
 const panel=root.querySelector('.combat-panel'),panelToggle=root.querySelector('[data-combat-panel-toggle]');
 let panelCollapsed=false,panelChosen=false;
 const setPanel=value=>{panelCollapsed=value;panel?.setAttribute?.('data-collapsed',String(value));panelToggle?.setAttribute?.('aria-expanded',String(!value));};
 const togglePanel=()=>{panelChosen=true;setPanel(!panelCollapsed);invalidate();};
 panelToggle?.addEventListener?.('click',togglePanel);
 const oldPan=orbit.enablePan;orbit.enablePan=true;
 const manual=()=>{auto=false;};
 orbit.addEventListener('start',manual);
 for(const event of ['pointerdown','wheel'])canvas.addEventListener(event,manual,{passive:true,signal});
 const cue={overlays:{},smileL:0,smileR:0},faceOutput={},faceNow={};
 const setFace=state=>{
  lastPhase=state;
  if(state==='PREPARATION'){panelChosen=false;setPanel(true);}else if(!panelChosen&&(state==='COMPLETE'||state==='INTERRUPTED'))setPanel(false);
  if(state==='RECOVERY'||state==='INTERRUPTED'){if(status)status.textContent=state;return;}
  if(!r2){
   cue.overlays={};cue.smileL=cue.smileR=0;
   const effort=state==='BASIC'?.035:state==='SKILL'?.025:0;
   cue.overlays.E_Squint_R=effort;cue.overlays.E_Squint_L=effort;
   cue.overlays.B_Up_Add_R=state==='PREPARATION'?.05:0;
   cue.overlays.M_Squint_R=effort*.5;cue.overlays.M_Squint_L=effort*.5;
  }
  if(status)status.textContent=state==='COMPLETE'?'Concluído · adaptação experimental':state;
 };
 const clearLegacy=()=>{if(legacy){legacy.ring.visible=legacy.impact.visible=false;legacy.effect='';}};
 const clear=()=>{vfx?.clear();env?.clear();clearLegacy();};
 const director=createCombatDirector({pose:{apply:t=>pose.apply(t),restore:()=>pose.restore(),beginRecovery:()=>pose.beginRecovery(),recover:t=>pose.recover(t)},sequence:data.sequence,onState:setFace,onRelease:()=>{clear();auto=false;faceWeight=0;},onEvent:event=>{
  if(event==='clear'){clear();return;}
  if(r2){const at=director.sample().time;vfx.event(event,at);env?.event(event,at);return;}
  if(event==='recovery'){clear();return;}
  legacy.hand=by.get(event==='arc-left'?'ORG-Bip001HandL':'ORG-Bip001HandR');
  legacy.hand.updateWorldMatrix(true,false);legacy.hand.getWorldPosition(anchor);
  model.getWorldDirection(direction);direction.y=0;direction.normalize();
  legacy.ring.position.copy(anchor);legacy.ring.quaternion.copy(camera.quaternion);legacy.ring.scale.setScalar(event.startsWith('arc')?1.5:.6);
  legacy.ring.geometry=event.startsWith('arc')?legacy.arcGeometry:legacy.geometry;legacy.material.color.set(event.startsWith('arc')?0xff747e:0xffd592);
  legacy.effect=event;legacy.age=0;legacy.ring.visible=true;
 }});
 function acquire(){
  if(dance()?.owns()){if(status)status.textContent='Aguarde a dança retornar ao repouso.';return false;}
  if(body.busy()){if(status)status.textContent='Aguarde o retorno ao repouso.';body.release();return false;}
  director.reset();body.reset();
  if(!pose.atBaseline()){if(status)status.textContent='Pose de referência incompatível. Recarregue o laboratório.';return false;}
  return director.start();
 }
 async function selectAbility(id){
  if(!r23||!ABILITIES[id]?.implemented||disposed)return;
  const generation=++selectionGeneration;selecting=true;pendingRestart=false;pendingAbility=null;
  try{
   const nextManifest=manifests[id],next=id===selected?data:await readBake(nextManifest);
   if(disposed||generation!==selectionGeneration)return;
   // A different actor may have acquired the body while this bake was loading.
   if(dance()?.owns()){if(status)status.textContent='Aguarde a dança retornar ao repouso.';return;}
   if(body.busy()){if(status)status.textContent='Aguarde o retorno ao repouso.';body.release();return;}
   director.reset();pose.restore();data=next;manifest=nextManifest;selected=id;
   abilityButtons.forEach(button=>button.setAttribute?.('aria-pressed',String(button.dataset.combatAbility===id)));
   pose=createCombatPose({T,data,bones,model});director.select(data.sequence);
   if(status)status.textContent=ABILITIES[id].label;
   acquire();
  }catch(error){if(!disposed&&generation===selectionGeneration&&status)status.textContent='Não foi possível carregar a ação. Tente novamente.';}
  finally{if(generation===selectionGeneration){selecting=false;invalidate();}}
 }
 const abilityButtons=r23?root.querySelectorAll('[data-combat-ability]'):[];
 const chooseAbility=event=>{
  const id=event.currentTarget.dataset.combatAbility;
  if(!ABILITIES[id]?.implemented)return;
  if(director.owns()){selectionGeneration++;pendingAbility=id;pendingRestart=true;director.interrupt();}
  else void selectAbility(id);
  invalidate();
 };
 abilityButtons.forEach(button=>button.addEventListener('click',chooseAbility));
 const buttons=root.querySelectorAll('[data-combat-action]');
 const act=event=>{
  const action=event.currentTarget.dataset.combatAction;
  if(action==='play'||action==='restart'){
   if(director.owns()){pendingAbility=selected;pendingRestart=true;director.interrupt();return;}
   if(r23)void selectAbility(selected);else acquire();
  }else if(action==='pause'){const d=director.diagnostics();if(d.paused)director.resume();else director.pause();}
  else if(action==='stop'){selectionGeneration++;selecting=false;pendingAbility=null;pendingRestart=false;director.interrupt();}
  else if(action==='camera'){cameraOrigin.copy(camera.position);cameraTargetOrigin.copy(orbit.target);auto=true;}
  else if(action==='trace'){
   const blob=new Blob([JSON.stringify(director.diagnostics(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='hsin-combat-'+version+'-trace.json';link.click();URL.revokeObjectURL(url);
  }
  invalidate();
 };
 root.querySelectorAll('[data-stage-in],[data-stage-out],[data-stage-reset]').forEach(button=>button.addEventListener('click',manual,{signal}));
 buttons.forEach(button=>button.addEventListener('click',act));
 const preparationMs=performance.now()-start;
 if(status)status.textContent='Carregado · câmera livre';
 function advanceLegacy(dt){
  const L=legacy;if(!L.effect)return;
  if(L.effect==='energy'){L.hand.updateWorldMatrix(true,false);L.hand.getWorldPosition(anchor);}
  L.age+=dt;const duration=L.effect==='energy'?.55:.65,u=Math.min(1,L.age/duration);
  L.ring.position.copy(anchor).addScaledVector(direction,L.effect==='energy'?0:u*.8);L.ring.scale.setScalar((L.effect.startsWith('arc')?1.5:.6)+u*.8);L.material.opacity=(1-u)*.8;
  if(L.effect!=='energy'&&u>.65){L.impact.visible=true;L.impact.position.copy(L.ring.position);L.impact.quaternion.copy(camera.quaternion);L.impact.scale.setScalar(1+(u-.65)*5);L.impactMaterial.opacity=(1-u)*1.5;}
  if(u===1)clear();
 }
 function advanceCamera(dt){
  const sample=director.sample(),pelvis=by.get('ORG-Bip001Pelvis');
  if(r2){
   cameraShot(abilitySourceTime(data,sample.time),{fov:camera.fov,aspect:camera.aspect,minDistance:orbit.minDistance||1.05,maxDistance:Math.min(orbit.maxDistance||7,7)},shot);
   pelvis.updateWorldMatrix(true,false);pelvis.getWorldPosition(target);target.y=shot.targetY;
   desired.set(target.x+Math.sin(shot.yaw)*shot.distance,shot.targetY+shot.lift,target.z+Math.cos(shot.yaw)*shot.distance);
   const home=lastPhase==='INTERRUPTED'?1:data.ability?1-abilityEnvelope(data,Math.max(.7,sample.time)):shot.home;
   desired.lerp(cameraOrigin,home);target.lerp(cameraTargetOrigin,home);
   const gain=1-Math.exp(-dt/.55);
   offset.copy(orbit.target);orbit.target.lerp(target,gain);offset.sub(orbit.target);camera.position.sub(offset).lerp(desired,gain);camera.lookAt(orbit.target);
   return;
  }
  pelvis.updateWorldMatrix(true,false);pelvis.getWorldPosition(target);target.y=lastPhase==='SKILL'?1.04:.98;const distance=Math.max(2.8,1.95/Math.tan(camera.fov*Math.PI/360)/Math.min(1,camera.aspect)*.62);
  const yaw=lastPhase==='BASIC'?-Math.PI/5.5:-Math.PI/6;
  desired.set(target.x+Math.sin(yaw)*distance,1.2,target.z+Math.cos(yaw)*distance);
  if(lastPhase==='RECOVERY'){target.copy(cameraTargetOrigin);desired.copy(cameraOrigin);}
  const gain=1-Math.exp(-dt/1.1);offset.copy(orbit.target);orbit.target.lerp(target,gain);offset.sub(orbit.target);camera.position.sub(offset).lerp(desired,gain);camera.lookAt(orbit.target);
 }
 return {
  owns:director.owns,
  needsAdvance:()=>director.owns()||pendingRestart,
  advance(dt){
   if(pendingRestart&&!director.owns()){pendingRestart=false;if(r23)void selectAbility(pendingAbility??selected);else acquire();}
   const t0=performance.now(),wasPaused=director.sample().paused;
   director.advance(dt);
   if(director.owns()&&!wasPaused){
    faceWeight=Math.min(1,faceWeight+dt*5);
    if(r2){const at=director.sample().time;vfx.update(at);env?.update(at);}else advanceLegacy(dt);
    if(auto)advanceCamera(dt);
   }else if(r2&&director.owns()){const at=director.sample().time;vfx.update(at);env?.update(at);}
   lastCpu=performance.now()-t0;
  },
  face(state){
   if(!director.owns())return state;
   const sample=director.sample(),gain=lastPhase==='INTERRUPTED'?1-sample.recovery:data.ability?abilityEnvelope(data,sample.time):lastPhase==='RECOVERY'?Math.max(0,(data.seconds-sample.time)/(data.version==='combat-r2'?2.4:1.95)):faceWeight;
   state.overlays=faceOutput;for(const key of Object.keys(faceOutput))faceOutput[key]=0;
   if(r2){
    // R2.1: acting by combat clock. The rest smile is reduced, never replaced; blinks stay with the arbiter plus one contextual blink.
    const f=faceCue(abilitySourceTime(data,sample.time),faceNow);
    faceOutput.E_Squint_R=faceOutput.E_Squint_L=f.squint*gain;faceOutput.M_Squint_R=faceOutput.M_Squint_L=f.mouthSquint*gain;faceOutput.B_Up_Add_R=faceOutput.B_Up_Add_L=f.brow*gain;
    state.smileL=(state.smileL??0)*(1-f.smileCut*gain)+f.smileAdd*gain;state.smileR=(state.smileR??0)*(1-f.smileCut*gain)+f.smileAdd*gain;
    if(f.close>0){state.closeR=Math.max(state.closeR??0,f.close*gain);state.closeL=Math.max(state.closeL??0,f.close*gain);}
    return state;
   }
   state.smileL=cue.smileL*gain;state.smileR=cue.smileR*gain;for(const key of Object.keys(cue.overlays))state.overlays[key]=cue.overlays[key]*gain;return state;
  },
  diagnostics:()=>({...director.diagnostics(),preparationMs,lastCpuMs:lastCpu,bakeBytes:manifest.bytes,decodedBytes:data.frameCount*data.rest.length*4+(data.recovery?.values.byteLength??0),version:r23?'r23':version,ability:selected,selecting,seconds:data.seconds,atBaseline:pose.atBaseline(),revision:data.revision??null,recoveryBytes:pose.bufferBytes,
   extraDrawCalls:r2?vfx.budget.meshes+(env?env.budget.meshes:0):2,visibleDrawCalls:r2?vfx.visibleDrawCalls()+(env?env.visibleDrawCalls():0):(legacy.ring.visible?1:0)+(legacy.impact.visible?1:0),geometries:r2?vfx.budget.geometries+(env?env.budget.geometries:0):3,materials:r2?vfx.budget.materials+(env?env.budget.materials:0):2,env:env?{...env.probe(),budget:env.budget}:null,textures:0,renderTargets:0,camera:auto?'automatic':'free',panel:panelCollapsed?'collapsed':'expanded',cameraYawDeg:+(Math.atan2(camera.position.x-orbit.target.x,camera.position.z-orbit.target.z)*180/Math.PI).toFixed(1),vfx:r2?vfx.probe():null}),
  dispose(){
   if(disposed)return;disposed=true;selectionGeneration++;selecting=false;pendingRestart=false;pendingAbility=null;director.dispose();panelToggle?.removeEventListener?.('click',togglePanel);panel?.removeAttribute?.('data-collapsed');orbit.removeEventListener('start',manual);orbit.enablePan=oldPan;
   vfx?.dispose();env?.dispose();
   if(legacy){scene.remove(legacy.group);legacy.geometry.dispose();legacy.arcGeometry.dispose();legacy.material.dispose();legacy.impactGeometry.dispose();legacy.impactMaterial.dispose();}
   abilityButtons.forEach(button=>button.removeEventListener('click',chooseAbility));
   buttons.forEach(button=>button.removeEventListener('click',act));
  },
 };
}
