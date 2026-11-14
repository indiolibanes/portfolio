// Host CPU initialization and shared immutable sample storage. Not a GPU/FPS benchmark.
import fs from'node:fs';import{performance}from'node:perf_hooks';
import * as current from'../../../public/experimental/gltf-skel.js';
const previous=await import('../../../../sophia-r15-baseline/public/experimental/gltf-skel.js');
const bytes=fs.readFileSync('public/assets/models/sophia/sophia-lab.glb'),ab=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),result={scope:'Node24 host CPU only; no WebGL, texture decode, VRAM, mobile or full actor initialization'};
for(const[label,lib]of[['before',previous],['after',current]]){
 const timings=[];let storage;
 for(let k=0;k<7;k++){global.gc?.();const{json,bin}=lib.parseGLB(ab),start=performance.now(),actors=Array.from({length:4},()=>new lib.Skeleton(json,bin));timings.push(performance.now()-start);const arrays=new Set();for(const a of actors)for(const clip of Object.values(a.clips))for(const ch of clip.channels){arrays.add(ch.times);arrays.add(ch.values)}storage=[...arrays].reduce((n,a)=>n+a.byteLength,0)}
 timings.sort((a,b)=>a-b);result[label]={fourSkeletonConstructorMs:{min:timings[0],median:timings[3],max:timings[6]},uniqueAnimationTypedArrayBytes:storage,iterations:7};
}
result.storageReductionFraction=1-result.after.uniqueAnimationTypedArrayBytes/result.before.uniqueAnimationTypedArrayBytes;fs.writeFileSync('docs/characters/sophia-r15/cpu-benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
