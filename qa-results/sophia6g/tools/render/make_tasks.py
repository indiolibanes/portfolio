"""make_tasks.py GLB TAG OUT.json [--full]  — tarefas de render padronizadas (mesma câmera/luz para 6F e 6G)."""
import json, sys, struct
glb, tag, out = sys.argv[1:4]
full = '--full' in sys.argv
views = ['front', 'threequarters', 'profile_L', 'profile_R', 'back', 'face', 'face_profile_L', 'face_profile_R',
         'face_34L', 'eyes', 'ear_close_R', 'ear_close_L', 'fur', 'tail', 'paws', 'book', 'head_top']
t = [{'name': f'{tag}/{v}', 'file': glb, 'view': v} for v in views]
t += [{'name': f'{tag}/{v}_clay', 'file': glb, 'view': v, 'clay': True} for v in ['face', 'face_profile_L', 'face_34L', 'front', 'tail', 'threequarters']]
t += [{'name': f'{tag}/face_clay', 'file': glb, 'view': 'face', 'clay': True}]
t += [{'name': f'{tag}/write_pose', 'file': glb, 'view': 'write_close', 'clip': 'Write', 'time': 1.0}]
if full:
    d = open(glb, 'rb').read(); n = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + n])
    for a in j['animations']:
        dur = max(j['accessors'][s['input']]['max'][0] for s in a['samplers'])
        for fr in (0, .5, .999):
            t.append({'name': f'{tag}/anim/{a["name"]}_{fr}', 'file': glb, 'view': 'threequarters', 'clip': a['name'], 'time': dur * fr})
        # pico de Blink (canal weights)
        for ch in a['channels']:
            if ch['target']['path'] == 'weights':
                s = a['samplers'][ch['sampler']]
                import numpy as np
                ia, oa = j['accessors'][s['input']], j['accessors'][s['output']]
                bv_i, bv_o = j['bufferViews'][ia['bufferView']], j['bufferViews'][oa['bufferView']]
                binoff = 20 + n + 8
                ti = np.frombuffer(d, np.float32, ia['count'], binoff + bv_i.get('byteOffset', 0) + ia.get('byteOffset', 0))
                wo = np.frombuffer(d, np.float32, oa['count'], binoff + bv_o.get('byteOffset', 0) + oa.get('byteOffset', 0)).reshape(len(ti), -1)
                t.append({'name': f'{tag}/anim/{a["name"]}_blink_peak', 'file': glb, 'view': 'face', 'clip': a['name'], 'time': float(ti[int(np.argmax(wo[:, 0]))])})
    for k, v in {'Blink_0': [0, 0, 0, 0], 'Blink_05': [.5, 0, 0, 0], 'Blink_1': [1, 0, 0, 0], 'Smile': [0, 1, 0, 0], 'BrowRaise': [0, 0, 1, 0],
                 'MouthOpen': [0, 0, 0, 1], 'Blink1_Smile': [1, 1, 0, 0], 'Blink1_BrowRaise': [1, 0, 1, 0], 'Blink1_MouthOpen': [1, 0, 0, 1], 'Combined': [.3, .6, .3, .2]}.items():
        t.append({'name': f'{tag}/morphs/{k}', 'file': glb, 'view': 'face', 'weights': v})
json.dump(t, open(out, 'w'))
print(len(t), 'tarefas')
