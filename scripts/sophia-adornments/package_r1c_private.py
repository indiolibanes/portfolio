"""Hash and package explicitly private review assets; never writes public assets."""
import pathlib,json,hashlib,zipfile,shutil
R=pathlib.Path('local-private/adornments-r1c');D=pathlib.Path('docs/sophia/adornments-r1c/results')
files=[R/'r1b-baseline.glb',R/'sophia-r1c-collar-study.glb',R/'sophia-r1c-collar-study.blend',R/'sophia-r1c-collar-study.json']
for x in 'abc':files.extend([R/f'trial-{x}.glb',R/f'trial-{x}.json'])
files+=list((R/'review').glob('*.png'))+list((R/'review').glob('*.json'))+[p for p in (R/'media').iterdir()if p.is_file()and p.suffix in ['.png','.mp4','.gif']]+list(R.glob('*.log'))+[R/'media-metadata.json']
files=sorted(set(files));items=[]
for p in files:
 assert p.is_file(),p
 items.append({'name':p.relative_to(R).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
manifest={'status':'PRIVATE_REVIEW_ONLY_IDENTITY_BLOCKED','candidateSha256':'ce3386a08ce6624fb09cb34a7d9a9028f65f2d7d83033c552c4119363eb62666','sources':{'6h':'3b0e7db84809d6e4fe6eaa2bc6299874c202c529adcbd369cf83c6a29d3c3a2a','pilot':'fd278e201f1854dd1a2dae6f24064a0c2f9013262007cece70ff478c28ff1fce','C1Master':hashlib.sha256(pathlib.Path('../sources/C1/Sophia_2D_Master_RGBA.png').read_bytes()).hexdigest()},'files':items,'missing':[{'name':'C1_face_mark.mp4','status':'IDENTITY_BLOCKED; diagnostic video C1_identity_blocked.mp4 is not a mark solution'},{'name':'WebGL captures','status':'PENDING; browser failed before graphics context'}],'limits':['All rendered GLB views are Blender Cycles CPU, not WebGL','C1 art is single 2D reference, not synthetic orthographic truth','props_only_diagnostic and props-only-diagnostic hide body/garment: not contact approval','Trial hashes identify actual archived trial bytes; final builder changed local normal handling','Private binaries/media are not Git/CI public artifacts']}
(R/'private-asset-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
(R/'README-private.txt').write_text('SOPHIA R1.C — revisão privada, IDENTITY_BLOCKED.\nGLBs, BLEND e vídeos reais de ensaio. Não são corpo C1 aprovado ou integração de produção.\nPR draft: https://github.com/indiolibanes/portfolio/pull/305\nCódigo, relatórios e reprodução estão no PR; não faça merge automático.\nGLB final: sophia-r1c-collar-study.glb; nativo importado com Idle 0 ativo.\nOs 3 trial-*.glb são tentativas rejeitadas, nunca candidatos de produção.\nConfira private-asset-manifest.json antes de usar os arquivos.\nWrite MP4: 3 s; Coat Wave/Walk: 6 s; GIFs: 3 s. C1_face_mark.mp4 não foi implementado.\nProps-only é diagnóstico com corpo/roupa ocultos; não aprova contatos.\n')
zip_path=R/'Sophia_R1C_Private_Review.zip'
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6)as z:
 for p in files+[R/'private-asset-manifest.json',R/'README-private.txt']:z.write(p,p.relative_to(R).as_posix())
with zipfile.ZipFile(zip_path)as z:assert z.testzip()is None
manifest['bundle']={'name':zip_path.name,'bytes':zip_path.stat().st_size,'sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'members':len(files)+2}
(D/'r1c-private-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n');print(json.dumps({'bundle':manifest['bundle'],'files':len(files)}))
