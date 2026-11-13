#!/usr/bin/env python3
"""Lossless graph-only recovery. No new body, armature, vertices or source clips."""
import argparse,copy,hashlib,json,pathlib,struct
import numpy as np
from glb_audit import load,accessor
EXPECTED='3b0e7db84809d6e4fe6eaa2bc6299874c202c529adcbd369cf83c6a29d3c3a2a'
def build(source,out):
 b,g,raw=load(source)
 if hashlib.sha256(b).hexdigest()!=EXPECTED:raise ValueError('Source SHA is not the locked 6H; refusing primitive/name guesses')
 p=copy.deepcopy(g);nodes=p['nodes'];book=94;pen=95;head=5
 assert nodes[book]['name']=='Book' and nodes[pen]['name']=='Pen' and nodes[head]['name']=='head'
 assert nodes[21]['name']=='hand_L' and nodes[27]['name']=='hand_R'
 sockets=[]
 for parent,child,name in [(21,book,'Socket_Hand_L_Notebook'),(27,pen,'Socket_Hand_R_Pen')]:
  i=len(nodes);nodes.append({'name':name,'children':[child],'translation':[0,0,0],'rotation':[0,0,0,1],'scale':[1,1,1],'extras':{'purpose':'identity graph insertion; source animated prop local transforms preserved'}})
  nodes[parent]['children']=[i if c==child else c for c in nodes[parent]['children']]
  sockets.append({'name':name,'node':i,'parent':parent,'parentName':nodes[parent]['name'],'child':child,'localMatrix':[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],'calibration':'Original 6H attachment and animated offsets preserved, not a new contact approval'})
 star_ids=[9,10,11];prims=[];jointslot=g['skins'][0]['joints'].index(head)
 for i in star_ids:
  pr=g['meshes'][0]['primitives'][i];j=accessor(g,raw,pr['attributes']['JOINTS_0']);w=accessor(g,raw,pr['attributes']['WEIGHTS_0'])
  assert np.all(j[w>0]==jointslot) and np.allclose(w.sum(axis=1),1,atol=1e-7)
  for target in pr.get('targets',[]):
   for ai in target.values():assert np.max(np.abs(accessor(g,raw,ai)),initial=0)==0,'Star has active morphs; rigid conversion prohibited'
  q=copy.deepcopy(pr);q['attributes']={k:v for k,v in q['attributes'].items()if not k.startswith(('JOINTS_','WEIGHTS_'))};q.pop('targets',None)
  q.setdefault('extras',{})['recovered_from']={'sha256':EXPECTED,'mesh':0,'primitive':i};prims.append(q)
 p['meshes'][0]['primitives']=[pr for i,pr in enumerate(p['meshes'][0]['primitives'])if i not in star_ids]
 mi=len(p['meshes']);p['meshes'].append({'name':'Recovered_ForeheadStars_6H','primitives':prims})
 socketid=len(nodes);starid=socketid+1
 nodes.append({'name':'Socket_Head_ForeheadStars','children':[starid],'translation':[0,0,0],'rotation':[0,0,0,1],'scale':[1,1,1]})
 # A source vertex obeyed headWorld * inverseBind_head * POSITION. Use exactly
 # that matrix for the rigid child; no resampling of positions, UVs or normals.
 ibm=accessor(g,raw,g['skins'][0]['inverseBindMatrices'])[jointslot].tolist()
 nodes.append({'name':'Recovered_ForeheadStars_6H','mesh':mi,'matrix':ibm,'extras':{'identity':'archived three-star group; NOT C1 single flat skin marking; fringe occlusion remains unapproved'}})
 nodes[head].setdefault('children',[]).append(socketid)
 sockets.append({'name':'Socket_Head_ForeheadStars','node':socketid,'parent':head,'parentName':'head','child':starid,'localMatrix':[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],'childMatrix':ibm,'calibration':'Exact inverse-bind rigid equivalent; existing three-star geometry unchanged'})
 p.setdefault('extras',{})['adornmentsR1']={'sourceSha256':EXPECTED,'status':'SOURCE_MATCHED_PILOT_CONTACT_AND_IDENTITY_PENDING','newVertices':0,'newJoints':0,'sourceClipsModified':False,'C1Occlusion':'NOT_PROVEN; no fringe/body replacement is authorized'}
 assert p['animations']==g['animations'] and p['skins']==g['skins'] and p['accessors']==g['accessors'] and p['bufferViews']==g['bufferViews'] and p['materials']==g['materials'] and p['images']==g['images']
 jb=json.dumps(p,separators=(',',':'),ensure_ascii=True).encode();jb+=b' '*((-len(jb))%4)
 data=struct.pack('<4sII',b'glTF',2,12+8+len(jb)+8+len(raw))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(raw),0x004e4942)+raw
 out=pathlib.Path(out);out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
 report={'source':str(source),'sourceSha256':EXPECTED,'pilot':str(out),'pilotSha256':hashlib.sha256(data).hexdigest(),'binSha256':hashlib.sha256(raw).hexdigest(),'binaryPayloadUnchanged':True,'skinsAndAnimationJsonUnchanged':True,'sourceJointCount':len(g['skins'][0]['joints']),'sourceClipNames':[a['name']for a in g['animations']],'sockets':sockets,'starPrimitiveIds':star_ids,'starUvSets':[],'starMaterial':7,'identityGate':'PARTIAL: archived 3D stars have no C1 opaque fringe; no new fringe generated'}
 return report
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--source',default='public/experimental/sophia-alpha.glb');ap.add_argument('--out',default='local-private/adornments-r1/sophia-6h-adornments-pilot.glb');ap.add_argument('--sockets',default='docs/sophia/adornments-r1/results/sockets.json');a=ap.parse_args();r=build(a.source,a.out);p=pathlib.Path(a.sockets);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(r,indent=2)+'\n');print(r['pilotSha256'])
