"""Sophia 6G — conjunto ocular amendoado, conformado à superfície do crânio 6G.

Todas as camadas são construídas como z = H(x, y) + folga, onde H é a superfície frontal real
(interpolada dos vértices do crânio). Os alvos de morph incluem o deslocamento em z ao longo da
superfície, para não atravessar nem flutuar ao fechar.
Ordem dos alvos: Blink, Smile, BrowRaise, MouthOpen.
"""
import numpy as np

# folgas acima da pele (m)
OFF = dict(sclera=.0010, iris=.0019, catch=.0026, lower=.0031, upper=.0037, liner=.0043, lash=.0045)
E = dict(inner=(.028, .610), outer=(.108, .637), up=.0204, lo=.0126, band_up=.0105, band_lo=.0075,
         iris_t=.47, iris_dy=.0028, iris_rx=.0215, iris_ry=.0228, pupil_rx=.0082, pupil_ry=.0106,
         closed=.30)


def frame(s):
    ci = np.array([s * E['inner'][0], E['inner'][1]])
    co = np.array([s * E['outer'][0], E['outer'][1]])
    u = (co - ci) / np.linalg.norm(co - ci)
    nv = np.array([-u[1], u[0]]) * (1 if s > 0 else -1)  # perpendicular apontando para cima
    if nv[1] < 0:
        nv = -nv
    return ci, co, u, nv


def hu(t):
    t = np.clip(t, 0, 1)
    return E['up'] * np.sin(np.pi * t ** .88) ** .72


def ho(t):
    t = np.clip(t, 0, 1)
    return E['lo'] * np.sin(np.pi * t ** 1.08) ** .85


def base(s, t):
    ci, co, u, nv = frame(s)
    t = np.asarray(t, float)
    return ci[None] + t[:, None] * (co - ci)[None]


def grid_faces(n, m, flip=False):
    f = []
    for i in range(n - 1):
        for k in range(m - 1):
            a = i * m + k
            f += [[a, a + m, a + 1], [a + 1, a + m, a + m + 1]]
    f = np.array(f)
    return f[:, ::-1] if flip else f


def orient_front(v, f):
    cr = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    bad = cr[:, 2] < 0
    f = f.copy()
    f[bad] = f[bad][:, ::-1]
    return f


def lift(H, xy, off):
    z = H(xy[:, 0], xy[:, 1])
    return np.c_[xy, z + off]


def build_side(s, H):
    """Retorna dict nome -> (v, f, colors|None, [Blink, Smile, BrowRaise, MouthOpen])."""
    ci, co, u, nv = frame(s)
    out = {}
    NI = 97
    T = np.linspace(0, 1, NI)
    B = base(s, T)
    U = B + nv[None] * hu(T)[:, None]
    L = B - nv[None] * ho(T)[:, None]
    C = B - nv[None] * (E['closed'] * ho(T))[:, None]
    zero = lambda v: np.zeros_like(v)

    # ---------------- esclera (preenche a abertura, com 1 mm sob as pálpebras)
    K = 13
    xy = []
    for i in range(NI):
        for k in range(K):
            a = k / (K - 1)
            lo = L[i] - nv * .0010
            up = U[i] + nv * .0010
            xy.append(lo + (up - lo) * a)
    xy = np.array(xy)
    v = lift(H, xy, OFF['sclera'])
    f = orient_front(v, grid_faces(NI, K))
    col = np.tile([1., .985, .955, 1.], (len(v), 1))
    # sombra suave sob a pálpebra superior
    a = np.tile(np.linspace(0, 1, K), NI)
    col[:, :3] *= (1 - .22 * a ** 2)[:, None]
    blink = np.zeros_like(v)
    blink[:, 2] = -.0004
    out['sclera'] = (v, f, col, [blink, zero(v), zero(v), zero(v)])

    # ---------------- íris + pupila (disco radial recortado pela abertura)
    ic = base(s, [E['iris_t']])[0] + nv * E['iris_dy']
    xy = []
    col = []
    NR, NT = 25, 97
    tt = np.linspace(0, 1, NI)
    for r in np.linspace(0, 1, NR):
        for th in np.linspace(0, 2 * np.pi, NT):
            # pupila elíptica (r<.36) dentro da íris elíptica
            if r < .36:
                rr = r / .36
                p = ic + np.array([E['pupil_rx'] * rr * np.cos(th), E['pupil_ry'] * rr * np.sin(th)])
            else:
                rr = (r - .36) / .64
                rx = E['pupil_rx'] + (E['iris_rx'] - E['pupil_rx']) * rr
                ry = E['pupil_ry'] + (E['iris_ry'] - E['pupil_ry']) * rr
                p = ic + np.array([rx * np.cos(th), ry * np.sin(th)])
            # recorte pela abertura (1 mm de margem coberta pelo delineado/pálpebra)
            d = p - ci
            tl = np.clip(np.dot(d, u) / np.linalg.norm(co - ci), 0, 1)
            h = np.dot(d, nv)
            h = np.clip(h, -ho(tl) - .0006, hu(tl) + .0006)
            p = ci + u * np.dot(d, u) + nv * h
            xy.append(p)
            ang = np.sin(th)  # +1 topo, -1 base
            if r < .36:
                c = [.012, .006, .004]
            elif r > .93:
                c = [.16, .055, .010]
            else:
                ripple = .92 + .08 * np.sin(th * 47 + 5 * r)
                warm = np.array([.78, .40, .055]) if r > .55 else np.array([.55, .24, .03])
                c = warm * ripple * (.62 + .38 * (.5 - .5 * ang))  # sombra no topo, luz na base
            col.append([*c, 1])
    xy = np.array(xy)
    rr = np.repeat(np.linspace(0, 1, NR), NT)
    v = lift(H, xy, OFF['iris'] + .0004 * (1 - rr ** 2))
    f = orient_front(v, grid_faces(NR, NT))
    blink = np.zeros_like(v)
    blink[:, 2] = -.0007
    out['iris'] = (v, f, np.array(col), [blink, zero(v), zero(v), zero(v)])

    # ---------------- pálpebra superior (faixa de pele que desce até a linha fechada)
    K = 13
    band = E['band_up'] * np.sin(np.pi * np.clip(T, 0, 1)) ** .5 + .0022
    xo, xc, offs = [], [], []
    for i in range(NI):
        for k in range(K):
            a = k / (K - 1)
            xo.append(U[i] + nv * band[i] * a)
            xc.append(C[i] + (U[i] + nv * band[i] - C[i]) * a)
            offs.append(OFF['upper'] * (1 - a) + .0006 * a)
    xo = np.array(xo)
    xc = np.array(xc)
    offs = np.array(offs)
    v = lift(H, xo, offs)
    vc = lift(H, xc, offs)
    f = orient_front(v, grid_faces(NI, K))
    a = np.tile(np.linspace(0, 1, K), NI)
    # BrowRaise ergue só a dobra (parte alta da faixa); a borda fica fixa para não abrir fresta com Blink=1
    fold = np.clip((a - .15) / .85, 0, 1) ** .8
    brow = np.zeros_like(v)
    brow[:, :2] = nv * .0016 * fold[:, None] * np.repeat(np.sin(np.pi * T) ** .5, K)[:, None]
    brow = lift(H, xo + brow[:, :2], offs) - v
    out['upper_lid'] = (v, f, None, [vc - v, zero(v), brow, zero(v)])
    upper_edge_delta = (vc - v).reshape(NI, K, 3)[:, 0]
    upper_edge_brow = brow.reshape(NI, K, 3)[:, 0]

    # ---------------- pálpebra inferior
    bandl = E['band_lo'] * np.sin(np.pi * np.clip(T, 0, 1)) ** .5 + .0016
    xo, xc, xs, offs = [], [], [], []
    for i in range(NI):
        for k in range(K):
            a = k / (K - 1)
            bot = L[i] - nv * bandl[i]
            xo.append(L[i] + (bot - L[i]) * a)
            xc.append(C[i] - nv * .0006 + (bot - (C[i] - nv * .0006)) * a)
            sm = .0026 * np.sin(np.pi * T[i]) * (1 - a) ** 1.5
            xs.append(L[i] + (bot - L[i]) * a + nv * sm)
            offs.append(OFF['lower'] * (1 - a) + .0006 * a)
    xo, xc, xs, offs = map(np.array, (xo, xc, xs, offs))
    v = lift(H, xo, offs)
    f = orient_front(v, grid_faces(NI, K))
    out['lower_lid'] = (v, f, None, [lift(H, xc, offs) - v, lift(H, xs, offs) - v, zero(v), zero(v)])

    # ---------------- delineado superior com asa (traço espesso que afina)
    NL = 81
    tl = np.linspace(.03, 1.20, NL)
    pts, thick = [], []
    for t in tl:
        if t <= 1:
            p = base(s, [t])[0] + nv * (hu(t) - .0005)
            th = .0017 + .0027 * t ** 1.2
        else:
            q = (t - 1) / .20
            p = co + u * q * .016 + nv * q * .0085 - nv * .0005
            th = .0044 * (1 - q) ** 1.1 + .0002
        pts.append(p)
        thick.append(th)
    pts = np.array(pts)
    thick = np.array(thick)
    xo = []
    for i in range(NL):
        xo.append(pts[i])
        xo.append(pts[i] + nv * thick[i])
    xo = np.array(xo)
    v = lift(H, xo, OFF['liner'])
    f = orient_front(v, grid_faces(NL, 2))
    # morph: segue a borda da pálpebra (interpolando em t); asa fixa
    ue = np.zeros((NL, 3))
    ub = np.zeros((NL, 3))
    for d in range(3):
        ue[:, d] = np.interp(np.clip(tl, 0, 1), T, upper_edge_delta[:, d]) * (tl <= 1)
        ub[:, d] = np.interp(np.clip(tl, 0, 1), T, upper_edge_brow[:, d]) * (tl <= 1)
    blink = np.repeat(ue, 2, axis=0)
    browd = np.repeat(ub, 2, axis=0)
    # recalcular z na posição deslocada para manter a folga
    vb = lift(H, xo + blink[:, :2], OFF['liner'] + .0003)
    out['liner'] = (v, f, None, [vb - v, zero(v), zero(v), zero(v)])

    # ---------------- 3 cílios no canto externo + traço inferior externo
    lashes = []
    for k, (t0, ln, ang) in enumerate([(.80, .0085, .55), (.89, .0100, .35), (.965, .0105, .18)]):
        p0 = base(s, [t0])[0] + nv * (hu(t0) + .0006)
        dirv = u * np.cos(ang) + nv * np.sin(ang)
        xo = []
        NQ = 9
        for q in range(NQ):
            a = q / (NQ - 1)
            c = p0 + dirv * ln * a + nv * .0022 * a ** 2
            w = .0010 * (1 - a) + .00012
            side = np.array([-dirv[1], dirv[0]])
            xo += [c - side * w, c + side * w]
        xo = np.array(xo)
        v = lift(H, xo, OFF['lash'])
        f = orient_front(v, grid_faces(NQ, 2))
        dlt = np.array([np.interp(t0, T, upper_edge_delta[:, d]) for d in range(3)])
        dbr = np.array([np.interp(t0, T, upper_edge_brow[:, d]) for d in range(3)])
        vb = lift(H, xo + dlt[:2], OFF['lash'] + .0003)
        lashes.append((v, f, None, [vb - v, zero(v), zero(v), zero(v)]))
    # traço inferior externo (lash_4): acompanha a borda inferior de t=.50 a 1.0
    NL2 = 41
    tl2 = np.linspace(.50, 1.0, NL2)
    xo = []
    for t in tl2:
        p = base(s, [t])[0] - nv * (ho(t) - .0002)
        th = .00025 + .0009 * ((t - .5) / .5) ** 1.3
        xo += [p, p - nv * th]
    xo = np.array(xo)
    v = lift(H, xo, OFF['lower'] + .0004)
    f = orient_front(v, grid_faces(NL2, 2))
    # fecha com a pálpebra inferior; sobe no Smile
    a_close = []
    a_sm = []
    for t in tl2:
        i = np.argmin(abs(T - t))
        cl = (C[i] - nv * .0006) - L[i]
        sm = nv * .0026 * np.sin(np.pi * t)
        a_close += [cl, cl]
        a_sm += [sm, sm]
    a_close = np.array(a_close)
    a_sm = np.array(a_sm)
    vb = lift(H, xo + a_close, OFF['lower'] + .0004)
    vs = lift(H, xo + a_sm, OFF['lower'] + .0004)
    lashes.append((v, f, None, [vb - v, vs - v, zero(v), zero(v)]))
    out['lashes'] = lashes

    # ---------------- 2 reflexos (luz principal vem de +x, alto)
    cats = []
    for dx, dy, rad in [(.0062, .0072, .0030), (-.0050, -.0062, .0013)]:
        xo = []
        for r in (0, 1):
            for th in np.linspace(0, 2 * np.pi, 33):
                xo.append(ic + np.array([dx + rad * r * np.cos(th), dy + rad * r * np.sin(th)]))
        xo = np.array(xo)
        v = lift(H, xo, OFF['catch'])
        f = orient_front(v, grid_faces(2, 33))
        b = np.zeros_like(v)
        b[:, 2] = -.0012
        cats.append((v, f, None, [b, zero(v), zero(v), zero(v)]))
    out['catch'] = cats
    out['frame'] = dict(ci=ci, co=co, u=u, nv=nv, ic=ic, U=U, L=L, C=C, T=T)
    return out
