"""Read-only ground, card roots (local scan plus global witnesses), symmetry and distal rig measurements."""
import sys,json,numpy as np
from pathlib import Path
from scipy.spatial import cKDTree
from sophia_motion_runtime import MotionModel
from sophia_triangle_distance import point_triangle
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'patches6d'))
# In workspace execution the patches folder is one directory higher.
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'patches6d'))
from tail_surf import Surface,vertex_normals
m=MotionModel(sys.argv[1]);var=MotionModel(sys.argv[2]);out=Path(sys.argv[3]);out.mkdir(exist_ok=True,parents=True)
def dump(name,j):(out/name).write_text(json.dumps(j,indent=2))
mins={};rows=[];D=var.primitives;cards=[i for i,d in enumerate(D)if d['material']=='Sophia_fur_cards'];F=np.vstack([D[0]['f'],D[261]['f']])
for ai in [None,*range(5)]:
 name='rest'if ai is None else m.animations[ai]['name'];ts=[0]if ai is None else np.linspace(0,m.animations[ai]['duration'],int(np.ceil(m.animations[ai]['duration']*30))+1);miny=1e9;yt=0;maxgap=0;worst=None
 for fi,t in enumerate(ts):
  y=float(m.pose(ai,float(t),[1])[1][:,1].min())
  if y<miny:miny=y;yt=float(t)
  p=var.pose(ai,float(t),[0,*cards]);s=Surface(p[0],F,vertex_normals(p[0],F))
  for i in cards:
   root=p[i].reshape(-1,11,3)[:,:2].mean(1);r=s.query(root,k=2);k=int(r['dist'].argmax());g=float(r['dist'][k]*1000)
   if g>maxgap:maxgap=g;worst={'frame':fi,'time_s':float(t),'primitive':i,'card':k}
  print(name,fi,flush=True)if fi%60==0 else None
 mins[name]={'samples':len(ts),'min_y_m':miny,'time_s':yt};rows.append({'clip':name,'samples':len(ts),'root_midpoint_distance_to_found_triangle_max_mm':maxgap,'worst':worst})
dump('TailGround.json',mins);dump('CardsRoots399.json',{'method':'Local root-midpoint to surface, two nearest vertices incident faces; candidate upper bound only.','results':rows})
witness=[]
for r in rows:
 ai=None if r['clip']=='rest'else next(i for i,a in enumerate(var.animations)if a['name']==r['clip']);w=r['worst'];p=var.pose(ai,w['time_s'],[0,w['primitive']]);root=p[w['primitive']].reshape(-1,11,3)[w['card'],:2].mean(0);tri=p[0][F];ds=np.sqrt(point_triangle(np.tile(root,(len(tri),1)),tri));i=int(ds.argmin());witness.append({'clip':r['clip'],**w,'exact_global_root_midpoint_distance_mm':float(ds[i]*1000),'body_triangle_vertices':F[i].tolist(),'root_point_m':root.tolist()})
dump('CardsRootExactWitnesses.json',{'method':'Point to every body and pelt triangle, at worst local-query root witness per clip.','witnesses':witness})
sym=[]
for a,b in zip(cards[:4],cards[4:]):
 ds=cKDTree(D[b]['v']).query(D[a]['v']*[-1,1,1])[0]*1000;sym.append({'primitives':[a,b],'mean_mm':float(ds.mean()),'p95_mm':float(np.percentile(ds,95)),'p99_mm':float(np.percentile(ds,99)),'max_mm':float(ds.max())})
dump('CardsSymmetry.json',sym)
d=m.primitives[1];pp=m.pose();surf=Surface(pp[1],d['f'],vertex_normals(pp[1],d['f']));dec=[]
for i,d in enumerate(m.primitives):
 if d['material']!='Sophia_tail_gold':continue
 r=surf.query(pp[i]);g=r['signed']*1000;ix=int(g.argmin());dec.append({'primitive':i,'sampled_vertices':len(g),'signed_local_nearest_min_mm':float(g.min()),'max_mm':float(g.max()),'below_0_6mm':int((g<.6).sum()),'above_2_5mm':int((g>2.5).sum()),'worst_vertex':ix,'distance_to_found_triangle_mm':float(r['dist'][ix]*1000)})
dump('DecorationsRest.json',{'method':'Locally signed query on faces incident on four nearest vertices; not global nearest certificate or solid penetration. Rest only.','samples':dec})
