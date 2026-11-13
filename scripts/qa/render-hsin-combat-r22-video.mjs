/** Combat R2.2 audiovisual QA: exact-clock, real GLB + face + R2.1 effects (+ R2.2 environment), software WebGL.
 * Writes: video-a-compare.mp4 (R2.1.2 x R2.2, full body + 3/4), video-b-cinematic.mp4 (8.4 s, smooth cinematic camera),
 * video-c-mobile.mp4 (9:16), paired stills, bench.json (CPU cost) and cost-report.json (measured extra draw calls/triangles).
 * H.264 / yuv420p / faststart / no audio. SwiftShader gives visual evidence only: NOT real-GPU FPS evidence.
 */
import {chromium} from 'playwright';
import {mkdir,writeFile,rm,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {serve} from './serve.mjs';
const out=process.argv[2];
if(!out)throw Error('Usage: node scripts/qa/render-hsin-combat-r22-video.mjs DEST');
await mkdir(out,{recursive:true});
const fps=24,duration=8.4,count=Math.ceil(duration*fps)+1;
const FONT=['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'].find(existsSync);
const {server,url}=await serve();
let browser;
const report={method:'Exact-clock GLB + face + R2.1 effects + R2.2 environment, software WebGL (SwiftShader)',fps,duration,fpsOnDevice:'NOT MEASURED',physicalGpu:false,videos:[],stills:[],errors:[],glErrors:[],font:FONT??'none'};
const cost={pairs:0,peakExtraDrawCalls:0,peakExtraTriangles:0,peakEnvInstances:{rings:0,shards:0,glints:0},peakEnvTriangles:0,atTime:{},budget:{drawCalls:4,triangles:3000}};
const ffmpeg=args=>{const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw Error('ffmpeg: '+(r.stderr||r.error||r.status));};
const encode=(input,file,extra=[])=>ffmpeg(['-framerate',String(fps),'-i',input,...extra,'-an','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',file]);
try{
 browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-precise-memory-info']});
 const page=await browser.newPage({viewport:{width:1480,height:1100},deviceScaleFactor:1});
 page.on('pageerror',error=>report.errors.push(String(error)));
 page.on('console',m=>{if(m.type()==='error'||/WebGL|GL_/.test(m.text()))report.errors.push(m.type()+': '+m.text());});
 await page.goto(url+'/scripts/qa/hsin-combat-acceptance.html');
 await page.waitForFunction(()=>window.hsinAcceptanceReady,null,{timeout:120000});
 report.renderer=await page.evaluate(()=>{const gl=window.hsinHarness.state.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unknown';});
 await page.evaluate(()=>window.hsinAcceptance.loadAsset('/assets/animations/hsin/combat-r2.json'));
 const seek=params=>page.evaluate(p=>{const s=window.hsinAcceptance.seek(p);return {calls:s.calls,triangles:s.triangles,geometries:s.geometries,textures:s.textures,visibleVfx:s.visibleVfx,visibleEnv:s.visibleEnv,env:s.env,events:s.events.map(e=>e.name),gl:window.hsinHarness.state.renderer.getContext().getError()};},params);
 const shot=(file)=>page.locator('#c').screenshot({path:file});
 /** Render the same moment without (R2.1.2) and with (R2.2) the environment layer; record the measured difference. */
 async function pair(params,fileOff,fileOn){
  const off=await seek({...params,environment:false});if(fileOff)await shot(fileOff);
  const on=await seek({...params,environment:true});if(fileOn)await shot(fileOn);
  for(const r of [off,on])if(r.gl!==0)report.glErrors.push({time:params.time,gl:r.gl});
  const dc=on.calls-off.calls,dt=on.triangles-off.triangles;cost.pairs++;
  if(dc>cost.peakExtraDrawCalls){cost.peakExtraDrawCalls=dc;cost.atTime.drawCalls=params.time;}
  if(dt>cost.peakExtraTriangles){cost.peakExtraTriangles=dt;cost.atTime.triangles=params.time;}
  if(on.env){for(const k of ['rings','shards','glints'])cost.peakEnvInstances[k]=Math.max(cost.peakEnvInstances[k],on.env.instances[k]);cost.peakEnvTriangles=Math.max(cost.peakEnvTriangles,on.env.triangles);}
  if(on.geometries-off.geometries>3)throw Error('R2.2 geometry cap violated at '+params.time);
  return {off,on};
 }
 // 1. CPU cost of the layer (no rendering)
 report.bench=await page.evaluate(()=>window.hsinAcceptance.bench({runs:4}));
 await writeFile(join(out,'bench.json'),JSON.stringify(report.bench,null,2)+'\n');
 // 2. paired stills at the moments the brief names (front, 3/4, profile, phone)
 const moments=[['b01-prep',1.5],['b01-path',1.95],['b01-impact',2.2],['b01-dissipation',2.65],['b02-path',3.1],['b02-peak',3.32],['b02-dissipation',3.7],['skill-concentration',4.3],['skill-accumulation',5.1],['skill-release',5.5],['skill-reverb',5.95],['recovery',6.8],['rest',8.4]];
 const views=[['front',{yaw:0,width:640,height:720}],['tq',{yaw:40,width:640,height:720}],['profile',{yaw:90,width:640,height:720}],['phone',{camera:'cinematic',width:405,height:720,minScale:.9}]];
 await mkdir(join(out,'stills'),{recursive:true});
 for(const [name,time] of moments)for(const [view,v] of views){
  const a=join(out,'stills','_off.png'),b=join(out,'stills','_on.png'),file=join(out,'stills',`${name}-${view}.png`);
  await pair({time,detail:false,effects:true,...v},a,b);
  ffmpeg(['-i',a,'-i',b,'-filter_complex','hstack=inputs=2',file]);report.stills.push(`stills/${name}-${view}.png`);
 }
 await rm(join(out,'stills','_off.png'),{force:true});await rm(join(out,'stills','_on.png'),{force:true});
 // 3. Video A: R2.1.2 (left) x R2.2 (right), top = full body, bottom = 3/4 with the upper body closer
 {
  const dir=join(out,'frames-a');await mkdir(dir,{recursive:true});
  const W=720,H=540,rows=[{k:'full',p:{yaw:0}},{k:'tq',p:{yaw:40,distance:2.7,targetY:1.0}}];
  for(let f=0;f<count;f++){
   const time=Math.min(duration,f/fps),n=String(f).padStart(4,'0');
   for(const row of rows)await pair({time,detail:false,effects:true,width:W,height:H,...row.p},join(dir,`${row.k}-off-${n}.png`),join(dir,`${row.k}-on-${n}.png`));
  }
  const labels=FONT?[['R2.1.2',20,18],['R2.2',20+W,18],['R2.1.2',20,18+H],['R2.2',20+W,18+H]].map(([t,x,y])=>`drawtext=fontfile=${FONT}:text='${t}':x=${x}:y=${y}:fontsize=26:fontcolor=0xffe2a8:box=1:boxcolor=0x0a1430@0.55:boxborderw=8`).join(','):'null';
  const inputs=['full-off','full-on','tq-off','tq-on'].flatMap(k=>['-framerate',String(fps),'-i',join(dir,`${k}-%04d.png`)]);
  ffmpeg([...inputs,'-filter_complex',`[0][1]hstack[t];[2][3]hstack[b];[t][b]vstack,${labels}[v]`,'-map','[v]','-an','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',join(out,'video-a-compare.mp4')]);
  report.videos.push({file:'video-a-compare.mp4',width:W*2,height:H*2,frames:count,layout:'left R2.1.2 | right R2.2; top full body, bottom 3/4'});
  await rm(dir,{recursive:true,force:true});
 }
 // 4. Video B (16:9 cinematic) and Video C (9:16 phone): R2.2, smooth deterministic camera
 for(const v of [{id:'b',file:'video-b-cinematic.mp4',width:1280,height:720,p:{camera:'cinematic'},label:'Cinematic Combat 16:9'},{id:'c',file:'video-c-mobile.mp4',width:540,height:960,p:{camera:'cinematic',minScale:.9},label:'Mobile preview 9:16'}]){
  const dir=join(out,'frames-'+v.id);await mkdir(dir,{recursive:true});let peak={calls:0,env:0};
  for(let f=0;f<count;f++){
   const time=Math.min(duration,f/fps);
   const r=await seek({time,detail:false,effects:true,environment:true,width:v.width,height:v.height,...v.p});
   if(r.gl!==0)report.glErrors.push({video:v.id,time,gl:r.gl});
   if(r.visibleEnv>3)throw Error('Environment draw cap violated at '+time);
   peak={calls:Math.max(peak.calls,r.calls),env:Math.max(peak.env,r.visibleEnv)};
   await shot(join(dir,`frame-${String(f).padStart(4,'0')}.png`));
  }
  await shot(join(out,`poster-${v.id}.png`));
  encode(join(dir,'frame-%04d.png'),join(out,v.file));
  report.videos.push({file:v.file,width:v.width,height:v.height,frames:count,label:v.label,peakDrawCalls:peak.calls,peakEnvDrawCalls:peak.env});
  await rm(dir,{recursive:true,force:true});
 }
 // 5. the files must really exist and be non-trivial before anything claims them
 for(const v of report.videos){const s=await stat(join(out,v.file));v.bytes=s.size;if(s.size<50000)throw Error('Video too small: '+v.file);}
 // probe every MP4 so the report states codec, pixel format and duration (and proves there is no audio stream)
 for(const v of report.videos){const r=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_name,pix_fmt,width,height,nb_frames,codec_type:format=duration','-of','json',join(out,v.file)],{encoding:'utf8'});if(r.status===0)v.probe=JSON.parse(r.stdout);}
 if(report.errors.length)throw Error(report.errors.join('\n'));
 if(report.glErrors.length)throw Error('WebGL errors: '+JSON.stringify(report.glErrors.slice(0,5)));
 if(cost.peakExtraDrawCalls>cost.budget.drawCalls||cost.peakExtraTriangles>cost.budget.triangles)throw Error('Budget exceeded '+JSON.stringify(cost));
}finally{
 report.cost=cost;
 await writeFile(join(out,'cost-report.json'),JSON.stringify(cost,null,2)+'\n');
 await writeFile(join(out,'video-report.json'),JSON.stringify(report,null,2)+'\n');
 if(browser)await browser.close();
 server.close();
}
console.log(JSON.stringify({videos:report.videos.map(v=>({file:v.file,bytes:v.bytes})),cost}));
