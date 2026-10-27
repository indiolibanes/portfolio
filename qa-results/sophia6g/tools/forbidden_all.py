"""Pré-computa a nuvem proibida no referencial de repouso da cabeça, em repouso + 5 clipes x 12 instantes.
Inclui: acessórios das orelhas (153–230), anéis de pelo (147–152), sobreposições (255–256), orelhas
(faces de 0/261 com peso de ear_*), colarinho/lapelas/laço (121–145), jaleco e forro (4/5), guarnições (12),
mãos/braços (faces de 0/261 com peso de braço), punhos (257–260), caderno e pena (meshes 1 e 2).
Somente faces cujo centróide fica na região da cabeça/pescoço (y > .40 no referencial da cabeça).
Saída: pontos reduzidos por grade de 0,4 mm."""
import sys, numpy as np
from sophia_motion_runtime import MotionModel
from forbidden import sample_tris, head_local

path, out = sys.argv[1], sys.argv[2]
m = MotionModel(path)
jn = m.joint_names
earj = np.array([n.startswith('ear_') for n in jn])
armj = np.array([n.startswith(('upper_arm', 'forearm', 'hand', 'fingers', 'thumb', 'clavicle')) for n in jn])
whole = list(range(147, 231)) + [255, 256] + list(range(121, 146)) + [4, 5, 12] + [257, 258, 259, 260]
whole += [i for i, d in enumerate(m.primitives) if d['mesh'] in (1, 2)]
sel = {}
for pi in (0, 261):
    d = m.primitives[pi]
    wear = (d['we'] * earj[d['jo']]).sum(1)
    warm = (d['we'] * armj[d['jo']]).sum(1)
    f = d['f']
    sel[pi] = f[(wear[f] > .3).any(1) | (warm[f] > .3).any(1)]
prims = whole + [0, 261]
poses = [(None, 0.0)] + [(ai, float(t)) for ai, a in enumerate(m.animations) for t in np.linspace(0, a['duration'], 12, endpoint=False)]
allp = []
for n_, (ai, t) in enumerate(poses):
    P = head_local(m, ai, t, prims)
    for k in prims:
        f = sel[k] if k in sel else m.primitives[k]['f']
        c = P[k][f].mean(1)
        f = f[(c[:, 1] > .40) & (np.abs(c[:, 0]) < .32)]
        if not len(f):
            continue
        pts = sample_tris(P[k], f, step=.0008)
        pts = pts[(pts[:, 1] > .40)]
        allp.append(np.unique(np.floor(pts / .0004).astype(np.int32), axis=0))
    if n_ % 10 == 0:
        allp = [np.unique(np.vstack(allp), axis=0)]
        print(n_, len(allp[0]), flush=True)
q = np.unique(np.vstack(allp), axis=0)
pts = (q.astype(np.float32) + .5) * .0004
np.save(out, pts)
print(len(pts), 'pontos (grade 0,4 mm) de', len(poses), 'poses')
