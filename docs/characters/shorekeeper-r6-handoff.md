# Shorekeeper R6 — estado de transferência para Sonnet e Astra

PR draft: **#238**, base exata de #236: `f3b0c089106b6386558a6f1d0d8610044aee7835`.
Código de implementação congelado: `aa4da15f73bd06d790a606ec5701a8046ebded15`; hashes por arquivo no resumo técnico.
Estado: `APPROVED_BASELINE_LOCK` + `R6_ACTING_CANDIDATE` + `VISUAL_QA_PENDING`.
**R7 não implementado nem ativado. Nenhum merge autorizado.**

## Aprovações e geometria

O pacote confirma aprovações de aparências nomeadas. Não fornece o render/configuração da sessão humana que identifica geometria, câmera, material, idle e pesos efetivamente exibidos. Portanto permanece **APPEARANCE_PROFILE_UNVERIFIED**. Não transformar aprovação de nome em aprovação de todas as geometrias. Não promover R3/R5, arquivar duplicatas ou criar aliases.

`approved-visual-baselines.json` congela receitas literais, pesos, timings, hashes e as cinco geometrias. LITTLE_SMILE_V2, MY_STAR_V2 e HELLO_R2_CANDIDATE seguem distintos. MY_STAR_R3_EYES_SOFT é intermediário; HELLO aberto permanece separado. LOVE/HOPE/Surpresa conservam os IDs, com associação exata da aparência humana ainda a confirmar. O hold de inspeção de 3.600s dos V2 é preservado; nos vídeos o retorno é um comando manual a 3,2s.

## O que foi implementado

- `facial-ownership.mjs`: lease atômico nas próprias influence arrays de Face/Eye. As três entradas — compositor R6, gentle acting e controlador de receitas — recusam outro owner nas mesmas arrays.
- `anatomical-face.mjs`: único commit de pesos vivos, 69 canais vinculados antecipadamente. Baseline e piscada originais avaliam em arrays numéricas privadas; nenhum segundo writer vivo, mixer, RAF, alteração de material, varredura de vértices ou escrita em ossos.
- Camadas semânticas: baseline, pose, acento, olhar, owner ocular e recuperação. Baselines passam sem renormalização. Acentos possuem orçamento por região; canais são limitados, olhar antagonista usa diferença assinada e magnitude ≤0,3.
- Piscada bilateral original de 0,13/0,08/0,20s. Serenidade solicita fechamento ao owner ocular. Nos candidatos, os canais perioculares cedem ao fechamento; a geometria da piscada não foi reesculpida.
- Reset zera todos os canais faciais do shadow, inclusive os fora do catálogo antigo. Restore recupera os 69 valores iniciais e permanece estável nos frames seguintes; a UI também restaura a câmera, os limites de órbita, a geometria e os controles; dispose libera o lease e é idempotente.
- Combate interrompe e bloqueia comandos faciais até o evento de término. Não há vínculo novo de VFX com Bursts.
- `?facialR6=1`: QA manual na aba Expressões; receitas históricas e oito candidatos, cinco geometrias explícitas, regiões, intensidade, câmeras 0/45/90° (o capuz oclui os olhos em +90°), timeline do candidato, freeze, blink, neutro, restore, atlas e exportação JSON sem buffers. Os sliders/escritas faciais legados e a contemplação automática ficam indisponíveis neste modo. A rota normal mantém seu comportamento.

## Candidatos — todos opt-in, nenhum aprovado

| ID | Origem preservada | Alteração R6 |
|---|---|---|
| LITTLE_SMILE_ACTING_R6 | LITTLE_SMILE_V2 | Assimetria .9/.5 e C_ZL=.8 no pico; sobrancelha .12 e entradas regionais distintas |
| MY_STAR_ACTING_R6 | MY_STAR_V2 | Olhos passam por .1 antes de .25; sorriso/rosto inferior plenos e brow .18 |
| AFFECT_GROWING_R6 | MY_STAR_R3_EYES_SOFT | Intermediário próprio com olhos .1; não substitui My Star plena |
| HELLO_ACTING_R6 | HELLO_R2_CANDIDATE | Saudação fechada com brow .12; não usa HELLO falado |
| TENDERNESS_ACTING_R6 | LOVE | Brow .08 e ponta nasal vertical .025, apenas candidato |
| SERENITY_ACTING_R6 | HOPE | Fechamento ocular solicitado; brow .08 e superfície inferior/queixo .04 |
| WORRIED_FIXED_R6 | WORRIED | B_Sad=1 / E_Sad=.7 preservados; M_Ennui L/R retirados, mantendo boca neutra |
| GLANCE_BILATERAL_R6 | GLANCE | L local +X → centro → R local −X → neutro; pico .22 |

As curvas são determinísticas e os tracks são compilados ao selecionar o gesto. Brow/lid antecedem boca; região composta inferior entra depois. Recuperação dura até 5,8s, olhar bilateral até 6,8s; não há agendamento emocional ou random por frame.

## Referências

Os 31 arquivos do manifesto de transferência foram verificados. `shorekeeper-r6-reference-audit.json` cataloga os 15 MP4 e distingue 11 referências faciais de quatro referências futuras de VFX/corpo. Os contact sheets foram examinados. Nenhum MP4 é prova da geometria da aprovação de laboratório ou marker PSA; nenhum frame/textura foi incorporado ao runtime.

## Atlas e limites do asset

83 nomes / 97 instâncias: Face 64, Eye 5, Down 14, Alpha 14; 249 ossos. Down/Alpha estão excluídos do compositor. Inventário contém deltas, sinais, bounds, áreas incidentes, assimetria, hashes, ownership, limites e diferenças em pixels por câmera/peso. A área é superfície de triângulos afetados, não área de músculo.

29 classificações técnicas `VERIFIED_ANATOMICAL`, 40 `VISUAL_ONLY`, 28 `CONFLICT`/garment. Isso verifica região/direção em geometria e raster; não atribui equivalência FACS, músculo isolado ou aprovação humana. `C_Z*` alcança bochecha e queixo/rosto inferior; `C_Down_Face` move a superfície inferior. P_Nose_Up/Down movem a ponta verticalmente: não demonstram nasal flare. E_Close é bilateral; wink e bochecha inflada continuam limitações do asset.

O atlas privado inclui pesos de pupila até 1 exclusivamente como diagnóstico. O runtime mantém cap .3; o gesto bilateral usa .22. Sonnet deve inspecionar a abertura ocular e oclusão em todos os ângulos antes de aprová-lo.

## Validação e provas

- 70 streams originais de pesos de seis segundos, 30/60Hz, sete receitas × cinco intensidades: SHA de cada frame agregado permanece exato, incluindo blink a 1,7s e retorno manual a 3,2s.
- 1.050 PNG antes/depois **byte a byte idênticos**: cinco geometrias × três ângulos × dois viewports × sete receitas × cinco pesos. Tolerância permitida: zero; não apenas teste sintético.
- 1.455 renders isolados do atlas; 97 contact sheets e gráficos de amplitude/sensibilidade. 180 provas orais específicas de WORRIED com superfícies integral/contorno/sem-contorno, face e boca.
- Vídeos comparativos de oito famílias nos três ângulos, mais três idles e gesto canônico. O manifesto privado registra bundle, pesos por frame, câmera, geometria, tempo e SHA de cada PNG/MP4. Amostragem offline de 10fps, não uma medição de FPS do aparelho.
- Sessão facial manual real de 123,724s / nove comandos, separada de 600s **simulados** / 60 comandos. A sessão longa terminou; seu primeiro driver falhou ao tentar clicar em um disclosure fechado do teste de contexto. O replay corrigido validou contexto, três recarregamentos, suspensão fora da tela e reduced motion. O erro do driver e os relatórios originais são mantidos.
- O render software ficou lento (~0,7–1,8 FPS em amostras da sessão longa), com dt limitado a .1s. 123s de parede não equivalem a 123s de timeline facial nessa sessão. Não declarar fluidez ou desempenho desktop/Android a partir disso.
- Integração privada CPU: três ciclos dos três idles completos; todos os buffers, materiais e clipes originais preservados, transformações dos 249 ossos restauradas e face neutra. Comparação de quaternion usa componentes; angleTo de um quaternion de origem levemente não unitário produz falso erro mesmo sem alteração.
- Build/check/regressões e os gates detalhados estão na matriz e no relatório técnico. SwiftShader é WebGL real em software; GPU física, Samsung Internet, aceitação humana e auditoria independente não foram executados.

## Reprodução local autorizada

Use Node conforme `.node-version`, `npm ci`, `npm run check`, `node --test tests/shorekeeper-*.test.mjs`, `npm run build`. Sirva o build localmente e abra `/experimentos/sk/?facialR6=1`. Importe o GLB fornecido pela File API; nenhuma autenticação de produção precisa ser desabilitada. No preview remoto, preserve Access/R2.

O GLB privado deve ter SHA `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`.

```sh
node tests/shorekeeper-r6-private.mjs /caminho/privado/canonical.glb /diretorio/privado/integration.json
node scripts/shorekeeper/audit-r6-morphs.mjs /caminho/privado/canonical.glb /diretorio/privado/atlas.json /diretorio/privado/baselines.json /diretorio/privado/preflight/baseline-source.json
python scripts/shorekeeper/analyze-r6-atlas.py /diretorio/privado/atlas.json /diretorio/privado/atlas /diretorio/privado/atlas-reviewed.json docs/characters/shorekeeper-r6-anatomy-observations.json
npx --no-install rolldown tests/shorekeeper-r6/scene.mjs --format iife --file /diretorio/privado/r6.bundle.js
node scripts/shorekeeper/render-r6-evidence.mjs /caminho/privado/canonical.glb /diretorio/privado/r6.bundle.js /diretorio/privado/preflight /diretorio/privado/replay /caminho/chromium /caminho/playwright
```

Nunca colocar os diretórios de evidência em Git/public/dist. O atlas utiliza objetos PNG deduplicados **sem perda**. A galeria abre os objetos diretamente; `python R6/materialize.py` restaura caminhos dos manifestos com checagem SHA. Os dois ZIP devem ser extraídos no mesmo diretório. GLB/PSAs/referências de origem não são redistribuídos nesses pacotes.

## Passagem para Sonnet

1. Confirmar com o autor o perfil exato da aprovação humana, sem alterar os locks enquanto isso não ocorrer.
2. Revisar os oito candidatos e atlas privado nos três ângulos; manter V2/R2 selecionáveis. Tratar espessura do neutro como característica de cada geometria, separada da correção de M_Ennui.
3. Afinar apenas candidatos R6 em PR pequeno sobre #238; comparar Little Smile/queixo, My Star/intermediário, nasal e queixo novos, blink, oclusão e L/R. Não renomear LOVE/HOPE como associação confirmada.
4. Reexecutar as mesmas condições e matrizes. Nenhuma inferência de aprovação com base apenas em métricas.

## Passagem para Astra e bloqueios

Astra deve fazer auditoria independente dos owners, locks, baseline pixels/streams, source buffers, lifecycle, privacidade e gates; esta entrega não representa essa auditoria. Teste físico Samsung/GPU e replay após combo completo continuam pendentes. Bibliotecas privadas BasicAttack/Skill/Burst não vieram neste pacote; a ausência não foi substituída por animação fabricada.

R7 depende da validação R6 e de autorização de ativação. Opus pode planejar estados/documentação, mas não deve escrever no runtime nesta etapa. Rollback é remover `facialR6=1` e recarregar a rota: sistema legado permanece disponível. Não restaurar R4/R5 como alias aprovado. Manter PR draft, sem merge automático.

Wuthering Waves e Shorekeeper © KURO GAMES. Experiência independente e não oficial.
