"""Prove all original tracked files outside the permitted document/package set match base."""
import subprocess,pathlib,hashlib,json
BASE='d638f6e3a608cf953ffcb0322b41fb0dd051416d'
allowed={'package.json','docs/sophia/adornments-r1/asset-manifest.json'}
entries=[x for x in subprocess.check_output(['git','ls-tree','-rz',BASE],text=True).split('\0')if x];rows=[]
for l in entries:
 info,name=l.split('\t',1);mode,kind,expected=info.split()
 if kind!='blob'or name in allowed:continue
 p=pathlib.Path(name);b=p.read_bytes()if p.is_file()else None;actual=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()if b is not None else None
 rows.append({'path':name,'gitBlobExpected':expected,'gitBlobActual':actual,'same':expected==actual})
changed=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],text=True).splitlines();new=[]
for l in changed:
 name=l[3:];ok=name in allowed or name.startswith('docs/sophia/adornments-r1/results/')or name.startswith('scripts/sophia-adornments/')or name=='tests/sophia-adornments-recovery.test.mjs'
 new.append({'path':name,'withinAllowedScope':ok})
r={'base':BASE,'allProtectedTrackedFilesUnchanged':all(x['same']for x in rows),'allWorkingChangesWithinScope':all(x['withinAllowedScope']for x in new),'protectedTrackedFileCount':len(rows),'publicGlbsOrPagesChanged':False,'astronautBinary':'Not written; remote anonymous GET returned 403; 47 clips/hash are inherited report evidence, not fresh binary verification','protectedFiles':rows,'workingChanges':new}
out=pathlib.Path('docs/sophia/adornments-r1/results/preservation.json');out.write_text(json.dumps(r,indent=2)+'\n');assert r['allProtectedTrackedFilesUnchanged'] and r['allWorkingChangesWithinScope'];print('PRESERVATION_PASS',len(rows))
