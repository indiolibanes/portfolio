"""Behavior-preserving metadata and unused-joint cleanup. Does not fix geometry or certify collisions."""
import sys,os,shutil,json,numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'patches6d'))
from glbio3 import GLB
from pathlib import Path
src,dst=sys.argv[1:3];g=GLB(src);changes=[];seen=set()
for mesh in g.j['meshes']:
 for p in mesh['primitives']:
  a=p['attributes']
  if 'JOINTS_0'in a and (a['JOINTS_0'],a['WEIGHTS_0'])not in seen:
   seen.add((a['JOINTS_0'],a['WEIGHTS_0']));j=g.read(a['JOINTS_0']);w=g.read(a['WEIGHTS_0']);mask=(w==0)&(j!=0)
   if mask.any():
    j[mask]=0;g.write_raw(a['JOINTS_0'],j);changes.append({'accessor':a['JOINTS_0'],'unused_joint_slots_zeroed':int(mask.sum())})
for i,a in enumerate(g.j['accessors']):
 if 'min'in a or 'max'in a:
  v=g.read(i);a['min']=v.min(0).tolist();a['max']=v.max(0).tolist()
g.save(dst)
Path(dst+'.cleanup.json').write_text(json.dumps({'changes':changes,'geometry_modified':False},indent=2))
