/** Continuous, exact-clock QA video: real GLB, face binding, VFX, software WebGL.
 * H.264/yuv420p faststart MP4 is phone-compatible. This is NOT real-GPU FPS evidence.
 */
import {chromium} from 'playwright';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {serve} from './serve.mjs';
const out=process.argv[2];
if(!out)throw Error('Usage: node scripts/qa/render-hsin-combat-r212-video.mjs DEST');
await mkdir(out,{recursive:true});
const fps=24,duration=8.4;
const modes=[{name:'landscape',width:960,height:540,yaw:40},{name:'portrait',width:540,height:960,yaw:40}];
const {server,url}=await serve();
let browser;
const report={method:'Exact-clock GLB + face + VFX, software WebGL',fps,duration,camera:'Fixed 3/4 view (not stage automatic camera)',fpsOnDevice:'NOT MEASURED',videos:[],errors:[]};
try{
 browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1024,height:1080},deviceScaleFactor:1});
 page.on('pageerror',error=>report.errors.push(String(error)));
 await page.goto(url+'/scripts/qa/hsin-combat-acceptance.html');
 await page.waitForFunction(()=>window.hsinAcceptanceReady,null,{timeout:120000});
 await page.evaluate(()=>window.hsinAcceptance.loadAsset('/assets/animations/hsin/combat-r2.json'));
 for(const mode of modes){
  const folder=join(out,'frames-'+mode.name);await mkdir(folder,{recursive:true});
  const count=Math.ceil(duration*fps)+1;let peakVfx=0,minGeom=Infinity,maxGeom=0;
  for(let frame=0;frame<count;frame++){
   const t=Math.min(duration,frame/fps);
   const d=await page.evaluate(params=>{
    const s=window.hsinAcceptance.seek(params);
    return {vfx:s.visibleVfx,geometries:s.geometries};
   },{time:t,yaw:mode.yaw,width:mode.width,height:mode.height,effects:true,detail:false});
   if(d.vfx>7)throw Error('VFX draw cap violated at time '+t);
   peakVfx=Math.max(peakVfx,d.vfx);minGeom=Math.min(minGeom,d.geometries);maxGeom=Math.max(maxGeom,d.geometries);
   await page.locator('#c').screenshot({path:join(folder,'frame-'+String(frame).padStart(4,'0')+'.png')});
  }
  const file='hsin-combat-r212-'+mode.name+'.mp4';
  const encode=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate',String(fps),'-i',join(folder,'frame-%04d.png'),'-an','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',join(out,file)],{encoding:'utf8',maxBuffer:4*1024*1024});
  if(encode.status!==0)throw Error('ffmpeg '+mode.name+': '+(encode.stderr||encode.error||encode.status));
  await page.locator('#c').screenshot({path:join(out,'poster-'+mode.name+'.png')});
  report.videos.push({file,width:mode.width,height:mode.height,frames:count,peakVfx,minGeom,maxGeom});
  await rm(folder,{recursive:true,force:true});
 }
 if(report.errors.length)throw Error(report.errors.join('\n'));
}finally{
 await writeFile(join(out,'video-report.json'),JSON.stringify(report,null,2)+'\n');
 if(browser)await browser.close();
 server.close();
}
console.log(JSON.stringify(report));