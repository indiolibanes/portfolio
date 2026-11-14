import hashlib, json, numpy as np, sys
# usage: python3 integrity.py R15.glb R16.glb manifest.json
from glbdoc import GLB
def H(a): return hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()[:16]
def summarize(path):
    g=GLB(path); j=g.j; out={}
    out['sha256']=hashlib.sha256(open(path,'rb').read()).hexdigest()
    out['bytes']=len(open(path,'rb').read())
    sk=j['skins'][0]; out['bones']=len(sk['joints']); out['ibm']=H(g.acc(sk['inverseBindMatrices']))
    out['node_names']=H(np.array([n.get('name','') for n in j['nodes']]).astype('U64'))
    out['node_trs']=H(np.array([json.dumps([n.get('translation'),n.get('rotation'),n.get('scale')]) for n in j['nodes']]).astype('U200'))
    out['meshes']={}
    for mi,m in enumerate(j['meshes']):
        for pi,p in enumerate(m['primitives']):
            d={}
            for k,a in p['attributes'].items(): d[k]=H(g.acc(a))
            d['indices']=H(g.acc(p['indices'])) if 'indices' in p else None
            d['material']=j['materials'][p['material']].get('name') if 'material' in p else None
            tg=p.get('targets',[]); d['n_targets']=len(tg)
            d['targets']=H(np.concatenate([np.concatenate([g.acc(a).ravel() for a in t.values()]) for t in tg])) if tg else None
            out['meshes'][f"{mi}:{m.get('name')}:{pi}"]=d
    out['animations']=len(j.get('animations',[]))
    an=[]
    for a in j['animations']:
        h=hashlib.sha256()
        for c in a['channels']:
            s=a['samplers'][c['sampler']]; h.update(np.ascontiguousarray(g.acc(s['input'])).tobytes()); h.update(np.ascontiguousarray(g.acc(s['output'])).tobytes()); h.update(str((c['target'],s.get('interpolation'))).encode())
        an.append((a['name'],h.hexdigest()[:16]))
    out['anim_hashes']=an
    out['materials']=H(np.array([json.dumps(m,sort_keys=True) for m in j['materials']]).astype('U2000'))
    out['images']=[hashlib.sha256(g.image_bytes(i)).hexdigest()[:16] for i in range(len(j.get('images',[])))]
    out['textures']=H(np.array([json.dumps(t,sort_keys=True) for t in j.get('textures',[])]).astype('U200'))
    out['morph_names']={m.get('name'):m.get('extras',{}).get('targetNames') and len(m['extras']['targetNames']) for m in j['meshes']}
    return out
R15,R16,OUT=sys.argv[1],sys.argv[2],sys.argv[3]
a=summarize(R15); b=summarize(R16)
res={'r15':{'sha256':a['sha256'],'bytes':a['bytes']},'r16':{'sha256':b['sha256'],'bytes':b['bytes']},'checks':[]}
def chk(name,ok,detail=''): res['checks'].append({'check':name,'result':'PASS' if ok else 'FAIL','detail':detail}); print(('PASS' if ok else 'FAIL'),name,detail)
chk('bones == 90 and identical IBM',b['bones']==90 and a['ibm']==b['ibm'],f"bones={b['bones']}")
chk('node names/hierarchy TRS identical',a['node_names']==b['node_names'] and a['node_trs']==b['node_trs'])
chk('27 animations, curves/timings identical',b['animations']==27 and a['anim_hashes']==b['anim_hashes'],f"n={b['animations']}")
chk('materials identical',a['materials']==b['materials'])
chk('textures/images identical',a['images']==b['images'] and a['textures']==b['textures'],f"{len(b['images'])} images")
ch=[]
for k in a['meshes']:
    if a['meshes'][k]!=b['meshes'].get(k): ch.append(k)
chk('only Sophia_LabCoat mesh primitive differs',all('LabCoat' in k for k in ch) and len(ch)==1,str(ch))
ca=a['meshes'][ch[0]]; cb=b['meshes'][ch[0]]
diff=[k for k in ca if ca[k]!=cb[k]]
chk('LabCoat: only JOINTS_0/WEIGHTS_0 changed (POSITION/NORMAL/UV/indices/targets identical)',set(diff)<= {'JOINTS_0','WEIGHTS_0'} and set(diff)=={'JOINTS_0','WEIGHTS_0'},str(diff))
tot=sum(v['n_targets'] for v in b['meshes'].values()); 
res['morph_targets_per_prim']={k:v['n_targets'] for k,v in b['meshes'].items() if v['n_targets']}
chk('morph targets identical (all meshes, per-primitive counts+data)',all(a['meshes'][k]['n_targets']==b['meshes'][k]['n_targets'] and a['meshes'][k]['targets']==b['meshes'][k]['targets'] for k in a['meshes']),str(res['morph_targets_per_prim']))
res['protected_hashes_r15']={k:v for k,v in a['meshes'].items()}
res['protected_hashes_r16']={k:v for k,v in b['meshes'].items()}
json.dump(res,open(OUT,'w'),indent=1)
