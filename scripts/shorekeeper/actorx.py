"""Minimal, read-only ActorX (PSK / PSA) parser. Pure python + numpy.
Untrusted input: every size is validated against the file length."""
import struct, numpy as np

def _s(b):
    return b.split(b"\x00", 1)[0].decode("latin-1")

def chunks(path):
    data = open(path, "rb").read()
    off, out = 0, {}
    order = []
    while off + 32 <= len(data):
        cid = _s(data[off:off + 20]); flag, size, count = struct.unpack_from("<iii", data, off + 20)
        off += 32
        n = size * count
        if size < 0 or count < 0 or off + n > len(data):
            raise ValueError(f"bad chunk {cid} size={size} count={count} at {off}")
        out[cid] = (size, count, data[off:off + n]); order.append((cid, size, count))
        off += n
    return out, order, len(data)

def parse_bones(size, count, raw):
    assert size == 120, size
    bones = []
    for i in range(count):
        b = raw[i * 120:(i + 1) * 120]
        name = _s(b[:64]); flags, nchild, parent = struct.unpack_from("<Iii", b, 64)
        qx, qy, qz, qw, px, py, pz, length, sx, sy, sz = struct.unpack_from("<11f", b, 76)
        bones.append(dict(name=name, flags=flags, nchild=nchild, parent=parent,
                          quat=(qx, qy, qz, qw), pos=(px, py, pz), length=length, size=(sx, sy, sz)))
    return bones

def read_psk(path):
    ch, order, fsize = chunks(path)
    psk = dict(order=order, filesize=fsize)
    s, c, r = ch["PNTS0000"]; psk["points"] = np.frombuffer(r, "<f4").reshape(c, 3).copy()
    if "VTXW0000" in ch:
        s, c, r = ch["VTXW0000"]; assert s == 16
        a = np.frombuffer(r, dtype=[("pt", "<u2"), ("pad", "<u2"), ("u", "<f4"), ("v", "<f4"), ("mat", "u1"), ("res", "u1"), ("pad2", "<u2")])
    else:
        s, c, r = ch["VTXW3200"]; assert s == 16
        a = np.frombuffer(r, dtype=[("pt", "<u4"), ("u", "<f4"), ("v", "<f4"), ("mat", "u1"), ("res", "u1"), ("pad2", "<u2")])
    psk["wedges"] = a
    if "FACE0000" in ch:
        s, c, r = ch["FACE0000"]; assert s == 12
        f = np.frombuffer(r, dtype=[("w", "<u2", 3), ("mat", "u1"), ("aux", "u1"), ("sg", "<u4")])
    else:
        s, c, r = ch["FACE3200"]; assert s == 18
        f = np.frombuffer(r, dtype=[("w", "<u4", 3), ("mat", "u1"), ("aux", "u1"), ("sg", "<u4")])
    psk["faces"] = f
    s, c, r = ch["MATT0000"]; mats = []
    for i in range(c):
        b = r[i * s:(i + 1) * s]; mats.append(dict(name=_s(b[:64]), tex=struct.unpack_from("<i", b, 64)[0], flags=struct.unpack_from("<I", b, 68)[0]))
    psk["materials"] = mats
    s, c, r = ch["REFSKELT"]; psk["bones"] = parse_bones(s, c, r)
    s, c, r = ch["RAWWEIGHTS"]; assert s == 12
    psk["weights"] = np.frombuffer(r, dtype=[("w", "<f4"), ("pt", "<i4"), ("bone", "<i4")])
    psk["extra_uv"] = {k: np.frombuffer(v[2], "<f4").reshape(v[1], 2) for k, v in ch.items() if k.startswith("EXTRAUVS")}
    if "VTXNORMS" in ch:
        s, c, r = ch["VTXNORMS"]; psk["normals"] = np.frombuffer(r, "<f4").reshape(c, 3)
    if "VERTEXCOLOR" in ch:
        s, c, r = ch["VERTEXCOLOR"]; psk["vcol"] = np.frombuffer(r, "u1").reshape(c, 4)
    if "MRPHINFO" in ch:
        s, c, r = ch["MRPHINFO"]; assert s == 68
        info = [(_s(r[i * 68:i * 68 + 64]), struct.unpack_from("<i", r, i * 68 + 64)[0]) for i in range(c)]
        s2, c2, r2 = ch["MRPHDATA"]; assert s2 == 28
        d = np.frombuffer(r2, dtype=[("dpos", "<f4", 3), ("dnrm", "<f4", 3), ("pt", "<i4")])
        morphs, o = [], 0
        for name, vc in info:
            morphs.append(dict(name=name, count=vc, data=d[o:o + vc])); o += vc
        psk["morph_total_deltas"] = int(c2); psk["morph_consumed"] = o
        psk["morphs"] = morphs
    return psk

def read_psa(path):
    ch, order, fsize = chunks(path)
    s, c, r = ch["BONENAMES"]; bones = parse_bones(s, c, r)
    s, c, r = ch["ANIMINFO"]; seqs = []
    for i in range(c):
        b = r[i * s:(i + 1) * s]
        name = _s(b[:64]); group = _s(b[64:128])
        (total_bones, root_inc, comp, quotum, red, tracktime, rate, startbone, firstframe, numframes) = struct.unpack_from("<iiiifffiii", b, 128)
        seqs.append(dict(name=name, group=group, total_bones=total_bones, track_time=tracktime, rate=rate, first=firstframe, frames=numframes, info_size=s))
    s, c, r = ch["ANIMKEYS"]; assert s == 32
    keys = np.frombuffer(r, dtype=[("pos", "<f4", 3), ("quat", "<f4", 4), ("time", "<f4")])
    scale = None
    if "SCALEKEYS" in ch:
        s, c, r = ch["SCALEKEYS"]; scale = np.frombuffer(r, dtype=[("s", "<f4", 3), ("time", "<f4")])
    return dict(order=order, bones=bones, seqs=seqs, keys=keys, scale=scale, filesize=fsize)
