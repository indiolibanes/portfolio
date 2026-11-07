/** Offline, data-only. Arguments: private directory, uploaded animation ZIP extracted directory, output directory. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {pathToFileURL,fileURLToPath} from 'node:url';
if(process.argv.length!==5)throw Error('Expected PRIVATE_INPUT ANIMATION_KIT OUTPUT_DIRECTORY');
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),[input,kit,out]=process.argv.slice(2).map(x=>path.resolve(x));
if(out===repo||out.startsWith(repo+path.sep))throw Error('Evidence output must be outside checkout');
const at=x=>import(pathToFileURL(path.join(repo,x)).href),T=await at('node_modules/three/build/three.module.js');
const {parseDataOnly}=await at('scripts/shorekeeper/audit-private-source.mjs');const {SHOREKEEPER_CANONICAL:C}=await at('src/scripts/shorekeeper/private-model-cache.mjs');
const expected=JSON.parse(fs.readFileSync(path.join(kit,'expected.json'))),names=['shorekeeper-f20a.glb','basic.glb','advanced.glb','burst.glb'],bytes=[];
for(const name of names){const b=fs.readFileSync(path.join(input,name));const e=name===names[0]?C:expected.find(x=>x.name===name);if(!e||b.length!==e.bytes||crypto.createHash('sha256').update(b).digest('hex')!==e.sha256)throw Error('Source integrity failed');bytes.push(b);}
const runs=[];let model;
for(let pass=0;pass<3;pass++)for(const kind of (pass%2?['modelOnly','fullLibrary']:['fullLibrary','modelOnly'])){
 const start=performance.now(),heap=process.memoryUsage().heapUsed,parsed=[];for(const b of bytes.slice(0,kind==='modelOnly'?1:4))parsed.push(await parseDataOnly(b));
 const result={kind,pass,parseDataOnlyWallMs:performance.now()-start,nodeHeapDeltaBytes:process.memoryUsage().heapUsed-heap};runs.push(result);if(kind==='modelOnly'&&pass===2)model=parsed[0];
}
const root=model.gltf.scene;root.updateMatrixWorld(true);const worldBox=()=>{const b=new T.Box3();root.traverse(o=>{if(o.isMesh){if(o.isSkinnedMesh)o.computeBoundingBox();const local=o.boundingBox??(o.geometry.computeBoundingBox(),o.geometry.boundingBox);if(local)b.union(local.clone().applyMatrix4(o.matrixWorld));}});return b;};
const initial=worldBox(),union=initial.clone(),mixer=new T.AnimationMixer(root);let samples=0;const t0=performance.now();
for(const id of C.clips){const clip=model.gltf.animations.find(c=>c.name===id);if(!clip)throw Error('Original idle missing');mixer.stopAllAction();const a=mixer.clipAction(clip);a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();a.paused=true;const times=new Set([0,clip.duration]);for(let i=0;i<=Math.floor(clip.duration*30);i++)times.add(i/30);for(const tr of clip.tracks)for(const t of tr.times)times.add(t);
 for(const t of [...times].sort((a,b)=>a-b)){a.time=t;mixer.update(0);root.updateMatrixWorld(true);union.union(worldBox());samples++;}
}
mixer.stopAllAction();mixer.uncacheRoot(root);const h=initial.max.y-initial.min.y;
const summary={sourceIntegrity:'4/4 PASS',network:'NOT_TESTED',WebGL:'NOT_TESTED',physicalGpu:'NOT_MEASURED',fullLibraryBytes:bytes.reduce((a,b)=>a+b.length,0),modelOnlyBytes:bytes[0].length,omittedLibraryBytes:bytes.slice(1).reduce((a,b)=>a+b.length,0),runs,parseMethod:'GLTFLoader; textures replaced by empty Texture; local bytes, no image decode, no real cache/network/GPU',temporal:{originalIdles:3,samples,fpsGrid:30,originalKeysIncluded:true,cpuMs:performance.now()-t0,extraSidesInModelHeights:{left:Math.max(0,initial.min.x-union.min.x)/h,right:Math.max(0,union.max.x-initial.max.x)/h,below:Math.max(0,initial.min.y-union.min.y)/h,above:Math.max(0,union.max.y-initial.max.y)/h,front:Math.max(0,initial.min.z-union.min.z)/h,back:Math.max(0,union.max.z-initial.max.z)/h},limitation:'SK only; no rendered silhouettes, Hsin dance or cloth simulation certified'}};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'local-duet-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({finished:true,samples,runCount:runs.length}));
