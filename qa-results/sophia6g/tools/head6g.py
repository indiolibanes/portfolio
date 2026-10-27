"""Sophia 6G — crânio, focinho e pescoço paramétricos (superfície de revolução esculpida por campos locais).

Coordenadas no espaço de bind do GLB (metros, +Z = frente, +Y = cima). Tudo determinístico.
"""
import numpy as np

P = dict(
    yc=.655, ry_top=.136, ry_bot=.112, rx=.156, rz=.136,
    cheek=.016, cheek_y=.603, cheek_s=.042,      # largura extra na altura das bochechas
    jaw=.30,                                      # estreitamento em V do terço inferior
    flat=.13,                                     # achatamento do plano facial central
    muzzle=.036, bridge_y=.668, nose_y=.592, lip_y=.566, chin_y=.540,
    whisker=.0055, orbit=.0052, orbit_x=.066, orbit_y=.623,
    brow=.0028, temple=.006,
    neck_y=.488, neck_rx=.050, neck_rz=.040, neck_z=.034,
)


def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


FP_Y = [.520, .535, .548, .560, .580, .600, .620, .650, .680, .720, .760]
FP_Z = [.046, .070, .092, .112, .126, .130, .132, .131, .127, .115, .090]
MZ_Y = [.530, .540, .550, .560, .568, .580, .592, .605, .620, .635, .650, .665]
MZ_A = [.000, .000, .006, .016, .023, .034, .041, .035, .021, .010, .004, .000]
MZ_S = [.030, .028, .026, .024, .022, .019, .016, .018, .022, .026, .030, .032]


def face_disp(x, y, z0c, front):
    """Deslocamento frontal dz (e lateral dx). z0c = profundidade da base elipsoidal em x=0 na mesma altura."""
    p = P
    ax = np.abs(x)
    # planalto facial: leva o plano frontal ao perfil desejado (sem o focinho)
    dd = np.interp(y, FP_Y, FP_Z) - z0c
    k = .004
    lift = k * np.logaddexp(0, dd / k) * np.exp(-(x / .082) ** 4)  # máximo suave (sem vinco)
    dz = lift * front
    # focinho em cunha
    amp = np.interp(y, MZ_Y, MZ_A)
    sig = np.interp(y, MZ_Y, MZ_S)
    dz += amp * np.exp(-(x / sig) ** 2) * front
    # coxins das vibrissas
    dz += p['whisker'] * np.exp(-((ax - .020) / .013) ** 2 - ((y - .571) / .011) ** 2) * front
    # órbitas
    dz -= p['orbit'] * np.exp(-((ax - p['orbit_x']) / .034) ** 2 - ((y - p['orbit_y']) / .022) ** 2) * front
    # arcada supraciliar discreta
    dz += p['brow'] * np.exp(-((ax - .060) / .040) ** 2 - ((y - .666) / .013) ** 2) * front
    dx = np.sign(x) * p['temple'] * np.exp(-((y - .585) / .030) ** 2) * ss(.03, .12, ax) * front
    return dx, dz


def build(NI=104, NK=144, neck_rings=10):
    """Retorna (v, f, uvkind) do crânio fechado no topo e aberto no pescoço."""
    p = P
    rings = []
    # cabeça: phi de 0 (topo) até phi_b (início do pescoço)
    phi_b = np.pi * .88
    for i in range(NI + 1):
        phi = phi_b * i / NI
        c = np.cos(phi)
        ry = p['ry_top'] if c >= 0 else p['ry_bot']
        y = p['yc'] + ry * c
        R = np.sin(phi)
        rx = p['rx'] + p['cheek'] * np.exp(-((y - p['cheek_y']) / p['cheek_s']) ** 2)
        rx *= 1 - p['jaw'] * ss(.600, .530, y) * .55
        rz = p['rz']
        rings.append((y, rx * R, rz * R, 0.0))
    # pescoço: transição suave do último anel da cabeça até o cilindro do pescoço
    y0, rx0, rz0, _ = rings[-1]
    for i in range(1, neck_rings + 1):
        t = i / neck_rings
        e = ss(0, 1, t)
        y = y0 + (p['neck_y'] - y0) * t
        rings.append((y, rx0 + (p['neck_rx'] - rx0) * e, rz0 + (p['neck_rz'] - rz0) * e, p['neck_z'] * e))
    v = []
    for (y, rx, rz, zo) in rings:
        for k in range(NK):
            th = 2 * np.pi * k / NK
            v.append([rx * np.cos(th), y, rz * np.sin(th) + zo])
    v = np.array(v)
    # deslocamentos faciais: ponderados pela frente (z>0) e somente na cabeça
    x, y, z = v.T
    front = ss(-.01, .06, z) * ss(.49, .52, y)
    # profundidade da base em x=0 para cada altura (máximo z do anel)
    ring_y = np.array([r[0] for r in rings]); ring_z = np.array([r[2] + r[3] for r in rings])
    o = np.argsort(ring_y)
    z0c = np.interp(y, ring_y[o], ring_z[o])
    dx, dz = face_disp(x, y, z0c, front)
    v[:, 0] += dx
    v[:, 2] += dz
    # faces
    nr = len(rings)
    f = []
    # topo: leque a partir do anel 1 (anel 0 é degenerado em um ponto) -> substitui anel 0 por um único polo
    top = 0
    for k in range(NK):
        f.append([top, NK + (k + 1) % NK, NK + k])
    for i in range(1, nr - 1):
        for k in range(NK):
            a = i * NK + k
            b = i * NK + (k + 1) % NK
            c = a + NK
            d = b + NK
            f.append([a, b, c])
            f.append([b, d, c])
    f = np.array(f)
    # remover vértices duplicados do polo (anel 0 inteiro colapsa em 1 ponto)
    keep = np.ones(len(v), bool)
    keep[1:NK] = False
    remap = np.cumsum(keep) - 1
    v = v[keep]
    f = remap[f]
    # orientar normais para fora (centro aproximado do volume)
    cen = np.array([0, p['yc'] - .02, 0])
    cr = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    bad = (cr * (v[f].mean(1) - cen)).sum(1) < 0
    f[bad] = f[bad][:, ::-1]
    return v, f


if __name__ == '__main__':
    v, f = build()
    print(len(v), len(f), v.min(0), v.max(0))
