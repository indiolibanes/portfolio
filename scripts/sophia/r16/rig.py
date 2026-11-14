import sys, json
import numpy as np
from glbdoc import GLB

def quat_mat(q):
    x,y,z,w=q
    return np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
def slerp(a,b,t):
    d=np.dot(a,b)
    if d<0: b=-b; d=-d
    if d>0.9995:
        r=a+t*(b-a); return r/np.linalg.norm(r)
    th=np.arccos(d); return (np.sin((1-t)*th)*a+np.sin(t*th)*b)/np.sin(th)

class Rig:
    def __init__(self,path):
        self.g=GLB(path); j=self.g.j; self.j=j
        self.N=len(j['nodes'])
        self.par=[-1]*self.N
        for i,n in enumerate(j['nodes']):
            for c in n.get('children',[]): self.par[c]=i
        self.rest=[(np.array(n.get('translation',[0,0,0]),float),np.array(n.get('rotation',[0,0,0,1]),float),np.array(n.get('scale',[1,1,1]),float)) for n in j['nodes']]
        self.names=[n.get('name') for n in j['nodes']]
        sk=j['skins'][0]; self.joints=sk['joints']
        self.ibm=self.g.acc(sk['inverseBindMatrices']).reshape(-1,4,4)  # glTF column-major -> reshape then transpose
        self.ibm=np.array([m.reshape(4,4,order='F') if False else m for m in self.ibm])
        raw=self.g.acc(sk['inverseBindMatrices']).reshape(-1,16)
        self.ibm=np.array([r.reshape(4,4,order='F') for r in raw])
        self.jname=[self.names[i] for i in self.joints]
        self.jix={n:k for k,n in enumerate(self.jname)}
        self.clips={}
        for a in j.get('animations',[]):
            ch=[]; dur=0
            for c in a['channels']:
                s=a['samplers'][c['sampler']]; t=self.g.acc(s['input']).ravel(); v=self.g.acc(s['output'])
                ch.append((c['target']['node'],c['target']['path'],t,v,s.get('interpolation','LINEAR'))); dur=max(dur,t[-1])
            self.clips[a['name']]=(ch,dur)
        # order for world compute
        self.order=[]; seen=set()
        def vis(i):
            if i in seen: return
            if self.par[i]>=0: vis(self.par[i])
            seen.add(i); self.order.append(i)
        for i in range(self.N): vis(i)
    def pose(self,clip=None,t=0.0):
        T=[r[0].copy() for r in self.rest]; R=[r[1].copy() for r in self.rest]; S=[r[2].copy() for r in self.rest]
        if clip:
            ch,dur=self.clips[clip]; t=t%dur if dur>0 else 0
            for node,path,ts,vs,interp in ch:
                if len(ts)==1: val=vs[0]
                else:
                    k=int(np.searchsorted(ts,t,'right')-1); k=max(0,min(k,len(ts)-2)); u=(t-ts[k])/(ts[k+1]-ts[k]) if ts[k+1]>ts[k] else 0; u=min(max(u,0),1)
                    if path=='rotation': val=slerp(vs[k],vs[k+1],u)
                    else: val=vs[k]*(1-u)+vs[k+1]*u
                if path=='translation': T[node]=np.array(val,float)
                elif path=='rotation': R[node]=np.array(val,float)
                elif path=='scale': S[node]=np.array(val,float)
        W=[None]*self.N
        for i in self.order:
            M=np.eye(4); M[:3,:3]=quat_mat(R[i])*S[i]; M[:3,3]=T[i]
            W[i]=W[self.par[i]]@M if self.par[i]>=0 else M
        return np.array(W)
    def jointmats(self,W):
        return np.array([W[j]@self.ibm[k] for k,j in enumerate(self.joints)])
    def prim(self,mesh,pi=0):
        p=self.j['meshes'][mesh]['primitives'][pi]; a=p['attributes']
        d={'pos':self.g.acc(a['POSITION']).astype(float),'nrm':self.g.acc(a['NORMAL']).astype(float),
           'uv':self.g.acc(a['TEXCOORD_0']),'jt':self.g.acc(a['JOINTS_0']).astype(int),'w':self.g.acc(a['WEIGHTS_0']).astype(float),
           'f':self.g.acc(p['indices']).astype(int).reshape(-1,3)}
        return d
def skin(pos,jt,w,JM):
    out=np.zeros_like(pos)
    ph=np.c_[pos,np.ones(len(pos))]
    for k in range(4):
        m=JM[jt[:,k]]            # n,4,4
        out+=w[:,k:k+1]*np.einsum('nij,nj->ni',m,ph)[:,:3]
    return out
def edges_of(f):
    e=np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]); e=np.sort(e,axis=1); return np.unique(e,axis=0)
