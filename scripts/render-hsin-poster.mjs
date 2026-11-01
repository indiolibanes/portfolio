/** Offline CPU approximation of the actual scene geometry. Not WebGL/material/FPS QA. */
import {readFile,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import sharp from 'sharp';
import {MOONLIT,createMoonlitEnvironment} from '../src/scripts/hsin-moonlit-environment.mjs';
import {HSIN_STAGE,cameraFit} from '../src/scripts/hsin-stage-config.mjs';
const [input,output,width='800',height='1100']=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/render-hsin-poster.mjs MODEL.glb POSTER.webp [WIDTH HEIGHT]');
const W=Number(width),H=Number(height);
if(!(W>0&&H>0&&W*H<=2500000))throw Error('Invalid CPU preview dimensions');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{};
const data=await readFile(input),jsSize=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+jsSize).toString()),binary=data.subarray(28+jsSize);
const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const bounds=new T.Box3(),v=new T.Vector3();
gltf.scene.traverse(m=>{if(!m.isSkinnedMesh)return;m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i++)bounds.expandByPoint(m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld));});
gltf.scene.position.y-=bounds.min.y;
async function decode(path){return sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
const sky=await decode(new URL('../public'+MOONLIT.sky,import.meta.url).pathname),moonPixels=await decode(new URL('../public'+MOONLIT.moon,import.meta.url).pathname);
const moonTexture=new T.Texture();moonTexture.userData.cpu=moonPixels;
const env=createMoonlitEnvironment({THREE:T,skyTexture:new T.Texture(),moonTexture}),scene=new T.Scene();scene.add(env.group,gltf.scene);
const platform=new T.Mesh(new T.CylinderGeometry(.79,.84,.075,48),new T.MeshStandardMaterial({color:HSIN_STAGE.colors.platform}));platform.position.y=-.042;scene.add(platform);
const ring=new T.Mesh(new T.RingGeometry(.79,.797,64),new T.MeshBasicMaterial({color:HSIN_STAGE.colors.ring,transparent:true,opacity:.42,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=-.002;scene.add(ring);
const distance=cameraFit({min:bounds.min.toArray(),max:bounds.max.toArray()},W/H),target=new T.Vector3(0,HSIN_STAGE.baseTargetY,0),camera=new T.PerspectiveCamera(HSIN_STAGE.fov,W/H,.03,45);
camera.position.set(0,HSIN_STAGE.baseTargetY+.23,distance);camera.lookAt(target);camera.updateMatrixWorld();env.frameSky(camera,target);scene.updateMatrixWorld(true);
const pixels=Buffer.alloc(W*H*4),depth=new Float32Array(W*H).fill(Infinity);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const at=(y*W+x)*4,from=(Math.min(511,Math.floor(y/H*512))*512+Math.min(511,Math.floor(x/W*512)))*4;
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
const normal=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3(),light=new T.Vector3(-2,4,5).normalize(),fog=[39,59,83];
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
    const tx=Math.max(0,Math.min(tex.info.width-1,Math.floor(sample('u')*tex.info.width))),ty=Math.max(0,Math.min(tex.info.height-1,Math.floor((mesh.material.map?.userData.cpu?1-sample('v'):sample('v'))*tex.info.height))),pixel=(ty*tex.info.width+tx)*4;
    const alpha=tex.data[pixel+3]/255*mat.opacity;if(alpha<Math.max(mat.alphaTest,.004))continue;
    const haze=mat.fog?Math.max(0,Math.min(1,(1/inv-10)/32)):0,f=haze*haze*(3-2*haze);
    for(let j=0;j<3;j++){const shade=mat.vertexColors?sample(['r','g','b'][j]):1,value=tex.data[pixel+j]*factor[j]*lighting*shade*(1-f)+fog[j]*f;pixels[at*4+j]=Math.min(255,value*alpha+pixels[at*4+j]*(1-alpha));}
    if(mat.depthWrite)depth[at]=z;
   }
  }
 }
}
await writeFile(output,await sharp(pixels,{raw:{width:W,height:H,channels:4}}).webp({quality:88}).toBuffer());
console.log(JSON.stringify({poster:output,width:W,height:H,method:'CPU approximation of scene geometry; not WebGL, normal-map, PBR or performance QA'}));
