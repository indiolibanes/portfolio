"""Private independent sample/table verification. Does not render or approve appearance."""
import sys,json,struct,pathlib,hashlib
import numpy as np
from actorx import read_psk,read_psa

def read(path):
 b=pathlib.Path(path).read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);length=struct.unpack_from('<I',b,20+n)[0];return g,memoryview(b)[28+n:28+n+length]
def accessor(g,buf,i):
 a=g['accessors'][i];width={'SCALAR':1,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];dtype={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1'}[a['componentType']];v=g['bufferViews'][a['bufferView']];return np.frombuffer(buf,dtype=dtype,count=a['count']*width,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],width)
def angle(q):
 x=q/np.linalg.norm(q,axis=-1,keepdims=True);return float((2*np.degrees(np.arccos(np.clip(np.abs(np.sum(x[1:]*x[:-1],axis=-1)),0,1)))).max())
def matrix(p,q,s):
 x,y,z,w=q/np.linalg.norm(q);m=np.eye(4);m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])*s[None,:];m[:3,3]=p;return m

def run(directory,result):
 directory=pathlib.Path(directory);base,bin0=read(directory/'private/PRIVATE_shorekeeper_f16_bounds_fixed.glb');g,buf=read(result)
 for key in ['nodes','skins','meshes','materials','textures','images','samplers']:assert base[key]==g[key],key
 for key in ['accessors','bufferViews','animations']:assert base[key]==g[key][:len(base[key])],key
 assert bytes(bin0)==bytes(buf[:len(bin0)])
 psk=read_psk(directory/'source/Shorekeeper.psk');pskidx={b['name']:i for i,b in enumerate(psk['bones'])};idx={n['name']:i for i,n in enumerate(g['nodes'])};parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])};nj=len(g['skins'][0]['joints']);root=g['skins'][0]['joints'][0]
 def worlds(overrides={}):
  W={}
  for i in g['skins'][0]['joints']:
   n=g['nodes'][i];a=overrides.get((i,'translation'),n.get('translation',[0,0,0]));q=overrides.get((i,'rotation'),n.get('rotation',[0,0,0,1]));s=overrides.get((i,'scale'),n.get('scale',[1,1,1]));local=matrix(np.array(a),np.array(q),np.array(s));W[i]=W[parents[i]]@local if i in parents else local
  return W
 bind=worlds();ibm=accessor(g,buf,g['skins'][0]['inverseBindMatrices']).reshape(nj,4,4).transpose(0,2,1);bind_error=max(float(np.max(abs(bind[i]@ibm[j]-np.eye(4)))) for j,i in enumerate(g['skins'][0]['joints']));assert bind_error<1e-5
 output={'original_tables_and_binary_preserved':True,'bind_matrix_error':bind_error,'clips':[]};
 for number in (1,2,3):
  source=[]
  for kind,prefix in [('body',''),('rib','Rib_')]:
   a=read_psa(directory/f'psa/{kind}/{prefix}Stand1_Action{number:02}.psa');n=len(a['bones']);f=a['seqs'][0]['frames'];K=a['keys'].reshape(f,n);S=a['scale']['s'].reshape(f,n,3);source.append((a,K,S))
  names=[b['name'] for b in source[0][0]['bones']];assert not [psk['bones'][j]['name'] for j in set(psk['weights']['bone'].tolist()) if psk['bones'][j]['name'] not in names]
  for mode,suffix in [('composed',''),('body','_BODY'),('rib','_RIB')]:
   clip=next(c for c in g['animations'] if c['name']==f'SK_IDLE_{number:02}_ORIGINAL'+suffix);seen=set();max_error=0;maxstep=0;frames=source[0][0]['seqs'][0]['frames'];rate=source[0][0]['seqs'][0]['rate'];lookup={}
   for channel in clip['channels']:
    node=channel['target']['node'];prop=channel['target']['path'];key=(node,prop);assert key not in seen;seen.add(key);name=g['nodes'][node]['name'];j=names.index(name);owner=(1 if name.startswith('Bone_') else 0) if mode=='composed' else 0 if mode=='body' else 1;a,K,S=source[owner]
    q=K[:,j]['quat'].astype(float);q/=np.linalg.norm(q,axis=1,keepdims=True)
    for k in range(1,len(q)):
     if np.dot(q[k-1],q[k])<0:q[k]*=-1
    p=K[:,j]['pos'].astype(float)*.01
    if node!=root:q[:,:3]*=-1
    else:
     # Rx(-90deg) left-multiplied into root only.
     x,y,z,w=q.T;c=np.sqrt(.5);q=np.stack([c*x-c*w,c*y+c*z,c*z-c*y,c*w+c*x],axis=1);p=np.stack([p[:,0],p[:,2],-p[:,1]],axis=1)
    expected={'rotation':q,'translation':p,'scale':S[:,j]}[prop];samp=clip['samplers'][channel['sampler']];times=accessor(g,buf,samp['input']).ravel();values=accessor(g,buf,samp['output']);assert np.all(np.diff(times)>0) and np.isfinite(values).all()
    if len(times)==2:
     assert np.array_equal(expected,np.broadcast_to(expected[0],expected.shape));actual=np.broadcast_to(values[0],expected.shape)
    else:
     assert len(times)==frames+1 and np.max(abs(times-np.arange(frames+1)/rate))<3e-6;actual=values[:-1];assert np.array_equal(values[-1],values[-2])
    err=float(abs(actual-expected).max());max_error=max(max_error,err);assert err<2e-6,(name,prop,err)
    if prop=='rotation':assert np.max(abs(np.linalg.norm(values,axis=1)-1))<1e-6;maxstep=max(maxstep,angle(values))
    if prop=='scale':assert np.all(values>0)
    lookup[key]=(times,values)
   assert len(seen)==243*3
   # Sample real skinned edges with source timing, not a visual verdict.
   edge_max=0;edge_bad=0;head=[];feet=[]
   for fr in [0,frames//4,frames//2,3*frames//4,frames-1]:
    overrides={key:vs[0] if len(ts)==2 else vs[fr] for key,(ts,vs) in lookup.items()};W=worlds(overrides);skin=np.stack([W[i]@ibm[j] for j,i in enumerate(g['skins'][0]['joints'])]);head.append(W[idx['Bip001Head']][:3,3].tolist());feet.append([W[idx[x]][:3,3].tolist() for x in ['Bip001LFoot','Bip001RFoot']]);assert np.isfinite(skin).all()
    for mesh in g['meshes']:
     pr=mesh['primitives'][0];at=pr['attributes'];pos=accessor(g,buf,at['POSITION']);jt=accessor(g,buf,at['JOINTS_0']);wt=accessor(g,buf,at['WEIGHTS_0']);tri=accessor(g,buf,pr['indices']).reshape(-1,3);points=np.c_[pos,np.ones(len(pos))];skinned=np.einsum('vk,vkij,vj->vi',wt,skin[jt],points)[:,:3];assert np.isfinite(skinned).all();edges=np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]);rest=np.linalg.norm(pos[edges[:,0]]-pos[edges[:,1]],axis=1);deformed=np.linalg.norm(skinned[edges[:,0]]-skinned[edges[:,1]],axis=1);mask=rest>=.002;edge_max=max(edge_max,float(abs(deformed-rest)[mask].max(initial=0)));edge_bad+=int(((deformed[mask]/rest[mask]>1.5)|(deformed[mask]/rest[mask]<.67)).sum())
   output['clips'].append({'id':clip['name'],'max_sample_component_error':max_error,'channels':len(seen),'max_source_adjacent_rotation_deg':maxstep,'skin_edge_max_delta_m_5_samples':edge_max,'skin_edge_outlier_instances_5_samples':edge_bad,'head_world_samples':head,'feet_world_samples':feet})
 print(json.dumps(output,indent=2))
if __name__=='__main__':run(sys.argv[1],sys.argv[2])
