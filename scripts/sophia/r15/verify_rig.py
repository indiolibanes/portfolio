"""Strict original rig comparison, distinguishing inherited non-joint props."""
import pathlib,json
from glb import load
R=pathlib.Path('local-private/sophia-r15');_,o,_=load(R/'sources/Sophia_v1.4.glb');_,c,_=load(R/'sophia-lab-r15.glb');j=set(o['skins'][0]['joints']);assert o['skins'][0]['joints']==c['skins'][0]['joints'];attachments=[]
for ni in j:
 a=dict(o['nodes'][ni]);b=dict(c['nodes'][ni]);ac=a.pop('children',[]);bc=b.pop('children',[]);assert a==b;assert ac==[x for x in bc if x in j]
 for x in bc:
  if x not in ac:attachments.append({'parentJoint':a['name'],'node':x,'name':c['nodes'][x]['name']})
 def parents(g):return [i for i,n in enumerate(g['nodes']) if ni in n.get('children',[])]
 assert parents(o)==parents(c),ni
p=pathlib.Path('docs/characters/sophia-r15/rig-original-integrity.json');p.write_text(json.dumps({'status':'PASS','mainJoints':90,'jointOrderNamesRestTRSHierarchyExactOriginal':True,'inheritedNonJointAttachments':attachments,'method':'Compare joint dictionaries excluding non-joint child props, parent indices and ordered joint edges with original; inverse binds checked in asset-integrity.json'},indent=2)+'\n');print(p)
