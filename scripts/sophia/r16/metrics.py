import sys
from rig import *
CLIPS=['Nadar_R6','Socos_R6','Chutar_R6','Correr_R6','Danca_R6','Andar_R6','Roundhouse_R6','Mortal_Tras_R6','Passinho_R6','Moonwalk_R6','Sophia_Dance_R4','Sophia_Pirouette_R4','Sophia_Run_R4','Foguete_Esquerda_R6','Sophia_RocketFlight_R4']
def run(path,clips=CLIPS,n=40,verbose=True):
    r=Rig(path); c=r.prim(3); rest=c['pos']; f=c['f']; e=edges_of(f); L0=np.linalg.norm(rest[e[:,0]]-rest[e[:,1]],axis=1); ok=L0>1e-6; e=e[ok]; L0=L0[ok]
    res={}
    for cl in clips:
        if cl not in r.clips: continue
        ch,dur=r.clips[cl]; mx=0; p99=0; at=0
        for t in np.linspace(0,dur,n,endpoint=False):
            JM=r.jointmats(r.pose(cl,t)); P=skin(rest,c['jt'],c['w'],JM); q=np.linalg.norm(P[e[:,0]]-P[e[:,1]],axis=1)/L0
            if q.max()>mx: mx=q.max(); at=t
            p99=max(p99,np.percentile(q,99))
        res[cl]=(mx,p99,at)
        if verbose: print(f'{cl:24s} max {mx:5.2f}x @{at:4.2f}s   p99 {p99:4.2f}x')
    return res
if __name__=='__main__': run(sys.argv[1])
