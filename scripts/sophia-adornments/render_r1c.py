"""Private orthographic/animated review of actual imported GLBs, CPU Cycles.
Never uses node-rest as a visual approval pose (source arm bind discrepancy).
"""
import bpy,sys,pathlib,json,math,hashlib
from mathutils import Vector
REFERENCES='--references' in sys.argv
ROOT=pathlib.Path('local-private/adornments-r1c');OUT=ROOT/'review';OUT.mkdir(parents=True,exist_ok=True);records=[]
def pose(s,clip,t):
 if clip=='UNRIGGED':return
 holders=list(bpy.data.objects)+[m.shape_keys for m in bpy.data.meshes if m.shape_keys]
 for o in bpy.data.objects:
  if o.type=='ARMATURE':o.data.pose_position='POSE'
 offsets=[]
 for h in holders:
  ad=h.animation_data
  if not ad:continue
  ad.action=None
  for tr in ad.nla_tracks:
   tr.mute=tr.name!=clip
   if not tr.mute:offsets += [z.frame_start-z.action_frame_start*z.scale for z in tr.strips]
 assert offsets and max(offsets)-min(offsets)<1e-5
 frame=offsets[0]+t*24;s.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
def camera(s,target=(0,0,.5),angle=45,scale=1.15):
 a=math.radians(angle);v=Vector((math.sin(a),-math.cos(a),.04));target=Vector(target);c=s.camera;c.location=target+v.normalized()*3;c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=scale
sources=[('6h-source','public/experimental/sophia-alpha.glb'),('7b','public/experimental/sophia-7b-e1-latest.glb')] if REFERENCES else [('before','r1b-baseline.glb'),('after','sophia-r1c-collar-study.glb')]
for label,fn in sources:
 path=pathlib.Path(fn) if REFERENCES else ROOT/fn;sha=hashlib.sha256(path.read_bytes()).hexdigest();bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path.resolve()));s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=12;s.cycles.use_denoising=False;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.fps=24;s.view_settings.view_transform='AgX';s.world=bpy.data.worlds.new('Review');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.73,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.65
 for name,loc,power in [('Key',(-2,-3,3),90),('Fill',(2,-1,2),55),('Rim',(1,2,3),65)]:
  d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=2;o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.45))-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('R1C_Orthographic');d.type='ORTHO';c=bpy.data.objects.new(d.name,d);s.collection.objects.link(c);s.camera=c
 def render(name,clip,t,angle=45,target=(0,0,.5),scale=1.15,w=384,h=480):
  pose(s,clip,t);camera(s,target,angle,scale);s.cycles.samples=12 if name[-2:].isdigit() and ('_' in name) and name.rsplit('_',1)[0] in ['Write','Idle','Wave','Walk','contact','page'] else 64;s.render.resolution_x=w;s.render.resolution_y=h;s.render.filepath=str((OUT/(label+'_'+name+'.png')).resolve());bpy.ops.render.render(write_still=True);records.append({'file':label+'_'+name+'.png','glbSha256':sha,'clip':clip,'seconds':t,'projection':'ORTHO','cameraPosition':list(c.location),'cameraRotation':list(c.rotation_euler),'orthoScale':scale,'resolution':[w,h],'renderer':'Blender 4.3.2 Cycles CPU, original imported NLA with frame offset; not WebGL'})
 refclip='UNRIGGED' if label=='7b' else 'Idle'
 for angle in [0,45,90,180]:render('Idle_ortho_'+str(angle),refclip,0,angle)
 for angle in [0,45,90]:render('face_'+str(angle),refclip,0,angle,target=(0,-.015,.675),scale=.36,w=420,h=420)
 if REFERENCES:
  (OUT/'reference-render-records.json').write_text(json.dumps(records,indent=2)+'\n');continue
 # Matching contact snapshots; no props or body hidden.
 for name,clip,t,target,scale in [('collar','Write',1.6,(0,-.08,.54),.35),('tail','Walk',.272727273,(.05,.04,.23),.55),('shoulder','Wave',1.2,(0,-.02,.47),.55)]:render(name,clip,t,45 if name!='tail' else 180,target,scale)
 for clip,duration in [('Write',3.2),('Idle',4),('Wave',2.4),('Walk',1)]:
  for i in range(24):render(clip+'_'+str(i).zfill(2),clip,(i/8)%duration,w=288,h=360)
 for i in range(24):
  t=i/8;pose(s,'Write',t);book=bpy.data.objects.get('Book');target=book.matrix_world.translation.copy()+Vector((0,0,.045));render('contact_'+str(i).zfill(2),'Write',t,45,target,.48,w=480,h=480)
 for sign in [-1,1]:
  pose(s,'Write',1.6);book=bpy.data.objects.get('Book');polys=[p for p in book.data.polygons if p.material_index==2];assert polys,'Pages material not found';poly=max(polys,key=lambda p:p.area);normal=(book.matrix_world.to_3x3().inverted().transposed()@poly.normal).normalized();target=book.matrix_world@poly.center;s.camera.location=target+normal*sign*.8+Vector((0,0,.08));s.camera.rotation_euler=(target-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.ortho_scale=.4;s.render.resolution_x=480;s.render.resolution_y=480;s.cycles.samples=64;s.render.filepath=str((OUT/(label+'_page_side_'+str(sign)+'.png')).resolve());bpy.ops.render.render(write_still=True);records.append({'file':label+'_page_side_'+str(sign)+'.png','glbSha256':sha,'clip':'Write','seconds':1.6,'projection':'ORTHO','cameraPosition':list(s.camera.location),'cameraRotation':list(s.camera.rotation_euler),'orthoScale':.4,'resolution':[480,480],'renderer':'Blender Cycles CPU; page normal from actual imported mesh polygon, no WebGL'})
 if label=='after':
  pose(s,'Idle',0);camera(s);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/'sophia-r1c-collar-study.blend').resolve()))
 (OUT/'render-records.json').write_text(json.dumps(records,indent=2)+'\n')
print('R1C_RENDER_COMPLETE',len(records),flush=True)
