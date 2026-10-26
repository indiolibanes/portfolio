import sys,json,copy,numpy as np
from pathlib import Path
from scipy.spatial import cKDTree
from sophia_motion_runtime import MotionModel
base=MotionModel(sys.argv[1]);outs={}
for path in sys.argv[2:]:
 m=MotionModel(path); changed=[];allowed=set();badmm=[];outside=[]
 for i,(a,b)in enumerate(zip(base.j['accessors'],m.j['accessors'])):
  if not np.array_equal(base.acc(i),m.acc(i)):
   uses=[]
   for mi,mesh in enumerate(m.j['meshes']):
    for pi,p in enumerate(mesh['primitives']):
     for k,idx in p['attributes'].items():
      if idx==i:uses.append([mi,pi,k,p.get('extras',{}).get('phase6c_input_primitive',pi)])
   changed.append({'accessor':i,'uses':uses})
   bv=m.j['bufferViews'][b['bufferView']];off=bv.get('byteOffset',0)+b.get('byteOffset',0);allowed.update(range(off,off+m.acc(i).nbytes))
 rawdiff=np.flatnonzero(np.frombuffer(base.bin,dtype=np.uint8)!=np.frombuffer(m.bin[:len(base.bin)],dtype=np.uint8))
 outside=[int(x)for x in rawdiff if int(x)not in allowed]
 for i,a in enumerate(m.j['accessors']):
  if 'min'not in a:continue
  v=m.acc(i);scale={5121:255,5123:65535,5120:127,5122:32767}.get(a['componentType'],1)if a.get('normalized')else 1;v=v*scale
  if not(np.allclose(v.min(0),a['min'],rtol=0,atol=1e-7)and np.allclose(v.max(0),a['max'],rtol=0,atol=1e-7)):badmm.append(i)
 winding=[];norm=[];weight=[]
 for i,d in enumerate(m.primitives):
  v=d['v'];f=d['f'];n=m.acc(d['p']['attributes']['NORMAL']);dots=np.einsum('ij,ij->i',np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]]),n[f].sum(1));bad=np.flatnonzero(dots < -1e-14)
  if len(bad):winding.append({'primitive':i,'triangles':bad.tolist(),'material':d['material']})
  nl=np.linalg.norm(n,axis=1);err=float(abs(nl-1).max())
  if err>1e-5:norm.append({'primitive':i,'max_error':err,'zero_count':int((nl<1e-8).sum())})
  if 'we'in d:
   e=float(abs(d['we'].sum(1)-1).max());jointbad=int((d['jo']>=len(m.j['skins'][d['skin']]['joints'])).sum())
   if e>1e-4 or jointbad:weight.append({'primitive':i,'sum_error':e,'joints_invalid':jointbad})
 loops=[]
 for ai,a in enumerate(m.animations):
  p=m.pose(ai,0);q=m.pose(ai,a['duration']);loops.append({'clip':a['name'],'endpoint_max_mm':float(max(np.linalg.norm(p[k]-q[k],axis=1).max()for k in p)*1000)})
 ja=copy.deepcopy(base.j);jb=copy.deepcopy(m.j)
 for j in (ja,jb):
  j['asset'].pop('extras',None)
  for a in j['accessors']:a.pop('min',None);a.pop('max',None)
 difftop=[k for k in set(ja)|set(jb)if ja.get(k)!=jb.get(k)]
 L0=base.primitives[5]['v'];L1=m.primitives[5]['v'];C=base.primitives[4]['v'];disp=np.linalg.norm(L1-L0,axis=1)*1000
 # Duplicate seam coordinates in lining must retain same displacements.
 _,inv=np.unique(np.round(L0,7),axis=0,return_inverse=True);dd=L1-L0;mins=np.full((inv.max()+1,3),np.inf);maxs=-mins;np.minimum.at(mins,inv,dd);np.maximum.at(maxs,inv,dd)
 symmetry={}
 for i,d in enumerate(m.primitives):
  v=d['v'];vpos=v[v[:,0]>1e-7];vneg=v[v[:,0]<-1e-7]
  if i not in [0,4,5,261]and not d['extras'].get('region'):continue
  if len(vpos)and len(vneg):
   dist=np.r_[cKDTree(vneg).query(vpos*[-1,1,1])[0],cKDTree(vpos).query(vneg*[-1,1,1])[0]]*1000;symmetry[i]={'mean_mm':float(dist.mean()),'p95_mm':float(np.percentile(dist,95)),'p99_mm':float(np.percentile(dist,99))}
 outs[Path(path).name]={'bytes':m.path.stat().st_size,'sha256':m.sha256,'accessors_changed':changed,'bin_changes_outside_changed_accessors':len(outside),'json_top_keys_changed_after_ignoring_bounds_and_asset_extras':difftop,'minmax_mismatches':badmm,'winding':winding,'normals_nonunit':norm,'weights_invalid':weight,'loops':loops,'nodes_identical':base.j['nodes']==m.j['nodes'],'animations_identical':base.j['animations']==m.j['animations'],'skins_identical':base.j['skins']==m.j['skins'],'hem':{'max_displacement_mm':float(disp.max()),'seam_delta_disagreement_mm':float(np.linalg.norm(maxs-mins,axis=1).max()*1000),'thickness_difference_max_mm':float(abs(np.linalg.norm(L1-C,axis=1)-np.linalg.norm(L0-C,axis=1)).max()*1000)},'symmetry_bind':symmetry}
Path('certification/Structure.json').write_text(json.dumps(outs,indent=2));print(json.dumps({k:{a:b for a,b in v.items()if a not in ['accessors_changed','winding','symmetry_bind']}for k,v in outs.items()},indent=2))
