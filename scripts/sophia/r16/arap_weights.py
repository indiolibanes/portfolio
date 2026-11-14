"""R1.6 — localized ARAP-style skin-weight re-solve for Sophia_LabCoat (mesh 3). Geometry/topology/UVs/normals untouched;
only JOINTS_0/WEIGHTS_0 of the coat primitive are rewritten (max 4 influences, normalised).

Method: LBS is linear in the weights, so for a set of poses (worst poses per clip + active set) each edge of the region
is asked to keep its blended rigid shape: sum_b(w_ib q_ib - w_jb q_jb) = A_ij (p_i - p_j), A_ij = blend of the joint
linear parts. Solved by sparse least squares (soft partition of unity + regulariser to the R1.5 weights), IRLS edge
weights for stretched edges, damped (tau) and accepted only if dense per-clip stretch does not regress.

usage: python3 arap_weights.py SRC.glb OUT.glb [HOPS=2 THR=1.6 OUTER=8 PER=3 LREG=0.05]"""
import sys, json, numpy as np
from scipy.sparse import coo_matrix, csr_matrix, vstack, identity, diags
from scipy.sparse.linalg import lsqr
from rig import *
from metrics import CLIPS as CLIPS_ALL
CR=['Nadar_R6','Socos_R6','Danca_R6','Mortal_Tras_R6','Sophia_Dance_R4','Sophia_Pirouette_R4','Correr_R6','Chutar_R6','Roundhouse_R6','Passinho_R6','Foguete_Esquerda_R6','Sophia_RocketFlight_R4','Sophia_Run_R4','Andar_R6']
def build(src,out,THR=1.5,HOPS=3,NP=36,PER=3,ALPHA=4.0,LREG=0.05,LSUM=50.0,OUTER=3,verbose=True):
    r=Rig(src); g=r.g; j=g.j; prim=j['meshes'][3]['primitives'][0]; at=prim['attributes']
    c=r.prim(3); P=c['pos']; n=len(P); nb=len(r.jname)
    W0=np.zeros((n,nb))
    for k in range(4): np.add.at(W0,(np.arange(n),c['jt'][:,k]),c['w'][:,k])
    key=np.round(P/1e-5).astype(np.int64); _,node=np.unique(key,axis=0,return_inverse=True); node=node.ravel(); nn=node.max()+1
    npos=np.zeros((nn,3)); np.add.at(npos,node,P); cnt=np.bincount(node,minlength=nn); npos/=cnt[:,None]
    ne=edges_of(node[c['f']]); ne=ne[ne[:,0]!=ne[:,1]]
    Wn0=np.zeros((nn,nb)); np.add.at(Wn0,node,W0); Wn0/=cnt[:,None]
    # poses: collect, pick the NP with highest R1.5 energy
    cand=[]
    for cl in CR:
        if cl not in r.clips: continue
        dur=r.clips[cl][1]
        for t in np.linspace(0,dur,30,endpoint=False): cand.append((cl,t))
    cand+= [('Nadar_R6',1.5),('Socos_R6',.75),('Nadar_R6',1.3),('Nadar_R6',1.7),('Socos_R6',.6),('Socos_R6',.9)]
    L0=np.linalg.norm(npos[ne[:,0]]-npos[ne[:,1]],axis=1); ok=L0>1e-6; ne=ne[ok]; L0=L0[ok]
    def topk(Wd):
        o=np.argsort(-Wd,axis=1)[:,:4]; w=np.take_along_axis(Wd,o,axis=1); w/=np.maximum(w.sum(1,keepdims=True),1e-9); return o,w
    def skinN(Wd,JM):
        jt,w=topk(Wd); return skin(npos,jt,w,JM)
    Wd=Wn0.copy(); jt,w=topk(Wd); Wc=np.zeros_like(Wd); np.put_along_axis(Wc,jt,w,axis=1); Wd=Wc
    JMs={}
    def JM(cl,t):
        k=(cl,round(t,4))
        if k not in JMs: JMs[k]=r.jointmats(r.pose(cl,t))
        return JMs[k]
    def evalW(Wd,poses):
        bad=np.zeros(nn); mx=0; en=0
        for cl,t in poses:
            d=skinN(Wd,JM(cl,t)); q=np.linalg.norm(d[ne[:,0]]-d[ne[:,1]],axis=1)/L0
            mx=max(mx,q.max()); en+=np.sum(np.maximum(q-1.2,0)**2)
            np.maximum.at(bad,ne[:,0],q); np.maximum.at(bad,ne[:,1],q)
        return bad,mx,en
    scores=[]
    for cl,t in cand:
        d=skinN(Wd,JM(cl,t)); q=np.linalg.norm(d[ne[:,0]]-d[ne[:,1]],axis=1)/L0; scores.append(np.sum(np.maximum(q-1.2,0)**2))
    sel=[]; per={}
    for i in np.argsort(scores)[::-1]:
        cl=cand[i][0]
        if per.get(cl,0)<PER: per[cl]=per.get(cl,0)+1; sel.append(cand[i])
    for cl,t in [('Nadar_R6',1.5),('Socos_R6',.75)]:
        if (cl,t) not in sel: sel.append((cl,t))
    sel+= [('Andar_R6',0.3),('Moonwalk_R6',1.5)]
    bad,mx,en=evalW(Wd,sel)
    if verbose: print('start max %.2f energy %.1f'%(mx,en))
    region=bad>THR
    Adj=coo_matrix((np.ones(len(ne)*2),(np.r_[ne[:,0],ne[:,1]],np.r_[ne[:,1],ne[:,0]])),shape=(nn,nn)).tocsr()
    for _ in range(HOPS): region=region|((Adj@region.astype(float))>0)
    U=np.where(region)[0]; F=np.where(~region)[0]
    bones=np.where((Wd[U]>1e-4).any(0))[0]
    # add chain neighbours
    for nm in ['Spine','Spine1','Spine2','RightShoulder','LeftShoulder','RightArm','LeftArm','RightForeArm','LeftForeArm']:
        bones=np.union1d(bones,[r.jix['mixamorig:'+nm]])
    nbu=len(bones); idxU=-np.ones(nn,int); idxU[U]=np.arange(len(U))
    if verbose: print('region nodes',len(U),'bones',nbu,[r.jname[b].replace('mixamorig:','') for b in bones])
    # edges touching region
    ei=ne[(region[ne[:,0]])|(region[ne[:,1]])]; eL=L0[(region[ne[:,0]])|(region[ne[:,1]])]
    def build_system(Wd):
        rows=[];cols=[];vals=[];rhs=[]; row0=0
        for cl,t in sel:
            M=JM(cl,t)   # nb,4,4
            # per-node transformed positions per bone (only for needed bones): q_ib = M_b @ [p,1]
            for dim in range(3):
                pass
            # edge target: A_ij = blended linear part with current weights
            a,b=ei[:,0],ei[:,1]
            Wa=Wd[a]; Wb=Wd[b]; Wm=0.5*(Wa+Wb)
            A=np.einsum('eb,bij->eij',Wm,M[:,:3,:3])
            tgt=np.einsum('eij,ej->ei',A,npos[a]-npos[b])   # e,3
            # residual: sum_b [W_a,b q_a,b − W_b,b q_b,b] − tgt  (unknown for region nodes; fixed ones go to rhs)
            Qa=np.einsum('bij,ej->ebi',M[:,:3,:3][bones],npos[a])+M[bones][:,:3,3][None]   # e,nbu,3
            Qb=np.einsum('bij,ej->ebi',M[:,:3,:3][bones],npos[b])+M[bones][:,:3,3][None]
            for side,(nd,Q,sg) in enumerate(((a,Qa,1.0),(b,Qb,-1.0))):
                inU=region[nd]
                # unknown part
                ee=np.where(inU)[0]
                for dim in range(3):
                    r_=row0+dim*len(ei)+ee
                    rows.append(np.repeat(r_,nbu)); cols.append((idxU[nd[ee]][:,None]*nbu+np.arange(nbu)[None]).ravel()); vals.append((sg*Q[ee][:,:,dim]).ravel())
                # fixed part -> rhs
                ff=np.where(~inU)[0]
                if len(ff):
                    fixedv=np.einsum('eb,ebi->ei',Wd[nd[ff]][:,bones],Q[ff])*sg   # contributes sg*Σ w q
                    for dim in range(3):
                        pass
            row0+=3*len(ei)
        return rows,cols,vals
    # simpler explicit assembly (clearer): build full sparse matrix per pose
    def solve(Wd):
        blocks=[];rhsl=[]
        nunk=len(U)*nbu
        for cl,t in sel:
            M=JM(cl,t); a,b=ei[:,0],ei[:,1]
            dq=skinN(Wd,M); qq=np.linalg.norm(dq[a]-dq[b],axis=1)/eL
            ew=np.clip(1.0+ALPHA*np.maximum(qq-1.25,0),1,25.0)
            Wm=0.5*(Wd[a]+Wd[b]); A=np.einsum('eb,bij->eij',Wm,M[:,:3,:3]); tgt=np.einsum('eij,ej->ei',A,npos[a]-npos[b])
            R=M[bones][:,:3,:3]; T=M[bones][:,:3,3]
            Qa=np.einsum('bij,ej->ebi',R,npos[a])+T[None]; Qb=np.einsum('bij,ej->ebi',R,npos[b])+T[None]
            # constant part from fixed nodes (using full current weights over ALL bones, not only 'bones')
            def fixedpart(nd):
                jt_,w_=topk(Wd[nd]); return skin(npos[nd],jt_,w_,M)
            for dim in range(3):
                rr=[];cc=[];vv=[]; rhs=tgt[:,dim].copy()
                for nd,Q,sg in ((a,Qa,1.0),(b,Qb,-1.0)):
                    inU=region[nd]; ee=np.where(inU)[0]
                    rr.append(np.repeat(ee,nbu)); cc.append((idxU[nd[ee]][:,None]*nbu+np.arange(nbu)[None]).ravel()); vv.append((sg*Q[ee][:,:,dim]).ravel())
                    ff=np.where(~inU)[0]
                    if len(ff): rhs[ff]-=sg*fixedpart(nd[ff])[:,dim]
                blocks.append(diags(ew)@coo_matrix((np.concatenate(vv),(np.concatenate(rr),np.concatenate(cc))),shape=(len(ei),nunk)).tocsr()); rhsl.append(rhs*ew)
        S=vstack(blocks).tocsr(); y=np.concatenate(rhsl)
        # partition of unity (soft) + regularisation to R1.5 weights
        rowsum=coo_matrix((np.ones(nunk),(np.repeat(np.arange(len(U)),nbu),np.arange(nunk))),shape=(len(U),nunk)).tocsr()*LSUM
        Wref=Wn0[U][:,bones].ravel()
        reg=identity(nunk,format='csr')*(LREG*np.sqrt(len(sel)*3))
        Afull=vstack([S,rowsum,reg]).tocsr(); yfull=np.concatenate([y,np.full(len(U),LSUM),LREG*np.sqrt(len(sel)*3)*Wref])
        sol=lsqr(Afull,yfull,atol=1e-8,btol=1e-8,iter_lim=800)[0]
        Wnew=Wd.copy(); Wnew[U]=0; Wnew[np.ix_(U,bones)]=np.clip(sol.reshape(len(U),nbu),0,None)
        s=Wnew[U].sum(1,keepdims=True); Wnew[U]/=np.maximum(s,1e-6)
        o,w=topk(Wnew); Wc=np.zeros_like(Wnew); np.put_along_axis(Wc,o,w,axis=1)
        return Wc
    # dense evaluation set
    dense=[]
    for cl in CLIPS_ALL:
        if cl in r.clips:
            for t in np.linspace(0,r.clips[cl][1],24,endpoint=False): dense.append((cl,t))
    def dense_eval(Wd):
        per={}; en=0; bad=np.zeros(nn); pe={}
        for cl,t in dense:
            d=skinN(Wd,JM(cl,t)); q=np.linalg.norm(d[ne[:,0]]-d[ne[:,1]],axis=1)/L0
            per[cl]=max(per.get(cl,0),q.max()); e=np.sum(np.maximum(q-1.2,0)**2); en+=e; pe[(cl,t)]=e
        return per,en,pe
    base_per,base_en,_=dense_eval(Wd)
    def excess(per): return sum(max(0.0,per[c]-max(1.25*base_per[c],2.5)) for c in per)
    if verbose: print('dense base energy %.1f'%base_en)
    bestW=Wd; bestscore=(excess(base_per),base_en)
    for it in range(OUTER):
        Wls=solve(Wd); acc=False
        for tau in (1.0,0.6,0.35,0.2):
            Wt=Wd+tau*(Wls-Wd); o,w=topk(Wt); Wt=np.zeros_like(Wt); np.put_along_axis(Wt,o,w,axis=1)
            per2,en2,pe2=dense_eval(Wt); sc=(excess(per2),en2)
            if verbose: print('outer',it,'tau',tau,'dense energy %.1f excess %.2f'%(en2,sc[0]))
            if sc<bestscore:
                Wd=Wt; bestW=Wt; bestscore=sc; acc=True
                for k in sorted(pe2,key=lambda k:-pe2[k])[:8]:
                    if k not in sel: sel.append(k)
                break
        if not acc: break
    bestE=bestscore[1]
    Wd=bestW
    # write back to vertices
    Wv=Wd[node]; o,w=topk(Wv)
    at['JOINTS_0']=g.add_acc(o.astype(np.uint16),'VEC4',5123,34962); at['WEIGHTS_0']=g.add_acc(w.astype(np.float32),'VEC4',5126,34962)
    j.setdefault('extras',{})['sophiaR16']={'status':'PRIVATE_CANDIDATE_AXILLA_SLEEVE','method':'ARAP-style localized skin-weight re-solve (topology preserved)','params':dict(THR=THR,HOPS=HOPS,NP=NP,LREG=LREG,LSUM=LSUM,OUTER=OUTER,region_nodes=int(len(U)))}
    g.compact(); g.save(out)
    return dict(start_energy=float(en),end_energy=float(bestE),region=int(len(U)))
if __name__=='__main__':
    kw={}
    for a in sys.argv[3:]:
        k,v=a.split('='); kw[k]=float(v) if '.' in v else int(v)
    print(build(sys.argv[1],sys.argv[2],**kw))
