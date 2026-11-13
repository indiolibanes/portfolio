"""Fast full deformation audit for every edited garment piece + lining/lapels.
Same source-index topology and 161 sampled poses as the paired BVH audit.
"""
import csv,pathlib,numpy as np
from r1c_common import Model,baseline_poses,dense_poses
b=Model('local-private/adornments-r1c/r1b-baseline.glb');c=Model('local-private/adornments-r1c/sophia-r1c-collar-study.glb');rows=[]
for kind,poses in [('baseline',baseline_poses()),('dense',dense_poses())]:
 for clip,t in poses:
  wb,mb=b.pose(clip,t);wc,mc=c.pose(clip,t)
  for pi in [4,5,12,121,122,123,124,125,126,127,130]:
   a=b.positions(pi,wb,mb);v=c.positions(pi,wc,mc);f=b.faces(pi);na=np.cross(a[f[:,1]]-a[f[:,0]],a[f[:,2]]-a[f[:,0]]);nv=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]]);area=np.linalg.norm(na,axis=1);valid=area>1e-10;ratios=np.linalg.norm(nv[valid],axis=1)/area[valid];rows.append({'sampleSet':kind,'clip':clip,'seconds':t,'primitive':pi,'maxWorldVertexDisplacement':float(np.linalg.norm(v-a,axis=1).max()),'minTriangleAreaRatio':float(ratios.min()),'p01TriangleAreaRatio':float(np.quantile(ratios,.01)),'opposedFaceNormals':int(((na*nv).sum(1)<0).sum())})
p=pathlib.Path('docs/sophia/adornments-r1c/results/r1c-skinning-poses.csv')
with p.open('w')as f:w=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n');w.writeheader();w.writerows(rows)
print('SKINNING_POSES',len(rows),'OPPOSED_MAX',max(x['opposedFaceNormals']for x in rows),'MIN_AREA_RATIO',min(x['minTriangleAreaRatio']for x in rows))
