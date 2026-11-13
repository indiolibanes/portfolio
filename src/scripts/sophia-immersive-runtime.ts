import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createLaunchDirector,disposeAstronautAsset} from './sophia-launch-director';
import {ActiveSceneClock} from './sophia-launch-timeline.mjs';
import {sampleImmersiveR3At} from './sophia-immersive-r3-timeline.mjs';
import {createStartWipe} from './sophia-start-wipe';
import {createLaunchAudio} from './sophia-launch-audio';
import {createRenderLoop} from './shorekeeper/render-loop.mjs';

const page=document.querySelector<HTMLElement>('[data-sophia-immersive]');
if(page){
 const $=<E extends HTMLElement=HTMLElement>(selector:string)=>page.querySelector<E>(selector)!;
 const stage=$('[data-stage]'),intro=$('[data-intro]'),start=$<HTMLButtonElement>('[data-intro-start]'),status=$('[data-status]'),retry=$<HTMLButtonElement>('[data-retry]'),hud=$('[data-launch-hud]'),count=$('[data-countdown]'),label=$('[data-countdown-label]'),playback=$('[data-playback]'),pauseButton=$<HTMLButtonElement>('[data-pause]'),replay=$('[data-replay]'),resetCamera=$('[data-camera-reset]'),mute=$<HTMLButtonElement>('[data-mute]');
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),life=new AbortController(),audio=createLaunchAudio(message=>{const s=$('[data-audio-status]');s.textContent=message;});
 const wipe=createStartWipe(intro,$('.immersive__start-main'),()=>motion.matches),clock=new ActiveSceneClock();
 let renderer:T.WebGLRenderer|undefined,controls:OrbitControls|undefined,director:ReturnType<typeof createLaunchDirector>|null=null,loop:ReturnType<typeof createRenderLoop>|undefined,observer:ResizeObserver|undefined;
 let disposed=false,phase:'intro'|'wiping'|'waiting'|'launch'='intro',contextLost=false,userPaused=false,loading=false,sceneUnavailable=false,loadIndex=0,lastHud='',lastFrame=0,loadFailure:string|null=null;const download=new AbortController();
 function setStatus(message:string){status.hidden=!message;status.textContent=message;}
 function pauseAudio(){audio.pause(document.hidden||contextLost||userPaused);}
 function updateHud(t:number){const s=sampleImmersiveR3At(t);page!.dataset.launchPhase=s.phase;hud.hidden=!director?.supported||s.countdownDigit===null;const next=String(s.countdownDigit);if(next!==lastHud){count.textContent=s.countdownDigit===null?'':next;label.textContent=s.countdownDigit===0?'DECOLAGEM':'IGNIÇÃO · CONTAGEM REGRESSIVA';count.animate([{transform:'scale(1.12)',opacity:.7},{transform:'scale(1)',opacity:1}],{duration:motion.matches?0:150});lastHud=next;}return s;}
 function begin(){if(disposed||phase!=='waiting'||!director)return;phase='launch';director.reset();wipe.reveal();stage.inert=false;stage.tabIndex=0;clock.start(performance.now());audio.start();pauseAudio();playback.hidden=false;setStatus(director.supported?'':'Modelo com hierarquia diferente: exibindo apenas voo original.');loop?.wake();}
 function requestStart(){if(phase!=='intro')return;phase='wiping';audio.unlock();void wipe.play().then(()=>{if(disposed)return;phase='waiting';if(director)begin();else setStatus(loadFailure??(sceneUnavailable?'3D indisponível neste navegador. Use Tentar novamente.':'Preparando lançamento…'));});}
 start.addEventListener('click',requestStart,{signal:life.signal});
 window.addEventListener('keydown',e=>{if(phase!=='intro'||e.repeat||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||['Escape','Tab','Shift','Control','Alt','Meta','CapsLock'].includes(e.key))return;if(e.target instanceof Element&&e.target.closest('a,button,input,select,textarea,[contenteditable],[role="menu"],[data-xm]'))return;e.preventDefault();requestStart();},{signal:life.signal});
 mute.addEventListener('click',()=>{audio.setMuted(!audio.muted);mute.textContent=audio.muted?'Ativar sons':'Silenciar sons';mute.setAttribute('aria-pressed',String(audio.muted));},{signal:life.signal});
 function destroy(){if(disposed)return;disposed=true;loadIndex++;download.abort();life.abort();loop?.dispose();observer?.disconnect();wipe.dispose();audio.dispose();director?.dispose();controls?.dispose();renderer?.dispose();renderer?.domElement.remove();}
 window.addEventListener('pagehide',destroy,{once:true,signal:life.signal});document.addEventListener('astro:before-swap',destroy,{once:true,signal:life.signal});
 try{
  const scene=new T.Scene();scene.background=new T.Color(0);const camera=new T.PerspectiveCamera(38,1,.005,1000);
  renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setClearColor(0,1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;stage.append(renderer.domElement);
  scene.add(new T.HemisphereLight(0xdce6ff,0x12131e,1.3));const key=new T.DirectionalLight(0xffefd5,2.8);key.position.set(-3,5,6);scene.add(key);const rim=new T.DirectionalLight(0x8197ed,1.8);rim.position.set(4,3,-4);scene.add(rim);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=!motion.matches;controls.dampingFactor=.07;controls.enableRotate=controls.enableZoom=controls.enablePan=true;controls.rotateSpeed=.65;controls.zoomSpeed=.75;
  const invalidate=()=>loop?.wake();controls.addEventListener('change',invalidate);controls.addEventListener('start',invalidate);
  function resize(){if(!renderer)return;const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.3:1.65,Math.sqrt(2400000/(w*h))));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();director?.resize();loop?.wake();}
  observer=new ResizeObserver(resize);observer.observe(stage);
  const loader=new GLTFLoader();
  async function loadAstronaut(){if(loading||disposed)return;loading=true;loadFailure=null;const current=++loadIndex;retry.hidden=true;setStatus('Carregando Sophia astronauta e foguete…');
   try{const url=page!.dataset.astronautUrl||'/api/sophia/rocket',head=await fetch(url,{method:'HEAD',credentials:'omit',redirect:'manual',cache:'no-store',signal:download.signal});
    if(!head.ok)throw Error(head.status===404?'Modelo da Sophia não encontrado (404).':head.status===503?'Armazenamento da Sophia indisponível (503).':'Modelo público indisponível (HTTP '+head.status+').');
    if(!head.headers.get('content-type')?.includes('model/gltf-binary'))throw Error('O servidor não retornou um GLB.');
    const response=await fetch(url,{credentials:'omit',redirect:'error',signal:download.signal});if(!response.ok)throw Error('Falha no download (HTTP '+response.status+').');const bytes=await response.arrayBuffer();if(disposed||current!==loadIndex)return;
    const gltf=await loader.parseAsync(bytes,'');
    if(disposed||current!==loadIndex){disposeAstronautAsset(gltf.scene);return;}
    director?.dispose();director=createLaunchDirector(gltf,scene,camera,controls!,()=>motion.matches);gltf.scene.visible=false;resize();setStatus('');if(phase==='waiting')begin();
    if(import.meta.env.DEV||new URLSearchParams(location.search).get('launchQA')==='1')(window as unknown as Record<string,unknown>).__SOPHIA_LAUNCH_QA__={seek(t:number){if(phase==='intro'){phase='waiting';begin();}clock.seconds=Math.max(0,t);clock.anchor=performance.now();clock.pause('qa',performance.now());audio.pause(true);director!.apply(t);updateHud(t);renderer!.render(scene,camera);},resume(){clock.resume('qa',performance.now());audio.pause(false);loop?.wake();},snapshot(){return {...director!.snapshot(),audio:audio.state,render:{calls:renderer!.info.render.calls,triangles:renderer!.info.render.triangles,geometries:renderer!.info.memory.geometries,textures:renderer!.info.memory.textures},countdown:count.textContent,viewport:[stage.clientWidth,stage.clientHeight]};}};
   }catch(error){if(disposed)return;loadFailure=error instanceof Error?error.message:'Não foi possível preparar a cena.';setStatus(loadFailure);retry.hidden=false;}
   finally{loading=false;}
  }
  retry.addEventListener('click',()=>{void loadAstronaut();},{signal:life.signal});
  pauseButton.addEventListener('click',()=>{userPaused=!userPaused;if(userPaused)clock.pause('user',performance.now());else clock.resume('user',performance.now());pauseButton.textContent=userPaused?'Continuar':'Pausar';pauseButton.setAttribute('aria-pressed',String(userPaused));pauseAudio();loop?.reconcile();},{signal:life.signal});
  replay.addEventListener('click',()=>{if(!director)return;director.reset();audio.reset();clock.resume('user',performance.now());clock.resume('qa',performance.now());clock.start(performance.now());userPaused=false;audio.start();pauseAudio();pauseButton.textContent='Pausar';pauseButton.setAttribute('aria-pressed','false');lastHud='';setStatus('');loop?.wake();},{signal:life.signal});
  resetCamera.addEventListener('click',()=>{director?.resetCamera();loop?.wake();},{signal:life.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clock.pause('hidden',performance.now());else clock.resume('hidden',performance.now());lastFrame=0;pauseAudio();loop?.reconcile();},{signal:life.signal});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;clock.pause('context',performance.now());pauseAudio();loop?.reconcile();setStatus('Cena pausada enquanto o navegador recupera o contexto 3D.');},{signal:life.signal});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;clock.resume('context',performance.now());lastFrame=0;pauseAudio();setStatus('');resize();loop?.reconcile();},{signal:life.signal});
  const mobile=matchMedia('(pointer:coarse)').matches;
  loop=createRenderLoop({request:requestAnimationFrame,cancel:cancelAnimationFrame,eligible:()=>!disposed&&!document.hidden&&!contextLost,tick:(now:number)=>{if(lastFrame&&now-lastFrame<1000/(mobile?30:60)-1)return true;const cameraDt=lastFrame?(now-lastFrame)/1000:0;lastFrame=now;if(phase==='launch'&&director){const t=clock.read(now),s=updateHud(t);director.apply(t,cameraDt);audio.update(t,s.enginePower);}controls!.update();renderer!.render(scene,camera);return phase==='launch'&&(!userPaused||director?.cameraReturning);}});
  resize();void loadAstronaut();
 }catch(error){sceneUnavailable=true;console.error('Sophia: WebGL indisponível.',error);setStatus('Este navegador não conseguiu iniciar a cena 3D. A navegação continua disponível.');retry.hidden=false;retry.addEventListener('click',()=>location.reload(),{once:true,signal:life.signal});}
}
