"""Nuvem de pontos 'proibida' no referencial de repouso da cabeça: acessórios e orelhas amostrados
em repouso e ao longo das cinco animações (pontos densos sobre os triângulos)."""
import sys, numpy as np
from sophia_motion_runtime import MotionModel

def sample_tris(v, f, step=.0006):
    T = v[f]
    pts = [T.reshape(-1, 3)]
    e = np.maximum(np.linalg.norm(T[:, 1] - T[:, 0], axis=1), np.linalg.norm(T[:, 2] - T[:, 0], axis=1))
    for ti in np.where(e > step)[0]:
        n = int(np.ceil(e[ti] / step))
        a, b = np.meshgrid(np.linspace(0, 1, n + 1), np.linspace(0, 1, n + 1))
        m = a + b <= 1
        a, b = a[m], b[m]
        t = T[ti]
        pts.append(t[0] + a[:, None] * (t[1] - t[0]) + b[:, None] * (t[2] - t[0]))
    return np.vstack(pts)

def head_local(m, ai, t, prims, head_node=5):
    W0, _ = m.worlds()
    P = m.pose(ai, t, selection=prims)
    if ai is None:
        return P
    W, _ = m.worlds(ai, t)
    M = np.linalg.inv(W[head_node] @ np.linalg.inv(W0[head_node]))
    return {k: (np.c_[v, np.ones(len(v))] @ M.T)[:, :3] for k, v in P.items()}

def build(path, prims, nt=10):
    m = MotionModel(path)
    clouds = []
    poses = [(None, 0.0)] + [(ai, float(t)) for ai, a in enumerate(m.animations) for t in np.linspace(0, a['duration'], nt, endpoint=False)]
    for ai, t in poses:
        P = head_local(m, ai, t, prims)
        for k in prims:
            clouds.append(sample_tris(P[k], m.primitives[k]['f']))
    return np.vstack(clouds), len(poses)

if __name__ == '__main__':
    acc = list(range(153, 231))
    pts, n = build(sys.argv[1], acc)
    np.save(sys.argv[2], pts.astype(np.float32))
    print(len(pts), 'points over', n, 'poses', pts.min(0), pts.max(0))
