# SOPHIA R1.B → R1.C — relatório de procedência (preflight verificado)

**Data:** 2026-11-13 · **Branch:** `planning/sophia-adornments-recovery-r1-20261113` (PR #303, draft) · **Modelo/esforço:** Claude Sonnet 5.5, alto.
**Não houve merge, deploy, alteração de modelo, rig, morphs, clipes, rotas públicas, modo imersivo, 2D, Tetris 404 ou outros personagens.** Esta branch só acrescenta documentos, evidências, scripts de leitura, um teste de contrato (`tests/sophia-adornments-source-lock.test.mjs`) e uma entrada no `check:sophia`.

## Veredito em uma linha

O **piloto do Work não está disponível** (`SOURCE_UNAVAILABLE`), então a implementação geométrica foi interrompida, como o contrato manda. Mesmo assim, o GLB **real** `public/experimental/sophia-alpha.glb` está no repositório e foi auditado por inteiro, de forma independente: isso verifica as afirmações centrais do relato do Work, e também levanta três problemas que o relato não trazia.

## Status por gate

| Gate | Status | Base |
|---|---|---|
| Piloto/exportação do Work | **`SOURCE_UNAVAILABLE`** | Não existe em branches, PRs, artefatos do Actions, container ou R2 acessível (ver "O que foi procurado") |
| `SOURCE_VERIFIED` (alpha ≡ 6H) | **VERIFICADO** | SHA-256 recalculado de `sophia-alpha.glb` = `3b0e7db8…3a2a`, igual ao hash da candidata 6H registrado em `docs/archive/sophia6h/` (relatório e `Verdict.json`). O binário arquivado da 6H não está aqui: a comparação é com o hash preservado, não byte a byte |
| `BOOK_RECOVERED` | **VERIFICADO NA FONTE** (nada exportado) | Nó `Book` independente, 5 primitivas, 224 triângulos, UV e materiais próprios |
| `PEN_RECOVERED` | **VERIFICADO NA FONTE** (nada exportado) | Nó `Pen` independente, 2 primitivas, 2.936 triângulos |
| `SOCKETS_VALIDATED` | **PARCIAL** | Os pontos de fixação existem como nós filhos de `hand_L`/`hand_R`. **Não há nós `Socket_*` no GLB**: os nomes são aliases propostos em `evidence/sockets.json` e nada foi criado |
| `WRITE_CONTACT` | **PENDING** | Ponta e caderno passam numericamente; empunhadura e punho não (ver seção 4) |
| `STAR_IDENTITY` | **`STAR_IDENTITY_PENDING`** | Nenhuma solução verificável (seção 5) |
| `BODY_AND_RIG_UNCHANGED` | **CONFIRMADO** | Diferença desta branch contra `main`: só `docs/`, `scripts/sophia/`, um teste e a linha do `check:sophia` no `package.json`; os dois GLBs mantêm o hash (conferido por `tests/sophia-adornments-source-lock.test.mjs`) |
| `VISUAL_QA` | **PENDING** | Capturas reais obtidas; aprovação artística do proprietário não existe |

## 1. O que foi procurado (e não achado)

- Branches remotos (`sophia|adorn|work|pilot|r1`): só esta branch de planejamento.
- PRs recentes (#292–#303): nenhum traz o piloto; o #303 tem **exatamente os documentos**.
- Artefatos do GitHub Actions: só os da campanha Hsin; nenhum de Sophia/adornos.
- Container: nenhum `sockets.json`, `model-inventory.json`, `mesh-provenance.csv`, `collision-matrix.csv` nem GLB do piloto.
- R2 (`private-assets`, pasta `private-access`): **inalcançável daqui**, sem rede para a Cloudflare e sem credenciais do bucket. O R2 guarda o GLB do astronauta (`/api/sophia/rocket`), que é só referência e não foi tocado.

**Arquivos a pedir ao Work** (contrato em `handoff-artifacts-required.md`): `manifest.json`, `model-inventory.json`, `mesh-provenance.csv`, `collision-matrix.csv` (as 255 poses), `source-comparison.json`, `source-match-report.md`, `pilot/` (GLB/Blender com SHA-256), `renders/`, `go-no-go.md`, mais o **script que gerou as 255 poses**. Do proprietário: a **imagem canônica C1** da estrela (não está no repositório). Opcional: `Sophia_6H_Auditoria.zip`.

## 2. Procedência do GLB real (resumo; completo em `evidence/alpha-6h-census.json`)

| Item | Medido | Relatório 6H |
|---|---|---|
| Tamanho / SHA-256 | 20.795.692 B / `3b0e7db8…3a2a` | idêntico |
| Primitivas / triângulos | 286 (279 corpo + 5 Book + 2 Pen) / 291.306 | 286 / 291.306 ✔ |
| Juntas / IBM | 101 / 101 | 101 ✔ |
| Clipes | Idle 4 s, Write 3,2 s, Point 2,4 s, Wave 2,4 s, Walk 1 s | mesmos 5 ✔ |
| Morphs | 4 (Blink, Smile, BrowRaise, MouthOpen) em todas as 279 primitivas do corpo | ✔ |
| Pesos de pele | 0 anomalias (soma ≠ 1, índice fora da faixa) | — |
| Metadados internos | `phase6h.base_sha256` = hash da 6G registrado no relatório | ✔ |
| Materiais / imagens | 28 / 6 (coat e lining 2048², cover 512²) | — |

O `sophia-7b-e1-latest.glb` (`b0f2c2e9…c53a`) é **uma única malha Tripo de 501.780 triângulos, sem pele e sem animação**: não serve de fonte de adornos.

## 3. Book e Pen

- `Book` é filho direto de `hand_L` e `Pen` de `hand_R` (cadeia completa até `root`), sem pele, com TRS local **animado em todos os clipes** (Write tem 97 chaves).
- O caderno traz cover, navybook, pages e dois ouros; só `Sophia_gold` é compartilhado com o corpo (72 primitivas). A pena compartilha `Sophia_gem` (8). Extrair exige **copiar esses materiais**.
- Ponta da pena: vértice local (0,47; −100,3; 0) mm, escala do nó 0,75.

**Aviso de bind (achado novo):** em 89 das 101 juntas o bind coincide com o repouso dos nós; nas **12 juntas dos dois braços** (clavícula até polegar) **não coincide** (desvio até 1,39). Como a pele usa as matrizes de bind, o corpo se deforma certo sob qualquer clipe, mas qualquer exibição "em repouso dos nós" desalinha braços e props. **O harness sempre toca um clipe.** O relatório 6H diz que nós, skins e IBM são herdados da 6G.

## 4. Contato do Write (reprodução independente, estrutural)

Triângulo×triângulo (SAT) sobre a pele amostrada: 49 instantes do Write e 5–7 de cada outro clipe (**73 poses, não as 255 do Work**: o script delas não está disponível).

| Medida (Write, 49 amostras) | Resultado | Relatório 6H |
|---|---|---|
| Ponta da pena → superfície do caderno | **0,66–0,72 mm** | 0,67–0,74 mm ✔ |
| Pena × caderno | **0** pares | 0 ✔ |
| Mãos × caderno | **0** pares | 0 ✔ |
| Mãos × pena | 134 pares (em 49/49) | ~300 ("empunhadura": ✔ não nulo) |
| Vestuário × caderno | 78 pares (49/49) | ~23 (subconjunto de "mangas"; **não comparável**) |
| Vestuário × pena | 490 pares (49/49) | não relatado |

Fora do Write, o caderno cruza as mãos e o vestuário em todas as poses (até 96 e 2.610 pares), como o 6H já registrava ("herdados da 6G"). Os números acima medem **cruzamentos amostrados**, não contato contínuo nem estética.

**Leitura visual** (capturas, `Write` t=1,0 s): com o caderno oculto, a pena aparece com a ponta para baixo, saindo da frente da luva da mão direita, onde a página estaria; **a mão é uma luva sem dedos** e a pena a atravessa em vez de ser empunhada. O punho da manga aparece como um cilindro aberto afastado da luva (a manga termina 20 mm antes do pulso). Isso concorda com os pares mão×pena e vestuário×pena. **Conclusão: `WRITE_CONTACT_PENDING`**: ponta/página e mãos×caderno passam; empunhadura e punho não.

## 5. Estrela — `STAR_IDENTITY_PENDING`

O que a 6H realmente tem: três primitivas de ouro **sólido e elevado**, presas à cabeça, 288 triângulos cada, **sem UV**, com os 4 morphs: prim 9 (≈16×21×16 mm, topo), **prim 10 (≈62×89×32 mm, principal)** e prim 11 (≈11×16×5 mm). Em vista ¾ é nítido: uma estrela comprida central com uma faísca acima e uma estrelinha abaixo, em relevo. **Não é a marca plana, pequena e parcialmente coberta pela franja da C1.**

Por que nenhuma solução ficou verificável:

1. **Textura na pele: impossível sem mexer no corpo.** A malha do crânio (prim 274, 32.688 triângulos) não tem UV nem textura; a cor vem de `COLOR_0` (os 16.417 vértices têm cor não branca). Criar UV altera a geometria do corpo, proibido aqui.
2. **Cor por vértice: resolução insuficiente.** Em 35 mm ao redor da estrela principal há 165 vértices, aresta mediana **6,5 mm** (p10 3,7 mm). Uma marca "pequena" ficaria serrilhada, e editar `COLOR_0` também altera o corpo.
3. **Franja inexistente na 6H.** Raios em x=0 e ±15 mm, de y=630 a 730 mm: nenhuma malha de cabelo (prims 275, 278) fica à frente da pele; só as estrelas e o crânio. **Não há franja para cobrir a marca**, e adicionar uma é mexer na identidade.
4. **Referência C1 ausente.** A imagem canônica não está no repositório. O retrato 2D atual (`src/sophia-portrait.ts`) desenha **três estrelas** (uma grande com brilho e duas pequenas) **por cima dos cachos**, o que contraria a descrição C1 do proprietário. **Decisão do proprietário necessária** sobre qual é canônica.

Caminho mais promissor (não verificado): uma **decalque achatado e aditivo**, ~0,4 mm acima da pele, preso a `head` (o próprio GLB registra `decal_offset_mm: 0.4` em fases anteriores). Só cobre a C1 se houver franja por cima, o que exige geometria nova de cabelo. Fica registrado, não implementado.

## 6. Jaleco (auditoria, sem remodelar) — ver matriz

Resumo: casca única de **8.224 vértices / 13.466 triângulos** (prim 4) com forro duplicado (prim 5), UV íntegra (nada fora do quadrado unitário, nenhum triângulo degenerado, ilhas espelhadas), texturas 2048². Pesos suaves na gola (390 vértices, 0 rígidos) e na barra (350, 0 rígidos). **Ombro: 50% dos vértices de manga presos a uma só junta e 0% de peso na clavícula** (risco com braço erguido, ex. Wave). **Cotovelo: transição de ~55 mm** centrada no cotovelo, 21% rígidos. Manga termina 20 mm antes do pulso, 97 vértices rígidos no punho.

## 7. Capturas renderizadas (renderer WebGL2 do próprio site, GLB skinnado, clipes originais)

Gerador local, fora de qualquer rota: `scripts/sophia/qa/` (harness + driver Playwright). Alterna Book/Pen. Chromium com **SwiftShader (CPU)**: **não é GPU real, nem Samsung Internet**. Console limpo. As PNGs **não foram comitadas** (o repositório já removeu capturas históricas) e foram enviadas ao proprietário; regenere com o comando em `evidence/README.md`.

## 8. Regressões — o que rodou

| Verificação | Resultado |
|---|---|
| `check-sophia-7b`, `test-sophia-morph-runtime` (alpha, 5 clipes) | passam |
| `node --test` Sophia (public-r2, timeline, immersive-r3, audio, omega-supernova, r3-polish, source-lock novo) | **49/49** |
| `check-ux-contract`, `orbital-menu-contract` | 100/100 e 4/4 |
| `check-seo`, `sophia-404-device-gate`, `performance-route-isolation`, `shorekeeper-private-r2`, `build-hygiene` | passam |
| `sophia-launch-cradle`, `sophia-launch-director` | **não rodam**: exigem o pacote `three` (sem rede para o npm) |
| `npm run build`, Khronos glTF-Validator, Lighthouse, Android/Samsung | **não executados** |

Tudo acima é **verificação estrutural**. **Nada aqui é aprovação artística**: ela depende da sua inspeção visual.

## 9. Próximo passo seguro

1. Obter o pacote do Work (lista na seção 1) e a imagem C1; só então refazer a fase 0 contra o piloto real (`scripts/sophia/adornments-audit.mjs` já aceita outro GLB).
2. Decidir a estrela (seção 5).
3. Só depois: harness no site, jaleco, `/404`, `/curiosidades/`.
