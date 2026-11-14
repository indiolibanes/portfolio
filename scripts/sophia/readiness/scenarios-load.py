import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from common import *
R={}
# S1: estado atual — GLB do lab-r2 ausente (404 real do servidor), runner + lab coexistem
def s1(pg,ctx):
    pg.goto(URL+'?only=runner,lab'); wait_ready(pg,['runner','lab']); pg.wait_for_timeout(2500)
    return {'state':state(pg),'events':pg.evaluate('window.__ev'),'res':res(pg),'heapMB':heap(pg)}
R['S1_current_lab_r2_missing']=run(s1)
# S2: R2 publicado (stand-in: mesmo GLB padrão servido na URL do lab-r2) -> dois palcos
def s2(pg,ctx):
    ctx.route('**/sophia-lab-v1.1.glb',lambda r:r.fulfill(status=200,body=DEFAULT_GLB,headers={'content-type':'model/gltf-binary'}))
    pg.goto(URL+'?only=runner,lab&publish=1&labclip=Sophia_ExpressionFlow_R6'); wait_ready(pg,['runner','lab']); pg.wait_for_timeout(2500)
    return {'state':state(pg),'events':pg.evaluate('window.__ev'),'res':res(pg),'heapMB':heap(pg)}
R['S2_two_stages_standin']=run(s2)
json.dump(R,open('scripts/sophia/readiness/results-after.json','w'),indent=1)

for k,v in R.items():
    print('==',k); st=v['state']; print(' gl contexts:',st['gl'],' draws:',st['draws'],' heapMB:',v['heapMB'])
    for i,e in st['els'].items(): print('  ',i,e)
    for e in v['events']: print('  ev',e)
    for r in v['res']: print('  res',r)
    print('  console',[c for c in v['console'] if 'GPU stall' not in c[1]])
