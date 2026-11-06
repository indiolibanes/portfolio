# Shorekeeper R6.0.3-MINI — loader e base de convergência

2026-11-04. **Correção restrita de lifecycle; R2+R6 ainda não convergidos. R7 não implementada/ativada.**

## Fonte e resultado da busca R6.0.2

Pacote consultado: `Shorekeeper_R602_R7_Integracao_Timing_Fidelidade_20261104.zip`, SHA-256 `6ba72f05fe04d944a0257668c047e264f33317690a42e399d7c3da7f47324c1e`; CRC íntegro. Foram lidos o estado inicial, auditoria, metodologia de rotação, convergência, eventos, interface conjunta, gates e templates. O pacote **não contém a entrega R6.0.2**; registra explicitamente que ela não foi localizada.

Nesta rodada: consulta às 65 branches retornadas pelo GitHub; 15 PRs recentes de todos os estados; busca de PR por `"R6.0.2"` (zero resultados); busca de arquivos pelos títulos R6.0.2/R602 e recuperação de contexto anterior. Nenhuma referência concreta adicional a branch, SHA ou exportação foi encontrada. Resultado: **R602_DELIVERY_NOT_LOCATED**, sem concluir que uma execução externa nunca existiu. Não renomear #238, #242 ou #247 como essa entrega. Quando surgir um SHA/exportação, comparar antes de reaplicar mudanças.

| Fonte | Head verificado | Papel / decisão |
| --- | --- | --- |
| #238 | `c43b9a956fea4f8fe70d8164340e2376d84ed310` | R6 anatômica isolada, não integrada nesta minietapa |
| #239 | `5555743fbae26ab055434ff44fbd5194c2af95b0` | Base deste PR independente, branch `experiment/shorekeeper-r2-library-recognition-20261104` |
| #242 | `6a69328d9b452397a835253fd737d17fc56fbdef` | Preflight documental R6.0.1, não integração |
| #246 | `352f72c58c8f6d10ee9fbefee58ee78536fbdbf5` | Já integrado em #239; não reaplicar |
| #247 | `e079cac49185cda27df09946b795deed90b9e775` | Preflight Burst documental, não coreografia |
| main | `839fca45224154c2eca98d1b47e0d3faa42079b0` | Preservada; nenhum merge automático |

## Correção demonstrável e limites

`createLocalLoader`, usado tanto pelo modelo quanto pelas bibliotecas privadas, verificava a geração antes do parse e depois dele, mas não após seus callbacks síncronos de progresso. Um callback pode cancelar/substituir a carga em 85% e ainda iniciar um parse inútil, ou cancelar em 100% e receber de volta uma cena obsoleta. Se o callback final lança erro, a cena já parseada ficava sem disposer chamado. Isso foi **reproduzido com fixtures Node**, não observado nem medido em uma sessão Access de produção.

A correção acrescenta um gate de geração antes de iniciar o parse e outro após o callback final; em cancelamento ou erro final, descarta a cena ainda não transferida ao consumidor. Preserva a exceção original do callback. Não descarta o resultado já entregue de uma carga bem-sucedida. Não altera formato/limite GLB, hash, URLModifier, leitura R2, JWT, validação de bibliotecas, receitas ou tracks.

Regressão antes da correção: os três casos novos de cancelamento pré-parse, cancelamento final e exceção final falharam; o caso de entrega normal passou. Depois: seis testes comportamentais novos passam, incluindo substituição reentrante e cancelamento durante parse assíncrono. Geometria/material Three reais em memória têm contadores de dispose; read/hash/parse são injetados com fixture, sem binários do jogo ou GPU. Isso comprova o contrato de descarte, **não uso/estabilidade da memória GPU física**.

Escopo versionado: `local-model.mjs`, teste `shorekeeper-loader-handoff.test.mjs` e este handoff. Nenhum outro runtime, Hsin, GLB/PSA, arquivo facial, auth ou página foi modificado.

## Auditoria de integração e ordem exata para Sonnet/Sol

| Área | Estado observado no código | Ação de convergência / prova exigida |
| --- | --- | --- |
| Facial | #238 tem `claimFacialWriter` por arrays de influences, baseline em shadow arrays, R6 opt-in; #239 usa gentle e galeria aprovada | Instanciar um único controller; não rodar gentle vivo e R6 simultaneamente. Não substituir Little Smile V2, My Star V2, Olá R2 nem timings da galeria por receitas QA |
| Descarte | R6 libera `r6QaDispose` e `face.dispose`; R2 apenas reseta face | Trazer o disposer R6, remover handlers antes de soltar influences/geometry; liberar a lease antes de descartar modelo. Não copiar release de #239 sobre R6 |
| Corpo | Diretor original/legacy/combo usam `claimBodyOwner`; combate recebe somente TRS | Dispor owner anterior antes de criar outro mixer. Não escrever morphs através do mixer ou VFX; preservar as três idles e blink bilateral |
| Carregamento | R2 tem `remoteAttempt`, `loadId`, `libraryGeneration`, loader cancelável e validação SHA; R6 acrescenta imports assíncronos antes da adoção | Reconciliar uma única máquina de load. Após todo await, validar geração, disposed, sinal, identidade do modelo e biblioteca. Descartar resultados rejeitados no consumidor, inclusive cancelamento entre resolução da Promise e adoção; o gate do loader não substitui esse gate |
| Inicialização | R6 implica mouthQA; #239 tem galeria, R2-first, `maintenance=1`, VFX R5 | Integrar por função e markup, sem ours/theirs global. Manter candidatos R6 opt-in e galeria fora de QA. Mount R6 só após modelo/inspection/controller válidos; falha de import/mount deve desfazer setup parcial |
| R2 / contexto | Reconhecimento de 10 IDs é separado do manifesto; perda de contexto cancela o loader do modelo, mas não invalida explicitamente todos os caminhos de biblioteca/download na linha R2 | Definir invalidação conjunta no context lost/retry: abort remoto + geração da biblioteca + cancel loaders; impedir adoção em contexto perdido. Testar deferred downloads/parse ao perder e restaurar contexto. É item aberto, não correção validada aqui |
| Relógio | RAF único existente; combo possui speed/seek; narrativa VFX tem relógio independente | Não ligar VFX por timer de demo. A futura timeline deve recompor todos os subsistemas a partir do mesmo tempo de apresentação |

Continuidade em commits pequenos, sobre o head deste draft: (1) localizar a entrega R602 ou manter lacuna explícita; (2) portar módulos R6 e QA opt-in sem substituir o front R2; (3) integrar load/release/sync/handlers com rollback parcial e cancelamento; (4) resolver UI/receitas por perfil; (5) executar no **mesmo head** testes dos dois ramos e build; (6) validar R2 real→R6→combate→retorno, reload, pause/offscreen, três ciclos e perda/restauração de contexto. Não considerar os testes isolados dos PRs como prova dessa convergência.

## Rotação: históricos, medição atual e indisponível

| Categoria | Evidência | Limite |
| --- | --- | --- |
| Histórico CL.1/C.4/R4/R5 | Desvio inicial Root↔bind ~176.9°/173.4°; variação Root .507/.312 rad; Bip001 1.124/3.132 rad; translação Root zero; 181/164 frames, ~6.000/~5.433 s | Não reamostrados nesta minietapa. Amplitudes Bip001 ~18.94/~96.88 são ActorX, não metros; não fornecem orientação final |
| Inspeção local atual | SHA do GLB canônico recalculado `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`, 39.487.548 B; inventário JSON: 11 animações, somente auxiliares/idles; bind Root xyzw `[0.7071067811865476,0,0,-0.7071067811865476]` | Bind local não é yaw mundial nem pose Burst |
| Indisponível nesta inspeção | Bundles reais Basic/Advanced/Burst e referências originais quadro a quadro não foram materializados/analisados nesta rodada | `ROTATION_PENDING`, `HEAVY_ATTACK_UNVERIFIED`, `LIBERATION_MAPPING_UNVERIFIED`; nenhuma orientação A/B/C promovida |

Para medir: obter fontes privadamente e registrar hash/duração/track.times; amostrar clone com mixer único, matriz mundial Root/Bip001, frontal calibrado e yaw desembrulhado, solas skinadas e piso conhecido. Comparar ORIGINAL/REBASED/ROOT_BODY_OWNED com câmera fixa, VFX OFF e mesmos tempos. Separar giro 3D, yaw projetado, translação corporal, órbita de câmera e campo. REBASED corrige quaternion por fator constante; ROOT_BODY_OWNED fixa Root e remove sua evolução. Não escolher por menor yaw nem cortar a pirueta Burst02. Relatório #247 permanece referência complementar, não medição nova.

## Contrato futuro de apresentação — não ativado

Fluxo: **BA1 → BA2 → BA3 → HA → RS → Ult → Outer Stellarealm com gestos permitidos → colapso → recuperação → Idle → reinício**. Sem Echo ou troca. L02 é apenas candidato HA; Skill01 candidato RS; Burst01/02 ainda sem mapeamento ULT confirmado. Ausência/identidade pendente deve bloquear rótulo de sequência completa, nunca substituir HA por BA4 silenciosamente. Plano antigo permanece disponível para comparação.

Contrato de evento: `{cycleId,event,clipId,clipHash,variant,sourceFrame,clipTime,sequenceTime,provenance,confidence,evidence}`. Nenhum timestamp preenchido sem medida. Cues autorais usam `AUTHORED_CUE`; somente fonte verificável autoriza `ORIGINAL_GAME_MARKER`. Clock único avançado pelo RAF; pause/offscreen congela; speed é comum; seek recompõe estado sem reproduzir eventos passados; reset limpa ciclo/seed; dispatch de cruzamentos uma vez por ciclo; interrupção libera câmera e entra em recuperação segura. Narrativa de 18 s não é fonte de markers.

Requisitos do pacote para a atuação solo: manter Outer; duração normal do jogo 30 s segundo as referências citadas no pacote. Sugestão de ~10 s para QA é adaptação autoral rotulada, não mecânica canônica. Sem Intro Skills/troca, não inventar evolução Inner/Supernal. Câmera única salva/restitui posição, target, FOV, limites e flags Orbit em stop/erro/abort/context loss; resize usa aspect atual. Preservar rosto/mãos/pés e enquadramento pessoa+campo+chão+céu/canopy em 390×640 e 16:9.

### Handoff da futura interface Hsin + Shorekeeper

Modo DUO experimental opt-in: Hsin à esquerda/centro, Shorekeeper à direita; preservar Hsin V2.0.1 pública e as duas rotas independentes. Modelo SK e código sob demanda, via acesso existente, canceláveis; acesso negado mostra estado discreto sem URL privada. Preferir um canvas/cena/RAF compartilhado na composição e owners por personagem; não montar dois renderers pesados sempre ativos. No retrato 390×640, foco em uma personagem com alternância; rig fora de foco em espera, pausa offscreen, DPR adaptativo, alvo móvel 30 FPS e reduced-motion. Controles mínimos em branco/azul-gelo Material You; importações apenas maintenance. Essa interface **não foi implementada aqui**; precisa de captura desktop/retrato e Samsung físico antes de aprovação.

## Validação, pendências e rollback

Executados no checkout isolado da base #239 com apenas a correção deste PR:

```sh
node --test tests/shorekeeper-loader-handoff.test.mjs tests/shorekeeper-r5-runtime.test.mjs tests/shorekeeper-r2-recognition.test.mjs tests/shorekeeper-r2-panel-integration.test.mjs tests/shorekeeper-r2-connection-status.test.mjs tests/shorekeeper-private-model-cache.test.mjs tests/shorekeeper-combo-sequencer.test.mjs tests/shorekeeper-private-r2.test.mjs
npm run build
```

**35 resultados Node PASS, zero falhas; build, OG e build hygiene PASS.** São seis regressões comportamentais novas mais cobertura existente de contrato/sintética; não são os 35 gates artísticos do pacote. O reconhecimento 10/10 nesses testes usa fixtures, não downloads autenticados. A correção foi reproduzida antes e depois. Nenhuma renderização SwiftShader/WebGL, teste GPU físico, Samsung, sessão prolongada, novo vídeo ou aprovação humana nesta rodada.

Gates: `LOADER_HANDOFF_STRUCTURAL_PASS`, `BUILD_PASS`; `R2_R6_CONVERGENCE_PENDING`, `R602_DELIVERY_NOT_LOCATED`, `AUTHENTICATED_RUNTIME_PENDING`, `ROTATION_PENDING`, `HUMAN_ARTISTIC_PENDING`, `MOBILE_GPU_PENDING`. Os perfis exatos das aprovações faciais continuam sem comprovação histórica; preservar receitas e geometria selecionada, não unificar por suposição.

Rollback: não há migração de dados, flag nova ou estado persistente. Reverter o commit deste draft restaura o loader da base `5555743…`; não fechar #238/#239 nem alterar assets privados. Antes de integrar trabalho futuro, rever o diff e os heads; exigir testes R2/R6 no mesmo checkout e QA externo. Sem merge ou deploy manual nesta entrega.

Wuthering Waves e Shorekeeper © KURO GAMES. Experiência independente e não oficial.
