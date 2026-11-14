"""Source-edge guided seam recovery and garment-only skin regularization.
No remesh, hole fill, body changes or synthetic replacement geometry.
"""
import argparse,copy,hashlib,json,pathlib,struct,collections
import numpy as np
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix,diags,eye
from scipy.sparse.linalg import spsolve
from scipy.sparse.csgraph import connected_components
from glb import load,accessor
SHA='85f6d6afb6483c42765597a26f0b1cde69793769229bc74007faefb322eaf5e6'
COAT_SHA='e3a213257b4b45ce4b8c0467d3159943bc3c18273e144ef256209938eed29857'
def recover(source,coat,out,smooth_mm=20):
 b,g,raw=load(source);sb,sg,sraw=load(coat);assert hashlib.sha256(b).hexdigest()==SHA;assert hashlib.sha256(sb).hexdigest()==COAT_SHA
 g=copy.deepcopy(g);p=g['meshes'][3]['primitives'][0];at=p['attributes'];v=accessor(g,raw,at['POSITION']).astype(float);uv=accessor(g,raw,at['TEXCOORD_0']);norm=accessor(g,raw,at['NORMAL']).astype(float);f=accessor(g,raw,p['indices']).astype(int).reshape(-1,3);j=accessor(g,raw,at['JOINTS_0']).astype(int);w=accessor(g,raw,at['WEIGHTS_0']).astype(float);sp=sg['meshes'][0]['primitives'][0];su=accessor(sg,sraw,sp['attributes']['TEXCOORD_0']);sv=accessor(sg,sraw,sp['attributes']['POSITION']);dist,ids=cKDTree(su).query(uv);assert dist.max()==0,'UV provenance mismatch'
 # Each UV has one integrated vertex. Recover SOURCE geometric edge identity,
 # never infer a seam simply because two fitted points happen to be near.
 _,src=np.unique(sv[ids],axis=0,return_inverse=True);parent=np.arange(len(v))
 def root(x):
  while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
  return x
 def union(a,b):
  a=root(int(a));b=root(int(b))
  if a!=b:parent[max(a,b)]=min(a,b)
 edges=collections.defaultdict(list)
 for fi,face in enumerate(f):
  for a,b0 in [(face[0],face[1]),(face[1],face[2]),(face[2],face[0])]:
   x,y=int(src[a]),int(src[b0]);edges[tuple(sorted((x,y)))].append((int(a),int(b0),fi))
 seams=[];ambiguous=0
 for key,pairs in edges.items():
  if len(pairs)!=2:
   if len(pairs)>2:ambiguous+=1
   continue
  aa,bb=pairs
  # Opposed authored normals can identify separate inside/outside layers.
  matches=[]
  for x in aa[:2]:
   y=next(z for z in bb[:2]if src[z]==src[x]);matches.append((x,y))
  if any(np.dot(norm[x],norm[y])<.25 for x,y in matches):continue
  for x,y in matches:
   union(x,y)
   if x!=y:seams.append((x,y))
 roots=np.array([root(i)for i in range(len(v))]);_,inv=np.unique(roots,return_inverse=True);n=inv.max()+1;count=np.bincount(inv);pos=np.zeros((n,3));np.add.at(pos,inv,v);pos/=count[:,None];newv=pos[inv]
 names=[g['nodes'][i]['name']for i in g['skins'][0]['joints']];N=len(names);dense=np.zeros((len(v),N))
 for k in range(4):np.add.at(dense,(np.arange(len(v)),j[:,k]),w[:,k])
 base=dense.copy();ix={name:i for i,name in enumerate(names)};center=-.1771032
 def transfer(old,new,mask=None,fraction=1):
  a=ix[old];bb=ix[new];amount=dense[:,a].copy()*fraction
  if mask is not None:amount*=mask
  dense[:,a]-=amount;dense[:,bb]+=amount
 for side in ['Left','Right']:
  fore='mixamorig:'+side+'ForeArm';hand='mixamorig:'+side+'Hand';arm='mixamorig:'+side+'Arm'
  # Cloth is not the glove: finger influences are accidental nearest-body transfer.
  for name in names:
   if name.startswith(hand)and name!=hand:transfer(name,fore)
  transfer(hand,fore,mask=v[:,1]>.41)
  excess=np.maximum(dense[:,ix[hand]]-.20,0);dense[:,ix[hand]]-=excess;dense[:,ix[fore]]+=excess
  # Legs may gently guide the lower open flap, never the shoulder/sleeve.
  for suffix in ['Leg','Foot','ToeBase','Toe_End']:
   name='mixamorig:'+side+suffix
   if name in ix:transfer(name,'mixamorig:Hips')
  thigh='mixamorig:'+side+'UpLeg';transfer(thigh,'mixamorig:Hips',mask=v[:,1]>.335)
  excess=np.maximum(dense[:,ix[thigh]]-.25,0);dense[:,ix[thigh]]-=excess;dense[:,ix['mixamorig:Hips']]+=excess
 for name in names:
  if name.startswith('POC_')or name in ['mixamorig:Head','mixamorig:HeadTop_End']:
   dest='mixamorig:Hips'if 'Tail'in name else'mixamorig:Neck';transfer(name,dest)
 # Source component membership separates the main continuous shell from
 # independent overlays. A measured cuff hotspot at y=.326, lateral x=.19
 # wrongly followed the thigh/hips; transfer that lateral sleeve band to its arm.
 sf=accessor(sg,sraw,sp['indices']).astype(int).reshape(-1,3);_,sgi=np.unique(sv,axis=0,return_inverse=True);se=sgi[np.concatenate([sf[:,[0,1]],sf[:,[1,2]],sf[:,[2,0]]])];sgra=coo_matrix((np.ones(len(se)*2),(np.r_[se[:,0],se[:,1]],np.r_[se[:,1],se[:,0]])),shape=(sgi.max()+1,sgi.max()+1));_,labels=connected_components(sgra,directed=False);comp=labels[sgi[ids]]
 def ease(x):x=np.clip(x,0,1);return x*x*(3-2*x)
 sleeve=ease((np.abs(v[:,0]-center)-.07)/.05)*ease((v[:,1]-.29)/.035)*(comp==0)
 ib=accessor(g,raw,g['skins'][0]['inverseBindMatrices']);bp={name:np.linalg.inv(ib[k].reshape(4,4,order='F'))[:3,3]for k,name in enumerate(names)}
 for side,sign in [('Left',1),('Right',-1)]:
  arm='mixamorig:'+side+'Arm';fore='mixamorig:'+side+'ForeArm';hand='mixamorig:'+side+'Hand';a=bp[arm];axis=bp[fore]-a;t=(v-a)@axis/(axis@axis);tofore=ease((t-.65)/.60);mask=sleeve*((v[:,0]-center)*sign>0)
  allowed={ix[arm],ix[fore],ix[hand],ix['mixamorig:'+side+'Shoulder']};take=dense[:,[k for k in range(N)if k not in allowed]].sum(1)*mask
  for k in range(N):
   if k not in allowed:dense[:,k]*=(1-mask)
  dense[:,ix[arm]]+=take*(1-tofore);dense[:,ix[fore]]+=take*tofore
 # Avoid abrupt four-slot palette changes: shoulder/hand and intermediate
 # spine influences are consolidated into existing garment-driving ancestors.
 # The character still retains every one of its 90 bones and original weights.
 for name in ['mixamorig:Spine','mixamorig:Spine1','mixamorig:Neck']:transfer(name,'mixamorig:Spine2')
 for side in ['Left','Right']:
  transfer('mixamorig:'+side+'Shoulder','mixamorig:'+side+'Arm');transfer('mixamorig:'+side+'Hand','mixamorig:'+side+'ForeArm')
 transfer('Root_Motion','mixamorig:Hips')
 # A fixed set of source-edge fans gives identical positions AND weights across
 # confirmed seams while leaving independently overlapping layers separate.
 averaged=np.zeros((n,N));np.add.at(averaged,inv,dense);averaged/=count[:,None]
 wf=inv[f];ee=np.unique(np.sort(np.concatenate([wf[:,[0,1]],wf[:,[1,2]],wf[:,[2,0]]]),axis=1),axis=0);ee=ee[ee[:,0]!=ee[:,1]];length=np.linalg.norm(pos[ee[:,0]]-pos[ee[:,1]],axis=1);conductance=1/np.maximum(length,.0001)**2;A=coo_matrix((np.r_[conductance,conductance],(np.r_[ee[:,0],ee[:,1]],np.r_[ee[:,1],ee[:,0]])),shape=(n,n)).tocsr();L=diags(np.asarray(A.sum(1)).ravel())-A
 # Screened harmonic smoothing is scaled in meters, so short edges cannot
 # carry abrupt bone switches merely because source tessellation is uneven.
 averaged=np.maximum(spsolve(eye(n,format='csc')+(smooth_mm/1000)**2*L.tocsc(),averaged),0)
 averaged/=np.maximum(averaged.sum(1)[:,None],1e-12)
 # No thigh leakage above the waist after diffusion. Blend out continuously.
 for side in ['Left','Right']:
  ji=ix['mixamorig:'+side+'UpLeg'];keep=ease((.36-pos[:,1])/.06);removed=averaged[:,ji]*(1-keep);averaged[:,ji]*=keep;averaged[:,ix['mixamorig:Hips']]+=removed
 order=np.argsort(-averaged,axis=1,kind='stable')[:,:4];nw=np.take_along_axis(averaged,order,axis=1);nw/=np.maximum(nw.sum(1)[:,None],1e-12);nj=order[inv].astype('<u2');nw=nw[inv].astype('<f4')
 # Transport authored normals locally rather than globally resmoothing UV seams.
 def smoothnorm(v):
  q=np.zeros_like(v);face=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]])
  for k in range(3):np.add.at(q,f[:,k],face)
  lens=np.linalg.norm(q,axis=1);ok=lens>1e-12;q[ok]/=lens[ok,None];q[~ok]=norm[~ok];return q
 a=smoothnorm(v);bb=smoothnorm(newv);axis=np.cross(a,bb);cos=np.clip((a*bb).sum(1),-1,1);newn=norm.copy();good=cos>-.95;newn[good]=norm[good]+np.cross(axis[good],norm[good])+np.cross(axis[good],np.cross(axis[good],norm[good]))/np.maximum(1+cos[good,None],1e-12);newn/=np.maximum(np.linalg.norm(newn,axis=1)[:,None],1e-12)
 buf=bytearray(raw)
 def append(arr,kind,ct=5126):
  arr=np.asarray(arr,dtype='<f4'if ct==5126 else'<u2');buf.extend(b'\0'*((-len(buf))%4));off=len(buf);data=arr.tobytes();buf.extend(data);vi=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(data)});ai=len(g['accessors']);ac={'bufferView':vi,'componentType':ct,'count':len(arr),'type':kind}
  if kind=='VEC3':ac.update(min=arr.min(0).tolist(),max=arr.max(0).tolist())
  g['accessors'].append(ac);return ai
 for name,arr,kind,ct in [('POSITION',newv,'VEC3',5126),('NORMAL',newn,'VEC3',5126),('JOINTS_0',nj,'VEC4',5123),('WEIGHTS_0',nw,'VEC4',5126)]:at[name]=append(arr,kind,ct)
 g['buffers'][0]['byteLength']=len(buf);g.setdefault('extras',{})['sophiaR15']={'status':'PARTIAL_PRIVATE_GARMENT_CANDIDATE_AXILLA_GATE_UNRESOLVED','bodyRigMorphsClipsProtected':True,'method':'source-edge seam recovery and garment-only weight regularization'}
 js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);buf.extend(b'\0'*((-len(buf))%4));data=struct.pack('<4sII',b'glTF',2,28+len(js)+len(buf))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(buf),0x004e4942)+buf;out=pathlib.Path(out);out.write_bytes(data)
 report={'beforeSha256':SHA,'sourceCoatSha256':COAT_SHA,'candidateSha256':hashlib.sha256(data).hexdigest(),'sourceUvCorrespondenceExact':True,'sourceGuidedVertexFans':int(n),'confirmedSeamPairs':len(seams),'ambiguousSourceEdgesNotMerged':ambiguous,'verticesRepositioned':int((np.linalg.norm(newv-v,axis=1)>1e-8).sum()),'maxPositionCorrectionM':float(np.linalg.norm(newv-v,axis=1).max()),'maxWeightsL1':float(np.abs(base-np.eye(N)[nj].__mul__(nw[:,:,None]).sum(1)).sum(1).max()),'harmonicSmoothingMm':smooth_mm,'sleeveBandVertices':int((sleeve>0).sum()),'newBones':0,'newFaces':0,'deletedFaces':0,'uvAndMaterialUnchanged':True,'negativeNormalTransportFallbackVertices':int((~good).sum()),'limits':['Source edges with exactly two faces and compatible normals only; ambiguous layers not merged','No blanket removal of components or filling of garment openings','Body/rig/morph/animation protected; artistic/pose/collision/mobile approval separate']};out.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n');np.savez(out.with_suffix('.seams.npz'),pairs=np.array(seams),sourceGroups=src,vertexFans=inv);print(json.dumps(report))
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--source',default='public/assets/models/sophia/sophia-lab.glb');ap.add_argument('--coat-source',default='local-private/sophia-r15/sources/Lab_Coat_v1.1.glb');ap.add_argument('--out',default='local-private/sophia-r15/sophia-lab-r15.glb');ap.add_argument('--smooth-mm',type=float,default=20);a=ap.parse_args();recover(a.source,a.coat_source,a.out,a.smooth_mm)
