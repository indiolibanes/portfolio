import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import sharp from 'sharp';
import {MOONLIT,createMoonlitEnvironment} from '../src/scripts/hsin-moonlit-environment.mjs';
import {HSIN_STAGE,cameraFit} from '../src/scripts/hsin-stage-config.mjs';
import {lunarCameraFit} from '../src/scripts/hsin-lunar-framing.mjs';
import {HSIN_LUNAR_PRESENTATION} from '../src/scripts/hsin-lunar-presentation.mjs';

const skyTexture=new THREE.Texture(),moonTexture=new THREE.Texture();
const env=createMoonlitEnvironment({THREE,skyTexture,moonTexture}),scene=new THREE.Scene();scene.add(env.group);
const meshes=[];env.group.traverse(o=>{if(o.isMesh)meshes.push(o);});
const triangles=meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0);
assert.equal(meshes.length,7,'solid spherical moon AND halo, two ridges, lake, reflection, terrace');
assert.ok(triangles<3400,`sphere-inclusive scenery budget: ${triangles}`);
assert.ok(meshes.every(m=>!m.castShadow));
assert.equal(env.background,skyTexture);
const moon=meshes.find(m=>m.name.startsWith('Full moon'));
assert.ok(moon.geometry.type==='SphereGeometry'&&moon.material.isShaderMaterial);assert.equal(moon.material.uniforms.lunarMap.value,moonTexture);assert.equal(moon.material.depthWrite,true);assert.equal(moon.material.fog,false);
const halo=meshes.find(m=>m.name.includes('atmospheric halo'));assert.equal(halo.material.map,moonTexture);assert.equal(halo.material.depthWrite,false);
assert.ok(meshes.filter(m=>m!==moon).every(m=>m.material.isMeshBasicMaterial));
const ridges=meshes.filter(m=>m.name.startsWith('Distant shore'));assert.notEqual(ridges[0].position.z,ridges[1].position.z);
const profile=JSON.parse(await readFile(new URL('../public/assets/models/hsin/hsin-v2.0-profile.json',import.meta.url)));
// The real public reset camera frames the sphere. Orbit exposes parallax; it must NOT billboard/follow the camera.
scene.updateMatrixWorld(true);const fixed=moon.matrixWorld.clone();
for(const aspect of [393/852,320/740,768/1024,844/390,16/9])for(const azimuth of [-HSIN_STAGE.maxAzimuth,HSIN_LUNAR_PRESENTATION.cameraAzimuth*Math.PI/180,HSIN_STAGE.maxAzimuth]){
 const fit=lunarCameraFit(aspect),camera=new THREE.PerspectiveCamera(HSIN_STAGE.fov,aspect,.03,45),target=new THREE.Vector3(...fit.target),distance=fit.distance;
 camera.position.set(target.x+Math.sin(azimuth)*distance,target.y+.23,target.z+Math.cos(azimuth)*distance);camera.lookAt(target);camera.updateMatrixWorld();
 env.frameSky(camera,target);scene.updateMatrixWorld(true);
 assert.deepEqual(moon.matrixWorld.elements,fixed.elements,'moon remains fixed during orbit');
 const positions=moon.geometry.attributes.position;
 if(azimuth===HSIN_LUNAR_PRESENTATION.cameraAzimuth*Math.PI/180)for(let i=0;i<positions.count;i++){
  const point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(moon.matrixWorld).project(camera);
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
