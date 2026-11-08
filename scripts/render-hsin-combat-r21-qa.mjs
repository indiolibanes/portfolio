/**
 * Combat R2.1 evidence (R2.0.1 reference vs R2.1) from the CPU raster of the real GLB (geometry and pose only — no WebGL, VFX,
 * lighting or FPS claims). Usage:
 *   node scripts/render-hsin-combat-r21-qa.mjs R201.json R21.json OUT_DIR --only=sheets|closeups|video [--workers=2]
 */
import {mkdir,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
const run=promisify(execFile);
const [before,after,out]=process.argv.slice(2),opts=Object.fromEntries(process.argv.slice(5).map(v=>v.replace(/^--/,'').split('=')));
if(!before||!after||!out)throw Error('Usage: BEFORE.json AFTER.json OUT_DIR --only=sheets|closeups|video');
const workers=Number(opts.workers??2),temp=out+'/.frames-'+(opts.only??'all');await mkdir(temp,{recursive:true});
const GLB='public/assets/models/hsin/hsin-v2.0.glb';
const render=(file,w,h,asset,args)=>run(process.execPath,['scripts/render-hsin-poster.mjs',GLB,file,String(w),String(h),'--combat=r2',`--combatPath=${asset}`,'--joints=1',...args],{maxBuffer:1<<24});
async function pool(tasks){let i=0;await Promise.all(Array.from({length:workers},async()=>{while(i<tasks.length){const t=tasks[i++];await t();}}));}
const label=(text,w)=>Buffer.from(`<svg width="${w}" height="30"><rect width="${w}" height="30" fill="#0b1220" opacity=".82"/><text x="10" y="21" font-family="DejaVu Sans" font-size="16" fill="#f4e7c8">${text}</text></svg>`);
async function tile(file,text,w){return sharp(file).composite([{input:label(text,w),top:0,left:0}]).png().toBuffer();}
async function grid(rows,cols,w,h,cells,file){const canvas=sharp({create:{width:cols*w,height:rows*h,channels:4,background:'#05080f'}});await canvas.composite(cells.map((c,k)=>({input:c,left:(k%cols)*w,top:Math.floor(k/cols)*h}))).webp({quality:88}).toFile(file);}
const ACTIONS=[['preparation',1.5],['basic01',2.05],['basic02',3.05],['skill-charge',4.9],['skill-release',5.45],['recovery',6.8]];
const VIEWS=[['front',0],['threeQuarter',40],['profileR',-90],['profileL',90]]; // relative to the body's facing
const ASSETS=[['R2.0.1',before],['R2.1',after]];
if(!opts.only||opts.only==='sheets'){
 const W=330,H=480,tasks=[];
 for(const [action,time] of ACTIONS)for(const [ai,[,asset]] of ASSETS.entries())for(const [view,yaw] of VIEWS)tasks.push(()=>render(`${temp}/${action}-${ai}-${view}.webp`,W,H,asset,[`--time=${time}`,`--relYaw=${yaw}`]));
 await pool(tasks);
 for(const [action,time] of ACTIONS){const cells=[];for(const [ai,[name]] of ASSETS.entries())for(const [view] of VIEWS)cells.push(await tile(`${temp}/${action}-${ai}-${view}.webp`,`${name} · ${action} ${time}s · ${view}`,W));await grid(2,VIEWS.length,W,H,cells,`${out}/compare-${action}.webp`);}
}
if(!opts.only||opts.only==='closeups'){
 const W=420,H=420,shots=[['elbowR-profile-basic01','elbowR',-90,.62,2.05],['elbowL-profile-basic02','elbowL',90,.62,3.05],['handR-basic01','handR',0,.42,2.05],['handL-basic02','handL',0,.42,3.05],['sphere-charge','chest',0,.9,4.9],['sphere-charge-3q','chest',35,.9,5.15],['sleeveR-side','elbowR',-90,.8,2.3],['sleeveL-side','elbowL',90,.8,3.3],['elbowR-recovery','elbowR',-40,.6,6.8]],tasks=[];
 for(const [id,focus,yaw,dist,time] of shots)for(const [ai,[,asset]] of ASSETS.entries())tasks.push(()=>render(`${temp}/${id}-${ai}.webp`,W,H,asset,[`--time=${time}`,`--relYaw=${yaw}`,`--focus=${focus}`,`--dist=${dist}`]));
 await pool(tasks);
 for(const [id,,,,time] of shots){const cells=[];for(const [ai,[name]] of ASSETS.entries())cells.push(await tile(`${temp}/${id}-${ai}.webp`,`${name} · ${id} · ${time}s`,W));await grid(1,2,W,H,cells,`${out}/closeup-${id}.webp`);}
}
if(!opts.only||opts.only==='video'){
 const W=400,H=560,fps=Number(opts.fps??10),N=Math.round(8.4*fps)+1,yaw=Number(opts.yaw??30),tasks=[];
 for(let i=0;i<N;i++)for(const [ai,[,asset]] of ASSETS.entries())tasks.push(()=>render(`${temp}/v-${String(i).padStart(4,'0')}-${ai}.webp`,W,H,asset,[`--time=${(i/fps).toFixed(3)}`,`--relYaw=${yaw}`]));
 await pool(tasks);
 for(let i=0;i<N;i++){const cells=[];for(const [ai,[name]] of ASSETS.entries())cells.push(await tile(`${temp}/v-${String(i).padStart(4,'0')}-${ai}.webp`,`${name} · ${(i/fps).toFixed(2)} s`,W));await sharp({create:{width:2*W,height:H,channels:4,background:'#05080f'}}).composite(cells.map((c,k)=>({input:c,left:k*W,top:0}))).png().toFile(`${temp}/pair-${String(i).padStart(4,'0')}.png`);for(const [k,c] of cells.entries())await sharp(c).png().toFile(`${temp}/solo${k}-${String(i).padStart(4,'0')}.png`);}
 for(const [k,name] of ['r201-continuous-cpu','r21-continuous-cpu'].entries())await run('ffmpeg',['-y','-loglevel','error','-framerate',String(fps),'-i',`${temp}/solo${k}-%04d.png`,'-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-crf','22',`${out}/${name}.mp4`]);
 await run('ffmpeg',['-y','-loglevel','error','-framerate',String(fps),'-i',`${temp}/pair-%04d.png`,'-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-crf','22',`${out}/combat-r201-vs-r21-cpu.mp4`]);
}
await rm(temp,{recursive:true,force:true});
console.log(JSON.stringify({out,only:opts.only??'all',method:'CPU raster of the real GLB; joints overlaid; not WebGL, VFX, lighting or performance evidence'}));
