# Shorekeeper R6.4 — dueto, preparação privada e contrato musical

**Candidata para revisão em draft, empilhada sobre PR259 (`5cdadef92dc804e5cecfef9c6563fe5c24d25019`). Sem merge. QA artístico/hospedado/físico pendente; CHOREOGRAPHY_PENDING; G7 NO_GO.**

## Auditoria da base e regressões corrigidas

O handoff R6.3 da própria branch foi lido diretamente. O ZIP `Shorekeeper_R63_Transferencia_Work_20261107.zip` não foi localizado em duas buscas pelo nome/título: a entrada segue bloqueada, sem presumir acesso à outra conta. O kit G11.3 anexado e os quatro GLBs locais retidos foram confrontados com o manifesto privado e o pin canônico; os valores dos hashes não são reproduzidos neste relatório.

PR259 permaneceu aberto/draft no SHA esperado, sobre `c30936635a4696812d0858c85499525ca5c0e051`. CI na base: synthetic 42386370520 SUCCESS, structural 42386370530 SUCCESS, Hsin 42386370521 SUCCESS; Portfolio build 42386370558 CANCELLED. Cloudflare confirmou deployment `ea7ae956-161e-4b4a-b04b-3661cb09fdb5`, preview success para o SHA exato. A tentativa de navegar no dueto foi negada pela **revisão automática** na origem privada Cloudflare Access antes de observar a página; não foi recusa do usuário nem defeito HTTP demonstrado. Nenhum contorno de autenticação/origem foi tentado. Não há screenshot/vídeo ou comparação de pixels novos.

1. **A nona candidata existia no laboratório, mas não no dueto.** Página e guard do guest usavam os oito IDs de R6_G113_CANDIDATES. Agora usam o catálogo R6_PRIMARY_CHOICES compartilhado: EYES_WIDE_ACTING_R6 torna-se selecionável/acionável manualmente no dueto. O catálogo, receitas, R5, SURPRISE_SOFT e o escritor anatômico permanecem intactos. Na fixture com o modelo real, as nove ações foram aceitas; E_Stare chegou a .85. Isso é prova numérica, não aprovação da íris/sobrancelha/linha oral renderizada.
2. **A pose inicial não cobria todos os idles.** Foram amostradas 4.241 poses das três fontes originais, em grade 30 Hz e chaves originais. O maior acréscimo observado em relação ao box inicial foi .3256 alturas na profundidade; também houve .2464 à esquerda e .2785 acima. O guest recebe reserva conservadora de .36 alturas em todos os eixos; a Hsin tem reserva heurística de .18 alturas, ainda sem validação temporal completa de dança. O gap .52 é imposto entre as reservas. Não se declara colisão/silhueta em movimento resolvida para Hsin e roupas físicas.
3. **Fit parcial 2D e alvo solo no dueto.** A câmera agora considera os oito cantos 3D, profundidade, azimute, FOV, aspect e lift, com margem de 12%. Recalcula somente em fit/reset/resize. O dueto mantém o centro combinado, em vez de o handler de atenção da Hsin reassumir a altura solo. Solo mantém seu ramo existente. Box skinnado é atualizado uma vez no fit, evitando reutilizar boundingBox de pose anterior; não há varredura de vértices por frame.

## Carregamento: R6.3 e R6.4 são melhorias distintas

| Comparação | Resultado observado |
|---|---|
| Caminho completo herdado | 52.009.760 bytes de quatro arquivos locais verificados |
| Modelo-only já introduzido na R6.3 | 39.487.548 bytes; três bibliotecas não solicitadas |
| Diferença de payload | 12.522.212 bytes (24,08% do caminho completo), sem incluir headers/JS/texturas externas |
| Parse local data-only, mediana de 3 execuções por modo | Completo 331,09 ms; modelo-only 132,80 ms |
| Ordem local | Primeiro pass completo/modelo; segundo pass ordem invertida; terceiro completo/modelo |
| Nova R6.4 | Antecipa manifesto/bytes em paralelo ao load/compile da Hsin; parse/attach continua na cena já existente |

Os tempos acima são **wall time de GLTFLoader com texturas substituídas por Texture vazia**, em Node, sobre bytes locais. Não são download, cache frio de sistema, decodificação de imagens, CPU render ou tempo GPU. Não atribuir a economia de bibliotecas à R6.4: ela já existia na R6.3. Os deltas de heap Node no JSON variam inclusive para baixo por GC; não são pico de memória, VRAM nem prova de melhoria de memória.

A preparação nova é exclusiva de `r6Guest=1`, começa após a prova WebGL2 do host e só adquire bytes. Verifica autorização atual via manifesto **antes** de ler IndexedDB; cache exige metadata/tamanho, byteLength e SHA integral, senão usa o mesmo downloader existente com SHA/headers/tamanho. Não grava cache automaticamente. Handle por tentativa, consumidor único, AbortSignal e dispose impedem pedido/parse tardio após cancelamento. Não há cache global de sessão ou segundo download pelo guest. Retirar r6Guest mantém o caminho completo herdado, sem prefetch novo; Hsin solo não inicia requisição privada.

A fixture local executou o downloader/parse/R5/face/idle reais com respostas HTTP **sintéticas em memória**, sem rede: cache miss = manifesto + um modelo; hit verificado = manifesto, zero modelo, zero biblioteca. As imagens não foram decodificadas. Os tempos da fixture incluem hashing/cópias locais e **não** medem Access/R2 real ou IndexedDB nativo. Pausa/reduced-motion não alteraram morphs; neutral/blink e dispose repetido passaram; as curvas dos idles permaneceram idênticas.

Prefetch pode competir por banda e manter até um buffer de modelo enquanto Hsin carrega. Esta troca está exposta para QA, não certificada como menor pico de memória ou menor TTFP no Samsung. `?hsin-metrics` expõe milestones `duetAttached`/`firstDuetFrame` e `duet` (manifesto/cache/download verificado/parse). A chamada de render usa o renderer/RAF existentes. Milestones são da primeira ocorrência no mount, não estatística por retry; medidas de render continuam CPU, intervalos de frame separados, renderer.info não é VRAM. GPU física permanece NOT_MEASURED.

## Player e câmera

O player nativo fica na região superior direita; a área renderizada é separada dele por CSS. Desktop usa reserva lateral; 832×384 usa canvas de 606×384 antes de bordas; 390×844 usa faixa superior para o player e região de cena abaixo, com espaço inferior para controles. ResizeObserver mede a área efetiva do canvas, não a tela inteira. O embed mantém seus próprios controles; a fachada pode rolar em telas pequenas. O pavilhão 3D continua ausente no dueto, e o solo permanece com seu componente original.

Testes de projeção usam Three como oráculo para os cantos, com diferentes azimutes e aspectos. **Ainda faltam:** legibilidade/tamanho das personagens, extremos da Hsin, cabelo/roupas, lua, painel manual aberto, zoom/orientação e interação com o player nos dispositivos. A separação de regiões em código não substitui essa aceitação visual.

## Resposta musical — contrato implementado, coreografia não

O guest recebe exclusivamente musicForStage().sample() e subscribe(). O snapshot mantém provider, status, playbackConfirmed, epoch, posição reportada, observedAt e synchronizationQuality. Só marca PLAYING_CONFIRMED para um provedor válido em playing confirmado; ready/paused/buffering/ended/unavailable ficam distintos. Não extrapola posição nem infere BPM/batidas. A assinatura atualiza reconhecimento mesmo se a atuação estiver pausada, sem avançar face/corpo. Troca de epoch invalida callbacks antigos no contrato Hsin existente.

**CHOREOGRAPHY_PENDING.** Os três idles continuam originais; não há dança nova, Skill/Burst como dança, rotação diagonal periódica ou emoções R6/R7 automáticas. A atuação musical da Hsin não foi substituída. Ver storyboard/contrato proposto em `shorekeeper-r64-music-storyboard.md`.

## Validação e reprodução

- Base antes das mudanças: 224 Shorekeeper e 47 Hsin; check/build exit0.
- Candidata: **235 Shorekeeper**, **47 Hsin**, **288 Node no total**; os conjuntos estão incluídos nos 288. Onze casos novos cobrem menu, preparação/cancelamento/cache, projeção e reconhecimento musical. O workflow sintético inclui agora esse comando e filtros de arquivos para CI contínuo. check/build/diff-check exit0.
- Golden facial e suítes de segurança/lifecycle, pausa, reduced-motion, context loss e descarte passaram nas verificações estruturais/sintéticas herdadas. Não foi realizado novo WebGL real ou context loss físico, nem sessão Samsung/GPU.

```bash
node --test tests/shorekeeper*.test.mjs
node --test tests/hsin*.test.mjs
node --test tests/*.test.mjs
npm run check
npm run build
git diff --check
# Somente com fontes locais legitimamente disponíveis; saída FORA do checkout:
node scripts/shorekeeper/audit-r64-local.mjs PRIVATE_GLBS EXTRACTED_ANIMATION_KIT PRIVATE_OUTPUT
node scripts/shorekeeper/audit-r64-guest.mjs PRIVATE_GLBS PRIVATE_OUTPUT
```

Evidência compacta public-safe e matriz: `docs/qa/shorekeeper-r64/`. As ferramentas offline não baixam ou publicam modelos. Comparativos visuais e waterfall autenticado, cache nativo, primeiro frame, memória/GPU físicos continuam PENDING/BLOCKED. Não se declara 60 FPS, aprovação artística ou liberação de G7.

## Preservação e rollback

Não há mudanças em main, PR259, R2, Access, funções privadas, GLB/PSA, shaders, morph dictionaries, receitas, materiais, controlador R6, reparo geométrico R5, fontes de idle/combate ou renderer/RAF. Sem novos binários ou hashes privados em relatórios. O único escritor anatômico e o único mixer corporal do guest continuam sendo os existentes.

Rollback: voltar a usar a preview da branch PR259, ou reverter os commits R6.4 na branch filha após revisão; nunca reset/force-push na base. Nenhum dado privado/cache precisa ser apagado. A revisão recomenda **draft para QA e revisão técnica**, sem merge até comparar o dueto real nas duas resoluções móveis e desktop, validar rostos/controles, waterfall e lifecycle físico. Se o buffer antecipado piorar memória/contensão, desabilitar apenas o prefetch da filha, preservando o modelo-only da R6.3.
