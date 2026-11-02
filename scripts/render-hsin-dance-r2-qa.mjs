/** 20-second CPU raster sequence of the actual GLB. NOT browser/WebGL/material/continuous-FPS approval. */
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
const run=promisify(execFile),dir='docs/qa/hsin-dance-r2',temp='/tmp/hsin-r2-frames';await mkdir(dir,{recursive:true});await mkdir(temp,{recursive:true});
const timeline=[['moon-breathing',.8],['silk-sway',4.2],['lunar-waltz',5.6],['ballet-flourish',4.6],['petal-flourish',3.7],['lunar-repose',1.3]],fps=8,duration=timeline.reduce((n,p)=>n+p[1],0),tasks=[];
for(let i=0;i<Math.ceil(duration*fps);i++){let time=i/fps,phrase,phase;for(const [name,seconds]of timeline){if(time<seconds){phrase=name;phase=time/seconds;break;}time-=seconds;}tasks.push({i,phrase:phrase??'lunar-repose',phase:phase??1});}
const label=(text,w=640)=>Buffer.from(`<svg width="${w}" height="40"><rect width="100%" height="100%" fill="#08131c"/><text x="10" y="15" font-family="sans-serif" font-size="11" fill="#ddded2">CPU 8 fps / VISUAL_QA_PENDING / no audio or native iframe</text><text x="10" y="32" font-family="sans-serif" font-size="11" fill="#b9dfe3">${text}</text></svg>`);
let next=0;await Promise.all([0,1].map(async()=>{while(next<tasks.length){const t=tasks[next++],path=`${temp}/${String(t.i).padStart(4,'0')}.png`;await run(process.execPath,['scripts/render-hsin-poster.mjs','public/assets/models/hsin/hsin-v2.0.glb',path,'640','400','--r2=1',`--dance=${t.phrase}`,`--phase=${t.phase}`]);await sharp(path).composite([{input:label(`${(t.i/fps).toFixed(2)} s / ${t.phrase}`),left:0,top:360}]).png().toFile(path+'.tmp');await run('mv',[path+'.tmp',path]);}}));
await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate',String(fps),'-i',`${temp}/%04d.png`,'-c:v','libx264','-pix_fmt','yuv420p','-crf','22','-movflags','+faststart',`${dir}/dance-r2-cpu.mp4`]);
const board=await sharp({create:{width:1280,height:460,channels:3,background:'#08131c'}}).composite(await Promise.all([0,8,32,55,70,90,110,135].map(async(i,j)=>({input:await sharp(`${temp}/${String(i).padStart(4,'0')}.png`).resize(320,230,{fit:'contain',background:'#08131c'}).toBuffer(),left:j%4*320,top:Math.floor(j/4)*230})))).webp({quality:88}).toFile(`${dir}/motion-sequence.webp`);
// Same real scene/camera, before/after pavilion. Native HTML display is intentionally absent in CPU output.
const old=(await run('git',['show','32801974d95ae458d94d72d81e874df3be4e7529:src/scripts/hsin-music-tower.mjs'])).stdout;await writeFile(`${temp}/tower-before.mjs`,old);
for(const before of [true,false])await run(process.execPath,['scripts/render-hsin-poster.mjs','public/assets/models/hsin/hsin-v2.0.glb',`${dir}/pavilion-${before?'before':'after'}.webp`,'1280','720','--r2=1','--dance=idle','--pavilion=1',...(before?[`--towerPath=${temp}/tower-before.mjs`]:[])]);
await writeFile(`${dir}/manifest.json`,JSON.stringify({method:'Actual GLB CPU raster, approximate materials/light/shader; no native player',fps,durationSeconds:tasks.length/fps,frames:tasks.length,timeline,visual:'VISUAL_QA_PENDING'},null,2)+'\n');console.log({dir,frames:tasks.length,duration});
