"""Sophia 6G — mechas afiladas e achatadas, enraizadas no crânio 6G, geradas com desvio de colisão.

Cada mecha: linha central (Bézier cúbica) partindo 3 mm abaixo da pele, seção lenticular achatada
(espessura ~0.3 da largura), perfil de largura em folha (estreita na raiz, cheia no primeiro terço,
ponta afilada) e leve concavidade. A cor escurece na raiz (oclusão) para integrar à pele.

Aceitação: a mecha (com todas as amostras de pose dos acessórios no referencial da cabeça) precisa
manter folga mínima CLEAR da nuvem proibida; senão é encurtada/inclinada iterativamente; se ainda
falhar, é descartada (registrado no relatório).
"""
import numpy as np
from scipy.spatial import cKDTree

CLEAR = .0030
ROOT = np.array([.80, .755, .69])   # cor relativa na raiz (multiplica a cor da pele)
SKIN = np.array([.94, .90, .83])


def bezier(P, t):
    t = t[:, None]
    return ((1 - t) ** 3) * P[0] + 3 * ((1 - t) ** 2) * t * P[1] + 3 * (1 - t) * t * t * P[2] + t ** 3 * P[3]


def lock_mesh(root, n, g, L, w, lift=.25, bend=None, twist=0.0, cup=.30, rings=12, segs=8, thick=.36):
    """root: ponto na pele; n: normal da pele; g: direção desejada (unit); L: comprimento; w: largura."""
    n = n / np.linalg.norm(n)
    g = g / np.linalg.norm(g)
    side = np.cross(g, n)
    if np.linalg.norm(side) < 1e-6:
        side = np.cross(g, [0, 0, 1.])
    side /= np.linalg.norm(side)
    bend = np.zeros(3) if bend is None else np.asarray(bend, float)
    P = np.array([root - n * .0030,
                  root + g * L * .30 + n * L * lift * .55,
                  root + g * L * .68 + n * L * lift * .80 + bend * .6,
                  root + g * L * 1.0 + n * L * lift * .70 + bend])
    T = np.linspace(0, 1, rings)
    C = bezier(P, T)
    tg = np.gradient(C, axis=0)
    tg /= np.linalg.norm(tg, axis=1, keepdims=True)
    V = []
    for i, t in enumerate(T):
        # perfil de chama: raiz larga (embutida), máximo ~20%, ponta afilada
        prof = (1 - t) ** 1.05 * (.62 + .38 * np.sin(np.pi * min(t * 2.4, 1) * .5)) + (.03 if t < 1 else 0)
        ww = w * prof
        sd = side - tg[i] * np.dot(side, tg[i])
        sd /= np.linalg.norm(sd)
        tw = twist * t
        sd = sd * np.cos(tw) + np.cross(tg[i], sd) * np.sin(tw)
        nn = np.cross(sd, tg[i])
        for k in range(segs):
            a = 2 * np.pi * k / segs
            cx = np.cos(a)
            V.append(C[i] + sd * cx * ww + nn * (np.sin(a) * ww * thick - cup * ww * (cx ** 2 - .5) * .5))
    V = np.array(V)
    F = []
    for i in range(rings - 1):
        for k in range(segs):
            a = i * segs + k
            b = i * segs + (k + 1) % segs
            F += [[a, a + segs, b], [b, a + segs, b + segs]]
    # tampa da raiz (escondida na pele) e ponta colapsada
    for k in range(1, segs - 1):
        F.append([0, k + 1, k])
    last = (rings - 1) * segs
    for k in range(1, segs - 1):
        F.append([last, last + k, last + k + 1])
    F = np.array(F)
    tpar = np.repeat(T, segs)
    return V, F, tpar, C


class Builder:
    def __init__(self, head_v, head_n, forbid_pts, skull_check=True):
        self.hv = head_v
        self.hn = head_n
        self.ht = cKDTree(head_v)
        self.ft = cKDTree(forbid_pts) if len(forbid_pts) else None
        self.locks = []
        self.log = []

    def surface(self, q):
        d, i = self.ht.query(q)
        return self.hv[i], self.hn[i]

    def clearance(self, V, tpar):
        if self.ft is None:
            return np.inf
        d, _ = self.ft.query(V, distance_upper_bound=.02)
        return float(d.min())

    def inside_skull(self, V, tpar):
        # pontos além da raiz que voltam para dentro do crânio
        sel = tpar > .22
        d, i = self.ht.query(V[sel])
        s = ((V[sel] - self.hv[i]) * self.hn[i]).sum(1)
        return int((s < -.0006).sum())

    def add(self, name, q, g, L, w, **kw):
        root, n = self.surface(np.asarray(q, float))
        g = np.asarray(g, float)
        best = None
        for attempt in range(14):
            V, F, tpar, C = lock_mesh(root, n, g, L, w, **kw)
            cl = self.clearance(V, tpar)
            ins = self.inside_skull(V, tpar)
            if cl >= CLEAR and ins == 0:
                best = (V, F, tpar)
                break
            # ajuste: encurtar e afastar da pele/levantar
            if ins:
                kw['lift'] = kw.get('lift', .25) + .08
            else:
                L *= .88
                w *= .96
        if best is None:
            self.log.append({'lock': name, 'status': 'descartada', 'clearance_mm': cl * 1000, 'inside': ins})
            return False
        self.locks.append((name, root, n, best[0], best[1], best[2]))
        self.log.append({'lock': name, 'status': 'ok', 'attempts': attempt + 1, 'length_mm': L * 1000,
                         'width_mm': w * 1000, 'clearance_mm': (cl if np.isfinite(cl) else None) and cl * 1000})
        return True

    def mesh(self):
        V, F, C, R = [], [], [], []
        off = 0
        for name, root, n, v, f, t in self.locks:
            V.append(v)
            F.append(f + off)
            shade = ROOT[None] + (1 - ROOT[None]) * (np.clip(t / .45, 0, 1) ** .8)[:, None]
            col = np.c_[SKIN[None] * shade, np.ones(len(v))]
            C.append(col)
            R.append(np.tile(root, (len(v), 1)))
            off += len(v)
        return np.vstack(V), np.vstack(F), np.vstack(C), np.vstack(R)


def rot(g, axis, ang):
    axis = np.asarray(axis, float) / np.linalg.norm(axis)
    g = np.asarray(g, float)
    return g * np.cos(ang) + np.cross(axis, g) * np.sin(ang) + axis * np.dot(axis, g) * (1 - np.cos(ang))


def clump(b, rng, name, q, g, L, w, n_sub=3, spread=.35, **kw):
    """Tufo: mecha principal + n_sub menores com raízes vizinhas e direções em leque."""
    q = np.asarray(q, float)
    g = np.asarray(g, float) / np.linalg.norm(g)
    root, n = b.surface(q)
    side = np.cross(g, n)
    side /= max(np.linalg.norm(side), 1e-9)
    b.add(name, q, g, L, w, **kw)
    for k in range(n_sub):
        sgn = -1 if k % 2 else 1
        o = side * sgn * w * (.55 + .25 * k) + g * w * rng.uniform(-.2, .4)
        gg = rot(g, n, sgn * spread * (.6 + .5 * rng.random()))
        kk = dict(kw)
        kk['twist'] = kw.get('twist', 0) + rng.uniform(-.5, .5)
        kk['lift'] = kw.get('lift', .25) + rng.uniform(-.05, .08)
        b.add(f'{name}.{k}', root + o, gg, L * rng.uniform(.52, .82), w * rng.uniform(.62, .85), **kk)


def plan(b, rng):
    """Distribuição em tufos: topete, bochechas/mandíbula, nuca, base das orelhas."""
    J = lambda s=1.0: rng.uniform(-1, 1) * s
    # ---- topete: tufo central macio, varrido para trás; frente curta; camadas rentes no topo
    crown = [
        (0.000, .080, (0, .78, .62), .024, .019, 2, .07),
        (.027, .074, (.30, .80, .52), .022, .018, 2, .07),
        (-.028, .073, (-.32, .79, .52), .023, .018, 2, .07),
        (.052, .056, (.58, .74, .34), .024, .017, 2, .08),
        (-.053, .055, (-.60, .72, .34), .024, .017, 2, .08),
        (.004, .050, (.04, .93, .36), .054, .024, 4, .22),
        (.032, .040, (.40, .86, .32), .046, .021, 3, .20),
        (-.032, .040, (-.42, .85, .31), .046, .021, 3, .20),
        (-.004, .018, (0, .80, -.60), .052, .023, 3, .16),
        (.040, .006, (.52, .62, -.58), .042, .020, 2, .12),
        (-.041, .006, (-.54, .60, -.58), .042, .020, 2, .12),
        (.016, -.030, (.14, .40, -.90), .046, .021, 3, .08),
        (-.018, -.034, (-.18, .38, -.90), .045, .021, 3, .08),
        (.046, -.040, (.50, .30, -.81), .040, .019, 2, .08),
        (-.047, -.042, (-.52, .28, -.81), .040, .019, 2, .08),
        (.000, -.070, (0, .05, -1.0), .042, .020, 2, .06),
        (.032, -.078, (.36, .02, -.93), .038, .018, 2, .06),
        (-.033, -.078, (-.38, .02, -.93), .038, .018, 2, .06),
    ]
    for i, (x, z, g, L, w, ns, lift) in enumerate(crown):
        g = np.array(g) + np.array([J(.06), J(.04), J(.05)])
        clump(b, rng, f'crown_{i}', [x, .83, z], g, L * (1 + J(.08)), w * (1 + J(.08)), n_sub=ns, spread=.42,
              lift=lift + J(.03), bend=np.array([0, -.003, -.007]), twist=J(.4), cup=.38)
    # ---- bochechas/mandíbula: tufos em camadas, pontas para fora e para baixo
    cheek = [
        (.128, .620, .070, (.86, -.08, .30), .038, .017, 2),
        (.142, .600, .050, (.90, -.30, .16), .050, .019, 3),
        (.136, .580, .066, (.80, -.50, .30), .054, .020, 3),
        (.118, .562, .082, (.62, -.68, .36), .050, .019, 3),
        (.094, .548, .096, (.40, -.84, .40), .040, .017, 2),
        (.066, .540, .104, (.22, -.92, .32), .032, .015, 2),
        (.150, .602, .010, (.88, -.38, -.22), .050, .019, 3),
        (.146, .578, -.025, (.78, -.52, -.34), .048, .018, 3),
        (.128, .556, .040, (.68, -.70, .10), .048, .018, 3),
        (.110, .546, .062, (.52, -.82, .18), .042, .016, 2),
    ]
    for s in (1, -1):
        for i, (x, y, z, g, L, w, ns) in enumerate(cheek):
            g = np.array([s * g[0], g[1], g[2]]) + np.array([J(.05), J(.04), J(.04)])
            clump(b, rng, f'cheek_{"L" if s > 0 else "R"}_{i}', [s * x, y, z + .03], g, L * (1 + J(.07)),
                  w * (1 + J(.07)), n_sub=ns, spread=.30, lift=.16 + J(.03), bend=np.array([0, -.007, 0]),
                  twist=s * J(.35))
    # ---- nuca: duas fileiras cobrindo a transição cabeça–pescoço por trás
    for row, (y, L, w) in enumerate([(.700, .048, .020), (.650, .056, .020), (.598, .050, .019)]):
        for a in np.radians(np.linspace(-70, 70, 6) if row == 0 else np.linspace(-75, 75, 7 if row == 1 else 6)):
            a = a + J(.06)
            x, z = .15 * np.sin(a), -.15 * np.cos(a)
            g = np.array([np.sin(a) * .55, -.78, -np.cos(a) * .40])
            clump(b, rng, f'nape_{row}_{int(np.degrees(a))}', [x, y, z], g, L * (1 + J(.08)), w * (1 + J(.08)),
                  n_sub=2, spread=.30, lift=.14, bend=np.array([0, -.006, 0]), twist=J(.4))
    # ---- base interna das orelhas (liga topete e orelha)
    for s in (1, -1):
        for i, (x, y, z, g, L, w) in enumerate([(.062, .775, .040, (.45, .85, .20), .030, .013),
                                                (.075, .760, .015, (.60, .78, -.10), .028, .012)]):
            clump(b, rng, f'earbase_{"L" if s > 0 else "R"}_{i}', [s * x, y + .03, z],
                  np.array([s * g[0], g[1], g[2]]), L, w, n_sub=1, spread=.3, lift=.30, twist=J(.4))
