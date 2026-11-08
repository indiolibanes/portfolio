/**
 * Combat R2.1 real-WebGL smoke and measurement run in headless Chromium (SwiftShader software GL).
 * Usage: node scripts/qa/run-hsin-combat-webgl.mjs OUT_DIR --stage-url=http://127.0.0.1:4321
 *
 * What this proves: the real page, the real GLB, lighting and the pooled effects render without WebGL errors; draw calls,
 * triangles and live-object counts come from renderer.info; the sequence is stable across repetitions; manual camera input
 * overrides the automatic camera. What it does NOT prove: frame time or smoothness on a GPU. SwiftShader is the CPU.
 * Result is WEBGL_QA_SOFTWARE, never a performance or artistic approval.
 */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const out=process.argv[2],flag=(n,d='')=>(process.argv.find(a=>a.startsWith(`--${n}=`))??`--${n}=${d}`).split('=').slice(1).join('=');
const stageUrl=flag('stage-url','http://127.0.0.1:4321'),variant=flag('variant','');
if(!out)throw Error('Usage: OUT_DIR --stage-url=URL');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-precise-memory-info']});
const report={status:'WEBGL_QA_SOFTWARE',renderer:null,viewports:{},limitation:'Headless Chromium on SwiftShader (CPU). Frame times here are not GPU times and say nothing about phones or desktops with a GPU.'};
const SHOTS=[['00-preparation',.9],['01-basic01-windup',1.6],['02-basic01-impact',2.12],['03-basic02-impact',3.12],['04-skill-charge',4.5],['05-skill-hold',5.15],['06-skill-release',5.5],['07-afterglow',5.85],['08-recovery',6.6],['09-settle',7.6]];
async function pageState(page){return page.evaluate(()=>{const c=window.__hsinCombat?.diagnostics?.();const m=window.__hsinMetrics?.report?.();return {combat:c?{state:c.state,time:c.time,camera:c.camera,panel:c.panel,cameraYawDeg:c.cameraYawDeg,vfx:c.vfx,env:c.env??null,cycle:c.cycle,extraDrawCalls:c.extraDrawCalls,visibleDrawCalls:c.visibleDrawCalls,geometries:c.geometries,materials:c.materials,decodedBytes:c.decodedBytes,bakeBytes:c.bakeBytes,lastCpuMs:c.lastCpuMs,revision:c.revision}:null,renderer:m?.renderer??null,frameInterval:m?.timingsMs?.frameInterval??null,render:m?.timingsMs?.render??null,heap:performance.memory?.usedJSHeapSize??null};});}
async function run(name,viewport,opts){
 const context=await browser.newContext({viewport,deviceScaleFactor:opts.dpr,hasTouch:!!opts.touch,isMobile:!!opts.touch,...(opts.video?{recordVideo:{dir:join(out,'video-raw'),size:viewport}}:{})});
 const page=await context.newPage(),errors=[],warnings=[];
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());else if(m.type()==='warning'&&/webgl|gl_|context/i.test(m.text()))warnings.push(m.text());});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`${stageUrl}/experimentos/combate/?hsin-metrics`);
 await page.waitForSelector('[data-hsin-stage][data-state="ready"]',{timeout:240000});
 const gpu=await page.evaluate(()=>{const g=document.createElement('canvas').getContext('webgl2')||document.createElement('canvas').getContext('webgl');const e=g?.getExtension('WEBGL_debug_renderer_info');return g?{renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'n/a',version:g.getParameter(g.VERSION)}:null;});
 report.renderer??=gpu;report.variant=variant||'r2';
 const before=await pageState(page);
 if(variant)await page.selectOption('[data-combat-version]',variant);
 await page.click('[data-combat-load]');
 await page.waitForFunction(()=>!document.querySelector('[data-combat-controls]')?.hidden,null,{timeout:120000});
 const loaded=await pageState(page);
 const result={viewport,dpr:opts.dpr,view:opts.view??'front',errors,warnings,before:before.renderer,loaded:loaded.combat,shots:[],repetitions:[],camera:{},panel:{}};
 const canvas=page.locator('[data-stage-canvas]');
 const shot=async(file)=>{await canvas.screenshot({path:join(out,`${name}-${file}.png`)});};
 // --- repetition 1: stepped screenshots, paused at each combat time so VFX/pose are frozen on the exact clock
 await page.waitForTimeout(300);await shot('ui-expanded');
 const panelRect=()=>page.evaluate(()=>{const p=document.querySelector('.combat-panel'),r=p.getBoundingClientRect(),v=document.documentElement.getBoundingClientRect(),t=document.querySelector('[data-combat-panel-toggle]');return {x:r.x,y:r.y,w:r.width,h:r.height,viewportW:innerWidth,viewportH:innerHeight,areaFraction:+(r.width*r.height/(innerWidth*innerHeight)).toFixed(4),collapsed:p.dataset.collapsed??null,toggle:t?.getAttribute('aria-expanded')??null,controlsVisible:[...p.querySelectorAll('[data-combat-action]')].filter(b=>b.offsetParent!==null).map(b=>b.dataset.combatAction)};});
 result.panel.expanded=await panelRect();
 if(opts.drag){const box=await canvas.boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height*.5;await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+opts.drag,cy,{steps:16});await page.mouse.up();await page.waitForTimeout(600);}
 else await page.click('[data-combat-action="camera"]');
 await page.click('[data-combat-action="play"]');
 for(const [id,time] of SHOTS){
  await page.waitForFunction(t=>{const d=window.__hsinCombat?.diagnostics?.();return d&&(d.time>=t||d.state==='COMPLETE');},time,{timeout:240000,polling:30});
  await page.click('[data-combat-action="pause"]');await page.waitForTimeout(500);
  const s=await pageState(page);await shot(id);
  if(id==='01-basic01-windup')result.panel.playing=await panelRect();
  result.shots.push({id,target:time,time:s.combat?.time,state:s.combat?.state,env:s.combat?.env?{instances:s.combat.env.instances,triangles:s.combat.env.triangles,planted:s.combat.env.planted,pelvisShift:s.combat.env.pelvisShift}:null,renderer:s.renderer,visibleDrawCalls:s.combat?.visibleDrawCalls,panel:s.combat?.panel,cameraYawDeg:s.combat?.cameraYawDeg,cameraMode:s.combat?.camera,vfx:s.combat?.vfx});
  await page.click('[data-combat-action="pause"]');
 }
 // --- the collapsed panel can be expanded and folded again by the user, and its controls stay reachable
 await page.click('[data-combat-panel-toggle]');result.panel.afterToggleOpen=await panelRect();
 await page.click('[data-combat-panel-toggle]');result.panel.afterToggleFold=await panelRect();
 await page.waitForFunction(()=>window.__hsinCombat?.diagnostics?.().state==='COMPLETE',null,{timeout:240000,polling:100});
 result.panel.complete=await panelRect();
 if(opts.skipRest){result.final=await pageState(page);await page.screenshot({path:join(out,`${name}-page-final.png`)});await context.close();return result;}
 // --- manual camera override: automatic camera must yield immediately
 await page.click('[data-combat-action="play"]');await page.waitForTimeout(600);
 await page.click('[data-combat-action="camera"]');
 const auto=await pageState(page);await canvas.hover();await page.mouse.wheel(0,120);await page.waitForTimeout(200);
 const manual=await pageState(page);result.camera={afterToggle:auto.combat?.camera,afterWheel:manual.combat?.camera};
 await page.click('[data-combat-action="stop"]');
 await page.waitForFunction(()=>!window.__hsinCombat?.owns?.(),null,{timeout:60000,polling:100});
 // --- repetitions: full runs back to back; live-object counts must not grow
 for(let rep=1;rep<=3;rep++){
  await page.click('[data-combat-action="play"]');
  let peak={calls:0,triangles:0};
  const started=Date.now();
  while(Date.now()-started<240000){
   const s=await pageState(page);
   if(s.renderer){peak.calls=Math.max(peak.calls,s.renderer.calls);peak.triangles=Math.max(peak.triangles,s.renderer.triangles);}
   if(s.combat&&s.combat.state==='COMPLETE')break;
   await page.waitForTimeout(150);
  }
  await page.waitForFunction(()=>!window.__hsinCombat?.owns?.(),null,{timeout:60000,polling:100});
  const after=await pageState(page);
  result.repetitions.push({rep,peak,after:after.renderer,heap:after.heap,frameInterval:after.frameInterval,render:after.render,state:after.combat?.state});
 }
 result.final=await pageState(page);
 await page.screenshot({path:join(out,`${name}-page-final.png`)});
 await context.close();return result;
}
try{
 report.viewports.desktop=await run('desktop',{width:1280,height:720},{dpr:1});
 report.viewports.phone=await run('phone',{width:390,height:844},{dpr:2,touch:true});
 // Side views: a manual drag to the OrbitControls azimuth limit on each side (manual camera has priority over the automatic one).
 report.viewports.sideRight=await run('side-right',{width:1280,height:720},{dpr:1,drag:700,skipRest:true,view:'side-right'});
 report.viewports.sideLeft=await run('side-left',{width:1280,height:720},{dpr:1,drag:-700,skipRest:true,view:'side-left'});
 // Continuous capture with the automatic camera and the effects (real WebGL on SwiftShader: the motion is only as smooth as the CPU renders it).
 report.viewports.video=await run('video',{width:1280,height:720},{dpr:1,video:true,skipRest:true,view:'front-auto-video'});
}finally{await browser.close();}
const errs=Object.values(report.viewports).flatMap(v=>v.errors);
// Summarise: effect delta in draw calls and triangles between non-effect and effect frames, and object-count stability.
for(const v of [report.viewports.desktop,report.viewports.phone]){
 const idle=v.shots.find(s=>s.id==='00-preparation')?.renderer,skill=v.shots.find(s=>s.id==='05-skill-hold')?.renderer,release=v.shots.find(s=>s.id==='06-skill-release')?.renderer;
 v.effectDelta={prepCalls:idle?.calls,skillHoldCalls:skill?.calls,releaseCalls:release?.calls,skillHoldExtraCalls:skill&&idle?skill.calls-idle.calls:null,releaseExtraCalls:release&&idle?release.calls-idle.calls:null,skillHoldExtraTriangles:skill&&idle?skill.triangles-idle.triangles:null,releaseExtraTriangles:release&&idle?release.triangles-idle.triangles:null};
 const g=v.repetitions.map(r=>r.after?.geometries),t=v.repetitions.map(r=>r.after?.textures);
 v.stable={geometriesPerRepetition:g,texturesPerRepetition:t,noGrowth:g.every(x=>x===g[0])&&t.every(x=>x===t[0]),heapMiB:v.repetitions.map(r=>r.heap?+(r.heap/1048576).toFixed(1):null)};
}
for(const v of Object.values(report.viewports)){
 v.skillRead=v.shots.filter(s=>s.vfx?.core?.visible).map(s=>{const p=s.vfx,dx=p.core.ndc[0]-p.palmMidNdc[0],dy=p.core.ndc[1]-p.palmMidNdc[1];return {id:s.id,time:s.time,coreToPalmMidNdc:+Math.hypot(dx,dy).toFixed(4),corePalmSpanNdc:+Math.hypot(p.palmRNdc[0]-p.palmLNdc[0],p.palmRNdc[1]-p.palmLNdc[1]).toFixed(4),coreOpacity:p.opacity.core,shellOpacity:p.opacity.shell,ringOpacity:p.opacity.ring};});
}
report.errors=errs;
await writeFile(join(out,'webgl-report.json'),JSON.stringify(report,null,1));
console.log(JSON.stringify({views:Object.fromEntries(Object.entries(report.viewports).map(([k,v])=>[k,{skillRead:v.skillRead,panel:v.panel&&{expanded:v.panel.expanded?.areaFraction,playing:v.panel.playing?.areaFraction,toggle:[v.panel.afterToggleOpen?.collapsed,v.panel.afterToggleFold?.collapsed]},yaw:v.shots.map(s=>s.cameraYawDeg)}])),status:report.status,renderer:report.renderer,errors:errs.length,desktop:report.viewports.desktop.effectDelta,phone:report.viewports.phone.effectDelta,stable:[report.viewports.desktop.stable.noGrowth,report.viewports.phone.stable.noGrowth],camera:[report.viewports.desktop.camera,report.viewports.phone.camera]},null,1));
if(errs.length){console.error(errs.join('\n'));process.exit(1);}
