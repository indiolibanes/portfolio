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

**Rollback:** remover `r6Stage=1` da URL e recarregar; G11.3 original e R6 QA histórico permanecem acessíveis. Não altera main, GLB, R2 ou Hsin.
