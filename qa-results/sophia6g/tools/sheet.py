"""sheet.py out.png cols cell_px label1=path1 label2=path2 ..."""
import sys
from PIL import Image,ImageDraw,ImageFont
out,cols,cell=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]);items=[a.split('=',1) for a in sys.argv[4:]]
try:font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',max(12,cell//28))
except Exception:font=ImageFont.load_default()
rows=(len(items)+cols-1)//cols;H=cell+cell//14
sh=Image.new('RGB',(cols*cell,rows*H),(36,40,50));d=ImageDraw.Draw(sh)
for i,(lab,p) in enumerate(items):
    im=Image.open(p).convert('RGB');im.thumbnail((cell,cell));x=(i%cols)*cell;y=(i//cols)*H
    sh.paste(im,(x,y+H-cell));d.text((x+8,y+3),lab,fill=(235,235,235),font=font)
sh.save(out)
