"""Validate a bounded private derivative against the hash-locked R1.B pilot.
No raster appearance or GPU claim is inferred here.
"""
import argparse,pathlib,json,hashlib
import numpy as np
from r1c_common import Model,PILOT_SHA,SOURCE_SHA
ap=argparse.ArgumentParser();ap.add_argument('--baseline',default='local-private/adornments-r1c/r1b-baseline.glb');ap.add_argument('--candidate',default='local-private/adornments-r1c/sophia-r1c-collar-study.glb');ap.add_argument('--out',default='docs/sophia/adornments-r1c/results/r1c-source-diff.json');a=ap.parse_args();b=Model(a.baseline);c=Model(a.candidate);h=lambda x:hashlib.sha256(x).hexdigest();assert h(b.bytes)==PILOT_SHA;assert h(pathlib.Path('public/experimental/sophia-alpha.glb').read_bytes())==SOURCE_SHA
assert c.raw[:len(b.raw)]==b.raw,'Original BIN prefix modified'
for k in ['nodes','skins','animations','materials','images','textures','samplers','scenes','scene']:
 assert c.g.get(k)==b.g.get(k),k+' changed'
assert c.g['accessors'][:len(b.g['accessors'])]==b.g['accessors'];assert c.g['bufferViews'][:len(b.g['bufferViews'])]==b.g['bufferViews']
assert len(c.g['skins'][0]['joints'])==101
allowed={4,12,121,122,123,124,125,126};changed=[];mesh_checks=[]
for mi,(bm,cm)in enumerate(zip(b.g['meshes'],c.g['meshes'])):
 assert set(bm)==set(cm)
 for k in bm:
  if k!='primitives':assert bm[k]==cm[k]
 assert len(bm['primitives'])==len(cm['primitives'])
 for pi,(bp,cp)in enumerate(zip(bm['primitives'],cm['primitives'])):
  original=pi if pi<9 else pi+3
  for k in bp:
   if k!='attributes':assert bp[k]==cp[k],(mi,pi,k)
  assert set(bp)==set(cp) and set(bp['attributes'])==set(cp['attributes'])
  for k,bi in bp['attributes'].items():
   ci=cp['attributes'][k]
   if bi==ci:continue
   assert mi==0 and original in allowed and k in ['POSITION','NORMAL'],(mi,original,k)
   bv=b.arr(bi).astype(float);cv=c.arr(ci).astype(float);delta=np.linalg.norm(cv-bv,axis=1);assert np.isfinite(cv).all();rec={'mesh':mi,'sourcePrimitive':original,'attribute':k,'verticesChanged':int((delta>1e-9).sum()),'maxEuclideanDelta':float(delta.max()),'beforeAccessor':bi,'afterAccessor':ci}
   if k=='POSITION':assert delta.max()<=.0060001
   if k=='NORMAL':
    lens=np.linalg.norm(cv,axis=1);assert np.max(np.abs(lens-1))<1e-5;dot=(bv*cv).sum(1)/np.maximum(np.linalg.norm(bv,axis=1)*lens,1e-12);rec['maxAngleDegrees']=float(np.degrees(np.arccos(np.clip(dot,-1,1))).max())
   changed.append(rec)
 assert mi==0 or bm==cm,'Props/stars changed'
 mesh_checks.append({'mesh':mi,'primitiveCount':len(cm['primitives']),'topologyUnchanged':True,'uvColorsMaterialsMorphTargetsUnchanged':True})
assert changed,'No actual repair'
weights=[]
for pi in [4,5,121,127,130]:
 p=c.prim(pi);w=c.arr(p['attributes']['WEIGHTS_0']);j=c.arr(p['attributes']['JOINTS_0']);used=np.unique(c.faces(pi));weights.append({'sourcePrimitive':pi,'indexedVertices':len(used),'singleInfluenceFraction':float(((w[used]>1e-6).sum(1)==1).mean()),'maxWeightSumError':float(np.max(np.abs(w[used].sum(1)-1))),'positiveInfluences':sorted(set(c.jointnames[int(x)]for x in j[used][w[used]>1e-6]))})
provenance=[]
for pi in sorted({x['sourcePrimitive']for x in changed}):
 p=b.prim(pi);at=p['attributes'];mat=p.get('material');uv=at.get('TEXCOORD_0');provenance.append({'node':93,'nodeName':b.g['nodes'][93].get('name'),'mesh':0,'skin':0,'source6HPrimitive':pi,'pilotAndCandidatePrimitive':pi if pi<9 else pi-3,'triangles':len(b.faces(pi)),'materialIndex':mat,'materialName':b.g['materials'][mat].get('name'),'materialJsonSha256':h(json.dumps(b.g['materials'][mat],sort_keys=True).encode()),'texcoord0Accessor':uv,'texcoord0ArraySha256':h(b.arr(uv).tobytes())if uv is not None else None,'vertexColorAccessor':at.get('COLOR_0'),'weightsArraySha256':h(b.arr(at['WEIGHTS_0']).tobytes()),'uvMaterialSkinningUnchanged':True})
clips=[{'name':x['name'],'channels':len(x['channels']),'samplers':len(x['samplers']),'duration':max(float(b.arr(s['input']).max())for s in x['samplers'])}for x in b.g['animations']]
r={'status':'BOUNDED_GARMENT_DIFF_VERIFIED_NOT_VISUAL_APPROVAL','source6HSha256':SOURCE_SHA,'pilotR1BSha256':PILOT_SHA,'candidateSha256':h(c.bytes),'candidateBytes':len(c.bytes),'originalBinPrefixUnchanged':True,'entireBinUnchanged':False,'newBinBytes':len(c.raw)-len(b.raw),'originalAccessorAndBufferViewPrefixUnchanged':True,'nodesAndSocketsExact':True,'skinsInverseBindMatricesWeightsJointsExact':True,'joints':101,'originalClipsAndSamplesExact':True,'clips':clips,'morphsExact':['Blink','Smile','BrowRaise','MouthOpen'],'newBody':False,'newBones':0,'newMorphs':0,'newMaterialsOrTextures':0,'newTopology':False,'meshes':mesh_checks,'changedAttributes':changed,'changedPieceProvenance':provenance,'skinning':weights,'identity':'IDENTITY_BLOCKED; legacy three raised stars retained in experimental 6H only','limits':['Geometry/CPU proof only; actual contact, WebGL and artistic gates separate','Original BIN retained and new accessors appended, not an unchanged complete BIN','Source rest matrices differ from inverse-bind on 12 arm joints; review uses active clips, not REST']}
path=pathlib.Path(a.out);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'candidate':h(c.bytes),'changedAttributes':len(changed),'changedPositionVertices':sum(x['verticesChanged']for x in changed if x['attribute']=='POSITION'),'maxNormalAngle':max(x.get('maxAngleDegrees',0)for x in changed)}))
