"""Blender Python: sampled triangle-surface overlaps, not continuous/solid collision.
blender -b -t 4 --python scripts/sophia-adornments/collisions.py -- SOURCE.glb OUTPUT_DIR
"""
import sys,pathlib,json,csv,math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from glb_audit import load,accessor
from inventory import worlds,position_world
source,out=sys.argv[sys.argv.index('--')+1:];out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True)
_,g,raw=load(source);cache={}
def arr(i):
 if i not in cache:cache[i]=accessor(g,raw,i)
 return cache[i]
def pose(clip,t):
 ov={};morph={}
 if clip:
  for ch in clip['channels']:
   sp=clip['samplers'][ch['sampler']];ts=arr(sp['input']).ravel();vs=arr(sp['output']);target=ch['target'];ni=target['node'];kind=target['path'];assert sp.get('interpolation','LINEAR')in ['LINEAR','STEP']
   a=max(0,min(len(ts)-1,int(np.searchsorted(ts,t,side='right')-1)));b=min(a+1,len(ts)-1);u=0 if a==b or sp.get('interpolation')=='STEP' else float(np.clip((t-ts[a])/(ts[b]-ts[a]),0,1))
   if kind=='weights':vs=vs.reshape(len(ts),-1)
   va=vs[a].astype(float);vb=vs[b].astype(float)
   if kind=='rotation':
    dot=float(np.dot(va,vb))
    if dot<0:vb=-vb;dot=-dot
    if dot<.9995:
     ang=math.acos(min(1,dot));v=(math.sin((1-u)*ang)*va+math.sin(u*ang)*vb)/math.sin(ang)
    else:v=(1-u)*va+u*vb
    v/=np.linalg.norm(v)
   else:v=(1-u)*va+u*vb
   if kind=='weights':morph[ni]=v
   else:ov.setdefault(ni,{})[kind]=v.tolist()
 return worlds(g,ov)[0],morph
prims=g['meshes'][0]['primitives'];skin=g['skins'][0];jointnames=[g['nodes'][i]['name']for i in skin['joints']]
def triangles(pi,terms=None,yRange=None):
 p=prims[pi];f=arr(p['indices']).astype(int).reshape(-1,3)
 if terms:
  ix=arr(p['attributes']['JOINTS_0']).astype(int);w=arr(p['attributes']['WEIGHTS_0']);mask=np.asarray([any(term in n for term in terms)for n in jointnames]);vw=(mask[ix]*w).sum(1);f=f[(vw[f].mean(1)>.5)]
 if yRange:
  v=arr(p['attributes']['POSITION']);cy=v[f,1].mean(1);f=f[(cy>=yRange[0])&(cy<=yRange[1])]
 return f
groups={
 'hands':[(93,prims[i],triangles(i,['hand_','fingers_','thumb_']))for i in [261,257,258,259,260]],
 'wrists_forearms':[(93,prims[i],triangles(i,['forearm_']))for i in [261,257,258,259,260]],
 'shoulders':[(93,prims[261],triangles(261,['upper_arm_']))],
 'sleeves':[(93,prims[4],triangles(4,['upper_arm_','forearm_']))],
 'cuffs':[(93,prims[4],triangles(4,['forearm_'],(.24,.33)))],
 'coat':[(93,prims[i],triangles(i))for i in [4,5,127,130]],
 'collar':[(93,prims[i],triangles(i))for i in [121,122]],
 'chin':[(93,prims[274],triangles(274,yRange=(.535,.625)))],
 'cranium':[(93,prims[274],triangles(274))],
 'tail':[(93,prims[1],triangles(1))],
 'body':[(93,prims[i],triangles(i))for i in [0,261]],
 'stars':[(93,prims[i],triangles(i))for i in [9,10,11]],
 'ear_jewelry':[(93,prims[i],triangles(i,['ear_L','ear_R','earlink']))for i in [2,8,12]],
 'ear_ribbons':[(93,p,triangles(i,['earrib']))for i,p in enumerate(prims)if 'JOINTS_0'in p['attributes']],
 'mane':[(93,prims[278],triangles(278))],
 'book':[(94,p,arr(p['indices']).astype(int).reshape(-1,3))for p in g['meshes'][1]['primitives']],
 'pages':[(94,g['meshes'][1]['primitives'][2],arr(g['meshes'][1]['primitives'][2]['indices']).astype(int).reshape(-1,3))],
 'pen':[(95,p,arr(p['indices']).astype(int).reshape(-1,3))for p in g['meshes'][2]['primitives']],
}
pairs=[('hands','book'),('hands','pen'),('cuffs','book'),('pen','book'),('wrists_forearms','sleeves'),('shoulders','coat'),('sleeves','cranium'),('chin','collar'),('tail','body'),('tail','coat'),('stars','cranium'),('cranium','ear_jewelry'),('ear_ribbons','mane'),('book','chin'),('pen','chin')]
rows=[];contacts=[];posemeta=[];regionCounts={name:sum(len(f)for _,_,f in parts)for name,parts in groups.items()}
poses=[(None,0)]+[(c,float(np.max(arr(c['samplers'][0]['input'])))*i/11)for c in g['animations']for i in range(12)]
for clip,t in poses:
 W,morph=pose(clip,t);trees={};verts={}
 for name,parts in groups.items():
  vv=[];ff=[];offset=0
  for ni,p,faces in parts:
   v=position_world(g,raw,ni,p,W,morph.get(ni));vv.append(v);ff.append(faces+offset);offset+=len(v)
  v=np.vstack(vv);f=np.vstack(ff);verts[name]=v[np.unique(f)]if len(f)else np.zeros((0,3))
  trees[name]=BVHTree.FromPolygons([Vector(x)for x in v],[tuple(x)for x in f],all_triangles=True,epsilon=0)if len(f)else None
 name=clip['name']if clip else 'REST';posemeta.append({'clip':name,'seconds':t})
 for a,b in pairs:
  overlaps=trees[a].overlap(trees[b])if trees[a] and trees[b]else []
  resolved=bool(trees[a] and trees[b])
  distance=None
  if resolved and not overlaps and (a,b)in [('wrists_forearms','sleeves'),('cuffs','book'),('chin','collar'),('tail','coat'),('stars','cranium')]:
   dd=[trees[b].find_nearest(Vector(v))[3]for v in verts[a]];distance=min(dd)if dd else None
  row={'clip':name,'seconds':round(t,9),'pair':a+'__'+b,'triangle_surface_pairs':len(overlaps)if resolved else None,'status':'REGION_UNRESOLVED'if not resolved else 'OVERLAP_REQUIRES_REVIEW'if overlaps else 'NO_SAMPLED_SURFACE_CROSSING','minQueriedVertexToSurfaceDistance':distance,'clearanceStatus':'UNRESOLVED'if not resolved else 'CROSSING_NO_POSITIVE_CLEARANCE_CERT'if overlaps else 'UNSIGNED_VERTEX_QUERY_ONLY'if distance is not None else 'NOT_MEASURED','method':'BVHTree triangle surfaces; no volume containment or continuous sweep'}
  rows.append(row)
 # Minimum over all pen vertices to the page surface is a proximity metric,
 # not a semantic pen-tip guarantee or signed clearance certificate.
 d=[]
 for v in verts['pen']:
  n=trees['pages'].find_nearest(Vector(v))
  if n and n[0]is not None:d.append(n[3])
 tip=W[95]@np.array([0,-.1003,0,1]);near=trees['pages'].find_nearest(Vector(tip[:3]));tipdist=near[3]if near and near[0]is not None else None
 contacts.append({'clip':name,'seconds':round(t,9),'minPenVertexToPageSurface':min(d)if d else None,'terminalRingCenterToPageSurface':tipdist,'method':'unsigned surface distance; terminal ring center from source local (0,-.1003,0); grip and exact ink contact remain unapproved'})
 print('COLLISION_POSE',name,t,flush=True)
with (out/'collision-matrix.csv').open('w')as f:
 w=csv.DictWriter(f,lineterminator='\n',fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
with (out/'page-proximity.csv').open('w')as f:
 w=csv.DictWriter(f,lineterminator='\n',fieldnames=list(contacts[0]));w.writeheader();w.writerows(contacts)
summary={'sourceSha256':__import__('hashlib').sha256(pathlib.Path(source).read_bytes()).hexdigest(),'poses':len(poses),'pairTests':len(rows),'regionTriangleCounts':regionCounts,'bodyRegion':'Indexed triangles of body primitives 0 and 261; hands use indexed pelt 261 plus wrist locks; no unused POSITION entries used as collision faces','method':'numpy glTF LINEAR quaternion slerp + morphs + LBS; Blender BVHTree epsilon=0','pairs':[],'gate':'CONTACT_FAIL_OR_PENDING; archival defects are retained, not repaired by graph recovery','limits':['Sampled triangle crossings only; no continuous collision or containment test','Hand/sleeve/chin regions selected by documented weight or rest-Y filters, not independent anatomy labels','Region selections differ from historical audit; triangle-pair counts are not a direct improvement/regression comparison','No collision-free pose is inferred between samples','Grip overlap can be intentional but is not silently approved','Matrices remain source units; source extras declare metres; no separate physical calibration','Pilot has exactly identical sampled geometry by separate 255-pose Three.js test, so same source collision matrix applies only to this graph-only pilot hash']}
for a,b in pairs:
 rr=[r for r in rows if r['pair']==a+'__'+b];valid=[r for r in rr if r['triangle_surface_pairs']is not None];worst=max(valid,key=lambda r:r['triangle_surface_pairs'])if valid else None;summary['pairs'].append({'pair':a+'__'+b,'status':'SAMPLED'if valid else 'REGION_UNRESOLVED','posesWithCrossing':sum(r['triangle_surface_pairs']>0 for r in valid)if valid else None,'maxTrianglePairs':worst['triangle_surface_pairs']if worst else None,'worstClip':worst['clip']if worst else None,'worstSeconds':worst['seconds']if worst else None})
(out/'collision-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
