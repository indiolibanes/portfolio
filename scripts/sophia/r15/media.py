from PIL import Image,ImageDraw,ImageFont
import pathlib,json,subprocess
R=pathlib.Path('local-private/sophia-r15');O=R/'comparisons';O.mkdir(exist_ok=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
shots=[('reference','Sophia_Expr_Seria_R6 0s'),('run','Correr_R6 0.2s'),('punch','Socos_R6 0.25s'),('kick','Chutar_R6 0.5s'),('arms','Nadar_R6 0.5s'),('arms_back','Nadar_R6 1.5s'),('torso','Mortal_Tras_R6 0.7s'),('twist','Sophia_Pirouette_R4 1.6458s')]
for name,label in shots:
 sheet=Image.new('RGB',(1152,1030),'#161b24');d=ImageDraw.Draw(sheet)
 for row,state in enumerate(['before','after']):
  for col,az in enumerate([0,90,180]):
   im=Image.open(R/state/f'{name}_{az}.png').convert('RGB');sheet.paste(im,(384*col,30+row*500));d.text((384*col+8,8+row*500),f'{state.upper()} | {label} | {az} deg',font=font,fill='white')
 d.text((8,1012),'Real GLB / Blender Cycles CPU. Same fixed orthographic camera; moving extremities may crop. Garment gate FAIL.',font=font,fill='#ffbd79');sheet.save(O/f'{name}-orthographic.png')
for clip in ['Nadar_R6','Socos_R6','Chutar_R6','Correr_R6','Danca_R6']:
 frames=[];D=O/clip;D.mkdir(exist_ok=True)
 for i in range(24):
  frame=Image.new('RGB',(576,400),'#161b24');d=ImageDraw.Draw(frame)
  for k,state in enumerate(['before','after']):
   frame.paste(Image.open(R/state/f'{clip}_{i:02}_45.png').convert('RGB'),(288*k,35));d.text((8+288*k,5),f'{state.upper()} | {clip}',font=font,fill='white')
  d.text((8,382),f'3s / 8fps | sample {i}/24 | CPU render; not runtime FPS',font=font,fill='#ffbd79');frame.save(D/f'{i:02}.png');frames.append(frame)
 frames[0].save(O/f'{clip}-comparison.gif',save_all=True,append_images=frames[1:],duration=[120,130]*12,loop=0)
 subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','8','-i',str(D/'%02d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(O/f'{clip}-comparison.mp4')],check=True)
print('MEDIA_COMPLETE',len(shots),'sheets, 5 actual 3s comparisons')
