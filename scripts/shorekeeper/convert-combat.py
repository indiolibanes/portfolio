"""Convert validated private F2.1-C ActorX sources to local animation-only GLBs.
Usage: python3 scripts/shorekeeper/convert-combat.py PRIVATE_SOURCE CANONICAL_GLB PRIVATE_OUTPUT
Never upload the resulting animation libraries. Visual and temporal composition QA remains required.
"""
import copy, hashlib, json, pathlib, struct, sys
import numpy as np
from actorx import read_psk, read_psa

CANONICAL = '4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30'
def sha(data): return hashlib.sha256(data).hexdigest()
def multiply(a,b):
 ax,ay,az,aw=np.moveaxis(a,-1,0);bx,by,bz,bw=np.moveaxis(b,-1,0)
 return np.stack([aw*bx+ax*bw+ay*bz-az*by,aw*by-ax*bz+ay*bw+az*bx,aw*bz+ax*by-ay*bx+az*bw,aw*bw-ax*bx-ay*by-az*bz],axis=-1)
def normalize(q):
 q=np.array(q,dtype=float); n=np.linalg.norm(q,axis=-1,keepdims=True)
 if not np.isfinite(q).all() or np.any(n<1e-6): raise ValueError('Invalid quaternion')
 q/=n
 for i in range(1,len(q)):
  if np.dot(q[i-1],q[i])<0: q[i]*=-1
 return q

def convert(source, model, output):
 repo=pathlib.Path(__file__).resolve().parents[2]; source=pathlib.Path(source).resolve(); model=pathlib.Path(model).resolve(); output=pathlib.Path(output).resolve()
 if output==repo or repo in output.parents: raise ValueError('Private output must be outside repository')
 manifest=json.loads((source/'manifest.json').read_text()); expected={'source/Shorekeeper.psk'}|{f'{d}/{p}Attack{n:02}.psa' for n in range(1,5) for d,p in [('body',''),('rib','Rib_')]}
 files=manifest['files']
 if {e['path'] for e in files}!=expected or len(files)!=len(expected): raise ValueError('Unexpected manifest inventory')
 for e in files:
  path=(source/e['path']).resolve()
  if source not in path.parents: raise ValueError('Unsafe path')
  data=path.read_bytes()
  if len(data)!=e['bytes'] or sha(data)!=e['sha256']: raise ValueError('Manifest mismatch: '+e['path'])
 data=model.read_bytes()
 if sha(data)!=CANONICAL or manifest['model_private_glb_sha256']!=CANONICAL: raise ValueError('Unexpected canonical model')
 if data[:4]!=b'glTF': raise ValueError('Invalid canonical GLB')
 size,kind=struct.unpack_from('<I4s',data,12)
 if kind!=b'JSON': raise ValueError('Missing GLB JSON')
 gltf=json.loads(data[20:20+size]); nodes=gltf['nodes']; joints=gltf['skins'][0]['joints']; parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
 psk=read_psk(source/'source/Shorekeeper.psk'); bones=psk['bones']; pby={b['name']:b for b in bones}; target={nodes[i]['name']:i for i in joints}
 if len(bones)!=249 or len(target)!=249 or joints!=list(range(249)): raise ValueError('Unexpected canonical skeleton')
 C=np.array([-np.sqrt(.5),0,0,np.sqrt(.5)]); bind_error=0.
 for b in bones:
  i=target[b['name']]; expected_parent=bones[b['parent']]['name'] if b['parent']>=0 else None; actual_parent=nodes[parents[i]]['name'] if i in parents else None
  if expected_parent!=actual_parent: raise ValueError('PSK/GLB hierarchy mismatch: '+b['name'])
  q=np.array(b['quat'],float); p=np.array(b['pos'],float)
  if b['parent']>=0: q[:3]*=-1; p*=.01
  else: q=multiply(C,q); p=np.array([p[0],p[2],-p[1]])*.01
  nq=np.array(nodes[i].get('rotation',[0,0,0,1])); bind_error=max(bind_error,float(min(np.max(abs(q-nq)),np.max(abs(q+nq)))),float(np.max(abs(p-nodes[i].get('translation',[0,0,0])))))
 if bind_error>=1e-5: raise ValueError('PSK/GLB bind mismatch')
 output.mkdir(parents=True,exist_ok=True); report={'schema':'shorekeeper-combat-audit/1','canonical_sha256':CANONICAL,'bind_max_component_error':bind_error,'psk_bones':len(bones),'visual_qa':'PENDING','clips':[]}
 weighted={bones[int(i)]['name'] for i in set(psk['weights']['bone'].tolist())}
 for n in range(1,5):
  pair=[]
  for folder,prefix in [('body',''),('rib','Rib_')]:
   psa=read_psa(source/f'{folder}/{prefix}Attack{n:02}.psa')
   if len(psa['seqs'])!=1: raise ValueError('Expected one sequence')
   seq=psa['seqs'][0]; bn=psa['bones']; names=[b['name'] for b in bn]; frames=seq['frames']; rate=seq['rate']
   if len(names)!=243 or len(set(names))!=243 or frames<2 or not np.isfinite(rate) or rate<=0 or not weighted.issubset(names): raise ValueError('Incomplete source rig')
   for b in bn:
    if b['name'] not in pby: raise ValueError('Unknown bone')
    expected_parent=bones[pby[b['name']]['parent']]['name'] if pby[b['name']]['parent']>=0 else None; actual_parent=bn[b['parent']]['name'] if b['parent']>=0 else None
    if expected_parent!=actual_parent: raise ValueError('PSA/PSK hierarchy mismatch: '+b['name'])
   K=psa['keys'].reshape(frames,len(bn)); S=psa['scale']['s'].reshape(frames,len(bn),3) if psa['scale'] is not None else np.ones((frames,len(bn),3))
   if not np.isfinite(K['pos']).all() or not np.isfinite(S).all() or np.any(S<=0): raise ValueError('Invalid transforms')
   pair.append((names,frames,rate,K,S))
  if pair[0][0]!=pair[1][0]: raise ValueError('Body/Rib bone ordering mismatch')
  binary=bytearray(); views=[]; accessors=[]
  def acc(v,typ):
   v=np.ascontiguousarray(v,dtype='<f4')
   if not np.isfinite(v).all(): raise ValueError('Nonfinite accessor')
   while len(binary)%4: binary.append(0)
   view=len(views); views.append({'buffer':0,'byteOffset':len(binary),'byteLength':v.nbytes}); binary.extend(v.tobytes()); idx=len(accessors); accessors.append({'bufferView':view,'componentType':5126,'count':len(v),'type':typ,'min':v.reshape(len(v),-1).min(0).tolist(),'max':v.reshape(len(v),-1).max(0).tolist()}); return idx
  tracks=[[],[]]; active=[[],[]]
  for si,(names,frames,rate,K,S) in enumerate(pair):
   time=acc(np.arange(frames+1,dtype=float)/rate,'SCALAR'); const_time=acc(np.array([0,frames/rate]),'SCALAR')
   for j,name in enumerate(names):
    q=normalize(K[:,j]['quat']); p=K[:,j]['pos'].astype(float)*.01; s=S[:,j].astype(float)
    flags=[float(np.minimum(np.linalg.norm(q-q[:1],axis=1),np.linalg.norm(q+q[:1],axis=1)).max())>1e-6,float(np.linalg.norm(p-p[:1],axis=1).max())>1e-7,float(np.linalg.norm(s-s[:1],axis=1).max())>1e-6]; active[si].append(flags)
    if pby[name]['parent']>=0: q[:,:3]*=-1
    else: q=multiply(C,q); p=np.stack([p[:,0],p[:,2],-p[:,1]],axis=1)
    for path,v,typ in [('rotation',q,'VEC4'),('translation',p,'VEC3'),('scale',s,'VEC3')]:
     constant=np.array_equal(v,np.broadcast_to(v[0],v.shape)); values=np.stack([v[0],v[0]]) if constant else np.concatenate([v,v[-1:]],axis=0)
     tracks[si].append({'bone':name,'node':target[name],'path':path,'input':const_time if constant else time,'output':acc(values,typ)})
  owners=[]; composed=[]
  for j,name in enumerate(pair[0][0]):
   for k,path in enumerate(['rotation','translation','scale']):
    a,b=active[0][j][k],active[1][j][k]
    if a and b: raise ValueError(f'Ambiguous animated ownership: {name}/{path}')
    owner=1 if b or (not a and name.startswith('Bone_')) else 0
    owners.append({'bone':name,'path':path,'owner':'rib' if owner else 'body','body_animated':a,'rib_animated':b}); composed.append(tracks[owner][j*3+k])
  def animation(name,ts):
   keys=[(t['node'],t['path']) for t in ts]
   if len(keys)!=len(set(keys)): raise ValueError('Duplicate channel')
   return {'name':name,'samplers':[{'input':t['input'],'output':t['output'],'interpolation':'LINEAR'} for t in ts], 'channels':[{'sampler':i,'target':{'node':t['node'],'path':t['path']}} for i,t in enumerate(ts)]}
  ident=f'SK_ATTACK_{n:02}_ORIGINAL'; animations=[animation(ident,composed),animation(ident+'_BODY',tracks[0]),animation(ident+'_RIB',tracks[1])]
  lib={'asset':{'version':'2.0','extras':{'skCombatLibrary':'2.1-c','sourceModelSha256':CANONICAL}},'scene':0,'scenes':[{'nodes':[0]}],'nodes':copy.deepcopy(nodes[:len(joints)]),'animations':animations,'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(binary)}]}
  raw=json.dumps(lib,separators=(',',':'),allow_nan=False).encode(); raw+=b' '*(-len(raw)%4); binary+=b'\0'*(-len(binary)%4); payload=struct.pack('<4sII',b'glTF',2,28+len(raw)+len(binary))+struct.pack('<I4s',len(raw),b'JSON')+raw+struct.pack('<I4s',len(binary),b'BIN\0')+binary
  file=ident+'.animations.glb'; (output/file).write_bytes(payload); (output/f'ownership-{n:02}.json').write_text(json.dumps(owners,indent=2))
  report['clips'].append({'id':ident,'sources':[{'frames':p[1],'fps':p[2],'duration':p[1]/p[2]} for p in pair],'channels':len(composed),'shared_animated_properties':0,'root_ownership':[o for o in owners if o['bone']=='Root'],'library':file,'bytes':len(payload),'sha256':sha(payload)})
 (output/'conversion-report.json').write_text(json.dumps(report,indent=2)); print(json.dumps(report,indent=2))
if __name__=='__main__':
 if len(sys.argv)!=4: raise SystemExit(__doc__)
 convert(*sys.argv[1:])
