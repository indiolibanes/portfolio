"""Sampled exact triangle distance for stated pairs. Not continuous collision detection."""
import sys,json,numpy as np
from pathlib import Path
from scipy.spatial import cKDTree
from sophia_motion_runtime import MotionModel
from sophia_triangle_distance import triangle_pair_distance,segment_hits_triangle
m=MotionModel(sys.argv[1]);D=m.primitives;out=Path(sys.argv[2]);mode=sys.argv[3]if len(sys.argv)>3 else 'eyes'
def test(v,f,w,g):
 A=v[f];B=w[g];ac=A.mean(1);bc=B.mean(1);ar=np.linalg.norm(A-ac[:,None],axis=2).max(1);br=np.linalg.norm(B-bc[:,None],axis=2).max(1)
 # Radius buckets keep the guaranteed bound without inflating every query by the largest face.
 bins=np.floor(np.log2(np.maximum(br,1e-8))).astype(int);allpairs=[]
 for bucket in np.unique(bins):
  ids=np.flatnonzero(bins==bucket);ll=cKDTree(bc[ids]).query_ball_point(ac,ar+br[ids].max()+.0003);ln=np.array([len(x)for x in ll]);si=np.repeat(np.arange(len(A)),ln)
  if not ln.sum():continue
  ti=ids[np.concatenate(ll).astype(int)];mask=np.linalg.norm(ac[si]-bc[ti],axis=1)<=ar[si]+br[ti]+.0003;allpairs.append(np.c_[si[mask],ti[mask]])
 pp=np.vstack(allpairs)if allpairs else np.empty((0,2),int)
 if len(pp):
  amin=A.min(1);amax=A.max(1);bmin=B.min(1);bmax=B.max(1);si=pp[:,0];ti=pp[:,1];keep=np.all(amin[si]<=bmax[ti]+.0003,axis=1)&np.all(bmin[ti]<=amax[si]+.0003,axis=1);pp=pp[keep]
 if not len(pp):return {'crossings':0,'minimum_candidate_mm':None,'clearance_lower_bound_mm':.3}
 hits=np.zeros(len(pp),bool)
 for k in range(3):
  AA=A[pp[:,0]];BB=B[pp[:,1]];hits|=segment_hits_triangle(AA[:,k],AA[:,(k+1)%3],BB)|segment_hits_triangle(BB[:,k],BB[:,(k+1)%3],AA)
 if hits.any():
  i,j=pp[np.flatnonzero(hits)[0]];return {'crossings':int(hits.sum()),'minimum_candidate_mm':0.0,'source_vertices':f[i].tolist(),'target_vertices':g[j].tolist()}
 ds=np.concatenate([triangle_pair_distance(A[x[:,0]],B[x[:,1]])for x in np.array_split(pp,max(1,int(np.ceil(len(pp)/20000))))]);k=int(ds.argmin());i,j=pp[k];return {'crossings':int((ds<1e-8).sum()),'minimum_candidate_mm':float(ds[k]*1000),'source_vertices':f[i].tolist(),'target_vertices':g[j].tolist()}
if mode=='eyes':configs=[(side+'_'+part,li,[sc,ir])for side,sc,ir,up,lo in [('R',13,14,15,16),('L',24,25,26,27)]for part,li in [('upper',up),('lower',lo)]]
elif mode=='hem':configs=[('lining_coat',5,[4]),('lining_body',5,[0,261])]
elif mode=='tail':configs=[('tail_body',1,[0,261]),('tail_coat',1,[4]),('tail_backbow',1,[272]),('side_ribbons_body',273,[0,261]),('side_ribbons_gold',273,[i for i,d in enumerate(D)if d['material']=='Sophia_gold_garment']),('backbow_body',272,[0,261])]
rows=[];summary={};selected=sorted({i for _,s,ts in configs for i in [s,*ts]})
for ai in [None,*range(len(m.animations))]:
 name='rest'if ai is None else m.animations[ai]['name'];times=[0]if ai is None else np.linspace(0,m.animations[ai]['duration'],int(np.ceil(m.animations[ai]['duration']*30))+1);ss={k:{'frames_with_crossings':0,'triangle_pair_samples':0,'frames_below_0_3mm':0}for k,_,_ in configs}
 for fi,t in enumerate(times):
  p=m.pose(ai,float(t),selected);rr={}
  for label,si,tis in configs:
   tv=[];tf=[];off=0
   for ti in tis:tv.append(p[ti]);tf.append(D[ti]['f']+off);off+=len(p[ti])
   r=test(p[si],D[si]['f'],np.vstack(tv),np.vstack(tf));rr[label]=r;ss[label]['frames_with_crossings']+=int(r['crossings']>0);ss[label]['triangle_pair_samples']+=r['crossings'];ss[label]['frames_below_0_3mm']+=int(r['minimum_candidate_mm']is not None and r['minimum_candidate_mm']<.3-1e-5)
  rows.append({'clip':name,'frame':fi,'time_s':float(t),'pairs':rr})
 summary[name]=ss;out.write_text(json.dumps({'sha256':m.sha256,'mode':mode,'method':'Enclosing centroid spheres plus exact triangle distance, candidate cutoff 0.3mm; no signed depth. Vertex ids for merged targets require per-config offset mapping.','summary':summary,'samples':rows},indent=2));print(name,len(times),ss,flush=True)
