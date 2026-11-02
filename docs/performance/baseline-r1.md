# Portfolio Performance Audit R1 — baseline

**Data da inspeção:** 2026-11-02. **Fonte:** árvore GitHub, arquivos de origem, metadados de PR e execução do CI anterior. **Base congelada:** `main@f94f10bb7def9e7163f3184ea1572d74a950ecc8` (tree `0d8ea266ee8b5bbf44f5a6e63fbfd51d46f87566`). **Estado:** SOURCE_BASELINE / BROWSER_NOT_TESTED.

## Confiabilidade da baseline

A inspeção foi feita via API de GitHub, sem checkout local, browser automatizado ou Android real. `git status`, `npm ls`, `npm ci`, `npm run build`, perfis Web Vitals, rede real e memória de GPU **não foram executados nesta auditoria**. O workflow existente `Portfolio build` passou para esse commit: https://github.com/indiolibanes/portfolio/actions/runs/41491577186 . Isso é evidência de CI remoto anterior, não teste novo desta revisão.

### Referências paralelas verificadas

- `main`: `f94f10bb7def9e7163f3184ea1572d74a950ecc8`, rota `src/pages/experimentos/index.astro` (Hsin V2.0.1).
- Hsin PR #194: aberto, draft, `experiment/hsin-lunar-dance-2026-11-02@32801974d95ae458d94d72d81e874df3be4e7529`.
- Hsin PR #195: aberto, draft, sobre #194, `experiment/hsin-lunar-dance-r2-2026-11-02@dea78665d2e421475240b7f66c6911a65a690469`.
- Shorekeeper #185 e #184: fechados como mesclados em sua cadeia; #182 ainda aberto, draft. A branch de laboratório inspecionada inclui `src/pages/experimentos/sk/index.astro`, mas `main` **não** inclui essa rota.
- `main` tampouco contém `src/pages/experimentos/hsin/index.astro`. Não renomear, criar, excluir ou redirecionar rotas nesta revisão.

### Stack observada

`astro@^7.3.1` com `output:'static'`, `three@^0.186.1`, `sharp@^0.35.4`, Node `>=22.12.0`, npm com `package-lock.json`, Pages Functions em `functions/api/music`. Cloudflare Pages/Workers deve ser validado em preview real; não assumir um adapter SSR. Script `build` gera OG/stills/cutouts, constrói Astro e verifica OG. Script `check` inclui UX, APIs, jogos, música, Hsin e Sophia.

## Espaço de arquivos Git versionados

Tamanho **lógico dos blobs da árvore**: **64,328,927 bytes** (61.35 MiB) distribuídos entre **425 arquivos**; não representa tamanho do .git, build `dist/`, bytes transferidos pelo navegador, nem memória de execução. Metadado GitHub `repository.size=191019` KB não equivale ao somatório da árvore.

| Grupo | Arquivos | Bytes da árvore | MiB |
|---|---:|---:|---:|
| `other` | 57 | 384,769 | 0.37 |
| `assets` | 39 | 3,569,747 | 3.40 |
| `docs` | 44 | 1,950,211 | 1.86 |
| `public` | 97 | 56,872,684 | 54.24 |
| `src` | 146 | 1,329,057 | 1.27 |
| `tests` | 42 | 222,459 | 0.21 |
| **Total** | **425** | **64,328,927** | **61.35** |

### 30 maiores arquivos (origem, não transferência de rede)

| # | Caminho | Bytes | MiB |
|---:|---|---:|---:|
| 1 | `public/experimental/sophia-alpha.glb` | 20,795,692 | 19.83 |
| 2 | `public/experimental/sophia-7b-e1-latest.glb` | 17,054,692 | 16.26 |
| 3 | `public/assets/models/hsin/hsin-v2.0.glb` | 9,873,744 | 9.42 |
| 4 | `public/shorekeeper-black-shores.png` | 1,402,157 | 1.34 |
| 5 | `public/assets/typing-left.webp` | 1,226,156 | 1.17 |
| 6 | `public/shannon-blackboard-transparent.gif` | 1,166,442 | 1.11 |
| 7 | `assets/phrolova/overlay-check.png` | 786,497 | 0.75 |
| 8 | `assets/og-portfolio.png` | 595,205 | 0.57 |
| 9 | `public/assets/luna-sailor-moon.webp` | 575,008 | 0.55 |
| 10 | `docs/qa/hsin-v201/hair-caress.webp` | 545,408 | 0.52 |
| 11 | `docs/qa/hsin-v201/lip-touch.webp` | 462,576 | 0.44 |
| 12 | `assets/about/flower-restoration.webp` | 456,974 | 0.44 |
| 13 | `public/assets/violet-evergarden.webp` | 447,130 | 0.43 |
| 14 | `docs/qa/hsin-v201/composition.webp` | 444,676 | 0.42 |
| 15 | `public/hsin.webp` | 430,606 | 0.41 |
| 16 | `public/assets/typing-right.webp` | 301,716 | 0.29 |
| 17 | `docs/qa/hsin-v201/face-before-after.webp` | 292,054 | 0.28 |
| 18 | `public/brand/avatar.webm` | 270,189 | 0.26 |
| 19 | `public/brand/avatar.mp4` | 233,005 | 0.22 |
| 20 | `public/images/sophia/method-presenter.webp` | 224,082 | 0.21 |
| 21 | `assets/phrolova/comparison-board.svg` | 215,866 | 0.21 |
| 22 | `assets/mushroom.webp` | 207,032 | 0.20 |
| 23 | `public/images/sophia/music-dance.webp` | 206,660 | 0.20 |
| 24 | `public/assets/e-se-paris.jpg` | 188,796 | 0.18 |
| 25 | `public/assets/models/hsin/hsin-v2.1-profile.json` | 155,033 | 0.15 |
| 26 | `public/images/sophia/lab-oriental.webp` | 154,614 | 0.15 |
| 27 | `public/assets/models/hsin/hsin-v2.0-profile.json` | 149,792 | 0.14 |
| 28 | `src/styles/global.css` | 140,708 | 0.13 |
| 29 | `package-lock.json` | 132,902 | 0.13 |
| 30 | `assets/fonts/Heart Breaking Bad.otf` | 132,136 | 0.13 |

## Baseline de carregamento verificável por fonte

- `public/scripts/scenes.js`: **98.326 bytes** não comprimidos. É referenciado pelo `BaseHead.astro` comum às páginas `/`, `/curiosidades/`, `/sophia/` e ao fallback 404, mas seus `data-scene` estão somente em `src/pages/index.astro`.
- `public/scripts/reveal.js`: **5.823 bytes**; permanece compartilhado até auditar efeitos de revelação em cada rota.
- `src/scripts/hsin-stage-config.mjs`: `fps:30`, `mobileDpr:1`, `desktopDpr:1.25`, `maxPixels:1152000`. São **limites estáticos**, não prova de controle de DPR baseado em frametime.
- `src/scripts/hsin-stage-loop.mjs`: um scheduler de rAF com invalidation e visibilidade, por inspeção do código isolado. A unicidade end-to-end do loop e o cleanup de todos os recursos exigem teste em browser.
- `src/scripts/hsin-stage-metrics.mjs`: instrumentação sob `?hsin-metrics`, desligada por padrão, que mede CPU e `renderer.info`, não memória de VRAM.

## Medições de navegador ainda necessárias

`LCP`, `INP`, `CLS`, `TTFB`, bytes comprimidos/transferred, requests, JS heap, WebGL GPU, boot do GLB, p50/p95 dos frames, draw calls e recuperação de contexto: **NOT_TESTED**. Registrar baseline fria/quente antes de alegar ganhos de produção.
