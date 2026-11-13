"""Real Blender renders from locked source/pilot GLBs; no image generation.
Run from repo root after build_pilot.py. Source geometry is never exported over.
"""
import bpy,sys,pathlib,json,math,hashlib
from mathutils import Vector
out=pathlib.Path('local-private/adornments-r1/review');out.mkdir(parents=True,exist_ok=True)
pilot='local-private/adornments-r1/sophia-6h-adornments-pilot.glb'
records=[]
def setup(path):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(pathlib.Path(path).resolve()))
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=8;s.cycles.use_denoising=False;s.render.resolution_x=640;s.render.resolution_y=800;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.view_settings.view_transform='AgX';s.render.fps=24
 s.world=bpy.data.worlds.new('ReviewWorld');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.8,.8,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.5
 center=Vector((.15,.05,.5))
 for name,v,power in [('Key',(-2,-3,3),90),('Fill',(2,-1,2),45),('Rim',(1,2,3),60)]:
  d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=2;o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=v;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('ReviewCamera');d.type='ORTHO';d.ortho_scale=1.55;c=bpy.data.objects.new('ReviewCamera',d);s.collection.objects.link(c);s.camera=c
 return s
def pose(s,clip=None,t=0):
 for o in bpy.data.objects:
  if o.type=='ARMATURE':o.data.pose_position='POSE'if clip else 'REST'
 holders=[o for o in bpy.data.objects]+[m.shape_keys for m in bpy.data.meshes if m.shape_keys]
 for h in holders:
  ad=h.animation_data
  if not ad:continue
  ad.action=None
  for tr in ad.nla_tracks:tr.mute=not bool(clip and tr.name==clip)
 offsets=[strip.frame_start-strip.action_frame_start*strip.scale for h in holders if h.animation_data for tr in h.animation_data.nla_tracks if clip and tr.name==clip for strip in tr.strips]
 if offsets:assert max(offsets)-min(offsets)<1e-5,'Inconsistent imported action offsets'
 frame=t*s.render.fps+(offsets[0]if offsets else 0);s.frame_set(int(math.floor(frame)),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
def camera(s,target=(.15,.05,.5),angle='front',scale=1.55):
 v={'front':(0,-1,0),'three-quarter':(1,-1,0),'profile':(1,0,0),'back':(0,1,0)}[angle];t=Vector(target);c=s.camera;c.location=t+Vector(v).normalized()*3;c.rotation_euler=(t-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=scale
def render(s,name,path,clip=None,time=0,angle='front'):
 s.render.filepath=str((out/name).resolve());bpy.ops.render.render(write_still=True);records.append({'file':name,'source':path,'sourceSha256':hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest(),'clip':clip,'seconds':time,'angle':angle,'projection':'ORTHO','orthoScale':s.camera.data.ortho_scale,'resolution':[s.render.resolution_x,s.render.resolution_y],'cameraPosition':list(s.camera.location),'cameraRotation':list(s.camera.rotation_euler),'method':'Blender 4.3.2 glTF import, original NLA track selection, CPU Cycles; not WebGL'})
for label,path in [('source','public/experimental/sophia-alpha.glb'),('pilot',pilot),('e1','public/experimental/sophia-7b-e1-latest.glb')]:
 s=setup(path);pose(s)
 for angle in ['front','three-quarter','profile','back']:camera(s,angle=angle);render(s,label+'_'+angle+'.png',path,angle=angle)
 if label!='pilot':continue
 # Imported-source derivative, packed and saved once; not original authoring source.
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(pathlib.Path('local-private/adornments-r1/sophia-6h-adornments-pilot.blend').resolve()))
 for clip,t in [('Write',1.6),('Wave',1.2),('Walk',.818181818),('Idle',2.6666667)]:
  pose(s,clip,t);camera(s,angle='three-quarter');render(s,'pilot_'+clip+'.png',path,clip,t,'three-quarter')
  if clip=='Write':
   book=bpy.data.objects.get('Book');target=book.matrix_world.translation if book else Vector((.1,-.2,.4));camera(s,target=target,angle='three-quarter',scale=.5);render(s,'pilot_Write_cover_grip.png',path,clip,t,'three-quarter')
   for sign in [-1,1]:
    target=book.matrix_world@Vector((0,0,-.02));normal=book.matrix_world.to_quaternion()@Vector((0,0,sign));s.camera.location=target+normal*.6+Vector((0,0,.15));s.camera.rotation_euler=(target-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.ortho_scale=.36;render(s,f'pilot_Write_page_side_{sign}.png',path,clip,t,'book-local-normal')
   pen=bpy.data.objects.get('Pen');camera(s,target=pen.matrix_world.translation,angle='three-quarter',scale=.27);render(s,'pilot_Write_wrist.png',path,clip,t,'three-quarter')
 for w,h in [(960,540),(540,960)]:
  s.render.resolution_x=w;s.render.resolution_y=h;pose(s,'Write',1.6);camera(s,angle='three-quarter',scale=1.8);render(s,f'pilot_Write_{w}x{h}.png',path,'Write',1.6,'three-quarter')
 s.render.resolution_x=320;s.render.resolution_y=400;s.cycles.samples=4
 for clip in ['Write','Idle','Wave','Walk']:
  for i in range(24):
   duration={'Write':3.2,'Idle':4,'Wave':2.4,'Walk':1}[clip];t=(i/8)%duration;pose(s,clip,t);camera(s,angle='three-quarter');render(s,f'loop_{clip}_{i:02}.png',path,clip,t,'three-quarter')
(out/'render-records.json').write_text(json.dumps(records,indent=2)+'\n')
print('REVIEW_RENDER_COMPLETE',len(records),flush=True)
