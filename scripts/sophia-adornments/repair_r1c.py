#!/usr/bin/env python3
"""Bounded reversible edits of recovered 6H garment/prop sockets only.
Original public sources, body topology, skeleton and source animations stay intact.
"""
import argparse,copy,hashlib,json,pathlib,struct
import numpy as np
from r1c_common import Model,PILOT_SHA,smooth
def build(args):
 m=Model(args.source);assert hashlib.sha256(m.bytes).hexdigest()==PILOT_SHA,'R1.B source SHA mismatch'
 g=copy.deepcopy(m.g);raw=bytearray(m.raw);changes=[]
 def append(arr,kind,component=5126):
  arr=np.asarray(arr,dtype='<f4'if component==5126 else'<u2');raw.extend(b'\0'*((-len(raw))%4));start=len(raw);data=arr.tobytes();raw.extend(data);vi=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(data)});ai=len(g['accessors']);a={'bufferView':vi,'componentType':component,'count':len(arr),'type':kind}
  if kind=='VEC3':a.update(min=arr.min(0).tolist(),max=arr.max(0).tolist())
  g['accessors'].append(a);return ai
 def averaged_normal(v,f,base):
  out=np.zeros_like(v);n=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]])
  for k in range(3):np.add.at(out,f[:,k],n)
  length=np.linalg.norm(out,axis=1);good=length>1e-12;out[good]/=length[good,None];out[~good]=base[~good];return out
 # Keep exact original Book/Pen channels. Intermediate socket translations are
 # independent reversible parameters; right offset least-squares follows the
 # left offset's world displacement over the existing Write clip.
 dL=np.array([0,-args.book_offset,0]);pen_terms=[]
 for t in np.linspace(0,3.2,65):
  W,_=m.pose('Write',float(t));pen_terms.append(np.linalg.solve(W[27][:3,:3],W[21][:3,:3]@dL))
 dR=np.mean(pen_terms,axis=0)
 for name,d in [('Socket_Hand_L_Notebook',dL),('Socket_Hand_R_Pen',dR)]:
  node=next(n for n in g['nodes']if n.get('name')==name);node['translation']=d.tolist()
 # Only indexed garment vertices are eligible. Decorative garment pieces get
 # the same position field so piping is not left behind when a seam moves.
 eligible=[4,5,12]+list(range(37,147))
 for original in eligible:
  p=m.prim(original);pos=m.arr(p['attributes']['POSITION']).astype(float);v=pos.copy();ix=m.arr(p['attributes']['JOINTS_0']).astype(int);w=m.arr(p['attributes']['WEIGHTS_0']);used=np.unique(m.faces(original));active=np.zeros(len(v));active[used]=1
  # Lower only the front upper collar rim; keep back/side collar and lapels.
  collar=smooth((v[:,1]-.515)/.025)*smooth((.568-v[:,1])/.008)*smooth((v[:,2]-.065)/.035)*smooth((.072-np.abs(v[:,0]))/.025)*active
  v[:,1]-=args.collar_drop*collar
  # Source Write folds the right forearm against the front upper sleeve.
  # Ease only that measured 30 mm hotspot, not the entire arm or cuff.
  elbow=smooth((v[:,1]-.37)/.025)*smooth((.445-v[:,1])/.025)*smooth((-.06-v[:,0])/.03)*smooth((v[:,0]+.16)/.03)*smooth((v[:,2]-.005)/.025)*active
  v[:,2]+=args.elbow_ease*elbow
  for side in ['L','R']:
   fore=m.bindpos('forearm_'+side);hand=m.bindpos('hand_'+side);axis=hand-fore;axis/=np.linalg.norm(axis);along=(pos-fore)@axis;rad=(pos-fore)-along[:,None]*axis;rr=np.linalg.norm(rad,axis=1);units=rad/np.maximum(rr[:,None],1e-12)
   mask=np.asarray([n in ['forearm_'+side,'hand_'+side]for n in m.jointnames]);influence=(mask[ix]*w).sum(1)
   cuff=smooth((along-.050)/.030)*np.clip(influence,0,1)*active
   v+=args.cuff_radius*cuff[:,None]*units
   v+=args.cuff_extension*cuff[:,None]*axis
  # Trial of bounded back-hem displacement only. No new tail opening or body cut.
  back=smooth((-.045-pos[:,2])/.04)*smooth((.32-pos[:,1])/.06)*smooth((pos[:,1]-.11)/.03)*smooth((.13-np.abs(pos[:,0]-.045))/.05)*active
  v[:,2]-=args.back_ease*back
  displacement=np.linalg.norm(v-pos,axis=1);changed=displacement>1e-9
  if not np.any(changed):continue
  assert displacement.max()<=.025,'Bounded repair exceeded 25 mm source-space limit'
  f=m.faces(original);base=m.arr(p['attributes']['NORMAL']).astype(float);oldavg=averaged_normal(pos,f,base);newavg=averaged_normal(v,f,base)
  # Rotate authored split normals by the local face-normal change. Untouched
  # neighbourhoods retain their exact source normals; no global resmoothing.
  n=base.copy();affected=np.unique(f[np.any(changed[f],axis=1)]);a=oldavg[affected];b=newavg[affected];axis=np.cross(a,b);cos=np.clip((a*b).sum(1),-1,1);assert np.all(cos>-.95),'Normal reversal requires manual review';x=base[affected];n[affected]=x+np.cross(axis,x)+np.cross(axis,np.cross(axis,x))/np.maximum(1+cos[:,None],1e-12);n[affected]/=np.maximum(np.linalg.norm(n[affected],axis=1)[:,None],1e-12)
  target=g['meshes'][0]['primitives'][original if original<9 else original-3]
  target['attributes']['POSITION']=append(v,'VEC3');target['attributes']['NORMAL']=append(n,'VEC3')
  changes.append({'sourcePrimitive':original,'verticesChanged':int(changed.sum()),'maxSourceSpaceDisplacement':float(displacement.max()),'topologyChanged':False,'uvMaterialWeightsUnchanged':True})
 # Optional modest shoulder smoothing into the existing clavicle/chest only.
 # Never touch the body rig or add skin joints. Pair shell and lining equally.
 if args.shoulder_blend:
  for original in [4,5]:
   p=m.prim(original);v=m.arr(p['attributes']['POSITION']);oldj=m.arr(p['attributes']['JOINTS_0']).astype(int);oldw=m.arr(p['attributes']['WEIGHTS_0']);nj=oldj.copy();nw=oldw.copy();changed=0
   for vi,point in enumerate(v):
    side='L'if point[0]>=0 else'R';q=m.bindpos('upper_arm_'+side);distance=np.linalg.norm(point-q);blend=args.shoulder_blend*float(smooth((.060-distance)/.030))
    if blend<1e-6:continue
    d={int(j):float(w)*(1-blend)for j,w in zip(oldj[vi],oldw[vi])if w>0};c=m.jointnames.index('clavicle_'+side);d[c]=d.get(c,0)+blend*.65;ch=m.jointnames.index('chest');d[ch]=d.get(ch,0)+blend*.35;items=sorted(d.items(),key=lambda x:x[1],reverse=True)[:4];total=sum(w for j,w in items);nj[vi]=0;nw[vi]=0
    for k,(j,w)in enumerate(items):nj[vi,k]=j;nw[vi,k]=w/total
    changed+=1
   target=g['meshes'][0]['primitives'][original];target['attributes']['JOINTS_0']=append(nj,'VEC4',5123);target['attributes']['WEIGHTS_0']=append(nw,'VEC4');changes.append({'sourcePrimitive':original,'shoulderWeightVertices':changed,'maxBlendProposal':args.shoulder_blend,'jointPaletteUnchanged':True})
 raw.extend(b'\0'*((-len(raw))%4));g['buffers'][0]['byteLength']=len(raw)
 g.setdefault('extras',{})['r1c']={'status':'R1C_6H_VISUAL_CANDIDATE_IDENTITY_BLOCKED','newBody':False,'sourceClipsUnchanged':True,'newMorphs':False,'parameters':{k:v for k,v in vars(args).items()if k not in ['source','out']}}
 assert g['animations']==m.g['animations'] and g['skins']==m.g['skins'] and g['materials']==m.g['materials'] and g['images']==m.g['images'] and g['textures']==m.g['textures']
 jb=json.dumps(g,separators=(',',':'),ensure_ascii=True).encode();jb+=b' '*((-len(jb))%4);data=struct.pack('<4sII',b'glTF',2,12+8+len(jb)+8+len(raw))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(raw),0x004e4942)+raw;out=pathlib.Path(args.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
 r={'sourcePilotSha256':PILOT_SHA,'candidateSha256':hashlib.sha256(data).hexdigest(),'parameters':g['extras']['r1c']['parameters'],'socketOffsets':{'left':dL.tolist(),'right':dR.tolist()},'changedGarmentPrimitives':changes,'identity':'BLOCKED; original 6H identity retained, no new fringe/mark claimed','originalClipsSkinsMaterialsImagesTexturesPreserved':True};out.with_suffix('.json').write_text(json.dumps(r,indent=2)+'\n');print(r['candidateSha256'])
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--source',default='local-private/adornments-r1c/r1b-baseline.glb');ap.add_argument('--out',required=True);ap.add_argument('--book-offset',type=float,default=0);ap.add_argument('--collar-drop',type=float,default=.006);ap.add_argument('--cuff-radius',type=float,default=0);ap.add_argument('--cuff-extension',type=float,default=0);ap.add_argument('--back-ease',type=float,default=0);ap.add_argument('--shoulder-blend',type=float,default=0);ap.add_argument('--elbow-ease',type=float,default=0);build(ap.parse_args())
