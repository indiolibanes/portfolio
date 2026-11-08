import {abilitySourceTime,abilityEnvelope} from '/src/scripts/hsin-combat-abilities.mjs';
/** QA-only manual rendering. No RAF, input widgets or production entry point. */
import './hsin-harness.mjs';
import * as T from 'three';
import {decodeCombatData} from '/src/scripts/hsin-combat-data.mjs';
import {createCombatPose} from '/src/scripts/hsin-combat-pose.mjs';
import {createCombatVfx} from '/src/scripts/hsin-combat-vfx.mjs';
import {createCombatEnv} from '/src/scripts/hsin-combat-env.mjs';
import {faceCue,cameraShot} from '/src/scripts/hsin-combat-r21.mjs';
import {createFacialActing} from '/src/scripts/hsin-face-acting.mjs';
import {snapshotFace,createFaceBinding} from '/src/scripts/hsin-face-binding.mjs';

const h=window.hsinHarness;
await h.load({faceSkin:true});
const {scene,model,meshes,bones,profile,camera,renderer,moonlit}=h.state;
const by=new Map(bones.map(bone=>[bone.name,bone]));
const binding=createFaceBinding(meshes,snapshotFace(meshes),profile.calibration,{limits:profile.limits});
const vfx=createCombatVfx({T,scene,camera,by});
const env=createCombatEnv({T,scene,camera,by,vfx,density:1});
const pelvisBone=by.get('ORG-Bip001Pelvis'),restPelvis=new T.Vector3(),shotA={},shotH={};
const left=by.get('ORG-Bip001UpperArmL').getWorldPosition(new T.Vector3());
const right=by.get('ORG-Bip001UpperArmR').getWorldPosition(new T.Vector3());
const facing=left.sub(right).setY(0).normalize().cross(new T.Vector3(0,1,0));
const baseYaw=Math.atan2(facing.x,facing.z);
let data,pose;
async function loadAsset(url){
 pose?.restore();vfx.clear();env.clear();
 data=decodeCombatData(await fetch(url).then(response=>response.json()));
 pose=createCombatPose({T,data,bones,model});
}
function seek({time,yaw=40,detail=false,width=720,height=720,effects=true,environment=false,density=1,camera:camMode='orbit',distance:distOverride,targetY:targetOverride,minScale=0,home=true}){
 if(!pose||time<0||time>data.seconds)throw Error('Invalid acceptance time');
 pose.restore();vfx.clear();env.clear();env.setDensity(density);
 const times=new Set([0,time]);
 for(let frame=1;frame/30<time;frame++)times.add(frame/30);
 for(const [,at] of data.sequence.markers)if(at<=time)times.add(at);
 const events=[];
 for(const at of [...times].sort((a,b)=>a-b)){
  pose.apply(at/data.seconds);model.updateMatrixWorld(true);
  if(at===0)pelvisBone.getWorldPosition(restPelvis);
  for(const [name,marker] of data.sequence.markers)if(marker===at){vfx.event(name,marker);if(environment)env.event(name,marker);events.push({name,time:marker});}
  vfx.update(at);if(environment)env.update(at);
 }
 const actor=createFacialActing({seed:211,pass:'auto-b1',autonomous:true,intensity:.75,morphLimits:profile.limits,gazeAxes:profile.gazeAxes});
 for(let at=0;at<time;at+=1/30)actor.advance(Math.min(1/30,time-at));
 const state=actor.sample(),cue=faceCue(abilitySourceTime(data,time),{});
 state.overlays={E_Squint_R:cue.squint,E_Squint_L:cue.squint,M_Squint_R:cue.mouthSquint,M_Squint_L:cue.mouthSquint,B_Up_Add_R:cue.brow,B_Up_Add_L:cue.brow};
 const gain=data.ability?abilityEnvelope(data,time):time>=6?(8.4-time)/2.4:1;
 state.smileL=(state.smileL??0)*(1-cue.smileCut*gain)+cue.smileAdd*gain;
 state.smileR=(state.smileR??0)*(1-cue.smileCut*gain)+cue.smileAdd*gain;
 state.closeL=Math.max(state.closeL??0,cue.close*gain);state.closeR=Math.max(state.closeR??0,cue.close*gain);
 // Same recovery gain as the lab.
 for(const key of Object.keys(state.overlays))state.overlays[key]*=gain;
 binding.apply(state);
 camera.aspect=width/height;camera.updateProjectionMatrix();
 let target=detail?by.get('ORG-Bip001Head').getWorldPosition(new T.Vector3()).add(new T.Vector3(0,-.03,0)):new T.Vector3(0,.9,0);
 if(targetOverride!==undefined)target=new T.Vector3(0,targetOverride,0);
 let distance=detail?.65:Math.max(3.5,1.65/(2*Math.tan(camera.fov*Math.PI/360)*camera.aspect));
 if(distOverride!==undefined)distance=distOverride;
 const angle=baseYaw+yaw*Math.PI/180;
 if(camMode==='cinematic'){
  // Deterministic cinematic move: the lab's automatic shot list (pchip, so position and speed are continuous), aimed at the standing point instead of the swaying pelvis; after 6 s it eases back to the opening wide shot.
  const lens={fov:camera.fov,aspect:camera.aspect,minDistance:1.05,maxDistance:7};
  cameraShot(abilitySourceTime(data,time),lens,shotA);cameraShot(0,lens,shotH);const k=home?(data.ability?1-abilityEnvelope(data,Math.max(.7,time)):shotA.home):0,mix=(a,b)=>a+(b-a)*k;
  const dist=Math.max(mix(shotA.distance,shotH.distance),minScale*shotH.distance),ty=mix(shotA.targetY,shotH.targetY),lift=mix(shotA.lift,shotH.lift),yawS=mix(shotA.yaw,shotH.yaw);
  target=new T.Vector3(restPelvis.x,ty,restPelvis.z);
  camera.position.set(target.x+Math.sin(yawS)*dist,ty+lift,target.z+Math.cos(yawS)*dist);
 }else camera.position.set(target.x+Math.sin(angle)*distance,target.y+(detail?.025:.18),target.z+Math.cos(angle)*distance);
 camera.lookAt(target);camera.updateMatrixWorld();vfx.update(time);if(environment)env.update(time);else env.hide();
 if(!effects)scene.getObjectByName('Hsin combat R2.1 pooled effects').visible=false;
 else scene.getObjectByName('Hsin combat R2.1 pooled effects').visible=true;
 renderer.setSize(width,height,false);renderer.setPixelRatio(1);
 renderer.domElement.style.width=width+'px';renderer.domElement.style.height=height+'px';
 moonlit.frameSky(camera,target);scene.updateMatrixWorld(true);renderer.render(scene,camera);
 return {time,events,cue,visibleVfx:vfx.visibleDrawCalls(),visibleEnv:environment?env.visibleDrawCalls():0,env:environment?env.probe():null,budget:vfx.budget,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,
  influences:meshes.filter(mesh=>mesh.morphTargetDictionary).map(mesh=>({name:mesh.name,weights:mesh.morphTargetInfluences}))};
}
/** CPU-only cost of the environment layer: replays the sequence at 60 Hz, timing env.update alone, and compares the JS heap growth with and without it. */
function bench({runs=4}={}){
 const hz=60,steps=Math.round(data.seconds*hz),res={runs,steps,withEnv:[],heap:{}};
 const tick=(withEnv,timeEnv)=>{
  pose.restore();vfx.clear();env.clear();const ms=[];
  for(let i=0;i<=steps;i++){
   const at=i/hz;pose.apply(at/data.seconds);model.updateMatrixWorld(true);
   if(at===0)pelvisBone.getWorldPosition(restPelvis);
   for(const [name,marker] of data.sequence.markers)if(marker>at-1/hz&&marker<=at){vfx.event(name,marker);if(withEnv)env.event(name,marker);}
   vfx.update(at);
   if(withEnv){const t0=performance.now();env.update(at);if(timeEnv)ms.push(performance.now()-t0);}
  }
  return ms;
 };
 const heap=()=>performance.memory?.usedJSHeapSize??-1;
 for(const withEnv of [false,true]){
  tick(withEnv,false);const h0=heap();for(let r=0;r<runs;r++)tick(withEnv,false);const h1=heap();
  res.heap[withEnv?'withEnv':'baseline']={bytes:h1-h0,updates:runs*(steps+1)};
 }
 let all=[];for(let r=0;r<runs;r++)all=all.concat(tick(true,true));
 all.sort((x,y)=>x-y);const q=f=>all[Math.min(all.length-1,Math.floor(all.length*f))];
 res.envUpdateMs={mean:+(all.reduce((x,y)=>x+y,0)/all.length).toFixed(4),p50:+q(.5).toFixed(4),p95:+q(.95).toFixed(4),p99:+q(.99).toFixed(4),max:+all[all.length-1].toFixed(4),samples:all.length};
 res.note='JS CPU time of env.update (skeleton sampling + simulation + instance write) in headless Chromium on a CI VM; not a phone measurement.';
 env.clear();return res;
}
window.hsinAcceptance={loadAsset,seek,bench};
window.hsinAcceptanceReady=true;
