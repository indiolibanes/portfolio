"""Actual GLB pose inspection; Cycles CPU, not WebGL/mobile certification."""
import bpy,sys,pathlib,math,json,hashlib
from mathutils import Vector
arg=sys.argv[sys.argv.index('--')+1:] if '--'in sys.argv else[];source=pathlib.Path(arg[0] if arg else 'public/assets/models/sophia/sophia-lab.glb');label=arg[1]if len(arg)>1 else'before';out=pathlib.Path('local-private/sophia-r15')/label;out.mkdir(parents=True,exist_ok=True)
source_sha=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(source.resolve()));s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=24;s.cycles.use_denoising=False;s.render.resolution_x=384;s.render.resolution_y=480;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.fps=24;s.view_settings.view_transform='AgX';s.world=bpy.data.worlds.new('QA');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.65,.65,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.65
for loc,power in [((-2,-3,3),100),((2,-1,2),65),((1,2,3),80)]:
 d=bpy.data.lights.new('QA','AREA');d.energy=power;d.size=2;o=bpy.data.objects.new('QA',d);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((-.177,-.13,.5))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Ortho');d.type='ORTHO';d.ortho_scale=1.2;c=bpy.data.objects.new('Ortho',d);s.collection.objects.link(c);s.camera=c
for o in bpy.data.objects:
 if o.name.startswith(('Prop_Book','Prop_Pen')):o.hide_render=True
holders=list(bpy.data.objects)+[m.shape_keys for m in bpy.data.meshes if m.shape_keys];records=[]
def pose(clip,t):
 offsets=[]
 for o in bpy.data.objects:
  if o.type=='ARMATURE':o.data.pose_position='POSE'
 for h in holders:
  ad=h.animation_data
  if not ad:continue
  ad.action=None
  for tr in ad.nla_tracks:
   tr.mute=tr.name!=clip
   if not tr.mute:offsets += [z.frame_start-z.action_frame_start*z.scale for z in tr.strips]
 frame=t*24+(offsets[0]if offsets else 0);s.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
shots=[('REST',None,0),('walk','Andar_R6',.3),('run','Correr_R6',.2),('dance','Danca_R6',1.5),('punch','Socos_R6',.25),('kick','Chutar_R6',.5),('roundhouse','Roundhouse_R6',.6),('arms','Nadar_R6',.5),('torso','Mortal_Tras_R6',.7),('face','Sophia_ExpressionFlow_R6',3.2),('arms_back','Nadar_R6',1.5),('twist','Sophia_Pirouette_R4',1.6458334028720856)]
mode='loops' if '--loops' in arg else 'reference' if '--reference-only' in arg else 'still'
if mode=='loops':
 s.render.resolution_x=288;s.render.resolution_y=360;s.cycles.samples=10
 shots=[(clip+'_'+str(i).zfill(2),clip,(i/8)%duration)for clip,duration in [('Nadar_R6',2),('Socos_R6',1),('Chutar_R6',1),('Correr_R6',.8),('Danca_R6',4)]for i in range(24)]
if mode=='reference':shots=[('reference','Sophia_Expr_Seria_R6',0)]
for name,clip,t in shots:
 pose(clip,t)
 for a in ([45] if mode=='loops' else [0,90,180]):
  angle=math.radians(a);target=Vector((-.177,-.13,.5));c.location=target+Vector((math.sin(angle),-math.cos(angle),0))*3;c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler();file=f'{name}_{a}.png';s.render.filepath=str((out/file).resolve());bpy.ops.render.render(write_still=True);records.append({'file':file,'clip':clip,'seconds':t,'azimuth':a,'projection':'ORTHO','camera':list(c.location),'scale':d.ortho_scale,'glbSha256':source_sha,'renderer':'Blender 4.3.2 Cycles CPU, glTF imported NLA active, no hidden garment/body'})
(out/('animation-records.json' if mode=='loops' else 'reference-records.json' if mode=='reference' else 'render-records.json')).write_text(json.dumps(records,indent=2)+'\n')
if label=='after' and mode=='still':
 pose('Sophia_Expr_Seria_R6',0);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str((out.parent/'sophia-lab-r15.blend').resolve()))
print('RENDER_COMPLETE',len(records),flush=True)
