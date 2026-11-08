/** Real GLB + WebGL continuous exact-clock frames; no screenshot interpolation, audio or physical GPU claims. */
import {chromium} from 'playwright';
import {mkdir,writeFile,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {serve} from './serve.mjs';
const out=process.argv[2];if(!out)throw Error('Output directory required');await mkdir(out,{recursive:true});
const {server,url}=await serve();let browser;
const fps=24,report={method:'Real GLB, face, R2.2 pooled VFX, software WebGL, exact local clock',physicalGpu:false,fpsOnSamsung:'NOT MEASURED',videos:[],errors:[],stills:[],peakEnvCalls:0};
const run=(bin,args)=>{const r=spawnSync(bin,args,{encoding:'utf8',maxBuffer:8000000});if(r.status!==0)throw Error(bin+': '+r.stderr);return r.stdout;};
const ff=args=>run('ffmpeg',['-v','error','-y',...args]);
const encode=(args,file)=>ff([...args,'-an','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',join(out,file)]);
try{
 browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 async function page(asset){const p=await browser.newPage({viewport:{width:1080,height:1200},deviceScaleFactor:1});p.on('pageerror',e=>report.errors.push(String(e)));await p.goto(url+'/scripts/qa/hsin-combat-acceptance.html');await p.waitForFunction(()=>window.hsinAcceptanceReady,null,{timeout:120000});await p.evaluate(a=>window.hsinAcceptance.loadAsset(a),asset);return p;}
 const before=await page('/assets/animations/hsin/combat-r2.json'),after=await page('/assets/animations/hsin/combat-r23-basic01.json');
 report.renderer=await after.evaluate(()=>{const g=window.hsinHarness.state.renderer.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unknown';});
 async function capture(p,params,file){const r=await p.evaluate(x=>{const s=window.hsinAcceptance.seek(x),g=window.hsinHarness.state.renderer.getContext();return {env:s.visibleEnv,gl:g.getError(),geometries:s.geometries,textures:s.textures,events:s.events};},params);if(r.gl)throw Error('WebGL '+r.gl);report.peakEnvCalls=Math.max(report.peakEnvCalls,r.env);if(r.env>3)throw Error('Environment budget');await p.locator('#c').screenshot({path:file});return r;}
 await mkdir(join(out,'stills'),{recursive:true});
 for(const c of [{id:'basic01',duration:4.2,shift:.36,file:'video-a-basic01.mp4',views:[0,40]},{id:'basic02',duration:3.8,shift:1.84,file:'video-b-basic02.mp4',views:[40,90]}]){
  await after.evaluate(id=>window.hsinAcceptance.loadAsset('/assets/animations/hsin/combat-r23-'+id+'.json'),c.id);
  const dir=join(out,'frames-'+c.id);await mkdir(dir,{recursive:true});const count=Math.ceil(c.duration*fps)+1;
  for(let f=0;f<count;f++){const time=Math.min(c.duration,f/fps),n=String(f).padStart(4,'0');for(let row=0;row<2;row++){
   const params={width:540,height:600,yaw:c.views[row],environment:true,effects:true};
   await capture(before,{...params,time:Math.min(8.4,time+c.shift)},join(dir,`b${row}-${n}.png`));
   await capture(after,{...params,time},join(dir,`a${row}-${n}.png`));
  }}
  const input=['b0','a0','b1','a1'].flatMap(k=>['-framerate',String(fps),'-i',join(dir,k+'-%04d.png')]);
  const font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  const labels=[['R2.2 excerpt',18,16],['R2.3 independent',558,16],['R2.2 excerpt',18,616],['R2.3 independent',558,616]].map(([t,x,y])=>`drawtext=fontfile=${font}:text='${t}':x=${x}:y=${y}:fontsize=20:fontcolor=0xffe2a8:box=1:boxcolor=0x191223@0.7:boxborderw=6`).join(',');
  encode([...input,'-filter_complex',`[0][1]hstack[t];[2][3]hstack[b];[t][b]vstack,${labels}[v]`,'-map','[v]'],c.file);
  report.videos.push({file:c.file,frames:count,seconds:c.duration,beforeClockOffset:c.shift,note:'Impact-synchronised R2.2 sequence excerpt at original speed versus autonomous R2.3; original continues into its next action.',views:c.views});await rm(dir,{recursive:true});
  // front, 3/4, profile and Android-sized stills, including face/arm overlap at actual impact
  const time=c.id==='basic01'?1.84:1.48;
  for(const [name,p] of [['front',{yaw:0,width:640,height:720}],['tq',{yaw:40,width:640,height:720}],['profile',{yaw:90,width:640,height:720}],['mobile',{camera:'cinematic',width:390,height:640}]]){const file=`stills/${c.id}-${name}.png`;await capture(after,{time,effects:true,environment:true,...p},join(out,file));report.stills.push(file);}
 }
 await after.evaluate(()=>window.hsinAcceptance.loadAsset('/assets/animations/hsin/combat-r23-combo.json'));
 for(const [id,width,height] of [['c',960,540],['c-vertical',390,640]]){
  const dir=join(out,'frames-'+id);await mkdir(dir,{recursive:true});const count=133;
  for(let f=0;f<count;f++)await capture(after,{time:Math.min(5.5,f/fps),width,height,camera:'cinematic',effects:true,environment:true,minScale:.98},join(dir,`f-${String(f).padStart(4,'0')}.png`));
  const file=id==='c'?'video-c-combo.mp4':'video-c-combo-vertical.mp4';encode(['-framerate',String(fps),'-i',join(dir,'f-%04d.png')],file);report.videos.push({file,frames:count,seconds:5.5});await rm(dir,{recursive:true});
 }
 for(const v of report.videos){v.bytes=(await stat(join(out,v.file))).size;v.probe=JSON.parse(run('ffprobe',['-v','error','-show_entries','stream=codec_name,pix_fmt,width,height,nb_frames,codec_type:format=duration','-of','json',join(out,v.file)]));if(v.bytes<40000||v.probe.streams.some(s=>s.codec_type==='audio')||v.probe.streams[0].codec_name!=='h264')throw Error('Invalid video '+v.file);run('ffmpeg',['-v','error','-i',join(out,v.file),'-f','null','-']);}
 if(report.errors.length)throw Error(report.errors.join('\n'));
}finally{await writeFile(join(out,'video-report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();server.close();}
console.log(JSON.stringify(report));
