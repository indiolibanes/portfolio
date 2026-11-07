import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createAstralTidalGarden} from './astral-tidal-garden.mjs';
import {attachFixedDuetMoon} from './shorekeeper/duet-fixed-moon.mjs';
/** Scenery-only public fallback. No character loader or private endpoint. */
export function mountAstralGarden(root){
 const host=root.querySelector('[data-stage-canvas]'),status=root.querySelector('[data-stage-status]');let renderer,controls,observer,raf=null,disposed=false,lost=false,dirty=true;
 const scene=new T.Scene();scene.background=new T.Color(0x071329);const garden=createAstralTidalGarden(T);scene.add(garden.group);
 const camera=new T.PerspectiveCamera(40,1,.05,200);camera.position.set(10,9,23);
 const moon=new T.Mesh(new T.SphereGeometry(1,32,20),new T.MeshBasicMaterial({color:0xe2dfc7})),halo=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial());const lunar=attachFixedDuetMoon(T,{scene,camera,moon,halo});
 const events=new AbortController();
 const dispose=()=>{if(disposed)return;disposed=true;events.abort();if(raf!==null)cancelAnimationFrame(raf);observer?.disconnect();controls?.dispose();garden.dispose();moon.geometry.dispose();moon.material.dispose();halo.geometry.dispose();halo.material.dispose();renderer?.dispose();host.replaceChildren();};
 try{
 renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.append(renderer.domElement);controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,1);controls.enablePan=true;controls.zoomToCursor=true;controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=65;controls.update();controls.addEventListener('change',()=>{dirty=true;});
 const mode=root.querySelector('[data-duo-camera-mode]');if(mode){for(const option of mode.options){option.disabled=!['auto','free'].includes(option.value);if(option.value==='auto')option.textContent='Vista do jardim';}mode.value='free';mode.addEventListener('change',()=>{if(mode.value==='auto'){camera.position.set(10,9,23);controls.target.set(0,1,1);dirty=true;}},{signal:events.signal});}
 const fit=()=>{const r=host.getBoundingClientRect();camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);lunar.resize();dirty=true;};observer=new ResizeObserver(fit);observer.observe(host);fit();
 root.querySelector('[data-stage-in]')?.addEventListener('click',()=>{camera.position.sub(controls.target).multiplyScalar(.84).add(controls.target);},{signal:events.signal});root.querySelector('[data-stage-out]')?.addEventListener('click',()=>{camera.position.sub(controls.target).multiplyScalar(1.19).add(controls.target);},{signal:events.signal});root.querySelector('[data-stage-reset]')?.addEventListener('click',()=>{camera.position.set(10,9,23);controls.target.set(0,1,1);},{signal:events.signal});
 for(const b of root.querySelectorAll('[data-stage-in],[data-stage-out],[data-stage-reset]'))b.disabled=false;
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;},{signal:events.signal});renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;dirty=true;},{signal:events.signal});
 root.dataset.state='ready';if(status)status.textContent='Jardim das Marés Astrais · explore o cenário. Personagens disponíveis no laboratório.';
 const danceNote=root.querySelector('[data-dance-capability]');if(danceNote)danceNote.hidden=true;
 const guest=root.querySelector('[data-duo-guest-status]');if(guest)guest.textContent='Apresentação autoral do jardim · personagens de terceiros não são carregadas nesta página.';
 let last=0;const frame=t=>{if(disposed)return;raf=requestAnimationFrame(frame);if(document.hidden||lost||t-last<1000/30)return;last=t;controls.update();if(dirty){renderer.render(scene,camera);dirty=false;}};raf=requestAnimationFrame(frame);
 window.addEventListener('pagehide',dispose,{once:true,signal:events.signal});document.addEventListener('astro:before-swap',dispose,{once:true,signal:events.signal});
 const resumePage=event=>{if(!event.persisted)return;window.removeEventListener('pageshow',resumePage);if(disposed)mountAstralGarden(root);};window.addEventListener('pageshow',resumePage);
 return dispose;
 }catch{dispose();if(status)status.textContent='Não foi possível abrir o jardim neste navegador.';return dispose;}
}
