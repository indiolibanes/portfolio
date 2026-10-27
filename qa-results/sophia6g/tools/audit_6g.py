"""Auditoria 6G: matriz geométrica (mesmo método triângulo-triângulo da 6F: audit.test) e checagens estruturais.

Uso: python audit_6g.py MODELO.glb SAIDA.json [--quick]
Executa, para cada par da matriz, repouso + instantes amostrados de cada clipe (0, 1/6 ... 5/6 da duração
e o pico de Blink), com morph weights do clipe. Não é detecção contínua nem certificação global.
"""
import sys, json, argparse
import numpy as np
from sophia_motion_runtime import MotionModel
from audit import test


def faces_by_joint(m, pi, prefixes, thr=.3):
    d = m.primitives[pi]
    js = np.array([n.startswith(prefixes) for n in m.joint_names])
    w = (d['we'] * js[d['jo']]).sum(1)
    return d['f'][(w[d['f']] > thr).any(1)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('glb')
    ap.add_argument('out')
    ap.add_argument('--samples', type=int, default=6)
    a = ap.parse_args()
    m = MotionModel(a.glb)
    P = m.primitives
    nprim = len([d for d in P if d['mesh'] == 0])
    book = [i for i, d in enumerate(P) if d['mesh'] == 1]
    pen = [i for i, d in enumerate(P) if d['mesh'] == 2]
    ear_f = {pi: faces_by_joint(m, pi, ('ear_',)) for pi in (0, 261)}
    hand_f = {pi: faces_by_joint(m, pi, ('hand', 'fingers', 'thumb')) for pi in (0, 261)}
    arm_f = {pi: faces_by_joint(m, pi, ('upper_arm', 'forearm')) for pi in (0, 261)}
    tail_body = {pi: faces_by_joint(m, pi, ('hips', 'spine', 'thigh')) for pi in (0, 261)}
    eye = {s: list(range(b, b + 11)) for s, b in (('+x', 13), ('-x', 24))}
    G = {
        'skull': [(274, None)],
        'sclera_iris': [(13, None), (14, None), (24, None), (25, None)],
        'lids': [(15, None), (16, None), (26, None), (27, None)],
        'liner_lashes': [(i, None) for i in (17, 18, 19, 20, 21, 28, 29, 30, 31, 32)],
        'locks': [(275, None)],
        'ears': [(0, ear_f[0]), (261, ear_f[261]), *[(i, None) for i in range(147, 153)], (255, None), (256, None)],
        'ear_accessories': [(i, None) for i in range(153, 231)],
        'forehead_gold': [(9, None), (10, None), (11, None)],
        'brows_prim2': [(2, None)],
        'collar_lapels_bow': [(i, None) for i in range(121, 146)],
        'coat': [(4, None), (5, None)],
        'arms': [(0, arm_f[0]), (261, arm_f[261])],
        'hands': [(0, hand_f[0]), (261, hand_f[261]), (257, None), (258, None), (259, None), (260, None)],
        'pen': [(i, None) for i in pen],
        'book': [(i, None) for i in book],
        'tail': [(1, None)],
        'tail_constellation': [(i, None) for i in [*range(231, 251), *range(262, 272)]],
        'body_trunk': [(0, tail_body[0]), (261, tail_body[261])],
        'tail_plume': [(i, None) for i in range(nprim) if P[i]['extras'].get('phase6g') == 'tail_plume_locks'],
        'back_ribbons': [(6, None), (272, None), (273, None)],
    }
    G = {k: v for k, v in G.items() if v}
    pairs = [
        ('Olhos x pálpebras', 'sclera_iris', 'lids'),
        ('Olhos x crânio', 'sclera_iris', 'skull'),
        ('Pálpebras x crânio', 'lids', 'skull'),
        ('Delineado/cílios x crânio', 'liner_lashes', 'skull'),
        ('Mechas x orelhas', 'locks', 'ears'),
        ('Mechas x acessórios', 'locks', 'ear_accessories'),
        ('Mechas x colarinho/lapelas/laço', 'locks', 'collar_lapels_bow'),
        ('Mechas x jaleco', 'locks', 'coat'),
        ('Mechas x mãos/pena/caderno', 'locks', 'hands'),
        ('Ornamentos x testa', 'forehead_gold', 'skull'),
        ('Sobrancelhas/ouro facial x crânio', 'brows_prim2', 'skull'),
        ('Crânio x acessórios das orelhas', 'skull', 'ear_accessories'),
        ('Pescoço x jaleco (crânio/pescoço x colarinho)', 'skull', 'collar_lapels_bow'),
        ('Pescoço x jaleco (crânio/pescoço x jaleco)', 'skull', 'coat'),
        ('Braços x mangas', 'arms', 'coat'),
        ('Mãos x pena', 'hands', 'pen'),
        ('Mãos x caderno', 'hands', 'book'),
        ('Cauda x corpo', 'tail', 'body_trunk'),
        ('Cauda x vestuário', 'tail', 'coat'),
        ('Constelação x superfície da cauda', 'tail_constellation', 'tail'),
        ('Plumagem da cauda x corpo', 'tail_plume', 'body_trunk'),
        ('Plumagem da cauda x jaleco', 'tail_plume', 'coat'),
        ('Plumagem da cauda x laços/fitas', 'tail_plume', 'back_ribbons'),
        ('Plumagem da cauda x constelação', 'tail_plume', 'tail_constellation'),
    ]
    pairs = [p for p in pairs if p[1] in G and p[2] in G]

    def gather(pose, key):
        vs, fs, off = [], [], 0
        for pi, f in G[key]:
            v = pose[pi]
            ff = P[pi]['f'] if f is None else f
            if not len(ff):
                continue
            vs.append(v)
            fs.append(ff + off)
            off += len(v)
        return np.vstack(vs), np.vstack(fs)

    poses = [('rest', None, 0.0, None)]
    for ai, an in enumerate(m.animations):
        for k in range(a.samples):
            poses.append((an['name'], ai, an['duration'] * k / a.samples, None))
        # pico de Blink
        for node, path, tt, vv, ip in an['channels']:
            if path == 'weights':
                poses.append((an['name'] + '@blink_peak', ai, float(tt[int(np.argmax(vv[:, 0]))]), None))
    # morphs estáticos (repouso)
    morph_poses = [('Blink=0.5', [.5, 0, 0, 0]), ('Blink=1', [1, 0, 0, 0]), ('Smile=1', [0, 1, 0, 0]),
                   ('BrowRaise=1', [0, 0, 1, 0]), ('MouthOpen=1', [0, 0, 0, 1]),
                   ('Blink=1+Smile=1', [1, 1, 0, 0]), ('Blink=1+BrowRaise=1', [1, 0, 1, 0]),
                   ('Blink=1+MouthOpen=1', [1, 0, 0, 1]), ('Combined .3/.6/.3/.2', [.3, .6, .3, .2])]
    rows = []
    needed = sorted({pi for key in G for pi, _ in G[key]})
    for label, ai, t, _ in poses:
        pose = m.pose(ai, t, selection=needed)
        for name, ka, kb in pairs:
            va, fa = gather(pose, ka)
            vb, fb = gather(pose, kb)
            r = test(va, fa, vb, fb)
            rows.append({'pose': label, 'time_s': t, 'pair': name, **r})
        print(label, flush=True)
    face_pairs = [p for p in pairs if p[1] in ('sclera_iris', 'lids', 'liner_lashes', 'forehead_gold', 'brows_prim2', 'locks')]
    for label, wts in morph_poses:
        m.j['meshes'][0]['weights'] = wts
        pose = m.pose(None, 0.0, selection=needed)
        for name, ka, kb in face_pairs:
            va, fa = gather(pose, ka)
            vb, fb = gather(pose, kb)
            rows.append({'pose': 'rest+' + label, 'time_s': 0, 'pair': name, **test(va, fa, vb, fb)})
        print(label, flush=True)
    m.j['meshes'][0]['weights'] = [0, 0, 0, 0]
    # resumo por par
    summ = {}
    for r in rows:
        s = summ.setdefault(r['pair'], {'poses': 0, 'poses_with_crossings': 0, 'max_crossings': 0, 'min_candidate_mm': None})
        s['poses'] += 1
        if r['crossings']:
            s['poses_with_crossings'] += 1
        s['max_crossings'] = max(s['max_crossings'], r['crossings'])
        mc = r.get('minimum_candidate_mm')
        if mc is not None and (s['min_candidate_mm'] is None or mc < s['min_candidate_mm']):
            s['min_candidate_mm'] = mc
    json.dump({'sha256': m.sha256, 'method': 'audit.test (6F): broad phase esferas/AABB + narrow phase segmento-triângulo e distância triângulo-triângulo; candidatos dentro de 0,3 mm. Contagens são pares de triângulos, não defeitos independentes. Amostras discretas, não contínuas.',
               'poses': [p[0] + '@%.3f' % p[2] for p in poses], 'summary': summ, 'rows': rows}, open(a.out, 'w'), indent=1)
    for k, v in summ.items():
        print(f"{k:48s} poses={v['poses']:3d} com_cruzamento={v['poses_with_crossings']:3d} max={v['max_crossings']:5d} min_mm={v['min_candidate_mm']}")


if __name__ == '__main__':
    main()
