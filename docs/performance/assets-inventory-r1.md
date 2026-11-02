# Assets inventory R1 — classificação conservadora

**Conjunto:** `main@f94f10bb7def9e7163f3184ea1572d74a950ecc8`, 425 arquivos Git versionados, 64,328,927 bytes lógicos. A triagem é estática; falta cruzamento exaustivo de referências nos heads ativos, assets dinâmicos, deploy/Cloudflare e documentação externa. **Nenhum arquivo foi deletado**.

## Classes aplicadas

| Caminho ou grupo | Classe | Evidência conhecida | Ação |
|---|---|---|---|
| `public/assets/models/hsin/hsin-v2.0.glb` (9.873.744 B) | ACTIVE | `HSIN_STAGE.model` na `main` | Preservar |
| `public/assets/models/hsin/*profile.json` e `*acting.json` | ACTIVE | `hsin-stage-config.mjs` referencia perfis | Preservar |
| `public/scripts/scenes.js` (98.326 B) | ACTIVE | 10 cenários da landing em `data-scene` | Escopo de carregamento, não remoção |
| `public/experimental/sophia-alpha.glb` (20.795.692 B) | ACTIVE | `npm run check:sophia` usa este modelo; fluxo 404 ligado à Sophia | Preservar |
| `public/experimental/sophia-7b-e1-latest.glb` (17.054.692 B) | RESERVED | Modelo candidato/versão de Sophia em evolução; uso em runtime não comprovado | Preservar |
| `assets/phrolova/**`, `public/assets/phrolova/**` | RESERVED | Integração/QA paralela; sem prova de exclusão segura | Preservar |
| `src/scripts/shorekeeper/**` (nas branches da Shorekeeper) | ACTIVE no experimento / ausente na main | Branch de laboratório contém módulos privados | Não manipular na main |
| `public/assets/typing-left.webp` (1.226.156 B) | UNKNOWN | Imagem pesada; referência/duplicata ainda não demonstrada | Investigar posteriormente |
| `public/shannon-blackboard-transparent.gif` (1.166.442 B) | UNKNOWN | Animação potencialmente substituível por still, mas não confirmada | Não excluir |
| `assets/phrolova/crimson-baton-vector-draft.svg` | POSSIBLY_UNUSED | SHA idêntico à cópia em `public/assets/phrolova/crimson-baton.svg`; função de fonte vs. deploy pode exigir ambas | Não excluir |
| `public/assets/easter/aemeath-pixel-05.webp` | RESERVED | Código documenta upload truncado, fora da rotação atual; evidência insuficiente para apagar sem decisão autoral | Preservar |
| `docs/qa/**` | RESERVED | Evidência visual de regressão/aceite; não precisa ser enviada ao browser por padrão | Preservar |
| `assets/fonts/**` | UNKNOWN | Fonts podem ser consumidas por geração de imagens e estilos; ausência de pesquisa integral | Não excluir |

**CONFIRMED_UNUSED: nenhum arquivo.** O critério exige checagem completa de imports, URLs dinâmicas, CMS, branches e versões autorais, que não foi concluída. Por isso esta R1 não afirma ter feito limpeza de blobs.

## Inventário das 30 maiores entradas

| # | Path | Bytes |
|---:|---|---:|
| 1 | `public/experimental/sophia-alpha.glb` | 20,795,692 |
| 2 | `public/experimental/sophia-7b-e1-latest.glb` | 17,054,692 |
| 3 | `public/assets/models/hsin/hsin-v2.0.glb` | 9,873,744 |
| 4 | `public/shorekeeper-black-shores.png` | 1,402,157 |
| 5 | `public/assets/typing-left.webp` | 1,226,156 |
| 6 | `public/shannon-blackboard-transparent.gif` | 1,166,442 |
| 7 | `assets/phrolova/overlay-check.png` | 786,497 |
| 8 | `assets/og-portfolio.png` | 595,205 |
| 9 | `public/assets/luna-sailor-moon.webp` | 575,008 |
| 10 | `docs/qa/hsin-v201/hair-caress.webp` | 545,408 |
| 11 | `docs/qa/hsin-v201/lip-touch.webp` | 462,576 |
| 12 | `assets/about/flower-restoration.webp` | 456,974 |
| 13 | `public/assets/violet-evergarden.webp` | 447,130 |
| 14 | `docs/qa/hsin-v201/composition.webp` | 444,676 |
| 15 | `public/hsin.webp` | 430,606 |
| 16 | `public/assets/typing-right.webp` | 301,716 |
| 17 | `docs/qa/hsin-v201/face-before-after.webp` | 292,054 |
| 18 | `public/brand/avatar.webm` | 270,189 |
| 19 | `public/brand/avatar.mp4` | 233,005 |
| 20 | `public/images/sophia/method-presenter.webp` | 224,082 |
| 21 | `assets/phrolova/comparison-board.svg` | 215,866 |
| 22 | `assets/mushroom.webp` | 207,032 |
| 23 | `public/images/sophia/music-dance.webp` | 206,660 |
| 24 | `public/assets/e-se-paris.jpg` | 188,796 |
| 25 | `public/assets/models/hsin/hsin-v2.1-profile.json` | 155,033 |
| 26 | `public/images/sophia/lab-oriental.webp` | 154,614 |
| 27 | `public/assets/models/hsin/hsin-v2.0-profile.json` | 149,792 |
| 28 | `src/styles/global.css` | 140,708 |
| 29 | `package-lock.json` | 132,902 |
| 30 | `assets/fonts/Heart Breaking Bad.otf` | 132,136 |

## Prevenção de exclusão indevida

Para cada candidato futuro: consultar `rg` incluindo imports dinâmicos e strings runtime; confirmar URLs geradas; inspecionar `git log --follow`; comparar PRs ativos; testar preview e compatibilidade Android; registrar justificativa e rollback. Sem evidências, classificar UNKNOWN/RESERVED, nunca CONFIRMED_UNUSED.
