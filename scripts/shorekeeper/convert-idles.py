"""Private ActorX idle recovery: append animations, never rebuild the model.
Usage: python3 scripts/shorekeeper/convert-idles.py PRIVATE_INPUT_DIRECTORY PRIVATE_OUTPUT_DIRECTORY
Requires numpy. Output is refused inside this repository.
"""
import json,struct,hashlib,sys,pathlib,copy,collections
import numpy as np
from actorx import read_psk,read_psa

def digest(data):return hashlib.sha256(data).hexdigest()
def mul(a,b):
 ax,ay,az,aw=np.moveaxis(a,-1,0);bx,by,bz,bw=np.moveaxis(b,-1,0)
 return np.stack([aw*bx+ax*bw+ay*bz-az*by,aw*by-ax*bz+ay*bw+az*bx,aw*bz+ax*by-ay*bx+az*bw,aw*bw-ax*bx-ay*by-az*bz],axis=-1)
def normalized(q):
 q=np.array(q,dtype=float);n=np.linalg.norm(q,axis=-1,keepdims=True)
 if not np.isfinite(q).all() or np.any(n<1e-6):raise ValueError('invalid quaternion')
 q/=n
 for i in range(1,len(q)):
  if np.dot(q[i-1],q[i])<0:q[i]*=-1
 return q

def run(source,output):
 root=pathlib.Path(__file__).resolve().parents[2];source=pathlib.Path(source).resolve();out=pathlib.Path(output).resolve()
 if out==root or root in out.parents:raise ValueError('Private outputs must stay outside the repository')
 out.mkdir(parents=True,exist_ok=True);manifest=json.loads((source/'manifest.json').read_text())
 for e in manifest['entries']:
  path=(source/e['path']).resolve()
  if source not in path.parents:raise ValueError('unsafe input path')
  data=path.read_bytes()
  if len(data)!=e['bytes'] or digest(data)!=e['sha256']:raise ValueError('input manifest mismatch: '+e['path'])
 src=source/'private/PRIVATE_shorekeeper_f16_bounds_fixed.glb';data=src.read_bytes();length,kind=struct.unpack_from('<I4s',data,12)
 if data[:4]!=b'glTF' or kind!=b'JSON':raise ValueError('bad GLB')
 gltf=json.loads(data[20:20+length]);base=copy.deepcopy(gltf);bin_len,kind=struct.unpack_from('<I4s',data,20+length);assert kind==b'BIN\0';binary=bytearray(data[28+length:28+length+bin_len]);original_bin=bytes(binary)
 psk=read_psk(source/'source/Shorekeeper.psk');pb=psk['bones'];name_to_psk={b['name']:i for i,b in enumerate(pb)};nodes=gltf['nodes'];joints=gltf['skins'][0]['joints'];target={nodes[i]['name']:i for i in joints};parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
 for b in pb:
  assert b['name'] in target
  expected=pb[b['parent']]['name'] if b['parent']>=0 else None;actual=nodes[parents[target[b['name']]]]['name'] if target[b['name']] in parents else None
  assert expected==actual,(b['name'],expected,actual)
 # Validate the known PSK bind conversion against the unchanged GLB node transforms.
 C=np.array([-np.sqrt(.5),0,0,np.sqrt(.5)]);bind_error=0.
 for b in pb:
  q=np.array(b['quat'],float);p=np.array(b['pos'],float)
  if b['parent']>=0:q[:3]*=-1;p*=.01
  else:q=mul(C,q);p=np.array([p[0],p[2],-p[1]])*.01
  nq=np.array(nodes[target[b['name']]].get('rotation',[0,0,0,1]));bind_error=max(bind_error,float(min(np.max(abs(q-nq)),np.max(abs(q+nq)))),float(np.max(abs(p-nodes[target[b['name']]].get('translation',[0,0,0])))))
 assert bind_error<1e-5
 def acc(a,typ):
  a=np.ascontiguousarray(a,dtype='<f4');assert np.isfinite(a).all()
  while len(binary)%4:binary.append(0)
  view=len(gltf['bufferViews']);gltf['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':a.nbytes});binary.extend(a.tobytes());i=len(gltf['accessors']);gltf['accessors'].append({'bufferView':view,'componentType':5126,'count':len(a),'type':typ,'min':a.reshape(len(a),-1).min(0).tolist(),'max':a.reshape(len(a),-1).max(0).tolist()});return i
 report={'source_sha256':digest(data),'bind_max_component_error':bind_error,'psk_bones':len(pb),'weighted_bones':len(set(psk['weights']['bone'].tolist())),'clips':[],'visualQA':'PENDING','video_correspondence':'NOT_VERIFIED'}
 for number in (1,2,3):
  pair=[]
  for folder,prefix in [('body',''),('rib','Rib_')]:
   psa=read_psa(source/f'psa/{folder}/{prefix}Stand1_Action{number:02}.psa');assert len(psa['seqs'])==1
   seq=psa['seqs'][0];bn=psa['bones'];names=[b['name'] for b in bn];frames=seq['frames'];rate=seq['rate'];K=psa['keys'].reshape(frames,len(bn));S=psa['scale']['s'].reshape(frames,len(bn),3) if psa['scale'] is not None else np.ones((frames,len(bn),3))
   assert np.isfinite(K['pos']).all() and np.isfinite(S).all() and np.all(S>0)
   for b in bn:
    assert b['name'] in name_to_psk
    p=pb[name_to_psk[b['name']]];pn=pb[p['parent']]['name'] if p['parent']>=0 else None;sn=bn[b['parent']]['name'] if b['parent']>=0 else None;assert pn==sn
   pair.append((psa,seq,names,K,S))
  assert pair[0][2]==pair[1][2] and pair[0][1]['frames']==pair[1][1]['frames'] and pair[0][1]['rate']==pair[1][1]['rate']
  names=pair[0][2];frames=pair[0][1]['frames'];rate=pair[0][1]['rate'];duration=frames/rate;time=np.arange(frames+1,dtype=float)/rate;tin=acc(time,'SCALAR');constant_time=acc(np.array([0,duration]),'SCALAR');source_tracks=[[],[]];motion=[[],[]];raw_quats=[]
  for source_index,(psa,seq,names,K,S) in enumerate(pair):
   raw_quats.append(K['quat'].astype(float));source_motion=[]
   for j,name in enumerate(names):
    b=pb[name_to_psk[name]];q=normalized(K[:,j]['quat']);p=K[:,j]['pos'].astype(float)*.01;s=S[:,j].astype(float)
    active_q=float(np.minimum(np.linalg.norm(q-q[:1],axis=1),np.linalg.norm(q+q[:1],axis=1)).max())>1e-6;active_p=float(np.linalg.norm(p-p[:1],axis=1).max())>1e-7;active_s=float(np.linalg.norm(s-s[:1],axis=1).max())>1e-6;source_motion.append([active_q,active_p,active_s])
    if b['parent']>=0:q[:,:3]*=-1
    else:q=mul(C,q);p=np.stack([p[:,0],p[:,2],-p[:,1]],axis=1)
    for prop,values,typ in [('rotation',q,'VEC4'),('translation',p,'VEC3'),('scale',s,'VEC3')]:
     # Only exact constants are collapsed. Every moving source sample is preserved.
     const=np.array_equal(values,np.broadcast_to(values[0],values.shape));v=np.stack([values[0],values[0]]) if const else np.concatenate([values,values[-1:]],axis=0)
     source_tracks[source_index].append({'node':target[name],'bone':name,'path':prop,'input':constant_time if const else tin,'output':acc(v,typ)})
   motion[source_index]=source_motion
  ownership=[]
  for j,name in enumerate(names):
   active_body=any(motion[0][j]);active_rib=any(motion[1][j]);
   if active_body and active_rib:raise ValueError('ambiguous animated ownership: '+name)
   # Empirically validated here, not assumed for arbitrary Rib files.
   if active_rib and not name.startswith('Bone_'):raise ValueError('Rib moves a primary bone; manual review required')
   if active_body and name.startswith('Bone_'):raise ValueError('Body moves a secondary bone; manual review required')
   owner='rib' if name.startswith('Bone_') else 'body'
   ownership.append({'bone':name,'owner':owner,'body_active':motion[0][j],'rib_active':motion[1][j],'channels':['rotation','translation','scale']})
  composed=[]
  for j,row in enumerate(ownership):composed.extend(source_tracks[1 if row['owner']=='rib' else 0][j*3:j*3+3])
  def animation(name,tracks,mode):
   keys=[(t['node'],t['path']) for t in tracks];assert len(keys)==len(set(keys))
   return {'name':name,'samplers':[{'input':t['input'],'output':t['output'],'interpolation':'LINEAR'} for t in tracks],'channels':[{'sampler':i,'target':{'node':t['node'],'path':t['path']}} for i,t in enumerate(tracks)],'extras':{'skIdleSchema':'2.0-a','mode':mode,'frames':frames,'fps':rate,'duration':duration,'lastSourceSample':(frames-1)/rate,'endPolicy':'hold final source sample one sample interval; LoopOnce','visualQA':'PENDING','timing':'source; no resampling or reduction of moving keys'}}
  identifier=f'SK_IDLE_{number:02}_ORIGINAL';gltf['animations'].extend([animation(identifier,composed,'composed'),animation(identifier+'_BODY',source_tracks[0],'body'),animation(identifier+'_RIB',source_tracks[1],'rib-raw')]);(out/f'ownership-{number:02}.json').write_text(json.dumps(ownership,indent=2))
  report['clips'].append({'id':identifier,'frames':frames,'fps':rate,'duration':duration,'last_sample':(frames-1)/rate,'body_bones':sum(x['owner']=='body' for x in ownership),'rib_bones':sum(x['owner']=='rib' for x in ownership),'channels':len(composed),'duplicate_channels':0,'body_active_bones':sum(any(x) for x in motion[0]),'rib_active_bones':sum(any(x) for x in motion[1])})
 # All original tables, including original animations, are unchanged prefixes.
 for key in ['nodes','meshes','skins','materials','textures','images','samplers']:assert gltf[key]==base[key]
 for key in ['animations','accessors','bufferViews']:assert gltf[key][:len(base[key])]==base[key]
 assert bytes(binary[:len(original_bin)])==original_bin
 gltf['buffers'][0]['byteLength']=len(binary);raw=json.dumps(gltf,separators=(',',':'),allow_nan=False).encode();raw+=b' '*(-len(raw)%4);binary+=b'\0'*(-len(binary)%4);result=struct.pack('<4sII',b'glTF',2,28+len(raw)+len(binary))+struct.pack('<I4s',len(raw),b'JSON')+raw+struct.pack('<I4s',len(binary),b'BIN\0')+binary
 # Standalone private animation libraries can be loaded alongside the unchanged F1.6 GLB.
 for number in (1,2,3):
  chosen=copy.deepcopy([a for a in gltf['animations'] if a['name'].startswith(f'SK_IDLE_{number:02}_ORIGINAL')]);ais=sorted({s['input'] for a in chosen for s in a['samplers']}|{s['output'] for a in chosen for s in a['samplers']});vis=sorted({gltf['accessors'][i]['bufferView'] for i in ais});amap={old:i for i,old in enumerate(ais)};vmap={old:i for i,old in enumerate(vis)};bb=bytearray();views=[]
  for i in vis:
   v=gltf['bufferViews'][i];o=v.get('byteOffset',0)
   while len(bb)%4:bb.append(0)
   views.append({'buffer':0,'byteOffset':len(bb),'byteLength':v['byteLength']});bb.extend(binary[o:o+v['byteLength']])
  accs=copy.deepcopy([gltf['accessors'][i] for i in ais])
  for a in accs:a['bufferView']=vmap[a['bufferView']]
  for a in chosen:
   for sm in a['samplers']:sm['input']=amap[sm['input']];sm['output']=amap[sm['output']]
  assert joints==list(range(len(joints)))
  lib={'asset':{'version':'2.0','extras':{'skIdleLibrary':'2.0-a','sourceModelSha256':digest(data)}},'scene':0,'scenes':[{'nodes':[0]}],'nodes':copy.deepcopy(nodes[:len(joints)]),'animations':chosen,'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':len(bb)}]}
  js=json.dumps(lib,separators=(',',':'),allow_nan=False).encode();js+=b' '*(-len(js)%4);bb+=b'\0'*(-len(bb)%4);payload=struct.pack('<4sII',b'glTF',2,28+len(js)+len(bb))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(bb),b'BIN\0')+bb;name=f'SK_IDLE_{number:02}_ORIGINAL.animations.glb';(out/name).write_bytes(payload);report['clips'][number-1]['library']={'file':name,'bytes':len(payload),'sha256':digest(payload)}
 output_file=out/'PRIVATE_shorekeeper_f20a_original_idles.glb';output_file.write_bytes(result);report.update({'output_sha256':digest(result),'output_bytes':len(result),'original_binary_prefix_preserved':True,'original_tables_preserved':True});(out/'conversion-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit(__doc__)
 run(sys.argv[1],sys.argv[2])
