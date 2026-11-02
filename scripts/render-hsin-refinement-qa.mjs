/** CPU comparisons from real GLB; historical scene read from Git, never deployed in the player. */
import {mkdir,readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
const run=promisify(execFile),temp='/tmp/hsin-refinement-qa',dest='docs/qa/hsin-v201-refinement';await mkdir(temp,{recursive:true});await mkdir(dest,{recursive:true});
const tasks=[];const add=(id,w,h,flags=[])=>tasks.push({id,w,h,flags});
add('old55',320,480,['--orientation=55','--legacy=1','--scene=baseline','--framing=legacy']);
for(const n of [60,65,70,75])add('angle'+n,320,480,[`--orientation=${n}`,'--scene=baseline','--framing=legacy']);
add('scene-before',1280,720,['--orientation=70','--scene=baseline','--framing=legacy']);add('scene-after',1280,720,['--orientation=70','--framing=legacy']);
for(const [w,h]of [[320,740],[393,852],[768,1024],[1280,720],[1920,1080]])add(`view-${w}`,w,h);
for(const gesture of ['rest','signature','chest','composition','hair','returned'])add(gesture,360,500,gesture==='rest'?['--shot=upper']:['--shot=upper',`--gesture=${gesture==='returned'?'signature':gesture}`,...(gesture==='returned'?['--return=1']:[])]);
for(const gesture of ['chest','hair'])add('mobile-'+gesture,393,852,[`--gesture=${gesture}`]);
let next=0;if(!process.argv.includes('--compose'))await Promise.all([0,1].map(async()=>{while(next<tasks.length){const t=tasks[next++];await run(process.execPath,['scripts/render-hsin-poster.mjs','public/assets/models/hsin/hsin-v2.0.glb',`${temp}/${t.id}.webp`,String(t.w),String(t.h),'--profile=cinematic','--terrace=rich',...t.flags]);}}));
const label=(s,w=960)=>Buffer.from(`<svg width="${w}" height="32"><text x="10" y="22" fill="#e9dfc8" font-family="sans-serif" font-size="13">${s}</text></svg>`);
async function board(name,items,columns,tw=320,th=480){const layers=[{input:label('CPU / VISUAL_QA_PENDING - not WebGL or FPS approval',columns*tw),left:0,top:0}];for(const [i,[id,text]]of items.entries()){const left=i%columns*tw,top=32+Math.floor(i/columns)*(th+32);layers.push({input:label(text,tw),left,top},{input:await sharp(`${temp}/${id}.webp`).resize(tw,th,{fit:'contain',background:'#09162b'}).toBuffer(),left,top:top+32});}await sharp({create:{width:tw*columns,height:32+Math.ceil(items.length/columns)*(th+32),channels:3,background:'#09162b'}}).composite(layers).webp({quality:88}).toFile(`${dest}/${name}.webp`);}
await board('orientation',[['old55','#171 body 55 / face 22.65'],...[[60,30],[65,35],[70,40],[75,45]].map(([b,f])=>['angle'+b,`Body ${b} / face ~${f}`])],5);
await board('acting',['rest','signature','chest','composition','hair','returned'].map(n=>[n,n]),3,360,500);
await board('responsive',[['view-320','320 x 740'],['view-393','393 x 852'],['view-768','768 x 1024'],['view-1280','1280 x 720'],['view-1920','1920 x 1080'],['mobile-hair','393 x 852 / hair'],['mobile-chest','393 x 852 / chest']],3,320,480);
const crops=[['Stone',0,435,1000,280],['Mountains',0,165,700,170],['Architecture',10,245,460,165],['Water',15,355,450,115],['Blossoms',0,445,400,260]];
const layers=[{input:label('CPU / fixed camera and 70-degree body - before / after',960),left:0,top:0}];
for(const [i,[name,left,top,width,height]]of crops.entries())for(const [j,id]of ['scene-before','scene-after'].entries()){layers.push({input:label(name+' / '+(j?'refined':'#171'),480),left:j*480,top:32+i*220},{input:await sharp(`${temp}/${id}.webp`).extract({left,top,width,height}).resize(480,188,{fit:'cover'}).toBuffer(),left:j*480,top:64+i*220});}
await sharp({create:{width:960,height:1132,channels:3,background:'#09162b'}}).composite(layers).webp({quality:88}).toFile(`${dest}/spatial-elements.webp`);
await board('composition',[['scene-before','#171 scene / same pose and camera'],['scene-after','Refined scene / same pose and camera']],1,960,540);
console.log('Real-GLB CPU refinement boards:',dest);
