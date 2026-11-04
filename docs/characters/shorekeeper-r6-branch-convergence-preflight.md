# Shorekeeper R6.0.1 — reconciliação de perfis e preflight de convergência

Consulta de 04/11/2026. Documento de análise estática; **nenhum runtime integrado, merge executado ou perfil humano inferido**. Não houve Chromium, novo atlas, pipeline de vídeo, teste GPU/Android ou deploy manual. O percentual de quota informado pelo usuário não é verificável pelo assistente.

## Resultado

A galeria manual do #237 está integrada na branch R4 e também é ancestral do head atual do #239. O painel R2 e o diagnóstico do #240 estão na branch do #239. A R6 #238 diverge dessa linha: **não contém automaticamente nenhuma dessas duas interfaces**. Convergência futura exige reconciliar o arquivo central do laboratório, não substituí-lo pela versão mais nova de uma das branches.

### 1. Branches e dependências verificadas

| Origem | Branch / head fixado | Relação e conteúdo |
|---|---|---|
| #237, merged | `experiment/shorekeeper-approved-gallery-environment-20261104` · `6cc020122d9e683d9239b562d45251b463fb8138` | Fonte da galeria: `approved-manual-gallery.mjs`, HTML e handlers. Merge `d7b2ea2e3c295be16232645af2740b12c755e955` na R4. O head histórico identifica o código mesmo se a branch de origem for removida. |
| R4 atual | `experiment/shorekeeper-r4-visual-fidelity-20261104` · `d7b2ea2e3c295be16232645af2740b12c755e955` | Branch que efetivamente recebeu a galeria aprovada. Não é main nem R6. |
| #239, aberto | `experiment/shorekeeper-r2-library-recognition-20261104` · `49b5f7aaebed5e3086ff01f70459a7316f299d4b` | Contém galeria, reconhecimento Basic/Advanced/Burst, painel e diagnóstico R2. Comparação de #237→este head: ahead 29 / behind 0; galeria é ancestral. |
| #240, merged | `fix/shorekeeper-r2-diagnostics-20261104` · `66b09e0bcb2c450f0353d63072e8d9af5b749512` | Diagnóstico entrou no #239 pelo merge `075efb89dff8aa2a6061d340d1586c43b48ca63f`. Não importar novamente #240 sobre #239. |
| #238, draft | `experiment/shorekeeper-r6-anatomical-acting-20261104` · `c43b9a956fea4f8fe70d8164340e2376d84ed310` | Base desta minitarefa. Tem diretor composto, ownership, QA `facialR6=1` e locks; sem galeria/painel novos. #238→#239: diverged, ahead 41 / behind 7; ancestral comum `f3b0c089106b6386558a6f1d0d8610044aee7835`. |
| main, consulta | `839fca45224154c2eca98d1b47e0d3faa42079b0` | Nenhuma alteração autorizada ou realizada por esta minitarefa. |

As diferenças #237/#238/#239/#240 foram consultadas pela API por PR, além das versões dos arquivos nos SHAs fixados. O diff atual do #239 contra sua base já avançada não enumera a galeria herdada: ausência nesse diff **não significa ausência na branch**. O compare de ancestralidade e os símbolos presentes no arquivo confirmam a herança.

### 2. Arquivos, símbolos e riscos de conflito

“Colisão” abaixo significa sobreposição textual/semântica observada. Não foi feito merge experimental; não é uma lista de marcadores Git de conflito efetivamente produzidos.

| Arquivo | Sobreposição observada | Decisão necessária antes da integração |
|---|---|---|
| `src/scripts/shorekeeper-sk-lab.mjs` — `load`, `qaRecipes` | #237/#239 escolhem `APPROVED_MANUAL_RECIPES` fora do QA e `MOUTH_QA_RECIPES` no QA. R6 importa dinamicamente `createAnatomicalFaceDirector` e `mountFacialR6Qa`, com guard de loadId após await. | Preservar escolha opt-in e guard de descarte. Não trocar globalmente o catálogo R6 pelo catálogo da galeria. |
| Mesmo arquivo — `release`, `face`, `r6QaDispose` | Linha #239 ainda usa `face?.reset(); face=null`. R6 desmonta QA e usa `face.dispose()`, liberando o lease. | Preservar dispose R6; reinstanciar sem liberar owner causa rejeição do próximo writer. Nunca criar dois controladores vivos para galeria e R6. |
| Mesmo arquivo — `sync`, `mouthQA`, `facialR6` | Galeria usa `[data-approved-expression]` e `[data-approved-geometry]`, bloqueados por mouthQA. R6 implica mouthQA e bloqueia controles faciais legados. | Definir separação entre apresentação e bancada. Copiar HTML não torna a galeria acionável dentro de facialR6; não remover guards indiscriminadamente. |
| Mesmo arquivo — `setMouthGeometry`, `report`, `config` | Galeria permite troca fora do mouthQA para GLB canônico, registra seletor aprovado no relatório e aceita `approvedGeometry=r4/r5`. R6 usa seletor da bancada, restore e câmera/órbita próprios. | Uma única geometria efetiva e exportação coerente por modo. Manter os cinco perfis distintos; não converter R5 em default aprovado. |
| Mesmo arquivo — `initializeStage`, pós-`load` | Galeria muda VFX default r3→r5 e seleciona AMBIENT ao carregar fora do QA. R6 mantém fluxo anterior e não deve receber atuação automática nova. | Decidir defaults por modo explicitamente; não importar essa mudança como efeito lateral de liberar expressões. Nenhuma alteração VFX nesta minitarefa. |
| Mesmo arquivo — `syncR2LibraryPanel`, `recheckR2AndLoad`, `importPrivateLibraries`, `remoteAttempt`, `libraryGeneration` | #239 adiciona estado R2, refresh, contagem de clipes, biblioteca reusável e boot remoto; R6 tem load/release assíncronos e construção exclusiva de face. | Integrar cancelamento, geração e reset do modelo sem apagar QA/lease. Preservar recusa de substituir modelo local diferente. Manifesto pronto não equivale a clipes carregados. |
| Mesmo arquivo — handler `[data-r2-audit]` | #240 adiciona fetch autenticado de diagnóstico e apresentação de estados. #239 já o contém. | Conservar lifecycle/lifetime, mensagens sanitizadas e same-origin; evitar handlers duplicados e logs com dados privados. |
| `src/pages/experimentos/sk/index.astro` | Galeria injeta import `APPROVED_MANUAL_GESTURES`, seletor e botões na aba Expressões; R6 injeta `[data-facial-r6]` nessa aba. #239 injeta `[data-r2-panel]`, refresh, audit e quick-burst na área privada. | Conciliar DOM e handlers juntos; seletores ausentes quebram o mount. Não duplicar elementos nem trocar a seção inteira por uma das versões. |
| `approved-manual-gallery.mjs` × `mouth-qa-probes.mjs` / `anatomical-face.mjs` | Os sete IDs são os históricos, mas a galeria cria cópias com timings finitos: ataque .75s, hold 1.6–2.3s, release 1.1s; Surpresa .35/.9/.85. R6 congela timings QA, inclusive hold V2 de 3600s. | Mesmo ID/peso não prova mesmo gesto temporal. Preservar receitas e streams originais; eventual adaptação da galeria deve ser explícita, sem segundo writer. |
| `remote-private-model.mjs`, `private-library-coverage.mjs` | #239 acrescenta `inspectPrivateManifest` e cobertura real de clipes; mantém `getPrivateManifest` como wrapper compatível. | Importar dependências junto dos consumidores; preservar integridade SHA/limites, cancelamento e estados denied/unconfigured/missing/invalid/network. Não ocultar novamente falhas sob null. |
| `functions/api/shorekeeper/diagnostics.js`, `functions/_lib/shorekeeper-private.mjs` | #240/#239 acrescentam diagnóstico protegido e export necessário do verificador. Não há adição concorrente desse endpoint na R6. | Dependência funcional de frontend/backend; não presumir conflito textual. Preservar fail-closed, verificação criptográfica e ausência de segredos nas respostas. Não alterar Access nesta tarefa. |
| Testes das três frentes | #237 testa catálogo/integração; #239/#240 testam painel, diagnóstico e reconhecimento; R6 testa lease, streams e lifecycle. | Manter todas as intenções. Testes baseados em texto podem exigir adaptação futura, mas não apagar asserts para tornar integração verde. |

Arquivos novos distintos tendem a ser aditivos; os hotspots são o módulo central e a página. A ancestralidade confirma divergência, não compatibilidade automática. A integração permanece **não executada e não validada**.

### 3. Matriz de aparência aprovada versus perfil ainda ausente

| Aparência / ID | O que os registros afirmam | Controle humano que pode identificar o perfil | O que ainda não foi registrado |
|---|---|---|---|
| Sorriso discreto · LITTLE_SMILE_V2 | Aparência nomeada aprovada; assimetria/queixo preservados | Seleção do gesto, geometria efetiva e export do mesmo instante | Geometria, câmera, material, iluminação, idle e timestamp da sessão humana |
| Minha estrela · MY_STAR_V2 | Sorriso pleno com olhos parcialmente fechados | Mesmo procedimento, com intensidade e fase de pico explícitas | Perfil da aprovação e confirmação temporal com timings da galeria |
| Afeto crescente · MY_STAR_R3_EYES_SOFT | Intermediário aprovado; não substitui o pleno | Gesto intermediário, mesma câmera/escala e geometria do pleno | Perfil humano exato; sufixo R3 não prova que foi exibida geometria R3 |
| Olá · HELLO_R2_CANDIDATE | Saudação fechada aprovada; distinta do HELLO aberto | Seletor de gesto e perfil efetivo, não inferido do nome | Perfil humano exato; R2 no ID não prova solda R2 aplicada |
| Ternura · LOVE | Nome aprovado; associação técnica a confirmar | Exibir LOVE com ID, pesos, geometria e export | Correspondência inequívoca da aparência nomeada com essa receita/perfil |
| Serenidade · HOPE | Nome aprovado; equivalência Esperança/Serenidade a confirmar | Exibir HOPE e pedido ocular, sem alterar owner E_Close | Associação exata de receita, fechamento e perfil da sessão humana |
| Surpresa · SURPRISE_SOFT | Aparência preservada; sem enriquecimento perceptivo autorizado | Gesto e instante exportados, incluindo timing manual | Perfil e associação exata da aprovação, sem inferir só pelo rótulo |

O seletor `[data-approved-geometry]` oferece **canonical/r4/r5**; não contém r2/r3. A bancada `[data-mouth-geometry]` e o QA R6 permitem os cinco perfis. A query `approvedGeometry` registra somente a escolha explícita r4/r5 da apresentação; ausência da query não documenta uma sessão humana passada.

Câmera deve ser identificada pelos controles de vista/órbita e pelo export real de `stage.cameraConfig()` (posição, alvo, FOV/aspecto e limites), junto de `mouthGeometry`, SHA do GLB, pesos, intensidade, fase/tempo, material/luz/background e idle/camada. Os botões de câmera R6 são inspeção atual; os renders controlados frontal/45/90 não são evidência de qual câmera o autor usou para aprovar.

`approved-visual-baselines.json` mantém geometry/material/camera/idle/reviewSessionHistory nulos e **APPEARANCE_PROFILE_UNVERIFIED**. Os hashes dos cinco perfis permitem comparar geometrias; não escolhem a aprovada. A matriz JSON mantém R6-02 e R6-13 pendentes; PUB-02/PUB-04 também não confirmam configuração Access nem preview autenticado. Aprovação de aparência não autoriza inferir identidade geométrica, releaseReady ou R7.

## Transferência limitada ao Sonnet/Astra

1. Usar #238/c43b como referência congelada da R6 e #239/49b5 como linha que já contém galeria + diagnóstico; não aplicar #237/#240 novamente às cegas.
2. Reconciliar primeiro os hotspots acima em trabalho futuro autorizado, preservando ownership, dispose e timings QA. Não substituir o módulo central inteiro por theirs/ours.
3. Registrar uma sessão humana por aparência com todos os controles/contextos listados; manter o desconhecido explícito até essa prova.
4. Validar a integração em etapa própria. Nenhum teste sintético, novo deploy ou screenshot foi usado aqui para declarar aprovação humana.

Fontes fixadas: [handoff R6](https://github.com/indiolibanes/portfolio/blob/c43b9a956fea4f8fe70d8164340e2376d84ed310/docs/characters/shorekeeper-r6-handoff.md), [locks](https://github.com/indiolibanes/portfolio/blob/c43b9a956fea4f8fe70d8164340e2376d84ed310/docs/characters/approved-visual-baselines.json), [matriz JSON](https://github.com/indiolibanes/portfolio/blob/c43b9a956fea4f8fe70d8164340e2376d84ed310/docs/characters/shorekeeper-r6-approval-matrix.json), [release manual](https://github.com/indiolibanes/portfolio/blob/6cc020122d9e683d9239b562d45251b463fb8138/docs/characters/shorekeeper-approved-manual-release.md), [R2](https://github.com/indiolibanes/portfolio/blob/49b5f7aaebed5e3086ff01f70459a7316f299d4b/docs/characters/shorekeeper-r2-recognition-and-access.md) e diffs [#237](https://github.com/indiolibanes/portfolio/pull/237/files), [#238](https://github.com/indiolibanes/portfolio/pull/238/files), [#239](https://github.com/indiolibanes/portfolio/pull/239/files), [#240](https://github.com/indiolibanes/portfolio/pull/240/files).

Escopo de escrita: somente este documento. Não foram alterados main, runtime, Access, VFX, idles, blink, baselines, GLBs, manifestos ou expressões. Sem merge e sem acionamento manual de deploy.
