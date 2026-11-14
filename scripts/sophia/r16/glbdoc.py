"""Leitura/escrita mínima de GLB (numpy): carrega um GLB existente, permite anexar malhas/texturas/nós e regrava."""
import json, struct, io
import numpy as np
json_dumps = json.dumps

CT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8, 5122: np.int16, 5120: np.int8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16, 'MAT3': 9}


class GLB:
    def __init__(self, path=None):
        if path:
            d = open(path, 'rb').read()
            jl = struct.unpack('<I', d[12:16])[0]
            self.j = json.loads(d[20:20 + jl])
            off = 20 + jl + 8
            self.bin = bytearray(d[off:])
        else:
            self.j = {'asset': {'version': '2.0', 'generator': 'sophia-r1c'}, 'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'buffers': [{'byteLength': 0}], 'bufferViews': [], 'accessors': []}
            self.bin = bytearray()

    # ------------------------------------------------------------------ leitura
    def acc(self, i):
        a = self.j['accessors'][i]
        n = NC[a['type']]
        dt = CT[a['componentType']]
        if 'bufferView' not in a:
            return np.zeros((a['count'], n), dt)
        bv = self.j['bufferViews'][a['bufferView']]
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = bv.get('byteStride')
        isz = np.dtype(dt).itemsize * n
        if stride and stride != isz:
            raw = np.frombuffer(self.bin, np.uint8, count=a['count'] * stride, offset=o).reshape(a['count'], stride)[:, :isz]
            arr = np.frombuffer(raw.tobytes(), dt).reshape(-1, n)
        else:
            arr = np.frombuffer(self.bin, dt, count=a['count'] * n, offset=o).reshape(-1, n)
        if a.get('normalized'):
            arr = arr.astype(np.float32) / np.iinfo(dt).max
        return arr.copy()

    def image_bytes(self, i):
        im = self.j['images'][i]
        bv = self.j['bufferViews'][im['bufferView']]
        o = bv.get('byteOffset', 0)
        return bytes(self.bin[o:o + bv['byteLength']])

    # ------------------------------------------------------------------ escrita
    def _align(self):
        while len(self.bin) % 4:
            self.bin.append(0)

    def add_view(self, data: bytes, target=None):
        self._align()
        off = len(self.bin)
        self.bin += data
        bv = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target:
            bv['target'] = target
        self.j['bufferViews'].append(bv)
        return len(self.j['bufferViews']) - 1

    def add_acc(self, arr, type_, ctype, target=None, minmax=False, normalized=False):
        arr = np.ascontiguousarray(arr.astype(CT[ctype]))
        bv = self.add_view(arr.tobytes(), target)
        a = {'bufferView': bv, 'componentType': ctype, 'count': int(len(arr)), 'type': type_}
        if normalized:
            a['normalized'] = True
        if minmax:
            a['min'] = arr.reshape(len(arr), -1).min(0).astype(float).tolist()
            a['max'] = arr.reshape(len(arr), -1).max(0).astype(float).tolist()
        self.j['accessors'].append(a)
        return len(self.j['accessors']) - 1

    def add_image(self, data: bytes, mime, name=None):
        bv = self.add_view(data)
        im = {'bufferView': bv, 'mimeType': mime}
        if name:
            im['name'] = name
        self.j.setdefault('images', []).append(im)
        return len(self.j['images']) - 1

    def add_texture(self, image_index, sampler=None):
        t = {'source': image_index}
        if sampler is not None:
            t['sampler'] = sampler
        self.j.setdefault('textures', []).append(t)
        return len(self.j['textures']) - 1

    def add_material(self, m):
        self.j['materials'].append(m)
        return len(self.j['materials']) - 1

    def add_prim_mesh(self, name, prims):
        """prims: lista de dict(pos, nrm, uv, idx, joints, weights, material)."""
        out = []
        for p in prims:
            at = {}
            at['POSITION'] = self.add_acc(p['pos'], 'VEC3', 5126, 34962, minmax=True)
            if p.get('nrm') is not None:
                at['NORMAL'] = self.add_acc(p['nrm'], 'VEC3', 5126, 34962)
            if p.get('uv') is not None:
                at['TEXCOORD_0'] = self.add_acc(p['uv'], 'VEC2', 5126, 34962)
            if p.get('joints') is not None:
                at['JOINTS_0'] = self.add_acc(p['joints'], 'VEC4', 5123, 34962)
                at['WEIGHTS_0'] = self.add_acc(p['weights'], 'VEC4', 5126, 34962)
            pr = {'attributes': at, 'mode': 4}
            if p.get('idx') is not None:
                idx = p['idx'].reshape(-1)
                pr['indices'] = self.add_acc(idx, 'SCALAR', 5125 if idx.max() > 65535 else 5123, 34963)
            if p.get('material') is not None:
                pr['material'] = p['material']
            out.append(pr)
        self.j['meshes'].append({'name': name, 'primitives': out})
        return len(self.j['meshes']) - 1

    def add_node(self, node, parent=None):
        self.j['nodes'].append(node)
        i = len(self.j['nodes']) - 1
        if parent is None:
            self.j['scenes'][0]['nodes'].append(i)
        else:
            self.j['nodes'][parent].setdefault('children', []).append(i)
        return i

    def compact(self):
        """Descarta bufferViews/accessors/imagens não referenciados e reempacota o binário."""
        j = self.j
        used_acc = set()
        for m in j.get('meshes', []):
            for p in m['primitives']:
                used_acc.update(p['attributes'].values())
                if 'indices' in p: used_acc.add(p['indices'])
                for t in p.get('targets', []): used_acc.update(t.values())
        for s in j.get('skins', []):
            if 'inverseBindMatrices' in s: used_acc.add(s['inverseBindMatrices'])
        for an in j.get('animations', []):
            for s in an['samplers']: used_acc.add(s['input']); used_acc.add(s['output'])
        used_img = set()
        for t in j.get('textures', []):
            used_img.add(t['source'])
            for ext in (t.get('extensions') or {}).values():
                if 'source' in ext: used_img.add(ext['source'])
        # novo binário
        newbin = bytearray(); views = []; vmap = {}
        def moveview(i):
            if i in vmap: return vmap[i]
            bv = j['bufferViews'][i]
            while len(newbin) % 4: newbin.append(0)
            off = len(newbin); o = bv.get('byteOffset', 0)
            newbin.extend(self.bin[o:o + bv['byteLength']])
            nb = dict(bv); nb['byteOffset'] = off; nb['buffer'] = 0
            views.append(nb); vmap[i] = len(views) - 1; return vmap[i]
        amap = {}; accs = []
        for i, a in enumerate(j['accessors']):
            if i in used_acc:
                na = dict(a)
                if 'bufferView' in a: na['bufferView'] = moveview(a['bufferView'])
                if 'sparse' in a:
                    sp = json.loads(json_dumps(a['sparse']))
                    sp['indices']['bufferView'] = moveview(a['sparse']['indices']['bufferView'])
                    sp['values']['bufferView'] = moveview(a['sparse']['values']['bufferView'])
                    na['sparse'] = sp
                accs.append(na); amap[i] = len(accs) - 1
        imap = {}; imgs = []
        for i, im in enumerate(j.get('images', [])):
            if i in used_img:
                ni = dict(im)
                if 'bufferView' in im: ni['bufferView'] = moveview(im['bufferView'])
                imgs.append(ni); imap[i] = len(imgs) - 1
        for m in j.get('meshes', []):
            for p in m['primitives']:
                p['attributes'] = {k: amap[v] for k, v in p['attributes'].items()}
                if 'indices' in p: p['indices'] = amap[p['indices']]
                for t in p.get('targets', []):
                    for k in list(t): t[k] = amap[t[k]]
        for s in j.get('skins', []):
            if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = amap[s['inverseBindMatrices']]
        for an in j.get('animations', []):
            for s in an['samplers']: s['input'] = amap[s['input']]; s['output'] = amap[s['output']]
        for t in j.get('textures', []):
            t['source'] = imap[t['source']]
            for ext in (t.get('extensions') or {}).values():
                if 'source' in ext: ext['source'] = imap[ext['source']]
        j['accessors'] = accs; j['bufferViews'] = views
        if imgs: j['images'] = imgs
        self.bin = newbin

    def save(self, path):
        self.compact()
        self._align()
        self.j['buffers'] = [{'byteLength': len(self.bin)}]
        js = json.dumps(self.j, separators=(',', ':')).encode()
        while len(js) % 4:
            js += b' '
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        with open(path, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, total))
            f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
            f.write(struct.pack('<II', len(self.bin), 0x004E4942)); f.write(bytes(self.bin))
        return total
