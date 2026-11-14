"""Static storage accounting; estimates do not measure GPU memory or draw calls."""
import pathlib,json,io
from PIL import Image
from glb import load
_,g,r=load('local-private/sophia-r15/sophia-lab-r15.glb');images=[]
for im in g['images']:
 v=g['bufferViews'][im['bufferView']];b=r[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
 with Image.open(io.BytesIO(b)) as p:w,h=p.size
 images.append({'width':w,'height':h,'encodedBytes':len(b),'rgba8BaseEstimateBytes':w*h*4})
geometry=set();morphs=set();draws=hidden=0
for n in g['nodes']:
 if 'mesh' not in n:continue
 for p in g['meshes'][n['mesh']]['primitives']:
  draws+=1;hidden+=bool(n.get('extras',{}).get('hidden'));geometry.update(p['attributes'].values());geometry.add(p['indices'])
  for t in p.get('targets',[]):morphs.update(t.values())
def views(ids):
 v=set()
 for ai in ids:
  a=g['accessors'][ai]
  if 'bufferView' in a:v.add(a['bufferView'])
  if 'sparse'in a:v.update([a['sparse']['indices']['bufferView'],a['sparse']['values']['bufferView']])
 return sum(g['bufferViews'][i]['byteLength']for i in v)
d={'kind':'STATIC_ESTIMATES_NOT_GPU_MEASUREMENTS','geometryReferencedBufferViewBytes':views(geometry),'morphReferencedBufferViewBytes':views(morphs),'images':images,'rgba8AllImagesBaseEstimateBytes':sum(i['rgba8BaseEstimateBytes']for i in images),'allPrimitivesPotentialDraws':draws,'defaultHiddenPropPrimitives':hidden,'defaultUnhiddenPotentialDrawsPerActor':draws-hidden,'limits':['BufferView sums are stored payloads, not full CPU/GPU heap; shared views deduplicated within each category only','RGBA8 estimate assumes all images decoded once, excludes mipmaps, compression, driver copies and framebuffers','Potential primitive count excludes shadow pass, culling, material variants and implementation costs; actual draw calls/FPS require WebGL']}
pathlib.Path('docs/characters/sophia-r15/storage-estimate.json').write_text(json.dumps(d,indent=2)+'\n');print(json.dumps(d))
