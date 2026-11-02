/** Actual GLB CPU comparisons. These are not screenshots or artistic/WebGL approval. */
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
const run=promisify(execFile),scratch='/tmp/hsin-v21-views',dest='docs/qa/hsin-v21';
await mkdir(scratch,{recursive:true});await mkdir(dest,{recursive:true});
const sets=[{name:'views',rows:[
 {label:'Front / full body',yaw:0},{label:'Three-quarter / full body',yaw:35},
 {label:'Side / full body',yaw:90},{label:'Front / face and hands',yaw:0,shot:'upper'},
]}];
for(const gesture of ['signature','chest','hair','composition'])sets.push({name:gesture,rows:[
 {label:gesture+' / entry (weight 0)',gesture,weight:0},
 {label:gesture+' / mid-entry (weight .5)',gesture,weight:.5},
 {label:gesture+' / hold (weight 1)',gesture,weight:1},
 {label:gesture+' / restored reference',gesture,weight:1,return:1},
].map(row=>({...row,yaw:25,shot:'upper'}))});
const jobs=[];
for(const set of sets)for(const [i,row]of set.rows.entries())for(const profile of ['original','cinematic']){
 const output=`${scratch}/${set.name}-${i}-${profile}.webp`;
 jobs.push(async()=>{
  const flags=Object.entries(row).filter(([k])=>k!=='label').map(([k,v])=>`--${k}=${v}`);
  await run(process.execPath,['scripts/render-hsin-poster.mjs','public/assets/models/hsin/hsin-v2.0.glb',output,'360','440',`--profile=${profile}`,...flags]);
 });
}
const cameraCases=[['original',0,'Original rest / camera 0 deg'],['original',8,'Original rest / camera 8 deg'],['cinematic',8,'Cinematic rest / camera 8 deg']];
for(const [i,[profile,yaw]]of cameraCases.entries())jobs.push(()=>run(process.execPath,['scripts/render-hsin-poster.mjs','public/assets/models/hsin/hsin-v2.0.glb',`${scratch}/camera-${i}.webp`,'360','440',`--profile=${profile}`,`--yaw=${yaw}`]));
let next=0;await Promise.all([0,1].map(async()=>{while(next<jobs.length){await jobs[next++]();}}));
const text=(value,width=720,height=36)=>Buffer.from(`<svg width="${width}" height="${height}"><text x="12" y="24" fill="#eadfc8" font-family="sans-serif" font-size="13">${value}</text></svg>`);
for(const set of sets){
 const layers=[{input:text('CPU approximation / VISUAL_QA_PENDING — same camera in both columns'),left:0,top:0},{input:text('V2.0 original',360),left:0,top:36},{input:text('V2.1 cinematic',360),left:360,top:36}];
 for(const [i,row]of set.rows.entries()){
  const top=72+i*476;layers.push({input:text(row.label),left:0,top});
  for(const [col,profile]of ['original','cinematic'].entries())layers.push({input:`${scratch}/${set.name}-${i}-${profile}.webp`,left:col*360,top:top+36});
 }
 await sharp({create:{width:720,height:72+set.rows.length*476,channels:3,background:'#0a1427'}}).composite(layers).webp({quality:89}).toFile(`${dest}/${set.name}.webp`);
 console.log('CPU comparison:',set.name);
}
const cameraLayers=[{input:text('CPU approximation / VISUAL_QA_PENDING — camera study before bone offsets',1080),left:0,top:0}];
for(const [i,[,,label]]of cameraCases.entries()){cameraLayers.push({input:text(label,360),left:i*360,top:36},{input:`${scratch}/camera-${i}.webp`,left:i*360,top:72});}
await sharp({create:{width:1080,height:512,channels:3,background:'#0a1427'}}).composite(cameraLayers).webp({quality:89}).toFile(`${dest}/camera-study.webp`);
