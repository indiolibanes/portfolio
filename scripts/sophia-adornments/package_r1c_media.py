"""Label real private frames and encode review media, no generated character art."""
import pathlib,json,subprocess,hashlib
from PIL import Image,ImageOps,ImageDraw,ImageFont
R=pathlib.Path('local-private/adornments-r1c');P=R/'review';M=R/'media';M.mkdir(exist_ok=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16);small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
def panel(path,size):
 im=Image.open(path).convert('RGBA');bg=Image.new('RGBA',im.size,(235,234,228,255));bg.alpha_composite(im);return ImageOps.contain(bg.convert('RGB'),size)
def put(canvas,file,x,y,w,h,title):
 d=ImageDraw.Draw(canvas);d.text((x+8,y+5),title,font=small,fill='#f5f0df');im=panel(file,(w,h-32));canvas.paste(im,(x+(w-im.width)//2,y+30))
def text(d,xy,s):d.text(xy,s,font=small,fill='#f5f0df')
def video(name,frames):
 directory=M/(name+'_frames');directory.mkdir(exist_ok=True)
 for i,im in enumerate(frames):im.save(directory/f'{i:03}.png')
 subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','8','-i',str(directory/'%03d.png'),'-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(M/(name+'.mp4'))],check=True)
frames=[]
for i in range(24):
 c=Image.new('RGB',(768,866),'#252b32');d=ImageDraw.Draw(c);text(d,(12,8),'Write / 3 s / GLBs reais - Blender CPU (sem WebGL)')
 for col,label in enumerate(['before','after']):
  put(c,P/f'{label}_contact_{i:02}.png',col*384,34,384,386,('R1.B original' if col==0 else 'R1.C: somente gola'))
  put(c,P/f'{label}_page_motion_{i:02}.png',col*384,426,384,386,'Pagina / geometria completa')
 text(d,(12,820),'Empunhadura e ponta ainda ocluidas em parte; contato NAO aprovado.')
 text(d,(12,841),'Mesmos clipes e tempos; 8 fps, 24 frames. Ponta proxy: 0,667-0,727 mm da pagina.')
 frames.append(c)
video('Write_pen_book_contact',frames)
for clip in ['Write','Idle','Wave','Walk']:
 frames=[]
 for i in range(24):
  c=Image.new('RGB',(576,418),'#252b32');d=ImageDraw.Draw(c);text(d,(8,5),clip+' / 3 s / GLB real / Blender CPU / identidade bloqueada')
  for col,label in enumerate(['before','after']):put(c,P/f'{label}_{clip}_{i:02}.png',col*288,24,288,392,'R1.B' if col==0 else 'R1.C: gola')
  frames.append(c)
 frames[0].save(M/(clip+'_comparison.gif'),save_all=True,append_images=frames[1:],duration=[120,130]*12,loop=0,optimize=True)
 if clip in ['Wave','Walk']:
  if clip=='Wave':coatframes=frames[:]
  else:coatframes+=frames
video('Coat_Wave_Walk',coatframes)
# Not a mark implementation or oclusion proof: explicit blocked identity diagnosis.
frames=[]
for angle in [0,45,90]:
 c=Image.new('RGB',(840,492),'#252b32');d=ImageDraw.Draw(c);text(d,(12,6),'IDENTITY_BLOCKED / '+str(angle)+' graus / estrelas 6H legadas, sem franja C1')
 put(c,P/f'before_face_{angle}.png',0,30,420,430,'R1.B / 6H experimental');put(c,P/f'after_face_{angle}.png',420,30,420,430,'R1.C / identidade inalterada')
 text(d,(12,465),'Nao e C1_face_mark.mp4: nenhuma nova marca ou oclusao C1 foi implementada.')
 frames.extend([c]*8)
video('C1_identity_blocked',frames)
# C1 is a single 2D artwork, never relabelled as an orthographic 3D ground truth.
c=Image.new('RGB',(1536,570),'#252b32');d=ImageDraw.Draw(c);text(d,(12,6),'C1 autoral x fontes x estudo / escalas de quadros iguais, sem equivalencia corporal')
master=pathlib.Path('../sources/C1/Sophia_2D_Master_RGBA.png');im=Image.open(master).convert('RGBA');im=im.crop(im.getchannel('A').getbbox());art=M/'C1_art_panel.png';im.save(art)
for col,(p,title)in enumerate([(art,'C1: arte 2D unica, nao ortografia'),(P/'6h-source_Idle_ortho_0.png','6H fonte / Idle 0 / ORTHO'),(P/'7b_Idle_ortho_0.png','7B / estatica, sem rig / ORTHO'),(P/'after_Idle_ortho_0.png','R1.C / Idle 0 / ORTHO / bloqueada')]):put(c,p,col*384,30,384,500,title)
text(d,(12,540),'Mesma luz/camera para GLBs. Rosto, franja, silhueta e proporcoes 6H divergem de C1.');c.save(M/'r1c-comparison.png')
c=Image.new('RGB',(1536,2136),'#252b32');d=ImageDraw.Draw(c)
for row,angle in enumerate([0,45,90,180]):
 for col,(label,title)in enumerate([('6h-source','Fonte 6H / Idle 0'),('before','Piloto R1.B / Idle 0'),('after','Derivado R1.C / Idle 0'),('7b','7B / sem rig, estatica')]):put(c,P/f'{label}_Idle_ortho_{angle}.png',col*384,row*534,384,534,title+' / '+str(angle)+' graus')
c.save(M/'orthographic-comparison.png')
for kind in ['collar','shoulder','tail']:
 c=Image.new('RGB',(768,560),'#252b32');d=ImageDraw.Draw(c);text(d,(8,5),'GLB real / '+kind+' / Blender CPU / nao e aprovacao artistica')
 for col,label in enumerate(['before','after']):put(c,P/f'{label}_{kind}.png',col*384,30,384,516,'R1.B' if col==0 else 'R1.C: gola')
 c.save(M/(kind+'-comparison.png'))
c=Image.new('RGB',(960,530),'#252b32');d=ImageDraw.Draw(c)
for i,label in enumerate(['before','after']):c.paste(Image.open(P/(label+'_props_only_diagnostic.png')).convert('RGB'),(i*480,30));text(d,(i*480+10,6),'R1.B' if i==0 else 'R1.C / somente gola')
text(d,(10,511),'DIAGNOSTICO: corpo/roupa ocultados. NAO comprova empunhadura nem folga de contato.');c.save(M/'props-only-diagnostic.png')
report=[]
for p in M.glob('*'):
 if p.is_file() and p.suffix in ['.gif','.mp4','.png']:
  r={'name':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
  if p.suffix=='.mp4':r['ffprobe']=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=width,height,nb_frames,r_frame_rate','-of','json',str(p)]))
  if p.suffix=='.gif':
   im=Image.open(p);total=0
   for i in range(im.n_frames):im.seek(i);total+=im.info['duration']
   r.update(frames=im.n_frames,durationMs=total);assert total==3000
  report.append(r)
(R/'media-metadata.json').write_text(json.dumps(report,indent=2)+'\n');print('MEDIA_COMPLETE',len(report))
