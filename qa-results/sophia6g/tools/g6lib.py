"""Utilitários de escrita glTF para a Fase 6G (sobre glbio3.GLB da 6F)."""
import copy
import numpy as np
from scipy.spatial import cKDTree


class Writer:
    def __init__(self, m):
        self.m = m
        self.j = m.j
        self.changes = []

    # ---------------------------------------------------------------- accessors
    def acc(self, a, typ=None, normalized=None, ctype=None):
        m = self.m
        a = np.asarray(a)
        if a.ndim == 1:
            a = a.reshape(-1, 1)
        if ctype is None:
            ctype = 5125 if a.dtype.kind in 'iu' else 5126
        dt = {5125: np.uint32, 5126: np.float32, 5123: np.uint16, 5121: np.uint8}[ctype]
        a = np.ascontiguousarray(a.astype(dt))
        typ = typ or {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4'}[a.shape[1]]
        off = len(m.bin)
        m.bin.extend(b'\0' * ((-off) % 4))
        off = len(m.bin)
        m.bin.extend(a.tobytes())
        bv = len(self.j['bufferViews'])
        self.j['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': a.nbytes})
        ai = len(self.j['accessors'])
        d = {'bufferView': bv, 'componentType': ctype, 'count': len(a), 'type': typ}
        if normalized:
            d['normalized'] = True
        if typ == 'VEC3' and ctype == 5126 or typ == 'SCALAR' and ctype in (5126,):
            d['min'] = a.min(0).astype(float).tolist()
            d['max'] = a.max(0).astype(float).tolist()
        self.j['accessors'].append(d)
        return ai

    def decoded(self, ai):
        a = self.m.read(ai)
        meta = self.j['accessors'][ai]
        return a.astype(float) / np.iinfo(a.dtype).max if meta.get('normalized') else a

    # ---------------------------------------------------------------- geometry
    @staticmethod
    def normals(v, f, weld=True):
        n = np.zeros_like(v, dtype=float)
        face = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
        for k in range(3):
            np.add.at(n, f[:, k], face)
        if weld:
            _, inv = np.unique(np.round(v, 7), axis=0, return_inverse=True)
            inv = inv.ravel()
            s = np.zeros((inv.max() + 1, 3))
            np.add.at(s, inv, n)
            n = s[inv]
        ln = np.linalg.norm(n, axis=1)
        n[ln < 1e-15] = [0, 0, 1]
        return n / np.maximum(np.linalg.norm(n, axis=1)[:, None], 1e-15)

    def prim(self, pi):
        return self.j['meshes'][0]['primitives'][pi]

    def read_prim(self, pi):
        p = self.prim(pi)
        out = {k: self.decoded(ai) for k, ai in p['attributes'].items()}
        out['f'] = self.m.read(p['indices']).reshape(-1, 3).astype(np.int64)
        out['targets'] = [self.m.read(t['POSITION']).astype(float) for t in p.get('targets', [])]
        return out

    def set_prim(self, pi, v, f, colors=None, targets=None, joints=None, weights=None,
                 normals=None, note=None, transfer_from=None, min_area=2e-12):
        """Substitui a geometria de uma primitiva.

        Atributos não fornecidos (ex.: TEXCOORD_0) são transferidos por vizinho mais próximo de
        `transfer_from` (array de posições antigo) quando a contagem muda.
        """
        p = self.prim(pi)
        old = copy.deepcopy(p)
        ov = self.m.read(old['attributes']['POSITION']).astype(float)
        v = np.asarray(v, float)
        f = np.asarray(f, np.int64).reshape(-1, 3)
        area = np.linalg.norm(np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]]), axis=1)
        f = f[area > min_area]
        n = self.normals(v, f) if normals is None else normals
        src = ov if transfer_from is None else transfer_from
        ids = cKDTree(src).query(v)[1]
        a = {}
        for key, ai in old['attributes'].items():
            if key in ('POSITION', 'NORMAL', 'TANGENT'):
                continue
            if key == 'COLOR_0' and colors is not None:
                continue
            if key == 'JOINTS_0' and joints is not None:
                continue
            if key == 'WEIGHTS_0' and weights is not None:
                continue
            ar = self.decoded(ai)
            if len(ar) != len(src):
                raise ValueError(f'transfer source mismatch for {key} in prim {pi}')
            ar = ar[ids]
            if key == 'JOINTS_0':
                a[key] = self.acc(ar.astype(np.uint16), 'VEC4', ctype=5123)
            else:
                a[key] = self.acc(ar.astype(np.float32))
        if colors is not None:
            a['COLOR_0'] = self.acc(np.asarray(colors, np.float32))
        if joints is not None:
            a['JOINTS_0'] = self.acc(np.asarray(joints, np.uint16), 'VEC4', ctype=5123)
        if weights is not None:
            w = np.asarray(weights, float)
            w = w / np.maximum(w.sum(1, keepdims=True), 1e-12)
            a['WEIGHTS_0'] = self.acc(w.astype(np.float32))
        a['POSITION'] = self.acc(v)
        a['NORMAL'] = self.acc(n)
        p['attributes'] = a
        p['indices'] = self.acc(f.reshape(-1).astype(np.uint32), 'SCALAR', ctype=5125)
        nt = len(old.get('targets', [])) or 4
        targets = targets if targets is not None else [np.zeros_like(v)] * nt
        p['targets'] = []
        for d in targets:
            d = np.asarray(d, float)
            dn = np.zeros_like(v) if normals is not None else self.normals(v + d, f) - n
            p['targets'].append({'POSITION': self.acc(d), 'NORMAL': self.acc(dn)})
        self.changes.append({'primitive': pi, 'component': old.get('extras', {}), 'note': note,
                             'old_vertices': len(ov), 'new_vertices': len(v),
                             'old_triangles': self.j['accessors'][old['indices']]['count'] // 3,
                             'new_triangles': len(f)})
        return f

    # ---------------------------------------------------------------- compaction
    def lossless_slim(self):
        """Otimizações sem perda: (1) alvos de morph inteiramente nulos viram accessors sem bufferView
        (o glTF os define como zeros); (2) índices uint32 com máximo < 65535 viram uint16."""
        j = self.j
        zero_targets = 0
        shrunk = 0
        done = {}
        for me in j['meshes']:
            for p in me['primitives']:
                for t in p.get('targets', []):
                    for k, ai in list(t.items()):
                        if ai in done:
                            continue
                        a = j['accessors'][ai]
                        if 'bufferView' not in a or 'sparse' in a:
                            done[ai] = True
                            continue
                        arr = self.m.read(ai)
                        if not np.any(arr):
                            del a['bufferView']
                            a.pop('byteOffset', None)
                            if k == 'POSITION':
                                a['min'] = [0.0, 0.0, 0.0]
                                a['max'] = [0.0, 0.0, 0.0]
                            zero_targets += 1
                        done[ai] = True
                if 'indices' in p:
                    ai = p['indices']
                    a = j['accessors'][ai]
                    if a['componentType'] == 5125 and 'bufferView' in a:
                        idx = self.m.read(ai).reshape(-1)
                        if idx.max() < 65535:
                            new = self.acc(idx.astype(np.uint16), 'SCALAR', ctype=5123)
                            na = self.j['accessors'][new]
                            a['bufferView'] = na['bufferView']
                            a['componentType'] = 5123
                            a.pop('byteOffset', None)
                            a.pop('min', None)
                            a.pop('max', None)
                            shrunk += 1
        return {'zero_morph_accessors_without_bufferView': zero_targets, 'indices_to_uint16': shrunk}

    def compact(self):
        """Remove accessors e bufferViews sem referência e reconstrói o BIN (sem alterar dados usados)."""
        slim = self.lossless_slim()
        j = self.j
        used_acc = set()

        def walk_prim(p):
            used_acc.update(p['attributes'].values())
            if 'indices' in p:
                used_acc.add(p['indices'])
            for t in p.get('targets', []):
                used_acc.update(t.values())
        for me in j['meshes']:
            for p in me['primitives']:
                walk_prim(p)
        for s in j.get('skins', []):
            if 'inverseBindMatrices' in s:
                used_acc.add(s['inverseBindMatrices'])
        for an in j.get('animations', []):
            for s in an['samplers']:
                used_acc.add(s['input'])
                used_acc.add(s['output'])
        used_bv = set()
        for ai in used_acc:
            a = j['accessors'][ai]
            if 'bufferView' in a:
                used_bv.add(a['bufferView'])
            if 'sparse' in a:
                used_bv.add(a['sparse']['indices']['bufferView'])
                used_bv.add(a['sparse']['values']['bufferView'])
        for im in j.get('images', []):
            if 'bufferView' in im:
                used_bv.add(im['bufferView'])
        acc_map = {old: new for new, old in enumerate(sorted(used_acc))}
        bv_map = {old: new for new, old in enumerate(sorted(used_bv))}
        newbin = bytearray()
        new_bvs = []
        for old in sorted(used_bv):
            bv = dict(j['bufferViews'][old])
            off = bv.get('byteOffset', 0)
            data = self.m.bin[off:off + bv['byteLength']]
            pad = (-len(newbin)) % 8
            newbin.extend(b'\0' * pad)
            bv['byteOffset'] = len(newbin)
            newbin.extend(data)
            new_bvs.append(bv)
        new_accs = []
        for old in sorted(used_acc):
            a = dict(j['accessors'][old])
            if 'bufferView' in a:
                a['bufferView'] = bv_map[a['bufferView']]
            if 'sparse' in a:
                a['sparse'] = copy.deepcopy(a['sparse'])
                a['sparse']['indices']['bufferView'] = bv_map[a['sparse']['indices']['bufferView']]
                a['sparse']['values']['bufferView'] = bv_map[a['sparse']['values']['bufferView']]
            new_accs.append(a)

        def remap_prim(p):
            p['attributes'] = {k: acc_map[v] for k, v in p['attributes'].items()}
            if 'indices' in p:
                p['indices'] = acc_map[p['indices']]
            for t in p.get('targets', []):
                for k in list(t):
                    t[k] = acc_map[t[k]]
        for me in j['meshes']:
            for p in me['primitives']:
                remap_prim(p)
        for s in j.get('skins', []):
            if 'inverseBindMatrices' in s:
                s['inverseBindMatrices'] = acc_map[s['inverseBindMatrices']]
        for an in j.get('animations', []):
            for s in an['samplers']:
                s['input'] = acc_map[s['input']]
                s['output'] = acc_map[s['output']]
        for im in j.get('images', []):
            if 'bufferView' in im:
                im['bufferView'] = bv_map[im['bufferView']]
        removed = (len(j['accessors']) - len(new_accs), len(j['bufferViews']) - len(new_bvs), len(self.m.bin) - len(newbin))
        j['accessors'] = new_accs
        j['bufferViews'] = new_bvs
        self.m.bin = newbin
        j['buffers'][0]['byteLength'] = len(newbin)
        # alvo do bufferView (dica do validador): índices 34963, atributos/morphs 34962
        tgt = {}
        for me in j['meshes']:
            for p in me['primitives']:
                for ai in list(p['attributes'].values()) + [x for t in p.get('targets', []) for x in t.values()]:
                    a = j['accessors'][ai]
                    if 'bufferView' in a:
                        tgt.setdefault(a['bufferView'], set()).add(34962)
                if 'indices' in p and 'bufferView' in j['accessors'][p['indices']]:
                    tgt.setdefault(j['accessors'][p['indices']]['bufferView'], set()).add(34963)
        for s_ in j.get('skins', []):
            if 'inverseBindMatrices' in s_ and 'bufferView' in j['accessors'][s_['inverseBindMatrices']]:
                tgt.setdefault(j['accessors'][s_['inverseBindMatrices']]['bufferView'], set()).add(0)
        for an in j.get('animations', []):
            for s_ in an['samplers']:
                for ai in (s_['input'], s_['output']):
                    if 'bufferView' in j['accessors'][ai]:
                        tgt.setdefault(j['accessors'][ai]['bufferView'], set()).add(0)
        for im in j.get('images', []):
            if 'bufferView' in im:
                tgt.setdefault(im['bufferView'], set()).add(0)
        for bvi, roles in tgt.items():
            if len(roles) == 1 and 0 not in roles:
                j['bufferViews'][bvi]['target'] = next(iter(roles))
        return {'removed_accessors': removed[0], 'removed_bufferViews': removed[1], 'removed_bytes': removed[2], **slim}
