"""Private derivative integrity, real-pose skinning, seam and collision measurements.
Run via Blender for BVH. Counts are not visual or mobile approval.
"""
import sys,pathlib,json,csv,hashlib,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(pathlib.Path(__file__).parent));from glb import load,accessor
R=pathlib.Path('local-private/sophia-r15');D=pathlib.Path('docs/characters/sophia-r15');D.mkdir(exist_ok=True)
b,g,r=load('public/assets/models/sophia/sophia-lab.glb');cb,c,cr=load(R/'sophia-lab-r15.glb');ob,o,orr=load('local-private/sophia-r15/sources/Sophia_v1.4.glb');h=lambda x:hashlib.sha256(x).hexdigest()
assert h(b)=='85f6d6afb6483c42765597a26f0b1cde69793769229bc74007faefb322eaf5e6'
for key in ['nodes','materials','textures','samplers','scenes','scene']:assert c.get(key)==g.get(key),key
for mi,(before,after)in enumerate(zip(g['meshes'],c['meshes'])):
 if mi==3:continue
 assert len(before['primitives'])==len(after['primitives'])
 for sp,cp in zip(before['primitives'],after['primitives']):
  for key in sp:
   if key not in ['attributes','targets','indices']:assert sp[key]==cp[key]
  assert set(sp['attributes'])==set(cp['attributes'])
  for key,ai in sp['attributes'].items():assert np.array_equal(accessor(g,r,ai),accessor(c,cr,cp['attributes'][key]))
  assert np.array_equal(accessor(g,r,sp['indices']),accessor(c,cr,cp['indices']))
  for st,ct in zip(sp.get('targets',[]),cp.get('targets',[])):
   for key,ai in st.items():assert np.array_equal(accessor(g,r,ai),accessor(c,cr,ct[key]))
for old,new in zip(g['skins'],c['skins']):
 assert {k:v for k,v in old.items()if k!='inverseBindMatrices'}=={k:v for k,v in new.items()if k!='inverseBindMatrices'}
 assert np.array_equal(accessor(g,r,old['inverseBindMatrices']),accessor(c,cr,new['inverseBindMatrices']))
for old,new in zip(g['images'],c['images']):
 bv=g['bufferViews'][old['bufferView']];cv=c['bufferViews'][new['bufferView']];assert r[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]==cr[cv.get('byteOffset',0):cv.get('byteOffset',0)+cv['byteLength']]
assert len(c['skins'][0]['joints'])==90;assert len(c['meshes'][2]['primitives'][0]['targets'])==48
assert np.array_equal(accessor(c,cr,c['meshes'][3]['primitives'][0]['indices']),accessor(g,r,g['meshes'][3]['primitives'][0]['indices']));assert np.array_equal(accessor(c,cr,c['meshes'][3]['primitives'][0]['attributes']['TEXCOORD_0']),accessor(g,r,g['meshes'][3]['primitives'][0]['attributes']['TEXCOORD_0']))
# Qualify differences inherited from PR306, not newly caused by R15.
body=[]
for pi,(sp,cp)in enumerate(zip(o['meshes'][2]['primitives'],c['meshes'][2]['primitives'])):
 for name,ai in sp['attributes'].items():
  a=accessor(o,orr,ai);z=accessor(c,cr,cp['attributes'][name]);assert np.array_equal(a,z),('body attribute',pi,name)
 for ti,(st,ct)in enumerate(zip(sp['targets'],cp['targets'])):
  for name,ai in st.items():assert np.array_equal(accessor(o,orr,ai),accessor(c,cr,ct[name])),('morph',pi,ti,name)
 body.append({'primitive':pi,'positionSha256':h(accessor(c,cr,cp['attributes']['POSITION']).tobytes()),'allAttributesAnd48MorphsEqualOriginal':True})
assert o['meshes'][2]['extras']['targetNames']==c['meshes'][2]['extras']['targetNames']
assert np.array_equal(accessor(o,orr,o['skins'][0]['inverseBindMatrices']),accessor(c,cr,c['skins'][0]['inverseBindMatrices']))
clipsOriginal={a['name']:a for a in o['animations']};clipsCurrent={a['name']:a for a in c['animations']};preserved=[]
for name,clip in clipsCurrent.items():
 orig=clipsOriginal[name];assert clip['channels']==orig['channels'];assert len(clip['samplers'])==len(orig['samplers'])
 for s,t in zip(clip['samplers'],orig['samplers']):
  assert s.get('interpolation','LINEAR')==t.get('interpolation','LINEAR')
  for k in ['input','output']:assert np.array_equal(accessor(c,cr,s[k]),accessor(o,orr,t[k]))
 preserved.append(name)
meta=json.loads((R/'poses.json').read_text());samples=meta['samples'];data=np.fromfile(R/'poses.f32',dtype='<f4').reshape(len(samples),meta['stride']);pairs=np.load(R/'sophia-lab-r15.seams.npz')['pairs']
def mesh(g,raw,mi):
 p=g['meshes'][mi]['primitives'][0];at=p['attributes'];return {'p':accessor(g,raw,at['POSITION']).astype(float),'j':accessor(g,raw,at['JOINTS_0']).astype(int),'w':accessor(g,raw,at['WEIGHTS_0']).astype(float),'f':accessor(g,raw,p['indices']).astype(int).reshape(-1,3)}
coats=[mesh(g,r,3),mesh(c,cr,3)];f=coats[0]['f'];edges=np.unique(np.sort(np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]),axis=1),axis=0)
bodyparts=[]
for p in g['meshes'][2]['primitives']:
 at=p['attributes'];bodyparts.append({'p':accessor(g,r,at['POSITION']).astype(float),'j':accessor(g,r,at['JOINTS_0']).astype(int),'w':accessor(g,r,at['WEIGHTS_0']).astype(float),'f':accessor(g,r,p['indices']).astype(int).reshape(-1,3),'targets':[accessor(g,r,t['POSITION']).astype(float)for t in p['targets']]})
def skin(m,jm,world,weights=None):
 v=m['p'].copy()
 if weights is not None:
  for k,w in enumerate(weights):
   if w:v+=m['targets'][k]*w
 p=np.c_[v,np.ones(len(v))];result=np.zeros_like(p)
 for k in range(4):result+=np.einsum('nij,nj->ni',jm[m['j'][:,k]],p)*m['w'][:,k,None]
 return (result@world.T)[:,:3]
rows=[];collisions=[]
for si,(sample,values)in enumerate(zip(samples,data)):
 world=values[:16].reshape(4,4).T;jm=values[16:1456].reshape(90,4,4).transpose(0,2,1);mw=values[1456:];bgeo=None
 if sample['collision']:
  vs=[];fs=[];off=0
  for bp in bodyparts:
   v=skin(bp,jm,world,mw);vs.append(v);fs.append(bp['f']+off);off+=len(v)
  bv=np.vstack(vs);bf=np.vstack(fs);bgeo=BVHTree.FromPolygons(bv.tolist(),bf.tolist(),all_triangles=True,epsilon=0)
 for label,m in zip(['before','after'],coats):
  v=skin(m,jm,world);length=np.linalg.norm(v[edges[:,0]]-v[edges[:,1]],axis=1);ref=np.linalg.norm(m['p'][edges[:,0]]-m['p'][edges[:,1]],axis=1);ratios=length/np.maximum(ref,1e-8);gaps=np.linalg.norm(v[pairs[:,0]]-v[pairs[:,1]],axis=1)
  rows.append({'clip':sample['clip']or'NODE_REST_DIAGNOSTIC','seconds':sample['seconds'],'model':label,'confirmedSeamMaxGapM':float(gaps.max()),'edgeStretchMax':float(ratios.max()),'edgeStretchP99':float(np.quantile(ratios,.99)),'edgeStretchP95':float(np.quantile(ratios,.95)),'maxWorldCoordinateAbs':float(np.abs(v).max())})
  if bgeo:
   tree=BVHTree.FromPolygons(v.tolist(),f.tolist(),all_triangles=True,epsilon=0);cross=tree.overlap(bgeo);collisions.append({'clip':sample['clip']or'NODE_REST_DIAGNOSTIC','seconds':sample['seconds'],'model':label,'bodyCoatTrianglePairs':len(cross),'classification':'SAMPLED_SURFACE_CROSSINGS_VISIBLE_OR_OCCLUDED_NOT_APPROVED'})
 if si%30==0:print('POSE_QA',si,len(samples),flush=True)
for name,rr in [('garment-poses.csv',rows),('garment-collisions.csv',collisions)]:
 with (D/name).open('w')as file:w=csv.DictWriter(file,fieldnames=list(rr[0]),lineterminator='\n');w.writeheader();w.writerows(rr)
weights=coats[1]['w'];joints=coats[1]['j'];names=[c['nodes'][i]['name']for i in c['skins'][0]['joints']];finger=np.array(['Hand'in n and any(t in n for t in ['Thumb','Index','Middle','Ring','Pinky'])for n in names]);assert not (weights*finger[joints]).any();assert np.max(np.abs(weights.sum(1)-1))<1e-5
summary={'sourceSha256':h(b),'candidateSha256':h(cb),'originalSophiaSha256':h(ob),'candidateBytes':len(cb),'mainBones':90,'bodyMorphs':48,'bodyTargetNames':c['meshes'][2]['extras']['targetNames'],'bodyOriginalComparison':body,'originalBinPrefixUnchanged':False,'losslessPacking':True,'skinsNodesAndExistingAnimationsExact':True,'clipsPreserved':preserved,'clipsInOriginalSource':len(clipsOriginal),'clipsRemovedBeforeR15':sorted(set(clipsOriginal)-set(clipsCurrent)),'uvMaterialsTexturesAndOtherMeshesExact':True,'posesPerModel':len(samples),'collisionPosesPerModel':sum(x['collision']for x in samples),'confirmedSourceSeamPairs':len(pairs),'skinning':{'maxInfluences':4,'maxWeightSumError':float(np.abs(weights.sum(1)-1).max()),'fingerInfluences':0},'beforeAfter':{label:{'maxSeamGapM':max(x['confirmedSeamMaxGapM']for x in rows if x['model']==label),'maxEdgeStretch':max(x['edgeStretchMax']for x in rows if x['model']==label),'maxP99EdgeStretch':max(x['edgeStretchP99']for x in rows if x['model']==label),'maxBodyCoatTrianglePairs':max(x['bodyCoatTrianglePairs']for x in collisions if x['model']==label)}for label in ['before','after']},'limits':['Actual preserved clips sampled, not continuous collision/containment test','Body-fur and overlap triangle counts need visible/occluded interpretation; zero seam gap is not global garment approval','No reconstruction of original36clips:27current clips exact,9historical already omitted byPR306','WebGL/runtime and Android gates separate from CPU geometry']}
(D/'asset-integrity.json').write_text(json.dumps(summary,indent=2)+'\n');print('VALIDATION_COMPLETE',json.dumps(summary['beforeAfter']),flush=True)
