"""Nuvem para escavar o crânio: acessórios das orelhas (153–230), colarinho/lapelas/laço (121–145) e
jaleco/forro/guarnições (4, 5, 12; y>.44), no referencial da cabeça, repouso + 5 clipes x 12 instantes.
Grade de 0,4 mm, restrita à região do crânio/pescoço."""
import sys, numpy as np
from sophia_motion_runtime import MotionModel
from forbidden import sample_tris, head_local
path, out = sys.argv[1], sys.argv[2]
m = MotionModel(path)
prims = list(range(153, 231)) + list(range(121, 146)) + [4, 5, 12]
poses = [(None, 0.0)] + [(ai, float(t)) for ai, a in enumerate(m.animations) for t in np.linspace(0, a['duration'], 12, endpoint=False)]
allp = []
for n_, (ai, t) in enumerate(poses):
    P = head_local(m, ai, t, prims)
    for k in prims:
        f = m.primitives[k]['f']
        c = P[k][f].mean(1)
        f = f[(c[:, 1] > .44) & (np.abs(c[:, 0]) < .22) & (c[:, 1] < .86)]
        if not len(f):
            continue
        pts = sample_tris(P[k], f, step=.0008)
        pts = pts[(pts[:, 1] > .45)]
        allp.append(np.unique(np.floor(pts / .0004).astype(np.int32), axis=0))
    if n_ % 10 == 0:
        allp = [np.unique(np.vstack(allp), axis=0)]
q = np.unique(np.vstack(allp), axis=0)
np.save(out, ((q.astype(np.float32) + .5) * .0004))
print(len(q), 'pontos', len(poses), 'poses')
