#!/usr/bin/env python3
"""Avalia, SEM publicar nada, o custo/qualidade de reduzir as texturas de um GLB de 4K para 2K.
Uso: texture-2k-eval.py --glb <cópia local autorizada> --out <pasta fora do repositório> [--max 2048]
Não altera o GLB, geometria, rig, UVs ou animações; só decodifica as imagens, reduz em memória e compara.
Saída: tabela (memória de GPU estimada com mipmaps, PSNR do ida-e-volta) + recortes lado a lado em --out
para o proprietário conferir olhos, estrela da testa e bordados antes de qualquer decisão."""
import argparse, io, json, math, os, struct, sys
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('--glb', required=True); ap.add_argument('--out', required=True); ap.add_argument('--max', type=int, default=2048)
a = ap.parse_args()
repo = os.path.realpath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
if os.path.realpath(a.out).startswith(repo + os.sep): sys.exit('recuse: --out dentro do repositório (as variantes não podem ser publicadas)')
os.makedirs(a.out, exist_ok=True)
b = open(a.glb, 'rb').read(); jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl])
off = 20 + jl + 8; binb = b[off:]
mb = lambda w, h: w * h * 4 * 4 / 3 / 1048576  # RGBA8 + cadeia de mipmaps
rows = []; tot0 = tot1 = 0
for i, im in enumerate(j['images']):
    v = j['bufferViews'][im['bufferView']]; raw = binb[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    img = Image.open(io.BytesIO(raw)); img.load(); w, h = img.size; s = min(1, a.max / max(w, h))
    w2, h2 = max(1, round(w * s)), max(1, round(h * s)); small = img.resize((w2, h2), Image.LANCZOS) if s < 1 else img
    back = small.resize((w, h), Image.LANCZOS).convert('RGBA') if s < 1 else img.convert('RGBA'); ref = img.convert('RGBA')
    mse = sum(sum((p - q) ** 2 for p, q in zip(x, y)) for x, y in zip(ref.resize((256, 256)).getdata(), back.resize((256, 256)).getdata())) / (256 * 256 * 4)
    psnr = 99.0 if mse == 0 else 10 * math.log10(255 * 255 / mse)
    rows.append((im.get('name', str(i)), f'{w}x{h}', f'{w2}x{h2}', round(len(raw) / 1024), round(mb(w, h), 1), round(mb(w2, h2), 1), round(psnr, 1)))
    tot0 += mb(w, h); tot1 += mb(w2, h2)
    sbs = Image.new('RGBA', (min(w, 1024) * 2, min(h, 1024)), (0, 0, 0, 0)); cw, ch = min(w, 1024), min(h, 1024)
    sbs.paste(ref.crop((0, 0, cw, ch)), (0, 0)); sbs.paste(back.crop((0, 0, cw, ch)), (cw, 0)); sbs.save(os.path.join(a.out, f'{i:02d}-{im.get("name", i)}-orig-vs-2k.png'))
print(f'{"imagem":34}{"original":>11}{"alvo":>11}{"KB":>7}{"GPU MB":>8}{"→":>3}{"MB":>6}{"PSNR dB":>9}')
for r in rows: print(f'{r[0]:34}{r[1]:>11}{r[2]:>11}{r[3]:>7}{r[4]:>8}{"":>3}{r[5]:>6}{r[6]:>9}')
print(f'TOTAL memória de GPU estimada (RGBA8+mips): {tot0:.1f} MB → {tot1:.1f} MB')
print('PSNR é só um indício global: a decisão exige olhar os recortes (olhos, estrela da testa, bordados).')
