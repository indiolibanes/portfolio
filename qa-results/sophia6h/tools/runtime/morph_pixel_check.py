"""Compara renders do renderer real (morph-viewer.cjs): quantos pixels mudam entre pesos 0 e 1 e onde.
Uso: python3 morph_pixel_check.py DIR_RENDERS [SAIDA.json]
Um morph só é dado como "visível no runtime" se mudar > MIN_PIXELS pixels (|Δ| > 12/255 em algum canal)
na imagem renderizada pelo gltf-gl.js — não basta existir morphWeights.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

MIN_PIXELS = 200
d = Path(sys.argv[1])
ref = np.asarray(Image.open(d / 'rest_neutral.png').convert('RGB')).astype(int)
out = {}
for name in ['blink_1', 'smile_1', 'browraise_1', 'mouthopen_1', 'blink_smile_brow', 'smile_mouthopen', 'all_1']:
    p = d / f'{name}.png'
    if not p.exists():
        continue
    im = np.asarray(Image.open(p).convert('RGB')).astype(int)
    diff = np.abs(im - ref).max(2) > 12
    ys, xs = np.where(diff)
    out[name] = {'changed_pixels': int(diff.sum()), 'visible': bool(diff.sum() > MIN_PIXELS),
                 'bbox_xywh': None if not len(xs) else [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]}
# clipes: quadro no pico de Blink do próprio clipe (pesos vindos do canal "weights") vs o MESMO quadro com pesos 0
for p in sorted(d.glob('clip_*_blinkpeak.png')):
    clip = p.name[len('clip_'):-len('_blinkpeak.png')]
    q = d / f'clip_{clip}_noblink_frame.png'
    if not q.exists():
        continue
    a = np.asarray(Image.open(p).convert('RGB')).astype(int)
    b = np.asarray(Image.open(q).convert('RGB')).astype(int)
    diff = np.abs(a - b).max(2) > 12
    out[f'clip_{clip}_blink_from_channel'] = {'changed_pixels': int(diff.sum()), 'visible': bool(diff.sum() > MIN_PIXELS)}
    r = d / f'clip_{clip}_expr_smile.png'
    if r.exists():
        c = np.asarray(Image.open(r).convert('RGB')).astype(int)
        dd = np.abs(c - a).max(2) > 12
        out[f'clip_{clip}_expressions_over_clip'] = {'changed_pixels': int(dd.sum()), 'visible': bool(dd.sum() > MIN_PIXELS)}
print(json.dumps(out, indent=1))
if len(sys.argv) > 2:
    Path(sys.argv[2]).write_text(json.dumps(out, indent=1))
