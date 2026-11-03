# Branches e PRs — S1

**Data:** 2026-11-03. **Base congelada:** `95e78e82c29bac57707469440f6806979fcdc94f`. **Estado global: PARTIAL.**

## Operações realizadas

23 PRs estavam abertos no primeiro snapshot. Cinco foram encerrados, deixando 18 antes da criação do PR S1. #179/#180/#181: heads são ancestrais da base, zero commits exclusivos. #142: proposta OG substituída por #143/#174 e incompatível com a fonte canônica atual. #207: proposta de entrega pública opcional substituída por #222; código não mesclado continua preservado. Cada encerramento recebeu comentário sucinto. Não houve merge.

Nenhuma branch foi excluída. A revisão automática bloqueou a tentativa de excluir `perf/portfolio-audit-r1-2026-11-02`, pois não considerou estabelecidas as condições de abandono, preservação integral e ausência de dependências. A API de branches informa ausência de proteção, mas os consumidores de previews não foram verificáveis. A eliminação continua pendente; não foi tentado bypass. O conector também não oferece operação de exclusão de refs. A autorização condicional do usuário não foi tratada como prova dessas condições.

A = preservar (main, trabalho ativo ou patrimônio de personagens). B? = candidato incorporado, pendente de confirmação de consumidores externos e execução. C = revisão (trabalho exclusivo ou finalidade não resolvida). Não é lista de exclusão automática. PR fechado/mesclado, por si só, não autoriza apagar branch. QA branches com histórias independentes preservam evidências e ainda são alvo dos workflows anteriores ao merge deste PR.

## Matriz integral das 50 branches-base

`Excl.` = commits de `main..head`; `Novos` = paths presentes no head e ausentes em main, não necessariamente úteis; `Diff` = paths alterados desde merge-base (ou diferença de árvores para história independente). Datas são a maior entre commit e atualização dos PRs consultados; não incluem acessos de previews. Proteção: `false` para as 50 branches no snapshot. PRs sem associação são indicados por —.

| Branch | Head SHA | Atividade UTC | Excl. | Novos / Diff | PRs | Base de abertos | Classe |
|---|---|---|---:|---:|---|---|---|
| `chore/site-audit-cleanup-2026-11-02` | `a5dce8cf59c55e86cdfe8ddac5657af6e3ecb496` | 2026-11-02T10:59:49Z | 3 | 20 / 4874 | #176 (fechado) | — | C |
| `content/music-hsin-stage-2026-11-02` | `c5b5ca6c9dc8aa0f12e6512c57be2a6ff3958f61` | 2026-11-02T07:06:02Z | 7 | 4886 / 5 | #173 (fechado) | — | C |
| `design/music-effects-og-20261012` | `019dde451387e13d02b704a627d91d6480b8e92b` | 2026-10-13T01:42:24Z | 0 | 4807 / 0 | #42 (fechado) | — | B? |
| `design/og-authorial-refresh-20261031` | `e8b40d7e21cb236225212eace7d949ecadf786a1` | 2026-11-03T22:21:19Z | 8 | 4886 / 8 | #142 (fechado) | — | C |
| `docs/resume-academic-languages-2026-10` | `8f65ffe5588839bfce168973475d1e382047680b` | 2026-10-10T16:06:07Z | 1 | 8 / 1 | #21 (fechado) | — | C |
| `docs/update-resume-2026-10` | `cc7d213c61f4fa2524f2884f0e0fb97eb8596e4f` | 2026-10-10T15:30:01Z | 1 | 8 / 1 | #19 (fechado) | — | C |
| `experiment/hsin-3d-motion` | `af3fcdc14487c3d19b2297bdaf4bdb7f5717bbf5` | 2026-11-01T11:52:18-04:00 | 0 | 4890 / 0 | — | — | A |
| `experiment/hsin-lunar-dance-r3-2026-11-02` | `4c66001fc4d66f3d9436ba376c7032a6bba41e71` | 2026-11-02T20:26:35Z | 0 | 10 / 0 | #198 (fechado) | — | A |
| `experiment/hsin-v21-cinematic-idle-2026-11-01` | `4916630e92a78a11e81dbdf6217a8b7ec04d8c83` | 2026-11-02T06:27:02Z | 10 | 4925 / 57 | #170 | — | A |
| `experiment/hsin-v201-anatomical-acting-2026-11-02` | `219cc4f0a4b5310bee95ccf3e5aeab5e231d70b2` | 2026-11-03T22:19:54Z | 0 | 10 / 0 | #179 (fechado) | — | B? |
| `experiment/hsin-v201-arm-silhouette-2026-11-02` | `354ef41da1de991d77db6fd53f2bf7996804824d` | 2026-11-02T15:59:14Z | 2 | 23 / 15 | #187 | #188 | A |
| `experiment/hsin-v201-cinematic-polish-2026-11-02` | `4dbb79052d351a637b87657343cd02b22a8d58c4` | 2026-11-03T22:19:57Z | 0 | 10 / 0 | #180 (fechado) | — | B? |
| `experiment/hsin-v201-facial-fidelity-2026-11-02` | `e6eea5bb83f0a70a6d57b78ac9c83dd971ea7fcd` | 2026-11-02T16:14:12Z | 0 | 10 / 0 | #178 (fechado) | — | B? |
| `experiment/lunar-fox-cameo-2026-11-01` | `e5d3ac396e02be02cf128385860ff1ff8a90f226` | 2026-11-01T21:00:33-04:00 | 1 | 4892 / 5 | — | — | C |
| `experiment/shorekeeper-cl1-root-orientation-20261103` | `28653eba0138f5ff3e3eccc3c1f15bf84cf97c91` | 2026-11-03T20:45:57Z | 109 | 68 / 76 | #215 | #223 | A |
| `experiment/shorekeeper-cl12-facial-qa-canonical-glb-20261103` | `c129f5374f9581290c3a072d636d694b192c5486` | 2026-11-03T20:52:17Z | 123 | 72 / 80 | #223 | — | A |
| `experiment/shorekeeper-f15-private-runtime-2026-11-02` | `0c6e4a0007df7ed50b7bc33104083c2ed8164412` | 2026-11-03T14:00:39Z | 39 | 35 / 37 | #182 | #201 | A |
| `experiment/shorekeeper-f20a-original-idles-20261102` | `1341b0526e2d54ece01902ef3900f25a0c2eac91` | 2026-11-03T00:15:33Z | 35 | 32 / 33 | #199 (fechado) | — | C |
| `experiment/shorekeeper-f20b1-my-star-butterflies-20261103` | `707b244657eeb8e80cc7e536cc4034e4b9de940c` | 2026-11-03T13:59:30Z | 46 | 36 / 39 | #201 | #202 | A |
| `experiment/shorekeeper-f20b2-expression-library` | `38a55c54226355ac70cac37c34c209f1261373b4` | 2026-11-03T02:19:24Z | 48 | 38 / 43 | #202 | #203 | A |
| `experiment/shorekeeper-f20b3-clean-60fps-facial-audit-20261103` | `f8913109971a55143e761f7e3a1f7f11cbae73b8` | 2026-11-03T18:03:02Z | 77 | 57 / 63 | #203 | #211, #205 | A |
| `experiment/shorekeeper-f21c3-advanced-combat-20261103` | `86c1a015dba1bf1691fe4343b4f044dac18f6976` | 2026-11-03T16:28:41Z | 84 | 62 / 69 | #213 | #214 | A |
| `experiment/shorekeeper-f21c4-burst-liberation-20261103` | `452f35c4b0b2f022a01b76f6579a2c7fec0aa406` | 2026-11-03T16:44:54Z | 91 | 65 / 72 | #214 | #215 | A |
| `experiment/shorekeeper-f21c-combat-recovery-20261103` | `e339ea19788fee80ec8cf8ba2174aa9fda99eb28` | 2026-11-03T14:52:50Z | 75 | 57 / 64 | #211 | #212 | A |
| `experiment/shorekeeper-f21c-presentation-20261103` | `58c7e7b1b6af4e18883f0400653370c0f590ec6b` | 2026-11-03T16:11:19Z | 77 | 59 / 66 | #212 | #213 | A |
| `experiment/shorekeeper-f21c-source-gate` | `2126e8d1bd21574cd8b9021793eb7ff7616941a8` | 2026-11-03T13:59:54Z | 56 | 44 / 49 | #205 | — | A |
| `experiment/shorekeeper-f21f1-facial-runtime` | `251821f4157f921f575784c3cca5390fe5742074` | 2026-11-03T18:02:24Z | 76 | 57 / 63 | #216 (fechado) | — | C |
| `experiment/shorekeeper-vfx-r1-20261103` | `c454fc9a40fba5fc5c6ad1680a286fe0e4059198` | 2026-11-03T20:28:49Z | 1 | 19 / 12 | #219 | — | A |
| `feature/awari-behance-case-study` | `9965da2a8018ef986dfd32d42dd5f245a32bf530` | 2026-10-08T00:15:21Z | 2 | 2 / 2 | #12 (fechado) | — | C |
| `feature/hsin-soundtrack-compact-dock-2026-11-02` | `595a922f1899ed9b0ae989257dd412feba501b62` | 2026-11-02T16:06:12Z | 9 | 10 / 10 | #186 | — | A |
| `feature/shorekeeper-public-lab-vfx-prep-20261103` | `43feec681c52c8d267d656ed79c2bac97695079e` | 2026-11-03T18:59:35Z | 3 | 13 / 22 | #218 (fechado) | — | C |
| `feature/shorekeeper-r2-model-asset-20261103` | `a392fb2b0c22e9f44508363349d48a4b6a0d9def` | 2026-11-03T22:21:17Z | 70 | 46 / 51 | #207 (fechado) | — | C |
| `fix/portfolio-mode-contrast` | `664f5827e05a02aa864da36b536f6bb4f5900433` | 2026-10-12T19:50:36Z | 0 | 8 / 0 | #23 (fechado) | — | B? |
| `fix/publish-hsin-v201-transition-2026-11-02` | `f11edcb1e92dfc1fedc8f58e42cf13d6c09da110` | 2026-11-02T10:35:27Z | 3 | 4886 / 27 | #175 (fechado) | — | C |
| `fix/shorekeeper-r2-publisher-validation-20261103` | `49519040d1e2829deb95697420d34b8b84e38bb6` | 2026-11-03T20:55:27Z | 2 | 0 / 6 | #224 | — | A |
| `fix/workers-og-build-2026-11-02` | `125b3a375d9511795603545d4cb10d23e84cc32b` | 2026-11-02T10:14:27Z | 1 | 4886 / 2 | #174 (fechado) | — | C |
| `indiolibanes-patch-1` | `7c893a2380c65ef65fe84b4267b6ee484a74e828` | 2026-09-18T15:50:48-04:00 | 1 | 0 / 1 | — | — | C |
| `main` | `95e78e82c29bac57707469440f6806979fcdc94f` | 2026-11-03T16:49:51-04:00 | 0 | 0 / 0 | #87 (fechado) | #224, #220, #219, #186, #182, #170 | A |
| `percurso-awari` | `a36f868083ea39a0768adb39192563d20dad9e44` | 2026-10-07T23:55:57Z | 10 | 2 / 6 | #11 (fechado) | — | C |
| `perf/portfolio-audit-r1-2026-11-02` | `b16c6aa59ff76f37b8f6a0794780240f3f2faced` | 2026-11-02T19:38:53Z | 0 | 10 / 0 | #196 (fechado) | — | B? |
| `qa-results/hsin-dance-r3-bake` | `80e3650560434f72e6aa4cc7ec5b87520d1c43c9` | 2026-11-02T20:20:44Z | 1 | 15 / 532 | — | — | A |
| `qa-results/hsin-dance-r3-compare` | `0ab98dd1177ce4f89ffc0c4dcda61e8ccbb89ca1` | 2026-11-02T20:21:33Z | 1 | 9 / 529 | — | — | A |
| `qa-results/hsin-dance-r3-sheets` | `ea495e9c2f1c7bfc08c77aa0c54d973410c46a73` | 2026-11-02T20:21:44Z | 1 | 9 / 529 | — | — | A |
| `qa-results/hsin-dance-r3-video` | `4ce602ee15b5ff2d1a516e8a2e58839119759824` | 2026-11-02T20:23:33Z | 1 | 10 / 530 | — | — | A |
| `qa-results/hsin-visual` | `767dbbabca793a1047dcbe498b086806f4ce4dbe` | 2026-11-02T16:16:13Z | 1 | 53 / 579 | — | — | A |
| `refactor/character-public-assets-r2-inventory-20261103` | `67f88ad19524bca42497272fc5fe13237b3603a4` | 2026-11-03T20:04:15Z | 38 | 45 / 105 | #220 | — | A |
| `refactor/experimentos-hsin-canonical-2026-11-02` | `148d226a00ca0ed0f98c1bbe2c33f7aabd5c8598` | 2026-11-02T11:39:19Z | 11 | 10 / 24 | #177 (fechado) | — | C |
| `revert-8-fix/music-sophia-arms-side-hop` | `446d599b72a57c1c43b475f188de84c42f9517da` | 2026-10-06T20:53:17Z | 1 | 2 / 2 | #10 (fechado) | — | C |
| `review/hsin-v201-metrics-fix-2026-11-02` | `ebcb243ff7aba8ffeb16a82200cb4bb8dd0c3422` | 2026-11-03T22:19:59Z | 0 | 10 / 0 | #181 (fechado) | #187 | A |
| `review/hsin-v201-silhouette-qa-hardening-2026-11-02` | `cd024d3426b44f4c0389505e313ec48441008fbb` | 2026-11-02T16:00:01Z | 8 | 26 / 18 | #188 | — | A |

## Evidência sobre arquivos exclusivos

Os heads das branches históricas podem conter milhares de paths de QA que foram removidos de main por commits posteriores. Isso não constitui trabalho perdido nem prova de que os commits possam ser apagados. O inventário da matriz foi calculado por `git ls-tree` de cada head e diferença de conjuntos com a árvore-base. Nenhuma branch C foi deletada.

- `chore/site-audit-cleanup-2026-11-02`: 20 paths exclusivos; amostra: `public/assets/music-hsin-stage-2026-11-02.avif`, `public/assets/phrolova-baton-bow.webp`, `public/assets/phrolova/crimson-baton.svg`.
- `content/music-hsin-stage-2026-11-02`: 4886 paths exclusivos; amostra: `.github/workflows/audit-sophia-assets.yml`, `.github/workflows/portfolio-browser-qa.yml`, `.github/workflows/sophia-404-2d-qa.yml`.
- `design/music-effects-og-20261012`: 4807 paths exclusivos; amostra: `.github/workflows/portfolio-browser-qa.yml`, `assets/spectro_logo_png_wuthering_weaves__by_kabasara.png`, `public/assets/music-moonlit-terrace-v2.avif`.
- `design/og-authorial-refresh-20261031`: 4886 paths exclusivos; amostra: `.github/workflows/audit-sophia-assets.yml`, `.github/workflows/portfolio-browser-qa.yml`, `.github/workflows/sophia-404-2d-qa.yml`.
- `docs/resume-academic-languages-2026-10`: 8 paths exclusivos; amostra: `assets/og-portfolio.svg`, `assets/spectro_logo_png_wuthering_weaves__by_kabasara.png`, `public/assets/music-moonlit-terrace-v2.avif`.
- `docs/update-resume-2026-10`: 8 paths exclusivos; amostra: `assets/og-portfolio.svg`, `assets/spectro_logo_png_wuthering_weaves__by_kabasara.png`, `public/assets/music-moonlit-terrace-v2.avif`.
- `experiment/hsin-3d-motion`: 4890 paths exclusivos; amostra: `.github/workflows/audit-sophia-assets.yml`, `.github/workflows/portfolio-browser-qa.yml`, `.github/workflows/sophia-404-2d-qa.yml`.
- `experiment/hsin-lunar-dance-r3-2026-11-02`: 10 paths exclusivos; amostra: `public/assets/music-hsin-stage-2026-11-02.avif`, `public/assets/phrolova-baton-bow.webp`, `public/assets/phrolova/crimson-baton.svg`.
- `experiment/hsin-v21-cinematic-idle-2026-11-01`: 4925 paths exclusivos; amostra: `.github/workflows/audit-sophia-assets.yml`, `.github/workflows/portfolio-browser-qa.yml`, `.github/workflows/sophia-404-2d-qa.yml`.
- `experiment/hsin-v201-anatomical-acting-2026-11-02`: 10 paths exclusivos; amostra: `public/assets/music-hsin-stage-2026-11-02.avif`, `public/assets/phrolova-baton-bow.webp`, `public/assets/phrolova/crimson-baton.svg`.
- `experiment/hsin-v201-arm-silhouette-2026-11-02`: 23 paths exclusivos; amostra: `docs/hsin-v201-arm-silhouette.md`, `docs/qa/hsin-v201-arm-silhouette/candidate-E-composition.webp`, `docs/qa/hsin-v201-arm-silhouette/candidate-E-hair-caress.webp`.
- `experiment/hsin-v201-cinematic-polish-2026-11-02`: 10 paths exclusivos; amostra: `public/assets/music-hsin-stage-2026-11-02.avif`, `public/assets/phrolova-baton-bow.webp`, `public/assets/phrolova/crimson-baton.svg`.
- `experiment/hsin-v201-facial-fidelity-2026-11-02`: 10 paths exclusivos; amostra: `public/assets/music-hsin-stage-2026-11-02.avif`, `public/assets/phrolova-baton-bow.webp`, `public/assets/phrolova/crimson-baton.svg`.
- `experiment/lunar-fox-cameo-2026-11-01`: 4892 paths exclusivos; amostra: `.github/workflows/audit-sophia-assets.yml`, `.github/workflows/portfolio-browser-qa.yml`, `.github/workflows/sophia-404-2d-qa.yml`.
- `experiment/shorekeeper-cl1-root-orientation-20261103`: 68 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-b51-fixes.md`, `docs/characters/shorekeeper-cl1-rotation-and-vfx-hunt.md`.
- `experiment/shorekeeper-cl12-facial-qa-canonical-glb-20261103`: 72 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-b51-fixes.md`, `docs/characters/shorekeeper-cl1-rotation-and-vfx-hunt.md`.
- `experiment/shorekeeper-f15-private-runtime-2026-11-02`: 35 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-f20a-animation-contract.md`, `docs/characters/shorekeeper-f20b-gentle-acting.md`.
- `experiment/shorekeeper-f20a-original-idles-20261102`: 32 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-f20a-animation-contract.md`, `docs/shorekeeper-f15-runtime.md`.
- `experiment/shorekeeper-f20b1-my-star-butterflies-20261103`: 36 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-f20a-animation-contract.md`, `docs/characters/shorekeeper-f20b-gentle-acting.md`.
- `experiment/shorekeeper-f20b2-expression-library`: 38 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-f20a-animation-contract.md`, `docs/characters/shorekeeper-f20b-gentle-acting.md`.
- `experiment/shorekeeper-f20b3-clean-60fps-facial-audit-20261103`: 57 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-b51-fixes.md`, `docs/characters/shorekeeper-f20a-animation-contract.md`.
- `experiment/shorekeeper-f21c3-advanced-combat-20261103`: 62 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-b51-fixes.md`, `docs/characters/shorekeeper-f20a-animation-contract.md`.
- `experiment/shorekeeper-f21c4-burst-liberation-20261103`: 65 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-b51-fixes.md`, `docs/characters/shorekeeper-f20a-animation-contract.md`.
- `experiment/shorekeeper-f21c-combat-recovery-20261103`: 57 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-b51-fixes.md`, `docs/characters/shorekeeper-f20a-animation-contract.md`.
- `experiment/shorekeeper-f21c-presentation-20261103`: 59 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-b51-fixes.md`, `docs/characters/shorekeeper-f20a-animation-contract.md`.
- `experiment/shorekeeper-f21c-source-gate`: 44 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-f20a-animation-contract.md`, `docs/characters/shorekeeper-f20b-gentle-acting.md`.
- `experiment/shorekeeper-f21f1-facial-runtime`: 57 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-b51-fixes.md`, `docs/characters/shorekeeper-f20a-animation-contract.md`.
- `experiment/shorekeeper-vfx-r1-20261103`: 19 paths exclusivos; amostra: `.github/workflows/shorekeeper-vfx-r1.yml`, `docs/characters/shorekeeper-vfx-r1-cpu.json`, `docs/characters/shorekeeper-vfx-r1.md`.
- `feature/awari-behance-case-study`: 2 paths exclusivos; amostra: `assets/og-portfolio.svg`, `public/images/sophia/music-oriental.webp`.
- `feature/hsin-soundtrack-compact-dock-2026-11-02`: 10 paths exclusivos; amostra: `public/assets/music-hsin-stage-2026-11-02.avif`, `public/assets/phrolova-baton-bow.webp`, `public/assets/phrolova/crimson-baton.svg`.
- `feature/shorekeeper-public-lab-vfx-prep-20261103`: 13 paths exclusivos; amostra: `public/assets/music-hsin-stage-2026-11-02.avif`, `public/assets/phrolova-baton-bow.webp`, `public/assets/phrolova/crimson-baton.svg`.
- `feature/shorekeeper-r2-model-asset-20261103`: 46 paths exclusivos; amostra: `.github/workflows/shorekeeper-f16.yml`, `docs/characters/shorekeeper-b51-fixes.md`, `docs/characters/shorekeeper-f20a-animation-contract.md`.
- `fix/portfolio-mode-contrast`: 8 paths exclusivos; amostra: `assets/og-portfolio.svg`, `assets/spectro_logo_png_wuthering_weaves__by_kabasara.png`, `public/assets/music-moonlit-terrace-v2.avif`.
- `fix/publish-hsin-v201-transition-2026-11-02`: 4886 paths exclusivos; amostra: `.github/workflows/audit-sophia-assets.yml`, `.github/workflows/portfolio-browser-qa.yml`, `.github/workflows/sophia-404-2d-qa.yml`.
- `fix/workers-og-build-2026-11-02`: 4886 paths exclusivos; amostra: `.github/workflows/audit-sophia-assets.yml`, `.github/workflows/portfolio-browser-qa.yml`, `.github/workflows/sophia-404-2d-qa.yml`.
- `percurso-awari`: 2 paths exclusivos; amostra: `assets/og-portfolio.svg`, `public/images/sophia/music-oriental.webp`.
- `perf/portfolio-audit-r1-2026-11-02`: 10 paths exclusivos; amostra: `public/assets/music-hsin-stage-2026-11-02.avif`, `public/assets/phrolova-baton-bow.webp`, `public/assets/phrolova/crimson-baton.svg`.
- `qa-results/hsin-dance-r3-bake`: 15 paths exclusivos; amostra: `SOURCE.txt`, `hsin-dance-r3.json`, `hsin-dance-r3/bake-metrics.json`.
- `qa-results/hsin-dance-r3-compare`: 9 paths exclusivos; amostra: `SOURCE.txt`, `hsin-dance-r3/bake-metrics.json`, `hsin-dance-r3/geometry.json`.
- `qa-results/hsin-dance-r3-sheets`: 9 paths exclusivos; amostra: `SOURCE.txt`, `hsin-dance-r3/bake-metrics.json`, `hsin-dance-r3/geometry.json`.
- `qa-results/hsin-dance-r3-video`: 10 paths exclusivos; amostra: `SOURCE.txt`, `hsin-dance-r3/bake-metrics.json`, `hsin-dance-r3/geometry.json`.
- `qa-results/hsin-visual`: 53 paths exclusivos; amostra: `SOURCE.txt`, `acting/composition.mouth-close.hold-smile.png`, `acting/composition.mouth-close.hold.png`.
- `refactor/character-public-assets-r2-inventory-20261103`: 45 paths exclusivos; amostra: `docs/assets/character-storage.md`, `docs/assets/private-r2-layout.json`, `docs/assets/public-character-migration.json`.
- `refactor/experimentos-hsin-canonical-2026-11-02`: 10 paths exclusivos; amostra: `public/assets/music-hsin-stage-2026-11-02.avif`, `public/assets/phrolova-baton-bow.webp`, `public/assets/phrolova/crimson-baton.svg`.
- `revert-8-fix/music-sophia-arms-side-hop`: 2 paths exclusivos; amostra: `assets/og-portfolio.svg`, `public/images/sophia/music-oriental.webp`.
- `review/hsin-v201-metrics-fix-2026-11-02`: 10 paths exclusivos; amostra: `public/assets/music-hsin-stage-2026-11-02.avif`, `public/assets/phrolova-baton-bow.webp`, `public/assets/phrolova/crimson-baton.svg`.
- `review/hsin-v201-silhouette-qa-hardening-2026-11-02`: 26 paths exclusivos; amostra: `docs/hsin-v201-arm-silhouette.md`, `docs/hsin-v201-silhouette-independent-audit.md`, `docs/qa/hsin-v201-arm-silhouette/candidate-E-composition.webp`.
