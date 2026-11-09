# Shorekeeper F1.4 — Reconhecimento visual (P3)

**Escopo:** descrição textual sanitizada. Nenhuma imagem, vídeo, nome de arquivo privado ou URL entra no repositório; os arquivos são identificados apenas por prefixo de SHA-256 (16 hex) e pelo índice de quadro exportado (`exported_N`, **não** é timecode).
**Regra:** semelhança visual não identifica habilidade. As quatro classes abaixo ficam separadas e nenhuma linha promove a seguinte.

| Classe | Significado | Estado nesta etapa |
|---|---|---|
| `OBSERVED` | o que o quadro mostra | preenchido para os 23 quadros recebidos |
| `INFERRED` | habilidade/estágio provável, com alternativas | hipóteses explícitas; nenhuma aceita |
| `VERIFIED_SOURCE` | clipe/origem/hash tecnicamente verificado contra o vídeo | **nenhum** (os vídeos de gameplay não têm procedência verificável aqui) |
| `MOTION_MATCHED` | trajetória/corpo/timing confirmados em vídeo contínuo + GLB skinnado | **nenhum** (só quadros isolados) |

## 1. Fontes pedidas e `SOURCE_UNAVAILABLE`

As dez imagens nomeadas na tarefa (`201995`, `201990`, `201997`, `201991`, `201992`, `201986`, `201999`, `201978`, `201996`, `201988`) **não chegaram** ao workspace: o ZIP recebido contém quadros exportados com outros nomes. Portanto:

- todas as dez linhas de `reference-matrix.md` permanecem `SOURCE_UNAVAILABLE` (a matriz continua sendo uma hipótese de pareamento, não uma prova);
- nenhum pareamento `lab × referência` foi promovido;
- para fechar P3 de verdade é preciso entregar por canal privado as dez imagens (ou os vídeos de origem com timecode) e conferir SHA-256.

## 2. O que o ZIP realmente trouxe (23 quadros + 1 gravação de tela)

### 2.1 Referência de gameplay/cinemática de terceiros (procedência não verificada)

| exported_N | sha256[:16] | OBSERVED | INFERRED (não aceito) |
|---|---|---|---|
| 2627 | `9f99250d3fec14e3` | close frontal: capuz, cabelo azul, mão aberta com **uma borboleta ciano luminosa acima dos dedos**; rosto totalmente visível; asa inteira legível, sem corte por cabelo/cabeça | borboleta de gatilho/intro; alternativas: Chaos Theory, Enlightenment |
| 69566 | `92b1aeda6bd67f0d` | mesmo tipo de composição (outro vídeo): borboleta ciano pequena sobre os dedos, fundo escuro | idem |
| 7499 / 7968 | `73eb04b2b0618187` / `9618045c183a1b06` | luz intensa concentrada nas mãos junto ao peito; rosto iluminado de baixo | mãos em concha (B1) — **não** comprovado como pose sustentada |
| 2793 | `f27b6fde9d1122cf` | recorte fechado com feixes verticais de luz branco-azulada; sem rosto | ambíguo |
| 3153 | `32212972199ed733` | personagem de costas, braço erguido, sob **abóbada de anéis de luz** com gradiente azul → violeta → magenta/rosa no horizonte | apresentação do Stellarealm; **cor não prova estágio** |
| 9303 / 9335 | `815f9e19180f575b` / `2154246b6d10d5fc` | explosão radial branco-azulada com franjas violeta/rosa, sem personagem | ruptura/transição; alternativas não resolvidas |
| 9653 / 9983 | `ac5649c07fa141b6` / `d6337677ef35688e` | cena de mundo com vegetação em primeiro plano, marcadores amarelos pequenos e céu azul-violeta | Stellarealm visto de fora/transição |
| 10520 / 11376 / 13969 / 19222 / 23982 | `1c0e41db05994f43` / `bb945f95a16ed13a` / `1f8481f64a35095a` / `703e44e6ab5d4f4a` / `a3509908ebb152da` | gameplay em praça nevada com HUD; fitas azul-violeta, anéis magenta/rosa com núcleo escuro (11376, 23982), borboletas brancas pequenas (13969, 19222) | ataques/skill/Heavy; sem sequência contínua é impossível classificar |

### 2.2 Gravação de tela do laboratório F3 (próprio projeto)

Um MP4 (`a8e861d803b99213`) e oito quadros exportados. `OBSERVED`:

- 6646 / 11928 / 15977 (`bbcdb9473c73e719`, `70840efbdf3e5cda`, `22ddcb1a2f6bba53`): fitas de ataque azul-violeta e anéis em torno do corpo;
- 18057 (`9497f51e7b141ef4`): esfera escura com anel violeta/branco (Heavy);
- 22937 (`313643e8364d44ad`): duas borboletas brancas pequenas;
- **26377 / 28047 (`fca7419d61258488`, `7e7bb5f095614d97`): a borboleta luminosa do gatilho, vista com a câmera atrás da personagem, tem parte da asa encoberta pelo cabelo/cabeça — é o defeito P0;**
- 29589 (`1f229f1f973c2d40`): Stellarealm em azul-branco puro, **sem** violeta/dourado.

## 3. Diferenças observadas que orientaram a F1.4

1. **Borboleta:** na referência a asa nunca é cortada por cabelo/cabeça (câmera frontal, borboleta junto à mão, rosto visível). No laboratório, com a câmera atrás/lateral, a asa some. → P0 (causa medida em `f14-implementation-report.md`).
2. **Cromatismo:** a referência mostra gradiente azul → violeta → rosa/magenta e brilho branco; o perfil FIDELIDADE do laboratório é azul-branco puro por decisão editorial da F1/F2. → P1 `STUDY_COLOR` (apenas estudo; não altera FIDELIDADE nem ARTÍSTICO).
3. **Duração:** os quadros não permitem medir tempo; nenhuma duração canônica foi inferida. O hold de 15–25 s é exposição (`EXPOSITION_HOLD_NOT_CANONICAL_DURATION`).

## 4. Limites honestos

- Quadros isolados não medem trajetória, impacto, tempo nem movimento de ossos.
- O índice `exported_N` não é timecode nem número de quadro do vídeo original.
- Nada aqui verifica fonte, identidade de habilidade ou fidelidade canônica: `CANONICAL_PENDING`, `G7_NO_GO`.
