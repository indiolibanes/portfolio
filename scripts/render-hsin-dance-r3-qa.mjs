/**
 * Moon Fox Reverie QA sequence of the actual GLB, CPU raster (same renderer as the R2 poster QA).
 * NOT browser/WebGL/material or continuous-FPS approval. Motion is shown as a video; stills are only key poses of that motion.
 *   node scripts/render-hsin-dance-r3-qa.mjs [--fps=8] [--only=video|sheets|compare]
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
const run=promisify(execFile),options=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('='))),dir='docs/qa/hsin-dance-r3',temp=process.env.HSIN_R3_FRAMES??'/tmp/hsin-r3-frames';
await mkdir(dir,{recursive:true});await mkdir(temp,{recursive:true});
const fps=Number(options.fps??8),seconds=13.6,W=640,H=400,workers=Number(options.workers??3),only=options.only??'all';
const REV='moon-fox-reverie',views={front:{yaw:0,label:'front'},threeQuarter:{yaw:null,label:'3/4 (stage camera)'},side:{yaw:90,label:'side'}};
const render=(out,args)=>run(process.execPath,['scripts/render-hsin-poster.mjs','public/assets/characters/hsin/models/hsin-v2.0.glb',out,String(W),String(H),'--r2=1',...args]);
const label=(text,w=W)=>Buffer.from(`<svg width="${w}" height="40"><rect width="100%" height="100%" fill="#08131c"/><text x="10" y="15" font-family="sans-serif" font-size="11" fill="#ddded2">CPU raster / VISUAL_QA_PENDING / no audio, no native iframe, no cloth physics beyond baked tracks</text><text x="10" y="32" font-family="sans-serif" font-size="11" fill="#b9dfe3">${text}</text></svg>`);
async function pool(tasks,fn){let next=0;await Promise.all(Array.from({length:workers},async()=>{while(next<tasks.length)await fn(tasks[next++]);}));}
const frame=async(path,args,text)=>{await render(path,args);await sharp(path).composite([{input:label(text),top:0,left:0}]).png().toFile(path+'.l.png');return path+'.l.png';};
const viewArgs=v=>views[v].yaw===null?[]:['--yaw='+views[v].yaw];
const result={method:'Actual GLB CPU raster, approximate materials/light/shader; no native player',fps,seconds,visual:'VISUAL_QA_PENDING',phrase:REV};

if(only==='all'||only==='video'){
  const count=Math.ceil(seconds*fps)+1,tasks=Array.from({length:count},(_,i)=>i);
  await pool(tasks,async i=>{const phase=Math.min(1,i/fps/seconds),path=`${temp}/v${String(i).padStart(4,'0')}.png`;const out=await frame(path,['--r3=1',`--dance=${REV}`,`--phase=${phase}`],`${(i/fps).toFixed(2)} s / ${REV} / phase ${phase.toFixed(3)}`);await sharp(out).toFile(`${temp}/video-${String(i).padStart(4,'0')}.png`);});
  await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate',String(fps),'-i',`${temp}/video-%04d.png`,'-c:v','libx264','-pix_fmt','yuv420p','-crf','22','-movflags','+faststart',`${dir}/moon-fox-reverie-cpu.mp4`]);
  result.video={file:'moon-fox-reverie-cpu.mp4',frames:count};
}
if(only==='all'||only==='sheets'){
  // One sheet per movement boundary and extreme, in the three required views.
  const phases=[0,.08,.16,.28,.40,.50,.56,.60,.68,.76,.875,.905,.96,1];
  for(const view of Object.keys(views)){
    await pool(phases,async phase=>{const path=`${temp}/k-${view}-${phase}.png`;await frame(path,['--r3=1',`--dance=${REV}`,`--phase=${phase}`,...viewArgs(view)],`${views[view].label} / phase ${phase.toFixed(3)}`);});
    const cols=4,rows=Math.ceil(phases.length/cols);
    await sharp({create:{width:W/2*cols,height:(H/2+20)*rows,channels:3,background:'#08131c'}}).composite(await Promise.all(phases.map(async(phase,j)=>({input:await sharp(`${temp}/k-${view}-${phase}.png.l.png`).resize(W/2,H/2+20,{fit:'contain',background:'#08131c'}).toBuffer(),left:j%cols*(W/2),top:Math.floor(j/cols)*(H/2+20)})))).webp({quality:88}).toFile(`${dir}/key-poses-${view}.webp`);
  }
  result.sheets=Object.keys(views).map(v=>`key-poses-${v}.webp`);
}
if(only==='all'||only==='compare'){
  // R2 vs R3 at comparable moments, plus the hand-over to and from the existing repertoire (each phrase starts and ends on the same reference).
  const pairs=[['lunar-waltz',.38,'r2'],['ballet-flourish',.4,'r2'],['petal-flourish',.5,'r2'],[REV,.2,'r3'],[REV,.3,'r3'],[REV,.56,'r3'],[REV,.9,'r3'],['crescent-turn',.5,'r2']];
  await pool(pairs,async([name,phase,gen])=>{await frame(`${temp}/c-${name}-${phase}.png`,[...(gen==='r3'?['--r3=1']:[]),`--dance=${name}`,`--phase=${phase}`],`${gen.toUpperCase()} / ${name} / phase ${phase}`);});
  await sharp({create:{width:W/2*4,height:(H/2+20)*2,channels:3,background:'#08131c'}}).composite(await Promise.all(pairs.map(async([name,phase],j)=>({input:await sharp(`${temp}/c-${name}-${phase}.png.l.png`).resize(W/2,H/2+20,{fit:'contain',background:'#08131c'}).toBuffer(),left:j%4*(W/2),top:Math.floor(j/4)*(H/2+20)})))).webp({quality:88}).toFile(`${dir}/r2-vs-r3.webp`);
  const handoff=[['silk-sway',.92,'r2'],['silk-sway',1,'r2'],[REV,0,'r3'],[REV,.03,'r3'],[REV,.97,'r3'],[REV,1,'r3'],['ballet-flourish',0,'r2'],['ballet-flourish',.06,'r2']];
  await pool(handoff,async([name,phase,gen])=>{await frame(`${temp}/h-${name}-${phase}.png`,[...(gen==='r3'?['--r3=1']:[]),`--dance=${name}`,`--phase=${phase}`],`${gen.toUpperCase()} / ${name} / phase ${phase}`);});
  await sharp({create:{width:W/2*4,height:(H/2+20)*2,channels:3,background:'#08131c'}}).composite(await Promise.all(handoff.map(async([name,phase],j)=>({input:await sharp(`${temp}/h-${name}-${phase}.png.l.png`).resize(W/2,H/2+20,{fit:'contain',background:'#08131c'}).toBuffer(),left:j%4*(W/2),top:Math.floor(j/4)*(H/2+20)})))).webp({quality:88}).toFile(`${dir}/transition-r2-r3.webp`);
  result.compare=['r2-vs-r3.webp','transition-r2-r3.webp'];
}
await writeFile(`${dir}/render-manifest-${only}.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
