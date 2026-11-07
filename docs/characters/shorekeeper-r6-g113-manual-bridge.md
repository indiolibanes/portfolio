# Shorekeeper — ponte R6 anatômica / G11.3 S5 / G7

**Status:** `R6_G113_MANUAL_PREVIEW` — QA artístico, GPU física, 10 minutos Android e G7 ainda pendentes. Esta é uma experiência de validação, não R7/G7 aprovado.

## Origem e motivo

O código de **R6** (`anatomical-face.mjs` + `facial-ownership.mjs`) e o score **G11.3/S5** (`r62-integration.mjs`, VFX e sequência original) já coexistiam na main após a integração histórica de 2026-11-06 (PR #257). O R6, porém, ficava restrito a `?facialR6=1` e este flag também ativava `mouthQA`, tornando a prévia do palco comparativamente diferente. S6 automática no código continuava com `createGentleFace` e três famílias legadas; não tinha validação anatômica R6. **G7 permanece NO_GO.**

Esta branch apenas unifica manualmente os dois modos no mesmo palco, sem sobrescrever as receitas, keyframes, modelo, FPS, render loop, VFX ou G11.3.

### Abrir a prévia

`/experimentos/sk/?r61=1&r62=s5&r6Stage=1`

- `r6Stage=1`: opt-in explícito do único compositor R6 no palco S5, sem acionar `mouthQA`, sem esconder VFX, sem selecionar contorno de boca por padrão.
- Menu S5 continua G11.3. Aba **Expressões** → oito **candidatos anatômicos manuais R6** e Retorno ao neutro.
- Somente modelo privado canônico, em Contemplação, sem pausa nem combate. Durante o S5, a face cede ao proprietário corporal; depois ela pode ser acionada manualmente novamente, quando o usuário retornar a Contemplação.
- O scheduler legado permanece desativado neste modo; `s6Auto=1` **não** habilita G7/R7 R6. Sem disparos automáticos ou seleção emocional em sequência.
- URL sem `r6Stage=1`: comportamento original; `?facialR6=1` mantém o laboratório histórico completo.

### Expressões disponíveis como candidatos, não promovidas

`LITTLE_SMILE_ACTING_R6`, `MY_STAR_ACTING_R6`, `AFFECT_GROWING_R6`, `HELLO_ACTING_R6`, `TENDERNESS_ACTING_R6`, `SERENITY_ACTING_R6`, `WORRIED_FIXED_R6`, `GLANCE_BILATERAL_R6`.

Os IDs antigos e receitas base continuam preservados, bem como 3 idles canônicos e `E_Close`/piscada. `APPROVED_NAMED_APPEARANCES_PROFILE_UNVERIFIED` continua válido: não criar aliases de Ternura/Serenidade sem a geometria/câmera da aprovação humana. O compositor único faz o commit no Face/Eye, com oculares geridas pelo mesmo owner. O diretório G11.3 não publica nem reconstrói morphs.

### R2 — não é necessário trocar o modelo para esta alteração

- O F2.0-A canônico SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`, 39.487.548 bytes, continua sendo o GLB facial correto, pois as receitas R6 residem no código, não em novos morphs no R2.
- As bibliotecas `basic` (4 clipes), `advanced` (4 clipes) e `burst` (2 clipes) continuam sendo os grupos necessários para o score S5. Não gerar/republicar novos GLBs para R6.
- No relatório S6-C de 2026-11-06 o bucket de **preview** `private-assets` foi criado com domínio público desabilitado, mas o prefixo `characters/shorekeeper/` estava **vazio**. Isso não confirma o estado remoto atual; precisa de verificação autenticada antes de qualquer upload.
- Se os objetos ainda faltarem, publicar com `scripts/shorekeeper/publish-private-to-r2.mjs`, primeiro `--dry-run`, depois `--init` uma única vez para o manifesto inicial. Conferir hashes e limites do manifesto. **Jamais fazer upload automático só para validar este PR**.
- Pages Preview precisa binding `SHOREKEEPER_ASSETS_R2` para `private-assets`, variáveis protegidas `SK_ACCESS_TEAM_DOMAIN` e `SK_ACCESS_AUD`, Access JWT correto. A configuração do Worker separado não se propaga automaticamente às Pages Functions; produção não deve ser alterada por esta fase.
- Este assistente só tem acesso verificado ao GitHub para alterar código. Sem credenciais de R2/Cloudflare, nenhum upload foi realizado nem solicitado. Não compartilhar tokens pelo chat; conceder autorização temporária e escopo reduzido somente por conexão segura caso o usuário deseje automatizar uploads.

## Gates e QA

- PR draft sobre main, nunca commit direto nela.
- CI: verificar build Astro, suíte sintética Shorekeeper e a regressão `shorekeeper-r6-g113-bridge.test.mjs`.
- GLB canônico SHA confere; as três bibliotecas podem ser carregadas pela File API se a sessão R2 estiver bloqueada. Nesse caso o S5 manual pode ser testado, mas **G7/S6 autônoma não** (exige comprovantes de R2 autenticado).
- Abrir preview no Samsung Internet e reproduzir 3 idles e piscada, oito candidatos R6 isoladamente, sequência cinematográfica G11.3, retorno a contemplação, restauração após recarga/context loss; verificar não sobreposição de writers no Face/Eye.
- Comparar R6 com as evidências privadas e capturas históricas, especialmente sorriso/queixo, E_Close, pupilas. Nenhum PASS sintético é validação artística.
- Permanecem `G7_NO_GO`, `APPEARANCE_PROFILE_UNVERIFIED`, `GPU_QA_PENDING`, `R2_LIVE_AUTH_PENDING`, `SAMSUNG_QA_PENDING`.

## Comparação entre as quatro rodadas e o original

O nome da receita **não** identifica sozinho a apresentação. Existem eixos independentes: (a) `MOUTH_QA_RECIPES` e pesos dos morphs, (b) duração/curva de atuação, (c) geometria de boca original/R2/R3/R4/R5, (d) câmera e materiais. Os presets não são clipes PSA com sourceFrames. Quadros distintos em vídeo podem resultar de diferenças em qualquer eixo.

A UI opt-in R6/G11.3 agora começa com **R5 reversível**, por ser o reparo mais refinado para a linha labial observado pelo autor; isso não é uma dependência matemática do compositor R6 nem uma alteração do GLB canônico. Pode-se selecionar Original, R2, R3, R4 e R5. Fora do modo R6Stage, a galeria mantém apenas os antigos Original/R4/R5.

| Fonte de expressão | Diferença demonstrável nos arquivos de receita | Geometria sugerida | Tratamento |
| --- | --- | --- | --- |
| Little Smile V2 | Baseline histórico, timing de demonstração V2 | R5 recomendada para QA; aprovação original sem perfil confirmado | preservar como V2 |
| Little Smile R2 / R3 | pesos e temporização **iguais** no código; geometria R2 versus R3 muda visual | R2/R3, respectivamente | manter ambos como estados de comparação, não novos morphs |
| My Star V2 / R2 | mesmos pesos-base; temporizações diferentes | R5 de comparação / R2 | manter ambos, identificar duração |
| My Star R3 olhos originais | E_Smile_L/R=0, distinto de R2 | R3 | manter como R3 original |
| My Star R3 olhos suaves | E_Smile_L/R=0,1, distinto do R3 anterior | R3 | manter *Afeto crescente* separado |
| Hello original | M_OpenSmall=0,4 e S_02=0,32 | Original | preservar sem chamar de Olá R2 |
| Hello R2 / R3 fechada | pesos e temporização iguais | R2/R3 | manter ambos por geometria |
| Hello R3 entreaberta | acrescenta M_OpenSmall=0,08 | R3 | variante independente |
| LOVE / HOPE | receitas diferentes, HOPE pede fechamento ocular | R5 candidata | não presumir aliases aprovados sem QA |
| Oito candidatos R6 | 5,8 s (Glance 6,8 s), pulse regional e acentos anatômicos adicionais | R5 candidata | botões manuais separados; G7 NO_GO |

O módulo `facial-variant-catalog.mjs` expõe a comparação determinística de nomes, pesos, solicitação ocular, timing e geometria sugerida. Se pesos+timing coincidem, a diferença documentada pode ser inteiramente geométrica. Não afirmar movimento canônico diferente nem fonte PSA para essas receitas quando isso não foi verificado.

**Teste:** na prévia, aba Expressões → "R6 anatômica + G11.3": selecione geometria de contorno e, independentemente, uma receita no seletor "Comparar versão da receita facial"; reproduza a receita manualmente. Repetir mesma câmera e iluminação antes de comparar. Os oito gestos R6 não são sobrescritos pelo seletor histórico.

## Palco privado da Hsin — ensaio R6/R5

A rota **já existente** `/experimentos/duo/` recebe um modo **separado**: `/experimentos/duo/?r6Guest=1`.

- A Hsin conserva seu renderer, câmera, loop e apresentação solo; a Shorekeeper permanece um guest autenticado do R2, sem segundo renderer ou RAF.
- Somente nesse modo, o guest usa `createAnatomicalFaceDirector` com geometria `createMouthR5` reversível e oferece oito expressões R6 manuais, neutro e piscada. Não são agendadas expressões R6 automaticamente, pois G7 continua NO_GO.
- A fonte das três idles e o GLB F2.0-A são imutáveis. O modo padrão sem `r6Guest=1` usa exatamente a implementação S6-D anterior.
- Se o R2 estiver incompleto, o guest **não aparece**; Hsin continua disponível, sem fallback para GLB público ou credenciais improvisadas.
- Essa rota *não* transporta os VFX cinematográficos G11.3 para a Hsin: isso exigirá integração separada e validação GPU/Android.
- Testar botão R6 manual, blink, neutro, botão pausa, movimento reduzido, troca de aba/contexto, descarte ao sair e persistência da Hsin solo.
- G7/S6 automático continua sob gate, sem declaração de aprovação.

**Rollback:** remover `r6Stage=1` do laboratório Shorekeeper ou `r6Guest=1` do palco compartilhado e recarregar. Nada exige mudança em main, nos GLBs ou no R2. QA WebGL/Samsung e acesso autenticado ainda são pendentes.
