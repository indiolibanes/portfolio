"""Sophia — Fase 6G. Reconstrução facial/estrutural determinística a partir da 6F auditada.

Uso: python patch_6g.py Sophia_6F_visual_candidate.glb Sophia_6G_visual_candidate.glb [--steps a,b,c]
Sem Blender: geometria gerada e transferida em numpy/scipy; rig, imagens e UVs originais preservados.
"""
import sys, json, hashlib, argparse
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from scipy.interpolate import LinearNDInterpolator

sys.path.insert(0, str(Path(__file__).parent))
from glbio3 import GLB
from g6lib import Writer
import head6g
import eyes6g
import locks6g
import tail6g
import copy

BASE_SHA = 'ad7f751ef5584172441a7e6601543dbcc407d3e9e141af06458652e4277b177a'
SKIN_COLOR = [.94, .90, .83, 1.]
import os
WORK = Path(os.environ.get('SOPHIA6G_WORK', Path(__file__).parent.parent / 'work'))


def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


class Ctx:
    def __init__(self, src):
        self.m = GLB(src)
        assert hashlib.sha256(self.m.raw).hexdigest() == BASE_SHA, 'base SHA-256 inesperado'
        self.w = Writer(self.m)
        self.j = self.m.j
        self.jn = [self.j['nodes'][k]['name'] for k in self.j['skins'][0]['joints']]
        self.J = {n: i for i, n in enumerate(self.jn)}
        self.H = None  # interpolador da superfície frontal da cabeça


FORBID_SKULL = WORK / 'forbid_skull_rest.npy'


def carve_skull(v, f, clear=.0015, k=48, iters=10, cap=.005, cloud_path=None, region=None):
    """Afunda o crânio localmente onde acessórios/colarinho/jaleco, na pose de repouso, ficariam a menos
    de `clear` da pele (teto acumulado `cap`). Fora da máscara facial frontal. Cruzamentos que só surgem
    nas animações (balanço das correntes/fitas, inclinação da cabeça) são medidos e declarados na auditoria."""
    from scipy.sparse import coo_matrix
    cp = cloud_path or FORBID_SKULL
    if not Path(cp).exists():
        return v, {'status': 'nuvem ausente'}
    cloud = np.load(cp, mmap_mode='r')
    if region is not None:
        cloud = cloud[cloud[:, 1] < region + .02]
    lo, hi = v.min(0) - .012, v.max(0) + .012
    cloud = cloud[np.all((cloud > lo) & (cloud < hi), axis=1)]
    tree = cKDTree(cloud)
    n_ = len(v)
    A = coo_matrix((np.ones(len(f) * 6), (np.r_[f[:, 0], f[:, 1], f[:, 2], f[:, 1], f[:, 2], f[:, 0]],
                                          np.r_[f[:, 1], f[:, 2], f[:, 0], f[:, 0], f[:, 1], f[:, 2]])), shape=(n_, n_)).tocsr()
    A.data[:] = 1
    deg = np.asarray(A.sum(1)).ravel()
    x, y, z = v.T
    face = (z > .055) & (np.abs(x) < .105) & (y > .565)
    if region is not None:
        face |= y > region          # 2ª passada: só queixo/pescoço
    total = np.zeros(n_)
    log = []
    for it in range(iters):
        nrm = Writer.normals(v, f)
        d, ii = tree.query(v, k=k, distance_upper_bound=.012)
        need = np.zeros(n_)
        for col in range(k):
            ok = np.isfinite(d[:, col])
            if not ok.any():
                continue
            q = cloud[np.minimum(ii[ok, col], len(cloud) - 1)]
            rel = q - v[ok]
            s = (rel * nrm[ok]).sum(1)
            lat = np.linalg.norm(rel - s[:, None] * nrm[ok], axis=1)
            req = (clear - s) * np.exp(-(lat / .006) ** 2)
            need[ok] = np.maximum(need[ok], req)
        capv = np.where(((y < .566) & (z < .03)) | (y < .546), .036, cap)   # base/pescoço: escondidos pela nuca e pelo colarinho
        need = np.minimum(np.clip(need, 0, None), capv)
        need[face] = 0
        log.append({'iter': it, 'vertices_needing_push': int((need > 1e-5).sum()), 'max_push_mm': float(need.max() * 1000)})
        if need.max() < 2e-5:
            break
        # alarga e suaviza o afundamento (sem degraus)
        pushf = need.copy()
        for _ in range(10):
            pushf = np.maximum(need, (A @ pushf) / np.maximum(deg, 1) * .97)
        for _ in range(6):
            pushf = .5 * pushf + .5 * (A @ pushf) / np.maximum(deg, 1)
        pushf = np.maximum(pushf, need)
        pushf[face] = 0
        pushf = np.minimum(pushf, np.maximum(capv - total, 0))
        v = v - nrm * pushf[:, None]
        total += pushf
    log.append({'final_max_total_push_mm': float(total.max() * 1000), 'vertices_moved': int((total > 1e-5).sum())})
    return v, log


# ------------------------------------------------------------------ 6G-A.4 crânio/focinho/pescoço
def step_head(c):
    w = c.w
    old = w.read_prim(274)
    body = w.read_prim(0)
    v, f = head6g.build()
    v, log1 = carve_skull(v, f)
    # 2ª passada: queixo e pescoço contra o colarinho/jaleco em TODAS as poses amostradas (referencial da cabeça)
    v, log2 = carve_skull(v, f, cloud_path=WORK / 'forbid_skull.npy', region=.558, cap=.008, iters=8)
    c.carve_log = {'repouso_cabeca_inteira': log1, 'todas_as_poses_queixo_pescoco': log2}
    # pesos: vizinho mais próximo sobre a união (crânio 6F + superfície corporal 0), como na 6F
    src_v = np.vstack([old['POSITION'], body['POSITION']])
    src_j = np.vstack([old['JOINTS_0'], body['JOINTS_0']]).astype(int)
    src_w = np.vstack([old['WEIGHTS_0'], body['WEIGHTS_0']])
    d, ids = cKDTree(src_v).query(v, k=6)
    # média ponderada por distância das influências (suaviza a costura cabeça–pescoço)
    J = np.zeros((len(v), 4), np.uint16)
    W = np.zeros((len(v), 4))
    for r in range(len(v)):
        acc = {}
        for kk, si in enumerate(ids[r]):
            g = 1 / (d[r, kk] + 1e-4)
            for jj, ww in zip(src_j[si], src_w[si]):
                if ww > 0:
                    acc[jj] = acc.get(jj, 0) + ww * g
        top = sorted(acc.items(), key=lambda t: -t[1])[:4]
        s = sum(t[1] for t in top)
        for q, (jj, ww) in enumerate(top):
            J[r, q] = jj
            W[r, q] = ww / s
    # pescoço: pesos procedurais. Dentro do colarinho (preso 100% em chest) o tubo segue chest; transição
    # chest→neck→head acima da borda do colarinho. Evita que a base gire com a cabeça para dentro do colarinho.
    yy = v[:, 1]
    zone = yy < .590
    jc, jn_, jhd = c.J['chest'], c.J['neck'], c.J['head']
    a1 = ss(.546, .562, yy)          # chest -> neck
    a2 = ss(.560, .588, yy)          # neck -> head
    wc = 1 - a1
    wn = a1 * (1 - a2)
    wh = a1 * a2
    J[zone] = 0
    W[zone] = 0
    J[zone, 0], W[zone, 0] = jc, wc[zone]
    J[zone, 1], W[zone, 1] = jn_, wn[zone]
    J[zone, 2], W[zone, 2] = jhd, wh[zone]
    J[W <= 0] = 0                     # sem índice de joint com peso zero (aviso do Validator)
    # morphs: Blink 0, Smile (bochecha levemente erguida), BrowRaise 0, MouthOpen (queixo/lábio inferior)
    x, y, z = v.T
    front = ss(.0, .09, z)
    smile = np.zeros_like(v)
    smile[:, 1] = .0014 * np.exp(-((np.abs(x) - .030) / .016) ** 2 - ((y - .566) / .010) ** 2) * front
    mo = np.zeros_like(v)
    mo[:, 1] = -.0085 * np.exp(-(x / .045) ** 2 - ((y - .548) / .022) ** 2) * front * ss(.53, .545, y)
    mo[:, 2] = -.0020 * np.exp(-(x / .045) ** 2 - ((y - .548) / .022) ** 2) * front
    # cor de pele com oclusão suave (órbitas, sob o focinho, junção do pescoço) e leve calor nos cantos externos
    ax = np.abs(x)
    occ = 1 - .055 * np.exp(-((ax - .066) / .040) ** 2 - ((y - .622) / .026) ** 2) * front
    occ -= .07 * ss(.575, .545, y) * np.exp(-(x / .07) ** 2) * front           # sob focinho/queixo
    occ -= .10 * ss(.555, .505, y)                                             # pescoço (sombra do colarinho)
    occ -= .035 * np.exp(-((ax - .020) / .010) ** 2 - ((y - .582) / .010) ** 2) * front  # sulco nariz–lábio
    warm = .035 * np.exp(-((ax - .100) / .022) ** 2 - ((y - .618) / .018) ** 2) * front
    col = np.tile(SKIN_COLOR, (len(v), 1))
    col[:, :3] *= occ[:, None]
    col[:, 0] += warm * .6
    col[:, 2] -= warm
    w.set_prim(274, v, f, colors=col, joints=J, weights=W,
               targets=[np.zeros_like(v), smile, np.zeros_like(v), mo],
               note='6G: crânio esculpido (focinho em cunha, órbitas, bochechas, queixo recuado) com transição de pescoço',
               transfer_from=old['POSITION'])
    c.head_v, c.head_f = v, f
    fr = v[:, 2] > .02
    c.H = LinearNDInterpolator(v[fr][:, :2], v[fr][:, 2])
    hn = Writer.normals(v, f)
    c.HN_ = LinearNDInterpolator(v[fr][:, :2], hn[fr])
    c.HN = lambda xy: (lambda n: n / np.linalg.norm(n, axis=1, keepdims=True))(c.HN_(xy[:, 0], xy[:, 1]))


# ------------------------------------------------------------------ 6G-A.5 olhos
def rigid(n, joint):
    J = np.zeros((n, 4), np.uint16); J[:, 0] = joint
    W = np.zeros((n, 4)); W[:, 0] = 1
    return J, W


def step_eyes(c):
    w = c.w
    for s, b0 in ((1, 13), (-1, 24)):
        e = eyes6g.build_side(s, c.H)
        jh = c.J['head']
        # Íris e reflexos também no joint head: os canais de escala dos joints eye_* (piscar legado da 6E)
        # não estão sincronizados com o morph Blink (achatam a íris com as pálpebras abertas). Ver relatório.
        je = jh
        parts = [(0, 'sclera', jh), (1, 'iris', je), (2, 'upper_lid', jh), (3, 'lower_lid', jh), (4, 'liner', jh)]
        for off, key, jj in parts:
            v, f, col, tg = e[key]
            J, W = rigid(len(v), jj)
            old = w.read_prim(b0 + off)
            if col is None and 'COLOR_0' in old:
                col = np.tile(old['COLOR_0'][0], (len(v), 1))
            # pálpebras usam a normal da pele subjacente: sombreamento contínuo com o crânio
            nrm = c.HN(v[:, :2]) if key in ('upper_lid', 'lower_lid') else None
            w.set_prim(b0 + off, v, f, colors=col, targets=tg, joints=J, weights=W, normals=nrm,
                       note=f'6G: {key} amendoado conformado ao crânio (lado {s:+d})')
        for k, (v, f, col, tg) in enumerate(e['lashes']):
            J, W = rigid(len(v), jh)
            old = w.read_prim(b0 + 5 + k)
            if 'COLOR_0' in old:
                col = np.tile(old['COLOR_0'][0], (len(v), 1))
            w.set_prim(b0 + 5 + k, v, f, colors=col, targets=tg, joints=J, weights=W,
                       note='6G: ' + ('cílio do canto externo' if k < 3 else 'traço inferior externo (antigo cílio 4)'))
        for k, (v, f, col, tg) in enumerate(e['catch']):
            J, W = rigid(len(v), je)
            old = w.read_prim(b0 + 9 + k)
            if 'COLOR_0' in old:
                col = np.tile(old['COLOR_0'][0], (len(v), 1))
            w.set_prim(b0 + 9 + k, v, f, colors=col, targets=tg, joints=J, weights=W, note='6G: reflexo')
        c.eye_frames = getattr(c, 'eye_frames', {})
        c.eye_frames[s] = e['frame']


# ------------------------------------------------------------------ 6G-A.4/6G-B.8 nariz, boca, estrelas da testa, sobrancelhas
def faceted_star(c, cx, cy, top, bot, side, inner, rim_off, apex_off, sub=6):
    """Estrela de 4 pontas facetada e conformada: cada faceta é subdividida e cada vértice fica a
    H(x,y) + folga (interpolada entre o ápice e a borda), evitando que arestas longas cortem a pele."""
    pts = [(0, top), (inner, inner), (side, 0), (inner, -inner), (0, -bot), (-inner, -inner), (-side, 0), (-inner, inner)]
    rim = np.array([[cx + dx, cy + dy] for dx, dy in pts])
    ap = np.array([cx, cy])
    V, F, N = [], [], []
    for i in range(8):
        a, b = rim[i], rim[(i + 1) % 8]
        # normal da faceta (grossa) para o aspecto lapidado
        A3 = np.r_[ap, float(c.H(*ap)) + apex_off]
        a3 = np.r_[a, float(c.H(*a)) + rim_off]
        b3 = np.r_[b, float(c.H(*b)) + rim_off]
        fn = np.cross(a3 - A3, b3 - A3)
        if fn[2] < 0:
            fn = -fn
        fn /= np.linalg.norm(fn)
        base = len(V)
        idx = {}
        for u in range(sub + 1):
            for v in range(sub + 1 - u):
                wa, wb = u / sub, v / sub
                wA = 1 - wa - wb
                xy = ap * wA + a * wa + b * wb
                off = apex_off * wA + rim_off * (wa + wb)
                idx[(u, v)] = len(V)
                V.append([xy[0], xy[1], float(c.H(*xy)) + off])
                N.append(fn)
        for u in range(sub):
            for v in range(sub - u):
                F.append([idx[(u, v)], idx[(u + 1, v)], idx[(u, v + 1)]])
                if v < sub - u - 1:
                    F.append([idx[(u + 1, v)], idx[(u + 1, v + 1)], idx[(u, v + 1)]])
    V = np.array(V)
    F = np.array(F)
    cr = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    F[cr[:, 2] < 0] = F[cr[:, 2] < 0][:, ::-1]
    return V, F, np.array(N)


def conform_strip(c, pts, width, off):
    """Faixa fina conformada: pts (n,2), width (n,) -> v, f."""
    n = len(pts)
    tg = np.gradient(pts, axis=0)
    tg /= np.linalg.norm(tg, axis=1, keepdims=True)
    side = np.c_[-tg[:, 1], tg[:, 0]]
    xy = np.vstack([pts - side * width[:, None] / 2, pts + side * width[:, None] / 2])
    xy = xy.reshape(2, n, 2).transpose(1, 0, 2).reshape(-1, 2)
    v = np.c_[xy, c.H(xy[:, 0], xy[:, 1]) + off]
    f = eyes6g.orient_front(v, eyes6g.grid_faces(n, 2))
    return v, f


def step_face_details(c):
    w = c.w
    jh = c.J['head']
    # ---- nariz: botão triangular arredondado (substitui a malha 6F, que ficava embutida no focinho novo)
    d = w.read_prim(3)
    NU, NV = 33, 48
    vv = []
    for i in range(NU):
        th = np.pi * i / (NU - 1)
        for k in range(NV):
            ph = 2 * np.pi * k / NV
            x, y, z = np.sin(th) * np.cos(ph), np.cos(th), np.sin(th) * np.sin(ph)
            yn = y
            x *= .0083 * (.62 + .38 * (yn + 1) / 2) ** 1.0
            y *= .0056
            z *= .0062
            z = np.where(z < 0, z * .6, z)
            vv.append([x, y, z])
    vv = np.array(vv)
    # leve inclinação para baixo (a ponta do focinho olha para frente e um pouco para baixo)
    a_ = np.radians(14)
    R = np.array([[1, 0, 0], [0, np.cos(a_), -np.sin(a_)], [0, np.sin(a_), np.cos(a_)]])
    vv = vv @ R.T
    tip_y = .5955
    vv += np.array([0, tip_y, float(c.H(0, tip_y)) - .0021])
    ff = []
    for i in range(NU - 1):
        for k in range(NV):
            a1 = i * NV + k; b1 = i * NV + (k + 1) % NV
            ff += [[a1, a1 + NV, b1], [b1, a1 + NV, b1 + NV]]
    ff = np.array(ff)
    cen = vv.mean(0)
    cr = np.cross(vv[ff[:, 1]] - vv[ff[:, 0]], vv[ff[:, 2]] - vv[ff[:, 0]])
    bad = (cr * (vv[ff].mean(1) - cen)).sum(1) < 0
    ff[bad] = ff[bad][:, ::-1]
    J, W = rigid(len(vv), jh)
    nm = c.j['materials'][c.j['meshes'][0]['primitives'][3]['material']]
    nm['pbrMetallicRoughness']['baseColorFactor'] = [.045, .032, .030, 1]
    w.set_prim(3, vv, ff, joints=J, weights=W, targets=[np.zeros_like(vv)] * 4,
               note='6G: nariz em botão triangular arredondado, metade posterior embutida no focinho')
    # ---- boca (lábios 35/36): reposicionados e conformados ao focinho; morphs transformados
    for pi in (35, 36):
        d = w.read_prim(pi)
        v = d['POSITION']
        sx, y0 = .86, .5655
        def place(p):
            q = p.copy()
            q[:, 0] = p[:, 0] * sx
            q[:, 1] = y0 + (p[:, 1] - .5697)
            q[:, 2] = c.H(q[:, 0], q[:, 1]) + .0007 + (p[:, 2] - v[:, 2].min()) * .55
            return q
        nv = place(v)
        tg = [place(v + t) - nv if np.abs(t).max() > 0 else np.zeros_like(nv) for t in d['targets']]
        w.set_prim(pi, nv, d['f'], targets=tg, transfer_from=nv, note='6G: lábio reposicionado no focinho')
    # ---- estrelas da testa: facetadas e conformadas (folga medida depois na auditoria)
    specs = {10: dict(cx=0, cy=.700, top=.040, bot=.047, side=.0255, inner=.0052, rim_off=.0009, apex_off=.0034),
             9: dict(cx=.0, cy=.7505, top=.0105, bot=.0105, side=.0072, inner=.0019, rim_off=.0006, apex_off=.0019),
             11: dict(cx=0, cy=.6425, top=.0070, bot=.0085, side=.0050, inner=.0015, rim_off=.0006, apex_off=.0017)}
    for pi, sp in specs.items():
        d = w.read_prim(pi)
        v, f, nrm = faceted_star(c, **sp)
        J, W = rigid(len(v), jh)
        col = np.tile(d['COLOR_0'][0], (len(v), 1)) if 'COLOR_0' in d else None
        w.set_prim(pi, v, f, colors=col, joints=J, weights=W, normals=nrm, targets=[np.zeros_like(v)] * 4,
                   note='6G: estrela da testa facetada reprojetada sobre o crânio 6G')
    # ---- prim 2: substituir sobrancelhas (componentes 28 v) e filete central (3 v) por versões conformadas
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    d = w.read_prim(2)
    v, f = d['POSITION'], d['f']
    n = len(v)
    A = coo_matrix((np.ones(len(f) * 2), (np.r_[f[:, 0], f[:, 1]], np.r_[f[:, 1], f[:, 2]])), shape=(n, n))
    k, lab = connected_components(A, directed=False)
    drop = np.zeros(n, bool)
    for comp in range(k):
        ids = np.where(lab == comp)[0]
        P = v[ids]
        cen = P.mean(0)
        if abs(cen[0]) < .1 and .62 < cen[1] < .70 and cen[2] > .11:
            drop[ids] = True
    keepf = ~drop[f].any(1)
    keepv = ~drop
    remap = np.cumsum(keepv) - 1
    nv = [v[keepv]]
    nf = [remap[f[keepf]]]
    ncol = [d['COLOR_0'][keepv]]
    nJ = [d['JOINTS_0'][keepv].astype(np.uint16)]
    nW = [d['WEIGHTS_0'][keepv]]
    ntg = [[t[keepv]] for t in d['targets']]
    base_n = len(nv[0])
    gold = d['COLOR_0'][drop][0] if drop.any() else d['COLOR_0'][0]
    added = []
    for s in (1, -1):
        T = np.linspace(0, 1, 25)
        pts = np.c_[s * (.037 + .038 * T), .6640 + .0058 * np.sin(np.pi * T * .9) + .0012 * T]
        wd = .0036 * np.sin(np.pi * (.15 + .78 * T)) ** .65 + .0005
        vb, fb = conform_strip(c, pts, wd, .0009)
        br = np.zeros_like(vb)
        up = pts + np.array([0, .0040])
        upxy = np.vstack([up - 0, up]).reshape(2, -1, 2)
        vb_up, _ = conform_strip(c, up, wd, .0009)
        added.append((vb, fb, [np.zeros_like(vb), np.zeros_like(vb), vb_up - vb, np.zeros_like(vb)]))
    # filete central entre a estrela principal e o losango inferior
    pts = np.c_[np.zeros(9), np.linspace(.6535, .6500, 9)]
    vb, fb = conform_strip(c, pts, np.linspace(.0011, .0004, 9), .0008)
    added.append((vb, fb, [np.zeros_like(vb)] * 4))
    off = base_n
    for vb, fb, tg in added:
        nv.append(vb)
        nf.append(fb + off)
        ncol.append(np.tile(gold, (len(vb), 1)))
        J, W = rigid(len(vb), jh)
        nJ.append(J)
        nW.append(W)
        for q in range(4):
            ntg[q].append(tg[q])
        off += len(vb)
    V = np.vstack(nv)
    w.set_prim(2, V, np.vstack(nf), colors=np.vstack(ncol), joints=np.vstack(nJ), weights=np.vstack(nW),
               targets=[np.vstack(t) for t in ntg], transfer_from=V,
               note=f'6G: sobrancelhas douradas curtas e filete central conformados; {int(drop.sum())} vértices antigos removidos')



# ------------------------------------------------------------------ 6G-A.6 / 6G-B.7 mechas
FORBID = WORK / 'forbid_head.npy'


def step_locks(c):
    w = c.w
    hv, hf = c.head_v, c.head_f
    hn = Writer.normals(hv, hf)
    pts = np.load(FORBID) if FORBID.exists() else np.zeros((0, 3))
    b = locks6g.Builder(hv, hn, pts)
    locks6g.plan(b, np.random.default_rng(6))
    V, F, C, R = b.mesh()
    J, W = rigid(len(V), c.J['head'])
    w.set_prim(275, V, F, colors=C, joints=J, weights=W, targets=[np.zeros_like(V)] * 4,
               note=f'6G: {len(b.locks)} mechas afiladas/achatadas, presas ao joint head, geradas com folga >= {locks6g.CLEAR*1000:.1f} mm da nuvem de acessórios/orelhas')
    p = w.prim(275)
    p['extras'] = {'phase6g': 'tapered_flat_locks', 'lock_count': len(b.locks), 'root_embed_mm': 3.0,
                   'clearance_target_mm': locks6g.CLEAR * 1000}
    c.lock_log = b.log
    Path(c.out + '.carve.json').write_text(json.dumps(getattr(c, 'carve_log', None), indent=1))
    Path(c.out + '.locks.json').write_text(json.dumps(b.log, indent=1, ensure_ascii=False))



# ------------------------------------------------------------------ 6G-C.12 plumagem da cauda (nova primitiva)
def step_tail(c):
    from sophia_motion_runtime import MotionModel
    m = MotionModel(c.src)   # cauda, corpo, jaleco, laços e constelação não mudam nas etapas anteriores
    jn = m.joint_names
    def by_joint(pi, prefixes):
        d = m.primitives[pi]
        js = np.array([n.startswith(prefixes) for n in jn])
        w = (d['we'] * js[d['jo']]).sum(1)
        return d['f'][(w[d['f']] > .3).any(1)]
    trunk = ('hips', 'spine', 'chest', 'thigh', 'shin', 'foot', 'toe', 'upper_arm', 'forearm', 'hand', 'fingers', 'thumb')
    prims = [0, 261, 4, 5, 6, 12, 272, 273, *range(231, 251), *range(262, 272)]
    spec = {'prims': prims, 'faces': {0: by_joint(0, trunk), 261: by_joint(261, trunk)}}
    poses = [(None, 0.0)] + [(ai, float(t)) for ai, a in enumerate(m.animations) for t in np.linspace(0, a['duration'], 8, endpoint=False)]
    import hashlib as _h, pickle
    key = _h.sha256((Path(tail6g.__file__).read_bytes() + Path(locks6g.__file__).read_bytes() + BASE_SHA.encode())).hexdigest()[:16]
    cache = WORK / f'tail_cache_{key}.pkl'
    if cache.exists():
        res, log = pickle.loads(cache.read_bytes())
    else:
        res, log = tail6g.build(m, 1, spec, np.random.default_rng(12), poses)
        cache.write_bytes(pickle.dumps((res, log)))
    if res is None:
        Path(c.out + '.tail.json').write_text(json.dumps(log, indent=1))
        return
    # pós-filtro: a raiz (não testada no gerador) não pode tocar contas/fios/estrelas da constelação
    from forbidden import sample_tris
    gp = [*range(231, 251), *range(262, 272)]
    NV = 96
    nl = len(res['V']) // NV
    keep = np.ones(nl, bool)
    pposes = [(None, 0.0)] + [(ai, float(t)) for ai, a in enumerate(m.animations) for t in np.linspace(0, a['duration'], 6, endpoint=False)]
    for ai, t in pposes:
        P = m.pose(ai, t, selection=gp)
        gt = cKDTree(np.vstack([sample_tris(P[k], m.primitives[k]['f'], step=.0008) for k in gp]))
        M = tail6g.skin_mats(m, ai, t)
        for i in np.where(keep)[0]:
            sl = slice(i * NV, (i + 1) * NV)
            Mk = np.einsum('k,kij->ij', res['W'][i * NV], M[res['J'][i * NV].astype(int)])
            Vp = (np.c_[res['V'][sl], np.ones(NV)] @ Mk.T)[:, :3]
            d_, _ = gt.query(Vp, distance_upper_bound=.01)
            if d_.min() < .0012:
                keep[i] = False
    vm = np.repeat(keep, NV)
    remap = np.cumsum(vm) - 1
    fk = vm[res['F']].all(1)
    res = dict(V=res['V'][vm], F=remap[res['F'][fk]], C=res['C'][vm], J=res['J'][vm], W=res['W'][vm], n=int(keep.sum()))
    log.append({'post_filter_constellation_root_contact_removed': int((~keep).sum()), 'kept': int(keep.sum())})
    Path(c.out + '.tail.json').write_text(json.dumps(log, indent=1))
    ps = c.j['meshes'][0]['primitives']
    newp = copy.deepcopy(ps[1])
    newp['material'] = 3   # Sophia_tail_locks (dupla face, cor por vértice; antes sem uso)
    newp['extras'] = {'phase6g': 'tail_plume_locks', 'lock_count': res['n'], 'clearance_target_mm': tail6g.CLEAR * 1000}
    newp['attributes'] = {k: v for k, v in newp['attributes'].items() if k in ('POSITION', 'NORMAL', 'COLOR_0', 'JOINTS_0', 'WEIGHTS_0')}
    ps.append(newp)
    pi = len(ps) - 1
    c.w.set_prim(pi, res['V'], res['F'], colors=res['C'], joints=res['J'], weights=res['W'],
                 targets=[np.zeros_like(res['V'])] * 4, transfer_from=res['V'],
                 note=f"6G-C: {res['n']} tufos na borda externa da pluma, pesos herdados da raiz")
    newp['extras'] = {'phase6g': 'tail_plume_locks', 'lock_count': res['n'], 'clearance_target_mm': tail6g.CLEAR * 1000}


STEPS = {'head': step_head, 'eyes': step_eyes, 'face': step_face_details, 'locks': step_locks, 'tail': step_tail}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--steps', default=','.join(STEPS))
    ap.add_argument('--compact', action='store_true', help='remove accessors/bufferViews sem uso e reconstrói o BIN')
    a = ap.parse_args()
    c = Ctx(a.src)
    c.out = a.dst
    c.src = a.src
    for s in a.steps.split(','):
        STEPS[s](c)
    comp = c.w.compact() if a.compact else None
    c.j.setdefault('asset', {}).setdefault('extras', {})['phase6g'] = {'base_sha256': BASE_SHA, 'steps': a.steps.split(','),
                                                                     'status': 'PARTIAL_CANDIDATE_NOT_APPROVED', 'compaction': comp}
    c.j['buffers'][0]['byteLength'] = len(c.m.bin)
    c.m.save(a.dst)
    Path(a.dst + '.changes.json').write_text(json.dumps(c.w.changes, indent=1, ensure_ascii=False))
    print(hashlib.sha256(Path(a.dst).read_bytes()).hexdigest())


if __name__ == '__main__':
    main()
