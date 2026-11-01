#!/usr/bin/env python3
"""Explicit production derivative; requires numpy and Pillow. Never writes the input.
Bakes unused baseline shape keys, keeps live facial POSITION channels, removes morph
NORMAL payloads, unused UV/color sets and the LSCherry helper sphere. No decimation,
rig replacement, position quantization, or change to joint weights/indices.
"""
import argparse, copy, hashlib, io, json, struct
from pathlib import Path
import numpy as np
from PIL import Image

LIVE=set(['E_Close_R','E_Close_L','M_Smile_R','M_Smile_L','B_Cheerful_R','B_Cheerful_L','B_Up_Add_R','B_Up_Add_L','E_Smile_R','E_Smile_L','E_Squint_R','E_Squint_L','P_Nose_Up','P_Nose_Down','M_meow_R','M_meow_L','M_Squint_R','M_Squint_L']+[f'Pupil_{axis}_{side}' for axis in ['Up','Down','In','Out'] for side in ['R','L']])
DT={5120:np.dtype('i1'),5121:np.dtype('u1'),5122:np.dtype('<i2'),5123:np.dtype('<u2'),5125:np.dtype('<u4'),5126:np.dtype('<f4')}
WIDTH={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def optimize(source,output,report_path):
 data=Path(source).read_bytes();magic,version,total=struct.unpack_from('<III',data);assert magic==0x46546c67 and version==2 and total==len(data)
 size,kind=struct.unpack_from('<II',data,12);g=json.loads(data[20:20+size]);assert not g.get('animations'),'Animated clips require a separate optimizer path.'
 offset=20+size;bin_size,bin_type=struct.unpack_from('<II',data,offset);raw=data[offset+8:offset+8+bin_size];assert bin_type==0x004e4942
 def acc(i):
  a=g['accessors'][i];dt=DT[a['componentType']];w=WIDTH[a['type']];n=a['count'];out=np.zeros((n,w),dtype=dt)
  if 'bufferView' in a:
   v=g['bufferViews'][a['bufferView']];start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',dt.itemsize*w);out[:]=np.ndarray((n,w),dtype=dt,buffer=raw,offset=start,strides=(stride,dt.itemsize))
  if 'sparse' in a:
   sp=a['sparse'];ind=sp['indices'];v=g['bufferViews'][ind['bufferView']];ids=np.frombuffer(raw,DT[ind['componentType']],sp['count'],v.get('byteOffset',0)+ind.get('byteOffset',0));sv=sp['values'];v=g['bufferViews'][sv['bufferView']];values=np.frombuffer(raw,dt,sp['count']*w,v.get('byteOffset',0)+sv.get('byteOffset',0)).reshape(-1,w);out[ids]=values
  return out
 out=copy.deepcopy(g);out['accessors']=[];out['bufferViews']=[];out['meshes']=[];out['images']=[];out['textures']=[];binary=bytearray();view_cache={};accessor_cache={}
 def view(b):
  b=bytes(b);h=hashlib.sha256(b).digest()
  if h in view_cache:return view_cache[h]
  while len(binary)%4:binary.append(0)
  i=len(out['bufferViews']);out['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(b)});binary.extend(b);view_cache[h]=i;return i
 def write_acc(values,template,sparse=False):
  values=np.ascontiguousarray(values,dtype=DT[template['componentType']]);a={k:template[k] for k in ['componentType','type','normalized'] if k in template};a['count']=len(values)
  if template['componentType']==5126 and template['type']=='VEC3':a['min']=values.min(axis=0).tolist();a['max']=values.max(axis=0).tolist()
  ids=np.flatnonzero(np.any(values!=0,axis=1)) if sparse else None
  if sparse and len(ids)<len(values)*.8:
   if len(ids):
    it=np.dtype('<u2') if len(values)<=65535 else np.dtype('<u4');a['sparse']={'count':len(ids),'indices':{'bufferView':view(ids.astype(it).tobytes()),'componentType':5123 if it.itemsize==2 else 5125},'values':{'bufferView':view(values[ids].tobytes())}}
  else:a['bufferView']=view(values.tobytes())
  key=json.dumps(a,sort_keys=True)
  if key not in accessor_cache:accessor_cache[key]=len(out['accessors']);out['accessors'].append(a)
  return accessor_cache[key]
 copied={}
 def copy_acc(i):
  if i not in copied:copied[i]=write_acc(acc(i),g['accessors'][i])
  return copied[i]
 mesh_map={};stats=[];baseline_error=0
 for mi,m in enumerate(g['meshes']):
  if m.get('name')=='Sphere':mesh_map[mi]=[];continue
  names=m.get('extras',{}).get('targetNames',[]);weights=m.get('weights',[0]*len(names));mapped=[]
  for pi,p in enumerate(m['primitives']):
   targets=p.get('targets',[]);kept=[];arrays={}
   for ti,t in enumerate(targets):
    if names[ti] in LIVE and 'POSITION' in t:
     a=acc(t['POSITION']);peak=float(np.max(np.linalg.norm(a.astype(float),axis=1)))
     if peak>=1e-7:kept.append(ti);arrays[ti]=a
   base=acc(p['attributes']['POSITION']).astype(float);original=base.copy()
   for ti,t in enumerate(targets):
    if weights[ti] and 'POSITION' in t:
     delta=acc(t['POSITION']).astype(float)*weights[ti];original+=delta
     if ti not in kept:base+=delta
   baked=base.astype('<f4');reconstructed=baked.astype(float)
   for ti in kept:reconstructed+=arrays[ti].astype(float)*weights[ti]
   baseline_error=max(baseline_error,float(np.abs(reconstructed-original).max()))
   primitive={k:copy.deepcopy(v) for k,v in p.items() if k not in ['attributes','indices','targets']};attrs={}
   for name,ai in p['attributes'].items():
    if name.startswith('TEXCOORD_') and name!='TEXCOORD_0' or name.startswith('COLOR_') and name!='COLOR_0':continue
    if name=='POSITION':attrs[name]=write_acc(baked,g['accessors'][ai])
    elif name=='NORMAL':
     normal=acc(ai).astype(float)
     for ti,t in enumerate(targets):
      if weights[ti] and 'NORMAL' in t:normal+=acc(t['NORMAL']).astype(float)*weights[ti]
     attrs[name]=write_acc(normal.astype('<f4'),g['accessors'][ai])
    else:attrs[name]=copy_acc(ai)
   primitive['attributes']=attrs
   if 'indices' in p:primitive['indices']=copy_acc(p['indices'])
   if kept:primitive['targets']=[{'POSITION':write_acc(arrays[ti],g['accessors'][targets[ti]['POSITION']],True)} for ti in kept]
   new={'name':m.get('name','Hsin')+'_'+str(pi),'primitives':[primitive]}
   if kept:new.update(weights=[weights[i] for i in kept],extras={'targetNames':[names[i] for i in kept]})
   mapped.append(len(out['meshes']));out['meshes'].append(new);stats.append({'mesh':new['name'],'vertices':len(base),'sourceMorphs':len(targets),'liveMorphs':len(kept),'keptNames':[names[i] for i in kept]})
  mesh_map[mi]=mapped
 for node in out['nodes'][:]:
  if 'mesh' not in node:continue
  old=node['mesh'];mapped=mesh_map[old]
  if not mapped:node.pop('mesh');continue
  if node.get('weights'):assert node['weights']==g['meshes'][old].get('weights'), 'Per-node weight override unsupported.'
  node.pop('weights',None);node['mesh']=mapped[0]
  for index in mapped[1:]:
   child={'name':node.get('name','Hsin')+'_part_'+str(index),'mesh':index}
   if 'skin' in node:child['skin']=node['skin']
   node.setdefault('children',[]).append(len(out['nodes']));out['nodes'].append(child)
 for skin in out.get('skins',[]):
  if 'inverseBindMatrices' in skin:skin['inverseBindMatrices']=copy_acc(skin['inverseBindMatrices'])
 texture_map={};image_stats=[]
 def copy_texture(ti):
  if ti in texture_map:return texture_map[ti]
  t=g['textures'][ti];im=g['images'][t['source']];v=g['bufferViews'][im['bufferView']];imdata=raw[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];pic=Image.open(io.BytesIO(imdata));before=pic.size;normal='NORMAL' in im.get('name','');face='Face_D' in im.get('name','');limit=2048 if face else 1024
  if max(pic.size)>limit:pic.thumbnail((limit,limit),Image.Resampling.LANCZOS)
  buf=io.BytesIO();pic.save(buf,format='WEBP',lossless=normal,quality=95 if face or 'Eye_D' in im.get('name','') else 90,method=6)
  index=len(out['images']);out['images'].append({'name':im.get('name','Hsin')+'_V2','mimeType':'image/webp','bufferView':view(buf.getvalue())});new={k:t[k] for k in ['sampler','name'] if k in t};new['extensions']={'EXT_texture_webp':{'source':index}};texture_map[ti]=len(out['textures']);out['textures'].append(new);image_stats.append({'name':im.get('name'),'sourceSize':before,'size':pic.size,'sourceBytes':len(imdata),'bytes':len(buf.getvalue()),'lossless':normal});return texture_map[ti]
 def remap_textures(obj):
  if isinstance(obj,dict):
   for k,v in obj.items():
    if (k.endswith('Texture') or k=='occlusionTexture') and isinstance(v,dict) and 'index' in v:v['index']=copy_texture(v['index'])
    elif k!='extras':remap_textures(v)
  elif isinstance(obj,list):
   for x in obj:remap_textures(x)
 remap_textures(out['materials'])
 for key in ['extensionsUsed','extensionsRequired']:
  out[key]=sorted(set(out.get(key,[])+['EXT_texture_webp']))
 out['asset'].setdefault('extras',{})['productionDerivative']={'version':'2.0','sourceSha256':hashlib.sha256(data).hexdigest(),'baselineBaked':True,'preservedLiveChannels':sorted(LIVE),'morphNormalsRemoved':True,'helperSphereRemoved':True,'vertexDecimation':False}
 out['buffers']=[{'byteLength':len(binary)}]
 js=json.dumps(out,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*((-len(js))%4);binary.extend(b'\0'*((-len(binary))%4));result=struct.pack('<III',0x46546c67,2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
 Path(output).parent.mkdir(parents=True,exist_ok=True);Path(output).write_bytes(result)
 # Conservative decoded morph texture estimate: vec4 FLOAT32 per target/vertex, excluding driver-specific padding/mipmaps.
 old_slots=sum(g['accessors'][p['attributes']['POSITION']]['count']*len(p.get('targets',[]))*2 for m in g['meshes'] for p in m['primitives'])
 new_slots=sum(x['vertices']*x['liveMorphs'] for x in stats)
 report={'sourceSha256':hashlib.sha256(data).hexdigest(),'outputSha256':hashlib.sha256(result).hexdigest(),'sourceBytes':len(data),'outputBytes':len(result),'baselineMaxPositionError':baseline_error,'estimatedMorphBytesBefore':old_slots*16,'estimatedMorphBytesAfter':new_slots*16,'meshes':stats,'textures':image_stats,'joints':[len(s['joints']) for s in out['skins']],'limitations':['No triangle decimation or KTX2/Draco/Meshopt; no new runtime decoders.','Active morph normals are frozen at the exported baseline; base normals and normal maps remain.','Normal maps are WebP lossless; color maps are lossy; Eye is reduced to 1024px, Face stays at 2048px.','Unused shader UV/color sets and the LSCherry sphere helper are excluded. Original metadata and credits are retained.']}
 Path(report_path).parent.mkdir(parents=True,exist_ok=True);Path(report_path).write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');print(json.dumps({k:report[k] for k in ['sourceBytes','outputBytes','baselineMaxPositionError','estimatedMorphBytesBefore','estimatedMorphBytesAfter']}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('output');p.add_argument('--report',required=True);a=p.parse_args();optimize(a.source,a.output,a.report)
