/** Deterministic exact-clock WebGL captures. SwiftShader provides visual evidence only. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {serve} from './serve.mjs';
const output=process.argv[2];
if(!output)throw Error('Supply output directory');
await mkdir(output,{recursive:true});
const {server,url}=await serve();
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const report={status:'SOFTWARE_WEBGL',errors:[],shots:[],limitation:'No physical GPU, FPS or artistic approval.'};
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',error=>report.errors.push(String(error)));
 await page.goto(url+'/scripts/qa/hsin-combat-acceptance.html');
 await page.waitForFunction(()=>window.hsinAcceptanceReady,null,{timeout:120000});
 report.renderer=await page.evaluate(()=>{const gl=window.hsinHarness.state.renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');return extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unknown';});
 for(const [version,asset] of [['before','/qa-input/before.json'],['after','/assets/animations/hsin/combat-r2.json']]){
  await page.evaluate(asset=>window.hsinAcceptance.loadAsset(asset),asset);
  for(const time of [3.3,3.32,3.4,3.5])for(const [view,yaw] of [['front',0],['three-quarter',40],['profile',90]]){
   const shot=await page.evaluate(options=>window.hsinAcceptance.seek(options),{time,yaw,detail:true,width:640,height:640,effects:false});
   const file=version+'-basic02-'+time+'-'+view+'.png';
   await page.locator('#c').screenshot({path:path.join(output,file)});report.shots.push({version,file,...shot});
  }
  if(version==='before')for(const time of [1.55,1.7333333333333334,1.9666666666666666,2.066666666666667,2.2,2.3]){
   const shot=await page.evaluate(options=>window.hsinAcceptance.seek(options),{time,yaw:40,width:960,height:720,effects:true});
   const file='basic01-energy-'+time+'.png';await page.locator('#c').screenshot({path:path.join(output,file)});report.shots.push({version,file,...shot});
  }
  for(const [name,time] of [['preparation',1.3],['basic01-impact',2.2],['skill-release',5.45],['recovery',6.6]]){
   const shot=await page.evaluate(options=>window.hsinAcceptance.seek(options),{time,yaw:0,detail:true,width:640,height:640,effects:false});
   const file=version+'-face-'+name+'.png';
   await page.locator('#c').screenshot({path:path.join(output,file)});report.shots.push({version,file,...shot});
  }
  if(version==='after')for(const [name,time] of [['energy',.8],['trail',1.8],['arc',2.2],['trail-left',2.78],['arc-left',3.32],['charge',3.95],['ring',5.45],['recovery',6]]){
   const shot=await page.evaluate(options=>window.hsinAcceptance.seek(options),{time,yaw:40,width:960,height:720,effects:true});
   const file='event-'+name+'.png';await page.locator('#c').screenshot({path:path.join(output,file)});
   if(!shot.events.some(event=>event.name===name&&event.time===time))throw Error('Event not captured at exact time '+name);
   report.shots.push({version,file,...shot});
  }
 }
 if(report.errors.length)throw Error(report.errors.join('\n'));
}finally{
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 await browser.close();server.close();
}
