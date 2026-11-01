import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import sharp from 'sharp';
import {MOONLIT,createMoonlitEnvironment} from '../src/scripts/hsin-moonlit-environment.mjs';
import {HSIN_STAGE,cameraFit} from '../src/scripts/hsin-stage-config.mjs';

const skyTexture=new THREE.Texture(),moonTexture=new THREE.Texture();
const env=createMoonlitEnvironment({THREE,skyTexture,moonTexture}),scene=new THREE.Scene();scene.add(env.group);
const meshes=[];env.group.traverse(o=>{if(o.isMesh)meshes.push(o);});
const triangles=meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0);
assert.equal(meshes.length,6,'one moon/halo, two ridges, one lake, one reflection, one terrace');
assert.ok(triangles<600,`scenery triangles: ${triangles}`);
assert.ok(meshes.every(m=>m.material.isMeshBasicMaterial&&!m.castShadow));
assert.equal(env.background,skyTexture);
const moon=meshes.find(m=>m.name.startsWith('Full moon'));
assert.equal(moon.material.map,moonTexture);assert.equal(moon.material.depthWrite,false);assert.equal(moon.material.fog,false);
const ridges=meshes.filter(m=>m.name.startsWith('Distant shore'));assert.notEqual(ridges[0].position.z,ridges[1].position.z);
const profile=JSON.parse(await readFile(new URL('../public/assets/models/hsin/hsin-v2.0-profile.json',import.meta.url)));
// The full disc stays inside the initial view and the azimuth limits on phone/desktop.
for(const aspect of [393/852,320/740,16/9])for(const azimuth of [-HSIN_STAGE.maxAzimuth,0,HSIN_STAGE.maxAzimuth]){
 const camera=new THREE.PerspectiveCamera(HSIN_STAGE.fov,aspect,.03,45),target=new THREE.Vector3(0,HSIN_STAGE.baseTargetY,0),distance=cameraFit(profile.bounds,aspect);
 camera.position.set(Math.sin(azimuth)*distance,HSIN_STAGE.baseTargetY+.23,Math.cos(azimuth)*distance);camera.lookAt(target);camera.updateMatrixWorld();
 env.frameSky(camera,target);scene.updateMatrixWorld(true);
 const center=moon.getWorldPosition(new THREE.Vector3()),radius=MOONLIT.moonSize*MOONLIT.discRatio/2;
 for(const [x,y]of [[-radius,0],[radius,0],[0,-radius],[0,radius]]){
  const point=new THREE.Vector3(x,y,0).applyQuaternion(camera.quaternion).add(center).project(camera);
  assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1,`full moon clipped: aspect=${aspect}, azimuth=${azimuth}, ndc=${point.toArray()}`);
 }
 const focus=target.clone().project(camera);assert.ok(Math.hypot(focus.x,focus.y)<1e-10,'Hsin target stays at image center');
}
let bytes=0;
for(const url of [MOONLIT.sky,MOONLIT.moon]){
 const file=new URL('../public'+url,import.meta.url),meta=await sharp(file.pathname).metadata();
 bytes+=(await stat(file)).size;assert.equal(meta.width,512);assert.equal(meta.height,512);
}
assert.ok(bytes<80*1024,`texture download budget: ${bytes}`);
console.log(`Moonlit scenery PASS: ${meshes.length} draws, ${triangles} triangles, ${bytes} texture bytes, moon framing in portrait/landscape and both orbit limits (not WebGL/FPS QA).`);
