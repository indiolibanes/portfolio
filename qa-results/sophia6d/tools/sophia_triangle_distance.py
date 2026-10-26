"""Narrow-phase Euclidean triangle pair distances; BVH overlap is broad phase only."""
import numpy as np

def point_segment(p,a,b):
 e=b-a;t=np.clip(np.sum((p-a)*e,axis=1)/np.maximum(np.sum(e*e,axis=1),1e-30),0,1);return np.sum((p-a-e*t[:,None])**2,axis=1)
def point_triangle(p,t):
 a,b,c=t[:,0],t[:,1],t[:,2];u=b-a;v=c-a;n=np.cross(u,v);nn=np.sum(n*n,axis=1);q=p-n*(np.sum((p-a)*n,axis=1)/np.maximum(nn,1e-30))[:,None];dp=q-a;uu=np.sum(u*u,axis=1);uv=np.sum(u*v,axis=1);vv=np.sum(v*v,axis=1);du=np.sum(dp*u,axis=1);dv=np.sum(dp*v,axis=1);den=uu*vv-uv*uv;bs=(du*vv-dv*uv)/np.maximum(den,1e-30);bt=(dv*uu-du*uv)/np.maximum(den,1e-30);inside=(bs>=0)&(bt>=0)&(bs+bt<=1)&(nn>1e-25);plane=np.sum((p-q)**2,axis=1);edge=np.minimum.reduce([point_segment(p,a,b),point_segment(p,b,c),point_segment(p,c,a)]);return np.where(inside,plane,edge)
def segment_segment(a,b,c,d):
 u=b-a;v=d-c;w=a-c;A=np.sum(u*u,axis=1);B=np.sum(u*v,axis=1);C=np.sum(v*v,axis=1);D=np.sum(u*w,axis=1);E=np.sum(v*w,axis=1);den=A*C-B*B;s=(B*E-C*D)/np.maximum(den,1e-30);t=(A*E-B*D)/np.maximum(den,1e-30);valid=(s>=0)&(s<=1)&(t>=0)&(t<=1)&(den>1e-25);interior=np.sum((w+u*s[:,None]-v*t[:,None])**2,axis=1);ends=np.minimum.reduce([point_segment(a,c,d),point_segment(b,c,d),point_segment(c,a,b),point_segment(d,a,b)]);return np.where(valid,np.minimum(ends,interior),ends)
def segment_hits_triangle(a,b,tri):
 d=b-a;e1=tri[:,1]-tri[:,0];e2=tri[:,2]-tri[:,0];h=np.cross(d,e2);det=np.sum(e1*h,axis=1);inv=np.zeros_like(det);valid=np.abs(det)>1e-18;inv[valid]=1/det[valid];s=a-tri[:,0];u=inv*np.sum(s*h,axis=1);q=np.cross(s,e1);v=inv*np.sum(d*q,axis=1);t=inv*np.sum(e2*q,axis=1);return valid&(u>=-1e-10)&(v>=-1e-10)&(u+v<=1+1e-10)&(t>=-1e-10)&(t<=1+1e-10)
def triangle_pair_distance(A,B):
 ds=np.full(len(A),np.inf);hits=np.zeros(len(A),bool)
 for k in range(3):
  ds=np.minimum(ds,point_triangle(A[:,k],B));ds=np.minimum(ds,point_triangle(B[:,k],A));hits|=segment_hits_triangle(A[:,k],A[:,(k+1)%3],B)|segment_hits_triangle(B[:,k],B[:,(k+1)%3],A)
  for l in range(3):ds=np.minimum(ds,segment_segment(A[:,k],A[:,(k+1)%3],B[:,l],B[:,(l+1)%3]))
 ds[hits]=0;return np.sqrt(np.maximum(ds,0))
def broad_narrow(source_v,source_f,target_v,target_f,target_tree,clearance=0):
 from mathutils.bvhtree import BVHTree
 tree=BVHTree.FromPolygons(source_v,source_f,all_triangles=True,epsilon=.000001);pairs=tree.overlap(target_tree)
 if clearance>0:
  # Overlap epsilon is not a reliable Euclidean distance query. A triangle's
  # centroid bounding sphere guarantees inclusion of every face within clearance.
  from mathutils import Vector
  pairs=set(pairs);tri=source_v[source_f];centers=tri.mean(1);radii=np.linalg.norm(tri-centers[:,None,:],axis=2).max(1)
  for ti,(center,radius)in enumerate(zip(centers,radii)):
   for co,no,fi,dist in target_tree.find_nearest_range(Vector(center),float(radius+clearance+.0000001)):pairs.add((ti,fi))
  pairs=list(pairs)
 if not pairs:return {'crossings':0,'too_close':0,'minimum_candidate_distance':None,'worst':None,'broad_pairs':0,'violating_source_triangles':[]}
 pairs=np.array(pairs,int);d=triangle_pair_distance(source_v[source_f[pairs[:,0]]],target_v[target_f[pairs[:,1]]]);ix=int(np.argmin(d));return {'crossings':int((d<1e-8).sum()),'too_close':int((d<max(clearance-1e-8,0)).sum()),'minimum_candidate_distance':float(d[ix]),'worst':{'source_triangle':int(pairs[ix,0]),'target_triangle':int(pairs[ix,1]),'distance_mm':float(d[ix]*1000)},'broad_pairs':len(pairs),'violating_source_triangles':np.unique(pairs[d<max(clearance-1e-8,1e-8),0]).tolist()}
