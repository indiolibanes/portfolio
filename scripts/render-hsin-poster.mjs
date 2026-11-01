/** Reproducible offline CPU poster, not a WebGL screenshot or performance measurement. */
import {readFile,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import sharp from 'sharp';
const input=process.argv[2],output=process.argv[3];if(!input||!output)throw Error('Usage: node scripts/render-hsin-poster.mjs MODEL.glb POSTER.webp');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.ProgressEvent=class{};
const data=await readFile(input),jsSize=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+jsSize).toString()),binary=data.subarray(28+jsSize),gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');gltf.scene.updateMatrixWorld(true);
const W=800,H=1100,pixels=Buffer.alloc(W*H*4),depth=new Float32Array(W*H).fill(Infinity),bounds=new T.Box3(),meshes=[];
gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});for(const m of meshes){m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i++)bounds.expandByPoint(m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld));}
const distance=Math.max(bounds.max.y-bounds.min.y,(bounds.max.x-bounds.min.x)/(W/H))/(2*Math.tan(34*Math.PI/360))*1.16,camera=new T.PerspectiveCamera(34,W/H,.03,45);camera.position.set(0,1.11,distance);camera.lookAt(0,.88,0);camera.updateMatrixWorld();
const foot=new T.Vector3(0,0,0).project(camera),floorY=(1-foot.y)*H/2;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const t=y/H,glow=Math.exp(-((x/W-.5)**2*6+(t-.42)**2*5)),c=[8+glow*17,19+glow*39,41+glow*63];
 const e=((x-W/2)/(W*.39))**2+((y-floorY)/(H*.025))**2;if(e<1){const shade=1-e*.16;c[0]=24*shade;c[1]=48*shade;c[2]=74*shade;}
 const i=(y*W+x)*4;pixels[i]=c[0];pixels[i+1]=c[1];pixels[i+2]=c[2];pixels[i+3]=255;
}
const textures=new Map();
async function texture(mi){if(textures.has(mi))return textures.get(mi);const mat=json.materials[mi],idx=mat.pbrMetallicRoughness?.baseColorTexture?.index;let value;
 if(idx===undefined)value={data:Buffer.from([255,255,255,255]),info:{width:1,height:1}};
 else{const tex=json.textures[idx],im=json.images[tex.extensions?.EXT_texture_webp?.source??tex.source],v=json.bufferViews[im.bufferView];value=await sharp(binary.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength)).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
 textures.set(mi,value);return value;
}
const pos=new T.Vector3(),normal=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3(),light=new T.Vector3(2,4,5).normalize();
for(const m of meshes){
 const mi=json.materials.findIndex(x=>x.name===m.material.name),tex=await texture(mi),material=json.materials[mi],unlit=!!material.extensions?.KHR_materials_unlit,factor=material.pbrMetallicRoughness?.baseColorFactor??[1,1,1,1],g=m.geometry,uv=g.attributes.uv,positions=[],screen=[],count=g.attributes.position.count;
 for(let i=0;i<count;i++){m.getVertexPosition(i,pos).applyMatrix4(m.matrixWorld);positions.push(pos.clone());const z=pos.clone().applyMatrix4(camera.matrixWorldInverse).z;pos.project(camera);screen.push([(pos.x+1)*W/2,(1-pos.y)*H/2,pos.z,1/-z]);}
 const indices=g.index?.array??Array.from({length:count},(_,i)=>i);
 for(let k=0;k<indices.length;k+=3){
  const ids=[indices[k],indices[k+1],indices[k+2]],[a,b,c]=ids.map(i=>screen[i]);const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],c[1])));
  if(x1<x0||y1<y0)continue;const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-8)continue;
  normal.crossVectors(ab.subVectors(positions[ids[1]],positions[ids[0]]),ac.subVectors(positions[ids[2]],positions[ids[0]])).normalize();const lighting=unlit?1:.78+.22*Math.abs(normal.dot(light));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den,v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den,w=1-u-v;if(u<0||v<0||w<0)continue;const z=u*a[2]+v*b[2]+w*c[2],at=y*W+x;if(z>=depth[at])continue;
   const inv=u*a[3]+v*b[3]+w*c[3],s=(u*uv.getX(ids[0])*a[3]+v*uv.getX(ids[1])*b[3]+w*uv.getX(ids[2])*c[3])/inv,t=(u*uv.getY(ids[0])*a[3]+v*uv.getY(ids[1])*b[3]+w*uv.getY(ids[2])*c[3])/inv,tx=Math.max(0,Math.min(tex.info.width-1,Math.floor(s*tex.info.width))),ty=Math.max(0,Math.min(tex.info.height-1,Math.floor(t*tex.info.height))),p=(ty*tex.info.width+tx)*4;if(tex.data[p+3]<100)continue;
   depth[at]=z;for(let j=0;j<3;j++)pixels[at*4+j]=Math.min(255,tex.data[p+j]*factor[j]*lighting);
  }
 }
}
await writeFile(output,await sharp(pixels,{raw:{width:W,height:H,channels:4}}).webp({quality:88}).toBuffer());console.log(JSON.stringify({poster:output,width:W,height:H,method:'CPU approximation, not a browser screenshot'}));
