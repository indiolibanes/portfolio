import sys,json,hashlib,numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'patches6d'))
from glbio3 import GLB
from tail_surf import Surface,vertex_normals,components
src,dst=sys.argv[1:3];g=GLB(src);j=g.j;mark='sophia_rebuilt_constellation_tubes_v1'
if mark in j['asset'].get('extras',{}):Path(dst).write_bytes(Path(src).read_bytes());raise SystemExit()
ps=j['meshes'][0]['primitives'];p=ps[231];v=g.read(p['attributes']['POSITION']).astype(float);n=g.read(p['attributes']['NORMAL']).astype(float);f=g.read(p['indices']).reshape(-1,3).astype(int);old=v.copy();tail=ps[1];tv=g.read(tail['attributes']['POSITION']).astype(float);tf=g.read(tail['indices']).reshape(-1,3).astype(int);tn=g.read(tail['attributes']['NORMAL']).astype(float);s=Surface(tv,tf,tn);_,lab=components(f,len(v));info=[]
for comp in [170,405]:
 ids=np.flatnonzero(lab==comp);assert len(ids)%4==0;R=v[ids].reshape(-1,4,3);cent=R.mean(1);rad=np.linalg.norm(R-cent[:,None],axis=2);radius=min(float(np.median(rad)),.00045)
 for k in range(3):cent[1:-1]=.25*cent[:-2]+.5*cent[1:-1]+.25*cent[2:]
 r=s.query(cent);cent=r['foot']+.0015*r['normal'];t=np.gradient(cent,axis=0);t/=np.maximum(np.linalg.norm(t,axis=1,keepdims=True),1e-12);nn=r['normal'];b=np.cross(t,nn);b/=np.maximum(np.linalg.norm(b,axis=1,keepdims=True),1e-12);nn=np.cross(b,t);nn/=np.maximum(np.linalg.norm(nn,axis=1,keepdims=True),1e-12)
 faces=np.flatnonzero(lab[f[:,0]]==comp);best=None
 for sign in [1,-1]:
  theta=np.arange(4)*2*np.pi/4*sign;norm=nn[:,None,:]*np.cos(theta)[None,:,None]+b[:,None,:]*np.sin(theta)[None,:,None];Q=cent[:,None,:]+radius*norm;v[ids]=Q.reshape(-1,3);n[ids]=norm.reshape(-1,3);dots=np.einsum('ij,ij->i',np.cross(v[f[faces,1]]-v[f[faces,0]],v[f[faces,2]]-v[f[faces,0]]),n[f[faces]].sum(1));bad=int((dots < -1e-14).sum())
  if best is None or bad<best[0]:best=(bad,v[ids].copy(),n[ids].copy())
 v[ids]=best[1];n[ids]=best[2];info.append({'component':comp,'rings':len(cent),'radius_mm':radius*1000,'orientation_failures':best[0]})
dots=np.einsum('ij,ij->i',np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]]),n[f].sum(1));bad=int((dots < -1e-14).sum());accepted=bad==0
if accepted:
 g.write_f32(p['attributes']['POSITION'],v);g.write_f32(p['attributes']['NORMAL'],n);j['asset'].setdefault('extras',{})[mark]={'source_sha256':hashlib.sha256(Path(src).read_bytes()).hexdigest()};g.save(dst)
else:Path(dst).write_bytes(Path(src).read_bytes())
Path(dst+'.json').write_text(json.dumps({'accepted':accepted,'inverted_after':bad,'components':info,'max_displacement_mm':float(np.linalg.norm(v-old,axis=1).max()*1000),'limits':'Rest fold criterion only. Animated clearance and self collision still require certification.'},indent=2));print(Path(dst+'.json').read_text())
