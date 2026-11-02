import {musicForStage} from './hsin-music-state.mjs';
import {createMusicTransport} from './hsin-music-transport.mjs';
import {createDanceDirector} from './hsin-dance-director.mjs';
import {createDancePose} from './hsin-dance-pose.mjs';
import {decodeDanceData} from './hsin-dance-data.mjs';
import {dancePlaybackEligible} from './hsin-dance-config.mjs';
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
 const music=musicForStage(root);
 const metrics=createStageMetrics({enabled:metricsRequested(location.search)});
 const life=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)'),touch=matchMedia('(pointer: coarse)').matches;
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
  disposeAttempt();const attempt=new AbortController();let renderer:any,scene:any,orbit:any,resize:ResizeObserver|null=null,body:any,binding:any,model:any,reference:any,presentation:any,faceSkin:any,musicTower:any,dance:any;
  let cleaned=false;const textures=new Set<any>(),geometries=new Set<any>(),materials=new Set<any>(),skeletons=new Set<any>();
  const collect=(object:any)=>object?.traverse((o:any)=>{if(!o.isMesh)return;geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const t of Object.values(m))if((t as any)?.isTexture)textures.add(t);}});
  const releaseCollected=()=>{for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.dispose();t.image?.close?.();}for(const s of skeletons)s.dispose();geometries.clear();materials.clear();textures.clear();skeletons.clear();};
  const clean=()=>{if(cleaned)return;cleaned=true;attempt.abort();loop?.dispose();loop=null;metrics.gap();if(metrics.enabled)delete (window as any).__hsinMetrics;resize?.disconnect();musicTower?.dispose();orbit?.dispose();dance?.dispose();body?.dispose();presentation?.restore();reference?.restore();binding?.restore();faceSkin?.restore();collect(scene);releaseCollected();renderer?.dispose();renderer?.forceContextLoss();host.replaceChildren();renderer=scene=orbit=model=body=binding=reference=presentation=faceSkin=dance=null;zoom=()=>{};resetCamera=()=>{};ensureDance=()=>{};};
  metrics.mark('stageStart');disposeAttempt=clean;root.dataset.state='loading';status.hidden=false;status.textContent='Preparando Hsin…';errorBox.hidden=true;[near,far,home,pause].forEach(b=>b.disabled=true);
  try{
   const [T,{GLTFLoader},{OrbitControls},{mergeGeometries}]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/controls/OrbitControls.js'),import('three/addons/utils/BufferGeometryUtils.js')]);
   if(attempt.signal.aborted||destroyed)return;
   const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
   // Fail before fetching the asset if this browser cannot create a WebGL2 context.
   const context=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false});if(!context)throw Error('WebGL2 unavailable.');
   renderer=new T.WebGLRenderer({canvas,context,alpha:false,antialias:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
   renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=false;renderer.setClearColor(HSIN_STAGE.colors.night);host.append(canvas);
   if(metrics.enabled)(window as any).__hsinMetrics={report:()=>({...metrics.report(renderer),music:music.sample(),dance:dance?.diagnostics()??null}),raw:metrics};
   const {default:asset}=await import('../data/hsin-v2-asset.json');
   const version='?v='+asset.sha256.slice(0,12);
   const cinematic=HSIN_CINEMATIC_IDLE.enabled,poseManifest=cinematic?(await import('../data/hsin-v21-pose.json')).default:null;
   const profileUrl=cinematic?HSIN_STAGE.cinematicProfile+'?v='+poseManifest!.profileSha256.slice(0,12):HSIN_STAGE.profile+version;
   // Baked Lip Touch / Hair Caress data (~25 KB compressed). Optional: any failure leaves the approved repertoire exactly as it was.
   const actingManifest=cinematic?(await import('../data/hsin-v201-acting.json')).default:null;
   const [profileResponse,response,acting]=await Promise.all([fetch(profileUrl,{signal:attempt.signal}),fetch(HSIN_STAGE.model+version,{signal:attempt.signal}),actingManifest?fetch(HSIN_STAGE.actingProfile+'?v='+actingManifest.sha256.slice(0,12),{signal:attempt.signal}).then(r=>r.ok?r.json():null).catch(()=>null):Promise.resolve(null)]);
   if(!profileResponse.ok)throw Error('Stage profile unavailable.');const profile=await profileResponse.json();if(profile.modelSha256!==asset.sha256)throw Error('Stage/profile version mismatch.');
   if(!response.ok)throw Error('Model unavailable.');
   // Small, prebuilt scenery textures. Late results after navigation are disposed immediately.
   const textureLoader=new T.TextureLoader();
   const sceneryTexture=async(url:string)=>{const t=await textureLoader.loadAsync(url+'?v=lunar-terrace-r2');if(cleaned||attempt.signal.aborted){t.dispose();throw Error('Scenery load cancelled.');}t.colorSpace=T.SRGBColorSpace;textures.add(t);return t;};
   const scenery=Promise.all([sceneryTexture(LUNAR_TERRACE.sky),sceneryTexture(LUNAR_TERRACE.moon),sceneryTexture(LUNAR_TERRACE.stone),sceneryTexture(LUNAR_TERRACE.atlas),sceneryTexture(LUNAR_TERRACE.water)]);
   // Attach an immediate rejection handler while GLTF parsing is in flight.
   scenery.catch(()=>{});
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
   const moonlit=createLunarTerrace({THREE:T,skyTexture,moonTexture,stoneTexture,atlasTexture,waterTexture,feet:presentation.feet(),rootDegrees:presentation.parameters.rootDegrees});scene.background=moonlit.background;scene.fog=moonlit.fog;scene.add(moonlit.group);
   scene.add(...createStageLights(T).all);
   // Face only: the GLB marks the face unlit, so it ignored every light. Same texture, lit response, reversible; applied before the programs compile.
   faceSkin=createFaceSkin({THREE:T,meshes});faceSkin.apply();
   // Static transforms, including the root yaw, are frozen only after explicit matrix updates.
   scene.traverse((o:any)=>{o.updateMatrix();o.matrixAutoUpdate=false;});scene.updateMatrixWorld(true);
   const camera=new T.PerspectiveCamera(HSIN_STAGE.fov,1,.03,45);orbit=new OrbitControls(camera,canvas);orbit.enablePan=false;orbit.enableDamping=true;orbit.dampingFactor=HSIN_STAGE.damping;orbit.rotateSpeed=HSIN_STAGE.rotateSpeed;orbit.zoomSpeed=HSIN_STAGE.zoomSpeed;orbit.minDistance=HSIN_STAGE.minDistance;orbit.minPolarAngle=HSIN_STAGE.minPolar;orbit.maxPolarAngle=HSIN_STAGE.maxPolar;orbit.minAzimuthAngle=-HSIN_STAGE.maxAzimuth;orbit.maxAzimuthAngle=HSIN_STAGE.maxAzimuth;
   const musicElement=root.querySelector<HTMLElement>('[data-music-tower]');
   if(musicElement){musicTower=createMusicTower({THREE:T,mergeGeometries,element:musicElement,host,bones,moon:moonlit.group.getObjectByName('Full moon · sculpted static sphere'),metrics});scene.add(musicTower.group);}
   root.addEventListener('hsin:tower-layout',()=>{musicTower?.invalidateLayout();loop?.invalidate();},{signal:attempt.signal});
   let initialDistance=3.5,worldDirty=true,firstFit=true,initialTarget=[0,HSIN_STAGE.baseTargetY,0];const fit=()=>{
    musicTower?.invalidateLayout();const rect=host.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setPixelRatio(pixelRatio(w,h,devicePixelRatio||1,touch));renderer.setSize(w,h,false);root.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);
    const previousFit=initialDistance;const framing=lunarCameraFit(camera.aspect);initialDistance=framing.distance;initialTarget=framing.target;orbit.maxDistance=Math.max(5.5,initialDistance*1.55);if(firstFit){firstFit=false;resetCamera();}else{const d=camera.position.distanceTo(orbit.target),next=Math.max(orbit.minDistance,Math.min(orbit.maxDistance,d*initialDistance/previousFit));camera.position.sub(orbit.target).multiplyScalar(next/d).add(orbit.target);orbit.update();}loop?.invalidate();
   };
   resetCamera=()=>{const azimuth=HSIN_LUNAR_PRESENTATION.cameraAzimuth*Math.PI/180;orbit.target.fromArray(initialTarget);camera.position.set(orbit.target.x+Math.sin(azimuth)*initialDistance,orbit.target.y+.23,orbit.target.z+Math.cos(azimuth)*initialDistance);orbit.update();loop?.invalidate();};
   zoom=(factor:number)=>{const current=camera.position.distanceTo(orbit.target),distance=Math.max(orbit.minDistance,Math.min(orbit.maxDistance,current*factor));camera.position.sub(orbit.target).multiplyScalar(distance/current).add(orbit.target);orbit.update();loop?.invalidate();};
   orbit.addEventListener('change',()=>{
    const height=attentionHeight(camera.position.distanceTo(orbit.target),initialDistance)+HSIN_LUNAR_PRESENTATION.cameraTargetOffset[1],delta=height-orbit.target.y;if(Math.abs(delta)>1e-6){orbit.target.y=height;camera.position.y+=delta;}moonlit.frameSky(camera,orbit.target);worldDirty=true;loop?.invalidate();
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
     if(dancePose.ready){dance=createDanceDirector({idle:body,pose:dancePose,music,transport:createMusicTransport({maps:musicMaps}),seed:seed^0xdac3,onEvent:face.signal});metrics.mark('danceReady');}
    }catch{ /* Optional data failure preserves the approved repertoire. */ }})();
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
   canvas.addEventListener('webglcontextlost',(event:Event)=>{event.preventDefault();lost=true;metrics.count('contextLost');metrics.gap();loop?.setVisible(false);root.dataset.state='recovering';status.hidden=false;status.textContent='Aguardando a cena…';},{signal:attempt.signal});
   canvas.addEventListener('webglcontextrestored',()=>{lost=false;metrics.count('contextRestored');metrics.gap();root.dataset.state='ready';status.hidden=true;loop?.setVisible(visible());},{signal:attempt.signal});
   loop=createStageLoop({requestFrame:requestAnimationFrame,cancelFrame:cancelAnimationFrame,fps:HSIN_STAGE.fps,active:()=>!paused&&!motion.matches,
    controlsUpdate:()=>{const changed=orbit.update();const moving=musicTower?.update(camera,orbit.target,motion.matches,!paused&&!motion.matches);return changed||moving;},
    step:(dt:number)=>{const t0=metrics.now();if(attending&&face.sample().clock<=touchUntil)face.attention(gaze,1.3);else if(attending){attending=false;face.clearAttention();}const state=face.advance(dt);binding.apply(state);const context=face.diagnostics().expressions?.context;if(dance){const d0=metrics.now();dance.advance(dt,{context});if(metrics.enabled)metrics.sample('danceDirector',metrics.now()-d0);}else body.advance(dt,{enabled:true,context});worldDirty=true;if(metrics.enabled)metrics.sample('acting',metrics.now()-t0);},
    draw:()=>{const t0=metrics.now();if(worldDirty){scene.updateMatrixWorld();worldDirty=false;}if(metrics.enabled)metrics.sample('sceneUpdate',metrics.now()-t0);const t1=metrics.now();renderer.render(scene,camera);if(metrics.enabled){metrics.sample('render',metrics.now()-t1);metrics.frame();}},
   });
   loop.setVisible(false);
   await renderer.compileAsync(scene,camera);metrics.mark('compiled');if(attempt.signal.aborted||destroyed||attemptId!==generation){clean();return;}
   root.dataset.state='ready';root.dataset.modelBytes=String(asset.bytes);status.hidden=true;[near,far,home].forEach(b=>b.disabled=false);showPause();loop.setVisible(visible());loop.invalidate();
  }catch(error){
   if(attempt.signal.aborted||destroyed||attemptId!==generation)return;console.error('Hsin stage failed',error);clean();started=false;lost=false;root.dataset.state='error';status.hidden=true;errorBox.hidden=false;[near,far,home,pause].forEach(b=>b.disabled=true);
  }
 }
 return {dispose:teardown};
}
