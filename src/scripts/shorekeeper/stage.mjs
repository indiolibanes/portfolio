import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {disposeObject} from './local-model.mjs';
export function createStage(host,{lost,restored,invalidated,resized}={}){
 const canvas=document.createElement('canvas'),context=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});
 if(!context)throw Error('WebGL2 indisponível. Ative a aceleração gráfica ou teste outro navegador.');
 const renderer=new T.WebGLRenderer({canvas,context,antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene();scene.background=new T.Color(0xd6e9f5);const ambient=new T.HemisphereLight(0xe8efff,0x383b46,1.2),key=new T.DirectionalLight(0xfff0da,1.4),rim=new T.DirectionalLight(0xaccfff,.6);key.position.set(2,4,4);rim.position.set(-3,2,-2);scene.add(ambient,key,rim);
 const camera=new T.PerspectiveCamera(34,1,.01,100),orbit=new OrbitControls(camera,canvas);camera.position.set(0,1,4);orbit.target.set(0,1,0);orbit.enablePan=false;orbit.enableDamping=true;orbit.dampingFactor=.1;orbit.rotateSpeed=.6;orbit.update();host.replaceChildren(canvas);
 let model=null,helpers=null,box=new T.Box3(),center=new T.Vector3(0,1,0),extent=2,dpr=2,preset='front',dirty=true,renders=0;
 const onLost=e=>{e.preventDefault();lost?.();},onRestore=()=>restored?.();canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestore);
 function invalidate(){dirty=true;invalidated?.();}
 function resize(){invalidate();const r=host.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setPixelRatio(Math.min(devicePixelRatio||1,dpr,Math.sqrt(3000000/(w*h))));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();resized?.();}
 const ro=new ResizeObserver(resize);ro.observe(host);resize();
 function removeHelpers(){if(helpers){scene.remove(helpers);disposeObject(helpers);helpers=null;}}
 function view(name){dirty=true;camera.fov=34;preset=name;if(!model)return;const face=name==='face'||name==='peek',target=center.clone();if(face){const head=model.getObjectByName('Bip001Head');if(head)head.getWorldPosition(target);else target.y+=extent*.28;}
 const angle={front:0,quarter:Math.PI/4,side:Math.PI/2,back:Math.PI,face:0,peek:-.16,reset:0}[name]??0;const h=face?extent*(name==='peek'?.22:.27):box.getSize(new T.Vector3()).y;const distance=Math.max(h/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))),h/(2*camera.aspect*Math.tan(T.MathUtils.degToRad(camera.fov/2))))*1.2;
 orbit.target.copy(target);camera.position.set(target.x+Math.sin(angle)*distance,target.y,target.z+Math.cos(angle)*distance);camera.near=Math.max(.005,extent/500);camera.far=Math.max(100,extent*30);camera.updateProjectionMatrix();orbit.minDistance=extent*.08;orbit.maxDistance=extent*8;orbit.update();}
 const onOrbit=invalidate,onOrbitStart=()=>{preset='custom';invalidate();};orbit.addEventListener('change',onOrbit);orbit.addEventListener('start',onOrbitStart);
 return {T,canvas,renderer,scene,camera,orbit,resize,
 adopt(object){removeHelpers();model=object;scene.add(model);model.updateMatrixWorld(true);box.setFromObject(model);if(box.isEmpty()||![...box.min,...box.max].every(Number.isFinite))throw Error('Limites geométricos inválidos.');center=box.getCenter(new T.Vector3());extent=Math.max(.1,...box.getSize(new T.Vector3()).toArray());helpers=new T.Group();const skeleton=new T.SkeletonHelper(model);skeleton.name='skeleton';skeleton.visible=false;helpers.add(skeleton);const axes=new T.AxesHelper(extent*.2);axes.name='axes';axes.visible=false;helpers.add(axes);scene.add(helpers);view('front');},
 detach(object){scene.remove(object);if(object===model){removeHelpers();model=null;}},view,
 overlay(kind,on){if(helpers)helpers.getObjectByName(kind).visible=on;},
 quality(max){dpr=max;resize();},light(value){ambient.intensity=.85*value;key.intensity=value;rim.intensity=.46*value;},background(name){scene.background.set(({night:0xd6e9f5,gray:0x8d9faa,black:0x111d29})[name]??0xd6e9f5);},
 invalidate,draw({onlyIfDirty=false}={}){orbit.update();if(onlyIfDirty&&!dirty)return false;renderer.render(scene,camera);renders++;dirty=false;return true;},
 capture(){renderer.render(scene,camera);renders++;return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Captura indisponível.')),'image/png'));},
 restoreCamera(c){dirty=true;if(![c.position,c.target].every(a=>Array.isArray(a)&&a.length===3&&a.every(v=>Number.isFinite(v)&&Math.abs(v)<10000)))throw Error('Câmera inválida.');if(c.fov!==undefined){if(!Number.isFinite(c.fov)||c.fov<15||c.fov>90)throw Error('FOV inválido.');camera.fov=c.fov;camera.updateProjectionMatrix();}camera.position.fromArray(c.position);orbit.target.fromArray(c.target);preset=c.preset??'custom';orbit.update();},
 cameraConfig(){return {preset,position:camera.position.toArray(),target:orbit.target.toArray(),fov:camera.fov,aspect:camera.aspect};},
 info(){return {drawCalls:renderer.info.render.calls,renderedFrames:renders,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,dpr:renderer.getPixelRatio(),context:renderer.getContext().isContextLost()?'lost':'webgl2',gpuVram:'NOT_MEASURED'};},
 dispose(){ro.disconnect();removeHelpers();orbit.removeEventListener('change',onOrbit);orbit.removeEventListener('start',onOrbitStart);orbit.dispose();canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestore);renderer.dispose();canvas.remove();}
 };
}
