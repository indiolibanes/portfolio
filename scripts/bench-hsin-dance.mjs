/** Node CPU microbench, not GPU/phone/FPS evidence. Director, bone interpolation and matrices measured separately. */
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,brotliCompressSync} from 'node:zlib';
import {danceRig} from './lib/hsin-dance-rig.mjs';
import {decodeDanceData} from '../src/scripts/hsin-dance-data.mjs';
import {createDancePose} from '../src/scripts/hsin-dance-pose.mjs';
import {createDanceDirector} from '../src/scripts/hsin-dance-director.mjs';
import {createMusicState} from '../src/scripts/hsin-music-state.mjs';
import {createMusicTransport} from '../src/scripts/hsin-music-transport.mjs';
const r2=process.argv.includes('--r2'),r=await danceRig(),bytes=await readFile('public/assets/animations/hsin/lunar-dance-'+(r2?'r2':'r1')+'.json'),data=decodeDanceData(JSON.parse(bytes)),pose=createDancePose({THREE:r.T,data,bones:r.bones,model:r.model});
function bench(n,fn){for(let i=0;i<300;i++)fn(i);const t=performance.now();for(let i=0;i<n;i++)fn(i);return (performance.now()-t)/n;}
let now=0,position=0;const music=createMusicState({now:()=>now}),token=music.select('youtube'),transport=createMusicTransport({now:()=>now}),idle={advance(){},busy:()=>false,release(){}},director=createDanceDirector({idle,pose,music,transport,seed:42});music.observe(token,{status:'playing',trackId:'Yhf9ur3xPQA',positionSeconds:0,durationSeconds:10000});
const result={environment:'Node '+process.version+' CPU microbench; not browser, phone, GPU or FPS',bytes:bytes.length,gzipBytes:gzipSync(bytes).length,brotliBytes:brotliCompressSync(bytes).length,bones:data.names.length,phrases:Object.keys(data.phrases).length,decodedQuaternionBytes:Object.values(data.phrases).reduce((n,p)=>n+p.frames.length*data.names.length*4*(r2?4:8),0),runtimeBufferBytes:pose.bufferBytes(),sceneGeometryDelta:0,sceneTextureDelta:0,renderTargetsDelta:0};
result.parseMs=bench(100,()=>JSON.parse(bytes));result.parseAndDecodeMs=bench(100,()=>decodeDanceData(JSON.parse(bytes)));result.playbackMs=bench(12000,i=>pose.apply('petal-flourish',(i%900)/900));pose.restore();result.directorAndPlaybackMs=bench(12000,()=>{now+=1000/30;position+=1/30;if(Math.round(position*30)%15===0)music.observe(token,{status:'playing',trackId:'Yhf9ur3xPQA',positionSeconds:position,durationSeconds:10000});director.advance(1/30);});result.worldMatricesMs=bench(3000,()=>r.model.updateMatrixWorld(true));
director.dispose();music.dispose();console.log(JSON.stringify(result,null,2));if(result.playbackMs>.4||result.directorAndPlaybackMs>.8)throw Error('Dance CPU guard exceeded');if(process.env.HSIN_DANCE_REPORT)await writeFile(r2?'docs/hsin-dance-r2-benchmark.json':'docs/hsin-dance-benchmark.json',JSON.stringify(result,null,2)+'\n');
