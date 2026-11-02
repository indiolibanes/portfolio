# Shorekeeper F2.0-A — contrato de animação A → B

**Base auditada:** PR #182 em `580deae49860fdcd0350789be69f42f4b17836ee`, após #184, #185, #191 e #192. O tema claro `shorekeeper-material3.css` está presente e não foi alterado. **Resultado desta etapa: PARTIAL / VISUAL_QA_PENDING.** Recuperação numérica não é aceite visual nem autorização para atuação autônoma.

## 1. Identificadores, duração e amostragem

| Identificador composto | Frames de origem | FPS do ANIMINFO | Duração N/FPS | Última amostra (N−1)/FPS |
|---|---:|---:|---:|---:|
| SK_IDLE_01_ORIGINAL | 814 | 30,0368995667 | 27,100000724 s | 27,066708340 s |
| SK_IDLE_02_ORIGINAL | 731 | 30,0410957336 | 24,333333460 s | 24,300045726 s |
| SK_IDLE_03_ORIGINAL | 576 | 30,0521755219 | 19,166665641 s | 19,133390179 s |

Cada biblioteca privada inclui três clipes: o identificador composto, mais os sufixos `_BODY` e `_RIB`. Estes últimos são as fontes completas isoladas, sem composição, para diagnóstico. A duração inclui uma retenção do último quadro durante um intervalo de amostra. Todas as amostras móveis são preservadas; somente canais exatamente constantes usam dois valores iguais em 0 e duração. Não houve redução de keys móveis, alteração de velocidade de origem ou otimização perceptual.

## 2. Conversão PSA → Three.js

O conversor verifica todos os oito hashes do manifesto antes de transformar dados. PSK: 249 bones, 225 ponderados. Todos os seis PSA: mesmos 243 nomes e pais, incluindo todos os 225 ponderados. GLB: os mesmos 249 joints. A correspondência é pelo nome, nunca por índices presumidos.

A pose de referência `BONENAMES` do PSA **não é usada como bind**. A referência e as inverse bind matrices continuam sendo as do GLB/PSK. Para as chaves: quaternions não-raiz são conjugados, normalizados e mantidos no mesmo hemisfério para interpolação curta. As posições locais são convertidas de cm para m; a mudança de base Rx(−90°) é aplicada somente à raiz, incluindo (x,y,z) → (x,z,−y). Escalas positivas são preservadas. Não há retarget por offsets inventados, espelhamento, troca L/R, remoção de root motion ou edição artística.

A conversão PSK-bind → GLB-nodes teve diferença máxima de componentes 0. O teste independente de world-bind × inverse-bind encontrou erro máximo de 2,92e−7. Nodes, skin, malhas, materiais, imagens, morphs, animações antigas e os bytes binários antigos são preservados como prefixos/tabelas idênticos. O GLB original não é sobrescrito.

## 3. Mapeamento e ownership

Os dois arquivos de cada par contêm TRS dos mesmos 243 bones; contar apenas canais sobrepostos é insuficiente. A análise de variação temporal encontrou conjuntos móveis disjuntos, inclusive em translação e escala. A regra abaixo é validada pelo conversor para **estes seis arquivos**: ele falha se detectar movimento simultâneo dos dois arquivos no mesmo bone, se o corporal animar um `Bone_*` ou se Rib animar um bone primário. Não extrapolar essa regra para outros PSA.

| Família / bone | Quantidade | Proprietário no composto | Propriedades |
|---|---:|---|---|
| Bone_Piao* | 59 | Rib correspondente | position, quaternion, scale |
| Bone_Skirt* | 42 | Rib correspondente | position, quaternion, scale |
| Bone_Hair* | 38 | Rib correspondente | position, quaternion, scale |
| Bone_Chest* | 4 | Rib correspondente | position, quaternion, scale |
| Outros 100 bones presentes nos PSA, incluindo Root/Bip001 e helpers/props | 100 | Corporal correspondente | position, quaternion, scale |
| MarkCase, HitCase, CameraPosition, MiddleCase, LeftSuspensionCase, RightSuspensionCase | 6 | GLB bind original | Sem trilhas novas |

Cada composto tem **729 propriedades únicas** (243×TRS), em uma só AnimationAction. Não se executam corporal e Rib simultaneamente como ações concorrentes. Referências estáticas dos bones secundários também vêm de Rib, pois algumas diferem da fonte corporal. Os três arquivos privados `ownership-01/02/03.json` fornecem a tabela completa por nome e canal, com flags de atividade de cada fonte, sem ambiguidade de índice.

| Par | Bones móveis na fonte corporal (qualquer TRS) | Bones móveis na fonte Rib (qualquer TRS) | Sobreposição móvel |
|---|---:|---:|---:|
| 01 | 73 | 132 | 0 |
| 02 | 92 | 131 | 0 |
| 03 | 96 | 119 | 0 |

## 4. Cabeça, pescoço, olhos e morphs

`Bip001Head` e `Bip001Neck`: position/quaternion/scale pertencem integralmente ao idle corporal durante a reprodução. Não há eye bones no esqueleto auditado. O olhar é feito pelos morphs Pupil_* na malha Eye, não por bones inventados. Os PSA não contêm curvas de morph; 97 instâncias / 83 nomes permanecem disponíveis nas malhas Face/Eye/Down/Alpha.

Na UI Reference QA, os morphs são zerados antes da reprodução e os controles faciais adicionais ficam bloqueados. O diretor em si nunca escreve em morphTargetInfluences. No gesto legado e no modo de inspeção manual anterior, os controles existentes continuam disponíveis.

**Integração futura B:** um único dono por morph; não escrever nos TRS de Head/Neck durante o idle sem uma composição explícita e validada. O bone de cabeça não deve ser alterado por reconhecimento de visitante em paralelo ao original. E_Close é bilateral; não há piscada L/R independente. Nenhuma expressão, scheduler ou camada facial nova foi implementada nesta etapa.

## 5. Política de playback, blending e interrupção

O diretor original fica separado do compositor F1.6: não aplica a partição antiga 80+143, que omitiria traduções/escalas e alguns bones. O laboratório mantém uma única variável de diretor ativo, atualizada pelo loop central; troca de clipe/camada só é permitida em repouso, com descarte do mixer anterior.

- **entry:** mistura suave da pose capturada para o primeiro quadro, mantendo o relógio de origem em zero.
- **run:** execução a 1× da fonte, LoopOnce, sem nova alteração de easing ou smoothing das amostras.
- **exit:** último quadro ou pose interrompida congelada enquanto o peso volta a zero; em seguida, restauração exata da posição, quaternion e escala capturados.
- **idle:** mixer sem ações em execução. Não existe scheduler nem loop infinito.
- Pausa congela relógio e transforms; retomada continua. Repetição ativa enfileira uma nova execução após recuperação.
- Tempos de entrada/retorno editados durante reprodução aguardam o próximo ciclo. A velocidade experimental altera somente o relógio da fonte; `state.timingOriginal` torna-se falso se for diferente de 1.

Extremidades não são presumidas contínuas: a fonte Rib 01 difere cerca de 3,26° entre início/fim, Action02 cerca de 2,23° e Action03 chega a 148,58° em um prop. Não forçar repetição cíclica. Root permanece estático nas fontes desta seleção, mas Bip001 tem deslocamento animado. A câmera do estúdio não é conduzida por nenhum desses canais.

## 6. API pública do diretor

`createOriginalIdleDirector(THREE, root, clip, {enter, exit, onEvent, mixerFactory})`

- `start()` — iniciar ou enfileirar repetição após recuperação.
- `interrupt()` — cancelar fila e recuperar suavemente.
- `setPaused(boolean)`; `setSpeed(number)` entre 0,1 e 2.
- `configure({enter, exit})` — imediato em repouso; agendado em movimento. `transfer` do compositor legado não se aplica ao composto pré-resolvido e fica bloqueado na UI.
- `advance(dt)` — **único ponto que atualiza AnimationMixer**, no máximo uma vez por avanço; aceita delta não negativo.
- `dispose()` — parar, remover bindings e restaurar a pose capturada.
- `state` — phase, paused, clock de origem, duração, progresso, weights, updates, fila, speed, parameters, pending, clip, mode, timingOriginal e quantidade de propriedades.
- `findOriginalClip(clips, id, layer)` — composed/body/rib; retorna null quando indisponível.
- `validateOriginalLibrary(THREE, root, result)` — admite apenas bibliotecas locais F2.0-A, TRS finitos de bones existentes, nomes previstos, sem malhas/imagens ou canais faciais.

`onEvent` emite `start`, `execution`, `recovery`, `end` com clip, phase e clock. Pausa é exposta por `state.paused`; não muda o estado subjacente de execução. A etapa B deve usar essa API e o relógio central, sem chamar mixer.update por conta própria.

## 7. Arquivos privados e reprodução

Use o GLB F1.6 existente e adicione os três `SK_IDLE_0*_ORIGINAL.animations.glb` pelo seletor local em Original Animations. O modelo permanece inalterado e as bibliotecas não contêm malhas ou texturas. Opcionalmente, a cópia privada `PRIVATE_shorekeeper_f20a_original_idles.glb` já contém os clipes antigos e os nove clipes de comparação novos. Ela apenas acrescenta dados animados ao GLB existente.

| Arquivo privado | Bytes | SHA-256 |
|---|---:|---|
| SK_IDLE_01_ORIGINAL.animations.glb | 4.506.520 | a23d571b36001d35c4fe6735727cfa3ae799dc327a6ab784dcf1539606447470 |
| SK_IDLE_02_ORIGINAL.animations.glb | 4.423.420 | a01ebd4c3e4f47bc2d96ee63248510bd0d2f64bb9c467a2f5e6ee67b64481fc9 |
| SK_IDLE_03_ORIGINAL.animations.glb | 3.159.288 | 5b5e2941eddd1814ee38d5adee72ff5457263eb3792de66d0918d868f9965735 |
| PRIVATE_shorekeeper_f20a_original_idles.glb | 39.487.548 | 4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30 |

Pacote de entrada validado: SHA-256 `ce77b3d36860cf3fe6f6074c43727bf233dc7b761e947d3dd43c5509ca3dd3f1`. Arquivos de saída e relatórios numéricos detalhados são privados; não colocá-los em public/, GitHub, CDN ou artefatos de CI.

```
# Python + numpy; saída obrigatoriamente fora do repositório
python3 scripts/shorekeeper/convert-idles.py /pacote-extraido /saida-privada
python3 scripts/shorekeeper/verify-idles.py /pacote-extraido /saida-privada/PRIVATE_shorekeeper_f20a_original_idles.glb
# Testes públicos sintéticos
node tests/shorekeeper-original-idles.test.mjs
node tests/shorekeeper-f16/synthetic-test.mjs
node tests/shorekeeper-sk-lab.test.mjs
# Manual privado: ImageBitmap simulado, não prova visual
node tests/shorekeeper-original-idles-private.mjs /GLB-F1.6.glb /saida-privada
```

## 8. Relatório de QA e gates

| Critério | Resultado | Evidência / limite |
|---|---|---|
| Hashes, nomes, hierarquia, ponderados | PASS | Oito entradas verificadas; 243/243 nomes e pais, 249 joints preservados, todos os 225 ponderados cobertos. |
| Conversão das amostras e integridade | PASS numérico | Verificador independente percorre todos os canais/amostras dos nove clipes e compara à fonte; tempos crescentes, quaternions unitários, escalas positivas. Tabelas e prefixo binário antigo idênticos. |
| Ownership/composição | PASS numérico | Movimento disjunto por bone e TRS, 729 bindings únicos; apenas uma ação por vez no mixer. |
| Carga Three.js / playback | PASS CPU | 0.186.1; nove variantes carregadas, testadas com pausa/interrupção/repetição e retorno exato. ImageBitmap simulado. Não equivale a aprovação WebGL. |
| Continuidade e deformação | PARTIAL | Variações grandes de props/correctives são mantidas da fonte. Em cinco poses, diferenças máximas de comprimento de arestas ≥2mm: ~4,2cm no Idle01, ~3,5cm no Idle02 e ~1,7cm no Idle03. Outliers não foram corrigidos artisticamente; exigem inspeção de helpers/coxa/cotovelo. |
| Vídeos A/B e correspondência visual | BLOCKED | As duas URLs falharam no acesso desta sessão; não houve reprodução ou leitura de frames. Ordem das sequências, timestamps e sorriso não foram inventados. |
| WebGL/Blender/Android | VISUAL_QA_PENDING | Executáveis Blender/Validator e contexto GPU não disponíveis na verificação desta etapa. Sem FPS/VRAM móvel declarados. |
| Interface Material 3 / legado | PASS de preservação | CSS Material 3 não editado; importação e seleção local acrescentadas ao painel existente; GLB F1.6 sem novos clips exibe indisponibilidade explícita. |
| Hsin e suíte existente | PASS local | Suíte npm check, testes sintéticos anteriores e build executados; sem alterações nos arquivos Hsin, Phrolova ou Sophia. |
| Gentle Acting / scheduler / efeitos | NÃO INICIADOS | Gates visuais B/C não cumpridos. Expressive Acting aparece indisponível, com explicação. |

O teste CPU local registrou parsing do GLB de entrada e custo de advance em `three-tests.json`; esses números descrevem Node nesta máquina, não GPU, browser nem Android. Otimização perceptual permanece indisponível: não há versão reduzida aprovada.

### Correspondência com os vídeos

| Sequência observada | Candidato | Instantes / movimentos / tecidos / rosto | Estado |
|---|---|---|---|
| Não observada nesta execução | Stand1_Action01 + Rib_Stand1_Action01 | Não determinados a partir do vídeo | Pendente |
| Não observada nesta execução | Stand1_Action02 + Rib_Stand1_Action02 | Não determinados a partir do vídeo | Pendente |
| Não observada nesta execução | Stand1_Action03 + Rib_Stand1_Action03 | Não determinados a partir do vídeo | Pendente |

O vídeo B é espelhado conforme informação do usuário; nenhuma transformação de lateralidade foi aplicada.

## 9. Próximos bloqueios concretos

1. Abrir o preview `/experimentos/sk/` em WebGL2 desktop e no Samsung Internet; selecionar o F1.6 e importar as bibliotecas, ou selecionar a cópia privada com os idles incorporados.
2. Em Atuação → Original Animations, comparar corpo, Rib bruto e composto para cada idle em 1×, com a mesma câmera. Conferir coxas/helpers, cotovelos, dedos, escala de tecidos e raiz. Exportar JSON e PNG apenas localmente.
3. Confrontar a referência de vídeo e registrar a ordem correta e as diferenças visuais. Revisar o uso dos auxiliares corrective do motor se os outliers corresponderem a deformação visível; não ocultar esse problema com expressões ou partículas.
4. Somente depois de aprovar Gate B, abrir PR B para sorriso/piscada/olhar delicado, seguido de PR C para scheduler. O contrato de ownership de Head/Neck/morphs é obrigatório nesses PRs.

A etapa não recebe STRUCTURAL_PASS global enquanto os outliers e a fidelidade da composição não forem aceitos. Nenhum VISUAL_PASS foi declarado; sem merge automático.
