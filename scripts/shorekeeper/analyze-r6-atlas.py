"""Private raster analysis: ATLAS_JSON CAPTURE_ROOT OUTPUT_JSON [OBSERVATIONS_JSON].
Requires Pillow and numpy. Aggregate metadata only is written to OUTPUT_JSON.
Contacts stay with the private captures; no anatomy or human approval is inferred from pixel counts.
"""
import hashlib, json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
atlas_file, root, output = map(Path, sys.argv[1:4])
repo = Path(__file__).resolve().parents[2]
root = root.resolve()
if root == repo or repo in root.parents:
    raise SystemExit('Capture directory must be outside the repository')
a = json.loads(atlas_file.read_text())
manifest = json.loads((root/'capture-manifest.json').read_text())
assert manifest['canonicalSha256'] == a['canonicalGlbSha256']
lookup = {(c['meshName'], c['index'], c['yaw'], c['weight']): c for c in manifest['captures']}
observations = json.loads(Path(sys.argv[4]).read_text()) if len(sys.argv)>4 else None
if observations:
    assert observations['canonicalGlbSha256'] == a['canonicalGlbSha256']
    observations = {(m['meshName'],m['index']):m for m in observations['morphs']}
(root/'contacts').mkdir(exist_ok=True)
for m in a['morphs']:
    contact = Image.new('RGB',(640,432),'#121820'); draw = ImageDraw.Draw(contact); samples=[]
    for row,yaw in enumerate([0,45,90]):
        neutral = np.array(Image.open(root/lookup[m['meshName'],m['index'],yaw,0]['file']).convert('RGB')).astype('int16')
        for col,w in enumerate([0,.25,.5,.75,1]):
            c=lookup[m['meshName'],m['index'],yaw,w]; file=root/c['file']
            assert hashlib.sha256(file.read_bytes()).hexdigest()==c['sha256']
            im=Image.open(file).convert('RGB'); diff=np.max(np.abs(np.array(im).astype('int16')-neutral),axis=2)
            ys,xs=np.where(diff>8); count=len(xs)
            samples.append(dict(yaw=yaw,weight=w,changedPixelsAbove8=count,maxRgbDelta=int(diff.max()),bbox=None if not count else [int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]))
            im.thumbnail((128,128));contact.paste(im,(col*128,row*144+16));draw.text((col*128,row*144),f'{yaw} / {w}',fill='white')
    contact.save(root/'contacts'/f"{m['meshName']}-{m['index']}.jpg",quality=88)
    m['pixelEvidence']=dict(renderClass='SWIFTSHADER_WEBGL2',threshold=8,viewport=[512,512],samples=samples,humanApproval=None)
    m['evidenceReferences']=[f"PRIVATE_ATLAS/{m['meshName']}/{m['index']}-{m['name']}-ANGLE-WEIGHT.png"]
    if observations:
        review=observations[m['meshName'],m['index']]
        m.update({k:review[k] for k in ['status','visualObservation','direction','dependencies','artifactReview']})
a['renderManifestSha256']=hashlib.sha256((root/'capture-manifest.json').read_bytes()).hexdigest()
a['status']='GEOMETRY_AND_1455_SWIFTSHADER_RENDERS_COMPLETE_HUMAN_PENDING'
output.write_text(json.dumps(a,ensure_ascii=False,separators=(',',':'))+'\n')
print('RASTER_ANALYSIS',len(a['morphs']),len(lookup),'HUMAN_APPROVAL_NONE')
