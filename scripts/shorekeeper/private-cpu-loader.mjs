import fs from 'node:fs/promises';import crypto from 'node:crypto';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export async function loadPrivateCpuGLB(path){
 const raw=await fs.readFile(path),len=raw.readUInt32LE(12),json=JSON.parse(raw.subarray(20,20+len));
 const originalClips=json.animations?.map(c=>c.name)??[];
 // No fetches, image decode or GPU: the CPU parser needs only geometry, rig and animation accessors.
 for(const mesh of json.meshes??[])for(const prim of mesh.primitives)delete prim.material;
 delete json.materials;delete json.images;delete json.textures;
 const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
 const tail=raw.subarray(20+len),header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+tail.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const bytes=Buffer.concat([header,padded,tail]);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 return {gltf,originalClips,sha256:crypto.createHash('sha256').update(raw).digest('hex')};
}
