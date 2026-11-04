# Shorekeeper — R7 / Burst cinematic preflight

Data: 2026-11-04. Escopo: microauditoria documental de `/experimentos/sk/`, sem implementação R7. **SOURCE_AUDIT_PASS / CLIP_EVENT_TIMES_NOT_VERIFIED / LIBERATION_MAPPING_UNVERIFIED / HUMAN_ARTISTIC_PENDING / MOBILE_GPU_PENDING**. Nenhuma aprovação cinematográfica ou nova renderização WebGL nesta rodada.

## 1. Snapshot e base da entrega

| PR | Head conferido | Base / estado no snapshot |
| --- | --- | --- |
| #238 | `c43b9a956fea4f8fe70d8164340e2376d84ed310` | `experiment/shorekeeper-r6-preflight-approval-lock-20261104`; aberto, não draft, não integrado |
| #239 | `5555743fbae26ab055434ff44fbd5194c2af95b0` | `experiment/shorekeeper-r4-visual-fidelity-20261104`; aberto, não integrado |
| #242 | `6a69328d9b452397a835253fd737d17fc56fbdef` | branch R6 #238; draft, somente preflight documental |
| #246 | `352f72c58c8f6d10ee9fbefee58ee78536fbdbf5` | integrado ao #239 pelo merge `5555743fbae26ab055434ff44fbd5194c2af95b0` |

O head de referência `30ee896…` do #239 foi superado. A branch de #246 não aparece entre as 65 branches retornadas pela API. A comparação GitHub #246 → #239 atual retorna ahead=1, behind=0 e **zero arquivos diferentes**, com árvore idêntica `21f190cdb9540fb4644ad99db6399671552c6c19`. Portanto esta entrega documental usa a branch sobrevivente de #239, no merge que contém #246, como base; não recria a branch removida. É continuação de #246, sem integrar R6. O documento #242 não constitui merge funcional.

Os seis módulos exigidos foram lidos no SHA de #246: `combo-plan.mjs`, `combo-sequencer.mjs`, `combo-camera.mjs`, `vfx-narrative.mjs`, `liberation-rotation.mjs`, `combat-director.mjs`, sob `src/scripts/shorekeeper/`. Também foram conferidos `stage.mjs`, `camera-ownership.mjs`, `landing-transition.mjs`, o wiring em `shorekeeper-sk-lab.mjs` e relatórios históricos R4/R5. Não houve alteração de runtime, autenticação, assets ou main. Snapshot de main: `839fca45224154c2eca98d1b47e0d3faa42079b0`.

## 2. Evidência realmente acessível

- GLB canônico local: 39.487.548 bytes, SHA-256 recalculado `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`. O JSON glTF contém 11 animações: duas auxiliares e os três idles com suas versões composed/BODY/RIB. **Não contém ataques, Skill ou Bursts**. Nenhum binário privado foi incluído nesta entrega.
- Não foram encontrados GLBs de combate, PSAs ou GIFs originais no material local da sessão. O relatório R2 registra a existência anterior das bibliotecas basic/advanced/burst; isso não prova disponibilidade local atual nem acesso remoto autorizado. Não foram sondadas sessões Access ou endpoints privados para contornar essa ausência.
- As montagens históricas na conversa não oferecem o fluxo original nem correspondência exata PSA↔vídeo. Não foram usadas para inventar fotogramas ou contato com o chão.
- Os dois links YouTube indicados não puderam ser abertos pela ferramenta de consulta; **não assistidos**, sem análise quadro a quadro. A página Fandom também não foi recuperada. Prydwen foi consultada para semântica do kit, não para medir animações.

`Root` no GLB canônico tem translação local `[0,0,0]` e quaternion de bind `[0.7071067811865476,0,0,-0.7071067811865476]` (ordem xyzw). Isso **não é** o quaternion de nenhuma Burst nem yaw em espaço de mundo. `Bip001`, `Bip001Pelvis`, `Bip001LFoot` e `Bip001RFoot` existem; suas transformações locais estáticas não demonstram voo ou apoio durante combate.

## 3. Mapa dos clipes e identidade mecânica

Durações históricas abaixo são transcrições de relatórios versionados, **não remedições dos clipes nesta sessão**. A identidade mecânica exige confronto com a fonte e o jogo; nome de arquivo não basta.

| ID de origem | Duração convertida nesta sessão | Registro histórico / identidade |
| --- | --- | --- |
| `SK_ATTACK_01_ORIGINAL` | NOT_VERIFIED | Basic 1 segundo contrato existente; mídia não revalidada |
| `SK_ATTACK_02_ORIGINAL` | NOT_VERIFIED | Basic 2 segundo contrato existente; mídia não revalidada |
| `SK_ATTACK_03_ORIGINAL` | NOT_VERIFIED | Basic 3 segundo contrato existente; mídia não revalidada |
| `SK_ATTACK_04_ORIGINAL` | NOT_VERIFIED | Basic 4; não equivale ao HA solicitado |
| `SK_ATTACK_L02_ORIGINAL` | NOT_VERIFIED | **HEAVY_ATTACK_UNVERIFIED**; advanced, não usado no combo atual |
| `SK_SKILL_01_ORIGINAL` | NOT_VERIFIED | Candidato RS; R4 registra 158 frames, 30.191083908 FPS fonte, 5.233333142 s convertidos |
| `SK_SKILL_QTE_01_ORIGINAL` | NOT_VERIFIED | QTE; não substituir HA/Ult nem introduzir troca de personagem |
| `SK_AIR_SKILL_01_ORIGINAL` | NOT_VERIFIED | Air Skill; não substituir HA/Ult por semelhança de nome |
| `SK_BURST_01_ORIGINAL` | NOT_VERIFIED | C.4 registra 181 frames corpo/Rib, ~30.1667 FPS fonte, ~6.000 s; correspondência End Loop **UNVERIFIED** |
| `SK_BURST_02_ORIGINAL` | NOT_VERIFIED | C.4 registra 164 frames corpo/Rib, ~30.1840 FPS fonte, ~5.433 s; correspondência End Loop **UNVERIFIED**, pirueta a preservar |

Conclusão de identidade: **não há evidência nova suficiente para escolher qual Burst representa Resonance Liberation, nem para promover L02 a Heavy Attack**. HA no kit possui Unbound Form e comportamento condicionado pelos recursos; isso reforça a necessidade de comparar a atuação completa em vez de renomear um Basic Attack.

### Amostras por fase exigida

Cada célula pendente exige tempo local do clipe, índice e convenção do frame, quaternion Root xyzw, yaw desembrulhado em referencial declarado, posição mundial Bip001/pelve/solas e câmera da referência. Nenhuma fase abaixo foi medida nesta rodada.

| Fase | Burst01: frame / segundo / dados | Burst02: frame / segundo / dados | Câmera do GIF/jogo, solo e oclusão |
| --- | --- | --- | --- |
| Preparação | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED |
| Ascensão | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED |
| Ápice | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED |
| Rotação | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED |
| Descida / primeiro contato sustentado | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED |
| Saída / transferência para Idle | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED |

R4/R5 registram probes PSA Burst01 **0/105/135**, FPS fonte 30.166666031; Burst02 **0/54/107/163**, FPS 30.184049606. Pela simples conta índice/FPS, com origem zero, os probes seriam 0/3.480663/4.475138 s e 0/1.789024/3.544919/5.400203 s. **São pontos históricos de inspeção, não eventos identificados nem timestamps remensurados do GLB.** Conferir os tempos dos accessors convertidos: não transportar automaticamente FPS/duração ActorX para a timeline glTF, nem chamar o frame 107 de ápice por conveniência.

O relatório CL.1 registra, historicamente: diferença inicial Root↔bind ~176.9°/173.4°; variação Root vs primeiro frame ~0.507/0.312 rad; amplitude Bip001 ~1.124/3.132 rad; translação Root zero nas duas Bursts. C.4 registra amplitude Bip001 ~18.94/~96.88 em **unidades ActorX**, não metros. Nenhum desses números fornece quaternion/yaw por fase, trajetória das solas ou prova de aterrissagem. Não foram recalculados agora.

## 4. O que o código atual efetivamente apresenta

| Sistema | Constatação no código | Consequência para a próxima implementação |
| --- | --- | --- |
| Plano corporal | BA1–4 → Skill01, se disponível → Burst02 → Idle; landing opt-in R4/R5 | Não satisfaz BA1→BA2→BA3→HA→RS→ULT. L02 nunca é requerido. `ALL_SOURCE_CLIPS_PRESENT` refere-se apenas ao plano antigo, não aos dez clipes nem ao novo roteiro |
| Fontes ausentes | Qualquer BA ausente reduz a sequência a Burst02→Idle; Skill ausente pode ser omitida; Burst02/Idle ausentes geram erro | Fallback atual é explícito na UI, mas não pode ser anunciado como execução do roteiro completo |
| Matching | Janelas de saída não-Burst começam em 80%; entrada na Burst limitada a zero; Burst sai no fim integral | Preservar a pirueta e não encurtar a Burst para esconder pose suspensa; verificar separadamente os overlaps |
| Landing | Ponte gerada separada, depois da Burst; default .9 s, contato autoral .558 s; R5 1.15 s, contato .667 s | Tempos da ponte são parâmetros autorais, não contato medido do PSA. Possível atraso de apoio precisa ser filmado e medido antes de ajuste |
| Eventos | `buildComboSchedule` retorna ENTER/BLEND_IN/END por segmento; driver publica apenas start/recovery/end genéricos de `SK_COMBO_EXPERIMENTAL` | Hoje não existe emissão runtime de marcas semânticas por clipe. A tabela do schedule não é um dispatcher de cues |
| Câmera do combo | azimute `.13*sin(2πu)`, raio `height*3.15`, FOV fixo 34; centro/altura não seguem a pose | Pequena órbita; não há push-in/pull-back nem ajuste por aspect/elevação. Risco de corte em retrato, não constatado por render nesta rodada |
| VFX narrative | Relógio manual separado: 0/3/6/12/15/18 s; fases AMBIENT/PREPARATION/STELLAREALM/RESONANCE_PEAK/RECOVERY/AMBIENT ou OFF | Tempos autorais da demo, sem vínculo verificável com Bursts. Não reutilizar como markers originais |
| Loop e ownership | Um RAF chama corpo, câmera, rosto, narrative e VFX; leases de body/camera evitam owners duplicados | Mesmo dt no RAF não prova relógio semântico compartilhado: speed/seek/recovery do combo não retemporizam a narrative. O combo interrompe a narrative ao iniciar |
| Rotação | ORIGINAL intacto; REBASED aplica correção quaternion constante; ROOT_BODY_OWNED fixa Root no bind | Comparar A/B/C com câmera fixa; B preserva rotações relativas do Root, C as remove. Ambas preservam canais não-Root; a pirueta corporal precisa de inspeção. Menor yaw não escolhe vencedor |

Separação forense: **corpo** = tracks TRS + transforms ancestrais e ponte identificada; **câmera** = posição/target/FOV/Orbit, nunca deduzidos do yaw corporal; **Stellarealm** = geometria/luz/partículas procedurais, sem evidência de que pertençam ao PSA. Avaliar corpo primeiro com câmera fixa, campo OFF e piso legível; repetir com câmera dinâmica e campo depois.

Áreas a inspecionar, ainda sem defeito visual confirmado nesta rodada: braços/mãos cruzando rosto, cabelo/tecidos durante giro, anéis/core na linha dos olhos, silhueta suspensa contra cobertura e pés ocultos pelo campo. Comparar materiais reais e manter frontal, ¾ e topo sincronizados.

## 5. Mapa candidato de sincronização, sem segundos arbitrários

Estes eventos são um **contrato proposto, não código ativado**. Cada marca terá `clipId`, `variant`, `sourceHash`, `sourceFrame`, `clipTime`, `sequenceTime`, `provenance: AUTHORED_CUE`, método de medição e evidência. Mesmo uma marca baseada em um landmark medido não vira `ORIGINAL_GAME_MARKER` sem fonte oficial. Eventos ainda sem landmark permanecem bloqueados; não preencher por fração arbitrária da duração.

| Marca candidata | Âncora a medir | Câmera e VFX propostos | Gate |
| --- | --- | --- | --- |
| `ULT_ANTICIPATION` | Início comprovado do gesto preparatório na Burst escolhida | Abrir espaço negativo e preparar contraste; campo ainda não promovido por um timer genérico | Identidade ULT + frame de antecipação |
| `ULT_PUSH_IN` | Gesto das mãos identificado após antecipação | Aproximação suave, rosto e mãos dentro de margens; Core sem flare oclusivo | Mãos/rosto visíveis em retrato |
| `ULT_ELEVATION_REVEAL` | Primeiro levantamento de apoio confirmado por solas/pelve | Subir target e revelar corpo/pés; preservar curva de giro | Distinguir subida corporal de movimento da câmera |
| `FIELD_REVEAL_PULL_BACK` | Gesto de liberação comparado ao nascimento do campo na referência | Pull-back com Shorekeeper, chão, horizonte, céu e canopy juntos | Campo convincente sem encobrir corpo |
| `GROUND_RETURN` | Descida e primeiro apoio sustentado; depois conclusão da ponte, se necessária | Restituir leitura dos pés/pelve e estabilizar composição, sem cortar a descida | Fonte vs ponte separadas e apoio confirmado |

Relógio futuro: uma timeline de apresentação explícita governa corpo/câmera/cues; derivar tempo local de cada segmento e emitir cruzamentos de eventos uma vez por ciclo. Pause/offscreen congelam esse relógio; speed, seek e recovery precisam de política determinística de recomposição, sem disparar eventos atrasados em cascata. Testar 30/60 Hz, seeks e interrupções. Nenhum timer paralelo novo nesta entrega.

### Camera owner e enquadramento 390×640

O owner existente `claimCameraOwner(stage, label)` lança erro se já houver proprietário. `createComboCamera.start()` salva `stage.cameraConfig()` e enabled/enableDamping; `stop()` restaura e libera em finally. A captura inclui preset, posição, target, FOV, aspect e limites min/maxDistance. `stage.restoreCamera()` restaura posição/target/FOV/preset/limites, **não aspect**, que vem do resize. Near/far/up e o restante dos parâmetros Orbit não fazem parte desse snapshot atual.

Para a próxima câmera: adquirir uma única lease e salvar todos os campos que ela alterar; resolver falha de inicialização liberando a lease; desabilitar interação/damping durante a atuação; restaurar posição, target, FOV, limites e flags em término, cancelamento, erro, troca de modo, descarte e perda de contexto, sem duas câmeras concorrentes. Manter aspect atual após resize e recomputar fit; não restaurar aspect obsoleto. Não alterar near/far/up ou outras opções sem ampliar simetricamente o snapshot/restauração.

Para retrato, usar os bounds mundiais da pose amostrada (incluindo mãos/cabelo/pés) e o envelope da elevação. Distância mínima pela maior exigência vertical/horizontal: `max(h/(2*tan(vFov/2)), w/(2*aspect*tan(vFov/2)))`, mais profundidade e margem verificadas por projeção dos extremos. Validar coordenadas NDC com margem, inclusive no ápice/giro, em 390×640 e 16:9. Campo/canopy exigem enquadramento adicional; se o rosto ficar ilegível, limitar a aproximação por composição e não por deformação corporal. A câmera atual não implementa essa garantia.

## 6. Mecânica canônica e adaptação autoral

Referência de kit consultada: [Prydwen — Shorekeeper](https://www.prydwen.gg/wuthering-waves/characters/the-shorekeeper), seções Kit e Review. Em S0, Stellarealm normalmente dura **30 s**. Outer→Inner→Supernal depende de Intro Skills, associado à troca/rotação de personagens. O roteiro desta experiência exclui troca e Echo: manter **Outer Stellarealm**, sem inventar upgrades canônicos causados por BA, tempo ou gestos.

Um campo de ~10 s para QA será **simulação autoral condensada**, configurável e sinalizada na interface. Gestos pós-Ult e colapso/explosão final também são direção autoral, não demonstração da evolução canônica nem Discernment disfarçado. Fluxo pretendido: BA1→BA2→BA3→HA verificado→RS verificada→ULT verificada→gestos originais permitidos no Outer→colapso/dissolução autoral→recuperação→reinício. Sem HA/ULT identificados, bloquear o fluxo completo ou exibir fallback nominal explícito.

Referências indicadas e não assistidas: [vídeo A](https://youtu.be/aW5WvBf36Oo), [vídeo B](https://youtu.be/HjL50IRhATc). [Combat/Fandom](https://wutheringwaves.fandom.com/wiki/Shorekeeper/Combat) não recuperado. Fontes internas históricas: [C.4](shorekeeper-f21c4-burst-liberation.md), [CL.1](shorekeeper-cl1-rotation-and-vfx-hunt.md), [R4](shorekeeper-r4-finalization.md), [R5](shorekeeper-r5-finalization.md), [R2](shorekeeper-r2-recognition-and-access.md).

## 7. Bloqueios, reprodução e gates

1. Disponibilizar privadamente bibliotecas basic/advanced/burst e GIFs/vídeos originais com hashes; conferir dez IDs efetivamente carregados. Não copiar para Git, public, dist ou artefatos públicos. Autenticação inalterada.
2. Em ambiente autorizado, comparar cada Burst ORIGINAL a câmera fixa, depois REBASED/ROOT_BODY_OWNED nos mesmos tempos; registrar separadamente Root quaternion/yaw desembrulhado, Bip001/pelve e solas mundiais, escala/hierarquia e transform do modelo. Guardar hash da fonte e amostragem por accessor; comparar tracks originais antes/depois.
3. Identificar as seis fases da tabela, confrontar imagens com referências e resolver HA/ULT. Contato exige plano de piso e solas skinadas/velocidade com confirmação visual; um mínimo da altura do ankle ou evento de ponte sozinho não certifica apoio.
4. Só depois produzir dispatcher determinístico e câmera por landmarks. Convergência R2/R6 é trabalho separado; preservar baseline facial aprovado e a lease exclusiva Face/Eye. Não ativar scheduler R7 aqui.
5. QA futura: vídeos frontal/¾/topo, referência lado a lado, três ciclos, interrupção no ápice, retrato/16:9, três recargas, contexto perdido/restaurado e Android Samsung Internet. Guardar evidências privadamente; não chamar SwiftShader de teste GPU físico.

| Gate | Resultado desta rodada | Critério para avançar |
| --- | --- | --- |
| Heads / leitura dos seis módulos / escopo documental | SOURCE_AUDIT_PASS | PR de um arquivo; base sucessora de #246 explicitada |
| GLB canônico / inventário JSON / SHA | LOCAL_ASSET_AUDIT_PASS | Confere o modelo, não substitui fonte de combate |
| Duração/trajetórias de combate e markers por fase | NOT_VERIFIED | Bibliotecas reais + amostragem + referência visual |
| HA L02 e identidade Liberation | UNVERIFIED | Comparação corporal e de gameplay, sem substituição silenciosa |
| Contrato R7 implementado/testado | NOT_IMPLEMENTED | Nenhum runtime ou teste sintético novo nesta microauditoria |
| Renderização nova SwiftShader/WebGL | NOT_RUN | Capturas reais da implementação futura |
| GPU físico / Samsung | MOBILE_GPU_PENDING | Sessão no hardware, sem inferir de CI |
| Aprovação cinematográfica humana | HUMAN_ARTISTIC_PENDING | Revisão explícita com GIFs e evidência WebGL |

Validação desta entrega: inspeção estática e consulta de metadados; SHA e inventário do GLB recalculados. Sem build, Chromium, vídeos, teste GPU, merge ou deploy manual nesta rodada. Teste estrutural opcional não acrescentado: priorizou-se o mapa factual, sem criar um teste que apenas repita uma proposta ainda não implementada.

Wuthering Waves e Shorekeeper © KURO GAMES. Experiência independente e não oficial.
