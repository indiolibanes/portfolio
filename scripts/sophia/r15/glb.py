#!/usr/bin/env python3
"""Read-only GLB inventory. Python 3 + numpy + Pillow. Does not certify anatomy."""
import argparse, collections, hashlib, io, json, pathlib, struct
import numpy as np
from PIL import Image

DT={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}
SZ={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16,'MAT3':9,'MAT2':4}
def load(path):
 b=pathlib.Path(path).read_bytes(); magic,version,length=struct.unpack_from('<4sII',b)
 assert magic==b'glTF' and version==2 and length==len(b)
 chunks=[];pos=12
 while pos<len(b):
  n,t=struct.unpack_from('<II',b,pos);pos+=8;assert pos+n<=len(b);chunks.append((t,b[pos:pos+n]));pos+=n
 g=json.loads(next(v for t,v in chunks if t==0x4e4f534a));raw=next((v for t,v in chunks if t==0x004e4942),b'')
 return b,g,raw
def accessor(g,raw,i):
 a=g['accessors'][i];n=a['count'];width=SZ[a['type']];dt=np.dtype(DT[a['componentType']]);v=np.zeros((n,width),dt)
 if 'bufferView' in a:
  bv=g['bufferViews'][a['bufferView']];assert bv.get('buffer',0)==0
  off=bv.get('byteOffset',0)+a.get('byteOffset',0);stride=bv.get('byteStride',dt.itemsize*width)
  assert off+(n-1)*stride+width*dt.itemsize<=len(raw) if n else True
  v=np.ndarray((n,width),dtype=dt,buffer=raw,offset=off,strides=(stride,dt.itemsize)).copy()
 if 'sparse' in a:
  s=a['sparse'];iv=s['indices'];bv=g['bufferViews'][iv['bufferView']]
  idx=np.frombuffer(raw,dtype=DT[iv['componentType']],count=s['count'],offset=bv.get('byteOffset',0)+iv.get('byteOffset',0))
  vv=s['values'];bv=g['bufferViews'][vv['bufferView']]
  v[idx]=np.frombuffer(raw,dtype=dt,count=s['count']*width,offset=bv.get('byteOffset',0)+vv.get('byteOffset',0)).reshape(-1,width)
 if a.get('normalized') and a['componentType']!=5126:
  info=np.iinfo(dt);v=v.astype(float)/info.max
  if info.min<0:v=np.maximum(-1,v)
 return v
def inspect(p):
 b,g,raw=load(p); warnings=[];nodes=g.get('nodes',[]);meshes=g.get('meshes',[])
 jointset=set(j for s in g.get('skins',[]) for j in s['joints'])
 result={'path':str(p),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'generator':g.get('asset',{}),'extensionsRequired':g.get('extensionsRequired',[]),'nodes':nodes,'mesh_count':len(meshes),'mesh_node_count':sum('mesh'in n for n in nodes),'skin_count':len(g.get('skins',[])),'unique_joint_count':len(jointset),'joint_names':[nodes[i].get('name',str(i)) for i in sorted(jointset)],'skins':g.get('skins',[]),'materials':g.get('materials',[]),'texture_count':len(g.get('textures',[])),'textures':[],'meshes':[],'animations':[],'sockets':[n for n in nodes if 'socket' in n.get('name','').lower()],'warnings':warnings}
 totalv=totalt=0
 for mi,m in enumerate(meshes):
  mr={'index':mi,'name':m.get('name'),'target_names':m.get('extras',{}).get('targetNames',[]),'primitives':[]}
  for pi,p in enumerate(m['primitives']):
   a=p['attributes'];v=accessor(g,raw,a['POSITION']);idx=accessor(g,raw,p['indices']).ravel() if 'indices'in p else np.arange(len(v));mode=p.get('mode',4)
   nt=len(idx)//3 if mode==4 else max(0,len(idx)-2) if mode in (5,6) else 0
   totalv+=len(v);totalt+=nt
   pr={'index':pi,'vertices':len(v),'triangles':nt,'mode':mode,'material':p.get('material'),'attributes':list(a),'bounds_local':[v.min(axis=0).tolist(),v.max(axis=0).tolist()],'morph_targets':len(p.get('targets',[])),'positions_sha256':hashlib.sha256(v.tobytes()).hexdigest(),'indices_sha256':hashlib.sha256(idx.tobytes()).hexdigest(),'nonfinite_positions':int((~np.isfinite(v)).sum())}
   if mode==4:
    f=idx.reshape(-1,3);valid=f.max(initial=0)<len(v);pr['indices_valid']=bool(valid)
    if valid:pr['degenerate_triangles']=int((np.linalg.norm(np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]]),axis=1)<1e-12).sum())
   ws=[accessor(g,raw,k) for n,k in a.items() if n.startswith('WEIGHTS_')]
   if ws:
    sums=np.concatenate(ws,axis=1).sum(axis=1);pr['weight_sum_range']=[float(sums.min()),float(sums.max())];pr['unweighted_vertices']=int((sums<1e-5).sum());pr['weights_not_unit_1e-3']=int((abs(sums-1)>1e-3).sum())
   pr['morph_nonzero_vertices']=[int((np.linalg.norm(accessor(g,raw,t['POSITION']),axis=1)>1e-8).sum()) if 'POSITION'in t else None for t in p.get('targets',[])]
   mr['primitives'].append(pr)
  result['meshes'].append(mr)
 result['stored_vertices']=totalv;result['stored_triangles']=totalt
 for im in g.get('images',[]):
  rec={k:im.get(k) for k in ['name','mimeType','uri','bufferView']}
  if 'bufferView'in im:
   bv=g['bufferViews'][im['bufferView']];d=raw[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']];rec.update(sha256=hashlib.sha256(d).hexdigest(),bytes=len(d))
   with Image.open(io.BytesIO(d)) as img:
    img.load();rec.update(size=list(img.size),mode=img.mode)
  result['textures'].append(rec)
 for an in g.get('animations',[]):
  duration=0;paths=collections.Counter();samplers=[]
  for sp in an['samplers']:
   t=accessor(g,raw,sp['input']);o=accessor(g,raw,sp['output']);duration=max(duration,float(t.max(initial=0)));samplers.append({'keys':len(t),'time_min':float(t.min(initial=0)),'time_max':float(t.max(initial=0)),'strict_time':bool(np.all(np.diff(t.ravel())>0)),'finite_output':bool(np.all(np.isfinite(o))),'output_rows':len(o),'interpolation':sp.get('interpolation','LINEAR')})
  for c in an['channels']:paths[c['target']['path']]+=1
  result['animations'].append({'name':an.get('name'),'duration_seconds':duration,'channel_count':len(an['channels']),'target_paths':dict(paths),'channels':an['channels'],'samplers':samplers})
 result['animation_count']=len(result['animations']);result['max_morphs_per_primitive']=max((p['morph_targets'] for m in result['meshes'] for p in m['primitives']),default=0)
 if g.get('extensionsRequired'):warnings.append('Required extensions need a matching decoder; this report does not provide one.')
 return result
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('files',nargs='+');ap.add_argument('--out',required=True);a=ap.parse_args();out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True)
 for f in a.files:
  r=inspect(f);(out/(pathlib.Path(f).stem+'.json')).write_text(json.dumps(r,indent=2));print(pathlib.Path(f).name,r['stored_vertices'],r['stored_triangles'],r['unique_joint_count'],r['max_morphs_per_primitive'],r['animation_count'])
