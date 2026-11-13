import * as T from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import type {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createVerticalLaunchPad} from './sophia-vertical-pad.ts';
import {createGripSolver} from './sophia-grip-ik.ts';
import {R3,smooth,sampleImmersiveR3At,gripStepAt} from './sophia-immersive-r3-timeline.mjs';

export function disposeAstronautAsset(root:T.Object3D){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>(),ts=new Set<T.Texture>(),ss=new Set<T.Skeleton>(),images=new Set<ImageBitmap>();root.traverse(n=>{const m=n as T.SkinnedMesh;if(m.geometry)gs.add(m.geometry);if(m.skeleton)ss.add(m.skeleton);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>ms.add(x));});ms.forEach(m=>{Object.values(m).forEach(t=>{if(t?.isTexture)ts.add(t);});m.dispose();});gs.forEach(g=>g.dispose());ts.forEach(t=>{t.dispose();if(t.image?.close)images.add(t.image);});ss.forEach(s=>s.dispose());images.forEach(i=>i.close());root.removeFromParent();}

export function createLaunchDirector(gltf:GLTF,scene:T.Scene,camera:T.PerspectiveCamera,controls:OrbitControls,reducedMotion:()=>boolean) {
 const root=gltf.scene,carrier=new T.Group(),asset=new T.Group();carrier.name='LaunchVehicleCarrier_R3';asset.name='OriginalAssetOffset_R3';carrier.add(asset);asset.add(root);scene.add(carrier);root.updateMatrixWorld(true);
 const records:{node:T.Object3D,p:T.Vector3,q:T.Quaternion,s:T.Vector3,visible:boolean,weights?:number[]}[]=[];
 root.traverse(node=>records.push({node,p:node.position.clone(),q:node.quaternion.clone(),s:node.scale.clone(),visible:node.visible,weights:(node as T.Mesh).morphTargetInfluences?.slice()}));
 const restore=()=>{for(const r of records){r.node.position.copy(r.p);r.node.quaternion.copy(r.q);r.node.scale.copy(r.s);r.node.visible=r.visible;const w=(r.node as T.Mesh).morphTargetInfluences;if(w&&r.weights)for(let i=0;i<w.length;i++)w[i]=r.weights[i];}};
 const rider=root.getObjectByName('Sophia_Astronauta_Rider_Mount'),hull=root.getObjectByName('Fuselage'),rocket=root.getObjectByName('Rocket_Flight_Mount');
 const originalFlight=gltf.animations.find(c=>c.name==='Sophia_Foguete_Voo_Esquerda_Ondas_R2'),originalWalk=gltf.animations.find(c=>c.name==='Correr_R6')??gltf.animations.find(c=>c.name==='Andar_R6');
 const mixer=new T.AnimationMixer(root);let lastTime=0,disposed=false,manualCamera=false,returnCamera=false,returnProgress=0;
 const onControlStart=()=>{manualCamera=true;returnCamera=false;};controls.addEventListener('start',onControlStart);
 function disposeModel(){disposeAstronautAsset(root);}
 let partialPad:ReturnType<typeof createVerticalLaunchPad>|null=null,partialLight:T.PointLight|null=null;
 try {
 if(!rider||!hull||!rocket||!originalFlight||!originalWalk){const action=originalFlight?mixer.clipAction(originalFlight).play():null;const box=new T.Box3().setFromObject(root),c=box.getCenter(new T.Vector3());camera.position.copy(c).add(new T.Vector3(0,1,4));controls.target.copy(c);return {supported:false,stats:{fallback:true},get cameraReturning(){return false;},apply(t:number){lastTime=t;root.visible=true;if(action){action.time=t%originalFlight!.duration;mixer.update(0);}controls.enableRotate=controls.enableZoom=true;},resize(){},reset(){restore();},resetCamera(){manualCamera=false;},snapshot(){return {supported:false,time:lastTime,phase:'FLIGHT_LOOP'};},dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(root);controls.removeEventListener?.('start',onControlStart);disposeModel();carrier.removeFromParent();}};}
 const nozzle=root.getObjectByName('Engine_Nozzle')??rocket;
 const sourceAxis=new T.Vector3(0,1,0).transformDirection(hull.matrixWorld),pivot=nozzle.getWorldPosition(new T.Vector3());
 const qPad=new T.Quaternion().setFromUnitVectors(sourceAxis,new T.Vector3(0,1,0)),qFlight=new T.Quaternion();
 const sourceRiderWorldQ=rider.getWorldQuaternion(new T.Quaternion());
 asset.position.copy(pivot).negate();carrier.quaternion.copy(qPad);
 const rocketFrame=new T.Group();rocketFrame.name='RocketAxisFrame_R3';rocketFrame.quaternion.copy(qPad).invert();carrier.add(rocketFrame);carrier.updateMatrixWorld(true);
 const pad=createVerticalLaunchPad(hull,nozzle);partialPad=pad;scene.add(pad.group);
 const unit=pad.stats.hullHeight,rad=pad.stats.hullRadius;
 const seatP=rider.position.clone(),seatQ=rider.quaternion.clone(),seatLocal=rocketFrame.worldToLocal(rider.getWorldPosition(new T.Vector3()));
 const endTheta=Math.atan2(seatLocal.z,seatLocal.x),startTheta=endTheta-Math.PI;
 // Camera reference fixed by the original saddle side, not live user input.
 const cameraRadial=new T.Vector3(Math.cos(endTheta+.45),0,Math.sin(endTheta+.45));
 const nodes=new Set<T.Object3D>();rider.traverse(n=>nodes.add(n));
 const trackNode=(track:T.KeyframeTrack)=>T.PropertyBinding.findNode(root,T.PropertyBinding.parseTrackName(track.name).nodeName);
 const actorTrack=(track:T.KeyframeTrack)=>nodes.has(trackNode(track));
 function filtered(source:T.AnimationClip|undefined,name:string,predicate:(track:T.KeyframeTrack)=>boolean){if(!source)return null;const tracks=source.tracks.filter(predicate).map(t=>t.clone());if(!tracks.length)return null;const clip=new T.AnimationClip(name,source.duration,tracks),action=mixer.clipAction(clip);action.setLoop(T.LoopRepeat,Infinity).play();action.enabled=false;return {clip,action};}
 const walk=filtered(originalWalk,'R3_Run',t=>actorTrack(t)&&trackNode(t)?.name!=='Root_Motion'),flightActor=filtered(originalFlight,'R3_Seated',actorTrack),effects=filtered(originalFlight,'R3_Waves',t=>!actorTrack(t));
 const idle=filtered(gltf.animations.find(c=>c.name==='Engine_Idle'),'R3_EngineIdle',t=>!actorTrack(t)),boost=filtered(gltf.animations.find(c=>c.name==='Engine_Boost'),'R3_EngineBoost',t=>!actorTrack(t));
 const actions=[walk,flightActor,effects,idle,boost];
 function sample(a:typeof walk,weight:number,time:number){if(!a)return;a.action.play();a.action.enabled=weight>1e-6;a.action.setEffectiveWeight(weight);a.action.time=Math.max(0,time)%Math.max(.001,a.clip.duration);}
 if(!walk||!flightActor)throw Error('R3 cannot resolve actor channels');
 const hips=[...nodes].find(n=>n.name.endsWith('Hips'));
 restore();sample(walk,1,0);mixer.update(0);root.updateMatrixWorld(true);
 const hipsLocal=hips?rider.worldToLocal(hips.getWorldPosition(new T.Vector3())):new T.Vector3();
 const measurementParentQ=rider.parent!.getWorldQuaternion(new T.Quaternion());
 rider.quaternion.copy(measurementParentQ.invert().multiply(sourceRiderWorldQ));root.updateMatrixWorld(true);
 const bootsBox=new T.Box3();for(const name of ['Suit_Boot_L','Suit_Boot_R']){const foot=root.getObjectByName(name) as T.SkinnedMesh|undefined;if(foot){foot.computeBoundingBox?.();bootsBox.expandByObject(foot);}}
 const standingHipHeight=hips&&!bootsBox.isEmpty()?hips.getWorldPosition(new T.Vector3()).y-bootsBox.min.y:unit*.4;

 const left=createGripSolver(rider,'Left'),right=createGripSolver(rider,'Right');
 const anchors=[new T.Object3D(),new T.Object3D()];anchors[0].name='Grip_L';anchors[1].name='Grip_R';rocketFrame.add(...anchors);
 const engineNodes:T.Object3D[]=[],ribbons:T.Object3D[]=[];root.traverse(n=>{if(/Plume|Shock_Diamond|Engine_Coil|Fusion_Halo|Fusion_Core|Plasma_Ring/.test(n.name))engineNodes.push(n);if(/^SpeedRibbon_\d+$/.test(n.name))ribbons.push(n);});
 const plume=root.getObjectByName('Plume_Root'),light=new T.PointLight(0xffb46c,0,unit*5,2);partialLight=light;scene.add(light);
 const tangent=new T.Vector3(),followOffset=new T.Vector3(0,unit*.45,0),radial=new T.Vector3(),targetHip=new T.Vector3(),worldTarget=new T.Vector3(),temp=new T.Vector3(),offset=new T.Vector3(),previous=new T.Vector3(),sourceForward=new T.Vector3(0,0,1).applyQuaternion(sourceRiderWorldQ);sourceForward.y=0;sourceForward.normalize();
 const desiredQ=new T.Quaternion(),parentQ=new T.Quaternion(),yawQ=new T.Quaternion(),frameQ=new T.Quaternion(),gripWorld=new T.Vector3();
 let gripErrors:(number|null)[]=[null,null];let lastSample=sampleImmersiveR3At(0);
 const padEnvelope=pad.box.clone().expandByScalar(unit*.25);padEnvelope.min.x-=unit*.7;padEnvelope.max.x+=unit*.7;padEnvelope.max.y=Math.max(padEnvelope.max.y,unit*1.65);
 const autoPosition=new T.Vector3(),autoTarget=new T.Vector3(),returnFromP=new T.Vector3(),returnFromT=new T.Vector3(),frameCenter=new T.Vector3();
 let cameraDistance=unit*4;
 function fitCamera(s:ReturnType<typeof sampleImmersiveR3At>){
  const follow=smooth((s.t-R3.launch)/2),wide=padEnvelope.getCenter(frameCenter);
  autoTarget.copy(wide).lerp(temp.copy(carrier.position).add(followOffset),follow);
  const minFov=2*Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect));
  const radius=padEnvelope.getSize(temp).length()*.5;cameraDistance=T.MathUtils.lerp(radius/Math.sin(minFov/2)*1.12,unit*2.5/Math.sin(minFov/2),follow);
  autoPosition.copy(autoTarget).addScaledVector(cameraRadial,cameraDistance);autoPosition.y+=cameraDistance*.18;
 }
 function placeRider(s:ReturnType<typeof sampleImmersiveR3At>){
  if(hips)hipsLocal.copy(rider.worldToLocal(hips.getWorldPosition(temp)));
  const theta=startTheta+s.orbitTheta,bodyRadius=rad+unit*.14;
  radial.set(Math.cos(theta),0,Math.sin(theta));
  // The walker stays upright in the measured vertical rocket frame. Its hips,
  // rather than imported mesh origin, trace the approach and orbit.
  const approachRadius=bodyRadius+unit*.9*(1-s.approach),jump=s.jump;
  targetHip.copy(radial).multiplyScalar(T.MathUtils.lerp(approachRadius,bodyRadius,jump));
  targetHip.y=T.MathUtils.lerp(pad.groundY+standingHipHeight+.002,unit*.59,jump)+unit*.25*4*jump*(1-jump);
  targetHip.addScaledVector(tangent.set(-radial.z,0,radial.x),unit*.32*(1-s.approach)*(1-jump));
  rocketFrame.getWorldQuaternion(frameQ);desiredQ.copy(yawQ.setFromUnitVectors(sourceForward,temp.copy(radial).negate())).multiply(sourceRiderWorldQ);desiredQ.premultiply(frameQ);
  rider.parent!.getWorldQuaternion(parentQ);desiredQ.premultiply(parentQ.invert());
  rider.quaternion.copy(desiredQ);worldTarget.copy(hipsLocal).multiply(rider.scale).applyQuaternion(desiredQ);
  rocketFrame.localToWorld(targetHip);rider.parent!.worldToLocal(targetHip);rider.position.copy(targetHip).sub(worldTarget);
  const settle=s.settle; rider.position.lerp(seatP,settle);rider.quaternion.slerp(seatQ,settle);rider.visible=s.riderVisible;
  root.updateMatrixWorld(true);
  gripErrors[0]=gripErrors[1]=null;
  for(let i=0;i<2;i++){const step=gripStepAt(s.orbit,i?'R':'L'),a=startTheta+step.angle+(i?1:-1)*.14;
   anchors[i].position.set(Math.cos(a)*(rad+unit*.015),unit*.70,Math.sin(a)*(rad+unit*.015));
   const releaseHand=smooth((settle-(i?.05:.45))/(i?.45:.55));
   const weight=s.grip*(1-releaseHand);anchors[i].getWorldPosition(gripWorld);gripErrors[i]=(i?right:left).solve(gripWorld,weight);
  }
 }
 function apply(t:number,cameraDt?:number){if(disposed)return;const s=sampleImmersiveR3At(t),dt=Math.max(0,Math.min(.1,cameraDt??t-lastTime));lastTime=t;lastSample=s;
  carrier.position.set(s.x*unit,s.height*unit,0);carrier.quaternion.copy(qPad).slerp(qFlight,s.pitch);mixer.stopAllAction();restore();root.visible=true;
  sample(walk,s.riderVisible?1-s.settle:0,Math.min(s.walkTime,R3.prepare-R3.enter));sample(flightActor,s.settle,Math.max(0,t-R3.flight));
  sample(idle,s.enginePower*(1-s.release),t-R3.ignition);sample(boost,s.release*(1-s.flightMix),t-R3.launch);sample(effects,s.flightMix,t-R3.flight);mixer.update(0);
  root.updateMatrixWorld(true);placeRider(s);
  engineNodes.forEach(n=>{n.visible=s.enginePower>.001;});if(plume&&s.t<R3.flight)plume.scale.multiplyScalar(.08+s.enginePower*.8);
  ribbons.forEach(n=>{n.visible=s.trailPower>.001;n.scale.z*=Math.max(.00001,s.trailPower);});
  pad.update(t,s.release,s.enginePower,reducedMotion());light.position.copy(nozzle.getWorldPosition(temp));light.intensity=s.enginePower*2;
  fitCamera(s);
  if(manualCamera){temp.copy(carrier.position).sub(previous);camera.position.add(temp);controls.target.add(temp);}
  else if(returnCamera){returnProgress=Math.min(1,returnProgress+dt/.8);camera.position.copy(returnFromP).lerp(autoPosition,smooth(returnProgress));controls.target.copy(returnFromT).lerp(autoTarget,smooth(returnProgress));if(returnProgress===1)returnCamera=false;}
  else{camera.position.copy(autoPosition);controls.target.copy(autoTarget);}
  controls.enableRotate=controls.enableZoom=controls.enablePan=true;controls.minDistance=unit*.6;controls.maxDistance=unit*40;controls.minPolarAngle=.1;controls.maxPolarAngle=Math.PI*.88;
  camera.near=Math.max(.002,unit/300);camera.far=Math.max(100,unit*200);camera.lookAt(controls.target);camera.updateProjectionMatrix();previous.copy(carrier.position);
 }
 function reset(){manualCamera=false;returnCamera=false;returnProgress=0;previous.set(0,0,0);lastTime=0;apply(0);}
 function snapshot(){root.updateMatrixWorld(true);const rest=rider.parent!.localToWorld(seatP.clone());return {supported:true,time:lastTime,phase:lastSample.phase,riderVisible:rider.visible,riderWorld:rider.getWorldPosition(new T.Vector3()).toArray(),seatedWorld:rest.toArray(),riderSeatError:rider.getWorldPosition(new T.Vector3()).distanceTo(rest),rocketWorld:rocket.getWorldPosition(new T.Vector3()).toArray(),rocketUpDotWorldY:new T.Vector3(0,1,0).transformDirection(hull.matrixWorld).y,carrierWorld:carrier.position.toArray(),baseWorld:pad.group.getWorldPosition(new T.Vector3()).toArray(),orbitTheta:lastSample.orbitTheta,gripErrors,gripTolerance:pad.stats.hullRadius*2*.03,gripStatus:left.available&&right.available?'PROCEDURAL_IK_CANDIDATE':'GRIP_ANIMATION_PENDING',ribbonsVisible:ribbons.some(n=>n.visible),cradleTriangles:pad.stats.triangles,cradleMeshes:pad.stats.meshes,groundOffset:0,unit,controlsEnabled:controls.enableRotate,cameraMode:manualCamera?'USER':returnCamera?'RETURNING':'AUTO',actorTracks:flightActor!.clip.tracks.length,walkTracks:walk!.clip.tracks.length};}
 reset();return {supported:true,stats:pad.stats,apply,reset,snapshot,get cameraReturning(){return returnCamera;},resize(){if(!manualCamera)apply(lastTime);},resetCamera(){returnFromP.copy(camera.position);returnFromT.copy(controls.target);returnProgress=0;manualCamera=false;returnCamera=true;},dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(root);controls.removeEventListener?.('start',onControlStart);pad.dispose();disposeModel();light.removeFromParent();carrier.removeFromParent();}};
 } catch(error){mixer.stopAllAction();mixer.uncacheRoot(root);partialPad?.dispose();partialLight?.removeFromParent();controls.removeEventListener?.('start',onControlStart);disposeModel();carrier.removeFromParent();throw error;}
}
