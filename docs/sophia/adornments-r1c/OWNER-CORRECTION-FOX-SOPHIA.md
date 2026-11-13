# CORREÇÃO DE ESCOPO AUTORAL — SOPHIA RAPOSINHA (2026-11-13)

**PR:** #305 · **prioridade máxima sobre os prompts e gates anteriores**.
**Origem:** esclarecimento explícito do proprietário: **“a que quero refazer a 3D é a raposinha”**.

## Personagem-alvo

A Sophia a reconstruir/refinar em 3D nesta cadeia R1 é a **RAPOSINHA / MASCOTE CELESTIAL** do portfólio, com jaleco, caderno, pena e adornos. **NÃO** é a versão humana/antropomórfica de anime das ilustrações C1. A concepção anime é uma personagem/variante separada e não deve reger identidade, franja, rosto, proporções ou a aprovação do modelo da raposinha.

**O erro no planejamento anterior:** os documentos anteriores (inclusive `r1c-identity.md`, `source-access-preflight.md`, `claude-r1c1-live-source-prompt.md`) identificaram C1 anime como destino autoral e, por isso, bloquearam indevidamente a raposinha 6H com `IDENTITY_BLOCKED` por não ter silhueta humana ou franja anime. O relatório original da R1.C registra as medições técnicas corretas sobre a 6H, mas seu gate de identidade foi avaliado contra a **referência errada**. Não alterar retrospectivamente medições ou fingir aprovação: registrar `IDENTITY_REFERENCE_WRONG_TARGET` e reavaliar com as referências 2D corretas da raposinha.

## Quais fontes são relevantes

- **6H `sophia-alpha.glb`** — modelo 3D RIGADO da raposinha, verificado na R1.A/B; 101 joints, cinco clipes, quatro morphs, Book/Pen/jaleco/adornos recuperáveis. **Fonte funcional de trabalho e doadora**, não descartá-lo por ser raposa compacta. A qualidade artística final ainda exige revisão.
- **7B E1** — candidato 3D raposinha, textura e geometria estática (sem rig/clipes embutidos). Comparar identidade/qualidade, não pressupor superioridade cronológica ou rig completo.
- **Blendstra R4/R5/R6** — estudos posteriores da **raposinha**; R5 registrou 90 ossos/50 controles morph/13 clipes, sem aprovação final e sem evidência de source editable no próprio conector. Catalogar e comparar se os bytes estiverem acessíveis; datas sozinhas não tornam nenhum deles definitivo.
- **Sophia astronauta R3** — apresentação específica da raposinha com foguete, mas o GLB com 47 clipes é um **asset de cena/figurino próprio**. Preservar; não substituí-lo automaticamente nem usar o foguete como base da Sophia autoral.
- **`Sophia_v1.1.glb` do Tripo e `Sophia_2D_Master_RGBA.png`** — referências/arte da versão **anime antropomórfica**, fora da recuperação R1 da raposinha. Não solicitá-las como pré-requisito.
- **REFERÊNCIA VISUAL AUTORITATIVA PARA ESTA FASE:** a Sophia raposinha em `src/components/SophiaAnimation.astro`, `SophiaMascot.astro`, `SophiaLounge.astro`, SVGs/sprites correspondentes e referências de raposinha autorizadas pelo proprietário. Conferir as formas realmente exibidas no portfólio; não confundir diferentes variantes mascote.

## Gate correto: não bloquear por falta do R2

`ACCESS_BLOCKED` declarado pelo Sonnet refere-se estritamente ao R2/WebView **naquela sessão**, não à disponibilidade geral de fontes da raposinha. A 6H, 7B e os scripts/relatórios R1.A/B/C já são acessíveis pelo Git e constituem uma base verificável para **trabalho de revisão experimental local**. Se o R2/WebView estiver acessível, verificar se há raposinha 3D mais recente antes de escolher versão final; se indisponível, registrar `REMOTE_SOURCE_UNVERIFIED` e trabalhar sobre a 6H/R1.C identificada e versionada, **sem alegar que ela é a mais recente**. Não criar loop de autenticação que impeça toda a correção local.

## Replanejamento R1.C.1
1. Reabrir seleção de modelos comparando **somente raposinha 2D ↔ raposinha 3D 6H/7B/Blendstra**, com arte real, mesmas câmeras e escala. Decisão explícita BASE / DONOR / REJECT.
2. Preservar o reparo experimental de gola da R1.C, se não piorar o visual da raposinha; manter os cinco clipes originais.
3. Melhorar ou diagnosticar Write: pena/página, Book, mãos (limite geométrico de mitene), mangas, punhos e contato; e Wave/Walk: ombro, cauda/barra. Registrar antes/depois e regressões.
4. Reparar adornos **da raposinha** com geometria/rig verificados. A marca C1 anime plana sob franja **não faz parte deste contrato**. Estrelas/relevos existentes podem ser avaliados segundo a identidade visual da raposinha, sem remover automaticamente por não corresponderem a uma marca anime.
5. QA real em GLB/Blender e Three.js quando disponível, Android posteriormente. Sem remodelagem global, Tripo para humano, reesqueleto ou integração pública até aprovação.

## Proteções e entrega
Continuar no mesmo PR #305 draft, empilhado em #304, sem merge. Não modificar `main`, modelos fontes, 47 clipes astronauta, `/modo-imersivo/`, `/404`, `/curiosidades/`, Hsin, Shorekeeper, Phrolova ou políticas R2/Access. GLBs, BLENDs e vídeos privados fora do Git público.

**Novo estado:** `TARGET_IDENTITY=FOX_SOPHIA`; `OLD_C1_ANIME_IDENTITY_BLOCK=SUPERSEDED_WRONG_TARGET`; `FOX_ARTISTIC_QA=PENDING`; `WEBGL_MOBILE=PENDING`. Os relatórios técnicos R1.C são preservados como evidência histórica e não convertidos retroativamente em PASS.
