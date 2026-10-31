import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('qa-results/sophia-404-2d', {recursive:true});
const browser=await chromium.launch({
  headless:true,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'],
});
let failed=false;
try {
  for(const width of [390,768,1440]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4321/404.html',{waitUntil:'domcontentloaded'});
    const info=await page.evaluate(()=>({
      tetris:!!document.querySelector('[data-tetris-canvas]'),
      stage3d:[...document.querySelectorAll('[data-sophia-stage]')].map(el=>el.dataset.sophiaStage),
      room2d:!!document.querySelector('[data-sophia-room2d]'),
      overflow:document.documentElement.scrollWidth>innerWidth+4,
    }));
    if(!info.tetris||!info.room2d||info.overflow||info.stage3d.join(',')!=='portrait') {
      console.error('FAIL shell',width,info);failed=true;
    }
    await page.locator('[data-tetris-start]').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    const score=Number(await page.locator('[data-tetris-score]').innerText());
    if(score<=0){console.error('FAIL Tetris inputs',width,score);failed=true;}
    const root=page.locator('[data-sophia-room2d]');
    await root.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>{
      const r=document.querySelector('[data-sophia-room2d]');
      return r?.dataset.running==='true' && r.dataset.phase==='enter';
    },null,{timeout:10000}).catch(()=>{});
    await page.waitForFunction(()=>{
      return [...document.querySelectorAll('[data-sophia-room2d] img')].every(img=>img.complete && img.naturalWidth>0);
    },null,{timeout:12000});
    const assets=await root.evaluate(el=>({
      count:el.querySelectorAll('img').length,
      hiddenOldFox:getComputedStyle(el.querySelector('.slo-fox')).display,
      running:el.dataset.running,
      phase:el.dataset.phase,
      loaded:[...el.querySelectorAll('img')].map(x=>x.naturalWidth),
    }));
    if(assets.count!==6||assets.hiddenOldFox!=='none'||assets.loaded.some(w=>w<=0)) {
      console.error('FAIL sprites',width,assets);failed=true;
    } else console.log('PASS sprites',width,assets);

    if(width!==768){
      await page.waitForFunction(()=>document.querySelector('[data-sophia-room2d]')?.dataset.phase==='throw',
        null,{timeout:12500});
      await root.screenshot({path:`qa-results/sophia-404-2d/throw-${width}.png`,animations:'allow'});
      await page.waitForFunction(()=>document.querySelector('[data-sophia-room2d]')?.dataset.phase==='leave',
        null,{timeout:7500});
      await root.screenshot({path:`qa-results/sophia-404-2d/leave-${width}.png`,animations:'allow'});
    }
    if(errors.length){console.error('FAIL errors',width,errors);failed=true;}
    console.log('PASS /404',width,{score,errors:errors.length});
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:840},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4321/404.html',{waitUntil:'domcontentloaded'});
  await page.locator('[data-sophia-room2d]').scrollIntoViewIfNeeded();
  const reduced=await page.locator('[data-sophia-room2d]').evaluate(root=>({
    phase:root.dataset.phase,
    visible:getComputedStyle(root.querySelector('.sophia-room2d__sprite--play')).opacity,
    animation:getComputedStyle(root.querySelector('.sophia-room2d__sprite--play')).animationName,
  }));
  if(reduced.phase!=='play'||reduced.visible!=='1'||reduced.animation!=='none') {
    failed=true;console.error('FAIL reduced motion',reduced);
  } else console.log('PASS reduced motion',reduced);
  await page.screenshot({path:'qa-results/sophia-404-2d/reduced-390.png',fullPage:true});
  await page.close();
} finally {
  await browser.close();
}
if(failed)process.exitCode=1;
