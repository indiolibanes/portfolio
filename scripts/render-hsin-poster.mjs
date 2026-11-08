/** Offline CPU approximation of the actual scene geometry. Not WebGL/material/FPS QA. */
import {readFile,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import sharp from 'sharp';
import {pathToFileURL} from 'node:url';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createMusicTower} from '../src/scripts/hsin-music-tower.mjs';
import {createCinematicReference} from '../src/scripts/hsin-cinematic-idle.mjs';
import {createLunarPresentation,HSIN_LUNAR_PRESENTATION} from '../src/scripts/hsin-lunar-presentation.mjs';
import {LUNAR_TERRACE,createLunarTerrace} from '../src/scripts/hsin-lunar-terrace.mjs';
import {lunarCameraFit} from '../src/scripts/hsin-lunar-framing.mjs';
import {decodeDanceData} from '../src/scripts/hsin-dance-data.mjs';
import {createDancePose} from '../src/scripts/hsin-dance-pose.mjs';
import {createReveriePose,decodeReverieData} from '../src/scripts/hsin-dance-reverie.mjs';
import {MOONLIT,createMoonlitEnvironment} from '../src/scripts/hsin-moonlit-environment.mjs';
import {HSIN_STAGE,cameraFit} from '../src/scripts/hsin-stage-config.mjs';
const [input,output,width='800',height='1100']=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/render-hsin-poster.mjs MODEL.glb POSTER.webp [WIDTH HEIGHT]');
const W=Number(width),H=Number(height),options=Object.fromEntries(process.argv.slice(6).map(v=>v.replace(/^--/,'').split('='))),dance=options.dance;
if(!(W>0&&H>0&&W*H<=2500000))throw Error('Invalid CPU preview dimensions');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{};
const data=await readFile(input),jsSize=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+jsSize).toString()),binary=data.subarray(28+jsSize);
const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const bounds=new T.Box3(),v=new T.Vector3();
gltf.scene.traverse(m=>{if(!m.isSkinnedMesh)return;m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i++)bounds.expandByPoint(m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld));});
gltf.scene.position.y-=bounds.min.y;
async function decode(path){return sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
let presentation;
if(dance){const profile=JSON.parse(await readFile('public/assets/models/hsin/hsin-v2.1-profile.json')),baked=decodeDanceData(JSON.parse(await readFile('public/assets/animations/hsin/lunar-dance-'+(options.r2?'r2':'r1')+'.json'))),meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))];createCinematicReference({bones,profile}).apply();gltf.scene.updateMatrixWorld(true);presentation=createLunarPresentation({THREE:T,model:gltf.scene,bones,bounds:profile.bounds});presentation.apply();if(options.r3&&dance!=='idle'){const reverie=createReveriePose({THREE:T,data:decodeReverieData(JSON.parse(await readFile('public/assets/animations/hsin/lunar-dance-r3'+(options.grand?'-grand':'')+'.json'))),bones,model:gltf.scene});reverie.apply(dance,Number(options.phase??.5),Number(options.weight??1),Number(options.amplitude??1));}else if(dance!=='idle')createDancePose({THREE:T,data:baked,bones,model:gltf.scene}).apply(dance,Number(options.phase??.5),Number(options.weight??1));gltf.scene.updateMatrixWorld(true);for(const m of meshes)m.skeleton.update();}
if(options.combat){
 const {decodeCombatData}=await import('../src/scripts/hsin-combat-data.mjs');
 const {createCombatPose}=await import('../src/scripts/hsin-combat-pose.mjs');
 const version=options.combat==='r2'?'r2':'r1';
 const data=decodeCombatData(JSON.parse(await readFile(options.combatPath??('public/assets/animations/hsin/combat-'+version+'.json'))));
 const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
 const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))];
 createCombatPose({T,data,bones,model:gltf.scene}).apply(Math.min(1,Math.max(0,Number(options.time??0)/data.seconds)));
 if(options.expression){
  const {snapshotFace,createFaceBinding}=await import('../src/scripts/hsin-face-binding.mjs');
  const profile=JSON.parse(await readFile('public/assets/models/hsin/hsin-v2.1-profile.json'));
  const binding=createFaceBinding(meshes,snapshotFace(meshes),profile.calibration,profile);
  const effort=options.expression==='effort'?.05:0;
  binding.apply({policy:'b1',gaze:[0,0,0],closeL:0,closeR:0,smileL:options.expression==='serene'?.045:0,smileR:0,overlays:{E_Squint_L:effort,E_Squint_R:effort,M_Squint_L:effort*.5,M_Squint_R:effort*.5,B_Up_Add_R:options.expression==='anticipation'?.05:0}});
 }
 gltf.scene.updateMatrixWorld(true);for(const mesh of meshes)mesh.skeleton.update();
}
const resource=dance?LUNAR_TERRACE:MOONLIT,sky=await decode(new URL('../public'+resource.sky,import.meta.url).pathname);
async function scenery(url){const t=new T.Texture();t.userData.cpu=await decode(new URL('../public'+url,import.meta.url).pathname);return t;}
const moonTexture=await scenery(resource.moon),env=dance?createLunarTerrace({THREE:T,skyTexture:new T.Texture(),moonTexture,stoneTexture:await scenery(resource.stone),atlasTexture:await scenery(resource.atlas),waterTexture:await scenery(resource.water),feet:presentation.feet(),rootDegrees:presentation.parameters.rootDegrees}):createMoonlitEnvironment({THREE:T,skyTexture:new T.Texture(),moonTexture}),scene=new T.Scene();scene.add(env.group,gltf.scene);
if(!dance){const platform=new T.Mesh(new T.CylinderGeometry(.79,.84,.075,48),new T.MeshStandardMaterial({color:HSIN_STAGE.colors.platform}));platform.position.y=-.042;scene.add(platform);const ring=new T.Mesh(new T.RingGeometry(.79,.797,64),new T.MeshBasicMaterial({color:HSIN_STAGE.colors.ring,transparent:true,opacity:.42,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=-.002;scene.add(ring);}
const framing=dance?lunarCameraFit(W/H):null,distance=framing?.distance??cameraFit({min:bounds.min.toArray(),max:bounds.max.toArray()},W/H),target=framing?new T.Vector3(...framing.target):new T.Vector3(0,HSIN_STAGE.baseTargetY,0),camera=new T.PerspectiveCamera(HSIN_STAGE.fov,W/H,.03,45);let yaw=Number(options.yaw??(dance?HSIN_LUNAR_PRESENTATION.cameraAzimuth:0))*Math.PI/180;
// --relYaw=DEG: camera azimuth relative to the body's own facing (from the planted thighs), so "front", "three-quarter"
// and "profile" mean the same thing whatever root yaw the pose carries.
if(options.relYaw!==undefined){
 const l=gltf.scene.getObjectByName('ORG-Bip001ThighL').getWorldPosition(new T.Vector3()),r=gltf.scene.getObjectByName('ORG-Bip001ThighR').getWorldPosition(new T.Vector3());
 const facing=l.sub(r).setY(0).normalize().cross(new T.Vector3(0,1,0));yaw=Math.atan2(facing.x,facing.z)+Number(options.relYaw)*Math.PI/180;
}
camera.position.set(target.x+Math.sin(yaw)*distance,target.y+.23,target.z+Math.cos(yaw)*distance);
// QA close-ups on an arm joint (Combat R2.0.1): --focus=handR|elbowR|handL|elbowL [--dist=0.55] [--lift=0].
if(options.focus){
 const joint={handR:'ORG-Bip001HandR',elbowR:'ORG-Bip001ForearmR',handL:'ORG-Bip001HandL',elbowL:'ORG-Bip001ForearmL',chest:'ORG-Bip001Spine2'}[options.focus];
 const node=joint&&gltf.scene.getObjectByName(joint);if(!node)throw Error('Unknown focus '+options.focus);
 const focus=node.getWorldPosition(new T.Vector3()),d=Number(options.dist??.55);
 camera.position.set(focus.x+Math.sin(yaw)*d,focus.y+Number(options.lift??0),focus.z+Math.cos(yaw)*d);target.copy(focus);
}
if(options.detail){
 const head=gltf.scene.getObjectByName('ORG-Bip001Head'),focus=head.getWorldPosition(new T.Vector3());focus.y-=.03;
 camera.position.set(focus.x+Math.sin(yaw)*.6,focus.y+.025,focus.z+Math.cos(yaw)*.6);target.copy(focus);
}
camera.lookAt(target);camera.updateMatrixWorld();env.frameSky(camera,target);scene.updateMatrixWorld(true);
if(options.pavilion){
 const factory=options.towerPath?(await import(pathToFileURL(options.towerPath).href)).createMusicTower:createMusicTower;
 const element={dataset:{soundtrackSide:'right',provider:'youtube'},offsetWidth:Math.min(280,W*.23),offsetHeight:H*.46,style:{setProperty(){},removeProperty(){}},addEventListener(){},removeAttribute(){},closest:()=>({getBoundingClientRect:()=>({width:W,height:H})})};
 const tower=factory({THREE:T,mergeGeometries,element,host:{clientWidth:W,clientHeight:H}});scene.add(tower.group);tower.update(camera,target,true);scene.updateMatrixWorld(true);
}
const pixels=Buffer.alloc(W*H*4),depth=new Float32Array(W*H).fill(Infinity);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const at=(y*W+x)*4,from=(Math.min(sky.info.height-1,Math.floor(y/H*sky.info.height))*sky.info.width+Math.min(sky.info.width-1,Math.floor(x/W*sky.info.width)))*4;
 for(let j=0;j<3;j++)pixels[at+j]=sky.data[from+j];pixels[at+3]=255;
}
const decoded=new Map(),white={data:Buffer.from([255,255,255,255]),info:{width:1,height:1}};
async function texture(mesh){
 if(mesh.material.uniforms?.lunarMap)return mesh.material.uniforms.lunarMap.value.userData.cpu;
 if(mesh.material.map?.userData.cpu)return mesh.material.map.userData.cpu;
 const mi=json.materials.findIndex(x=>x.name===mesh.material.name),mat=json.materials[mi],idx=mat?.pbrMetallicRoughness?.baseColorTexture?.index;
 if(idx===undefined)return white;if(decoded.has(idx))return decoded.get(idx);
 const tex=json.textures[idx],im=json.images[tex.extensions?.EXT_texture_webp?.source??tex.source],b=json.bufferViews[im.bufferView];
 const value=await decode(binary.subarray(b.byteOffset??0,(b.byteOffset??0)+b.byteLength));decoded.set(idx,value);return value;
}
const objects=[];scene.traverse(m=>{if(m.isMesh)objects.push(m);});
objects.sort((a,b)=>Number(a.material.transparent)-Number(b.material.transparent)||(a.material.transparent?b.getWorldPosition(new T.Vector3()).distanceToSquared(camera.position)-a.getWorldPosition(new T.Vector3()).distanceToSquared(camera.position):0));
// Clip triangles against the near plane before projecting large lake/terrace surfaces.
function clipNear(triangle){
 const out=[];
 for(let i=0;i<triangle.length;i++){
  const a=triangle[i],b=triangle[(i+1)%triangle.length],inside=a.z<=-.03,next=b.z<=-.03;
  if(inside)out.push(a);
  if(inside!==next){const t=(-.03-a.z)/(b.z-a.z),p={};for(const key of ['x','y','z','u','v','r','g','b'])p[key]=a[key]+(b[key]-a[key])*t;out.push(p);}
 }return out;
}
const normal=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3(),light=new T.Vector3(-2,4,5).normalize(),fog=[39,59,83];
for(const mesh of objects){
 const mat=mesh.material,tex=await texture(mesh),geometry=mesh.geometry,uv=geometry.attributes.uv,color=geometry.attributes.color,verts=[],count=geometry.attributes.position.count,hex=(mat.color??new T.Color(0xe8d4a3)).getHex(T.SRGBColorSpace),factor=[hex>>16&255,hex>>8&255,hex&255].map(x=>x/255);
 for(let i=0;i<count;i++){
  mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
  verts.push({x:v.x,y:v.y,z:v.z,u:mat.isShaderMaterial?.5+geometry.attributes.position.getX(i)/mesh.geometry.parameters.radius*292/1024:uv?.getX(i)??0,v:mat.isShaderMaterial?.5+geometry.attributes.position.getY(i)/mesh.geometry.parameters.radius*292/1024:uv?.getY(i)??0,r:color?.getX(i)??1,g:color?.getY(i)??1,b:color?.getZ(i)??1});
 }
 const indices=geometry.index?.array??Array.from({length:count},(_,i)=>i);
 for(let k=0;k<indices.length;k+=3){
  const poly=clipNear([verts[indices[k]],verts[indices[k+1]],verts[indices[k+2]]]);
  for(let n=1;n<poly.length-1;n++){
   const vertex=[poly[0],poly[n],poly[n+1]],points=vertex.map(p=>{v.set(p.x,p.y,p.z).applyMatrix4(camera.projectionMatrix);return [(v.x+1)*W/2,(1-v.y)*H/2,v.z,1/-p.z];}),[a,b,c]=points;
   const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],c[1])));
   if(x1<x0||y1<y0)continue;
   const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-8)continue;
   const [p,q,r]=vertex;normal.crossVectors(ab.set(q.x-p.x,q.y-p.y,q.z-p.z),ac.set(r.x-p.x,r.y-p.y,r.z-p.z)).normalize();
   const lighting=mat.isMeshBasicMaterial?1:.8+.2*Math.abs(normal.dot(light));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den,w=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den,t=1-u-w;if(u<0||w<0||t<0)continue;
    const z=u*a[2]+w*b[2]+t*c[2],at=y*W+x;if(z>=depth[at]||z>1)continue;
    const inv=u*a[3]+w*b[3]+t*c[3],sample=key=>(u*p[key]*a[3]+w*q[key]*b[3]+t*r[key]*c[3])/inv;
    const tx=Math.max(0,Math.min(tex.info.width-1,Math.floor(sample('u')*tex.info.width))),ty=Math.max(0,Math.min(tex.info.height-1,Math.floor((mesh.material.map?.userData.cpu?1-sample('v'):sample('v'))*tex.info.height))),pixel=(ty*tex.info.width+tx)*4;
    const alpha=tex.data[pixel+3]/255*mat.opacity;if(alpha<Math.max(mat.alphaTest,.004))continue;
    const haze=mat.fog?Math.max(0,Math.min(1,(1/inv-10)/32)):0,f=haze*haze*(3-2*haze);
    for(let j=0;j<3;j++){const shade=mat.vertexColors?sample(['r','g','b'][j]):1,value=tex.data[pixel+j]*factor[j]*lighting*shade*(1-f)+fog[j]*f;pixels[at*4+j]=Math.min(255,value*alpha+pixels[at*4+j]*(1-alpha));}
    if(mat.depthWrite)depth[at]=z;
   }
  }
 }
}
// QA overlay (Combat R2.0.1): --joints=1 draws shoulder–elbow–wrist–middle fingertip, right arm orange, left arm cyan.
if(options.joints){
 const dot=(x,y,c,r=3)=>{for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){const X=Math.round(x+i),Y=Math.round(y+j);if(X<0||Y<0||X>=W||Y>=H||i*i+j*j>r*r)continue;const at=(Y*W+X)*4;pixels[at]=c[0];pixels[at+1]=c[1];pixels[at+2]=c[2];}};
 const line=(a,b,c)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let k=0;k<=n;k++)dot(a[0]+(b[0]-a[0])*k/Math.max(1,n),a[1]+(b[1]-a[1])*k/Math.max(1,n),c,1);};
 for(const [side,color] of [['R',[255,150,40]],['L',[60,220,255]]]){
  const pts=['UpperArm','Forearm','Hand','Finger22'].map(n=>{const p=gltf.scene.getObjectByName('ORG-Bip001'+n+side).getWorldPosition(new T.Vector3()).project(camera);return [(p.x+1)*W/2,(1-p.y)*H/2];});
  for(let k=0;k<3;k++)line(pts[k],pts[k+1],color);pts.forEach(p=>dot(p[0],p[1],color,4));
 }
}
await writeFile(output,await sharp(pixels,{raw:{width:W,height:H,channels:4}}).webp({quality:88}).toBuffer());
console.log(JSON.stringify({poster:output,width:W,height:H,method:'CPU approximation of scene geometry; not WebGL, normal-map, PBR or performance QA'}));
