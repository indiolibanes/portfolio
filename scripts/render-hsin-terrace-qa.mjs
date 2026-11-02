/** Reproducible CPU-only art-direction comparisons; never WebGL/FPS approval. */
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
const run=promisify(execFile),temp='/tmp/hsin-v201-qa',dest='docs/qa/hsin-v201';await mkdir(temp,{recursive:true});await mkdir(dest,{recursive:true});
const scenarios=[
 ['baseline',[], 'V2.0 / #170: 8 deg camera and original stage'],
 ['orientation',['--orientation=55'],'Root orientation: body 55 deg'],
 ['bare',['--orientation=55','--terrace=bare'],'Pedestal removed / continuous floor'],
 ['final',['--orientation=55','--terrace=rich'],'V2.0.1: golden lunar terrace'],
 ...[35,45,55,65].map(n=>['angle-'+n,[`--orientation=${n}`,'--terrace=rich'],`Body ${n} deg / compensated face`]),
 ['front',['--orientation=55','--terrace=rich','--yaw=-47'],'Front inspection / fixed presentation'],
 ...['signature','chest'].flatMap(name=>[0,.5,1,'return'].map(weight=>[name+'-'+weight,['--orientation=55','--terrace=rich',`--gesture=${name}`,'--shot=upper',weight==='return'?'--return=1':`--weight=${weight}`],name+' / '+(weight==='return'?'returned':`weight ${weight}`)])),
 ...['signature','chest','hair','composition'].map(name=>['gesture-'+name,['--orientation=55','--terrace=rich',`--gesture=${name}`,'--shot=upper'],name+' / held pose']),
];
const jobs=scenarios.map(([name,flags])=>()=>run(process.execPath,['scripts/render-hsin-poster.mjs','public/assets/models/hsin/hsin-v2.0.glb',`${temp}/${name}.webp`,'360','500','--profile=cinematic','--legacy=1','--scene=baseline','--framing=legacy',...flags]));
let index=0;await Promise.all([0,1].map(async()=>{while(index<jobs.length)await jobs[index++]();}));
function label(value,width=720,height=36){return Buffer.from(`<svg width="${width}" height="${height}"><text x="12" y="24" fill="#ecdfc3" font-family="sans-serif" font-size="13">${value}</text></svg>`);}
async function sheet(names,out,columns=2){
 const layers=[{input:label('CPU approximation / VISUAL_QA_PENDING',columns*360),left:0,top:0}];
 for(const [i,name]of names.entries()){
  const row=scenarios.find(r=>r[0]===name),left=i%columns*360,top=36+Math.floor(i/columns)*536;layers.push({input:label(row[2],360),left,top},{input:`${temp}/${name}.webp`,left,top:top+36});
 }
 await sharp({create:{width:columns*360,height:36+Math.ceil(names.length/columns)*536,channels:3,background:'#09162a'}}).composite(layers).webp({quality:88}).toFile(`${dest}/${out}.webp`);
}
await sheet(['baseline','orientation','bare','final'],'before-after');await sheet([35,45,55,65].map(n=>'angle-'+n),'orientation-studies',4);await sheet(['signature','chest','hair','composition'].map(n=>'gesture-'+n),'acting-55');
await sheet(['signature','chest'].flatMap(name=>[0,.5,1,'return'].map(w=>name+'-'+w)),'gesture-transitions',4);await sheet(['front','final'],'front-and-three-quarter');
console.log('CPU terrace comparison sheets complete:',dest);
