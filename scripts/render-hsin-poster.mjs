/** Offline CPU approximation of the actual scene geometry. Not WebGL/material/FPS QA. */
import {readFile,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import sharp from 'sharp';
import {MOONLIT,createMoonlitEnvironment} from '../src/scripts/hsin-moonlit-environment.mjs';
import {HSIN_STAGE,cameraFit} from '../src/scripts/hsin-stage-config.mjs';
import {HSIN_CINEMATIC_IDLE,createCinematicReference} from '../src/scripts/hsin-cinematic-idle.mjs';
import {createBakedPose} from '../src/scripts/hsin-baked-pose.mjs';
import {LUNAR_TERRACE,createLunarTerrace} from '../src/scripts/hsin-lunar-terrace.mjs';
import {createLunarPresentation} from '../src/scripts/hsin-lunar-presentation.mjs';
const [input,output,width='800',height='1100']=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/render-hsin-poster.mjs MODEL.glb POSTER.webp [WIDTH HEIGHT]');
const W=Number(width),H=Number(height);
const options=Object.fromEntries(process.argv.slice(6).map(arg=>arg.replace(/^--/,'').split('=')));
const cinematic=options.profile==='cinematic';
const rich=options.terrace==='rich',transparent=options.transparent==='1';
if(!(W>0&&H>0&&W*H<=2500000))throw Error('Invalid CPU preview dimensions');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{};
const data=await readFile(input),jsSize=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+jsSize).toString()),binary=data.subarray(28+jsSize);
const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const bounds=new T.Box3(),v=new T.Vector3();
gltf.scene.traverse(m=>{if(!m.isSkinnedMesh)return;m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i++)bounds.expandByPoint(m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld));});
gltf.scene.position.y-=bounds.min.y;
const meshes=[];gltf.scene.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});const bones=[...new Set(meshes.flatMap(m=>m.skeleton.bones))];
const poseProfile=JSON.parse(await readFile(new URL('../public/assets/models/hsin/hsin-v2.'+(cinematic?'1':'0')+'-profile.json',import.meta.url)));
if(cinematic)createCinematicReference({bones,profile:poseProfile}).apply();
let presentation;
if(options.orientation||rich){presentation=createLunarPresentation({THREE:T,model:gltf.scene,bones,bounds:poseProfile.bounds,cameraAzimuthDegrees:HSIN_CINEMATIC_IDLE.cameraAzimuthDegrees,...(options.legacy==='1'?{apparentBodyDegrees:Number(options.orientation??55)}:{bodyApparentYaw:Number(options.orientation??70),neckCompensation:Number(options.neck??4),headCompensation:Number(options.head??18.8)})});presentation.apply();}
if(options.gesture){
 const weight=Number(options.weight??1);if(!(weight>=0&&weight<=1))throw Error('Invalid gesture weight');
 const signature=['composition','duet'].includes(options.gesture)?createBakedPose({THREE:T,data:poseProfile.poses.signature,bones}):null;signature?.apply(1);
 const actor=createBakedPose({THREE:T,data:poseProfile.poses[options.gesture==='duet'?'chest':options.gesture],bones});actor.apply(weight);if(options.return==='1'){actor.restore();signature?.restore();}
}
async function decode(path){return sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
const resource=rich?LUNAR_TERRACE:MOONLIT,sky=transparent?null:await decode(new URL('../public'+resource.sky,import.meta.url).pathname);
async function cpuTexture(url){const t=new T.Texture();t.colorSpace=T.SRGBColorSpace;t.userData.cpu=await decode(new URL('../public'+url,import.meta.url).pathname);return t;}
let env={group:new T.Group(),frameSky(){},fog:new T.Fog(0x273b53,10,42)};
if(!transparent){
 const moonTexture=await cpuTexture(resource.moon);
 env=rich?createLunarTerrace({THREE:T,skyTexture:new T.Texture(),moonTexture,stoneTexture:await cpuTexture(LUNAR_TERRACE.stone),atlasTexture:await cpuTexture(LUNAR_TERRACE.atlas),waterTexture:await cpuTexture(LUNAR_TERRACE.water),feet:presentation.feet(),rootDegrees:presentation.parameters.rootDegrees}):createMoonlitEnvironment({THREE:T,skyTexture:new T.Texture(),moonTexture,includeTerrace:options.terrace!=='bare'});
 if(options.terrace==='bare'){const floor=new T.Mesh(new T.PlaneGeometry(22,14),new T.MeshBasicMaterial({color:0x354254}));floor.rotation.x=-Math.PI/2;floor.position.z=3;env.group.add(floor);}
 if(!rich&&options.terrace!=='bare'){
  const platform=new T.Mesh(new T.CylinderGeometry(.79,.84,.075,48),new T.MeshStandardMaterial({color:HSIN_STAGE.colors.platform}));platform.position.y=-.042;env.group.add(platform);
  const ring=new T.Mesh(new T.RingGeometry(.79,.797,64),new T.MeshBasicMaterial({color:HSIN_STAGE.colors.ring,transparent:true,opacity:.42,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=-.002;env.group.add(ring);
 }
}
const scene=new T.Scene();scene.add(env.group,gltf.scene);
const distance=options.shot==='upper'?1.55:cameraFit({min:bounds.min.toArray(),max:bounds.max.toArray()},W/H),target=new T.Vector3(0,options.shot==='upper'?1.3:HSIN_STAGE.baseTargetY,0),camera=new T.PerspectiveCamera(HSIN_STAGE.fov,W/H,.03,45);
const yaw=Number(options.yaw??(cinematic?HSIN_CINEMATIC_IDLE.cameraAzimuthDegrees:0))*Math.PI/180;
camera.position.set(Math.sin(yaw)*distance,target.y+.23,Math.cos(yaw)*distance);camera.lookAt(target);camera.updateMatrixWorld();env.frameSky(camera,target);scene.updateMatrixWorld(true);for(const m of meshes)m.skeleton.update();
const pixels=Buffer.alloc(W*H*4),depth=new Float32Array(W*H).fill(Infinity);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 if(transparent)continue;const at=(y*W+x)*4,from=(Math.min(sky.info.height-1,Math.floor(y/H*sky.info.height))*sky.info.width+Math.min(sky.info.width-1,Math.floor(x/W*sky.info.width)))*4;
 for(let j=0;j<3;j++)pixels[at+j]=sky.data[from+j];pixels[at+3]=255;
}
const decoded=new Map(),white={data:Buffer.from([255,255,255,255]),info:{width:1,height:1}};
async function texture(mesh){
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
const fogHex=env.fog.color.getHex(T.SRGBColorSpace),fog=[fogHex>>16&255,fogHex>>8&255,fogHex&255];
const normal=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3(),light=new T.Vector3(-2,4,5).normalize();
const srgb=c=>c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055;
for(const mesh of objects){
 const mat=mesh.material,tex=await texture(mesh),geometry=mesh.geometry,uv=geometry.attributes.uv,color=geometry.attributes.color,verts=[],count=geometry.attributes.position.count,hex=mat.color.getHex(T.SRGBColorSpace),factor=[hex>>16&255,hex>>8&255,hex&255].map(x=>x/255);
 for(let i=0;i<count;i++){
  mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
  verts.push({x:v.x,y:v.y,z:v.z,u:uv?.getX(i)??0,v:uv?.getY(i)??0,r:color?.getX(i)??1,g:color?.getY(i)??1,b:color?.getZ(i)??1});
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
    const map=mat.map;let su=sample('u')*(map?.repeat.x??1)+(map?.offset.x??0),sv=sample('v')*(map?.repeat.y??1)+(map?.offset.y??0);
    if(map?.wrapS===T.RepeatWrapping)su=((su%1)+1)%1;if(map?.wrapT===T.RepeatWrapping)sv=((sv%1)+1)%1;
    const tx=Math.max(0,Math.min(tex.info.width-1,Math.floor(su*tex.info.width))),ty=Math.max(0,Math.min(tex.info.height-1,Math.floor((map?.userData.cpu?1-sv:sv)*tex.info.height))),pixel=(ty*tex.info.width+tx)*4;
    const alpha=tex.data[pixel+3]/255*mat.opacity;if(alpha<Math.max(mat.alphaTest,.004))continue;
    const haze=mat.fog?Math.max(0,Math.min(1,(1/inv-env.fog.near)/(env.fog.far-env.fog.near))):0,f=haze*haze*(3-2*haze),oldAlpha=pixels[at*4+3]/255,outAlpha=alpha+oldAlpha*(1-alpha);
    for(let j=0;j<3;j++){const shade=mat.vertexColors?srgb(sample(['r','g','b'][j])):1,value=tex.data[pixel+j]*factor[j]*lighting*shade*(1-f)+fog[j]*f;pixels[at*4+j]=Math.min(255,(value*alpha+pixels[at*4+j]*oldAlpha*(1-alpha))/outAlpha);}pixels[at*4+3]=Math.round(outAlpha*255);
    if(mat.depthWrite)depth[at]=z;
   }
  }
 }
}
await writeFile(output,await sharp(pixels,{raw:{width:W,height:H,channels:4}}).webp({quality:88}).toBuffer());
console.log(JSON.stringify({poster:output,width:W,height:H,method:'CPU approximation of scene geometry; not WebGL, normal-map, PBR or performance QA'}));
