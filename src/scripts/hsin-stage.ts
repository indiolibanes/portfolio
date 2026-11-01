import {HSIN_STAGE,pixelRatio,cameraFit,attentionHeight} from './hsin-stage-config.mjs';
import {createStageLoop} from './hsin-stage-loop.mjs';
import {createBakedPose,createBakedChest} from './hsin-baked-pose.mjs';
import {createFacialActing} from './hsin-face-acting.mjs';
import {snapshotFace,createFaceBinding} from './hsin-face-binding.mjs';
import {createChestDirector} from './hsin-chest-director.mjs';
import {createBodyRepertoire} from './hsin-body-repertoire.mjs';
import {createPoseTransition} from './hsin-pose-transition.mjs';
import {createRestBreath} from './hsin-rest-breath.mjs';
import {MOONLIT,createMoonlitEnvironment} from './hsin-moonlit-environment.mjs';

/** Public player. The local-file lab, geometry solvers and authoring UI are separate entries. */
export function mountHsinStage(root:HTMLElement){
 const q=<T extends HTMLElement>(s:string)=>{const e=root.querySelector<T>(s);if(!e)throw Error('Missing stage element '+s);return e;};
 const host=q<HTMLDivElement>('[data-stage-canvas]'),status=q<HTMLDivElement>('[data-stage-status]'),errorBox=q<HTMLDivElement>('[data-stage-error]');
 const near=q<HTMLButtonElement>('[data-stage-in]'),far=q<HTMLButtonElement>('[data-stage-out]'),home=q<HTMLButtonElement>('[data-stage-reset]'),pause=q<HTMLButtonElement>('[data-stage-pause]'),retry=q<HTMLButtonElement>('[data-stage-retry]');
 const life=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)'),touch=matchMedia('(pointer: coarse)').matches;
 let viewportVisible=true,destroyed=false,started=false,paused=false,generation=0,lost=false;
 let disposeAttempt=()=>{},loop:ReturnType<typeof createStageLoop>|null=null,zoom=(_factor:number)=>{},resetCamera=()=>{};
 const showPause=()=>{const frozen=paused||motion.matches;pause.setAttribute('aria-pressed',String(frozen));pause.textContent=frozen?'▶':'Ⅱ';pause.setAttribute('aria-label',frozen?'Retomar atuação':'Pausar atuação');pause.title=frozen?'Retomar atuação':'Pausar atuação';pause.disabled=root.dataset.state!=='ready'||motion.matches;};
 const policy=()=>{showPause();loop?.policyChanged();};
 near.addEventListener('click',()=>zoom(.84),{signal:life.signal});far.addEventListener('click',()=>zoom(1.19),{signal:life.signal});home.addEventListener('click',()=>resetCamera(),{signal:life.signal});
 pause.addEventListener('click',()=>{paused=!paused;policy();},{signal:life.signal});
 retry.addEventListener('click',()=>{started=false;start();},{signal:life.signal});
 motion.addEventListener('change',policy,{signal:life.signal});
 const visible=()=>viewportVisible&&!document.hidden&&!lost&&!destroyed;
 document.addEventListener('visibilitychange',()=>{loop?.setVisible(visible());if(visible()&&!started)start();},{signal:life.signal});
 const intersection=new IntersectionObserver(entries=>{viewportVisible=entries[0]?.isIntersecting??true;loop?.setVisible(visible());if(visible()&&!started)start();},{threshold:.01});intersection.observe(root);
 function teardown(){if(destroyed)return;destroyed=true;generation++;life.abort();intersection.disconnect();disposeAttempt();loop=null;}
 window.addEventListener('pagehide',teardown,{once:true,signal:life.signal});
 // pagehide also fires for bfcache: rebuild resources when returning to this page.
 const resumePage=(event:PageTransitionEvent)=>{if(!event.persisted)return;window.removeEventListener('pageshow',resumePage);if(destroyed)mountHsinStage(root);};
 window.addEventListener('pageshow',resumePage);

 async function start(){
  if(started||destroyed||!visible())return;started=true;const attemptId=++generation;
  disposeAttempt();const attempt=new AbortController();let renderer:any,scene:any,orbit:any,resize:ResizeObserver|null=null,body:any,binding:any,model:any;
  let cleaned=false;const textures=new Set<any>(),geometries=new Set<any>(),materials=new Set<any>(),skeletons=new Set<any>();
  const collect=(object:any)=>object?.traverse((o:any)=>{if(!o.isMesh)return;geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const t of Object.values(m))if((t as any)?.isTexture)textures.add(t);}});
  const releaseCollected=()=>{for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.dispose();t.image?.close?.();}for(const s of skeletons)s.dispose();geometries.clear();materials.clear();textures.clear();skeletons.clear();};
  const clean=()=>{if(cleaned)return;cleaned=true;attempt.abort();loop?.dispose();loop=null;resize?.disconnect();orbit?.dispose();body?.dispose();binding?.restore();collect(scene);releaseCollected();renderer?.dispose();renderer?.forceContextLoss();host.replaceChildren();renderer=scene=orbit=model=body=binding=null;zoom=()=>{};resetCamera=()=>{};};
  disposeAttempt=clean;root.dataset.state='loading';status.hidden=false;status.textContent='Preparando Hsin…';errorBox.hidden=true;[near,far,home,pause].forEach(b=>b.disabled=true);
  try{
   const [T,{GLTFLoader},{OrbitControls}]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/controls/OrbitControls.js')]);
   if(attempt.signal.aborted||destroyed)return;
   const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
   // Fail before fetching the asset if this browser cannot create a WebGL2 context.
   const context=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false});if(!context)throw Error('WebGL2 unavailable.');
   renderer=new T.WebGLRenderer({canvas,context,alpha:false,antialias:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
   renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=false;renderer.setClearColor(HSIN_STAGE.colors.night);host.append(canvas);
   const {default:asset}=await import('../data/hsin-v2-asset.json');
   const version='?v='+asset.sha256.slice(0,12);
   const [profileResponse,response]=await Promise.all([fetch(HSIN_STAGE.profile+version,{signal:attempt.signal}),fetch(HSIN_STAGE.model+version,{signal:attempt.signal})]);
   if(!profileResponse.ok)throw Error('Stage profile unavailable.');const profile=await profileResponse.json();if(profile.modelSha256!==asset.sha256)throw Error('Stage/profile version mismatch.');
   if(!response.ok)throw Error('Model unavailable.');
   // Small, prebuilt scenery textures. Late results after navigation are disposed immediately.
   const textureLoader=new T.TextureLoader();
   const sceneryTexture=async(url:string)=>{const t=await textureLoader.loadAsync(url);if(cleaned||attempt.signal.aborted){t.dispose();throw Error('Scenery load cancelled.');}t.colorSpace=T.SRGBColorSpace;textures.add(t);return t;};
   const scenery=Promise.all([sceneryTexture(MOONLIT.sky),sceneryTexture(MOONLIT.moon)]);
   // Attach an immediate rejection handler while GLTF parsing is in flight.
   scenery.catch(()=>{});
   const bytes=await response.arrayBuffer(),gltf=await new GLTFLoader().parseAsync(bytes,'');model=gltf.scene;
   if(attempt.signal.aborted||destroyed||attemptId!==generation){collect(model);releaseCollected();if(!cleaned)clean();return;}
   // Adopt the model before awaiting scenery so failure/teardown also releases its GPU resources.
   scene=new T.Scene();scene.matrixWorldAutoUpdate=false;scene.add(model);
   const [skyTexture,moonTexture]=await scenery;
   if(attempt.signal.aborted||destroyed||attemptId!==generation)return;
   const moonlit=createMoonlitEnvironment({THREE:T,skyTexture,moonTexture});scene.background=moonlit.background;scene.fog=moonlit.fog;scene.add(moonlit.group);
   const platform=new T.Mesh(new T.CylinderGeometry(.79,.84,.075,48),new T.MeshStandardMaterial({color:HSIN_STAGE.colors.platform,roughness:.94,metalness:.08}));platform.position.y=-.042;scene.add(platform);
   const ring=new T.Mesh(new T.RingGeometry(.79,.797,64),new T.MeshBasicMaterial({color:HSIN_STAGE.colors.ring,transparent:true,opacity:.42,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=-.002;scene.add(ring);
   const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d')!,shade=sc.createRadialGradient(64,64,4,64,64,64);shade.addColorStop(0,'#020716b3');shade.addColorStop(1,'#02071600');sc.fillStyle=shade;sc.fillRect(0,0,128,128);
   const shadowTexture=new T.CanvasTexture(shadowCanvas);textures.add(shadowTexture);const shadow=new T.Mesh(new T.PlaneGeometry(1.3,1.3),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.002;scene.add(shadow);
   scene.add(new T.AmbientLight(0xc5d4eb,.95));const key=new T.DirectionalLight(0xd4e3fc,1.8);key.position.set(-2,4,5);scene.add(key);const rim=new T.DirectionalLight(0xe6d5b2,1.15);rim.position.set(-2,4,-5);scene.add(rim);
   model.position.y-=profile.bounds.min[1];scene.add(model);scene.updateMatrixWorld(true);
   // Static transforms are frozen. Driven bones update their local matrices; one scene flush per rendered frame.
   scene.traverse((o:any)=>{o.updateMatrix();o.matrixAutoUpdate=false;});
   const meshes:any[]=[];model.traverse((o:any)=>{if(o.isSkinnedMesh)meshes.push(o);});const bones:any[]=[...new Set(meshes.flatMap(m=>m.skeleton.bones))];const byName=new Map(bones.map(b=>[b.name,b])),head:any=byName.get('ORG-Bip001Head');if(!head)throw Error('Head rig missing.');
   const camera=new T.PerspectiveCamera(HSIN_STAGE.fov,1,.03,45);orbit=new OrbitControls(camera,canvas);orbit.enablePan=false;orbit.enableDamping=true;orbit.dampingFactor=HSIN_STAGE.damping;orbit.rotateSpeed=HSIN_STAGE.rotateSpeed;orbit.zoomSpeed=HSIN_STAGE.zoomSpeed;orbit.minDistance=HSIN_STAGE.minDistance;orbit.minPolarAngle=HSIN_STAGE.minPolar;orbit.maxPolarAngle=HSIN_STAGE.maxPolar;orbit.minAzimuthAngle=-HSIN_STAGE.maxAzimuth;orbit.maxAzimuthAngle=HSIN_STAGE.maxAzimuth;
   let initialDistance=3.5,worldDirty=true,firstFit=true;const fit=()=>{
    const rect=host.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setPixelRatio(pixelRatio(w,h,devicePixelRatio||1,touch));renderer.setSize(w,h,false);root.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);
    const previousFit=initialDistance;initialDistance=cameraFit(profile.bounds,camera.aspect);orbit.maxDistance=Math.max(5.5,initialDistance*1.55);if(firstFit){firstFit=false;resetCamera();}else{const d=camera.position.distanceTo(orbit.target),next=Math.max(orbit.minDistance,Math.min(orbit.maxDistance,d*initialDistance/previousFit));camera.position.sub(orbit.target).multiplyScalar(next/d).add(orbit.target);orbit.update();}loop?.invalidate();
   };
   resetCamera=()=>{orbit.target.set(0,HSIN_STAGE.baseTargetY,0);camera.position.set(0,HSIN_STAGE.baseTargetY+.23,initialDistance);orbit.update();loop?.invalidate();};
   zoom=(factor:number)=>{const current=camera.position.distanceTo(orbit.target),distance=Math.max(orbit.minDistance,Math.min(orbit.maxDistance,current*factor));camera.position.sub(orbit.target).multiplyScalar(distance/current).add(orbit.target);orbit.update();loop?.invalidate();};
   orbit.addEventListener('change',()=>{
    const height=attentionHeight(camera.position.distanceTo(orbit.target),initialDistance),delta=height-orbit.target.y;if(Math.abs(delta)>1e-6){orbit.target.y=height;camera.position.y+=delta;}moonlit.frameSky(camera,orbit.target);worldDirty=true;loop?.invalidate();
   });
   fit();resize=new ResizeObserver(fit);resize.observe(host);
   const seed=crypto.getRandomValues(new Uint32Array(1))[0],face=createFacialActing({seed,pass:'auto-b1',autonomous:true,intensity:.75,morphLimits:profile.limits,gazeAxes:profile.gazeAxes});
   binding=createFaceBinding(meshes,snapshotFace(meshes),profile.calibration,{limits:profile.limits});
   const signature=createPoseTransition({pose:createBakedPose({THREE:T,data:profile.poses.signature,bones})}),chest=createChestDirector({pose:createBakedChest({THREE:T,profile:profile.poses,bones}),seed:seed^0x51c7,organic:true,onEvent:face.signal}),hair=createChestDirector({pose:createBakedPose({THREE:T,data:profile.poses.hair,bones}),seed:seed^0x32b1,organic:true,onEvent:face.signal});
   const spine:any=byName.get('ORG-Bip001Spine2');body=createBodyRepertoire({seed:seed^0xb041,signature,chest,hair,breath:createRestBreath({THREE:T,bone:spine,update:()=>spine?.updateMatrix()}),capabilities:()=>({signature:!!profile.poses.signature,chest:!!profile.poses.chest,composition:!!profile.poses.composition,hair:!!profile.poses.hair})});
   // Reusable vectors. Pointer projection runs only on input, not in the animation hot path.
   const ray=new T.Raycaster(),plane=new T.Plane(),normal=new T.Vector3(),center=new T.Vector3(),hit=new T.Vector3(),inverse=new T.Matrix4(),ndc=new T.Vector2(),localCenter=new T.Vector3(...profile.calibration.focusCenter);
   const horizontal=new T.Vector3(...profile.gazeAxes.horizontal),vertical=new T.Vector3(...profile.gazeAxes.vertical),gaze=[0,0,0];let attending=false,touchUntil=0;
   const input=(event:PointerEvent)=>{
    if(event.pointerType==='touch'&&event.type!=='pointerdown')return;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    ndc.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);camera.updateMatrixWorld();head.updateWorldMatrix(true,false);center.copy(localCenter);head.localToWorld(center);camera.getWorldDirection(normal);plane.setFromNormalAndCoplanarPoint(normal,center);ray.setFromCamera(ndc,camera);
    if(!ray.ray.intersectPlane(plane,hit))return;inverse.copy(head.matrixWorld).invert();hit.applyMatrix4(inverse).sub(localCenter).divideScalar(profile.calibration.radius).clampLength(0,1);const h=hit.dot(horizontal),v=hit.dot(vertical);hit.copy(horizontal).multiplyScalar(h).addScaledVector(vertical,v).clampLength(0,1);gaze[0]=hit.x;gaze[1]=hit.y;gaze[2]=hit.z;attending=true;touchUntil=event.pointerType==='touch'?face.sample().clock+4.2:Infinity;loop?.invalidate();
   };
   canvas.addEventListener('pointermove',input,{passive:true,signal:attempt.signal});canvas.addEventListener('pointerdown',input,{passive:true,signal:attempt.signal});canvas.addEventListener('pointerleave',(event:PointerEvent)=>{if(event.pointerType!=='touch'){attending=false;face.clearAttention();}},{passive:true,signal:attempt.signal});
   canvas.addEventListener('webglcontextlost',(event:Event)=>{event.preventDefault();lost=true;loop?.setVisible(false);root.dataset.state='recovering';status.hidden=false;status.textContent='Aguardando a cena…';},{signal:attempt.signal});
   canvas.addEventListener('webglcontextrestored',()=>{lost=false;root.dataset.state='ready';status.hidden=true;loop?.setVisible(visible());},{signal:attempt.signal});
   loop=createStageLoop({requestFrame:requestAnimationFrame,cancelFrame:cancelAnimationFrame,fps:HSIN_STAGE.fps,active:()=>!paused&&!motion.matches,
    controlsUpdate:()=>orbit.update(),
    step:(dt:number)=>{if(attending&&face.sample().clock<=touchUntil)face.attention(gaze,1.3);else if(attending){attending=false;face.clearAttention();}const state=face.advance(dt);binding.apply(state);body.advance(dt,{enabled:true,context:face.diagnostics().expressions?.context});worldDirty=true;},
    draw:()=>{if(worldDirty){scene.updateMatrixWorld();worldDirty=false;}renderer.render(scene,camera);},
   });
   loop.setVisible(false);
   await renderer.compileAsync(scene,camera);if(attempt.signal.aborted||destroyed||attemptId!==generation){clean();return;}
   root.dataset.state='ready';root.dataset.modelBytes=String(asset.bytes);status.hidden=true;[near,far,home].forEach(b=>b.disabled=false);showPause();loop.setVisible(visible());loop.invalidate();
  }catch(error){
   if(attempt.signal.aborted||destroyed||attemptId!==generation)return;console.error('Hsin stage failed',error);clean();started=false;lost=false;root.dataset.state='error';status.hidden=true;errorBox.hidden=false;[near,far,home,pause].forEach(b=>b.disabled=true);
  }
 }
 return {dispose:teardown};
}
