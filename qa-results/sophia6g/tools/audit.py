"""Structural regression + sampled surface tests; not global collision certification."""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from sophia_motion_runtime import MotionModel
from sophia_triangle_distance import triangle_pair_distance,segment_hits_triangle

def test(v,f,w,g):
 A=v[f];B=w[g];ac=A.mean(1);bc=B.mean(1);ar=np.linalg.norm(A-ac[:,None],axis=2).max(1);br=np.linalg.norm(B-bc[:,None],axis=2).max(1)
 bins=np.floor(np.log2(np.maximum(br,1e-8))).astype(int);allpairs=[]
 for bucket in np.unique(bins):
  ids=np.flatnonzero(bins==bucket);ll=cKDTree(bc[ids]).query_ball_point(ac,ar+br[ids].max()+.0003);ln=np.array([len(x)for x in ll]);si=np.repeat(np.arange(len(A)),ln)
  if not ln.sum():continue
  ti=ids[np.concatenate(ll).astype(int)];mask=np.linalg.norm(ac[si]-bc[ti],axis=1)<=ar[si]+br[ti]+.0003;allpairs.append(np.c_[si[mask],ti[mask]])
 pp=np.vstack(allpairs)if allpairs else np.empty((0,2),int)
 if len(pp):
  amin=A.min(1);amax=A.max(1);bmin=B.min(1);bmax=B.max(1);si=pp[:,0];ti=pp[:,1];keep=np.all(amin[si]<=bmax[ti]+.0003,axis=1)&np.all(bmin[ti]<=amax[si]+.0003,axis=1);pp=pp[keep]
 if not len(pp):return {'crossings':0,'clearance_lower_bound_mm':.3,'candidate_pairs':0}
 hits=0;minimum=float('inf')
 for chunk in np.array_split(pp,max(1,int(np.ceil(len(pp)/10000)))):
  AA=A[chunk[:,0]];BB=B[chunk[:,1]];h=np.zeros(len(chunk),bool)
  for k in range(3):h|=segment_hits_triangle(AA[:,k],AA[:,(k+1)%3],BB)|segment_hits_triangle(BB[:,k],BB[:,(k+1)%3],AA)
  hits+=int(h.sum());ds=triangle_pair_distance(AA,BB);minimum=min(minimum,float(ds.min()))
 return {'crossings':hits,'minimum_candidate_mm':minimum*1000,'candidate_pairs':len(pp)}

def digest_arrays(model,obj):
 return hashlib.sha256(b''.join(model.acc(i).tobytes()for i in obj)).hexdigest()
def metrics(m):
 return {'bytes':m.path.stat().st_size,'sha256':m.sha256,'triangles':sum(len(p['f'])for p in m.primitives),'primitives':len(m.primitives),'materials':len(m.j['materials']),'joints':len(m.j['skins'][0]['joints']),'meshes':[x.get('name')for x in m.j['meshes']],'animations':[a['name']for a in m.animations],'morphs':m.j['meshes'][0]['extras']['targetNames']}
if __name__=='__main__':
 a=MotionModel(sys.argv[1]);b=MotionModel(sys.argv[2]);out=Path(sys.argv[3]);r={'base':metrics(a),'candidate':metrics(b),'status':'PARTIAL_NOT_APPROVED','checks':{},'geometry':[],'motion':[],'surface_tests':[]}
 r['checks']['rig_json_identical']=a.j['nodes']==b.j['nodes'] and a.j['skins']==b.j['skins']
 r['checks']['animations_json_identical']=a.j['animations']==b.j['animations']
 animacc=[s[k]for an in a.j['animations']for s in an['samplers']for k in ['input','output']];r['checks']['original_animation_arrays_retained_in_buffer']=digest_arrays(a,animacc)==digest_arrays(b,animacc)
 unaffected=[]
 for an,anb in zip(a.j['animations'],b.j['animations']):
  for c in an['channels']:
   if c['target']['node'] in [9,11] and c['target']['path']=='rotation':continue
   sb=anb['samplers'][c['sampler']];sa=an['samplers'][c['sampler']];unaffected.append(c in anb['channels'] and np.array_equal(a.acc(sa['output']),b.acc(sb['output'])))
 r['checks']['all_non_lid_animation_channels_identical']=all(unaffected)
 r['checks']['all_five_clips_have_morph_blink']=all(any(c['target']['path']=='weights'for c in an['channels'])for an in b.j['animations'])
 r['checks']['inverse_bind_matrices_identical']=all(np.array_equal(a.acc(s['inverseBindMatrices']),b.acc(s['inverseBindMatrices']))for s in a.j['skins'])
 r['checks']['image_bytes_identical']=all(a.bin[a.j['bufferViews'][im['bufferView']].get('byteOffset',0):a.j['bufferViews'][im['bufferView']].get('byteOffset',0)+a.j['bufferViews'][im['bufferView']]['byteLength']]==b.bin[b.j['bufferViews'][im['bufferView']].get('byteOffset',0):b.j['bufferViews'][im['bufferView']].get('byteOffset',0)+b.j['bufferViews'][im['bufferView']]['byteLength']] for im in a.j['images'])
 uv=[p['p']['attributes']['TEXCOORD_0']for p in a.primitives if 'TEXCOORD_0'in p['p']['attributes']];r['checks']['original_uv_arrays_identical']=digest_arrays(a,uv)==digest_arrays(b,uv)
 # Compare meshes by mesh-local primitive index (new Sophia primitives shift flattened Book/Pen indices).
 invariant=[1,4,5,6,12,*range(37,147),*range(153,251),*range(262,274)]
 r['checks']['protected_geometry_unchanged']=all(a.j['meshes'][0]['primitives'][i]==b.j['meshes'][0]['primitives'][i] for i in invariant)
 r['checks']['book_pen_meshes_identical']=a.j['meshes'][1:]==b.j['meshes'][1:]
 for name,model in [('6E',a),('6F',b)]:
  for i,d in enumerate(model.primitives):
   v=d['v'];f=d['f'];n=model.acc(d['p']['attributes']['NORMAL']);area=np.linalg.norm(np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]]),axis=1)/2
   r['geometry'].append({'model':name,'mesh':d['mesh'],'primitive':d['primitive'],'finite':bool(np.isfinite(v).all()),'indices_valid':bool(f.min()>=0 and f.max()<len(v)),'normal_max_unit_error':float(abs(np.linalg.norm(n,axis=1)-1).max()),'weight_max_sum_error':float(abs(d['we'].sum(1)-1).max())if 'we'in d else None,'zero_area_triangles':int((area<1e-12).sum())})
 for ai,an in enumerate(b.animations):
  for t in np.linspace(0,an['duration'],9):
   pose=b.pose(ai,float(t));r['motion'].append({'clip':an['name'],'time_s':float(t),'finite':all(bool(np.isfinite(v).all())for v in pose.values()),'bounds_min':np.vstack([v.min(0)for v in pose.values()]).min(0).tolist(),'bounds_max':np.vstack([v.max(0)for v in pose.values()]).max(0).tolist()})
 configs=[(li,eye)for li,eye in [(15,13),(15,14),(16,13),(16,14),(26,24),(26,25),(27,24),(27,25)]]
 for name,model in [('6E',a),('6F',b)]:
  for blink in [0,.5,1]:
   model.j['meshes'][0]['weights']=[blink,0,0,0];pose=model.pose()
   for i,j in configs:r['surface_tests'].append({'model':name,'pose':'rest','blink':blink,'primitives':[i,j],**test(pose[i],model.primitives[i]['f'],pose[j],model.primitives[j]['f'])})
   print(name,'blink',blink,flush=True)
 b.j['meshes'][0]['weights']=[0,0,0,0]
 for ai,an in enumerate(b.animations):
  weights_channel=next(c for c in an['channels'] if c[1]=='weights');peak=float(weights_channel[2][np.argmax(weights_channel[3][:,0])])
  for t in sorted(set([0,an['duration']/2,an['duration'],peak])):
   pose=b.pose(ai,t)
   for i,j in [(15,14),(16,14),(26,25),(27,25)]:r['surface_tests'].append({'model':'6F','pose':an['name'],'time_s':t,'blink':0,'primitives':[i,j],**test(pose[i],b.primitives[i]['f'],pose[j],b.primitives[j]['f'])})
  print('motion surface',an['name'],flush=True)
 r['limitations']=['No global pairwise self-intersection certification','No continuous collision detection','Root/neck intentional overlaps not boolean-unioned','No regression comparison with 6C/6D','Morph visual tests separate from numerical tests','Only eye pairs listed were tested geometrically; skull/fur/accessories/cloth/writing pending']
 out.write_text(json.dumps(r,indent=2));print(json.dumps(r['checks'],indent=2))
