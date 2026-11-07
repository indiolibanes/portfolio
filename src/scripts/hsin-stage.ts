import {duetFitDistance,currentDuetBounds} from './shorekeeper/duet-framing.mjs';
import {musicForStage} from './hsin-music-state.mjs';
import {createMusicTransport} from './hsin-music-transport.mjs';
import {createDanceDirector} from './hsin-dance-director.mjs';
import {createDancePose} from './hsin-dance-pose.mjs';
import {decodeDanceData} from './hsin-dance-data.mjs';
import {dancePlaybackEligible,reverieSettings} from './hsin-dance-config.mjs';
import musicMaps from '../data/hsin-music-map.json';
import {createMusicTower} from './hsin-music-tower.mjs';
import {HSIN_STAGE,pixelRatio,attentionHeight} from './hsin-stage-config.mjs';
import {createStageLoop} from './hsin-stage-loop.mjs';
import {createBakedPose,createBakedChest} from './hsin-baked-pose.mjs';
import {createFacialActing} from './hsin-face-acting.mjs';
import {snapshotFace,createFaceBinding} from './hsin-face-binding.mjs';
import {createChestDirector} from './hsin-chest-director.mjs';
import {createBodyRepertoire} from './hsin-body-repertoire.mjs';
import {createHairCaress,createLipHairComposition} from './hsin-lip-hair.mjs';
import {createPoseTransition} from './hsin-pose-transition.mjs';
import {createRestBreath} from './hsin-rest-breath.mjs';
import {LUNAR_TERRACE,createLunarTerrace} from './hsin-lunar-terrace.mjs';
import {HSIN_CINEMATIC_IDLE,createCinematicReference} from './hsin-cinematic-idle.mjs';
import {lunarCameraFit} from './hsin-lunar-framing.mjs';
import {HSIN_LUNAR_PRESENTATION,createLunarPresentation} from './hsin-lunar-presentation.mjs';
import {createStageLights} from './hsin-stage-lighting.mjs';
import {createFaceSkin} from './hsin-face-skin.mjs';
import {createStageMetrics,metricsRequested} from './hsin-stage-metrics.mjs';

/** Public player. The local-file lab, geometry solvers and authoring UI are separate entries. */
export function mountHsinStage(root:HTMLElement){
 const q=<T extends HTMLElement>(s:string)=>{const e=root.querySelector<T>(s);if(!e)throw Error('Missing stage element '+s);return e;};
 const host=q<HTMLDivElement>('[data-stage-canvas]'),status=q<HTMLDivElement>('[data-stage-status]'),errorBox=q<HTMLDivElement>('[data-stage-error]');
 const near=q<HTMLButtonElement>('[data-stage-in]'),far=q<HTMLButtonElement>('[data-stage-out]'),home=q<HTMLButtonElement>('[data-stage-reset]'),pause=q<HTMLButtonElement>('[data-stage-pause]'),retry=q<HTMLButtonElement>('[data-stage-retry]');
 // Opt-in (?hsin-metrics): CPU timings and milestones on window.__hsinMetrics. No UI, no extra loop; disabled it costs one boolean per frame.
 const duetRequested=root.dataset.s6Duo==='true';
 const publicRelease=duetRequested&&root.dataset.publicStage==='true';
 // Opt-in QA mode: protected endpoints still validate Cloudflare Access per request.
 // Never silently fall back from an unavailable public release to the private GLB.
 const privatePreview=publicRelease&&new URLSearchParams(location.search).get('privatePreview')==='1';
 const publicAssetSource=publicRelease&&!privatePreview;
 const duetStatus=root.querySelector<HTMLElement>('[data-duo-guest-status]');
 const duetR6=duetRequested&&(publicRelease||new URLSearchParams(location.search).get('r6Guest')==='1');
 const duetControls=root.querySelector<HTMLElement>('[data-duo-r6-controls]');
 if(duetControls)duetControls.hidden=!duetR6;
 const cameraChoice=duetRequested?root.querySelector<HTMLSelectElement>('[data-duo-camera-mode]'):null;
 let cameraMode='auto',chooseDuetCamera=(_mode:string)=>{};
 const music=musicForStage(root);
 const metrics=createStageMetrics({enabled:metricsRequested(location.search)});
 const life=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)'),touch=matchMedia('(pointer: coarse)').matches;
 cameraChoice?.addEventListener('change',()=>chooseDuetCamera(cameraChoice.value),{signal:life.signal});
 let viewportVisible=true,destroyed=false,started=false,paused=false,generation=0,lost=false;
 let disposeAttempt=()=>{},loop:ReturnType<typeof createStageLoop>|null=null,zoom=(_factor:number)=>{},resetCamera=()=>{},ensureDance=()=>{};
 const showPause=()=>{const frozen=paused||motion.matches;pause.setAttribute('aria-pressed',String(frozen));pause.textContent=frozen?'▶':'Ⅱ';pause.setAttribute('aria-label',frozen?'Retomar atuação':'Pausar atuação');pause.title=frozen?'Retomar atuação':'Pausar atuação';pause.disabled=root.dataset.state!=='ready'||motion.matches;};
 const policy=()=>{showPause();metrics.gap();ensureDance();loop?.policyChanged();};
 near.addEventListener('click',()=>zoom(.84),{signal:life.signal});far.addEventListener('click',()=>zoom(1.19),{signal:life.signal});home.addEventListener('click',()=>resetCamera(),{signal:life.signal});
 pause.addEventListener('click',()=>{paused=!paused;policy();},{signal:life.signal});
 retry.addEventListener('click',()=>{started=false;start();},{signal:life.signal});
 motion.addEventListener('change',policy,{signal:life.signal});
 const visible=()=>viewportVisible&&!document.hidden&&!lost&&!destroyed;
 document.addEventListener('visibilitychange',()=>{if(!visible())metrics.gap();loop?.setVisible(visible());if(visible()&&!started)start();},{signal:life.signal});
 const intersection=new IntersectionObserver(entries=>{viewportVisible=entries[0]?.isIntersecting??true;if(!visible())metrics.gap();loop?.setVisible(visible());if(visible()&&!started)start();},{threshold:.01});intersection.observe(root);
 function teardown(){if(destroyed)return;destroyed=true;generation++;life.abort();intersection.disconnect();metrics.gap();disposeAttempt();loop=null;}
 window.addEventListener('pagehide',teardown,{once:true,signal:life.signal});
 // pagehide also fires for bfcache: rebuild resources when returning to this page.
 const resumePage=(event:PageTransitionEvent)=>{if(!event.persisted)return;window.removeEventListener('pageshow',resumePage);if(destroyed)mountHsinStage(root);};
 window.addEventListener('pageshow',resumePage);

 async function start(){
  if(started||destroyed||!visible())return;started=true;const attemptId=++generation;
  disposeAttempt();const attempt=new AbortController();let renderer:any,scene:any,orbit:any,resize:ResizeObserver|null=null,body:any,binding:any,model:any,reference:any,presentation:any,faceSkin:any,musicTower:any,dance:any,duetGuest:any=null,duetPreparation:any=null;
  let cleaned=false;const textures=new Set<any>(),geometries=new Set<any>(),materials=new Set<any>(),skeletons=new Set<any>();
  const collect=(object:any)=>object?.traverse((o:any)=>{if(!o.isMesh)return;geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const t of Object.values(m))if((t as any)?.isTexture)textures.add(t);}});
  const releaseCollected=()=>{for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.dispose();t.image?.close?.();}for(const s of skeletons)s.dispose();geometries.clear();materials.clear();textures.clear();skeletons.clear();};
  const clean=()=>{if(cleaned)return;cleaned=true;attempt.abort();loop?.dispose();loop=null;metrics.gap();if(metrics.enabled)delete (window as any).__hsinMetrics;resize?.disconnect();duetPreparation?.dispose();duetPreparation=null;duetGuest?.dispose();duetGuest=null;musicTower?.dispose();orbit?.dispose();dance?.dispose();body?.dispose();presentation?.restore();reference?.restore();binding?.restore();faceSkin?.restore();collect(scene);releaseCollected();renderer?.dispose();renderer?.forceContextLoss();host.replaceChildren();renderer=scene=orbit=model=body=binding=reference=presentation=faceSkin=dance=null;zoom=()=>{};resetCamera=()=>{};ensureDance=()=>{};chooseDuetCamera=()=>{};};
  metrics.mark('stageStart');disposeAttempt=clean;root.dataset.state='loading';status.hidden=false;status.textContent='Preparando Hsin…';errorBox.hidden=true;[near,far,home,pause].forEach(b=>b.disabled=true);
  try{
   // Fail before fetching any asset if this browser cannot create a WebGL2 context. The probe needs no three.js, so it runs first.
   const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
   const context=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false});if(!context)throw Error('WebGL2 unavailable.');
   // Loading is one parallel fan-out: three.js modules, the tiny manifests, then profile + 9.9 MB model + acting data start together
   // (previously the downloads waited for the three.js chunks). Scenery textures start as soon as three is ready, not after the model.
   const cinematic=HSIN_CINEMATIC_IDLE.enabled;
   const threeModules=Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/controls/OrbitControls.js'),import('three/addons/utils/BufferGeometryUtils.js')]);threeModules.catch(()=>{});
   // Private bytes overlap Hsin loading only after the WebGL capability gate; no guest parse/attachment yet.
   const preparation=duetR6?import('./shorekeeper/duet-model-preparation.mjs').then(async ({prepareDuetModel})=>{
    if(cleaned||attempt.signal.aborted||destroyed)return null;
    if(publicAssetSource){
       const {inspectPublicStageManifest,getPublicStageFile}=await import('./shorekeeper/remote-private-model.mjs');
       return duetPreparation=prepareDuetModel({signal:attempt.signal,inspect:inspectPublicStageManifest,fetchFile:getPublicStageFile});
     }
     return duetPreparation=prepareDuetModel({signal:attempt.signal});
   }):Promise.resolve(null);preparation.catch(()=>{});
   const [{default:asset},poseManifest,actingManifest]=await Promise.all([import('../data/hsin-v2-asset.json'),cinematic?import('../data/hsin-v21-pose.json').then(m=>m.default):Promise.resolve(null),cinematic?import('../data/hsin-v201-acting.json').then(m=>m.default):Promise.resolve(null)]);
   if(attempt.signal.aborted||destroyed)return;
   const version='?v='+asset.sha256.slice(0,12);
   const profileUrl=cinematic?HSIN_STAGE.cinematicProfile+'?v='+poseManifest!.profileSha256.slice(0,12):HSIN_STAGE.profile+version;
   // Baked Lip Touch / Hair Caress data (~25 KB compressed). Optional: any failure leaves the approved repertoire exactly as it was.
   const downloads=Promise.all([fetch(profileUrl,{signal:attempt.signal}),fetch(HSIN_STAGE.model+version,{signal:attempt.signal}),actingManifest?fetch(HSIN_STAGE.actingProfile+'?v='+actingManifest.sha256.slice(0,12),{signal:attempt.signal}).then(r=>r.ok?r.json():null).catch(()=>null):Promise.resolve(null)]);downloads.catch(()=>{});
   const [T,{GLTFLoader},{OrbitControls},{mergeGeometries}]=await threeModules;
   if(attempt.signal.aborted||destroyed)return;
   renderer=new T.WebGLRenderer({canvas,context,alpha:false,antialias:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
   renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=false;renderer.setClearColor(HSIN_STAGE.colors.night);host.append(canvas);
   if(metrics.enabled)(window as any).__hsinMetrics={report:()=>({...metrics.report(renderer),music:music.sample(),duet:duetGuest?.loadingMetrics??duetPreparation?.report()??null,duetCinematic:duetGuest?.diagnostics?.()??null,dance:dance?.diagnostics()??null}),raw:metrics};
   // Small, prebuilt scenery textures. Late results after navigation are disposed immediately.
   const textureLoader=new T.TextureLoader();
   const sceneryTexture=async(url:string)=>{const t=await textureLoader.loadAsync(url+'?v=lunar-terrace-r2');if(cleaned||attempt.signal.aborted){t.dispose();throw Error('Scenery load cancelled.');}t.colorSpace=T.SRGBColorSpace;textures.add(t);return t;};
   const scenery=Promise.all([sceneryTexture(LUNAR_TERRACE.sky),sceneryTexture(LUNAR_TERRACE.moon),sceneryTexture(LUNAR_TERRACE.stone),sceneryTexture(LUNAR_TERRACE.atlas),sceneryTexture(LUNAR_TERRACE.water)]);
   // Attach an immediate rejection handler while GLTF parsing is in flight.
   scenery.catch(()=>{});
   const [profileResponse,response,acting]=await downloads;
   if(!profileResponse.ok)throw Error('Stage profile unavailable.');const profile=await profileResponse.json();if(profile.modelSha256!==asset.sha256)throw Error('Stage/profile version mismatch.');
   if(!response.ok)throw Error('Model unavailable.');
   const bytes=await response.arrayBuffer();metrics.mark('modelFetched');const gltf=await new GLTFLoader().parseAsync(bytes,'');metrics.mark('modelParsed');model=gltf.scene;
   if(attempt.signal.aborted||destroyed||attemptId!==generation){collect(model);releaseCollected();if(!cleaned)clean();return;}
   // Adopt the model before awaiting scenery so failure/teardown also releases its GPU resources.
   scene=new T.Scene();scene.matrixWorldAutoUpdate=false;scene.add(model);
   const [skyTexture,moonTexture,stoneTexture,atlasTexture,waterTexture]=await scenery;
   if(attempt.signal.aborted||destroyed||attemptId!==generation)return;
   model.position.y-=profile.bounds.min[1];scene.add(model);scene.updateMatrixWorld(true);
   const meshes:any[]=[];model.traverse((o:any)=>{if(o.isSkinnedMesh)meshes.push(o);});const bones:any[]=[...new Set(meshes.flatMap(m=>m.skeleton.bones))];const byName=new Map(bones.map(b=>[b.name,b])),head:any=byName.get('ORG-Bip001Head');if(!head)throw Error('Head rig missing.');
   reference=createCinematicReference({bones,profile,enabled:cinematic});reference.apply();scene.updateMatrixWorld(true);
   presentation=createLunarPresentation({THREE:T,model,bones,bounds:profile.bounds,cameraAzimuth:HSIN_LUNAR_PRESENTATION.cameraAzimuth});presentation.apply();
   const moonlit=createLunarTerrace({THREE:T,skyTexture,moonTexture,stoneTexture,atlasTexture,waterTexture,feet:presentation.feet(),rootDegrees:presentation.parameters.rootDegrees,duetArena:duetRequested});
   scene.background=moonlit.background;scene.fog=moonlit.fog;scene.add(moonlit.group);
   scene.add(...createStageLights(T).all);
   // Face only: the GLB marks the face unlit, so it ignored every light. Same texture, lit response, reversible; applied before the programs compile.
   faceSkin=createFaceSkin({THREE:T,meshes});faceSkin.apply();
   // Static transforms, including the root yaw, are frozen only after explicit matrix updates.
   scene.traverse((o:any)=>{o.updateMatrix();o.matrixAutoUpdate=false;});scene.updateMatrixWorld(true);
   const camera=new T.PerspectiveCamera(HSIN_STAGE.fov,1,.03,45);
   let fixedDuetMoon:null|{resize:()=>void}=null;
   if(duetRequested){
     const lunar=moonlit.group.getObjectByName('Full moon · sculpted static sphere');
     const halo=moonlit.group.getObjectByName('Moon · restrained atmospheric halo');
     const {attachFixedDuetMoon}=await import('./shorekeeper/duet-fixed-moon.mjs');
     fixedDuetMoon=attachFixedDuetMoon(T,{scene,camera,moon:lunar,halo});
   }
   orbit=new OrbitControls(camera,canvas);orbit.enablePan=duetRequested;orbit.zoomToCursor=duetRequested;orbit.enableDamping=true;orbit.dampingFactor=HSIN_STAGE.damping;orbit.rotateSpeed=HSIN_STAGE.rotateSpeed;orbit.zoomSpeed=HSIN_STAGE.zoomSpeed;orbit.minDistance=HSIN_STAGE.minDistance;orbit.minPolarAngle=HSIN_STAGE.minPolar;orbit.maxPolarAngle=HSIN_STAGE.maxPolar;orbit.minAzimuthAngle=-HSIN_STAGE.maxAzimuth;orbit.maxAzimuthAngle=HSIN_STAGE.maxAzimuth;
   const musicElement=root.querySelector<HTMLElement>('[data-music-tower]');
   if(musicElement){musicTower=createMusicTower({THREE:T,mergeGeometries,element:musicElement,host,bones,model,bounds:profile.bounds,moon:moonlit.group.getObjectByName('Full moon · sculpted static sphere'),metrics,duetMode:duetRequested});scene.add(musicTower.group);} // Reuse the same 3D pavilion; in duo it floats above the performers while the native player remains in its own side region.
   root.addEventListener('hsin:tower-layout',()=>{musicTower?.invalidateLayout();loop?.invalidate();},{signal:attempt.signal});
   let initialDistance=3.5,worldDirty=true,firstFit=true,initialTarget=[0,HSIN_STAGE.baseTargetY,0];

   // One camera; per-character logical camera modes, reserved slots for the next actors.
   let lastFollow:any=null,focusShift:any=null;
   const actorAnchor=(mode:string)=>{
     const point=new T.Vector3();
     if(mode==='hsin'){head.getWorldPosition(point);point.y-=.44;return point;}
     if(mode==='shorekeeper'&&duetGuest?.ready){
       const pelvis=duetGuest.group.getObjectByName('Bip001Pelvis');
       if(pelvis)pelvis.getWorldPosition(point);
       else{duetGuest.group.getWorldPosition(point);point.y+=.78;}
       return point;
     }
     return null;
   };
   const animateFocus=(point:any)=>{
     if(!point||!orbit.enabled)return;
     focusShift={start:performance.now(),duration:500,from:orbit.target.clone(),to:point.clone(),last:orbit.target.clone()};
     lastFollow=null;loop?.invalidate();
   };
   const followCameraTarget=()=>{
     if(!duetRequested)return false;
     if(!orbit.enabled){lastFollow=null;focusShift=null;return false;}
     if(focusShift){
       const u=Math.min(1,(performance.now()-focusShift.start)/focusShift.duration),s=u*u*(3-2*u);
       const next=focusShift.from.clone().lerp(focusShift.to,s),delta=next.clone().sub(focusShift.last);
       focusShift.last.copy(next);camera.position.add(delta);orbit.target.add(delta);
       if(u>=1)focusShift=null;
       return true;
     }
     if(cameraMode!=='hsin'&&cameraMode!=='shorekeeper'){lastFollow=null;return false;}
     const target=actorAnchor(cameraMode);if(!target)return false;
     if(!lastFollow){lastFollow=target;return false;}
     const delta=target.clone().sub(lastFollow);lastFollow.copy(target);
     if(delta.lengthSq()<1e-12)return false;
     camera.position.add(delta);orbit.target.add(delta);return true;
   };
   chooseDuetCamera=(mode:string)=>{
     if(!duetRequested||!['auto','free','hsin','shorekeeper'].includes(mode))return;
     if(mode==='shorekeeper'&&!duetGuest?.ready)return;
     cameraMode=mode;if(cameraChoice)cameraChoice.value=mode;
     lastFollow=null;focusShift=null;
     duetGuest?.setCameraPreference?.(mode);
     if(orbit.enabled){
       if(mode==='hsin'||mode==='shorekeeper')animateFocus(actorAnchor(mode));
       else if(mode==='auto')animateFocus(new T.Vector3(...initialTarget));
     }
     loop?.invalidate();
   };
   const releaseShotForGesture=()=>{
     if(!duetRequested||orbit.enabled)return;
     cameraMode='free';if(cameraChoice)cameraChoice.value='free';
     lastFollow=null;focusShift=null;
     duetGuest?.setCameraPreference?.('free');
     orbit.enabled=true;loop?.invalidate();
   };
   if(duetRequested){
     canvas.addEventListener('wheel',releaseShotForGesture,{capture:true,passive:true,signal:attempt.signal});
     canvas.addEventListener('pointerdown',releaseShotForGesture,{capture:true,passive:true,signal:attempt.signal});
   }

   let duetEnvelope:null|{width:number;height:number;depth:number;center:[number,number,number]}=null;
   const fit=()=>{
    musicTower?.invalidateLayout();const rect=host.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);camera.aspect=w/h;camera.updateProjectionMatrix();fixedDuetMoon?.resize();renderer.setPixelRatio(pixelRatio(w,h,devicePixelRatio||1,touch));renderer.setSize(w,h,false);root.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);
    const previousFit=initialDistance;const framing=lunarCameraFit(camera.aspect);initialDistance=framing.distance*(duetRequested?1.27:1);initialTarget=duetRequested?[framing.target[0]+.30,framing.target[1],framing.target[2]]:framing.target;
    if(duetEnvelope){
     const required=duetFitDistance({...duetEnvelope,aspect:camera.aspect,fov:camera.fov,azimuth:HSIN_LUNAR_PRESENTATION.cameraAzimuth*Math.PI/180});
     initialDistance=Math.max(initialDistance,required);initialTarget=[...duetEnvelope.center];
    }
    orbit.maxDistance=Math.max(5.5,initialDistance*1.55);if(firstFit){firstFit=false;resetCamera();}else{const d=camera.position.distanceTo(orbit.target),next=Math.max(orbit.minDistance,Math.min(orbit.maxDistance,d*initialDistance/previousFit));const offset=camera.position.clone().sub(orbit.target).multiplyScalar(next/d);if(duetRequested&&duetEnvelope&&cameraMode==='auto')orbit.target.fromArray(initialTarget);camera.position.copy(orbit.target).add(offset);orbit.update();}loop?.invalidate();
   };
   resetCamera=()=>{if(duetRequested&&cameraMode!=='auto')chooseDuetCamera('auto');const azimuth=HSIN_LUNAR_PRESENTATION.cameraAzimuth*Math.PI/180;orbit.target.fromArray(initialTarget);camera.position.set(orbit.target.x+Math.sin(azimuth)*initialDistance,orbit.target.y+.23,orbit.target.z+Math.cos(azimuth)*initialDistance);orbit.update();loop?.invalidate();};
   zoom=(factor:number)=>{const current=camera.position.distanceTo(orbit.target),distance=Math.max(orbit.minDistance,Math.min(orbit.maxDistance,current*factor));camera.position.sub(orbit.target).multiplyScalar(distance/current).add(orbit.target);orbit.update();loop?.invalidate();};
   orbit.addEventListener('change',()=>{
    if(!duetRequested){const height=attentionHeight(camera.position.distanceTo(orbit.target),initialDistance)+HSIN_LUNAR_PRESENTATION.cameraTargetOffset[1],delta=height-orbit.target.y;if(Math.abs(delta)>1e-6){orbit.target.y=height;camera.position.y+=delta;}}moonlit.frameSky(camera,orbit.target);worldDirty=true;loop?.invalidate();
   });
   fit();resize=new ResizeObserver(fit);resize.observe(host);
   const seed=crypto.getRandomValues(new Uint32Array(1))[0],face=createFacialActing({seed,pass:'auto-b1',autonomous:true,intensity:.75,morphLimits:profile.limits,gazeAxes:profile.gazeAxes});
   binding=createFaceBinding(meshes,snapshotFace(meshes),profile.calibration,{limits:profile.limits});
   const signature=createPoseTransition({pose:createBakedPose({THREE:T,data:profile.poses.signature,bones})}),chest=createChestDirector({pose:createBakedChest({THREE:T,profile:profile.poses,bones}),seed:seed^0x51c7,organic:true,onEvent:face.signal}),hair=createChestDirector({pose:createBakedPose({THREE:T,data:profile.poses.hair,bones}),seed:seed^0x32b1,organic:true,onEvent:face.signal});
   // Lip Touch (right) and the refined Hair Caress (left) are enabled only when the acting data matches this exact model and profile and every bone is present.
   const actingValid=!!acting&&!!poseManifest&&acting.modelSha256===asset.sha256&&acting.profileSha256===poseManifest.profileSha256;
   const lipPose=actingValid&&acting.poses?.lipTouch?createBakedPose({THREE:T,data:acting.poses.lipTouch,bones}):null,caressPose=actingValid&&acting.poses?.hairCaress?createBakedPose({THREE:T,data:acting.poses.hairCaress,bones}):null;
   const caress=caressPose?.diagnostics().ready?createHairCaress({pose:caressPose,data:acting.poses.hairCaress,seed:seed^0x7a11,onEvent:face.signal}):null;
   const lipHair=caress&&lipPose?.diagnostics().ready?createLipHairComposition({lip:lipPose,lipData:acting.poses.lipTouch,hair:caress,seed:seed^0x1b9d,onEvent:face.signal}):null;
   const spine:any=byName.get('ORG-Bip001Spine2');body=createBodyRepertoire({seed:seed^0xb041,signature,chest,hair:caress??hair,lipHair,breath:createRestBreath({THREE:T,bone:spine,update:()=>spine?.updateMatrix()}),capabilities:()=>({signature:!!profile.poses.signature,chest:!!profile.poses.chest,composition:!!profile.poses.composition,hair:!!(caress??profile.poses.hair),lipHair:!!lipHair})});
   // Choreography is lazy: no download, parsing or dance buffers in the normal silent experience.
   let danceLoading=false;
   ensureDance=()=>{
    if(dance||danceLoading||paused||motion.matches||!visible()||!dancePlaybackEligible(music.sample()))return;danceLoading=true;
    (async()=>{try{
     const {default:manifest}=await import('../data/hsin-dance.json');metrics.mark('danceLoadStart');
     const r=await fetch(manifest.url+'?v='+manifest.sha256.slice(0,12),{signal:attempt.signal});if(!r.ok)return;
     const text=await r.text(),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
     if(Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')!==manifest.sha256)return;
     const data=decodeDanceData(JSON.parse(text));if(attempt.signal.aborted||destroyed||attemptId!==generation)return;
     if(data.modelSha256!==asset.sha256||data.profileSha256!==poseManifest?.profileSha256)return;
     const dancePose=createDancePose({THREE:T,data,bones,model,metrics});
     if(dancePose.ready){
      dance=createDanceDirector({idle:body,pose:dancePose,music,transport:createMusicTransport({maps:musicMaps}),seed:seed^0xdac3,onEvent:face.signal,reducedMotion:()=>motion.matches});metrics.mark('danceReady');
      // Moon Fox Reverie (R3): a second, optional asset, fetched at idle after the R2 dance is already running. Failure leaves R2 exactly as it was.
      const director=dance,later=(fn:()=>void)=>'requestIdleCallback' in window?(window as any).requestIdleCallback(fn,{timeout:5000}):setTimeout(fn,1500);
      later(()=>{loadReverie(director).catch(()=>{});});
     }
    }catch{ /* Optional data failure preserves the approved repertoire. */ }})();
   };
   const loadReverie=async(director:any)=>{
    const settings=reverieSettings();if(!settings.enabled||attempt.signal.aborted||destroyed)return;
    const [{default:m},{createReveriePose,decodeReverieData}]=await Promise.all([import('../data/hsin-dance-r3.json'),import('./hsin-dance-reverie.mjs')]);
    if(m.modelSha256!==asset.sha256||m.profileSha256!==poseManifest?.profileSha256)return;
    const fetchPose=async(entry:any)=>{
     if(!entry)return null;const r=await fetch(entry.url+'?v='+entry.sha256.slice(0,12),{signal:attempt.signal});if(!r.ok)return null;
     const text=await r.text(),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
     if(Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')!==entry.sha256)return null;
     const data=decodeReverieData(JSON.parse(text));if(data.modelSha256!==asset.sha256||data.profileSha256!==poseManifest?.profileSha256)return null;
     const pose=createReveriePose({THREE:T,data,bones,model,metrics});return pose.ready?pose:null;
    };
    const [conservative,dramatic]=await Promise.all([fetchPose((m as any).conservative),settings.dramaticEnabled?fetchPose((m as any).dramatic):Promise.resolve(null)]);
    if(!conservative&&!dramatic)return;if(attempt.signal.aborted||destroyed||dance!==director)return;
    director.setSpecial({conservative,dramatic});metrics.mark('reverieReady');
   };
   const unsubscribeMusic=music.subscribe(ensureDance);attempt.signal.addEventListener('abort',unsubscribeMusic,{once:true});ensureDance();
   // Reusable vectors. Pointer projection runs only on input, not in the animation hot path.
   const ray=new T.Raycaster(),plane=new T.Plane(),normal=new T.Vector3(),center=new T.Vector3(),hit=new T.Vector3(),inverse=new T.Matrix4(),ndc=new T.Vector2(),localCenter=new T.Vector3(...profile.calibration.focusCenter);
   const horizontal=new T.Vector3(...profile.gazeAxes.horizontal),vertical=new T.Vector3(...profile.gazeAxes.vertical),gaze=[0,0,0];let attending=false,touchUntil=0;
   const input=(event:PointerEvent)=>{
    if(event.pointerType==='touch'&&event.type!=='pointerdown')return;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    ndc.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);camera.updateMatrixWorld();head.updateWorldMatrix(true,false);center.copy(localCenter);head.localToWorld(center);camera.getWorldDirection(normal);plane.setFromNormalAndCoplanarPoint(normal,center);ray.setFromCamera(ndc,camera);
    if(!ray.ray.intersectPlane(plane,hit))return;inverse.copy(head.matrixWorld).invert();hit.applyMatrix4(inverse).sub(localCenter).divideScalar(profile.calibration.radius).clampLength(0,1);const h=hit.dot(horizontal),v=hit.dot(vertical);hit.copy(horizontal).multiplyScalar(h).addScaledVector(vertical,v).clampLength(0,1);gaze[0]=hit.x;gaze[1]=hit.y;gaze[2]=hit.z;attending=true;touchUntil=event.pointerType==='touch'?face.sample().clock+4.2:Infinity;loop?.invalidate();
   };
   canvas.addEventListener('pointermove',input,{passive:true,signal:attempt.signal});canvas.addEventListener('pointerdown',input,{passive:true,signal:attempt.signal});canvas.addEventListener('pointerleave',(event:PointerEvent)=>{if(event.pointerType!=='touch'){attending=false;face.clearAttention();}},{passive:true,signal:attempt.signal});
   canvas.addEventListener('webglcontextlost',(event:Event)=>{event.preventDefault();lost=true;duetGuest?.interrupt?.();metrics.count('contextLost');metrics.gap();loop?.setVisible(false);root.dataset.state='recovering';status.hidden=false;status.textContent='Aguardando a cena…';},{signal:attempt.signal});
   canvas.addEventListener('webglcontextrestored',()=>{lost=false;metrics.count('contextRestored');metrics.gap();root.dataset.state='ready';status.hidden=true;loop?.setVisible(visible());},{signal:attempt.signal});
   loop=createStageLoop({requestFrame:requestAnimationFrame,cancelFrame:cancelAnimationFrame,fps:HSIN_STAGE.fps,active:()=>!paused&&!motion.matches,
    controlsUpdate:()=>{const following=followCameraTarget();const changed=orbit.update();const moving=musicTower?.update(camera,orbit.target,motion.matches,!paused&&!motion.matches);return following||changed||moving;},
    step:(dt:number)=>{const t0=metrics.now();if(attending&&face.sample().clock<=touchUntil)face.attention(gaze,1.3);else if(attending){attending=false;face.clearAttention();}const state=face.advance(dt);binding.apply(state);const context=face.diagnostics().expressions?.context;if(dance){const d0=metrics.now();dance.advance(dt,{context});if(metrics.enabled)metrics.sample('danceDirector',metrics.now()-d0);}else body.advance(dt,{enabled:true,context});if(duetGuest?.ready)duetGuest.advance(dt,{paused,reducedMotion:motion.matches,music:music.sample()});worldDirty=true;if(metrics.enabled)metrics.sample('acting',metrics.now()-t0);},
    draw:()=>{const t0=metrics.now();if(worldDirty){scene.updateMatrixWorld();worldDirty=false;}if(metrics.enabled)metrics.sample('sceneUpdate',metrics.now()-t0);const t1=metrics.now();renderer.render(scene,camera);if(duetGuest?.ready){duetGuest.markRendered?.();metrics.mark('firstDuetFrame');}if(metrics.enabled){metrics.sample('render',metrics.now()-t1);metrics.frame();}},
   });
   loop.setVisible(false);
   await renderer.compileAsync(scene,camera);metrics.mark('compiled');if(attempt.signal.aborted||destroyed||attemptId!==generation){clean();return;}
   root.dataset.state='ready';root.dataset.modelBytes=String(asset.bytes);status.hidden=true;[near,far,home].forEach(b=>b.disabled=false);showPause();loop.setVisible(visible());loop.invalidate();
    if(duetRequested){
      if(duetStatus)duetStatus.textContent=privatePreview?'Preparando Shorekeeper na prévia autenticada…':publicRelease?'Preparando Shorekeeper…':'Shorekeeper: verifying private Cloudflare Access and R2 assets…';
      // Add the guest to the EXISTING scene. Never construct a second canvas,
      // renderer, requestAnimationFrame owner or a public GLB URL.
      void import('./shorekeeper/s6-duet-guest.mjs').then(async ({loadS6DuetGuest})=>{
        if(cleaned||attempt.signal.aborted||destroyed)return;
        const prepared=await preparation;
        if(cleaned||attempt.signal.aborted||destroyed)return;
        const guest=await loadS6DuetGuest(T,scene,{signal:attempt.signal,experimentalR6:duetR6,preparation:prepared,hostModel:model,camera,lowPower:touch,traceEnabled:metrics.enabled,releaseSource:publicAssetSource?'public':'private',
          exclusionRects:()=>{const a=musicElement?.getBoundingClientRect(),b=host.getBoundingClientRect();if(!a||!b.width||!b.height)return [];return [{left:2*(a.left-b.left)/b.width-1,right:2*(a.right-b.left)/b.width-1,top:1-2*(a.top-b.top)/b.height,bottom:1-2*(a.bottom-b.top)/b.height}];},
          onStatus:(s:string)=>{if(duetStatus&&s==='G113_SOURCE_OR_VFX_UNAVAILABLE')duetStatus.textContent=publicRelease?'A sequência musical não está disponível neste momento.':'G11.3 indisponível: falha ao verificar as bibliotecas privadas ou preparar a apresentação. Consulte os diagnósticos; nenhuma coreografia alternativa foi iniciada.';},
          cameraStage:{scene,camera,orbit,canvas,
            cameraConfig:()=>({position:camera.position.toArray(),target:orbit.target.toArray(),fov:camera.fov,minDistance:orbit.minDistance,maxDistance:orbit.maxDistance}),
            restoreCamera:(c:any)=>{camera.position.fromArray(c.position);orbit.target.fromArray(c.target);camera.fov=c.fov;camera.updateProjectionMatrix();orbit.minDistance=c.minDistance??orbit.minDistance;orbit.maxDistance=c.maxDistance??orbit.maxDistance;orbit.update();camera.updateMatrixWorld(true);fixedDuetMoon?.resize();}
          }});
        if(cleaned||attempt.signal.aborted||destroyed||attemptId!==generation){guest?.dispose();return;}
        duetGuest=guest;
        if(guest?.ready){const skOption=cameraChoice?.querySelector<HTMLOptionElement>('option[value="shorekeeper"]');if(skOption)skOption.disabled=false;guest.setCameraPreference?.(cameraMode);}
        if(duetStatus)duetStatus.textContent=privatePreview
          ?(guest?.ready?'Hsin e Shorekeeper · prévia autenticada pronta.':'Shorekeeper indisponível: verifique a sessão autorizada, o manifesto e a configuração do ambiente protegido.')
          :publicRelease
          ?(guest?.ready?'Hsin e Shorekeeper · apresentação pronta.':'A Shorekeeper não pôde ser carregada. A Hsin permanece disponível.')
          :(guest?.ready
           ?duetR6?'Hsin & Shorekeeper · ciclo cinematográfico G11.3 durante reprodução confirmada, idles e expressões S6 aleatórias no silêncio. R5 anatômico ativo.':'Hsin & Shorekeeper · G11.3/S5 em reprodução confirmada; idles e expressões S6 variadas no silêncio. Fontes de combate autenticadas necessárias.'
           :guest?.status==='AUTHENTICATION_REQUIRED'
             ?'Hsin ready. Shorekeeper requires your Cloudflare Access session; no private files are publicly exposed.'
             :guest?.status==='PRIVATE_ASSETS_MISSING'
               ?'Hsin ready. The protected asset service is unavailable; this does not establish that models are absent.'
               : 'Hsin ready. Shorekeeper private assets are missing, incomplete or failed verification.');
        if(guest?.ready){
          metrics.mark('duetAttached');
          // Space the actual skinned silhouettes, not fixed pivots; fit both on resize and reset.
          const hsinBounds=currentDuetBounds(T,model),skBounds=currentDuetBounds(T,guest.group);
          // Conservative motion reserve; bounds are measured once, not recomputed over all vertices every frame.
          hsinBounds.expandByScalar(hsinBounds.getSize(new T.Vector3()).y*.18);
          skBounds.expandByScalar(skBounds.getSize(new T.Vector3()).y*.36);
          const minimumGap=.52,overlap=hsinBounds.max.x+minimumGap-skBounds.min.x;
          if(Number.isFinite(overlap)&&overlap>0){guest.group.position.x+=overlap;skBounds.translate(new T.Vector3(overlap,0,0));}
          guest.group.updateMatrixWorld(true);
          const combined=hsinBounds.union(skBounds);
          const middle=combined.getCenter(new T.Vector3()),extent=combined.getSize(new T.Vector3());
          if([middle.x,middle.y,middle.z,extent.x,extent.y].every(Number.isFinite)){
            duetEnvelope={width:extent.x,height:extent.y,depth:extent.z,center:[middle.x,middle.y,middle.z]};
            fit();if(cameraMode==='auto')resetCamera();else chooseDuetCamera(cameraMode);
          }
          // Read the EXISTING provider-verified playback contract; no iframe scraping, audio analysis or fake beat times.
          const updateDuetMusicStatus=(sample:ReturnType<typeof music.sample>)=>{
            duetGuest?.observeMusic?.(sample);
            if(cleaned||!duetGuest?.ready||!duetStatus)return;
            if(sample.status==='playing'&&sample.playbackConfirmed){
              duetStatus.textContent='Shorekeeper · ciclo cinematográfico G11.3/S5 com '+(sample.provider==='spotify'?'Spotify':'YouTube')+(publicRelease?' confirmado.':' confirmado (bibliotecas privadas obrigatórias).');
            }else if(sample.status==='paused')duetStatus.textContent='Música pausada · apresentação G11.3 interrompida; retorno à contemplação.';
            else if(sample.status==='buffering')duetStatus.textContent='Aguardando reprodução confirmada · contemplação da Shorekeeper.';
            else duetStatus.textContent='Sem música · contemplação, idles e expressões S6 aleatórios.';
          };
          const musicUnsubscribe=music.subscribe(updateDuetMusicStatus);
          attempt.signal.addEventListener('abort',musicUnsubscribe,{once:true});
          updateDuetMusicStatus(music.sample());
          if(duetR6&&duetControls){
            const status=duetControls.querySelector<HTMLElement>('[data-duo-r6-status]');
            const faceButtons=[...duetControls.querySelectorAll<HTMLButtonElement>('[data-duo-face]')];
            const blink=duetControls.querySelector<HTMLButtonElement>('[data-duo-r6-blink]');
            const neutral=duetControls.querySelector<HTMLButtonElement>('[data-duo-r6-neutral]');
            for(const item of [...faceButtons,blink,neutral])if(item)item.disabled=false;
            const act=(action:()=>boolean,label:string,button?:HTMLButtonElement)=>{
              if(!visible()||paused||motion.matches||!duetGuest?.ready||cleaned||attempt.signal.aborted)return;
              const ok=action();
              if(status)status.textContent=ok?(publicRelease?label+' · expressão aplicada.':label+' · manual; R5/R6 permanecem em QA visual.'):'Expressão indisponível para o modelo verificado.';
              if(ok){
                for(const item of faceButtons)item.setAttribute('aria-pressed',String(item===button));
                worldDirty=true;loop?.invalidate();
              }
            };
            for(const button of faceButtons)button.addEventListener('click',
              ()=>act(()=>!!duetGuest?.playFaceSelection?.(button.dataset.duoFace??''),button.textContent?.trim()??'Expressão',button),
              {signal:attempt.signal});
            blink?.addEventListener('click',()=>act(()=>!!duetGuest?.blinkR6?.(),'Piscada bilateral'),{signal:attempt.signal});
            neutral?.addEventListener('click',()=>act(()=>!!duetGuest?.neutralR6?.(),'Repouso facial'),{signal:attempt.signal});
            if(status)status.textContent=publicRelease?'Expressões da Shorekeeper · seleção manual e atuação espontânea.':'Painel manual R5/R6 · 25 estados preservados; o repertório S6 silencioso varia automaticamente. G7 NO_GO.';
          }
          // Attach the second performer only to the explicitly enabled duet routes.
          // Hsin's normal public route and autonomous system are unchanged.
          scene.updateMatrixWorld(true);worldDirty=true;loop?.invalidate();
        }
      }).catch(()=>{
        if(!cleaned&&duetStatus)duetStatus.textContent=publicRelease?'A Shorekeeper não pôde ser carregada. A Hsin permanece disponível.':'Hsin ready. Shorekeeper private guest could not be initialized safely.';
      });
    }
  }catch(error){
   if(attempt.signal.aborted||destroyed||attemptId!==generation)return;console.error('Hsin stage failed',error);clean();started=false;lost=false;root.dataset.state='error';status.hidden=true;errorBox.hidden=false;[near,far,home,pause].forEach(b=>b.disabled=true);
  }
 }
 return {dispose:teardown};
}
