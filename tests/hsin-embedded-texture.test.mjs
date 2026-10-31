// Public-safe synthetic fixture: tests glTF bufferView→image→texture→material binding.
// No character assets, model, textures, or derived proprietary files.
import assert from 'node:assert/strict';
import { readEmbeddedDiffuse } from '../src/scripts/hsin-glb-embedded-textures.mjs';

function glbTestBuffer() {
  const body = new Uint8Array([137,80,78,71,1,2,3,4,5,6,7,8]);
  const json = {
    asset: {version: '2.0'},
    buffers: [{byteLength: body.length}],
    bufferViews: [
      {buffer:0,byteOffset:0,byteLength:6},
      {buffer:0,byteOffset:6,byteLength:6},
    ],
    images: [
      {bufferView:0,mimeType:'image/png',name:'Synthetic_Face_RGBA'},
      {bufferView:1,mimeType:'image/png',name:'Synthetic_Eye_RGBA'},
    ],
    textures: [{source:0,sampler:0},{source:1,sampler:0}],
    samplers: [{magFilter:9729,minFilter:9729,wrapS:33071,wrapT:10497}],
    materials: [
      {name:'Synthetic Face',pbrMetallicRoughness:{baseColorTexture:{index:0,texCoord:0}}},
      {name:'Synthetic Eye',pbrMetallicRoughness:{baseColorTexture:{index:1,texCoord:1}}},
    ],
  };
  const data = new TextEncoder().encode(JSON.stringify(json));
  const jLen=(data.length+3)&~3, bLen=(body.length+3)&~3;
  const glb = new ArrayBuffer(12+8+jLen+8+bLen);
  const dv = new DataView(glb);
  dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,glb.byteLength,true);
  dv.setUint32(12,jLen,true);dv.setUint32(16,0x4e4f534a,true);
  new Uint8Array(glb,20,data.length).set(data);
  new Uint8Array(glb,20+data.length,jLen-data.length).fill(32);
  dv.setUint32(20+jLen,bLen,true);dv.setUint32(24+jLen,0x004e4942,true);
  new Uint8Array(glb,28+jLen,body.length).set(body);
  return glb;
}
const data=glbTestBuffer();
const maps=readEmbeddedDiffuse(data);
assert.equal(maps.size,2);
assert.equal(maps.get('face').imageName,'Synthetic_Face_RGBA');
assert.equal(maps.get('eye').imageName,'Synthetic_Eye_RGBA');
assert.equal(maps.get('face').texCoord,0);
assert.equal(maps.get('eye').texCoord,1);
assert.deepEqual(Array.from(maps.get('face').bytes),[137,80,78,71,1,2]);
assert.deepEqual(Array.from(maps.get('eye').bytes),[3,4,5,6,7,8]);
assert.equal(maps.get('face').sampler.wrapS,33071);
const broken=glbTestBuffer();
new DataView(broken).setUint32(8,123,true);
assert.throws(() => readEmbeddedDiffuse(broken), /GLB 2.0 inválido/);
console.log('Hsin embedded Face/Eye map resolution: PASS');
