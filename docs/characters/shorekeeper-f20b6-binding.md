# Shorekeeper F2.0-B.6 — verificação facial

Base #208, `3e7778ef51166a1cabff4b3d655f2d91f63c98ef`. Resultado **FACIAL_CONSOLIDATION_PARTIAL / VISUAL_QA_PENDING**. O usuário aprovou os três idles e a piscada bilateral; relatou que o Sorrisinho V2 não é perceptível. A fase B pode ser encerrada parcialmente sem bloquear o combate.

O GLB canônico foi verificado localmente: SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`. Three.js 0.186 carregou 249 joints por skin, 64 targets Face, 5 Eye, 14 Down, 14 Alpha e 11 animações sem tracks de morph. Imagens simuladas no Node; não houve WebGL. Os morphs são deformações, não bones.

| Recurso | No GLB | Ligado ao runtime | Deformação comprovada | Visualmente aprovado | Classificação |
|---|---|---|---|---|---|
| Idle 01–03 | Sim | Diretor original | Playback original | Sim, informado pelo usuário | APPROVED |
| Piscada bilateral E_Close | Sim | Controlador e scheduler | Sim, delta não nulo | Sim, informado pelo usuário | APPROVED |
| Sorrisinho V2 | Sim | Quatro índices Face, inclusive durante Idle 01 | Sim, delta combinado não nulo | Usuário relata imperceptível | VISUAL_FAIL_OR_UNCONFIRMED; GEOMETRY_ONLY |
| Pupil L/R/Up/Down | Sim | Escrita individual pela inspeção | Sim, deltas não nulos | Não verificado | GEOMETRY_ONLY |
| E_Stare | Sim | Escrita individual pela inspeção | Sim, delta não nulo | Não verificado | GEOMETRY_ONLY |
| M_OpenSmall | Sim | Escrita individual pela inspeção | Sim, delta não nulo | Não verificado | GEOMETRY_ONLY |
| Surpresa combinada | Morphs presentes | Preset anterior experimental | Combinação não testada visualmente | Não verificado | EXPERIMENTAL |
| Wink unilateral / bochecha inflada | Sem capacidade equivalente confirmada | Não | Não | Não | UNSUPPORTED |
| My Star / Amor / Esperança / Olá / Preocupada / Meme | Alguns morphs presentes | Presets anteriores bloqueados | Sem equivalência demonstrada | Não | UNSUPPORTED como reprodução de cutscene |

**Sorriso:** `M_Smile_L` índice 24, `M_Smile_R` 23, `P_M_L_Add` 37 e `P_M_R_Add` 36 em Shorekeeper_Face. O controlador escreveu 1,0 nos quatro durante Idle 01; após novo avanço do mixer os pesos permaneceram 1,0 e retornaram a 0. Os deltas máximos individuais são aproximadamente 3,84 mm para M_Smile e 4,66 mm para P_M_Add; soma dos quatro vetores por vértice chegou a 6,82 mm em espaço local. Isso não equivale à percepção de sorriso nem mede pixels de boca. Não foi identificado erro de índice. `SMILE_GEOMETRICALLY_PRESENT_VISUALLY_INSUFFICIENT` é consistente com o relato do usuário, mas a comparação em WebGL permanece pendente.

Olhos: índices Eye Pupil_L 3, R 2, Up 0, Down 1 receberam 0,24 separadamente. Atributos de posição têm deltas não nulos; não foi demonstrado que a íris se desloque de modo visível ou sem clipping no material real. E_Stare Face índice 16 e M_OpenSmall índice 27 receberam 1 separadamente e têm deltas não nulos. A surpresa combinada não foi aprovada. Nenhum bone de cabeça ou pescoço foi escrito pela camada facial nos testes anteriores de regressão.

**Limitações:** sem contexto WebGL2 real não foram capturados neutro/pico/retorno, vistas frontal e ¾, recorte da boca ou tamanho de celular; tampouco foi aprovada a surpresa ou `GAZE_CONTROL_PASS`. Os dados B.4 são de rasterização CPU e não substituem essa avaliação. O teste de IndexedDB verifica contrato/fallback em Node, não persistência de navegador ou Samsung Internet. Não houve mudança de material, rig ou geometria. O GLB e as animações de origem não foram publicados.

O botão cotidiano do sorriso foi ocultado; seu controlador e dados permanecem para QA interno, sem anúncio de resultado funcional. As receitas anteriores estão em `shorekeeper-facial-presets-archived.md`. A piscada aprovada e os idles não foram alterados. A recuperação dos ataques depende dos PSA originais e pares Rib; consulte PR #205, `SOURCE_ASSETS_BLOCKED`.

Teste privado reproduzível: `node tests/shorekeeper-b6-binding-private.mjs /caminho/privado/modelo.glb`. Não é teste visual e simula a decodificação de PNG.
