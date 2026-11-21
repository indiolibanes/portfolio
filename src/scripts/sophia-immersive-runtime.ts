import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createLaunchDirector,disposeAstronautAsset} from './sophia-launch-director';
import {ActiveSceneClock} from './sophia-launch-timeline.mjs';
import {sampleImmersiveR3At} from './sophia-immersive-r3-timeline.mjs';
import {createLaunchAudio} from './sophia-launch-audio';
import {createRenderLoop} from './shorekeeper/render-loop.mjs';

const page=document.querySelector<HTMLElement>('[data-sophia-immersive]');
if(page){
 const $=<E extends HTMLElement=HTMLElement>(selector:string)=>page.querySelector<E>(selector)!;
 const stage=$('[data-stage]'),intro=$('[data-intro]'),start=$<HTMLButtonElement>('[data-intro-start]'),
  decline=$<HTMLButtonElement>('[data-intro-no]'),choiceStatus=$('[data-choice-status]'),
  cameraHelp=$('[data-camera-help]'),status=$('[data-status]'),retry=$<HTMLButtonElement>('[data-retry]'),
  hud=$('[data-launch-hud]'),count=$('[data-countdown]'),label=$('[data-countdown-label]'),
  playback=$('[data-playback]'),pauseButton=$<HTMLButtonElement>('[data-pause]'),
  replay=$('[data-replay]'),resetCamera=$('[data-camera-reset]'),mute=$<HTMLButtonElement>('[data-mute]');
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),life=new AbortController();
 const audio=createLaunchAudio(message=>{$('[data-audio-status]').textContent=message;});
 const clock=new ActiveSceneClock();
 let renderer:T.WebGLRenderer|undefined,controls:OrbitControls|undefined,director:ReturnType<typeof createLaunchDirector>|null=null,loop:ReturnType<typeof createRenderLoop>|undefined,observer:ResizeObserver|undefined;
 let disposed=false,authorized=false,contextLost=false,pageCached=false,userPaused=false,loading=false,loadIndex=0,lastHud='',lastFrame=0;
 const download=new AbortController();
 function setStatus(message:string){status.hidden=!message;status.textContent=message;}
 function updateReadiness(){start.disabled=!director?.supported||contextLost;}
 function pauseAudio(){audio.pause(document.hidden||contextLost||pageCached||clock.pauses.size>0||!authorized);}
 function updateHud(t:number){
  const sample=sampleImmersiveR3At(t);
  page!.dataset.launchPhase=sample.phase;
  const digit=sample.countdownDigit;
  hud.hidden=digit===null;
  const next=digit===null?'':String(digit);
  if(next!==lastHud){
   count.textContent=next;
   label.textContent=digit===0?'DECOLAGEM':'IGNIÇÃO';
   if(digit!==null&&!motion.matches)count.animate([{opacity:.65},{opacity:1}],{duration:160});
   lastHud=next;
  }
  return sample;
 }
 function showStandby(moveFocus=false){
  authorized=false;
  page!.dataset.launchPhase='STANDBY';
  intro.hidden=false;
  playback.hidden=true;
  cameraHelp.hidden=false;
  hud.hidden=true;
  count.textContent='';
  lastHud='';
  choiceStatus.textContent='';
  userPaused=false;
  pauseButton.textContent='Pausar';
  pauseButton.setAttribute('aria-pressed','false');
  audio.reset();
  pauseAudio();
  clock.resume('user',performance.now());
  clock.resume('qa',performance.now());
  director?.reset(true);
  updateReadiness();
  if(moveFocus&&!start.disabled)start.focus({preventScroll:true});
  loop?.wake();
 }
 function begin(){
  if(disposed||authorized||contextLost||!director?.supported)return;
  authorized=true;
  page!.dataset.launchPhase='REVEAL_VERTICAL_PAD';
  intro.hidden=true;
  cameraHelp.hidden=true;
  playback.hidden=false;
  clock.start(performance.now());
  audio.unlock();
  audio.start();
  pauseAudio();
  stage.focus({preventScroll:true});
  setStatus('');
  loop?.wake();
 }
 showStandby();
 start.addEventListener('click',begin,{signal:life.signal});
 decline.addEventListener('click',()=>{
  if(!authorized)choiceStatus.textContent='A plataforma fica em espera. Escolha YES quando quiser partir.';
 },{signal:life.signal});
 mute.addEventListener('click',()=>{
  audio.setMuted(!audio.muted);
  if(authorized&&!audio.muted)audio.unlock();
  mute.textContent=audio.muted?'Ativar sons':'Silenciar sons';
  mute.setAttribute('aria-pressed',String(audio.muted));
 },{signal:life.signal});
 function destroy(){if(disposed)return;disposed=true;loadIndex++;download.abort();life.abort();loop?.dispose();observer?.disconnect();audio.dispose();director?.dispose();controls?.dispose();renderer?.dispose();renderer?.domElement.remove();}
 window.addEventListener('pagehide',event=>{
  if(!event.persisted){destroy();return;}
  pageCached=true;
  clock.pause('page-cache',performance.now());
  pauseAudio();
  loop?.reconcile();
 },{signal:life.signal});
 window.addEventListener('pageshow',event=>{
  if(!event.persisted||!pageCached)return;
  pageCached=false;
  clock.resume('page-cache',performance.now());
  lastFrame=0;
  pauseAudio();
  loop?.wake();
 },{signal:life.signal});
 document.addEventListener('astro:before-swap',destroy,{once:true,signal:life.signal});
 try{
  const scene=new T.Scene();const camera=new T.PerspectiveCamera(38,1,.005,1000);
  renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;stage.append(renderer.domElement);
  scene.add(new T.HemisphereLight(0xeee7ff,0x2d2020,1.15));
  const key=new T.DirectionalLight(0xffdfb2,2.65);
  key.position.set(-3,5,6);
  const rim=new T.DirectionalLight(0xa0b6ff,2);
  rim.position.set(4,3,-4);
  scene.add(key,rim);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=!motion.matches;controls.dampingFactor=.07;controls.enableRotate=controls.enableZoom=controls.enablePan=true;controls.rotateSpeed=.65;controls.zoomSpeed=.75;
  const invalidate=()=>loop?.wake();controls.addEventListener('change',invalidate);controls.addEventListener('start',invalidate);
  const cameraOffset=new T.Spherical();
  const cameraVector=new T.Vector3();
  stage.addEventListener('keydown',event=>{
   if(!director||contextLost||!controls||event.altKey||event.ctrlKey||event.metaKey)return;
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
   event.preventDefault();
   controls.dispatchEvent({type:'start'});
   cameraOffset.setFromVector3(cameraVector.copy(camera.position).sub(controls.target));
   if(event.key==='ArrowLeft')cameraOffset.theta-=Math.PI/12;
   if(event.key==='ArrowRight')cameraOffset.theta+=Math.PI/12;
   if(event.key==='ArrowUp')cameraOffset.phi-=Math.PI/18;
   if(event.key==='ArrowDown')cameraOffset.phi+=Math.PI/18;
   cameraOffset.phi=T.MathUtils.clamp(cameraOffset.phi,controls.minPolarAngle,controls.maxPolarAngle);
   camera.position.copy(cameraVector.setFromSpherical(cameraOffset).add(controls.target));
   controls.update();
   invalidate();
  },{signal:life.signal});
  function resize(){if(!renderer)return;const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65,Math.sqrt(2400000/(w*h))));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();director?.resize();loop?.wake();}
  observer=new ResizeObserver(resize);observer.observe(stage);
  const loader=new GLTFLoader();
  async function loadAstronaut(){if(loading||disposed)return;loading=true;const current=++loadIndex;retry.hidden=true;setStatus('Carregando Sophia astronauta e foguete…');
   try{
    const url=new URL(page!.dataset.astronautUrl||'/api/sophia/rocket',location.origin);
    if(url.origin!==location.origin)throw Error('Endereço do modelo fora da origem do site.');
    // Protected previews use the same Cloudflare Access session as this page.
    const response=await fetch(url,{credentials:'same-origin',redirect:'error',signal:download.signal});
    if(!response.ok)throw Error(response.status===404?'Modelo da Sophia não encontrado (404).':response.status===503?'Armazenamento da Sophia indisponível (503).':'Modelo público indisponível (HTTP '+response.status+').');
    if(!response.headers.get('content-type')?.includes('model/gltf-binary')){void response.body?.cancel();throw Error('O servidor não retornou um GLB.');}
    // One request (no HEAD round trip); the body is streamed so the status shows real progress.
    const total=response.headers.get('content-encoding')?0:Number(response.headers.get('content-length'))||0,reader=response.body?.getReader();let bytes:ArrayBuffer;
    if(!reader)bytes=await response.arrayBuffer();
    else{const chunks:Uint8Array[]=[];let got=0,shown=-1;for(;;){const{done,value}=await reader.read();if(done)break;chunks.push(value);got+=value.byteLength;if(total){const pct=Math.min(99,Math.floor(got/total*100));if(pct!==shown&&(pct-shown>=2||pct===99)){shown=pct;setStatus('Carregando Sophia astronauta e foguete… '+pct+'%');}}if(disposed||current!==loadIndex){void reader.cancel();return;}}
     const buf=new Uint8Array(got);let at=0;for(const c of chunks){buf.set(c,at);at+=c.byteLength;}chunks.length=0;bytes=buf.buffer;}
    if(disposed||current!==loadIndex)return;
    const gltf=await loader.parseAsync(bytes,'');
    if(disposed||current!==loadIndex){disposeAstronautAsset(gltf.scene);return;}
    director?.dispose();
    director=createLaunchDirector(gltf,scene,camera,controls!,()=>motion.matches);
    stage.dataset.sceneReady='';
    resize();
    updateReadiness();
    setStatus(director.supported?'':'O modelo foi aberto, mas a sequência de lançamento está indisponível.');
    retry.hidden=director.supported;
    if(import.meta.env.DEV||new URLSearchParams(location.search).get('launchQA')==='1'){
     (window as unknown as Record<string,unknown>).__SOPHIA_LAUNCH_QA__={
      seek(t:number){
       if(!authorized||!director)return false;
       clock.seconds=Math.max(0,t);
       clock.anchor=performance.now();
       clock.pause('qa',performance.now());
       audio.pause(true);
       director.apply(t);
       updateHud(t);
       renderer!.render(scene,camera);
       return true;
      },
      resume(){
       if(!authorized)return;
       clock.resume('qa',performance.now());
       pauseAudio();
       loop?.wake();
      },
      snapshot(){
       return {...director!.snapshot(),authorized,audio:audio.state,
        render:{calls:renderer!.info.render.calls,triangles:renderer!.info.render.triangles,geometries:renderer!.info.memory.geometries,textures:renderer!.info.memory.textures},
        azimuth:controls!.getAzimuthalAngle(),countdown:count.textContent,
        viewport:[stage.clientWidth,stage.clientHeight],overlayVisible:!hud.hidden};
      },
     };
    }
   }catch(error){
    if(disposed)return;
    updateReadiness();
    setStatus(error instanceof Error?error.message:'Não foi possível preparar a cena.');
    retry.hidden=false;
   }
   finally{loading=false;}
  }
  retry.addEventListener('click',()=>{void loadAstronaut();},{signal:life.signal});
  pauseButton.addEventListener('click',()=>{userPaused=!userPaused;if(userPaused)clock.pause('user',performance.now());else clock.resume('user',performance.now());pauseButton.textContent=userPaused?'Continuar':'Pausar';pauseButton.setAttribute('aria-pressed',String(userPaused));pauseAudio();loop?.reconcile();},{signal:life.signal});
  replay.addEventListener('click',()=>showStandby(true),{signal:life.signal});
  resetCamera.addEventListener('click',()=>{director?.resetCamera();loop?.wake();},{signal:life.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clock.pause('hidden',performance.now());else clock.resume('hidden',performance.now());lastFrame=0;pauseAudio();loop?.reconcile();},{signal:life.signal});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;updateReadiness();clock.pause('context',performance.now());pauseAudio();loop?.reconcile();setStatus('Cena pausada enquanto o navegador recupera o contexto 3D.');},{signal:life.signal});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;updateReadiness();clock.resume('context',performance.now());lastFrame=0;pauseAudio();setStatus('');resize();loop?.reconcile();},{signal:life.signal});
  const mobile=matchMedia('(pointer:coarse)').matches;
  loop=createRenderLoop({
   request:requestAnimationFrame,
   cancel:cancelAnimationFrame,
   eligible:()=>!disposed&&!document.hidden&&!contextLost&&!pageCached,
   tick:(now:number)=>{
    if(lastFrame&&now-lastFrame<1000/(mobile?30:60)-1)return true;
    const cameraDt=lastFrame?(now-lastFrame)/1000:0;
    lastFrame=now;
    if(authorized&&director){
     const t=clock.read(now),sample=updateHud(t);
     director.apply(t,cameraDt);
     audio.update(t,director.finished?0:sample.enginePower);
    }else if(director?.cameraReturning){
     director.apply(0,cameraDt);
    }
    const cameraMoved=controls!.update();
    renderer!.render(scene,camera);
    return cameraMoved||Boolean(director?.cameraReturning)||(authorized&&!userPaused&&!director?.finished);
   },
  });
  resize();void loadAstronaut();
 }catch(error){console.error('Sophia: WebGL indisponível.',error);setStatus('Este navegador não conseguiu iniciar a cena 3D. A navegação continua disponível.');retry.hidden=false;retry.addEventListener('click',()=>location.reload(),{once:true,signal:life.signal});}
}
