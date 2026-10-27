const fs=require('fs'),http=require('http'),path=require('path'),{chromium,devices}=require('playwright');
(async()=>{const glbs=process.argv.slice(2).map(p=>path.resolve(p));const threeRoot=process.env.THREE_ROOT;
const server=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);let p;if(u==='/p.html')p=path.join(__dirname,'perf.html');else if(u.startsWith('/m/'))p=glbs[+u.slice(3)];else if(u.startsWith('/vendor/three/'))p=path.join(threeRoot,u.slice(14));if(!p||!fs.existsSync(p)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(p).pipe(res)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--enable-precise-memory-info','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const out=[];
for(const scenario of ['desktop_900x900','mobile_emulated_390x844_dpr1_cpu4x']){
 for(let rep=0;rep<2;rep++)for(let i=0;i<glbs.length;i++){
  const ctx=await browser.newContext(scenario.startsWith('mobile')?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:900,height:900}});const page=await ctx.newPage();
  if(scenario.startsWith('mobile')){const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})}
  await page.goto(`http://127.0.0.1:${server.address().port}/p.html`);await page.waitForFunction(()=>window.ready);
  const [w,h]=scenario.startsWith('mobile')?[390,844]:[900,900];
  const r=await page.evaluate(([p,w,h])=>window.run(p,w,h),['/m/'+i,w,h]);out.push({scenario,rep,file:path.basename(glbs[i]),...r});await ctx.close()}}
console.log(JSON.stringify(out,null,1));await browser.close();server.close()})();
