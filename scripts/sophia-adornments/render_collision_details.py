"""Orthographic close-ups at sampled crossing cases; no collision repair or export."""
import bpy,pathlib,json,math
from mathutils import Vector
root=pathlib.Path('local-private/adornments-r1');out=root/'review';bpy.ops.wm.open_mainfile(filepath=str((root/'sophia-6h-adornments-pilot.blend').resolve()),use_scripts=False,load_ui=False)
s=bpy.context.scene;s.render.resolution_x=768;s.render.resolution_y=768;s.cycles.samples=12
holders=list(bpy.data.objects)+[m.shape_keys for m in bpy.data.meshes if m.shape_keys]
def pose(clip,t):
 offsets=[]
 for h in holders:
  if not h.animation_data:continue
  h.animation_data.action=None
  for tr in h.animation_data.nla_tracks:
   tr.mute=tr.name!=clip
   if tr.name==clip:offsets += [strip.frame_start-strip.action_frame_start*strip.scale for strip in tr.strips]
 for o in bpy.data.objects:
  if o.type=='ARMATURE':o.data.pose_position='POSE'
 assert offsets and max(offsets)-min(offsets)<1e-5
 f=offsets[0]+t*s.render.fps;s.frame_set(math.floor(f),subframe=f-math.floor(f));bpy.context.view_layer.update()
cases=[('Write',0,'chin_collar',(0,-.11,.555),(1,-2,.3),.32),('Write',0,'wrist_sleeve',None,(1,-2,.3),.34),('Point',0,'cuff_book',None,(1,-2,.5),.43),('Walk',.272727273,'tail_coat',(.05,.11,.29),(1,2,.4),.52),('Point',1.309090961,'ear_ribbon_mane',(.13,-.02,.67),(1,-2,.2),.4)]
records=[]
for clip,t,label,target,offset,scale in cases:
 pose(clip,t)
 if target is None:target=bpy.data.objects['Book'if label=='cuff_book'else'Pen'].matrix_world.translation
 target=Vector(target);s.camera.location=target+Vector(offset).normalized()*2;s.camera.rotation_euler=(target-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.ortho_scale=scale
 name='collision_'+label+'.png';s.render.filepath=str((out/name).resolve());bpy.ops.render.render(write_still=True);records.append({'file':name,'clip':clip,'seconds':t,'region':label,'frame':s.frame_current+s.frame_subframe,'projection':'ORTHO','orthoScale':scale,'source':'private 6H graph-only pilot','geometryChanged':False,'note':'View at sampled source crossing; visibility/occlusion must be reviewed, not a no-collision certificate'})
(out/'collision-detail-records.json').write_text(json.dumps(records,indent=2)+'\n')
