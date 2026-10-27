"""Minimal glTF 2 pose evaluation for repeatable motion measurements (numpy only).
Supports linear/step translation, scale, quaternion SLERP and morph-weight channels.
Does not change the source file.
"""
from pathlib import Path
import json,struct,hashlib,numpy as np

def quat_matrix(q):
 x,y,z,w=np.asarray(q)/max(np.linalg.norm(q),1e-15)
 return np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
def slerp(a,b,t):
 a=np.asarray(a,float);b=np.asarray(b,float);a/=np.linalg.norm(a);b/=np.linalg.norm(b);dot=np.dot(a,b)
 if dot<0:b=-b;dot=-dot
 if dot>.9995:q=(1-t)*a+t*b;return q/np.linalg.norm(q)
 angle=np.arccos(np.clip(dot,-1,1));return (np.sin((1-t)*angle)*a+np.sin(t*angle)*b)/np.sin(angle)
class MotionModel:
 def __init__(self,path):
  self.path=Path(path);data=self.path.read_bytes();self.sha256=hashlib.sha256(data).hexdigest();n=struct.unpack_from('<I',data,12)[0];self.j=json.loads(data[20:20+n]);self.bin=data[28+n:];self.cache={};self.nodes=self.j['nodes'];self.primitives=[]
  self.joint_names=[self.nodes[i].get('name','')for i in self.j['skins'][0]['joints']]
  for ni,node in enumerate(self.nodes):
   if 'mesh'not in node:continue
   for pi,p in enumerate(self.j['meshes'][node['mesh']]['primitives']):
    a=p['attributes'];d={'node':ni,'mesh':node['mesh'],'primitive':pi,'material':self.j['materials'][p['material']]['name'],'extras':p.get('extras',{}),'v':self.acc(a['POSITION']).astype(float),'f':self.acc(p['indices']).reshape(-1,3).astype(np.int32),'p':p}
    if 'skin'in node:d['jo']=self.acc(a['JOINTS_0']).astype(np.int32);d['we']=self.acc(a['WEIGHTS_0']).astype(float);d['skin']=node['skin']
    d['targets']=[self.acc(t['POSITION']).astype(float)if'POSITION'in t else np.zeros_like(d['v'])for t in p.get('targets',[])];self.primitives.append(d)
  self.animations=[]
  for anim in self.j.get('animations',[]):
   channels=[]
   for c in anim['channels']:
    sampler=anim['samplers'][c['sampler']];times=self.acc(sampler['input']).ravel();values=self.acc(sampler['output']).astype(float);kind=c['target']['path'];interp=sampler.get('interpolation','LINEAR')
    if kind=='weights':values=values.reshape(len(times),-1)
    if interp not in ['LINEAR','STEP']:raise ValueError('Unsupported interpolation '+interp)
    channels.append((c['target']['node'],kind,times,values,interp))
   self.animations.append({'name':anim.get('name'),'channels':channels,'duration':max(float(c[2][-1])for c in channels)})
  self.inverse=[self.acc(s['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)for s in self.j['skins']]
 def acc(self,i):
  if i in self.cache:return self.cache[i]
  a=self.j['accessors'][i]
  if 'bufferView'not in a:
   assert 'sparse'not in a, 'Sparse accessor needs explicit support'
   v=np.zeros((a['count'],{'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]),float);self.cache[i]=v;return v
  bv=self.j['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5122:'<i2',5121:'u1',5120:'i1'}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];item=np.dtype(dt).itemsize;v=np.ndarray((a['count'],n),dt,self.bin,bv.get('byteOffset',0)+a.get('byteOffset',0),strides=(bv.get('byteStride',item*n),item)).copy()
  if a.get('normalized'):v=np.maximum(v.astype(float)/np.iinfo(v.dtype).max,-1)
  self.cache[i]=v;return v
 def worlds(self,anim=None,time=0):
  tr=[np.array(n.get('translation',[0,0,0]),float)for n in self.nodes];rt=[np.array(n.get('rotation',[0,0,0,1]),float)for n in self.nodes];sc=[np.array(n.get('scale',[1,1,1]),float)for n in self.nodes];weights={}
  if anim is not None:
   for node,path,tt,vv,interp in self.animations[anim]['channels']:
    i=int(np.clip(np.searchsorted(tt,time,side='right')-1,0,len(tt)-1));k=min(i+1,len(tt)-1);t=0 if k==i or interp=='STEP'else float(np.clip((time-tt[i])/(tt[k]-tt[i]),0,1));v=slerp(vv[i],vv[k],t)if path=='rotation'else vv[i]*(1-t)+vv[k]*t
    if path=='rotation':rt[node]=v
    elif path=='translation':tr[node]=v
    elif path=='scale':sc[node]=v
    elif path=='weights':weights[node]=v
  world={}
  def visit(i,parent):
   n=self.nodes[i]
   if 'matrix'in n:m=np.array(n['matrix']).reshape(4,4).T
   else:m=np.eye(4);m[:3,:3]=quat_matrix(rt[i])@np.diag(sc[i]);m[:3,3]=tr[i]
   world[i]=parent@m
   for k in n.get('children',[]):visit(k,world[i])
  for i in self.j['scenes'][self.j.get('scene',0)]['nodes']:visit(i,np.eye(4))
  return world,weights
 def pose(self,anim=None,time=0,selection=None):
  world,morph=self.worlds(anim,time);skin=[np.array([world[k]@self.inverse[si][q]for q,k in enumerate(s['joints'])])for si,s in enumerate(self.j['skins'])];result={}
  for di in (range(len(self.primitives))if selection is None else selection):
   d=self.primitives[di];v=d['v'];n=self.nodes[d['node']];mesh=self.j['meshes'][d['mesh']];weights=morph.get(d['node'],n.get('weights',mesh.get('weights',[0]*len(d['targets']))))
   if np.any(weights):v=v+sum(float(w)*delta for w,delta in zip(weights,d['targets']))
   if 'skin'in d:
    m=np.sum(skin[d['skin']][d['jo']]*d['we'][:,:,None,None],axis=1);v=np.einsum('nij,nj->ni',m,np.c_[v,np.ones(len(v))])[:,:3]
   else:v=v@world[d['node']][:3,:3].T+world[d['node']][:3,3]
   result[di]=v
  return result
