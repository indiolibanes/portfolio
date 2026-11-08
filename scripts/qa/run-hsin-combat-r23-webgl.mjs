/** Real page resource/lifecycle checks. SwiftShader; never a Samsung FPS claim. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2],base=process.argv[3]??'http://127.0.0.1:4321';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const report={method:'Actual lab page + real GLB in software WebGL',physicalGpu:false,views:{},errors:[]};
try{
 for(const [name,viewport] of [['desktop',{width:1280,height:720}],['android-layout',{width:390,height:640}]]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(String(e)));await page.goto(base+'/experimentos/combate/?hsin-metrics');await page.waitForSelector('[data-state="ready"]',{timeout:240000});
  await page.click('[data-combat-load]');await page.waitForFunction(()=>window.__hsinCombat,null,{timeout:120000});
  const records=[];let stagePaused=false;
  async function select(id){
   if(stagePaused){await page.click('[data-stage-pause]');stagePaused=false;}
   for(let attempt=0;attempt<10;attempt++){
    await page.evaluate(id=>document.querySelector(`[data-combat-ability="${id}"]`).click(),id);
    await page.waitForTimeout(200);
    const d=await page.evaluate(()=>window.__hsinCombat.diagnostics());
    if(!d.selecting&&d.ability===id&&d.owned){await page.click('[data-stage-pause]');stagePaused=true;console.log('Acquired',name,id);return;}
   }
   throw Error('Selection failed '+id+' '+JSON.stringify(await page.evaluate(()=>({d:window.__hsinCombat.diagnostics(),status:document.querySelector('[data-combat-status]').textContent}))));
  }

  for(const id of ['basic01','basic02','combo','skill','legacy']){
   await select(id);
   const d=await page.evaluate(()=>{const c=window.__hsinCombat,s=c.diagnostics();for(let i=0;i<Math.round(s.seconds*60)+1;i++)c.advance(1/60);return c.diagnostics();});assert.equal(d.atBaseline,true);assert.equal(d.visibleDrawCalls,0);records.push({id,seconds:d.seconds,trace:d.trace.filter(x=>x.cycle===d.cycle),baseline:d.atBaseline});
  }
  const cycles=[];
  for(let k=0;k<10;k++){
   const id=k%2?'basic01':'basic02';await select(id);
   await page.evaluate(()=>{const c=window.__hsinCombat;for(let i=0;i<270;i++)c.advance(1/60);document.querySelector('[data-combat-panel-toggle]').click();});await page.waitForTimeout(150);
   cycles.push(await page.evaluate(()=>window.__hsinMetrics.report().renderer));
  }
  assert.ok(cycles.every(x=>x.geometries===cycles[0].geometries&&x.textures===cycles[0].textures),'GPU object counts stable');
  await select('basic02');await page.evaluate(()=>{window.__hsinCombat.advance(1.48);document.querySelector('[data-combat-panel-toggle]').click();});await page.waitForTimeout(150);await page.screenshot({path:out+'/'+name+'-impact.png'});
  const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,panel:document.querySelector('.combat-panel').getBoundingClientRect().toJSON()}));assert.ok(layout.scroll<=layout.width+1);
  report.views[name]={viewport,records,cycles,layout};await page.close();
 }
 assert.deepEqual(report.errors,[]);
}finally{await writeFile(out+'/webgl-report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
