"""Additional unoccluded source-prop views; body hidden only for these renders."""
import bpy,pathlib,json,math
from mathutils import Vector
root=pathlib.Path('local-private/adornments-r1');out=root/'review';bpy.ops.wm.open_mainfile(filepath=str((root/'sophia-6h-adornments-pilot.blend').resolve()),use_scripts=False,load_ui=False)
s=bpy.context.scene;s.render.resolution_x=768;s.render.resolution_y=768;s.cycles.samples=16
holders=list(bpy.data.objects)+[m.shape_keys for m in bpy.data.meshes if m.shape_keys]
offsets=[]
for h in holders:
 if not h.animation_data:continue
 h.animation_data.action=None
 for tr in h.animation_data.nla_tracks:
  tr.mute=tr.name!='Write'
  if tr.name=='Write':offsets += [strip.frame_start-strip.action_frame_start*strip.scale for strip in tr.strips]
assert offsets and max(offsets)-min(offsets)<1e-5
for o in bpy.data.objects:
 if o.type=='ARMATURE':o.data.pose_position='POSE'
frame=offsets[0]+1.6*s.render.fps;s.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
for o in bpy.data.objects:
 if o.type=='MESH' and o.name not in ['Book','Pen']:o.hide_render=True
book=bpy.data.objects['Book'];pen=bpy.data.objects['Pen'];records=[]
for side in [-1,1]:
 target=book.matrix_world@Vector((0,0,-.02));normal=book.matrix_world.to_quaternion()@Vector((0,0,side));s.camera.location=target+normal*.6+Vector((.02,0,.08));s.camera.rotation_euler=(target-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.ortho_scale=.3
 name=f'pilot_Write_props_only_{side}.png';s.render.filepath=str((out/name).resolve());bpy.ops.render.render(write_still=True);records.append({'file':name,'source':'sophia-6h-adornments-pilot.blend','clip':'Write','seconds':1.6,'projection':'ORTHO','orthoScale':.3,'bodyHiddenForInspection':True,'geometryChanged':False,'note':'Original props at original posed world coordinates; not proof of body clearance'})
(out/'contact-detail-records.json').write_text(json.dumps(records,indent=2)+'\n')
