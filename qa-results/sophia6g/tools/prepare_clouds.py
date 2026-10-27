"""Gera as nuvens de colisão usadas por patch_6g.py (determinístico; ~25 min em CPU).
Uso: python prepare_clouds.py Sophia_6F_visual_candidate.glb PASTA_WORK
Saídas: forbid_head.npy (mechas), forbid_skull.npy (escavação queixo/pescoço, todas as poses),
        forbid_skull_rest.npy (escavação em repouso)."""
import sys, subprocess, numpy as np
from pathlib import Path
from sophia_motion_runtime import MotionModel
from forbidden import sample_tris
glb, work = sys.argv[1], Path(sys.argv[2])
work.mkdir(parents=True, exist_ok=True)
here = Path(__file__).parent
subprocess.run([sys.executable, str(here / 'forbidden_all.py'), glb, str(work / 'forbid.npy')], check=True)
p = np.load(work / 'forbid.npy', mmap_mode='r')
sel = (p[:, 1] > .47) & (np.abs(p[:, 0]) < .27) & (p[:, 2] > -.24)
g = np.unique(np.floor(np.asarray(p[sel]) / .0006).astype(np.int32), axis=0)
np.save(work / 'forbid_head.npy', ((g + .5) * .0006).astype(np.float32))
(work / 'forbid.npy').unlink()
subprocess.run([sys.executable, str(here / 'forbidden_skull.py'), glb, str(work / 'forbid_skull.npy')], check=True)
m = MotionModel(glb)
pts = []
for k in list(range(153, 231)) + list(range(121, 146)) + [4, 5, 12]:
    d = m.primitives[k]
    f = d['f']
    c = d['v'][f].mean(1)
    f = f[(c[:, 1] > .44) & (np.abs(c[:, 0]) < .22) & (c[:, 1] < .86)]
    if len(f):
        pts.append(sample_tris(d['v'], f, step=.0006))
q = np.vstack(pts)
np.save(work / 'forbid_skull_rest.npy', q[q[:, 1] > .45].astype(np.float32))
print('ok', work)
