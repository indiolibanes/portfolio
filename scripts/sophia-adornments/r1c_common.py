"""Read-only glTF sampling shared by R1.C baseline and candidate audits."""
import pathlib,math
import numpy as np
from glb_audit import load,accessor
from inventory import worlds,position_world
SOURCE_SHA='3b0e7db84809d6e4fe6eaa2bc6299874c202c529adcbd369cf83c6a29d3c3a2a'
PILOT_SHA='fd278e201f1854dd1a2dae6f24064a0c2f9013262007cece70ff478c28ff1fce'
class Model:
 def __init__(self,path):
  self.path=str(path);self.bytes,self.g,self.raw=load(path);self.cache={};self.jointnames=[self.g['nodes'][i]['name']for i in self.g['skins'][0]['joints']];self.is_pilot=len(self.g['meshes'][0]['primitives'])==276
 def arr(self,i):
  if i not in self.cache:self.cache[i]=accessor(self.g,self.raw,i)
  return self.cache[i]
 def prim(self,original):
  if not self.is_pilot:return self.g['meshes'][0]['primitives'][original]
  if 9<=original<=11:return self.g['meshes'][3]['primitives'][original-9]
  return self.g['meshes'][0]['primitives'][original if original<9 else original-3]
 def node(self,original):return len(self.g['nodes'])-1 if self.is_pilot and 9<=original<=11 else 93
 def faces(self,original):return self.arr(self.prim(original)['indices']).astype(int).reshape(-1,3)
 def pose(self,clip,t):
  ov={};morph={};clip=next((a for a in self.g['animations']if a['name']==clip),None)
  if clip:
   for ch in clip['channels']:
    sp=clip['samplers'][ch['sampler']];ts=self.arr(sp['input']).ravel();vs=self.arr(sp['output']);target=ch['target'];ni=target['node'];kind=target['path'];assert sp.get('interpolation','LINEAR')in ['LINEAR','STEP']
    a=max(0,min(len(ts)-1,int(np.searchsorted(ts,t,side='right')-1)));b=min(a+1,len(ts)-1);u=0 if a==b or sp.get('interpolation')=='STEP'else float(np.clip((t-ts[a])/(ts[b]-ts[a]),0,1))
    if kind=='weights':vs=vs.reshape(len(ts),-1)
    va=vs[a].astype(float);vb=vs[b].astype(float)
    if kind=='rotation':
     dot=float(va@vb)
     if dot<0:vb=-vb;dot=-dot
     if dot<.9995:
      ang=math.acos(min(1,dot));v=(math.sin((1-u)*ang)*va+math.sin(u*ang)*vb)/math.sin(ang)
     else:v=(1-u)*va+u*vb
     v/=np.linalg.norm(v)
    else:v=(1-u)*va+u*vb
    if kind=='weights':morph[ni]=v
    else:ov.setdefault(ni,{})[kind]=v.tolist()
  return worlds(self.g,ov)[0],morph
 def positions(self,original,W,morph):
  ni=self.node(original);p=self.prim(original);return position_world(self.g,self.raw,ni,p,W,morph.get(ni))
 def bindpos(self,name):
  skin=self.g['skins'][0];slot=self.jointnames.index(name);return np.linalg.inv(self.arr(skin['inverseBindMatrices'])[slot].reshape(4,4,order='F'))[:3,3]
def smooth(x):x=np.clip(x,0,1);return x*x*(3-2*x)
def baseline_poses():
 return [('REST',0)]+[(name,d*i/11)for name,d in [('Idle',4),('Write',3.200000047683716),('Point',2.4000000953674316),('Wave',2.4000000953674316),('Walk',1)]for i in range(12)]
def dense_poses():
 return [('Write',float(t))for t in np.linspace(0,3.2,65)]+[('Wave',float(t))for t in np.linspace(.9,1.5,13)]+[('Walk',float(t))for t in np.linspace(.15,.4,13)]+[('Point',float(t))for t in np.linspace(1.2,1.4,9)]
