"""Sophia 6G-C — plumagem da cauda: tufos afilados na borda externa da pluma, seguindo o fluxo base→ponta.

- Raízes: amostragem por ponto mais distante sobre os vértices da cauda que ficam na borda externa da
  curva (normal aproximadamente no plano da curvatura e apontando para fora do centro da espiral).
- Direção: segmento ósseo mais próximo (tail_k → tail_k+1), projetado no plano tangente, com leve
  inclinação para fora (lift).
- Pele: cada tufo herda os 4 pesos do vértice da cauda na raiz (segue a cauda nas animações).
- Cor: cor do vértice da raiz (gradiente creme→azul) clareando ~8% na ponta.
- Aceitação: folga mínima CLEAR, em repouso e em 5 clipes × N instantes (espaço do mundo, com skinning),
  contra corpo/pernas, jaleco/forro, laços e fitas traseiras e toda a constelação da cauda.
"""
import numpy as np
from scipy.spatial import cKDTree
from locks6g import lock_mesh, rot
from forbidden import sample_tris

CLEAR = .0025


def skin_mats(m, ai, t):
    W, _ = m.worlds(ai, t)
    s = m.j['skins'][0]
    return np.array([W[k] @ m.inverse[0][q] for q, k in enumerate(s['joints'])])


def plan_roots(tv, tn, chain, rng, n=230, min_d=.0155):
    P = chain
    # plano da curvatura e centro da espiral
    c0 = P.mean(0)
    _, _, vt = np.linalg.svd(P - c0)
    pn = vt[2]
    # segmento mais próximo para cada vértice
    best = np.full(len(tv), np.inf)
    segi = np.zeros(len(tv), int)
    segt = np.zeros(len(tv))
    for k in range(len(P) - 1):
        a, b = P[k], P[k + 1]
        e = b - a
        t = np.clip(((tv - a) @ e) / (e @ e), 0, 1)
        d = np.linalg.norm(tv - (a + t[:, None] * e), axis=1)
        sel = d < best
        best[sel] = d[sel]
        segi[sel] = k
        segt[sel] = t[sel]
    axis_pt = P[segi] + segt[:, None] * (P[segi + 1] - P[segi])
    radial = tv - axis_pt
    radial /= np.maximum(np.linalg.norm(radial, axis=1, keepdims=True), 1e-9)
    inplane = 1 - np.abs(tn @ pn)
    # borda externa: normal no plano e afastada do eixo; evita a base (primeiro segmento)
    score = inplane * np.clip((tn * radial).sum(1), 0, 1)
    ok = (score > .45) & (segi >= 1) & ~((segi == 1) & (segt < .5))
    cand = np.where(ok)[0]
    # amostragem por ponto mais distante
    chosen = []
    if not len(cand):
        return [], pn, segi, segt
    order = rng.permutation(cand)
    tree_pts = []
    for i in order:
        if tree_pts and np.min(np.linalg.norm(np.array(tree_pts) - tv[i], axis=1)) < min_d:
            continue
        tree_pts.append(tv[i])
        chosen.append(i)
        if len(chosen) >= n:
            break
    return chosen, pn, segi, segt


def build(m, tail_prim, forbid_spec, rng, poses):
    d = m.primitives[tail_prim]
    tv, tf = d['v'], d['f']
    from g6lib import Writer
    tn = Writer.normals(tv, tf)
    col = m.acc(d['p']['attributes']['COLOR_0'])[:, :4]
    names = [n.get('name') for n in m.nodes]
    W0, _ = m.worlds()
    chain = np.array([W0[names.index(nm)][:3, 3] for nm in ['tail_1', 'tail_2', 'tail_3', 'tail_4', 'tail_5', 'tail_6', 'tail_7']])
    # ponta: prolonga a curva além de tail_7
    chain = np.vstack([chain, chain[-1] + (chain[-1] - chain[-2]) * .8])
    roots, pn, segi, segt = plan_roots(tv, tn, chain, rng)
    tail_tree = cKDTree(tv)
    cands = []
    for i in roots:
        k = segi[i]
        flow = chain[k + 1] - chain[k]
        flow /= np.linalg.norm(flow)
        n = tn[i]
        g = flow - n * (flow @ n)
        if np.linalg.norm(g) < 1e-6:
            continue
        g /= np.linalg.norm(g)
        g = rot(g, n, rng.uniform(-.25, .25))
        prog = (k + segt[i]) / (len(chain) - 1)
        L = (.062 + .048 * np.sin(np.pi * min(prog * 1.2, 1))) * rng.uniform(.70, 1.30)
        w = (.016 + .007 * np.sin(np.pi * prog)) * rng.uniform(.80, 1.20)
        cands.append(dict(i=int(i), root=tv[i], n=n, g=g, L=L, w=w, lift=rng.uniform(.34, .46), twist=rng.uniform(-.8, .8)))
    # pontos proibidos por pose (espaço do mundo) e matrizes de pele
    accepted = []
    log = []
    for c in cands:
        c['ok'] = True
        c['clear'] = np.inf
    for attempt in range(3):
        pending = [c for c in cands if c.get('V') is None or not c['ok']]
        for c in pending:
            V, F, tpar, C = lock_mesh(c['root'], c['n'], c['g'], c['L'], c['w'], lift=c['lift'], twist=c['twist'],
                                      bend=None, cup=.35, thick=.40)
            c['V'], c['F'], c['tpar'] = V, F, tpar
            # não pode voltar para dentro da própria cauda
            sel = tpar > .22
            dd, ii = tail_tree.query(V[sel])
            c['ok'] = bool((((V[sel] - tv[ii]) * tn[ii]).sum(1) > -.0008).all())
            c['clear'] = np.inf
        for ai, t in poses:
            M = skin_mats(m, ai, t) if ai is not None else skin_mats(m, None, 0.0)
            P = m.pose(ai, t, selection=forbid_spec['prims'])
            pts = []
            for pi in forbid_spec['prims']:
                f = forbid_spec['faces'].get(pi, m.primitives[pi]['f'])
                pts.append(sample_tris(P[pi], f, step=.0015))
            tree = cKDTree(np.vstack(pts))
            for c in pending:
                if not c['ok']:
                    continue
                J = d['jo'][c['i']]
                Wt = d['we'][c['i']]
                Mk = np.einsum('k,kij->ij', Wt, M[J])
                Vp = (np.c_[c['V'], np.ones(len(c['V']))] @ Mk.T)[:, :3]
                dist, _ = tree.query(Vp[c['tpar'] > .12], distance_upper_bound=.02)
                c['clear'] = min(c['clear'], float(dist.min()))
                if c['clear'] < CLEAR:
                    c['ok'] = False
        # encurta os reprovados para a próxima tentativa
        for c in pending:
            if not c['ok']:
                c['L'] *= .72
                c['w'] *= .9
                c['lift'] = min(c['lift'] + .08, .6)
                c['V'] = None
    for c in cands:
        st = 'ok' if c['ok'] and c.get('V') is not None else 'descartada'
        log.append({'root_vertex': c['i'], 'status': st, 'length_mm': c['L'] * 1000, 'width_mm': c['w'] * 1000,
                    'clearance_mm': None if not np.isfinite(c['clear']) else c['clear'] * 1000})
        if st == 'ok':
            accepted.append(c)
    # malha final
    V, F, CC, JJ, WW = [], [], [], [], []
    off = 0
    for c in accepted:
        V.append(c['V'])
        F.append(c['F'] + off)
        base = col[c['i'], :3]
        tt = c['tpar']
        light = 1 + .08 * tt
        rootdark = .86 + .14 * np.clip(tt / .35, 0, 1)
        cc = np.clip(base[None] * (light * rootdark)[:, None], 0, 1)
        CC.append(np.c_[cc, np.ones(len(tt))])
        JJ.append(np.tile(d['jo'][c['i']], (len(tt), 1)))
        WW.append(np.tile(d['we'][c['i']], (len(tt), 1)))
        off += len(c['V'])
    if not accepted:
        return None, log
    return dict(V=np.vstack(V), F=np.vstack(F), C=np.vstack(CC), J=np.vstack(JJ), W=np.vstack(WW), n=len(accepted)), log
