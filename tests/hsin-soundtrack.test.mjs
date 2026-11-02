import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {musicEmbed} from '../src/scripts/hsin-music-providers.mjs';
import {createMusicTower,towerViewport} from '../src/scripts/hsin-music-tower.mjs';

const script=await readFile('src/scripts/hsin-soundtrack.ts','utf8');
const component=await readFile('src/components/HsinSoundtrack.astro','utf8');
const headers=await readFile('public/_headers','utf8');
const page=await readFile('src/pages/experimentos/index.astro','utf8');
assert.match(page,/<HsinSoundtrack\s*\/>/);
assert.match(component,/© 2026 <strong>KURO GAMES<\/strong>/);
assert.match(component,/Jaime Arin/);
assert.doesNotMatch(component,/<audio\b|<video\b/);
assert.doesNotMatch(script,/fetch\(|AudioContext|new Audio\(/);
assert.match(headers,/frame-src https:\/\/www.youtube-nocookie.com https:\/\/www.youtube.com https:\/\/open.spotify.com;/);
assert.equal(musicEmbed('unknown'),null);
assert.equal(new URL(musicEmbed('youtube',66).src).searchParams.get('start'),'66');
assert.equal(new URL(musicEmbed('youtube',22).src).searchParams.get('start'),null);
assert.equal(new URL(musicEmbed('youtube').src).searchParams.get('autoplay'),'0');
assert.match(musicEmbed('spotify').allow,/encrypted-media/);

class Element {
  constructor(data={}){this.dataset=data;this.hidden=false;this.attrs={};this.events={};this.style={setProperty(){}};this.offsetHeight=300;this.offsetWidth=320;}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
  dispatchEvent(event){for(const fn of this.events[event.type]??[])fn(event);return true;}
  click(){this.dispatchEvent({type:'click'});}
  setAttribute(key,value){this.attrs[key]=value;}
  focus(){this.focused=true;}
  replaceChildren(...nodes){this.children=nodes;}
}
const root=new Element({soundtrackSide:'right'}),stage=new Element();
const player=new Element(),placeholder=new Element(),status=new Element(),options=new Element(),info=new Element(),side=new Element();
options.hidden=true;
const buttons=['youtube','spotify','none'].map(musicProvider=>new Element({musicProvider}));
const starts=[0,66].map(soundtrackStart=>new Element({soundtrackStart:String(soundtrackStart)}));
root.closest=()=>stage;
const map={'[data-soundtrack-player]':player,'[data-soundtrack-placeholder]':placeholder,'[data-soundtrack-status]':status,'[data-soundtrack-options]':options,'[data-soundtrack-options-toggle]':info,'[data-soundtrack-side-toggle]':side};
root.querySelector=key=>map[key];root.querySelectorAll=key=>key==='[data-music-provider]'?buttons:starts;
const document=new Element();document.createElement=()=>new Element();
const window=new Element();
let playerVisibilityCallback;
const code=stripTypeScriptTypes(script.replace(/import .*?;\n/,''),{mode:'strip'}).replace('export function','function')+'\nmountHsinSoundtrack(root);';
vm.runInNewContext(code,{root,document,window,musicEmbed,CustomEvent:class{constructor(type){this.type=type;}},ResizeObserver:class{observe(){}},IntersectionObserver:class{constructor(callback){playerVisibilityCallback=callback;}observe(){}}});
assert.equal(player.children,undefined,'no third-party iframe before opt-in');
buttons[0].click();const youtube=player.children[0];assert.match(youtube.src,/youtube-nocookie/);
info.click();assert.equal(options.hidden,false);info.click();side.click();buttons[0].click();
assert.equal(player.children[0],youtube,'info, side changes and same-provider click preserve the iframe');
buttons[1].click();const spotify=player.children[0];assert.notEqual(spotify,youtube);assert.match(spotify.src,/open.spotify.com\/embed\/album/);
assert.equal(player.children.length,1,'no simultaneous providers');
info.click();assert.equal(player.children[0],spotify);
root.dispatchEvent({type:'keydown',key:'Escape'});assert.equal(options.hidden,true);assert.equal(player.children[0],spotify);
buttons[2].click();assert.equal(player.children[0],placeholder);assert.equal(root.dataset.towerState,'no-music-fallback');
buttons[0].click();document.hidden=true;document.dispatchEvent({type:'visibilitychange'});assert.equal(player.children[0],placeholder);
buttons[0].click();playerVisibilityCallback([{intersectionRatio:.4}]);assert.equal(player.children[0],placeholder,'offscreen YouTube is stopped');
buttons[1].click();window.dispatchEvent({type:'pagehide'});assert.equal(player.children[0],placeholder);
starts[1].click();assert.equal(new URL(player.children[0].src).searchParams.get('start'),'66');assert.ok(info.focused);

// Actual Three geometry: no GLB changes, finite matrices, peripheral lane, bounded cost.
const element=new Element({soundtrackSide:'right'});element.closest=()=>({getBoundingClientRect:()=>({width:1280,height:800})});element.removeAttribute=()=>{};element.style.removeProperty=()=>{};
const host={clientWidth:1280,clientHeight:800};
const tower=createMusicTower({THREE,mergeGeometries,element,host});
const camera=new THREE.PerspectiveCamera(35,1280/800,.03,45),target=new THREE.Vector3(0,1,0);camera.position.set(0,1.3,4);camera.lookAt(target);
for(const side of ['left','right'])for(const angle of [-.65,0,.65]){
  element.dataset.soundtrackSide=side;camera.position.set(Math.sin(angle)*4,1.3,Math.cos(angle)*4);camera.lookAt(target);tower.update(camera,target,true);
  const x=towerViewport(1280,800,320,300,side).x;
  assert.ok(side==='right'?x-160>1280*.64:x+160<1280*.36,'panel stays out of central attention lane');
  tower.group.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
}
let draws=0,triangles=0;tower.group.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});
assert.ok(draws<=6);assert.ok(triangles<6500);
const volume=new THREE.Box3().setFromObject(tower.group);
assert.ok(volume.getSize(new THREE.Vector3()).z>.3,'pavilion has real architectural depth');
for(const [width,height] of [[320,740],[393,852],[844,390]]){
 host.clientWidth=width;host.clientHeight=height;tower.invalidateLayout();
 element.closest=()=>({getBoundingClientRect:()=>({width,height})});
 camera.aspect=width/height;camera.updateProjectionMatrix();tower.update(camera,target,true);
 assert.equal(tower.group.visible,true,'mobile retains the real 3D pavilion beside the legible provider bay');
 assert.equal(element.dataset.towerAnchor,'bay');
}
let disposals=0;tower.group.traverse(o=>{if(o.isMesh)o.geometry.addEventListener('dispose',()=>disposals++);});
assert.equal(towerViewport(390,844,320,300).compact,true);assert.equal(towerViewport(844,390,234,300).compact,true);
tower.dispose();assert.equal(disposals,draws);
console.log(`Hsin music tower PASS: opt-in, persistent iframe, switching, silence, teardown, peripheral placement; ${draws} draws / ${triangles} triangles.`);
