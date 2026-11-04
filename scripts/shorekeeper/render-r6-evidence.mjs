/** Private, deterministic WebGL evidence; never writes assets under public/ or reports GPU performance.
 * MODEL BUNDLE ORIGINAL_CAPTURE_DIR OUTPUT_DIR CHROMIUM [PLAYWRIGHT_MODULE]
 * Bundle tests/shorekeeper-r6/scene.mjs as iife first. OUTPUT must be outside repository.
 */
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';import {createRequire} from 'node:module';
const [model,bundle,beforeDir,outDir,browserPath,pw='playwright']=process.argv.slice(2);
if(!browserPath)throw Error('MODEL BUNDLE ORIGINAL_CAPTURE_DIR OUTPUT_DIR CHROMIUM [PLAYWRIGHT_MODULE]');
const out=path.resolve(outDir),repo=path.resolve(new URL('../..',import.meta.url).pathname);
if(out===repo||out.startsWith(repo+path.sep))throw Error('Private evidence must be outside repository');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),bytes=await fs.readFile(model);
if(sha(bytes)!=='4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30')throw Error('Canonical model hash mismatch');
const {chromium}=createRequire(import.meta.url)(pw),b=await chromium.launch({headless:true,executablePath:path.resolve(browserPath),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--single-process','--no-zygote','--in-process-gpu']});
await fs.mkdir(out,{recursive:true});
const report={schema:'shorekeeper.r6.webgl-evidence/1',canonicalSha256:sha(bytes),bundleSha256:sha(await fs.readFile(bundle)),renderClass:'SWIFTSHADER_WEBGL2',humanApproval:null,appearanceProfile:'APPEARANCE_PROFILE_UNVERIFIED',errors:[],baseline:[],sequences:[]};
try{
 const p=await b.newPage({viewport:{width:512,height:512}});p.on('pageerror',e=>report.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await p.setContent('<!doctype html><style>body{margin:0}</style>');await p.addScriptTag({content:await fs.readFile(bundle,'utf8')});
 const call=(method,arg)=>p.evaluate(({method,arg})=>QA[method](arg),{method,arg});
 const loaded=await call('load',bytes.toString('base64'));report.clips=loaded.clips;
 const shot=async()=>Buffer.from((await call('shot')).split(',')[1],'base64');
 const original=JSON.parse(await fs.readFile(path.join(beforeDir,'capture-manifest.json'),'utf8'));
 let condition='';
 for(const c of process.env.R6_SKIP_BASELINE==='1'?[]:original.captures){
  const key=JSON.stringify([c.viewport,c.geometry,c.yaw]);if(key!==condition){await p.setViewportSize({width:c.viewport[0],height:c.viewport[1]});await call('resize');await call('geometry',c.geometry);await call('camera',{kind:'face',yaw:c.yaw});condition=key;}
  await call('r6Peak',{id:c.id,weight:c.weight});const png=await shot(),after=sha(png);
  // Keep failed frames too; decoded-pixel analysis is a separate, explicit step.
  const file='baseline-after/'+path.basename(c.file);await fs.mkdir(path.join(out,'baseline-after'),{recursive:true});await fs.writeFile(path.join(out,file),png);
  report.baseline.push({...c,originalSha256:c.sha256,sha256:after,byteEqual:after===c.sha256,file});
 }
 await fs.writeFile(path.join(out,'baseline-results.json'),JSON.stringify(report.baseline,null,2));console.log('BASELINE',report.baseline.length,report.baseline.filter(c=>!c.byteEqual).length,'different PNGs');
 await p.setViewportSize({width:360,height:400});await call('resize');await call('geometry','canonical');
 const specs=await call('r6Candidates');
 const captureSequence=async(id,spec,yaw,bodyId=null)=>{
  await call('r6Reset');await call('camera',{kind:'face',yaw});
  const name=`${bodyId??'neutral'}-${id}-${yaw}`,dir=path.join(out,'sequences',name);await fs.mkdir(dir,{recursive:true});
  const fps=10,duration=7,frames=duration*fps+1,states=[];
  for(const side of ['baseline','candidate']){
   await call('r6Start',{id:side==='baseline'?spec.source:id,baseline:side==='baseline'});
   for(let n=0;n<frames;n++){
    if(bodyId)await call('body',{id:bodyId,time:n/fps});
    if(n>0)await call('r6Step',{dt:1/fps,blink:n===17,neutral:n===32&&side==='baseline'});
    const file=`${side}-${String(n).padStart(3,'0')}.png`,png=await shot();await fs.writeFile(path.join(dir,file),png);
    states.push({side,frame:n,time:n/fps,file,sha256:sha(png),weights:(await call('r6Report')).weights});
   }
  }
  // Material/GLB renders are genuine WebGL. Offline stepping FPS is not a hardware speed measurement.
  const video=path.join(dir,'comparison.mp4'),v=spawnSync('ffmpeg',['-y','-loglevel','error','-framerate',String(fps),'-i',path.join(dir,'baseline-%03d.png'),'-framerate',String(fps),'-i',path.join(dir,'candidate-%03d.png'),'-filter_complex',"[0:v]drawtext=text='BASELINE':x=12:y=15:fontcolor=white:fontsize=14[a];[1:v]drawtext=text='R6 CANDIDATE':x=12:y=15:fontcolor=white:fontsize=14[b];[a][b]hstack=inputs=2",'-c:v','libx264','-crf','20','-pix_fmt','yuv420p',video],{encoding:'utf8'});
  if(v.status)throw Error(v.stderr||'ffmpeg failed');
  await fs.writeFile(path.join(dir,'timeline.json'),JSON.stringify(states,null,2));report.sequences.push({name,id,baseline:spec.source,yaw,bodyId,geometry:'canonical',fps,duration,frames,video:path.relative(out,video),videoSha256:sha(await fs.readFile(video)),manualBaselineReleaseAt:3.2,blinkAt:1.7});
  await fs.writeFile(path.join(out,'render-report.json'),JSON.stringify(report,null,2));console.log('VIDEO',name);
 };
 for(const [id,spec]of Object.entries(specs).filter(([id])=>!process.env.R6_BODY_ONLY&&(!process.env.R6_FAMILIES||process.env.R6_FAMILIES.split(',').includes(id))))for(const yaw of [0,45,90])await captureSequence(id,spec,yaw);
 for(const id of loaded.clips.filter(id=>!process.env.R6_FAMILIES&&/^SK_IDLE_0[123]_ORIGINAL$/.test(id)))await captureSequence('MY_STAR_ACTING_R6',specs.MY_STAR_ACTING_R6,0,id);
 // Gesture reference exists in the canonical asset; private combat libraries are not presumed present.
 const gesture=loaded.clips.find(id=>/F1[._]6|GESTURE|Stand1_Action01_window/i.test(id));if(gesture&&!process.env.R6_FAMILIES)await captureSequence('LITTLE_SMILE_ACTING_R6',specs.LITTLE_SMILE_ACTING_R6,45,gesture);
 report.renderer=await call('info');report.status=report.errors.length||report.renderer.shaderErrors?'FAILED':'WEBGL_RENDER_PASS';await call('dispose');
} catch(e){report.failure=String(e.stack);throw e;}finally{await fs.writeFile(path.join(out,'render-report.json'),JSON.stringify(report,null,2));await b.close();}
