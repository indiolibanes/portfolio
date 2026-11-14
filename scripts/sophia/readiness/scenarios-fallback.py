import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from common import *
GL='model/gltf-binary'
def glbs(pg): return [r for r in res(pg) if r['n'].endswith('.glb')]
def brief(pg): 
    s=state(pg); return {'gl':s['gl'],**{k:('on' if v['on']=='on' else 'off')+('/failed' if v['failed'] else '')+('/art' if v['art'] else '/NOART')+('/canvas' if v['canvas'] else '') for k,v in s['els'].items()}}
R={}
Q='?only=runner,lab'; P='&publish=1'
def f_net(pg,ctx):
    ctx.route('**/sophia-lab.glb',lambda r:r.abort()); ctx.route('**/sophia-lab-v1.1.glb',lambda r:r.abort())
    pg.goto(URL+Q+P); pg.wait_for_timeout(2500); return {'s':brief(pg)}
R['F1 rede cai']=run(f_net)
def f_inv(pg,ctx):
    ctx.route('**/sophia-lab*.glb',lambda r:r.fulfill(status=200,body=b'not a glb at all'*100,headers={'content-type':GL}))
    pg.goto(URL+Q+P); pg.wait_for_timeout(2500); return {'s':brief(pg)}
R['F2 GLB inválido']=run(f_inv)
def f_trunc(pg,ctx):
    ctx.route('**/sophia-lab*.glb',lambda r:r.fulfill(status=200,body=DEFAULT_GLB[:3_000_000],headers={'content-type':GL}))
    pg.goto(URL+Q+P); pg.wait_for_timeout(3000); return {'s':brief(pg)}
R['F3 GLB truncado']=run(f_trunc)
def f_rm(pg,ctx):
    pg.goto(URL+Q); pg.wait_for_timeout(1500); return {'s':brief(pg),'glb':glbs(pg)}
R['F4 reduced-motion']=run(lambda pg,ctx:(pg.emulate_media(reduced_motion='reduce'),f_rm(pg,ctx))[1])
def f_sd(pg,ctx):
    ctx.add_init_script("Object.defineProperty(navigator,'connection',{value:Object.assign(new EventTarget(),{saveData:true}),configurable:true})")
    pg.goto(URL+Q); pg.wait_for_timeout(1500); return {'s':brief(pg),'glb':glbs(pg)}
R['F5 Save-Data']=run(f_sd)
def f_mem(pg,ctx):
    ctx.add_init_script("Object.defineProperty(navigator,'deviceMemory',{value:4,configurable:true})")
    pg.goto(URL+Q); pg.wait_for_timeout(1500); return {'s':brief(pg),'glb':glbs(pg)}
R['F6 deviceMemory<=4']=run(f_mem)
def f_leg(pg,ctx):
    pg.goto(URL+Q+'&legacy=1'); pg.wait_for_timeout(1500); a={'s':brief(pg),'glb':len(glbs(pg))}
    pg.evaluate("document.documentElement.dataset.legacyMode='false'"); wait_ready(pg,['runner','lab']); a['after_leave_legacy']=brief(pg)
    pg.evaluate("document.documentElement.dataset.legacyMode='true'"); pg.wait_for_timeout(600); a['after_reenter_legacy']=brief(pg); return a
R['F7 modo retrô (entra/sai/entra)']=run(f_leg)
def f_hid(pg,ctx):
    pg.goto(URL+Q); wait_ready(pg,['runner','lab']); pg.wait_for_timeout(800)
    d0=pg.evaluate('window.__draws'); pg.wait_for_timeout(1000); d1=pg.evaluate('window.__draws')
    pg.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(300)
    h0=pg.evaluate('window.__draws'); pg.wait_for_timeout(1000); h1=pg.evaluate('window.__draws')
    pg.evaluate("Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(1000); r1=pg.evaluate('window.__draws')
    return {'draws_visible_1s':d1-d0,'draws_hidden_1s':h1-h0,'draws_after_resume_1s':r1-h1,'s':brief(pg)}
R['F8 aba oculta/retomada']=run(f_hid)
def f_scroll(pg,ctx):
    pg.goto(URL); pg.wait_for_timeout(2500); a={'top':brief(pg)}
    pg.evaluate('window.scrollTo(0,2300)'); pg.wait_for_timeout(2500); a['scrolled_to_far']=brief(pg)
    d0=pg.evaluate('window.__draws'); pg.wait_for_timeout(1000); a['draws_1s_far']=pg.evaluate('window.__draws')-d0
    pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(1200); a['back_top']=brief(pg); return a
R['F9 viewport entra/sai (3 atores)']=run(f_scroll)
def f_lost(pg,ctx):
    ctx.route('**/sophia-lab-v1.1.glb',lambda r:r.fulfill(status=200,body=DEFAULT_GLB,headers={'content-type':GL}))
    pg.goto(URL+Q+P+'&labclip=Sophia_ExpressionFlow_R6'); wait_ready(pg,['runner','lab']); pg.wait_for_timeout(1500)
    out={'start':brief(pg),'heap0':heap(pg),'iters':[]}
    for i in range(5):
        t=pg.evaluate("""async()=>{const t0=performance.now();const cs=window.__gl.filter(c=>{try{return !c.getContext('webgl2').isContextLost()}catch(e){return false}});
            const ext=cs.map(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context'));ext.forEach(e=>e.loseContext());await new Promise(r=>setTimeout(r,200));
            const mid=[...document.querySelectorAll('.a')].map(e=>e.dataset.sophia3d);ext.forEach(e=>{try{e.restoreContext()}catch(_){}});
            await new Promise(r=>{const i=setInterval(()=>{if([...document.querySelectorAll('.a')].every(e=>e.dataset.sophia3d==='on')){clearInterval(i);r()}},50);setTimeout(()=>{clearInterval(i);r()},20000)});
            return {lostContexts:cs.length,midStates:mid,recoveryMs:Math.round(performance.now()-t0)-200}}""")
        t['gl_created_total']=pg.evaluate('window.__gl.length'); t['live_gl']=pg.evaluate("window.__gl.filter(c=>{try{return !c.getContext('webgl2').isContextLost()}catch(e){return false}}).length"); t['heapMB']=heap(pg); t['s']=brief(pg); out['iters'].append(t)
    return out
R['F10 perda/restauração de contexto x5 (2 palcos)']=run(f_lost)
def f_iso(pg,ctx):
    ctx.route('**/sophia-lab-v1.1.glb',lambda r:r.fulfill(status=200,body=DEFAULT_GLB,headers={'content-type':GL}))
    pg.goto(URL+Q+P+'&labclip=Sophia_ExpressionFlow_R6'); wait_ready(pg,['runner','lab']); pg.wait_for_timeout(800)
    pg.evaluate("""async()=>{const m=window.__m;const a=m.actorOf(document.getElementById('lab'));a.draw=()=>{throw new Error('falha injetada no ator lab')}}""")
    pg.wait_for_timeout(500); d0=pg.evaluate('window.__draws'); pg.wait_for_timeout(1500); d1=pg.evaluate('window.__draws')
    return {'draws_after_injected_failure_1.5s':d1-d0,'s':brief(pg)}
R['F11 isolamento: um ator lança erro no draw']=run(f_iso)
def f_first(pg,ctx):
    pg.goto(URL+Q+'&patch=draw')
    pg.wait_for_function('window.__loaded===true')
    pg.wait_for_timeout(2500); a={'s':brief(pg)}
    a['actor_still_registered']=pg.evaluate("[...document.querySelectorAll('.a')].map(e=>!!window.__m.actorOf(e))")
    d0=pg.evaluate('window.__draws'); pg.wait_for_timeout(1000); a['draws_1s']=pg.evaluate('window.__draws')-d0
    return a
R['F12 primeiro desenho falha (ator fica registrado?)']=run(f_first)
json.dump(R,open('scripts/sophia/readiness/results-after2.json','w'),indent=1)
for k,v in R.items():
    c=[x for x in v.pop('console') if 'GPU stall' not in x[1]]
    print('##',k); print('  ',json.dumps(v,ensure_ascii=False)[:900]); 
    if c: print('   console:',[(t,m[:90]) for t,m in c][:3])
