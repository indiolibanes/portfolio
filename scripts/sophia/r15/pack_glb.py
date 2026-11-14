"""Lossless reachability packing: no geometry, image or animation re-encoding."""
import pathlib,json,struct,hashlib,copy
from glb import load,accessor
R=pathlib.Path('local-private/sophia-r15');path=R/'sophia-lab-r15.glb';b,g,raw=load(path);g=copy.deepcopy(g);used=set()
for m in g['meshes']:
 for p in m['primitives']:
  used.update(p['attributes'].values());used.add(p['indices'])
  for t in p.get('targets',[]):used.update(t.values())
for skin in g.get('skins',[]):used.add(skin['inverseBindMatrices'])
for clip in g['animations']:
 for s in clip['samplers']:used.update([s['input'],s['output']])
accmap={old:new for new,old in enumerate(sorted(used))};views=set()
for old in used:
 a=g['accessors'][old]
 if 'bufferView'in a:views.add(a['bufferView'])
 if 'sparse'in a:views.update([a['sparse']['indices']['bufferView'],a['sparse']['values']['bufferView']])
for im in g['images']:views.add(im['bufferView'])
vm={old:new for new,old in enumerate(sorted(views))};out=bytearray();newviews=[];proof=[]
for old in sorted(views):
 v=copy.deepcopy(g['bufferViews'][old]);data=raw[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];out.extend(b'\0'*((-len(out))%4));v['byteOffset']=len(out);v['buffer']=0;out.extend(data);newviews.append(v);proof.append({'oldView':old,'newView':vm[old],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
accessors=[]
for old in sorted(used):
 a=copy.deepcopy(g['accessors'][old])
 if 'bufferView'in a:a['bufferView']=vm[a['bufferView']]
 if 'sparse'in a:
  for key in ['indices','values']:a['sparse'][key]['bufferView']=vm[a['sparse'][key]['bufferView']]
 accessors.append(a)
for m in g['meshes']:
 for p in m['primitives']:
  p['attributes']={k:accmap[a]for k,a in p['attributes'].items()};p['indices']=accmap[p['indices']]
  for t in p.get('targets',[]):
   for key in t:t[key]=accmap[t[key]]
for skin in g.get('skins',[]):skin['inverseBindMatrices']=accmap[skin['inverseBindMatrices']]
for clip in g['animations']:
 for s in clip['samplers']:
  for key in ['input','output']:s[key]=accmap[s[key]]
for im in g['images']:im['bufferView']=vm[im['bufferView']]
oldAccessors=len(g['accessors']);oldViews=len(g['bufferViews']);g['accessors']=accessors;g['bufferViews']=newviews;out.extend(b'\0'*((-len(out))%4));g['buffers'][0]['byteLength']=len(out);g['extras']['sophiaR15']['losslessReachabilityPacking']=True
# Independently decode ALL retained accessors before and after layout changes.
_,original,originalRaw=load(path)
import numpy as np
for old,new in accmap.items():assert np.array_equal(accessor(original,originalRaw,old),accessor(g,out,new)),old
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);payload=struct.pack('<4sII',b'glTF',2,28+len(js)+len(out))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(out),0x004e4942)+out
(R/'sophia-lab-r15-unpacked.glb').write_bytes(b);path.write_bytes(payload)
report={'method':'Exact bufferView byte copy, remove unreachable accessors/views; no image re-encode or geometry precision change','unpackedSha256':hashlib.sha256(b).hexdigest(),'packedSha256':hashlib.sha256(payload).hexdigest(),'unpackedBytes':len(b),'packedBytes':len(payload),'savedBytes':len(b)-len(payload),'retainedAccessorsDecodedEqual':len(used),'removedAccessors':oldAccessors-len(accessors),'removedViews':oldViews-len(newviews),'copiedViews':len(proof),'allViewPayloadsCopiedExact':True};(R/'packing-view-proof.json').write_text(json.dumps(proof,indent=2)+'\n');pathlib.Path('docs/characters/sophia-r15/lossless-packing.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
