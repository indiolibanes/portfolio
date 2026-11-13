"""Consolidate measured results. Private binary/captures stay outside Git."""
import json,pathlib,hashlib,csv,collections
from PIL import Image,ImageDraw
root=pathlib.Path('docs/sophia/adornments-r1');out=root/'results';private=pathlib.Path('local-private/adornments-r1');review=private/'review'
inventory=json.loads((out/'model-inventory.json').read_text());equiv=json.loads((out/'pilot-equivalence.json').read_text());coll=json.loads((out/'collision-summary.json').read_text());source=inventory['models'][0]
def write(n,s):(out/n).write_text(s,encoding='utf8')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for clip in ['Write','Idle','Wave','Walk']:
 frames=[Image.open(review/f'loop_{clip}_{i:02}.png').convert('RGB')for i in range(24)];frames[0].save(review/f'{clip}_3s.gif',save_all=True,append_images=frames[1:],duration=[120,130]*12,loop=0,optimize=False)
for label in ['source','pilot','e1']:
 canvas=Image.new('RGB',(1280,1660),'white');d=ImageDraw.Draw(canvas)
 for i,view in enumerate(['front','three-quarter','profile','back']):
  x=(i%2)*640;y=(i//2)*830;canvas.paste(Image.open(review/f'{label}_{view}.png'),(x,y+30));d.text((x+15,y+9),f'{label} / {view} / ORTHO 1.55',fill='black')
 canvas.save(review/f'{label}_orthos.png')
canvas=Image.new('RGB',(1280,830),'white');d=ImageDraw.Draw(canvas)
for x,label in [(0,'source'),(640,'pilot')]:canvas.paste(Image.open(review/f'{label}_front.png'),(x,30));d.text((x+15,9),label+' / original 6H body and pose',fill='black')
canvas.save(review/'source_vs_pilot.png')
records=json.loads((review/'render-records.json').read_text())
for name in ['contact-detail-records.json','collision-detail-records.json']:records+=json.loads((review/name).read_text())
for r in records:
 p=review/r['file'];r['sha256']=digest(p)
 with Image.open(p)as im:im.load();r['imageSize']=list(im.size)
 if r.get('clip')and r.get('method','').startswith('Blender 4.3.2'):r['NlaOffsetFrames']=1;r['BlenderFrameFromRecordedTime']=1+r['seconds']*24
capture={'status':'OFFLINE_REAL_GLB_RENDER_PASS; WEBGL_AND_ARTISTIC_PENDING','renderer':'Blender 4.3.2 CPU Cycles, 4–16 samples, no denoiser','poseTiming':'Imported NLA starts at frame 1; source t maps to 1+t*24. Original action data unchanged.','sharedOrthoFrame':{'scale':1.55,'targetBlenderZup':[.15,.05,.5],'imageSize':[640,800]},'records':records,'animations':[],'limits':['Offline renders are not live WebGL screenshots','Props-only details hide body for visibility; do not prove hand/coat clearance','Original source star group is three raised stars and does not satisfy C1 fringe/flat-skin marking','Render noise/occlusion limit visual inspection; no human approval is implied']}
for clip in ['Write','Idle','Wave','Walk']:
 p=review/f'{clip}_3s.gif'
 with Image.open(p)as im:
  total=0
  for i in range(im.n_frames):im.seek(i);total+=im.info.get('duration',0)
  capture['animations'].append({'file':p.name,'sha256':digest(p),'bytes':p.stat().st_size,'frames':im.n_frames,'totalMs':total,'sourceClipUnchanged':True,'sampling':'24 source-clip samples over 3 s, GIF timing quantized as 120/130 ms'})
write('capture-index.json',json.dumps(capture,indent=2)+'\n')

manifest=json.loads((root/'asset-manifest.json').read_text());manifest['status']='SOURCE_MATCHED_PILOT_PARTIAL_NO_PRODUCTION_GO';manifest['executionSourceHead']='d638f6e3a608cf953ffcb0322b41fb0dd051416d'
for s in manifest['sources']:
 if s['id']=='alpha6h':s.update(sha256=source['sha256'],verifiedNodes=[{'node':93,'name':'Sophia','mesh':0,'primitives':279,'skin':0},{'node':94,'name':'Book','mesh':1,'primitives':5,'parent':21},{'node':95,'name':'Pen','mesh':2,'primitives':2,'parent':27}],sourceState='SOURCE_VERIFIED',archivedEquivalent='SHA256_MATCHES_ARCHIVED_DECLARED_6H_CANDIDATE')
 if s['id']=='e1':s.update(sha256=inventory['models'][1]['sha256'],sourceState='SOURCE_VERIFIED_UNRIGGED',verifiedNodes=[{'node':0,'mesh':0,'skins':0,'clips':0}])
 if s['id']=='astronaut':s['executionNote']='Reference-only. Anonymous read returned HTTP 403; binary not reverified. All tracked runtime/API paths are unchanged; no remote write.'
for a in manifest['assets']:
 id=a['id']
 if id=='notebook':a.update(confidence='SOURCE_VERIFIED',verifiedSource={'node':94,'mesh':1,'primitives':[0,1,2,3,4],'triangles':224},decision='RECOVERED_INTEGRALLY_SAME_6H_CONTACT_PENDING')
 elif id=='pen':a.update(confidence='SOURCE_VERIFIED',verifiedSource={'node':95,'mesh':2,'primitives':[0,1],'triangles':2936},decision='RECOVERED_INTEGRALLY_SAME_6H_CONTACT_PENDING')
 elif id=='forehead_star':a.update(confidence='SOURCE_VERIFIED_C1_MISMATCH',verifiedSource={'mesh':0,'primitives':[9,10,11],'triangles':864,'uvSets':[],'sourceForm':'three raised stars, fully head-weighted'},decision='RECOVERED_ORIGINAL_GROUP_ONLY_C1_FLAT_MARK_UNDER_FRINGE_NOT_SATISFIED')
 elif id=='lab_coat':a.update(confidence='SOURCE_VERIFIED_RECOVERABLE',verifiedSource={'mesh':0,'corePrimitives':[4,5],'lapelPrimitives':[127,130],'coreAndLapelsTriangles':28524,'uvOnCore':[4,5],'existingSkin':0},decision='SALVAGE_AND_TARGETED_REPAIR_FIRST; FULL_REFIT_NOT_EXECUTED',tripo='NO_GO_NOT_PROVEN_UNSALVAGEABLE')
 elif id=='ear_ornaments':a.update(confidence='SOURCE_VERIFIED',verifiedSource={'mesh':0,'primitives':list(range(153,231)),'selection':'phase2c ear cuffs/filigree/chains/ribbons; exclude fur rings 147–152'},decision='RECOVERABLE_PARTS_KEEP_ORIGINAL_WEIGHTS; FIT_PENDING')
 elif id=='bow_brooch':a.update(confidence='SOURCE_VERIFIED',verifiedSource={'mesh':0,'primitives':list(range(133,141))+[145]},decision='RECOVERABLE_PARTS_KEEP_CHEST_BIND; NOT_IN_PILOT')
 elif id=='tail_ribbons':a.update(confidence='SOURCE_VERIFIED_BACK_WAIST_RIBBONS',verifiedSource={'mesh':0,'primitives':[272,273]},decision='KEEP_EXISTING_BACK_WAIST_WEIGHTS; DO_NOT_ASSUME_TAIL_SOCKET')
 elif id=='headphones':a['decision']='NO_3D_SOURCE_VERIFIED; OUT_OF_PILOT'
manifest['inspection']['executionResults']='results/';manifest['inspection']['status']='SOURCE_VERIFIED_WITH_CONTACT_IDENTITY_AND_MOBILE_PENDING';(root/'asset-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')

rows=list(csv.DictReader((out/'page-proximity.csv').open()));writeRows=[r for r in rows if r['clip']=='Write'];tip=[float(r['terminalRingCenterToPageSurface'])for r in writeRows]
collisionTable='| Par | Poses com cruzamento | Máximo de pares | Pior amostra |\n|---|---:|---:|---|\n'
for r in coll['pairs']:
 collisionTable+=f"| {r['pair']} | {r['posesWithCrossing']if r['posesWithCrossing']is not None else 'não resolvido'} / 61 | {r['maxTrianglePairs']if r['maxTrianglePairs']is not None else 'não medido'} | {r['worstClip']} / {r['worstSeconds']} s |\n"
write('go-no-go.md',f'''# Sophia — R1.A / R1.B · resultado

**R1.A: SOURCE_MATCHED. R1.B: piloto estrutural concluído, CONTACT / C1 / MOBILE / ARTISTIC ainda sem aprovação. NO_GO para integração pública ou expansão.**

Base de fontes: PR #303, `d638f6e3a608cf953ffcb0322b41fb0dd051416d`; main conferida `ffab5343d95c7f59232c26428d6f4301f1d58199`. Os seis documentos foram lidos integralmente. O trabalho ocorreu em branch própria, sem mudar main ou atualizar #303.

## Fonte demonstrada

O SHA-256 calculado do `public/experimental/sophia-alpha.glb` é `{source['sha256']}`, exatamente o da candidata `Sophia_6H_visual_candidate.glb` registrado em `Verdict.json` e no relatório 6H. Essa equivalência foi medida, não presumida pelo nome. Há 101 joints, quatro alvos faciais e os cinco clipes Idle/Write/Point/Wave/Walk. A 7B E1 permanece sem skin e sem clipes. Não foi promovida a parent body.

**Parent de ensaio: a própria 6H verificada, ainda candidata não canônica.** O piloto comprova recuperação no rig dessa fonte. Não comprova encaixe num corpo C1 diferente. Não houve troca para astronauta ou 7B nem reconstrução de corpo/rig. A identidade C1 segue autoridade artística; a 6H tem proporções/face/pelagem próprias e três estrelas em relevo, sem a franja opaca exigida pelo C1. Esse gate não foi disfarçado como PASS.

## Recuperação efetiva

| Peça | Resultado verificável | Limite |
|---|---|---|
| Book | Todas as cinco primitivas, 224 triângulos, UVs onde existentes, cores, materiais e texturas preservados; socket entre hand_L e nó Book | Mantém offsets e os canais originais; mãos/tecido ainda cruzam em poses herdadas |
| Pen | Duas primitivas, 2.936 triângulos, UVs/materiais/cores preservados; socket entre hand_R e Pen | É o instrumento metálico ornamentado da fonte; não foi inventada pluma. Empunhadura não aprovada |
| Estrelas da testa | Primitivas 9/10/11, 864 triângulos; pesos originais 100% head e deltas de morph zero permitiram equivalência rígida por inverse-bind | Grupo de três relevos legado, sem UV original; não é a marca plana única C1 sob franja |
| Jaleco/forro/lapelas | Core 4/5 com TEXCOORD_0 e skin; lapelas 127/130 com cor/material e skin | Recuperável, mas precisa reparo de contatos e eventual ajuste local de manga/gola/barra |
| Orelhas, laço/broche, fitas | Partes existentes mapeadas no manifest e CSV | Recuperáveis como peças indexadas; encaixe/colisões seguem pendentes, não integradas automaticamente |

O GLB piloto tem hash `{equiv['pilotSha256']}`. O BIN inteiro permanece idêntico à fonte: **zero novos vértices e zero novos joints**. Materiais, imagens, texturas, accessors, skins/IBMs e os cinco arrays de animação são iguais. As alterações são sockets de identidade e separação do grupo de estrelas. Book/Pen continuam sendo alvos dos mesmos canais, sob os mesmos ossos.

Three.js CPU amostrou 51 instantes de cada clipe: 255 poses, erro máximo de matriz dos props **{equiv['maxSocketMatrixError']}** e erro máximo de vértice das estrelas **{equiv['maxStarVertexError']}**. Isso demonstra equivalência geométrica/parental, não qualidade artística nem eliminação dos defeitos da fonte.

## Contatos medidos

61 poses (repouso + 12 por clipe), 915 pares avaliados. Método: glTF LINEAR/slerp, morphs, linear blend skinning e BVHTree de superfícies, epsilon zero. Os filtros regionais, triângulos indexados e limites estão no código/JSON. **Não é colisão contínua, não detecta toda contenção volumétrica, não certifica folga entre amostras.** Uma região sem faces retorna UNRESOLVED, nunca aprovação.

{collisionTable}

No Write, o centro do anel terminal da Pen fica a {min(tip):.9f}–{max(tip):.9f} unidade da página (aproximadamente {min(tip)*1000:.3f}–{max(tip)*1000:.3f} mm se aplicada a unidade metro declarada pela fonte). É proximidade geométrica sem assinatura; não prova tinta/contato físico ou empunhadura natural. A coluna de distância mínima de vértice é separada dessa medida. Para pares que cruzam, não se atribui folga positiva.

As contagens não são uma suposta melhoria sobre os números antigos: seleções regionais/amostragem diferem do relatório 6H. As colisões do piloto seguem da equivalência provada com a fonte; a matriz foi avaliada diretamente na fonte, não apresentada como segunda medição independente do piloto. Punhos, queixo e cauda precisam da próxima correção limitada antes de aceitação de atuação.

## Capturas e arquivos privados

O conjunto de revisão contém 0°/45°/90°/180° reais de fonte, piloto e E1 com câmera/escala comuns; Write, Wave, Walk e Idle; closes de capa, página, punho, gola, cauda e fitas; enquadramentos 16:9 e 9:16. Detalhes props-only ocultam o corpo só no render e são rotulados. Os PNGs são Cycles CPU da geometria importada, não imagens sintetizadas nem screenshots WebGL. Os loops GIF têm 24 frames e 3.000 ms, com os clipes originais amostrados. Veja `capture-index.json` para hashes, câmera, tempos e limitações. O começo NLA em frame 1 foi compensado nas capturas finais.

O `.blend` foi criado por importação do GLB piloto, com imagens packed, e reaberto. **Não é uma fonte nativa original recuperada.** Guarda os cinco grupos glTF como actions separadas de armature/props/morphs; não são novos clipes. Foi salvo em REST com NLA muted para inspeção: selecione o track original para reproduzir. GLB, BLEND, PNGs e GIFs são entregues em pacote privado ao proprietário, sem commit de modelos/capturas ou rota pública.

## Runtime, memória e limites

Harness local em `scripts/sophia-adornments/`, servido somente em loopback, com Host validado e caminhos fixos. Carrega uma fonte por vez após comando e visibilidade, um mixer/RAF próprio da revisão isolada, toggles dos três adornos, seletor de clipes, pausa/seek, remoção e medição de 10 ciclos. Não é código montado no portfólio. Testes HTTP de Host/path passaram; WebGL real e contexto restaurado continuam sem validação visual.

10 ciclos CPU de parse/pose/descarte passaram com contabilidade explícita de geometrias/materiais/texturas/skeleton. Texturas foram substituídas por placeholders no ensaio CPU. São {equiv['stats']['meshes']} mesh draws potenciais e {equiv['stats']['triangles']:,} triângulos; **draw calls efetivas, tempo de decodificação real, VRAM e leaks de GPU não foram medidos**. Estimativas RGBA de imagens não são alocação ou latência real. Samsung Internet não foi testado e não recebeu PASS.

R3: arquivos de runtime, API, páginas e demais personagens ficaram idênticos ao baseline. Não houve regravação remota; GET anônimo do asset retornou 403, portanto hash e 47 clipes são evidência do relatório existente, não recontagem atual. A prova de preservação dos arquivos protegidos está em `preservation.json`.

## Decisão do jaleco

**A — recuperar e reparar: GO técnico para planejar a próxima correção limitada**, sujeito à inspeção do proprietário. A malha, UVs e pesos existem; não há prova de inviabilidade. **B — remesh parcial: reservar somente se um defeito localizado persistir após ajuste de pesos/contato. C — Tripo: NO_GO nesta etapa**, pois A/B não foram demonstradas inviáveis. Nenhum crédito consumido e nenhum novo jaleco foi gerado.

## Saída e próxima etapa

Não converter páginas. Inspecionar o piloto e decidir qual fonte autoral deve receber o ajuste final. Antes de R1.C/D, resolver conformidade da estrela/franja, cruzamentos do punho/caderno e gola/cauda, validar um corpo/rig autoral e medir WebGL/Android. Não fazer merge nem declarar 6H canônica por esse ensaio.
''')
write('runbook.md','''# Reprodução local

Dependências: Node conforme package.json; npm ci; Python 3 com numpy e Pillow; Blender 4.3.2 para BVH/renders. Não é necessário Tripo ou credencial de armazenamento.

1. `python scripts/sophia-adornments/inventory.py`
2. `python scripts/sophia-adornments/build_pilot.py`
3. `node --expose-gc scripts/sophia-adornments/verify-pilot.mjs`
4. `blender -b -t 4 --python scripts/sophia-adornments/collisions.py -- public/experimental/sophia-alpha.glb docs/sophia/adornments-r1/results`
5. `blender -b -t 4 --python scripts/sophia-adornments/render_review.py`
6. `blender -b -t 4 --python scripts/sophia-adornments/render_contact_details.py`
7. `blender -b -t 4 --python scripts/sophia-adornments/render_collision_details.py`
8. `python scripts/sophia-adornments/finalize_report.py`
9. `python scripts/sophia-adornments/preservation.py`
10. `npm run check:sophia-adornments`, `npm run check:sophia`, `npm run check`, `npm run build`.

Staging opcional: `node scripts/sophia-adornments/staging-server.mjs`, abrir o URL loopback mostrado. Execute na mesma máquina/browser. Não publicar esse servidor ou copiar o GLB privado para public/. O ambiente Work pode encerrar processos de preview ao fim da chamada; um servidor HTTP de teste não equivale a sessão visual WebGL.

Os checks auxiliares podem gerar relatórios com tempos/heap específicos da máquina; não use essas variações como alteração de geometria. O build do piloto exige o hash 6H exato e recusa entrada diferente. Para aceitar outra fonte, uma nova auditoria explícita é necessária; não altere a constante apenas para fazer o build passar.

O relatório privado inclui os renders reais. Para reproduzir o mesmo conjunto, limpe apenas a pasta local-private/adornments-r1/review gerada por esse fluxo e execute todos os passos. Arquivos de tentativas anteriores não referenciados por capture-index.json não fazem parte da entrega.
''')
write('independent-review.md','''# Revisão independente e correções

A revisão inicial por Astra conferiu os hashes e o diff estrutural de forma independente: BIN, corpo, meshes Book/Pen, materiais, texturas, skins e cinco clipes preservados; só parenting/socket e relocação das estrelas mudaram. Nenhum runtime R3 foi alterado.

Foram encontrados e corrigidos: bounds incluindo vértices não indexados (agora separados dos bounds da superfície), status de archive match fixo (agora derivado do hash), offset de um frame do NLA nas capturas (agora medido pelos strips), close de página ocluído (novos dois detalhes props-only rotulados), Host irrestrito do servidor local (allowlist e teste HTTP), placeholder sobre o modelo (regra CSS hidden) e ausência de retomada após webglcontextrestored (handler adicionado).

Correções verificadas localmente por teste de hash estrangeiro, equivalência Three.js, HTTP, inspeção de código e novas capturas. A segunda revisão independente das correções não foi executada. Não se declara signoff independente final, aceitação artística, WebGL ou mobile.
''')
print('REPORT_FINALIZED',len(records),'render records')
