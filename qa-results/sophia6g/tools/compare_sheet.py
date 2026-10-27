"""Prancha Comparacao_6F_6G.png: linhas = vistas; colunas = 6F | 6G | referência (quando houver enquadramento).
Uso: python compare_sheet.py RENDERS_6F RENDERS_6G REF_IMG REF_FRAMES_DIR OUT.png
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

r6f, r6g, ref_img, frames, out = map(Path, sys.argv[1:6])
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font = ImageFont.truetype(FONT, 22)
small = ImageFont.truetype(FONT, 17)
C = 420
rows = [
    ('Frontal', 'front', ('img', (250, 60, 1050, 1250))),
    ('Três-quartos', 'threequarters', ('frame', 'f_0.8.png', (330, 0, 1010, 720))),
    ('Perfil esquerdo', 'profile_L', ('frame', 'f_4.0.png', (330, 0, 1010, 720))),
    ('Perfil direito', 'profile_R', None),
    ('Costas', 'back', ('frame', 'f_6.0.png', (330, 0, 1010, 720))),
    ('Rosto', 'face', ('img', (300, 150, 960, 700))),
    ('Rosto — material neutro', 'face_clay', None),
    ('Rosto — perfil', 'face_profile_L', ('frame', 'f_4.0.png', (520, 20, 900, 400))),
    ('Olhos', 'eyes', ('img', (430, 320, 830, 560))),
    ('Orelha', 'ear_close_R', ('img', (680, 180, 900, 560))),
    ('Pelagem (3/4 da cabeça)', 'fur', ('frame', 'f_1.6.png', (440, 20, 900, 420))),
    ('Pose Write', 'write_pose', ('img', (280, 520, 800, 900))),
    ('Cauda', 'tail', ('img', (700, 480, 1220, 1120))),
]
W = 3 * C + 270
H = len(rows) * (C + 10) + 100
sh = Image.new('RGB', (W, H), (34, 38, 48))
d = ImageDraw.Draw(sh)
for j, lab in enumerate(['6F (base)', '6G (candidata)', 'Referência']):
    d.text((270 + j * C + 10, 16), lab, fill=(240, 240, 240), font=font)
ref = Image.open(ref_img).convert('RGB')
for i, (lab, key, rs) in enumerate(rows):
    y = 60 + i * (C + 10)
    d.text((10, y + C // 2 - 12), lab, fill=(230, 230, 230), font=small)
    for j, root in enumerate([r6f, r6g]):
        p = root / f'{key}.png'
        if p.exists():
            im = Image.open(p).convert('RGB').resize((C, C))
            sh.paste(im, (270 + j * C, y))
    if rs:
        if rs[0] == 'img':
            im = ref.crop(rs[1])
        else:
            im = Image.open(frames / rs[1]).convert('RGB').crop(rs[2])
        im.thumbnail((C, C))
        bg = Image.new('RGB', (C, C), (34, 38, 48))
        bg.paste(im, ((C - im.width) // 2, (C - im.height) // 2))
        sh.paste(bg, (270 + 2 * C, y))
    else:
        d.text((270 + 2 * C + 20, y + C // 2), '— sem enquadramento equivalente —', fill=(150, 150, 150), font=small)
d.text((10, H - 34), 'Three.js r186, câmeras ortográficas idênticas, ACES exposição 1, mesma iluminação; a referência é ilustração/vídeo e não equivale pixel a pixel.',
       fill=(170, 170, 170), font=small)
sh.save(out, optimize=True)
print(out, sh.size)
