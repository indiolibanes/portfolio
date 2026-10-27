import json, struct, numpy as np
CT={5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
class GLB:
    def __init__(s,path):
        d=open(path,'rb').read(); s.raw=d
        m,v,L=struct.unpack('<III',d[:12]); assert m==0x46546C67
        o=12; s.j=None; s.bin=None
        while o<len(d):
            cl,ct=struct.unpack('<II',d[o:o+8]); body=d[o+8:o+8+cl]; o+=8+cl
            if ct==0x4E4F534A: s.j=json.loads(body.decode('utf8'))
            elif ct==0x004E4942: s.bin=bytearray(body)
    def _loc(s,i):
        a=s.j['accessors'][i]
        assert 'bufferView' in a, 'zero accessor'
        bv=s.j['bufferViews'][a['bufferView']]
        dt=np.dtype(CT[a['componentType']]); n=NC[a['type']]
        off=bv.get('byteOffset',0)+a.get('byteOffset',0)
        stride=bv.get('byteStride') or dt.itemsize*n
        return a,dt,n,off,stride
    def read(s,i):
        a0=s.j['accessors'][i]
        if 'bufferView' not in a0: return np.zeros((a0['count'],NC[a0['type']]),CT[a0['componentType']])
        a,dt,n,off,stride=s._loc(i)
        if stride==dt.itemsize*n:
            arr=np.frombuffer(s.bin,dtype=dt,count=a['count']*n,offset=off).reshape(a['count'],n).copy()
        else:
            arr=np.stack([np.frombuffer(s.bin,dtype=dt,count=n,offset=off+k*stride) for k in range(a['count'])])
        return arr
    def write_f32(s,i,arr):
        a,dt,n,off,stride=s._loc(i); assert dt==np.float32 and stride==12 and n==3 or n==3
        arr=np.asarray(arr,np.float32).reshape(a['count'],n)
        assert stride==dt.itemsize*n
        s.bin[off:off+arr.nbytes]=arr.tobytes()
        if a['type']=='VEC3' and 'min' in a:
            a['min']=[float(x) for x in arr.min(0)]; a['max']=[float(x) for x in arr.max(0)]
    def write_raw(s,i,arr):
        """escreve array ja no dtype de armazenamento e atualiza min/max (convencao do arquivo: valores crus)"""
        a,dt,n,off,stride=s._loc(i); assert stride==dt.itemsize*n
        arr=np.asarray(arr).astype(dt).reshape(a['count'],n)
        s.bin[off:off+arr.nbytes]=arr.tobytes()
        if 'min' in a:
            a['min']=[(float(x) if dt.kind=='f' else int(x)) for x in arr.min(0)]; a['max']=[(float(x) if dt.kind=='f' else int(x)) for x in arr.max(0)]
    def save(s,path):
        js=json.dumps(s.j,separators=(',',':'),ensure_ascii=False).encode('utf8')
        js+=b' '*((4-len(js)%4)%4)
        b=bytes(s.bin); b+=b'\0'*((4-len(b)%4)%4)
        out=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(b))
        out+=struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(b),0x004E4942)+b
        open(path,'wb').write(out)
