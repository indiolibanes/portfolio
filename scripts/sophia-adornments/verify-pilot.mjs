/** CPU equivalence + ownership audit; not WebGL/Android approval. */
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash}from'node:crypto';
import * as T from 'three';import {GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
const sourcePath=process.argv[2]||'public/experimental/sophia-alpha.glb',pilotPath=process.argv[3]||'local-private/adornments-r1/sophia-6h-adornments-pilot.glb';
const hash=b=>createHash('sha256').update(b).digest('hex');
function unpack(b){const n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString());return{g,bin:b.subarray(28+n)}}
async function parse(b){const loader=new GLTFLoader();loader.register(()=>({name:'CPU_ONLY_SKIP_IMAGE_DECODE',loadTexture:()=>Promise.resolve(new T.Texture())}));return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')}
function stats(g){const geos=new Set(),mats=new Set(),textures=new Set(),skeletons=new Set();let meshes=0,triangles=0;g.scene.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;geos.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}});return{meshes,triangles,geometries:geos.size,materials:mats.size,textures:textures.size,skeletons:skeletons.size,sets:{geos,mats,textures,skeletons}}}
function dispose(g,mixer){if(mixer){mixer.stopAllAction();mixer.uncacheRoot(g.scene)}const s=stats(g);g.scene.removeFromParent();for(const x of s.sets.geos)x.dispose();for(const x of s.sets.textures)x.dispose();for(const x of s.sets.mats)x.dispose();for(const x of s.sets.skeletons)x.dispose();return{ownedSceneChildren:0,disposedGeometries:s.geometries,disposedTextures:s.textures,disposedMaterials:s.materials}}
function pose(g,mixer,name,t){mixer.stopAllAction();const c=g.animations.find(c=>c.name===name);mixer.time=0;const a=mixer.clipAction(c);a.reset().setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();mixer.setTime(t);g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()})}
const sourceBytes=await fs.readFile(sourcePath),pilotBytes=await fs.readFile(pilotPath),a=unpack(sourceBytes),b=unpack(pilotBytes);
assert.equal(hash(sourceBytes),'3b0e7db84809d6e4fe6eaa2bc6299874c202c529adcbd369cf83c6a29d3c3a2a');assert.equal(hash(a.bin),hash(b.bin));
for(const k of ['accessors','bufferViews','materials','images','textures','skins','animations'])assert.deepEqual(b.g[k],a.g[k],k+' changed');
assert.equal(b.g.meshes[0].primitives.length,a.g.meshes[0].primitives.length-3);assert.equal(b.g.nodes.length,a.g.nodes.length+4);assert.equal(b.g.skins[0].joints.length,101);assert.equal(b.g.animations.length,5);
const original=await parse(sourceBytes),pilot=await parse(pilotBytes),ma=new T.AnimationMixer(original.scene),mb=new T.AnimationMixer(pilot.scene);
const primMap=g=>{const m=new Map();g.scene.traverse(o=>{const a=g.parser.associations.get(o);if(o.isMesh&&a?.meshes!==undefined)m.set(`${a.meshes}:${a.primitives??0}`,o)});return m};const am=primMap(original),bm=primMap(pilot);
assert.ok(am.get('0:9')&&bm.get('3:0'),'Actual GLTFLoader primitive association missing');
let maxSocketError=0,maxStarVertexError=0;const samples=[];const va=new T.Vector3(),vb=new T.Vector3();
for(const clip of original.animations){
 for(let i=0;i<=50;i++){
  const t=clip.duration*i/50;pose(original,ma,clip.name,t);pose(pilot,mb,clip.name,t);
  for(const n of ['Book','Pen','head','hand_L','hand_R']){const x=original.scene.getObjectByName(n),y=pilot.scene.getObjectByName(n);assert.ok(x&&y,n);for(let k=0;k<16;k++)maxSocketError=Math.max(maxSocketError,Math.abs(x.matrixWorld.elements[k]-y.matrixWorld.elements[k]))}
  for(let k=0;k<3;k++){const x=am.get(`0:${9+k}`),y=bm.get(`3:${k}`);for(let v=0;v<x.geometry.attributes.position.count;v++){x.getVertexPosition(v,va).applyMatrix4(x.matrixWorld);y.getVertexPosition(v,vb).applyMatrix4(y.matrixWorld);maxStarVertexError=Math.max(maxStarVertexError,va.distanceTo(vb))}}
 }
 samples.push({clip:clip.name,samples:51,duration:clip.duration});
}
assert.ok(maxSocketError<1e-7,`Socket world drift ${maxSocketError}`);assert.ok(maxStarVertexError<1e-6,`Star rigid conversion drift ${maxStarVertexError}`);
const displayStats=stats(pilot);delete displayStats.sets;dispose(original,ma);dispose(pilot,mb);
const cycles=[];global.gc?.();const heapBefore=process.memoryUsage().heapUsed;
for(let i=0;i<10;i++){let g=await parse(pilotBytes);const mixer=new T.AnimationMixer(g.scene);pose(g,mixer,'Write',1.6);const before=stats(g);delete before.sets;const after=dispose(g,mixer);g=null;global.gc?.();cycles.push({cycle:i+1,before,after,heapBytes:process.memoryUsage().heapUsed})}
const report={status:'CPU_GRAPH_AND_SURFACE_EQUIVALENCE_PASS',sourceSha256:hash(sourceBytes),pilotSha256:hash(pilotBytes),binaryPayloadUnchanged:true,clipsUnchanged:5,skinsUnchanged:true,newJoints:0,maxSocketMatrixError:maxSocketError,maxStarVertexError,poseSamples:samples,stats:displayStats,estimatedDrawCallsWithoutBatching:displayStats.meshes,drawCallsMeasured:null,textureDecodeLatencyMeasured:null,GpuMemoryMeasured:null,heapBefore,heapAfter:process.memoryUsage().heapUsed,explicitGc:Boolean(global.gc),cycles,limitations:['Textures replaced with empty Texture objects for CPU audit','Dispose counts prove explicit ownership cleanup, not browser VRAM or leak freedom','Source collision and C1 fringe/flat-star gates remain separate; equivalence preserves source defects','No Samsung Internet or WebGL pass']};
const reportPath=process.argv[4]||'docs/sophia/adornments-r1/results/pilot-equivalence.json';await fs.mkdir((await import('node:path')).dirname(reportPath),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,cycles:report.cycles.length},null,2));
