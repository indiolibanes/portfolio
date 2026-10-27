"""Checagens estruturais 6F x 6G (independentes do Validator).

Uso: python structural_6g.py 6F.glb 6G.glb SAIDA.json
"""
import sys, json, hashlib
import numpy as np
from sophia_motion_runtime import MotionModel

a = MotionModel(sys.argv[1])
b = MotionModel(sys.argv[2])
r = {'base_sha256': a.sha256, 'candidate_sha256': b.sha256, 'checks': {}, 'per_primitive': [], 'motion': []}
c = r['checks']
c['nodes_identical'] = a.j['nodes'] == b.j['nodes']
c['skins_json_identical_except_accessor_index'] = [{k: v for k, v in s.items() if k != 'inverseBindMatrices'} for s in a.j['skins']] == \
    [{k: v for k, v in s.items() if k != 'inverseBindMatrices'} for s in b.j['skins']]
c['joint_count'] = [len(a.j['skins'][0]['joints']), len(b.j['skins'][0]['joints'])]
c['inverse_bind_matrices_identical'] = all(np.array_equal(a.acc(x['inverseBindMatrices']), b.acc(y['inverseBindMatrices'])) for x, y in zip(a.j['skins'], b.j['skins']))
c['animation_names'] = [[x['name'] for x in a.j['animations']], [x['name'] for x in b.j['animations']]]
same = True
for x, y in zip(a.j['animations'], b.j['animations']):
    if len(x['channels']) != len(y['channels']):
        same = False
        continue
    for cx, cy in zip(x['channels'], y['channels']):
        sx, sy = x['samplers'][cx['sampler']], y['samplers'][cy['sampler']]
        if cx['target'] != cy['target'] or sx.get('interpolation') != sy.get('interpolation'):
            same = False
        if not (np.array_equal(a.acc(sx['input']), b.acc(sy['input'])) and np.array_equal(a.acc(sx['output']), b.acc(sy['output']))):
            same = False
c['animation_channels_and_keyframes_identical'] = same
c['morph_target_names'] = [a.j['meshes'][0]['extras']['targetNames'], b.j['meshes'][0]['extras']['targetNames']]
c['all_primitives_have_4_targets'] = all(len(p.get('targets', [])) == 4 for p in b.j['meshes'][0]['primitives'])


def img_bytes(m):
    out = []
    for im in m.j['images']:
        bv = m.j['bufferViews'][im['bufferView']]
        o = bv.get('byteOffset', 0)
        out.append(hashlib.sha256(m.bin[o:o + bv['byteLength']]).hexdigest())
    return out


c['image_bytes_identical'] = img_bytes(a) == img_bytes(b)
c['materials_count'] = [len(a.j['materials']), len(b.j['materials'])]
changed_mats = [i for i, (x, y) in enumerate(zip(a.j['materials'], b.j['materials'])) if x != y]
c['materials_changed'] = [(i, b.j['materials'][i]['name']) for i in changed_mats]
c['primitives'] = [len(a.j['meshes'][0]['primitives']), len(b.j['meshes'][0]['primitives'])]
c['book_pen_meshes_identical'] = all(
    all(np.array_equal(a.acc(pa['attributes'][k]), b.acc(pb['attributes'][k])) for k in pa['attributes']) and
    np.array_equal(a.acc(pa['indices']), b.acc(pb['indices']))
    for ma, mb in zip(a.j['meshes'][1:], b.j['meshes'][1:]) for pa, pb in zip(ma['primitives'], mb['primitives']))
# primitivas inalteradas (geometria) entre 6F e 6G
unchanged, changed = [], []
for i, (pa, pb) in enumerate(zip(a.j['meshes'][0]['primitives'], b.j['meshes'][0]['primitives'])):
    eq = all(k in pb['attributes'] and np.array_equal(a.acc(pa['attributes'][k]), b.acc(pb['attributes'][k])) for k in pa['attributes'])
    eq = eq and np.array_equal(a.acc(pa['indices']).astype(np.int64), b.acc(pb['indices']).astype(np.int64))
    eq = eq and all(np.array_equal(a.acc(ta['POSITION']), b.acc(tb['POSITION'])) for ta, tb in zip(pa.get('targets', []), pb.get('targets', [])))
    (unchanged if eq else changed).append(i)
c['mesh0_primitives_byte_equivalent'] = len(unchanged)
c['mesh0_primitives_changed'] = changed
c['mesh0_primitives_added'] = list(range(len(a.j['meshes'][0]['primitives']), len(b.j['meshes'][0]['primitives'])))
uv_same = True
for i in unchanged:
    pa, pb = a.j['meshes'][0]['primitives'][i], b.j['meshes'][0]['primitives'][i]
    if 'TEXCOORD_0' in pa['attributes']:
        uv_same &= np.array_equal(a.acc(pa['attributes']['TEXCOORD_0']), b.acc(pb['attributes']['TEXCOORD_0']))
c['uv_arrays_identical_on_unchanged_primitives'] = bool(uv_same)
for name, m in (('6F', a), ('6G', b)):
    for d in m.primitives:
        v, f = d['v'], d['f']
        n = m.acc(d['p']['attributes']['NORMAL'])
        area = np.linalg.norm(np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]]), axis=1) / 2
        row = {'model': name, 'mesh': d['mesh'], 'primitive': d['primitive'], 'finite': bool(np.isfinite(v).all() and np.isfinite(n).all()),
               'indices_valid': bool(f.min() >= 0 and f.max() < len(v)), 'normal_max_unit_error': float(abs(np.linalg.norm(n, axis=1) - 1).max()),
               'zero_area_triangles_lt_1e-12': int((area < 1e-12).sum()), 'triangles': len(f)}
        if 'we' in d:
            row['weight_max_sum_error'] = float(abs(d['we'].sum(1) - 1).max())
            row['max_joint_index'] = int(d['jo'].max())
        r['per_primitive'].append(row)
for name, m in (('6F', a), ('6G', b)):
    rows = [x for x in r['per_primitive'] if x['model'] == name]
    c[f'{name}_all_finite'] = all(x['finite'] for x in rows)
    c[f'{name}_all_indices_valid'] = all(x['indices_valid'] for x in rows)
    c[f'{name}_max_normal_unit_error'] = max(x['normal_max_unit_error'] for x in rows)
    c[f'{name}_max_weight_sum_error'] = max(x.get('weight_max_sum_error', 0) for x in rows)
    c[f'{name}_zero_area_triangles'] = sum(x['zero_area_triangles_lt_1e-12'] for x in rows)
    c[f'{name}_triangles'] = sum(x['triangles'] for x in rows)
    c[f'{name}_max_joint_index_ok'] = max(x.get('max_joint_index', 0) for x in rows) < len(m.j['skins'][0]['joints'])
for ai, an in enumerate(b.animations):
    for t in np.linspace(0, an['duration'], 13):
        pose = b.pose(ai, float(t))
        r['motion'].append({'clip': an['name'], 'time_s': float(t), 'finite': all(bool(np.isfinite(v).all()) for v in pose.values())})
c['6G_all_animation_samples_finite'] = all(x['finite'] for x in r['motion'])
json.dump(r, open(sys.argv[3], 'w'), indent=1)
for k, v in c.items():
    print(f'{k}: {v}')
