import {createCombatDirector} from './hsin-combat-director.mjs';
import {decodeCombatData} from './hsin-combat-data.mjs';
import {createBakedPose} from './hsin-baked-pose.mjs';
/** Loaded on explicit lab request. Uses the stage's camera, scene, loop and arbiter output. */
export async function createCombatLab({T,root,scene,model,bones,body,dance,camera,orbit,canvas,signal,invalidate,modelHash,profileHash}){
 const start=performance.now();
 const {default:manifest}=await import('../data/hsin-combat-r1.json',{with:{type:'json'}});
 const response=await fetch(manifest.url+'?v='+manifest.sha256.slice(0,12),{signal});
 if(!response.ok)throw Error('Combat bake unavailable');
 const text=await response.text(),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 const sha=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 const data=JSON.parse(text);
 if(sha!==manifest.sha256||data.modelSha256!==modelHash||data.profileSha256!==profileHash)throw Error('Combat identity mismatch');
 decodeCombatData(data);
 const baked=createBakedPose({THREE:T,data,bones});
 if(!baked.diagnostics().ready)throw Error('Combat binding mismatch');
 const by=new Map(bones.map(b=>[b.name,b])),chain=data.names.map(n=>by.get(n));
 const snapshot=new Float64Array(data.rest.length),a=new T.Quaternion(),b=new T.Quaternion();
 const pose={
  apply:t=>baked.apply(t),
  restore:()=>baked.restore(),
  beginRecovery(){chain.forEach((bone,i)=>bone.quaternion.toArray(snapshot,i*4));},
  recover(t){const u=t*t*t*(t*(t*6-15)+10);chain.forEach((bone,i)=>{a.fromArray(snapshot,i*4);b.fromArray(data.rest,i*4);bone.quaternion.copy(a.slerp(b,u));bone.updateMatrix();});},
 };
 const group=new T.Group();group.name='Hsin combat R1 pooled effects';scene.add(group);
 const geometry=new T.TorusGeometry(.19,.009,5,48),material=new T.MeshBasicMaterial({color:0xffd592,transparent:true,opacity:0,depthWrite:false});
 const ring=new T.Mesh(geometry,material);group.add(ring);ring.visible=false;ring.matrixAutoUpdate=true;
 const impactGeometry=new T.RingGeometry(.015,.07,24),impactMaterial=material.clone(),impact=new T.Mesh(impactGeometry,impactMaterial);group.add(impact);impact.visible=false;
 const hand=by.get('ORG-Bip001HandR'),anchor=new T.Vector3(),direction=new T.Vector3(),target=new T.Vector3(),desired=new T.Vector3(),offset=new T.Vector3();
 let age=0,effect='',auto=false,disposed=false,lastPhase='',faceWeight=0,lastCpu=0,pendingRestart=false;
 const status=root.querySelector('[data-combat-status]');
 const oldPan=orbit.enablePan;orbit.enablePan=true;
 const manual=()=>{auto=false;};
 orbit.addEventListener('start',manual);
 for(const event of ['pointerdown','wheel'])canvas.addEventListener(event,manual,{passive:true,signal});
 const cue={overlays:{},smileL:0,smileR:0},faceOutput={};
 const setFace=state=>{
  lastPhase=state;cue.overlays={};
  const effort=state==='BASIC'?.035:state==='SKILL'?.025:0;
  cue.overlays.E_Squint_R=effort;cue.overlays.E_Squint_L=effort;
  cue.overlays.B_Up_Add_R=state==='PREPARATION'?.05:0;
  cue.overlays.M_Squint_R=effort*.5;cue.overlays.M_Squint_L=effort*.5;
  if(status)status.textContent=state==='COMPLETE'?'Concluído · adaptação experimental':state;
 };
 const clear=()=>{ring.visible=impact.visible=false;effect='';};
 const director=createCombatDirector({pose,onState:setFace,onRelease:()=>{clear();auto=false;faceWeight=0;},onEvent:event=>{
  if(event==='clear'||event==='recovery'){clear();return;}
  hand.updateWorldMatrix(true,false);hand.getWorldPosition(anchor);
  model.getWorldDirection(direction);direction.y=0;direction.normalize();
  ring.position.copy(anchor);ring.quaternion.copy(camera.quaternion);ring.scale.setScalar(event==='arc'?1.5:.6);
  geometry.setDrawRange(0,event==='arc'?Math.floor(geometry.index.count*.65/3)*3:geometry.index.count);material.color.set(event==='arc'?0xff747e:0xffd592);
  effect=event;age=0;ring.visible=true;
 }});
 const buttons=root.querySelectorAll('[data-combat-action]');
 const act=event=>{
  const action=event.currentTarget.dataset.combatAction;
  if(action==='play'||action==='restart'){
   if(director.owns()){pendingRestart=true;director.interrupt();return;}
   if(dance()?.owns()||body.busy()){if(status)status.textContent='Aguarde o retorno ao repouso.';body.release();return;}
   director.reset();body.reset();
   const matches=chain.every((bone,i)=>bone.quaternion.toArray().every((v,k)=>Math.abs(v-data.rest[i*4+k])<2e-5));
   if(!matches){if(status)status.textContent='Pose de referência incompatível. Recarregue o laboratório.';return;}
   director.start();
  }else if(action==='pause'){const d=director.diagnostics();if(d.paused)director.resume();else director.pause();}
  else if(action==='stop')director.interrupt();
  else if(action==='camera'){auto=true;}
  else if(action==='trace'){
   const blob=new Blob([JSON.stringify(director.diagnostics(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='hsin-combat-r1-trace.json';link.click();URL.revokeObjectURL(url);
  }
  invalidate();
 };
 root.querySelectorAll('[data-stage-in],[data-stage-out],[data-stage-reset]').forEach(button=>button.addEventListener('click',manual,{signal}));
 buttons.forEach(button=>button.addEventListener('click',act,{signal}));
 const preparationMs=performance.now()-start;
 if(status)status.textContent='Carregado · câmera livre';
 return {
  owns:director.owns,
  advance(dt){
   if(pendingRestart&&!director.owns()){pendingRestart=false;body.reset();director.start();}
   const t0=performance.now(),wasPaused=director.sample().paused;
   director.advance(dt);
   if(director.owns()&&!wasPaused){
    faceWeight=Math.min(1,faceWeight+dt*5);
    if(effect){if(effect==='energy'){hand.updateWorldMatrix(true,false);hand.getWorldPosition(anchor);}age+=dt;const duration=effect==='energy'?.55:.65,u=Math.min(1,age/duration);
     ring.position.copy(anchor).addScaledVector(direction,effect==='energy'?0:u*.8);ring.scale.setScalar((effect==='arc'?1.5:.6)+u*.8);material.opacity=(1-u)*.8;
     if(effect!=='energy'&&u>.65){impact.visible=true;impact.position.copy(ring.position);impact.quaternion.copy(camera.quaternion);impact.scale.setScalar(1+(u-.65)*5);impactMaterial.opacity=(1-u)*1.5;}
     if(u===1)clear();
    }
   }
   if(auto&&director.owns()&&!wasPaused){
    target.set(0,lastPhase==='SKILL'?1.04:.98,0);const distance=Math.max(2.8,1.95/Math.tan(camera.fov*Math.PI/360)/Math.min(1,camera.aspect)*.62);
    desired.set(Math.sin(-Math.PI/6)*distance,1.2,Math.cos(-Math.PI/6)*distance);
    const gain=1-Math.exp(-dt/1.1);offset.copy(orbit.target);orbit.target.lerp(target,gain);offset.sub(orbit.target);camera.position.sub(offset).lerp(desired,gain);camera.lookAt(orbit.target);
   }
   lastCpu=performance.now()-t0;
  },
  face(state){if(!director.owns())return state;const gain=lastPhase==='RECOVERY'?Math.max(0,(5.8-director.sample().time)/1.95):faceWeight;state.overlays=faceOutput;for(const key of Object.keys(faceOutput))faceOutput[key]=0;state.smileL=state.smileR=0;for(const key of Object.keys(cue.overlays))state.overlays[key]=cue.overlays[key]*gain;return state;},
  diagnostics:()=>({...director.diagnostics(),preparationMs,lastCpuMs:lastCpu,bakeBytes:manifest.bytes,decodedBytes:data.frameCount*data.rest.length*4,recoveryBytes:snapshot.byteLength,extraDrawCalls:2,geometries:2,textures:0,camera:auto?'automatic':'free'}),
  dispose(){if(disposed)return;disposed=true;director.dispose();orbit.removeEventListener('start',manual);orbit.enablePan=oldPan;scene.remove(group);geometry.dispose();material.dispose();impactGeometry.dispose();impactMaterial.dispose();buttons.forEach(button=>button.removeEventListener('click',act));},
 };
}
