import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {partition,createDirector} from './shorekeeper-f16/director.mjs';

const page=await readFile('src/pages/experimentos/sk/index.astro','utf8');
const script=await readFile('src/scripts/shorekeeper-sk-lab.mjs','utf8');
const css=await readFile('src/styles/shorekeeper-sk-lab.css','utf8');
assert.match(page,/meta name="robots" content="noindex,nofollow,noarchive"/);
for(const tab of ['rig','visual','face','acting']) {
  assert.match(page,new RegExp('data-tab="'+tab+'"'));
  assert.match(page,new RegExp('data-pane="'+tab+'"'));
}
for(const control of ['skeleton','axes','wireframe','culling','bone','materials','background','light','dpr','morph','morphWeight','gazeX','gazeY','enter','transfer','exit'])assert.match(page,new RegExp('data-control="'+control+'"'));
assert.match(page,/type="file"/);
assert.match(script,/file\.arrayBuffer\(\)/);
assert.match(script,/new GLTFLoader\(\)\.parseAsync\(buffer,''\)/);
assert.match(script,/new T\.SkeletonHelper\(model\)/);
assert.match(script,/createDirector\(T,model,body,cloth/);
assert.match(script,/selectedBone\.quaternion\.copy/);
assert.match(script,/navigator\.clipboard\.writeText/);
assert.doesNotMatch(page+script,/https?:\/\//, 'No external asset service, CDN or upload endpoint');
assert.doesNotMatch(page+script,/fetch\s*\(|XMLHttpRequest|sendBeacon|FormData\s*\(/);
assert.doesNotMatch(page+script,/\/assets\/models\/shorekeeper|PRIVATE_shorekeeper_f01_experimental\.glb/);
assert.match(css,/max-width:930px/);
const q=(a)=>[0,Math.sin(a/2),0,Math.cos(a/2)];
const track=(name,a,b)=>new T.QuaternionKeyframeTrack(name+'.quaternion',[0,1],[...q(a),...q(b)]);
const body=new T.AnimationClip('Stand1_Action01_window',1,[track('arm',0,.3),track('cloth',0,0)]);
const cloth=new T.AnimationClip('Rib_Stand1_ClothLayer',.6,[track('cloth',0,.2)]);
const root=new T.Group(),b1=new T.Bone(),b2=new T.Bone();b1.name='arm';b2.name='cloth';root.add(b1,b2);
const clips=partition(T,body,cloth);assert.equal(clips.body.tracks.length,1);assert.equal(clips.baseline.tracks.length,1);assert.equal(clips.secondary.tracks.length,1);
const director=createDirector(T,root,body,cloth);director.start();
for(let i=0;i<100;i++)director.advance(.02);
assert.equal(director.state.phase,'idle');director.dispose();

const {assertSelfContainedGLB}=await import('../src/scripts/shorekeeper-sk-lab.mjs');
const pack=uri=>{
  const data={asset:{version:'2.0'},buffers:uri?[{byteLength:0,uri}]:[{byteLength:0}],images:[]};
  const raw=Buffer.from(JSON.stringify(data),'utf8'),pad=(4-(raw.length%4))%4,json=Buffer.concat([raw,Buffer.alloc(pad,32)]);
  const bytes=Buffer.alloc(20+json.length);bytes.write('glTF',0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(json.length,12);bytes.write('JSON',16);json.copy(bytes,20);
  return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length);
};
assert.doesNotThrow(()=>assertSelfContainedGLB(pack(null)));
assert.throws(()=>assertSelfContainedGLB(pack('https://example.invalid/secret.glb')),/referência externa/);
assert.throws(()=>assertSelfContainedGLB(new ArrayBuffer(4)),/inválido/);

console.log('Shorekeeper /experimentos/sk: route privacy, UI controls, shared director, cleanup contract PASS');
