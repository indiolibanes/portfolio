"""Private page-side contact views from real imported GLBs, no hidden geometry."""
import bpy,sys,pathlib,math,json,hashlib
from mathutils import Vector
ROOT=pathlib.Path('local-private/adornments-r1c');OUT=ROOT/'review';records=[]
def pose(s,t):
 holders=list(bpy.data.objects)+[m.shape_keys for m in bpy.data.meshes if m.shape_keys];offsets=[]
 for o in bpy.data.objects:
  if o.type=='ARMATURE':o.data.pose_position='POSE'
 for h in holders:
  ad=h.animation_data
  if not ad:continue
  ad.action=None
  for tr in ad.nla_tracks:
   tr.mute=tr.name!='Write'
   if not tr.mute:offsets += [z.frame_start-z.action_frame_start*z.scale for z in tr.strips]
 assert offsets and max(offsets)-min(offsets)<1e-5
 frame=offsets[0]+t*24;s.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
for label,fn in [('before','r1b-baseline.glb'),('after','sophia-r1c-collar-study.glb')]:
 path=ROOT/fn;bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path.resolve()));s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.use_denoising=False;s.cycles.samples=16;s.render.resolution_x=480;s.render.resolution_y=480;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.view_settings.view_transform='AgX';s.world=bpy.data.worlds.new('Review');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.73,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.65
 for loc,power in [((-2,-3,3),90),((2,-1,2),55),((1,2,3),65)]:
  d=bpy.data.lights.new('Area','AREA');d.energy=power;d.size=2;o=bpy.data.objects.new('Area',d);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.45))-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('PageReview');d.type='ORTHO';d.ortho_scale=.33;c=bpy.data.objects.new(d.name,d);s.collection.objects.link(c);s.camera=c
 # Camera behind the cover and lateral to the face, looking down into pages.
 # Position is recorded per frame; every body/garment/prop remains visible.
 shots=[('page_high',Vector((.7,.25,.45))),('page_other',Vector((-.7,.25,.45))),('page_top',Vector((.4,-.1,.7)))] if '--stills' in sys.argv else [('page_motion',Vector((.4,-.1,.7)))]
 for name,delta in shots:
  for i in range(1 if '--stills' in sys.argv else 24):
   t=1.6 if '--stills' in sys.argv else i/8;pose(s,t);target=Vector((.006,-.215,.427));c.location=target+delta;c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler();file=f'{label}_{name}_{i:02}.png';s.render.filepath=str((OUT/file).resolve());bpy.ops.render.render(write_still=True);records.append({'file':file,'glbSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'clip':'Write','seconds':t,'projection':'ORTHO','cameraPosition':list(c.location),'cameraRotation':list(c.rotation_euler),'orthoScale':d.ortho_scale,'renderer':'Blender Cycles CPU; complete real GLB, no hidden body/garment'})
 if '--stills' in sys.argv:
  for o in bpy.data.objects:
   if o.type=='MESH' and o.name not in ['Book','Pen']:o.hide_render=True
  pose(s,1.6);target=Vector((.006,-.215,.427));c.location=target+Vector((.4,-.1,.7));c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler();file=label+'_props_only_diagnostic.png';s.render.filepath=str((OUT/file).resolve());bpy.ops.render.render(write_still=True);records.append({'file':file,'glbSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'clip':'Write','seconds':1.6,'projection':'ORTHO','cameraPosition':list(c.location),'cameraRotation':list(c.rotation_euler),'orthoScale':d.ortho_scale,'renderer':'Blender CPU; PROPS ONLY, body/garment hidden; NOT a contact/clearance approval'})
(OUT/('page-still-records.json' if '--stills' in sys.argv else 'page-motion-records.json')).write_text(json.dumps(records,indent=2)+'\n')
