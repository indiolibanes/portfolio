# Sophia R1.5 — recuperação parcial, sem liberação do asset

Base inspecionada: PR #306 aberto e não mesclado, branch `feat/sophia-3d-actors-20261113`, commit `ff1453ed47b4a6bf47177699ae12556f08847b97`. Esta intervenção deve permanecer em PR draft empilhado nessa branch. O GLB público não foi substituído. A aprovação visual continua com o proprietário.

## Gates

| Gate | Estado | Evidência e limite |
|---|---|---|
| Corpo/rosto/cauda/orelhas/patas | PASS técnico | Todos os atributos e 48 deltas de cada uma das três primitivas do corpo iguais ao original; hashes em `asset-integrity.json`. Inspeção autoral final pendente. |
| Rig | PASS | 90 juntas, ordem, nomes, transforms de repouso, relações entre juntas e inverse binds preservados. Props filhos não ósseos já adicionados pelo PR306 documentados separadamente. |
| Expressões | PASS CPU / BLOCKED WebGL | Todos os 48 slots exercitados individualmente nas três primitivas; nomes e índices preservados, estados separados por ator. Rasterização e aparência de olhos/rubor não certificadas. |
| Jaleco | **FAIL** | Costuras confirmadas fechadas, mas alongamento máximo 7,28× e P99 até 3,38× persistem nas poses extremas. Axilas/mangas exigem intervenção manual localizada adicional. |
| Animações | PASS integridade / FAIL roupa | 27 clipes atuais preservados exatamente, incluindo amostras e timings. O original possui 36: nove já estavam ausentes no PR306, listados no JSON. |
| Quatro atores | PASS API/CPU / BLOCKED navegador | Estado, retomada, fallback, descarte e restauração exercitados com GLB real e API WebGL simulada; não equivale a aprovação visual nem compilação de shaders. |
| Build/Node/contratos | PASS | 344/344 Node; `check:sophia` 54/54; `check` e build Astro completos executados. Baseline Node repetido: 340/340. |
| Compatibilidade WebGL/404 | BLOCKED | Ambos os scripts `qa-sophia-404*.mjs` tentados com Chromium: `socket() failed: Operation not permitted` (AF_UNIX), antes de criar contexto. |
| Android/Samsung Internet | NOT RUN | Sem dispositivo real acessível. Sem alegação de 30 FPS medidos. |
| Escrita / aprovação do mascote colorido | NOT RUN | Props continuam ocultos; não há clipe de escrita nas fontes. Escrita é secundária ao jaleco. Comparação visual do mascote com pixel art depende de navegador e proprietário. |

**Resultado: PARTIAL. Não integrar o candidato à versão pública.** Não há demonstração de inviabilidade de reparo localizado, nem autorização/uso de Tripo3D, ossos adicionais, física ou reconstrução corporal.

## Inventário verificável

| Entrada privada | Bytes | SHA-256 |
|---|---:|---|
| Sophia_v1.4.glb | 33117040 | `7d653618f1ed083c68567e98a421ac8efc6a7858f638ad1a2bff6ec697f6bd8f` |
| Lab_Coat_v1.1.glb | 7710136 | `e3a213257b4b45ce4b8c0467d3159943bc3c18273e144ef256209938eed29857` |
| Ornaments_v1.0.glb | 5437232 | `d584003014e91f629cd0cd91b8ac65ff9713542dc75e3de06c120889f5f68e4e` |
| sophia-lab.glb (PR306/público) | 18296208 | `85f6d6afb6483c42765597a26f0b1cde69793769229bc74007faefb322eaf5e6` |
| sophia-lab-r15.glb (candidato privado) | 18296432 | `7d5d9dad7d68f69759bed1b9b76d04f04eb13cbac0353c6a7e2dd08d9c3ef501` |

As duas imagens anexadas, a auditoria preliminar e seu patch foram inspecionados. A referência desta missão é a Sophia raposa do usuário; a declaração histórica C1 de outra fase não autoriza trocar este corpo. Identidade técnica preservada não significa aprovação artística automática.

## Jaleco: diagnóstico, reparação e limites

`Sophia_LabCoat` mantém 12979 vértices e 12909 triângulos. Cada vértice e cada tripla de UV das faces correspondem exatamente ao jaleco fonte; nenhuma face órfã foi demonstrada. Por isso não houve remoção de ilhas, criação de faces, preenchimento geral, voxel remesh ou decimation.

Só foram harmonizados os leques de vértices ligados por arestas do modelo fonte com exatamente duas faces e normais compatíveis (produto > 0,25). Duplicatas para UV continuam separadas no buffer; camadas independentes e aberturas deliberadas não foram soldadas indiscriminadamente. São 10206 pares de costura comprovada, 6855 leques e 5118 posições ajustadas; deslocamento máximo 20,601 mm. As normais foram transportadas localmente, com 17 fallbacks conservados nos casos de inversão: não há aprovação global das normais.

| Diagnóstico após reunião aproximada de posições, 5 casas | Antes | Depois |
|---|---:|---:|
| Componentes | 342 | 45 |
| Arestas de contorno | 5607 | 693 |
| Arestas não manifold / faces degeneradas | 0 / 0 | 0 / 0 |
| Grupos coincidentes com divergência máxima L1 de pesos > 0,1 | 693 | 0 |

As 693 divergências reproduzidas usam máximo **entre todos os pares** do grupo; diferem das aproximadamente 672 preliminares por método. Contorno/componentes não são sinônimos de defeito. O modelo fonte multivistas inteiro (86 componentes) não é comparável diretamente ao subconjunto selecionado.

Pesos do jaleco foram corrigidos na base de bind original: remoção de dedos, restrição da influência de coxas no tronco, remapeamento localizado da manga para braços/antebraços, suavização harmônica de 20 mm ponderada pelas arestas, harmonização das costuras e normalização final com no máximo quatro influências. Ossos originais reutilizados; roupa não está rigidamente presa a uma junta. Nenhuma influência óssea do corpo foi alterada. A correção é parcial e não constitui retopologia manual final das axilas.

| Medida nas mesmas 460 poses por modelo | Antes | Depois |
|---|---:|---:|
| Maior separação de costura comprovada | 325,715 mm | 0 |
| Maior razão comprimento deformado/base de uma aresta | 36,091× | 7,283× |
| Maior percentil 99 dessa razão | 4,298× | 3,377× |
| Máximo de pares de triângulos corpo/roupa em interseção (73 poses) | 4276 | 3951 |

As razões usam arestas originais não nulas e matrizes dos clipes reais. Valores máximos são sensíveis a arestas curtas; P99 e renders acompanham o diagnóstico. BVH contabiliza cruzamentos entre superfícies, visíveis ou ocultos: não mede profundidade, volume contido ou colisão contínua. A diminuição da contagem não aprova clipping. Ver CSVs completos.

Um ensaio de quatro corretivos por ARAP, restrito à roupa, elevou o máximo para 8,840× e P99 para 4,041× em outros movimentos. Foi descartado; o candidato entregue **não contém morphs nem canais novos**. Melhorias numéricas e visuais não eliminam a necessidade de retopologia/fitting manual de axilas, cotovelos e sobreposições, preservando UV e bordados.

## Evidência visual privada

Renders reais por Blender 4.3.2/Cycles CPU, sem imagens geradas. Cada modelo tem 39 capturas ortográficas (12 poses × frente/lado/costas + referência `Sophia_Expr_Seria_R6` em 0 s) e 120 quadros de cinco comparações de três segundos (`Nadar_R6`, `Socos_R6`, `Chutar_R6`, `Correr_R6`, `Danca_R6`, 8 quadros/s de vídeo). Referência de nó em repouso é diagnóstico, não uma alegação de A/T-pose.

As demais capturas incluem Andar, Roundhouse, Mortal_Tras, Pirouette e ExpressionFlow, com os tempos reais em seus registros JSON. Câmera ortográfica fixa e igual antes/depois: algumas extremidades móveis extrapolam o quadro, portanto não são cobertura completa de todas as silhuetas. Vídeos CPU não medem FPS do site.

Os renders e o BLEND foram importados do GLB não empacotado `7ad77c5a…`; o arquivo final `7d5d9dad…` tem conteúdo semanticamente idêntico, comprovado por cópia exata dos bufferViews, 7611 acessores decodificados iguais e 3789 vértices comparados em nove poses por Three (diferença zero). Não se afirma que todos os renders foram refeitos após a mudança de layout binário. O BIN inteiro/prefixo não é igual, pois houve reempacotamento sem perda.

O upload GLB ao projeto privado Blendstra foi concluído, mas a importação foi recusada com `INVALID_PREPARED_GLB: GLB metadata is too large or deeply nested`. O BLEND de 98,8 MB e sua versão comprimida de 28,1 MB foram recusados na preparação por limite de bytes. Nenhuma versão foi salva ou publicada no serviço; a execução geométrica foi local. Preservamos os 48 morphs, em vez de removê-los para contornar esse limite. Arquivos privados acompanham a entrega separadamente, fora deste repositório.

## Próxima intervenção necessária

A aprovação depende de reparar a deformação residual das axilas em `Nadar_R6` (incluindo 1,5 s) e conferir mangas/abas em socos, chutes, corrida e dança; reexecutar as mesmas poses e a inspeção visual. Depois: QA dos quatro atores em WebGL real e Samsung Internet, avaliação visual do mascote colorido, materiais transparentes e variantes de olhos. Não iniciar integração pública, escrita procedural ou outra geração automaticamente.
