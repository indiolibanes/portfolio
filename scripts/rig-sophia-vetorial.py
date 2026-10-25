#!/usr/bin/env python3
"""Prepara o GLB vetorial da Sophia (peças estáticas, sem esqueleto) para o modo-experimental.

Uso:  python3 scripts/rig-sophia-vetorial.py ENTRADA.glb public/experimental/sophia-vetorial.glb

O que faz (sem mexer na forma de nenhuma peça):
  - cria pivôs de articulação (cabeça, orelhas, pernas, cauda, ombro do braço que aponta)
    e move as peças para dentro deles, com translação compensada: a posição no mundo não muda;
  - acrescenta o braço que aponta (tubo + mão) e os olhos (esclera + pupila);
  - confere, antes de gravar, que todas as peças originais continuam no mesmo lugar.

Sem dependências além da biblioteca padrão. As peças do GLB original não têm rotação
nem escala nos nós, então tudo aqui é translação pura.
"""
import json
import math
import struct
import sys

# ---------------------------------------------------------------- pivôs (espaço do modelo, unidades glTF)
BODY_PIV = (0.0, 0.10, 0.0)   # quadril/tronco: a cabeça, o braço e a cauda seguem o corpo
HEAD_PIV = (0.0, 0.245, 0.0)
EAR_L_PIV = (0.06, 0.38, 0.0)
EAR_R_PIV = (-0.06, 0.38, 0.0)
LEG_L_PIV = (0.03, 0.07, 0.0)
LEG_R_PIV = (-0.03, 0.07, 0.0)
TAIL_PIV = (-0.05, 0.10, -0.08)
SHOULDER_L = (0.072, 0.19, 0.035)
ARM_LEN = 0.26
EYE_L = (0.042, 0.345, 0.067)
EYE_R = (-0.042, 0.345, 0.067)
SCLERA_R = 0.021
PUPIL_R = 0.0095
PUPIL_Z = 0.016

COL_SLEEVE = (0.110, 0.169, 0.388, 1.0)  # (28, 43, 99): mesma cor das mangas do modelo
COL_HAND = (0.957, 0.937, 0.890, 1.0)    # (244, 239, 227): creme do modelo
COL_SCLERA = (0.985, 0.975, 0.945, 1.0)
COL_PUPIL = (0.070, 0.060, 0.100, 1.0)


def read_glb(path):
    data = open(path, 'rb').read()
    magic, version, _ = struct.unpack('<4sII', data[:12])
    assert magic == b'glTF' and version == 2, 'não é um GLB 2.0'
    jlen, jtype = struct.unpack('<II', data[12:20])
    assert jtype == 0x4E4F534A, 'primeiro bloco precisa ser JSON'
    gltf = json.loads(data[20:20 + jlen])
    off = 20 + jlen
    blen, btype = struct.unpack('<II', data[off:off + 8])
    assert btype == 0x004E4942, 'segundo bloco precisa ser BIN'
    binary = bytearray(data[off + 8:off + 8 + blen])
    return gltf, binary


def write_glb(path, gltf, binary):
    js = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    bn = bytes(binary)
    bn += b'\x00' * ((4 - len(bn) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(bn)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(bn), 0x004E4942) + bn)


# ---------------------------------------------------------------- geometria gerada
def sphere_tris(center, r, seg=14, rings=10):
    def P(i, j):
        th = j / rings * math.pi
        ph = i / seg * 2 * math.pi
        return (center[0] + r * math.sin(th) * math.cos(ph), center[1] + r * math.cos(th), center[2] + r * math.sin(th) * math.sin(ph))
    tris = []
    for j in range(rings):
        for i in range(seg):
            a, b, c, d = P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)
            tris += [(a, b, c), (a, c, d)]
    return tris


def tube_x_tris(length, r, seg=10):
    def R(x, k):
        a = k / seg * 2 * math.pi
        return (x, r * math.cos(a), r * math.sin(a))
    tris = []
    for k in range(seg):
        a, b, c, d = R(0, k), R(0, k + 1), R(length, k + 1), R(length, k)
        tris += [(a, b, c), (a, c, d)]
    return tris


def mesh_from_tris(gltf, binary, name, tris, color):
    """Acrescenta uma malha (POSITION, NORMAL, COLOR_0, índices) e devolve o índice da malha."""
    pos, nrm, idx = [], [], []
    for n, (a, b, c) in enumerate(tris):
        u = [b[k] - a[k] for k in range(3)]
        v = [c[k] - a[k] for k in range(3)]
        nn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
        ln = math.sqrt(sum(x * x for x in nn)) or 1.0
        nn = [x / ln for x in nn]
        for p in (a, b, c):
            pos.append(p)
            nrm.append(nn)
        idx += [3 * n, 3 * n + 1, 3 * n + 2]
    assert len(pos) < 65535, 'malha grande demais para índices de 16 bits'

    def add_view(blob, target):
        while len(binary) % 4:
            binary.append(0)
        off = len(binary)
        binary.extend(blob)
        gltf['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(blob), 'target': target})
        return len(gltf['bufferViews']) - 1

    flat_pos = b''.join(struct.pack('<3f', *p) for p in pos)
    flat_nrm = b''.join(struct.pack('<3f', *n) for n in nrm)
    flat_col = b''.join(struct.pack('<4f', *color) for _ in pos)
    flat_idx = b''.join(struct.pack('<H', i) for i in idx)
    xs = [p[0] for p in pos]; ys = [p[1] for p in pos]; zs = [p[2] for p in pos]

    def acc(view, count, typ, ctype, extra=None):
        d = {'bufferView': view, 'byteOffset': 0, 'componentType': ctype, 'count': count, 'type': typ}
        if extra:
            d.update(extra)
        gltf['accessors'].append(d)
        return len(gltf['accessors']) - 1

    a_pos = acc(add_view(flat_pos, 34962), len(pos), 'VEC3', 5126,
                {'min': [min(xs), min(ys), min(zs)], 'max': [max(xs), max(ys), max(zs)]})
    a_nrm = acc(add_view(flat_nrm, 34962), len(nrm), 'VEC3', 5126)
    a_col = acc(add_view(flat_col, 34962), len(pos), 'VEC4', 5126)
    a_idx = acc(add_view(flat_idx, 34963), len(idx), 'SCALAR', 5123)
    gltf['meshes'].append({'name': name, 'primitives': [{'attributes': {'POSITION': a_pos, 'NORMAL': a_nrm, 'COLOR_0': a_col}, 'indices': a_idx, 'material': 0, 'mode': 4}]})
    return len(gltf['meshes']) - 1


# ---------------------------------------------------------------- utilidades de cena
def add_node(gltf, name, translation=(0, 0, 0), mesh=None, children=None):
    node = {'name': name}
    if any(abs(t) > 1e-9 for t in translation):
        node['translation'] = [round(t, 6) for t in translation]
    if mesh is not None:
        node['mesh'] = mesh
    if children:
        node['children'] = list(children)
    gltf['nodes'].append(node)
    return len(gltf['nodes']) - 1


def index_of(gltf, name):
    for i, n in enumerate(gltf['nodes']):
        if n.get('name') == name:
            return i
    raise KeyError(name)


def reparent(gltf, child, new_parent, translation):
    """Move `child` para `new_parent` com a translação local dada (sem tocar nos filhos dele)."""
    for n in gltf['nodes']:
        if child in n.get('children', []):
            n['children'].remove(child)
    gltf['nodes'][new_parent].setdefault('children', []).append(child)
    node = gltf['nodes'][child]
    if any(abs(t) > 1e-9 for t in translation):
        node['translation'] = [round(t, 6) for t in translation]
    elif 'translation' in node:
        del node['translation']


def world_offsets(gltf):
    """Translação mundial de cada nó (só translação: o modelo original não tem rotação nem escala)."""
    out = {}
    parent = {}
    for i, n in enumerate(gltf['nodes']):
        for c in n.get('children', []):
            parent[c] = i

    def w(i):
        if i in out:
            return out[i]
        t = gltf['nodes'][i].get('translation', [0, 0, 0])
        base = w(parent[i]) if i in parent else (0, 0, 0)
        out[i] = tuple(base[k] + t[k] for k in range(3))
        return out[i]
    for i in range(len(gltf['nodes'])):
        w(i)
    return out, parent


# ---------------------------------------------------------------- principal
def add_smooth_normals(gltf, binary, prim):
    """O GLB original não traz NORMAL: gera normais suaves (média das faces em cada vértice)."""
    pos_acc = gltf['accessors'][prim['attributes']['POSITION']]
    bv = gltf['bufferViews'][pos_acc['bufferView']]
    base = bv.get('byteOffset', 0) + pos_acc.get('byteOffset', 0)
    stride = bv.get('byteStride', 12)
    n = pos_acc['count']
    P = [struct.unpack_from('<3f', binary, base + i * stride) for i in range(n)]
    idx_acc = gltf['accessors'][prim['indices']]
    ibv = gltf['bufferViews'][idx_acc['bufferView']]
    fmt = {5123: 'H', 5125: 'I'}[idx_acc['componentType']]
    size = struct.calcsize(fmt)
    ibase = ibv.get('byteOffset', 0) + idx_acc.get('byteOffset', 0)
    I = [struct.unpack_from('<' + fmt, binary, ibase + k * size)[0] for k in range(idx_acc['count'])]
    acc = [[0.0, 0.0, 0.0] for _ in range(n)]
    for t in range(0, len(I), 3):
        a, b, c = I[t], I[t + 1], I[t + 2]
        u = [P[b][k] - P[a][k] for k in range(3)]
        v = [P[c][k] - P[a][k] for k in range(3)]
        f = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
        for vi in (a, b, c):
            for k in range(3):
                acc[vi][k] += f[k]
    while len(binary) % 4:
        binary.append(0)
    off = len(binary)
    blob = bytearray()
    for v in acc:
        ln = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) or 1.0
        blob += struct.pack('<3f', v[0] / ln, v[1] / ln, v[2] / ln)
    binary.extend(blob)
    gltf['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(blob), 'target': 34962})
    gltf['accessors'].append({'bufferView': len(gltf['bufferViews']) - 1, 'byteOffset': 0, 'componentType': 5126, 'count': n, 'type': 'VEC3'})
    prim['attributes']['NORMAL'] = len(gltf['accessors']) - 1


def main(src, dst):
    gltf, binary = read_glb(src)
    original_nodes = len(gltf['nodes'])
    before, _ = world_offsets(gltf)
    before_meshes = {i: before[i] for i, n in enumerate(gltf['nodes']) if 'mesh' in n}

    # --- material único (o motor exige um por primitiva) e normais suaves nas peças originais
    gltf['materials'] = [{'name': 'Sophia_vetor', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0.0, 'roughnessFactor': 0.75}}]
    for mesh in gltf['meshes']:
        for prim in mesh['primitives']:
            if 'NORMAL' not in prim['attributes']:
                add_smooth_normals(gltf, binary, prim)
            prim['material'] = 0
    # cor por vértice em byte normalizado (como o original); garante o flag
    for acc in gltf['accessors']:
        if acc.get('componentType') == 5121 and acc.get('type') == 'VEC4':
            acc['normalized'] = True

    scene_roots = list(gltf['scenes'][0]['nodes'])

    # --- corpo: pivô no quadril; o tronco fica como filho dele
    body_piv = add_node(gltf, 'pv_body', BODY_PIV)
    tro = index_of(gltf, 'Tronco')
    reparent(gltf, tro, body_piv, tuple(-x for x in BODY_PIV))
    scene_roots = [body_piv if r == tro else r for r in scene_roots]

    # --- cabeça: pivô no pescoço, filha do corpo; orelhas com pivô próprio dentro da cabeça
    head_piv = add_node(gltf, 'pv_head', tuple(HEAD_PIV[k] - BODY_PIV[k] for k in range(3)))
    gltf['nodes'][body_piv].setdefault('children', []).append(head_piv)
    cab = index_of(gltf, 'Cabeca')
    reparent(gltf, cab, head_piv, tuple(-x for x in HEAD_PIV))
    scene_roots = [r for r in scene_roots if r != cab]

    for side, piv, name in (('L', EAR_L_PIV, 'Orelha_Esquerda'), ('R', EAR_R_PIV, 'Orelha_Direita')):
        ear_piv = add_node(gltf, f'pv_ear_{side}', tuple(piv[k] - HEAD_PIV[k] for k in range(3)))
        gltf['nodes'][head_piv].setdefault('children', []).append(ear_piv)
        reparent(gltf, index_of(gltf, name), ear_piv, tuple(-x for x in piv))

    # --- pernas: pivô no quadril (raiz da cena); o pé (filho da perna) vai junto
    for side, piv, name in (('L', LEG_L_PIV, 'Perna_Esquerda'), ('R', LEG_R_PIV, 'Perna_Direita')):
        leg_piv = add_node(gltf, f'pv_leg_{side}', piv)
        scene_roots.append(leg_piv)
        reparent(gltf, index_of(gltf, name), leg_piv, tuple(-x for x in piv))

    # --- cauda: pivô na base, filho do corpo; só as peças que saem direto do tronco vão para o pivô
    tail_piv = add_node(gltf, 'pv_tail', tuple(TAIL_PIV[k] - BODY_PIV[k] for k in range(3)))
    gltf['nodes'][body_piv].setdefault('children', []).append(tail_piv)
    tail_names = [n['name'] for n in gltf['nodes'] if n.get('name', '').startswith('Cauda_Seg_')]
    for name in tail_names:
        i = index_of(gltf, name)
        parent_name = None
        for j, n in enumerate(gltf['nodes']):
            if i in n.get('children', []):
                parent_name = n.get('name')
        if parent_name == 'Tronco':
            reparent(gltf, i, tail_piv, tuple(-x for x in TAIL_PIV))

    # --- braço que aponta: pivô no ombro esquerdo (lado da tela onde fica o menu)
    arm_piv = add_node(gltf, 'pv_arm_L', tuple(SHOULDER_L[k] - BODY_PIV[k] for k in range(3)))
    gltf['nodes'][body_piv].setdefault('children', []).append(arm_piv)
    arm_mesh = mesh_from_tris(gltf, binary, 'arm_L_tube', tube_x_tris(ARM_LEN, 0.022), COL_SLEEVE)
    arm_tube = add_node(gltf, 'arm_L_tube', (0, 0, 0), mesh=arm_mesh)
    hand_mesh = mesh_from_tris(gltf, binary, 'hand_L', sphere_tris((0, 0, 0), 0.030), COL_HAND)
    hand = add_node(gltf, 'hand_L', (ARM_LEN + 0.01, 0, 0), mesh=hand_mesh)
    gltf['nodes'][arm_piv]['children'] = [arm_tube, hand]
    gltf['nodes'][arm_tube]['children'] = []

    # --- olhos: esclera no nó do olho (centro = pivô da rotação do olhar); pupila é filha dele
    sclera_mesh = mesh_from_tris(gltf, binary, 'sclera', sphere_tris((0, 0, 0), SCLERA_R), COL_SCLERA)
    pupil_mesh = mesh_from_tris(gltf, binary, 'pupil', sphere_tris((0, 0, 0), PUPIL_R, 10, 8), COL_PUPIL)
    for side, eye in (('L', EYE_L), ('R', EYE_R)):
        local = tuple(eye[k] - HEAD_PIV[k] for k in range(3))
        pup = add_node(gltf, f'pupil_{side}', (0, 0, PUPIL_Z), mesh=pupil_mesh)
        eye_node = add_node(gltf, f'eye_{side}', local, mesh=sclera_mesh, children=[pup])
        gltf['nodes'][head_piv].setdefault('children', []).append(eye_node)

    gltf['scenes'][0]['nodes'] = scene_roots
    gltf['buffers'][0]['byteLength'] = len(binary)

    # --- verificação: nenhuma peça original pode ter mudado de lugar no mundo
    after, _ = world_offsets(gltf)
    worst = 0.0
    for i, p in before_meshes.items():
        name = gltf['nodes'][i].get('name')
        j = index_of(gltf, name)
        q = after[j]
        worst = max(worst, max(abs(p[k] - q[k]) for k in range(3)))
    assert worst < 1e-6, f'peça original saiu do lugar (erro {worst})'
    print(f'nós originais: {original_nodes} · nós depois: {len(gltf["nodes"])} · peças conferidas: {len(before_meshes)} · erro máx.: {worst:.2e}')

    write_glb(dst, gltf, binary)
    print('gravado:', dst)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
