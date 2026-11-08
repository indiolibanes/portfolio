import {createCombatDirector} from './hsin-combat-director.mjs';
import {decodeCombatData} from './hsin-combat-data.mjs';
import {createCombatPose} from './hsin-combat-pose.mjs';
/** Loaded on explicit lab request. Uses the stage's camera, scene, loop and arbiter output. */
export async function createCombatLab({T,root,scene,model,bones,body,dance,camera,orbit,canvas,signal,invalidate,modelHash,profileHash}){
 const start=performance.now();
 const version=root.querySelector('[data-combat-version]')?.value==='r2'?'r2':'r1';
 const {default:manifest}=version==='r2'?await import('../data/hsin-combat-r2.json',{with:{type:'json'}}):await import('../data/hsin-combat-r1.json',{with:{type:'json'}});
 const response=await fetch(manifest.url+'?v='+manifest.sha256.slice(0,12),{signal});
 if(!response.ok)throw Error('Combat bake unavailable');
 const text=await response.text(),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 const sha=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 const data=JSON.parse(text);
 if(sha!==manifest.sha256||data.modelSha256!==modelHash||data.profileSha256!==profileHash)throw Error('Combat identity mismatch');
 decodeCombatData(data);
 const by=new Map(bones.map(b=>[b.name,b])),chain=data.names.map(name=>by.get(name));
 const pose=createCombatPose({T,data,bones,model});
 const versionSelect=root.querySelector('[data-combat-version]');if(versionSelect)versionSelect.disabled=true;
 const group=new T.Group();group.name='Hsin combat R1 pooled effects';scene.add(group);
 const geometry=new T.TorusGeometry(.19,.009,5,48),material=new T.MeshBasicMaterial({color:0xffd592,transparent:true,opacity:0,depthWrite:false});
 const arcGeometry=new T.TorusGeometry(.19,.009,5,48,Math.PI*1.3);
 const ring=new T.Mesh(geometry,material);group.add(ring);ring.visible=false;ring.matrixAutoUpdate=true;
 const echoes=[];
 if(version==='r2')for(let i=0;i<2;i++){const mesh=new T.Mesh(geometry,material);mesh.visible=false;group.add(mesh);echoes.push(mesh);}
 const trailPoints=version==='r2'?new Float32Array(48):null;
 const trailGeometry=version==='r2'?new T.BufferGeometry():null;
 const trailMaterial=version==='r2'?new T.LineBasicMaterial({color:0xffd9b3,transparent:true,opacity:.7,depthWrite:false}):null;
 const trail=trailGeometry?new T.Line(trailGeometry,trailMaterial):null;
 if(trail){trailGeometry.setAttribute('position',new T.BufferAttribute(trailPoints,3));trail.frustumCulled=false;trail.visible=false;group.add(trail);}
 let trailCount=0;
 const impactGeometry=new T.RingGeometry(.015,.07,24),impactMaterial=material.clone(),impact=new T.Mesh(impactGeometry,impactMaterial);group.add(impact);impact.visible=false;
 let hand=by.get('ORG-Bip001HandR');
 const anchor=new T.Vector3(),direction=new T.Vector3(),target=new T.Vector3(),desired=new T.Vector3(),offset=new T.Vector3();
 const cameraOrigin=new T.Vector3(),cameraTargetOrigin=new T.Vector3();
 let age=0,effect='',auto=false,disposed=false,lastPhase='',faceWeight=0,lastCpu=0,pendingRestart=false;
 const status=root.querySelector('[data-combat-status]');
 const oldPan=orbit.enablePan;orbit.enablePan=true;
 const manual=()=>{auto=false;};
 orbit.addEventListener('start',manual);
 for(const event of ['pointerdown','wheel'])canvas.addEventListener(event,manual,{passive:true,signal});
 const cue={overlays:{},smileL:0,smileR:0},faceOutput={};
 const setFace=state=>{
  lastPhase=state;
  if(state==='RECOVERY'||state==='INTERRUPTED'){if(status)status.textContent=state;return;}
  cue.overlays={};cue.smileL=cue.smileR=0;
  const effort=state==='BASIC'?.035:state==='SKILL'?.025:0;
  cue.overlays.E_Squint_R=effort;cue.overlays.E_Squint_L=effort;
  cue.overlays.B_Up_Add_R=state==='PREPARATION'?.05:0;
  cue.overlays.M_Squint_R=effort*.5;cue.overlays.M_Squint_L=effort*.5;
  if(status)status.textContent=state==='COMPLETE'?'Concluído · adaptação experimental':state;
 };
 const clear=()=>{ring.visible=impact.visible=false;if(trail)trail.visible=false;echoes.forEach(mesh=>mesh.visible=false);trailCount=0;effect='';};
 const director=createCombatDirector({pose,sequence:data.sequence,onState:setFace,onRelease:()=>{clear();auto=false;faceWeight=0;},onEvent:event=>{
  if(event==='clear'||event==='recovery'){clear();return;}
  hand=by.get(event==='arc-left'?'ORG-Bip001HandL':'ORG-Bip001HandR');
  hand.updateWorldMatrix(true,false);hand.getWorldPosition(anchor);
  model.getWorldDirection(direction);direction.y=0;direction.normalize();
  ring.position.copy(anchor);ring.quaternion.copy(camera.quaternion);ring.scale.setScalar(event.startsWith('arc')?1.5:.6);
  ring.geometry=event.startsWith('arc')?arcGeometry:geometry;material.color.set(event.startsWith('arc')?0xff747e:0xffd592);
  if(version==='r2'&&event==='ring')cue.smileL=.045;
  effect=event;age=0;ring.visible=true;trailCount=0;if(trail)trail.visible=event.startsWith('arc');
 }});
 function acquire(){
  if(dance()?.owns()){if(status)status.textContent='Aguarde a dança retornar ao repouso.';return false;}
  if(body.busy()){if(status)status.textContent='Aguarde o retorno ao repouso.';body.release();return false;}
  director.reset();body.reset();
  if(!pose.atBaseline()){if(status)status.textContent='Pose de referência incompatível. Recarregue o laboratório.';return false;}
  return director.start();
 }
 const buttons=root.querySelectorAll('[data-combat-action]');
 const act=event=>{
  const action=event.currentTarget.dataset.combatAction;
  if(action==='play'||action==='restart'){
   if(director.owns()){pendingRestart=true;director.interrupt();return;}
   acquire();
  }else if(action==='pause'){const d=director.diagnostics();if(d.paused)director.resume();else director.pause();}
  else if(action==='stop'){pendingRestart=false;director.interrupt();}
  else if(action==='camera'){cameraOrigin.copy(camera.position);cameraTargetOrigin.copy(orbit.target);auto=true;}
  else if(action==='trace'){
   const blob=new Blob([JSON.stringify(director.diagnostics(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='hsin-combat-'+version+'-trace.json';link.click();URL.revokeObjectURL(url);
  }
  invalidate();
 };
 root.querySelectorAll('[data-stage-in],[data-stage-out],[data-stage-reset]').forEach(button=>button.addEventListener('click',manual,{signal}));
 buttons.forEach(button=>button.addEventListener('click',act,{signal}));
 const preparationMs=performance.now()-start;
 if(status)status.textContent='Carregado · câmera livre';
 return {
  owns:director.owns,
  needsAdvance:()=>director.owns()||pendingRestart,
  advance(dt){
   if(pendingRestart&&!director.owns()){pendingRestart=false;acquire();}
   const t0=performance.now(),wasPaused=director.sample().paused;
   director.advance(dt);
   if(director.owns()&&!wasPaused){
    faceWeight=Math.min(1,faceWeight+dt*5);
    if(effect){
     if(trail?.visible){hand.updateWorldMatrix(true,false);hand.getWorldPosition(target);if(trailCount===16)trailPoints.copyWithin(0,3);else trailCount++;target.toArray(trailPoints,(trailCount-1)*3);trailGeometry.attributes.position.needsUpdate=true;trailGeometry.setDrawRange(0,trailCount);}
     if(effect==='energy'){hand.updateWorldMatrix(true,false);hand.getWorldPosition(anchor);}age+=dt;const duration=effect==='energy'?.55:.65,u=Math.min(1,age/duration);
     ring.position.copy(anchor).addScaledVector(direction,effect==='energy'?0:u*.8);ring.scale.setScalar((effect.startsWith('arc')?1.5:.6)+u*.8);material.opacity=(1-u)*.8;
     if(effect!=='energy'&&u>.65){impact.visible=true;impact.position.copy(ring.position);impact.quaternion.copy(camera.quaternion);impact.scale.setScalar(1+(u-.65)*5);impactMaterial.opacity=(1-u)*1.5;}
     echoes.forEach((mesh,i)=>{mesh.visible=effect==='ring';mesh.position.copy(ring.position).addScaledVector(direction,-.12*(i+1));mesh.quaternion.copy(ring.quaternion);mesh.rotateY((i?1:-1)*.25);mesh.scale.setScalar((.8+u*.6)*(i+1));});
     if(u===1)clear();
    }
   }
   if(auto&&director.owns()&&!wasPaused){
    const pelvis=by.get('ORG-Bip001Pelvis');pelvis.updateWorldMatrix(true,false);pelvis.getWorldPosition(target);target.y=lastPhase==='SKILL'?1.04:.98;const distance=Math.max(2.8,1.95/Math.tan(camera.fov*Math.PI/360)/Math.min(1,camera.aspect)*.62);
    const yaw=lastPhase==='BASIC'?-Math.PI/5.5:-Math.PI/6;
    desired.set(target.x+Math.sin(yaw)*distance,1.2,target.z+Math.cos(yaw)*distance);
    if(lastPhase==='RECOVERY'){target.copy(cameraTargetOrigin);desired.copy(cameraOrigin);}
    const gain=1-Math.exp(-dt/1.1);offset.copy(orbit.target);orbit.target.lerp(target,gain);offset.sub(orbit.target);camera.position.sub(offset).lerp(desired,gain);camera.lookAt(orbit.target);
   }
   lastCpu=performance.now()-t0;
  },
  face(state){if(!director.owns())return state;const gain=lastPhase==='INTERRUPTED'?1-director.sample().recovery:lastPhase==='RECOVERY'?Math.max(0,(data.seconds-director.sample().time)/(data.version==='combat-r2'?2.4:1.95)):faceWeight;state.overlays=faceOutput;for(const key of Object.keys(faceOutput))faceOutput[key]=0;state.smileL=cue.smileL*gain;state.smileR=cue.smileR*gain;for(const key of Object.keys(cue.overlays))state.overlays[key]=cue.overlays[key]*gain;return state;},
  diagnostics:()=>({...director.diagnostics(),preparationMs,lastCpuMs:lastCpu,bakeBytes:manifest.bytes,decodedBytes:data.frameCount*data.rest.length*4+(data.recovery?.values.byteLength??0),version,recoveryBytes:pose.bufferBytes,extraDrawCalls:version==='r2'?5:2,geometries:version==='r2'?4:3,textures:0,camera:auto?'automatic':'free'}),
  dispose(){if(disposed)return;disposed=true;director.dispose();orbit.removeEventListener('start',manual);orbit.enablePan=oldPan;scene.remove(group);geometry.dispose();arcGeometry.dispose();material.dispose();impactGeometry.dispose();impactMaterial.dispose();trailGeometry?.dispose();trailMaterial?.dispose();buttons.forEach(button=>button.removeEventListener('click',act));},
 };
}
