#!/usr/bin/env python3
"""Source-locked census, exact attribute provenance and rest-pose world bounds."""
import argparse,csv,hashlib,json,pathlib
import numpy as np
from glb_audit import load,accessor,inspect
def local_matrix(n):
 if 'matrix'in n:return np.asarray(n['matrix'],float).reshape(4,4,order='F')
 x,y,z,w=n.get('rotation',[0,0,0,1]);s=n.get('scale',[1,1,1]);m=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w,0],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w,0],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y,0],[0,0,0,1]],float);m[:3,:3]*=s;m[:3,3]=n.get('translation',[0,0,0]);return m
def worlds(g,overrides=None):
 parents={c:i for i,n in enumerate(g['nodes'])for c in n.get('children',[])};W={};overrides=overrides or {}
 def one(i):
  if i not in W:
   n=dict(g['nodes'][i]);n.update(overrides.get(i,{}));m=local_matrix(n);W[i]=one(parents[i])@m if i in parents else m
  return W[i]
 for i in range(len(g['nodes'])):one(i)
 return W,parents
def position_world(g,raw,node,pr,W,morph=None):
 v=accessor(g,raw,pr['attributes']['POSITION']).astype(float)
 if morph is not None:
  for w,t in zip(morph,pr.get('targets',[])):
   if w and 'POSITION'in t:v+=w*accessor(g,raw,t['POSITION'])
 h=np.c_[v,np.ones(len(v))];n=g['nodes'][node]
 if 'skin'not in n:return (h@W[node].T)[:,:3]
 skin=g['skins'][n['skin']];ibm=accessor(g,raw,skin['inverseBindMatrices']);M=np.asarray([W[j]@ibm[k].reshape(4,4,order='F')for k,j in enumerate(skin['joints'])]);ix=accessor(g,raw,pr['attributes']['JOINTS_0']).astype(int);weights=accessor(g,raw,pr['attributes']['WEIGHTS_0']);vout=np.zeros_like(h)
 for k in range(ix.shape[1]):vout+=np.einsum('nij,nj->ni',M[ix[:,k]],h)*weights[:,k,None]
 return vout[:,:3]
def role(mi,pi,pr,g):
 if mi==1:return 'notebook'
 if mi==2:return 'pen'
 if mi==3:return 'forehead_stars'
 if pi in [9,10,11]:return 'forehead_stars'
 ex=pr.get('extras',{});mat=g['materials'][pr.get('material',0)].get('name','')
 if pi in [4,5]or 'lapel'in str(ex)or 'collar'in str(ex):return 'coat_core_or_lapel_collar'
 if 133<=pi<=140:return 'chest_bow_brooch'
 if any(x in str(ex)for x in ['backbow','side_ribbons','tail_constellation','tail_star']):return 'tail_or_back_ornament'
 if pi in [2,6,8,12]:return 'mixed_accessory_partition_required'
 return 'body_or_other'
def run(paths,out):
 out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True);models=[];rows=[]
 for p in paths:
  b,g,raw=load(p);rec=inspect(p);W,parents=worlds(g);rec['primitiveRecords']=[]
  def path(i):return (path(parents[i])+'/'if i in parents else '/')+g['nodes'][i].get('name',str(i))+f'[{i}]'
  for ni,n in enumerate(g['nodes']):
   if 'mesh'not in n:continue
   mi=n['mesh']
   for pi,pr in enumerate(g['meshes'][mi]['primitives']):
    v=position_world(g,raw,ni,pr,W);attributes={k:{'accessor':ai,'sha256_decoded':hashlib.sha256(accessor(g,raw,ai).tobytes()).hexdigest(),'componentType':g['accessors'][ai]['componentType'],'normalized':g['accessors'][ai].get('normalized',False)}for k,ai in pr['attributes'].items()};idx=accessor(g,raw,pr['indices']);r={'node':ni,'nodePath':path(ni),'mesh':mi,'meshName':g['meshes'][mi].get('name'),'primitive':pi,'role':role(mi,pi,pr,g)if rec['sha256']=='3b0e7db84809d6e4fe6eaa2bc6299874c202c529adcbd369cf83c6a29d3c3a2a' else 'unclassified_other_model','vertices':len(v),'triangles':int(idx.size//3),'material':pr.get('material'),'materialName':g['materials'][pr.get('material',0)].get('name'),'uvSets':[k for k in attributes if k.startswith('TEXCOORD_')],'attributes':attributes,'indexHash':hashlib.sha256(idx.tobytes()).hexdigest(),'skinIndex':n.get('skin'),'restMatrix':local_matrix(n).T.ravel().tolist(),'restWorldMatrix':W[ni].T.ravel().tolist(),'worldBounds':[v.min(0).tolist(),v.max(0).tolist()],'extras':pr.get('extras',{}),'morphTargets':len(pr.get('targets',[]))}
    used=v[np.unique(idx.astype(int))];r['accessorWorldBounds']=r['worldBounds'];r['worldBounds']=[used.min(0).tolist(),used.max(0).tolist()];r['indexedVertices']=len(used)
    rec['primitiveRecords'].append(r);rows.append({'sourceSha256':rec['sha256'],'nodePath':r['nodePath'],'mesh':mi,'primitive':pi,'role':r['role'],'vertices':r['vertices'],'triangles':r['triangles'],'material':r['materialName'],'uvSets':';'.join(r['uvSets']),'skinIndex':n.get('skin'),'status':'SOURCE_VERIFIED'})
  rec['declaredUnit']=g.get('nodes',[{}])[93].get('extras',{}).get('sophia',{}).get('units')if len(g.get('nodes',[]))>93 else None
  rec['decodedTextureRgbaBytesEstimate']=sum(t.get('size',[0,0])[0]*t.get('size',[0,0])[1]*4 for t in rec['textures']);rec['estimateLimit']='RGBA base-level storage estimate, not measured decode latency or GPU allocation; no mip/format inference.'
  models.append(rec)
 expected='3b0e7db84809d6e4fe6eaa2bc6299874c202c529adcbd369cf83c6a29d3c3a2a';matched=any(m['sha256']==expected for m in models)
 report={'sourceHead':'d638f6e3a608cf953ffcb0322b41fb0dd051416d','baselineMain':'ffab5343d95c7f59232c26428d6f4301f1d58199','status':'SOURCE_VERIFIED'if matched else 'SOURCE_LOCK_PENDING','archiveMatch':{'matched':matched,'basis':'Compare computed SHA-256 to candidate SHA in checked-in Verdict.json and Relatorio_6H.md','sha256':expected,'scope':'Matches archived declared candidate hash only when matched=true; no reliance on filename similarity'},'astronautReference':{'status':'REMOTE_GET_403_REFERENCE_NOT_REDOWNLOADED','sha256FromExistingReport':'e9bddcd76eae3607227b58f5d1a71ae2fedc51e2ddcaeb0900c013e710d3e674','clipsFromExistingReport':47,'sourceOrRuntimeModified':False},'models':models}
 (out/'model-inventory.json').write_text(json.dumps(report,indent=2)+'\n')
 with (out/'mesh-provenance.csv').open('w')as f:
  w=csv.DictWriter(f,lineterminator='\n',fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
 return report
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--out',default='docs/sophia/adornments-r1/results');ap.add_argument('files',nargs='*',default=['public/experimental/sophia-alpha.glb','public/experimental/sophia-7b-e1-latest.glb']);a=ap.parse_args();r=run(a.files,a.out);print([(m['path'],m['sha256'],len(m['primitiveRecords']))for m in r['models']])
