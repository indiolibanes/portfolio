"""Reproduce source inventory and qualify topology without welding the asset."""
import pathlib,json,hashlib,collections,numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from glb import load,accessor
SRC=pathlib.Path('local-private/sophia-r15/sources');OUT=pathlib.Path('local-private/sophia-r15');OUT.mkdir(parents=True,exist_ok=True)
def topology(path,mesh_index):
 b,g,raw=load(path);p=g['meshes'][mesh_index]['primitives'][0];v=accessor(g,raw,p['attributes']['POSITION']);f=accessor(g,raw,p['indices']).astype(int).reshape(-1,3);key,inv=np.unique(np.round(v,5),axis=0,return_inverse=True);wf=inv[f];edges=np.sort(np.concatenate([wf[:,[0,1]],wf[:,[1,2]],wf[:,[2,0]]]),axis=1);ue,counts=np.unique(edges,axis=0,return_counts=True);gr=coo_matrix((np.ones(len(ue)*2),(np.r_[ue[:,0],ue[:,1]],np.r_[ue[:,1],ue[:,0]])),shape=(len(key),len(key)));n,labels=connected_components(gr,directed=False);fl=labels[wf[:,0]];area=np.linalg.norm(np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]]),axis=1)*.5
 j=accessor(g,raw,p['attributes']['JOINTS_0']).astype(int);w=accessor(g,raw,p['attributes']['WEIGHTS_0']);names=[g['nodes'][x]['name']for x in g['skins'][0]['joints']];dense=np.zeros((len(v),len(names)))
 for k in range(4):np.add.at(dense,(np.arange(len(v)),j[:,k]),w[:,k])
 conflicts=[]
 for ui in np.flatnonzero(np.bincount(inv)>1):
  ids=np.flatnonzero(inv==ui);l1=np.abs(dense[ids,None,:]-dense[ids][None,:,:]).sum(2).max()
  if l1>.1:conflicts.append({'group':int(ui),'vertices':ids.tolist(),'maxWeightL1':float(l1),'position':key[ui].tolist()})
 comps=[]
 for c in range(n):
  fi=np.flatnonzero(fl==c);ids=np.unique(f[fi]);top=np.argsort(dense[ids].sum(0))[-5:][::-1];comps.append({'id':c,'triangles':len(fi),'vertices':len(ids),'area':float(area[fi].sum()),'bounds':[v[ids].min(0).tolist(),v[ids].max(0).tolist()],'topBones':[(names[k],round(float(dense[ids,k].sum()),3))for k in top]})
 r={'sha256':hashlib.sha256(b).hexdigest(),'vertices':len(v),'triangles':len(f),'uniqueRoundedPositions':len(key),'components':n,'boundaryEdges':int((counts==1).sum()),'nonManifoldEdges':int((counts>2).sum()),'degenerateTriangles':int((area<1e-12).sum()),'weightConflicts':len(conflicts),'weightConflictGroups':conflicts,'componentsByArea':sorted(comps,key=lambda x:x['area'],reverse=True),'jointNames':names,'bounds':[v.min(0).tolist(),v.max(0).tolist()],'attributes':p['attributes']}
 (OUT/(path.stem+'-topology.json')).write_text(json.dumps(r,indent=2)+'\n');return r,g,raw
r,g,raw=topology(SRC/'sophia-lab.glb',3);s,sg,sraw=topology(SRC/'Lab_Coat_v1.1.glb',0)
print(json.dumps({k:r[k]for k in ['vertices','triangles','uniqueRoundedPositions','components','boundaryEdges','nonManifoldEdges','degenerateTriangles','weightConflicts','bounds','attributes']}));print('COMPONENTS',json.dumps(r['componentsByArea'][:15]));print('JOINTS',r['jointNames']);print('SOURCE_COAT',json.dumps({k:s[k]for k in ['vertices','triangles','uniqueRoundedPositions','components','boundaryEdges','bounds']}))
for mi in [2,3]:
 print('MESH',mi,g['meshes'][mi].get('extras',{}));
 for ni,n in enumerate(g['nodes']):
  if n.get('mesh')==mi:print('NODE',ni,n)
