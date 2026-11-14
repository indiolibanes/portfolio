import json, time
from playwright.sync_api import sync_playwright
ARGS=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-precise-memory-info']
INIT="""
window.__gl=[];window.__draws=0;
const g=HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext=function(t,...a){const c=g.call(this,t,...a);if(t==='webgl2'&&c&&!this.__r){this.__r=1;window.__gl.push(this)}return c};
const d=CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage=function(...a){window.__draws++;return d.apply(this,a)};
"""
DEFAULT_GLB=open('public/assets/models/sophia/sophia-lab.glb','rb').read()
URL='http://localhost:8765/harness.html'
def run(fn,**kw):
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
        ctx=b.new_context(viewport={'width':900,'height':700},**kw)
        ctx.add_init_script(INIT)
        pg=ctx.new_page(); msgs=[]
        pg.on('console',lambda m:msgs.append((m.type,m.text[:160])))
        pg.on('pageerror',lambda e:msgs.append(('pageerror',str(e)[:200])))
        try: out=fn(pg,ctx)
        finally: b.close()
        out['console']=[m for m in msgs if m[0] in('warning','error','pageerror')][:8]
        return out
def heap(pg):
    c=pg.context.new_cdp_session(pg); c.send('Performance.enable')
    m={x['name']:x['value'] for x in c.send('Performance.getMetrics')['metrics']}
    return round(m['JSHeapUsedSize']/1048576,1)
def state(pg):
    return pg.evaluate("""()=>({gl:window.__gl.length,draws:window.__draws,els:Object.fromEntries([...document.querySelectorAll('.a')].map(e=>[e.id,{on:e.dataset.sophia3d||null,ready:e.dataset.sophiaReady||null,failed:e.dataset.sophiaFailed||null,model:e.dataset.sophiaModel||null,key:e.dataset.sophiaModelKey||null,clip:e.dataset.sophiaClip,canvas:!!e.querySelector('canvas'),art:getComputedStyle(e.querySelector('.art')).display!=='none'}]))})""")
def res(pg):
    return pg.evaluate("""()=>performance.getEntriesByType('resource').filter(r=>/\\.(glb|js)$/.test(r.name)).map(r=>({n:r.name.split('/').slice(-1)[0],kb:Math.round((r.transferSize||r.encodedBodySize)/1024),status:r.responseStatus,start:Math.round(r.startTime),end:Math.round(r.responseEnd)}))""")
def wait_ready(pg,ids,timeout=60000):
    pg.wait_for_function("ids=>ids.every(i=>{const e=document.getElementById(i);return e&&(e.dataset.sophia3d==='on'||e.dataset.sophiaFailed)})",arg=ids,timeout=timeout)
