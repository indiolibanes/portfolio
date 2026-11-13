"""Paired real-GLB collision audit, frozen source-index regions, Blender BVH.
No contact/identity/artistic approval follows from a triangle count.
"""
import sys,pathlib,argparse,csv,json,hashlib
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from r1c_common import Model,baseline_poses,dense_poses
ap=argparse.ArgumentParser();ap.add_argument('baseline');ap.add_argument('candidate');ap.add_argument('--out',required=True);ap.add_argument('--quick',action='store_true');args=ap.parse_args(sys.argv[sys.argv.index('--')+1:]);out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True)
before=Model(args.baseline);after=Model(args.candidate);ref=before
def part(pi,terms=None,y=None,near=None):
 p=ref.prim(pi);f=ref.faces(pi)
 if terms:
  ix=ref.arr(p['attributes']['JOINTS_0']).astype(int);w=ref.arr(p['attributes']['WEIGHTS_0']);mask=np.asarray([any(t in n for t in terms)for n in ref.jointnames]);s=(mask[ix]*w).sum(1);f=f[s[f].mean(1)>.5]
 v=ref.arr(p['attributes']['POSITION']);cent=v[f].mean(1)
 if y:f=f[(cent[:,1]>=y[0])&(cent[:,1]<=y[1])];cent=v[f].mean(1)
 if near is not None:q,r=near;f=f[np.linalg.norm(cent-q,axis=1)<r]
 return (pi,f)
regions={
 'hands':[part(i,['hand_','fingers_','thumb_'])for i in [0,261,257,258,259,260]],
 'wrists_forearms':[part(i,['forearm_'])for i in [0,261,257,258,259,260]],
 'sleeves':[part(4,['upper_arm_','forearm_'])],
 'cuffs':[part(4,['forearm_'],y=(.24,.33))],
 'coat':[part(i)for i in [4,5,127,130]],
 'collar':[part(i)for i in range(121,127)],
 'chin':[part(274,y=(.535,.625))],
 'cranium':[part(274)],'tail':[part(1)],'body':[part(i)for i in [0,261]],
 'ear_ribbons':[part(i,['earrib'])for i in range(279)if i not in [9,10,11]],'mane':[part(278)],
 'lapels':[part(i)for i in [127,130]],
}
for side in ['L','R']:
 q=ref.bindpos('upper_arm_'+side);regions['shoulder_'+side]=[part(4,near=(q,.060))];regions['proximal_torso_'+side]=[part(i,near=(q,.085))for i in [0,261]]
pairnames=[('hands','book'),('hands','pen'),('cuffs','book'),('pen','book'),('wrists_forearms','sleeves'),('sleeves','cranium'),('chin','collar'),('lapels','chin'),('tail','body'),('tail','coat'),('ear_ribbons','mane'),('book','chin'),('pen','chin'),('shoulder_L','proximal_torso_L'),('shoulder_R','proximal_torso_R'),('shoulder_L','cranium'),('shoulder_R','cranium')]
def geometry(model,W,morph):
 cache={};geo={}
 for name,parts in regions.items():
  vv=[];ff=[];offset=0
  for pi,f in parts:
   if pi not in cache:cache[pi]=model.positions(pi,W,morph)
   v=cache[pi];vv.append(v);ff.append(f+offset);offset+=len(v)
  v=np.vstack(vv);f=np.vstack(ff);geo[name]=(v,f)
 for name,mi,ni in [('book',1,94),('pen',2,95)]:
  vv=[];ff=[];offset=0
  for p in model.g['meshes'][mi]['primitives']:
   v=model.arr(p['attributes']['POSITION']);v=(np.c_[v,np.ones(len(v))]@W[ni].T)[:,:3];f=model.arr(p['indices']).astype(int).reshape(-1,3);vv.append(v);ff.append(f+offset);offset+=len(v)
  geo[name]=(np.vstack(vv),np.vstack(ff))
 cache[12]=model.positions(12,W,morph)
 return geo,cache
poses=[('baseline',c,t)for c,t in baseline_poses()]
if args.quick:poses=[('quick',c,t)for c,t in [('REST',0),('Write',0),('Write',1.6),('Write',3.2),('Point',0),('Wave',0),('Wave',1.2),('Walk',.272727273),('Walk',.83),('Idle',2.66667)]]
else:poses += [('dense',c,t)for c,t in dense_poses()]
rows=[];prox=[];deform=[];hotspots=[];regionmeta={name:{'triangles':sum(len(f)for _,f in parts),'sourcePrimitiveFaces':[{'sourcePrimitive':p,'faceIndexArraySha256':hashlib.sha256(f.tobytes()).hexdigest(),'triangles':len(f)}for p,f in parts]}for name,parts in regions.items()}
for kind,clip,t in poses:
 posed=[]
 for label,model in [('before',before),('after',after)]:
  W,morph=model.pose(clip,t);geo,cache=geometry(model,W,morph);trees={name:BVHTree.FromPolygons([Vector(x)for x in v],[tuple(x)for x in f],all_triangles=True,epsilon=0)if len(f)else None for name,(v,f)in geo.items()};posed.append((geo,cache))
  for a,b in pairnames:
   valid=bool(trees[a]and trees[b]);cross=trees[a].overlap(trees[b])if valid else []
   classification='GRIP_VOLUME_REQUIRES_VISUAL_REVIEW'if a=='hands'and b=='pen'else 'ANATOMICAL_INSERTION_OR_PENETRATION_UNRESOLVED'if a=='tail'and b=='body'else 'PROXIMAL_TORSO_ONLY_FULL_ARM_COVERAGE_PARTIAL'if a.startswith('shoulder')and b.startswith('proximal')else'VISIBLE_OR_OCCLUDED_CROSSING_NOT_APPROVED'
   if valid and not cross:classification='NO_SAMPLED_SURFACE_CROSSING_NOT_VISUAL_PASS'
   rows.append({'sampleSet':kind,'clip':clip,'seconds':round(t,9),'model':label,'pair':a+'__'+b,'trianglePairs':len(cross)if valid else None,'status':'MEASURED'if valid else'REGION_UNRESOLVED','classification':classification})
   if args.quick and cross and clip in ['Write','Point'] and t<1e-6 and (a,b)in [('wrists_forearms','sleeves'),('cuffs','book'),('chin','collar')]:
    group=b if b in ['sleeves','collar']else a;which=1 if group==b else 0;hit=np.unique([x[which]for x in cross]);offset=0;parts=[]
    for pi,faces in regions[group]:
     ids=hit[(hit>=offset)&(hit<offset+len(faces))]-offset;offset+=len(faces)
     if not len(ids):continue
     vids=np.unique(faces[ids]);v=ref.arr(ref.prim(pi)['attributes']['POSITION']);parts.append({'primitive':pi,'vertices':vids.tolist(),'bounds':[v[vids].min(0).tolist(),v[vids].max(0).tolist()]})
    hotspots.append({'model':label,'clip':clip,'seconds':t,'pair':a+'__'+b,'garment':parts})
  # Exact source terminal cap center proxy. Pages remain source mesh1 primitive2.
  p=model.g['meshes'][1]['primitives'][2];v=model.arr(p['attributes']['POSITION']);v=(np.c_[v,np.ones(len(v))]@W[94].T)[:,:3];f=model.arr(p['indices']).astype(int).reshape(-1,3);tree=BVHTree.FromPolygons([Vector(x)for x in v],[tuple(x)for x in f],all_triangles=True,epsilon=0);tip=W[95]@np.array([0,-.1003,0,1]);nearest=tree.find_nearest(Vector(tip[:3]));prox.append({'sampleSet':kind,'clip':clip,'seconds':round(t,9),'model':label,'tipCapCenterToPageUnsigned':nearest[3]})
 if not args.quick:
  for pi in [4,5,12,121,122,123,124,125,126,127,130]:
   a=posed[0][1].get(pi);b=posed[1][1].get(pi)
   if a is None or b is None:continue
   f=ref.faces(pi);na=np.cross(a[f[:,1]]-a[f[:,0]],a[f[:,2]]-a[f[:,0]]);nb=np.cross(b[f[:,1]]-b[f[:,0]],b[f[:,2]]-b[f[:,0]]);area=np.linalg.norm(na,axis=1);valid=area>1e-10;ratio=np.linalg.norm(nb[valid],axis=1)/area[valid];deform.append({'sampleSet':kind,'clip':clip,'seconds':t,'primitive':pi,'maxWorldVertexDisplacement':float(np.linalg.norm(b-a,axis=1).max()),'minTriangleAreaRatio':float(ratio.min()),'p01TriangleAreaRatio':float(np.quantile(ratio,.01)),'opposedFaceNormals':int(((na*nb).sum(1)<0).sum())})
 print('PAIRED_POSE',kind,clip,t,flush=True)
for n,data in [('r1c-contact-matrix.csv',rows),('r1c-tip-proximity.csv',prox),('r1c-skinning-poses.csv',deform)]:
 if data:
  with (out/n).open('w')as f:w=csv.DictWriter(f,fieldnames=list(data[0]),lineterminator='\n');w.writeheader();w.writerows(data)
summary={'sourcePilotSha256':hashlib.sha256(before.bytes).hexdigest(),'candidateSha256':hashlib.sha256(after.bytes).hexdigest(),'posesPerModel':len(poses),'sameRegionsBothModels':True,'regions':regionmeta,'shoulderDefinition':'Shell faces <=60 mm from source bind upper-arm origin; real indexed body0/261 faces <=85 mm. Spatial torso proxy is nonempty, but no unseen humerus skin is invented; full under-coat arm anatomy remains unmodeled.','pairs':[],'limits':['BVH sampled triangle surfaces only, no continuous/containment guarantee','Regions frozen from R1.B source; new measurements are paired, not compared to different R1.B region selectors','Hand/pen insertion is not automatically accepted as intentional','C1 identity and actual WebGL/mobile/artistic approval are separate']}
for pair in [a+'__'+b for a,b in pairnames]:
 r={'pair':pair}
 for label in ['before','after']:
  rr=[x for x in rows if x['pair']==pair and x['model']==label and x['sampleSet']in ['baseline','quick']];vv=[x for x in rr if x['trianglePairs']is not None];worst=max(vv,key=lambda x:x['trianglePairs'])if vv else None;r[label]={'poses':len(rr),'posesWithCrossing':sum(x['trianglePairs']>0 for x in vv),'maxTrianglePairs':worst['trianglePairs']if worst else None,'worstClip':worst['clip']if worst else None,'worstSeconds':worst['seconds']if worst else None}
 summary['pairs'].append(r)
(out/'r1c-paired-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
if args.quick:(out/'hotspots.json').write_text(json.dumps(hotspots,indent=2)+'\n')
