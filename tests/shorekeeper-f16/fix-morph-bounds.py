#!/usr/bin/env python3
"""Add exact bounds to sparse FLOAT VEC3 morph POSITION accessors. Never overwrite input."""
import argparse,json,struct,pathlib,hashlib
import numpy as np
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('destination');a=p.parse_args()
src=pathlib.Path(a.source);dst=pathlib.Path(a.destination)
if src.resolve()==dst.resolve() or dst.exists(): raise SystemExit('Destination must be new and different from source')
b=src.read_bytes();magic,version,total=struct.unpack_from('<4sII',b);assert magic==b'glTF' and version==2 and total==len(b)
size,kind=struct.unpack_from('<I4s',b,12);assert kind==b'JSON'; g=json.loads(b[20:20+size]); remaining=b[20+size:];bs,bkind=struct.unpack_from('<I4s',remaining);assert bkind==b'BIN\0';data=memoryview(remaining)[8:8+bs]
indices={5121:('<u1',1),5123:('<u2',2),5125:('<u4',4)}
targets={t['POSITION'] for m in g['meshes'] for prim in m['primitives'] for t in prim.get('targets',[]) if 'POSITION' in t}; changed=[]
for i in sorted(targets):
 acc=g['accessors'][i]
 if 'sparse' not in acc or ('min' in acc and 'max' in acc):continue
 if acc['componentType']!=5126 or acc['type']!='VEC3' or 'bufferView' in acc:raise ValueError(f'unsupported accessor {i}')
 s=acc['sparse'];iv=g['bufferViews'][s['indices']['bufferView']];vv=g['bufferViews'][s['values']['bufferView']]
 if iv.get('buffer',0)!=0 or vv.get('buffer',0)!=0 or iv.get('byteStride') or vv.get('byteStride'):raise ValueError('unsupported buffer layout')
 dtype,width=indices[s['indices']['componentType']];off=iv.get('byteOffset',0)+s['indices'].get('byteOffset',0);ids=np.frombuffer(data,dtype=dtype,count=s['count'],offset=off)
 if len(ids)!=len(set(ids.tolist())) or (len(ids) and ids.max()>=acc['count']) or (len(ids)>1 and np.any(ids[1:]<=ids[:-1])):raise ValueError('invalid sparse indices')
 off=vv.get('byteOffset',0)+s['values'].get('byteOffset',0);vals=np.frombuffer(data,dtype='<f4',count=s['count']*3,offset=off).reshape(-1,3)
 if not np.isfinite(vals).all():raise ValueError('non-finite values')
 full=np.zeros((acc['count'],3),dtype=np.float32);full[ids]=vals;acc['min']=full.min(axis=0).astype(float).tolist();acc['max']=full.max(axis=0).astype(float).tolist();changed.append(i)
raw=json.dumps(g,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode();raw+=b' '*((-len(raw))%4);out=struct.pack('<4sII',b'glTF',2,20+len(raw)+len(remaining))+struct.pack('<I4s',len(raw),b'JSON')+raw+remaining;dst.write_bytes(out)
print(json.dumps({'changed':len(changed),'accessors':changed,'source_sha256':hashlib.sha256(b).hexdigest(),'output_sha256':hashlib.sha256(out).hexdigest(),'binary_chunk_identical':out[20+len(raw):]==remaining},indent=2))
