# Ghost files — S1

**Data:** 2026-11-03. **Base congelada:** `95e78e82c29bac57707469440f6806979fcdc94f`. **Estado global: PARTIAL.**

## Critérios e decisões

Inventário integral da árvore-base. ACTIVE indica referência estática em código/build/testes ou entrada de configuração; não prova execução em navegador. RESERVED preserva fontes, autoria, documentação e QA sem prova de descarte. UNKNOWN exige revisão de URLs diretas e caminhos dinâmicos; não foi excluído. DUPLICATE indica mesmo blob Git, sem presumir que os papéis sejam intercambiáveis. A classificação foi conservadora: busca de caminho/nome em consumidores, sem alegar análise completa de exports mortos ou equivalência semântica de código.

**ACTIVE: 382**, **RESERVED: 114**, **DUPLICATE: 2**, **CONFIRMED_UNUSED: 2**, **UNKNOWN: 27**.

| Remoção | Bytes | Origem / evidência | Impacto |
|---|---:|---|---|
| `docs/asset-storage/private-r2-manifest.proposed.json` | 950 | Adicionado em `77dec0d`; proposta substituída pelo contrato do runtime/publicador em #222; nenhuma referência ativa ao arquivo na árvore atual | Somente documentação; histórico preservado |
| `public/assets/easter/aemeath-pixel-05.webp` | 5.802 | Adicionado em `006ed71`; Sharp rejeita cabeçalho; código exclui explicitamente a quinta imagem da rotação | Reduz publicação de arquivo inválido, sem remover sprite em uso |

A busca da quinta imagem abrangeu 51 refs origin (incluindo HEAD). Três branches históricas não ativas no conjunto de PRs abertos ainda contêm referências antigas; as demais só continham o comentário de exclusão. Os PRs ativos não modificam o componente de sprites. Nada foi removido dessas branches ou do histórico.

A única duplicata exata é `assets/phrolova/crimson-baton-vector-draft.svg` / `public/assets/characters/phrolova/ui/crimson-baton.svg`. A primeira é importada como fonte raw pelo componente; a segunda é servida em URL pública. Ambas foram mantidas. As referências de autoria ao raster migrado foram atualizadas, sem alterar SVGs ou imagens.

O build gerava `public/og-portfolio.jpg` não versionado e sem ignore. Foram adicionados ignores para esse derivado, estado local Wrangler, saídas locais de QA e arquivos locais privados. Gitignore não remove arquivos históricos nem substitui revisão de diff/secret scanning.

## Inventário da base

| Caminho | Bytes | Classe | Evidência / finalidade |
|---|---:|---|---|
| `.github/workflows/hsin-dance-r3.yml` | 5798 | ACTIVE | referência estática em código/build/teste |
| `.github/workflows/hsin-facial-b1-qa.yml` | 4983 | RESERVED | código/configuração de desenvolvimento; sem prova de descarte |
| `.github/workflows/hsin-visual-qa.yml` | 3000 | RESERVED | código/configuração de desenvolvimento; sem prova de descarte |
| `.github/workflows/portfolio-build.yml` | 882 | RESERVED | código/configuração de desenvolvimento; sem prova de descarte |
| `.github/workflows/sync-external-assets.yml` | 6582 | RESERVED | código/configuração de desenvolvimento; sem prova de descarte |
| `.gitignore` | 330 | ACTIVE | metadado, configuração ou entrada do projeto |
| `.node-version` | 3 | ACTIVE | referência estática em código/build/teste |
| `LASTFM_SETUP.md` | 1473 | ACTIVE | metadado, configuração ou entrada do projeto |
| `README.md` | 15732 | ACTIVE | metadado, configuração ou entrada do projeto |
| `assets/Kingdom_Hearts_logo.svg.webp` | 11438 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/Overwatch_circle_logo.svg.webp` | 19566 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `"assets/Pok\303\251_Ball_icon.svg.webp"` | 21968 | ACTIVE | metadado, configuração ou entrada do projeto |
| `assets/about/flower-restoration.webp` | 456974 | ACTIVE | referência estática em código/build/teste |
| `assets/about/shorekeeper-butterfly-mask.svg` | 539 | ACTIVE | referência estática em código/build/teste |
| `assets/about/shorekeeper-flower-envelope.svg` | 570 | ACTIVE | referência estática em código/build/teste |
| `assets/ac_logo.png` | 92181 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/ff_VII.png` | 9756 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/Bleach-8jnJ.ttf` | 18032 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/Blomberg-8MKKZ.otf` | 16332 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/Bookman Bold.ttf` | 87772 | ACTIVE | referência estática em código/build/teste |
| `assets/fonts/Bookman Bold.woff2` | 22600 | ACTIVE | referência estática em código/build/teste |
| `assets/fonts/Caveat-OFL.txt` | 4385 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/Caveat-Variable.woff` | 88340 | ACTIVE | referência estática em código/build/teste |
| `assets/fonts/FujimotoDemo-9Mwyy.ttf` | 53616 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/Garamond-Bold.ttf.eot` | 41586 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/Garamond-Bold.ttf.svg` | 95651 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/Garamond-Bold.ttf.woff` | 19136 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/Heart Breaking Bad.otf` | 132136 | ACTIVE | referência estática em código/build/teste |
| `assets/fonts/Heart Breaking Bad.woff2` | 17744 | ACTIVE | referência estática em código/build/teste |
| `assets/fonts/Latin-Modern-LICENSE.txt` | 7335 | ACTIVE | referência estática em código/build/teste |
| `assets/fonts/Latin-Modern-Mono-Regular.woff` | 18772 | ACTIVE | referência estática em código/build/teste |
| `assets/fonts/LmsPokemonMasterDingbat-P3j2.ttf` | 90780 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/LmsPokemonMasterOutline-dn1g.ttf` | 103224 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/LmsPokemonMasterSolid-LEjG.ttf` | 93248 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/NinjaNaruto-YOn4.ttf` | 18060 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/PokemonSolidNormal-xyWR.ttf` | 25548 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/fonts/Roguepunk.ttf` | 78176 | ACTIVE | referência estática em código/build/teste |
| `assets/fonts/itc-benguiat-bold.otf` | 35548 | ACTIVE | referência estática em código/build/teste |
| `assets/fonts/itc-benguiat-bold.woff2` | 16608 | ACTIVE | referência estática em código/build/teste |
| `assets/mushroom.webp` | 207032 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/og-portfolio.png` | 595205 | ACTIVE | referência estática em código/build/teste |
| `assets/phrolova/TRACE-NOTES.md` | 5085 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/phrolova/WORK-BRIEF.md` | 4450 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/phrolova/comparison-board.svg` | 215866 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/phrolova/crimson-baton-vector-draft.svg` | 18072 | DUPLICATE | mesmo blob; dois consumidores preservados |
| `assets/phrolova/overlay-check.png` | 786497 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/phrolova/reference-board.svg` | 33385 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `assets/phrolova/references.json` | 6534 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `astro.config.mjs` | 147 | ACTIVE | metadado, configuração ou entrada do projeto |
| `docs/archive/sophia6h/README.md` | 663 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/archive/sophia6h/Relatorio_6H.md` | 15757 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/archive/sophia6h/Verdict.json` | 1142 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/asset-storage/README.md` | 3476 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/asset-storage/private-r2-manifest.proposed.json` | 950 | CONFIRMED_UNUSED | proposta substituída |
| `docs/asset-storage/shorekeeper-r2.md` | 3975 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/auditoria-gui-ux-implementacao-2026-10-08.md` | 8193 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/characters/shorekeeper-vfx-r0-brief.md` | 5695 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/code-audit-2026-11-02.md` | 6474 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/contact-orbits.md` | 4279 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-110-acting-study.md` | 2815 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-arm-roles-and-presentation.md` | 8736 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-autonomous-presentation.md` | 8131 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-autonomous-repertoire.md` | 9319 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-b1-automation.md` | 3878 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-b1-choreography.md` | 1747 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-b1-smooth-ui.md` | 1190 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-dance-benchmark.json` | 480 | ACTIVE | referência estática em código/build/teste |
| `docs/hsin-dance-geometry-qa.json` | 743 | ACTIVE | referência estática em código/build/teste |
| `docs/hsin-dance-r2-benchmark.json` | 529 | ACTIVE | referência estática em código/build/teste |
| `docs/hsin-dance-r2-qa.json` | 635 | ACTIVE | referência estática em código/build/teste |
| `docs/hsin-dance-r2-screen-qa.json` | 759 | ACTIVE | referência estática em código/build/teste |
| `docs/hsin-dance-r2-validation.json` | 752 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-dance-runtime-qa.json` | 439 | ACTIVE | referência estática em código/build/teste |
| `docs/hsin-facial-acting-pass-a.md` | 5459 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-facial-acting-pass-b.md` | 14283 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-facial-legibility-pass-b1.md` | 4854 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-lunar-dance-r2.md` | 13144 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-lunar-dance-r3-reference-study.md` | 3742 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-lunar-dance-r3.md` | 7429 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-lunar-dance.md` | 18359 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-motion-director-audit.md` | 14473 | ACTIVE | referência estática em código/build/teste |
| `docs/hsin-motion-director-trace.txt` | 1790 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-music-tower.md` | 6566 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-organic-planning-study.md` | 1969 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-pavilion-r2-qa.json` | 1220 | ACTIVE | referência estática em código/build/teste |
| `docs/hsin-presentation-cleanup.md` | 4177 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-right-hand-chest.md` | 3977 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-v2-asset-report.json` | 5725 | ACTIVE | referência estática em código/build/teste |
| `docs/hsin-v2-moonlit-stage.md` | 8042 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-v2-stage.md` | 9611 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-v201-anatomical-acting.md` | 6469 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-v201-cinematic-polish.md` | 3890 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/hsin-v201-face-fidelity.md` | 3007 | ACTIVE | referência estática em código/build/teste |
| `docs/hsin-v201-material-audit.json` | 7361 | ACTIVE | referência estática em código/build/teste |
| `docs/method-scene.md` | 1342 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/music-scene-generation-prompt.md` | 4450 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/music-scene-v2.md` | 2269 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/og-audit-2026-10-12.md` | 4690 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/og-refresh-2026-10-31.md` | 2210 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/performance/assets-inventory-r1.md` | 4761 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/performance/audit-r1.md` | 5611 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/performance/baseline-r1.md` | 5910 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/performance/benchmark-r1.md` | 3293 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/performance/r1-build-verification.md` | 2955 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/performance/roadmap-r2.md` | 2522 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/phrolova-vector-reference.md` | 3518 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/publishing-workflow.md` | 2681 | ACTIVE | referência estática em código/build/teste |
| `docs/qa/hsin-dance-r2/dance-r2-cpu.mp4` | 1018332 | ACTIVE | referência estática em código/build/teste |
| `docs/qa/hsin-dance-r2/manifest.json` | 477 | ACTIVE | referência estática em código/build/teste |
| `docs/qa/hsin-dance-r2/motion-sequence.webp` | 90050 | ACTIVE | referência estática em código/build/teste |
| `docs/qa/hsin-dance-r2/pavilion-after.webp` | 82870 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/qa/hsin-dance-r2/pavilion-before.webp` | 79584 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/qa/hsin-dance-r3/bake-metrics.json` | 2761 | ACTIVE | referência estática em código/build/teste |
| `docs/qa/hsin-dance-r3/geometry.json` | 2755 | ACTIVE | referência estática em código/build/teste |
| `docs/qa/hsin-dance-r3/key-poses-front.webp` | 153734 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/qa/hsin-dance-r3/key-poses-side.webp` | 129724 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/qa/hsin-dance-r3/key-poses-threeQuarter.webp` | 157058 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/qa/hsin-dance-r3/r2-vs-r3.webp` | 92894 | ACTIVE | referência estática em código/build/teste |
| `docs/qa/hsin-dance-r3/transition-r2-r3.webp` | 92696 | ACTIVE | referência estática em código/build/teste |
| `docs/qa/hsin-dance/flourish-arc.webp` | 105308 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/qa/hsin-dance/phrases.webp` | 262494 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/qa/hsin-dance/views.webp` | 46824 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/qa/hsin-v201/composition.webp` | 444676 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/qa/hsin-v201/face-before-after.webp` | 292054 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/qa/hsin-v201/hair-caress.webp` | 545408 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/qa/hsin-v201/lip-touch.webp` | 462576 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/section-refinements.md` | 2595 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/sophia-404-3d.md` | 3694 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/sophia-404-legacy-7b.md` | 1955 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `docs/ui-audit-followup.md` | 2116 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `functions/_lib/shorekeeper-private.mjs` | 4480 | ACTIVE | referência estática em código/build/teste |
| `functions/api/music/cover.js` | 2205 | ACTIVE | referência estática em código/build/teste |
| `functions/api/music/recent.js` | 4158 | ACTIVE | referência estática em código/build/teste |
| `functions/api/shorekeeper/asset.js` | 1344 | ACTIVE | referência estática em código/build/teste |
| `functions/api/shorekeeper/manifest.js` | 536 | ACTIVE | referência estática em código/build/teste |
| `package-lock.json` | 132902 | ACTIVE | metadado, configuração ou entrada do projeto |
| `package.json` | 1931 | ACTIVE | referência estática em código/build/teste |
| `public/_headers` | 1746 | ACTIVE | referência estática em código/build/teste |
| `public/_redirects` | 237 | ACTIVE | referência estática em código/build/teste |
| `public/assets/about/shorekeeper-butterfly.webp` | 129222 | ACTIVE | referência estática em código/build/teste |
| `public/assets/about/shorekeeper-flower.webp` | 79698 | ACTIVE | referência estática em código/build/teste |
| `public/assets/animations/hsin/lunar-dance-r1.json` | 394188 | ACTIVE | referência estática em código/build/teste |
| `public/assets/animations/hsin/lunar-dance-r2.json` | 511505 | ACTIVE | referência estática em código/build/teste |
| `public/assets/animations/hsin/lunar-dance-r3-grand.json` | 215487 | ACTIVE | referência estática em código/build/teste |
| `public/assets/animations/hsin/lunar-dance-r3.json` | 205005 | ACTIVE | referência estática em código/build/teste |
| `public/assets/characters/hsin/music/music-stage-2026-11-02.avif` | 50469 | ACTIVE | referência estática em código/build/teste |
| `public/assets/characters/phrolova/ui/baton-bow.webp` | 8938 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/characters/phrolova/ui/crimson-baton.svg` | 18072 | DUPLICATE | mesmo blob; dois consumidores preservados |
| `public/assets/characters/shorekeeper/ui/butterfly.webp` | 6174 | ACTIVE | referência estática em código/build/teste |
| `public/assets/characters/shorekeeper/vfx/butterfly-ice.svg` | 746 | ACTIVE | referência estática em código/build/teste |
| `public/assets/characters/shorekeeper/vfx/butterfly-violet.svg` | 597 | ACTIVE | referência estática em código/build/teste |
| `public/assets/characters/shorekeeper/vfx/star-sprite.svg` | 464 | ACTIVE | referência estática em código/build/teste |
| `public/assets/characters/sophia/sprites/sophia-2d-gamepad.webp` | 11110 | ACTIVE | referência estática em código/build/teste |
| `public/assets/characters/sophia/sprites/sophia-2d-leave.webp` | 55632 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/characters/sophia/sprites/sophia-2d-play.webp` | 50480 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/characters/sophia/sprites/sophia-2d-run.webp` | 61554 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/characters/sophia/sprites/sophia-2d-stress.webp` | 51922 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/characters/sophia/sprites/sophia-2d-throw.webp` | 60884 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/contact-games/assassins-creed.svg` | 2461 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/contact-games/final-fantasy-vii.svg` | 20030 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/contact-games/kingdom-hearts.svg` | 38375 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/contact-games/overwatch.webp` | 5864 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/contact-games/wuthering-waves.svg` | 6922 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/cursors/fibra-mao.png` | 1553 | ACTIVE | referência estática em código/build/teste |
| `public/assets/cursors/fibra-seta.png` | 1530 | ACTIVE | referência estática em código/build/teste |
| `public/assets/e-se-paris.jpg` | 188796 | ACTIVE | referência estática em código/build/teste |
| `public/assets/easter/aemeath-pixel-01.webp` | 8796 | ACTIVE | referência estática em código/build/teste |
| `public/assets/easter/aemeath-pixel-02.webp` | 3274 | ACTIVE | referência estática em código/build/teste |
| `public/assets/easter/aemeath-pixel-03.webp` | 3126 | ACTIVE | referência estática em código/build/teste |
| `public/assets/easter/aemeath-pixel-04.webp` | 3336 | ACTIVE | referência estática em código/build/teste |
| `public/assets/easter/aemeath-pixel-05.webp` | 5802 | CONFIRMED_UNUSED | arquivo inválido, excluído da rotação |
| `public/assets/github-avatar.webp` | 12806 | ACTIVE | referência estática em código/build/teste |
| `public/assets/luna-sailor-moon.webp` | 575008 | ACTIVE | referência estática em código/build/teste |
| `public/assets/models/hsin/hsin-v2.0-poster-landscape.webp` | 46802 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/models/hsin/hsin-v2.0-poster.webp` | 79802 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/models/hsin/hsin-v2.0-profile.json` | 149792 | ACTIVE | referência estática em código/build/teste |
| `public/assets/models/hsin/hsin-v2.0.1-poster-landscape.webp` | 81560 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/models/hsin/hsin-v2.0.1-poster.webp` | 116350 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/models/hsin/hsin-v2.0.glb` | 9873744 | ACTIVE | referência estática em código/build/teste |
| `public/assets/models/hsin/hsin-v2.1-acting.json` | 108485 | ACTIVE | referência estática em código/build/teste |
| `public/assets/models/hsin/hsin-v2.1-profile.json` | 155033 | ACTIVE | referência estática em código/build/teste |
| `public/assets/motion-stills/luna-sailor-moon.webp` | 15132 | ACTIVE | referência estática em código/build/teste |
| `public/assets/motion-stills/shannon-blackboard-transparent.webp` | 646 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/motion-stills/typing-left.webp` | 11604 | ACTIVE | referência estática em código/build/teste |
| `public/assets/motion-stills/typing-right.webp` | 10966 | ACTIVE | referência estática em código/build/teste |
| `public/assets/motion-stills/violet-evergarden.webp` | 10056 | ACTIVE | referência estática em código/build/teste |
| `public/assets/percurso-awari-oficial.svg` | 1017 | ACTIVE | referência estática em código/build/teste |
| `public/assets/percurso-awari.svg` | 314 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/percurso-escrita.svg` | 339 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/percurso-mpf-oficial.svg` | 270 | ACTIVE | referência estática em código/build/teste |
| `public/assets/percurso-mpf.svg` | 382 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/percurso-senai-oficial.svg` | 335 | ACTIVE | referência estática em código/build/teste |
| `public/assets/percurso-senai.svg` | 370 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/assets/percurso-writer.svg` | 302 | ACTIVE | referência estática em código/build/teste |
| `public/assets/scenes/hsin/full-moon-v1.webp` | 51756 | ACTIVE | referência estática em código/build/teste |
| `public/assets/scenes/hsin/golden-moon-v201.webp` | 50000 | ACTIVE | referência estática em código/build/teste |
| `public/assets/scenes/hsin/night-sky-v1.webp` | 2996 | ACTIVE | referência estática em código/build/teste |
| `public/assets/scenes/hsin/night-sky-v201.webp` | 5740 | ACTIVE | referência estática em código/build/teste |
| `public/assets/scenes/hsin/stone-v201.webp` | 28812 | ACTIVE | referência estática em código/build/teste |
| `public/assets/scenes/hsin/terrace-atlas-v201.webp` | 17692 | ACTIVE | referência estática em código/build/teste |
| `public/assets/scenes/hsin/water-v201.webp` | 2302 | ACTIVE | referência estática em código/build/teste |
| `public/assets/spectrumlab-mark.svg` | 1779 | ACTIVE | referência estática em código/build/teste |
| `public/assets/textures/eucalipto-folha.svg` | 3292 | ACTIVE | referência estática em código/build/teste |
| `public/assets/textures/folha-eucalipto.svg` | 271 | ACTIVE | referência estática em código/build/teste |
| `public/assets/the-big-picture-cover.jpg` | 49074 | ACTIVE | referência estática em código/build/teste |
| `public/assets/typing-left.webp` | 1226156 | ACTIVE | referência estática em código/build/teste |
| `public/assets/typing-right.webp` | 301716 | ACTIVE | referência estática em código/build/teste |
| `public/assets/violet-evergarden.webp` | 447130 | ACTIVE | referência estática em código/build/teste |
| `public/brand/avatar-poster.jpg` | 15015 | ACTIVE | referência estática em código/build/teste |
| `public/brand/avatar.mp4` | 233005 | ACTIVE | referência estática em código/build/teste |
| `public/brand/avatar.webm` | 270189 | ACTIVE | referência estática em código/build/teste |
| `public/claude-shannon-blackboard.webp` | 14824 | ACTIVE | referência estática em código/build/teste |
| `public/curriculo-kaue-alencar.pdf` | 7746 | ACTIVE | referência estática em código/build/teste |
| `public/dark-side-prism.jpg` | 39355 | ACTIVE | referência estática em código/build/teste |
| `public/emil-triforce.webp` | 6876 | ACTIVE | referência estática em código/build/teste |
| `public/experimental/gltf-gl.js` | 25101 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/experimental/gltf-skel.js` | 16983 | ACTIVE | referência estática em código/build/teste |
| `public/experimental/sophia-7b-e1-latest.glb` | 17054692 | ACTIVE | referência estática em código/build/teste |
| `public/experimental/sophia-alpha.glb` | 20795692 | ACTIVE | referência estática em código/build/teste |
| `public/experimental/sophia-expressions.js` | 2183 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/experimental/sophia-scene.js` | 17075 | ACTIVE | referência estática em código/build/teste |
| `public/favicon.svg` | 206 | ACTIVE | referência estática em código/build/teste |
| `public/hsin.webp` | 430606 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/images/sophia/lab-oriental.webp` | 154614 | ACTIVE | referência estática em código/build/teste |
| `public/images/sophia/lab-single-tail.webp` | 98178 | ACTIVE | referência estática em código/build/teste |
| `public/images/sophia/method-presenter-still.webp` | 61826 | ACTIVE | referência estática em código/build/teste |
| `public/images/sophia/method-presenter.webp` | 224082 | ACTIVE | referência estática em código/build/teste |
| `public/images/sophia/music-dance.webp` | 206660 | ACTIVE | referência estática em código/build/teste |
| `public/phrolova-baton.webp` | 7382 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/phrolova.jpg` | 41492 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/robots.txt` | 359 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/scripts/cover-fx.js` | 21012 | ACTIVE | referência estática em código/build/teste |
| `public/scripts/experimental-menu.js` | 7902 | ACTIVE | referência estática em código/build/teste |
| `public/scripts/music-experimental-transition.js` | 3770 | ACTIVE | referência estática em código/build/teste |
| `public/scripts/music-note-cursor.js` | 6378 | ACTIVE | referência estática em código/build/teste |
| `public/scripts/reveal.js` | 5823 | ACTIVE | referência estática em código/build/teste |
| `public/scripts/scenes.js` | 98326 | ACTIVE | referência estática em código/build/teste |
| `public/shannon-blackboard-transparent.gif` | 1166442 | ACTIVE | referência estática em código/build/teste |
| `public/shorekeeper-black-shores.png` | 1402157 | ACTIVE | referência estática em código/build/teste |
| `public/shorekeeper.jpg` | 104990 | UNKNOWN | URL direta; referência dinâmica não resolvida nesta triagem |
| `public/sitemap.xml` | 597 | ACTIVE | referência estática em código/build/teste |
| `scripts/audit-hsin-materials.mjs` | 3400 | ACTIVE | referência estática em código/build/teste |
| `scripts/bake-hsin-acting.mjs` | 3966 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/bake-hsin-dance-r2.mjs` | 7608 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/bake-hsin-dance-r3.mjs` | 14286 | ACTIVE | referência estática em código/build/teste |
| `scripts/bake-hsin-dance.mjs` | 6977 | ACTIVE | referência estática em código/build/teste |
| `scripts/bake-hsin-hair-caress.mjs` | 7200 | ACTIVE | referência estática em código/build/teste |
| `scripts/bake-hsin-lip-touch.mjs` | 5280 | ACTIVE | referência estática em código/build/teste |
| `scripts/bake-hsin-v2.mjs` | 5457 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/bench-hsin-acting.mjs` | 2700 | ACTIVE | referência estática em código/build/teste |
| `scripts/bench-hsin-dance.mjs` | 2723 | ACTIVE | referência estática em código/build/teste |
| `scripts/build-og-card.py` | 11551 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/build-resume.py` | 11694 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/check-sophia-7b.mjs` | 1340 | ACTIVE | referência estática em código/build/teste |
| `scripts/check-ux-contract.mjs` | 22220 | ACTIVE | referência estática em código/build/teste |
| `scripts/data/hsin-hair-caress-end.json` | 1026 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/data/hsin-hair-caress-hoverIn.json` | 1036 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/data/hsin-hair-caress-hoverOut.json` | 1016 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/data/hsin-hair-caress-mid.json` | 1054 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/data/hsin-hair-caress-start.json` | 1040 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/data/hsin-lip-touch-solution.json` | 1234 | ACTIVE | referência estática em código/build/teste |
| `scripts/generate-about-cutouts.mjs` | 3516 | ACTIVE | referência estática em código/build/teste |
| `scripts/generate-hsin-moonlit.mjs` | 3324 | ACTIVE | referência estática em código/build/teste |
| `scripts/generate-motion-stills.mjs` | 530 | ACTIVE | referência estática em código/build/teste |
| `scripts/generate-og.mjs` | 2576 | ACTIVE | referência estática em código/build/teste |
| `scripts/hsin-behavior-trace.mjs` | 7494 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/lib/hsin-arm-metrics.mjs` | 2212 | ACTIVE | referência estática em código/build/teste |
| `scripts/lib/hsin-arm.mjs` | 5047 | ACTIVE | referência estática em código/build/teste |
| `scripts/lib/hsin-dance-lower.mjs` | 3197 | ACTIVE | referência estática em código/build/teste |
| `scripts/lib/hsin-dance-rig.mjs` | 1246 | ACTIVE | referência estática em código/build/teste |
| `scripts/lib/hsin-math.mjs` | 5427 | ACTIVE | referência estática em código/build/teste |
| `scripts/lib/hsin-proximity.mjs` | 4621 | ACTIVE | referência estática em código/build/teste |
| `scripts/lib/hsin-reverie-authoring.mjs` | 8055 | ACTIVE | referência estática em código/build/teste |
| `scripts/lib/hsin-rig.mjs` | 11390 | ACTIVE | referência estática em código/build/teste |
| `scripts/lib/hsin-secondary-authoring.mjs` | 4064 | ACTIVE | referência estática em código/build/teste |
| `scripts/lib/hsin-solve.mjs` | 1512 | ACTIVE | referência estática em código/build/teste |
| `scripts/optimize-hsin-v2.py` | 10559 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/qa-sophia-404-2d.mjs` | 4014 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/qa-sophia-404.mjs` | 5151 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/qa/hsin-harness.html` | 395 | ACTIVE | referência estática em código/build/teste |
| `scripts/qa/hsin-harness.mjs` | 6622 | ACTIVE | referência estática em código/build/teste |
| `scripts/qa/run-hsin-qa.mjs` | 9747 | ACTIVE | referência estática em código/build/teste |
| `scripts/qa/serve.mjs` | 1509 | ACTIVE | referência estática em código/build/teste |
| `scripts/render-hsin-dance-qa.mjs` | 2639 | ACTIVE | referência estática em código/build/teste |
| `scripts/render-hsin-dance-r2-qa.mjs` | 3186 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/render-hsin-dance-r3-qa.mjs` | 5743 | ACTIVE | referência estática em código/build/teste |
| `scripts/render-hsin-poster.mjs` | 10996 | ACTIVE | referência estática em código/build/teste |
| `scripts/shorekeeper/publish-private-to-r2.mjs` | 6020 | ACTIVE | referência estática em código/build/teste |
| `scripts/solve-hsin-hair-caress.mjs` | 7285 | ACTIVE | referência estática em código/build/teste |
| `scripts/solve-hsin-lip-touch.mjs` | 6681 | ACTIVE | referência estática em código/build/teste |
| `scripts/test-cover-proxy.mjs` | 2500 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `scripts/test-music-api.mjs` | 5694 | ACTIVE | referência estática em código/build/teste |
| `scripts/test-music-state.mjs` | 4365 | ACTIVE | referência estática em código/build/teste |
| `scripts/test-sophia-morph-runtime.mjs` | 1360 | ACTIVE | referência estática em código/build/teste |
| `scripts/test-tetris.mjs` | 6159 | ACTIVE | referência estática em código/build/teste |
| `scripts/verify-og.mjs` | 5425 | ACTIVE | referência estática em código/build/teste |
| `src/components/AtomCursor.astro` | 9121 | ACTIVE | referência estática em código/build/teste |
| `src/components/BaseHead.astro` | 3390 | ACTIVE | referência estática em código/build/teste |
| `src/components/CosmicStarfield.astro` | 5805 | ACTIVE | referência estática em código/build/teste |
| `src/components/DecorativeMotion.astro` | 2057 | ACTIVE | referência estática em código/build/teste |
| `src/components/ExperimentalMenu.astro` | 8639 | ACTIVE | referência estática em código/build/teste |
| `src/components/ExperimentalShowcase.astro` | 1278 | RESERVED | código/configuração de desenvolvimento; sem prova de descarte |
| `src/components/HeroMicroInteractions.astro` | 25797 | ACTIVE | referência estática em código/build/teste |
| `src/components/HsinSoundtrack.astro` | 4083 | ACTIVE | referência estática em código/build/teste |
| `src/components/LunarBackdrop.astro` | 3649 | RESERVED | código/configuração de desenvolvimento; sem prova de descarte |
| `src/components/MarioNameTiles.astro` | 10723 | ACTIVE | referência estática em código/build/teste |
| `src/components/MethodPresenter.astro` | 4738 | ACTIVE | referência estática em código/build/teste |
| `src/components/MotionImage.astro` | 382 | ACTIVE | referência estática em código/build/teste |
| `src/components/MusicShelf.astro` | 30882 | ACTIVE | referência estática em código/build/teste |
| `src/components/PixelPaths.astro` | 254 | ACTIVE | referência estática em código/build/teste |
| `src/components/PortfolioFooter.astro` | 18425 | ACTIVE | referência estática em código/build/teste |
| `src/components/PortfolioHeader.astro` | 31155 | ACTIVE | referência estática em código/build/teste |
| `src/components/RandomEasterSprites.astro` | 6364 | ACTIVE | referência estática em código/build/teste |
| `src/components/SeriousModeToggle.astro` | 72302 | ACTIVE | referência estática em código/build/teste |
| `src/components/SophiaAnimation.astro` | 645 | ACTIVE | referência estática em código/build/teste |
| `src/components/SophiaCorrida.astro` | 746 | ACTIVE | referência estática em código/build/teste |
| `src/components/SophiaDetective.astro` | 288 | ACTIVE | referência estática em código/build/teste |
| `src/components/SophiaLounge.astro` | 671 | ACTIVE | referência estática em código/build/teste |
| `src/components/SophiaMascot.astro` | 571 | ACTIVE | referência estática em código/build/teste |
| `src/components/SophiaPortrait.astro` | 282 | ACTIVE | referência estática em código/build/teste |
| `src/components/SophiaRoom2DTemp.astro` | 1450 | ACTIVE | referência estática em código/build/teste |
| `src/components/SophiaSigil.astro` | 4470 | ACTIVE | referência estática em código/build/teste |
| `src/components/TriforceSystem.astro` | 11229 | ACTIVE | referência estática em código/build/teste |
| `src/config.ts` | 1537 | ACTIVE | referência estática em código/build/teste |
| `src/curiosities.ts` | 8708 | ACTIVE | referência estática em código/build/teste |
| `src/data/hsin-dance-r3.json` | 547 | ACTIVE | referência estática em código/build/teste |
| `src/data/hsin-dance.json` | 330 | ACTIVE | referência estática em código/build/teste |
| `src/data/hsin-music-map.json` | 732 | ACTIVE | referência estática em código/build/teste |
| `src/data/hsin-v2-asset.json` | 123 | ACTIVE | referência estática em código/build/teste |
| `src/data/hsin-v201-acting.json` | 306 | ACTIVE | referência estática em código/build/teste |
| `src/data/hsin-v201-framing.json` | 1211 | ACTIVE | referência estática em código/build/teste |
| `src/data/hsin-v21-pose.json` | 307 | ACTIVE | referência estática em código/build/teste |
| `src/layouts/BaseLayout.astro` | 1935 | ACTIVE | referência estática em código/build/teste |
| `src/layouts/HsinStageLayout.astro` | 568 | ACTIVE | referência estática em código/build/teste |
| `src/pages/404.astro` | 35203 | ACTIVE | referência estática em código/build/teste |
| `src/pages/curiosidades.astro` | 3498 | ACTIVE | referência estática em código/build/teste |
| `src/pages/experimentos/index.astro` | 2878 | ACTIVE | referência estática em código/build/teste |
| `src/pages/experimentos/sk/index.astro` | 17759 | ACTIVE | referência estática em código/build/teste |
| `src/pages/index.astro` | 54305 | ACTIVE | referência estática em código/build/teste |
| `src/pages/modo-experimental.astro` | 3253 | RESERVED | código/configuração de desenvolvimento; sem prova de descarte |
| `src/pages/sophia.astro` | 4845 | ACTIVE | referência estática em código/build/teste |
| `src/periodic-table.ts` | 5494 | RESERVED | código/configuração de desenvolvimento; sem prova de descarte |
| `src/scripts/hsin-acting-director.mjs` | 3327 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-arm-clearance.mjs` | 4130 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-arm-roles.mjs` | 3818 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-atmosphere.mjs` | 1002 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-baked-pose.mjs` | 2410 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-body-repertoire.mjs` | 4215 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-chest-director.mjs` | 2507 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-chest-gesture.mjs` | 18229 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-cinematic-idle.mjs` | 1708 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-dance-config.mjs` | 3142 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-dance-data.mjs` | 577 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-dance-director.mjs` | 10632 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-dance-interp.mjs` | 2361 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-dance-pose.mjs` | 4175 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-dance-reverie.mjs` | 10976 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-face-acting.mjs` | 8905 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-face-b1.mjs` | 3462 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-face-binding.mjs` | 2443 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-face-channels.mjs` | 485 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-face-morph-audit.mjs` | 4869 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-face-pass-b.mjs` | 7791 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-face-presentation.mjs` | 1904 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-face-rig.mjs` | 5289 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-face-session.mjs` | 6223 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-face-skin.mjs` | 5703 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-gesture-ik.mjs` | 27586 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-glb-embedded-textures.mjs` | 2501 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-hair-gesture.mjs` | 8817 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-hand-clearance.mjs` | 1635 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-hand-composition.mjs` | 4136 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-iconic-expressions.mjs` | 6066 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-iconic-profiles.mjs` | 826 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-left-signature.mjs` | 8227 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-limb-motion.mjs` | 2992 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-lip-hair.mjs` | 8347 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-lunar-framing.mjs` | 1182 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-lunar-moon.mjs` | 1613 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-lunar-presentation.mjs` | 3859 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-lunar-terrace.mjs` | 12148 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-material-debug.mjs` | 3003 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-moonlit-environment.mjs` | 3790 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-music-api.mjs` | 3961 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-music-providers.mjs` | 1313 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-music-state.mjs` | 2957 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-music-tower.mjs` | 14635 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-music-transport.mjs` | 2825 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-path-timing.mjs` | 3060 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-pavilion-layout.mjs` | 4272 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-pose-transition.mjs` | 690 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-presence-expression.mjs` | 4113 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-rest-breath.mjs` | 684 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-right-signature.mjs` | 8298 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-sleeve-intersections.mjs` | 3330 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-soundtrack.ts` | 7459 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-stage-config.mjs` | 1302 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-stage-lighting.mjs` | 1016 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-stage-loop.mjs` | 1171 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-stage-metrics.mjs` | 3264 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-stage.ts` | 24502 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/hsin-waypoint-safety.mjs` | 2629 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper-sk-lab.mjs` | 41405 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/combat-director.mjs` | 3202 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/director.mjs` | 3295 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/expression-library.mjs` | 3893 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/gentle-acting.mjs` | 5481 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/inspection.mjs` | 4783 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/lab-state.mjs` | 634 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/liberation-rotation.mjs` | 5384 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/local-model.mjs` | 4232 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/original-idle-director.mjs` | 5022 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/private-model-cache.mjs` | 2883 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/remote-private-model.mjs` | 2133 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/stage.mjs` | 4981 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/shorekeeper/vfx-presets.mjs` | 712 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/sophia-404-renderer.js` | 13826 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/sophia-404-room.js` | 5420 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/sophia-404-stage.js` | 3823 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/sophia-404-tail.js` | 3406 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/sophia-room2d-temp.js` | 2598 | ACTIVE | referência estática em código/build/teste |
| `src/scripts/typewriter.ts` | 2932 | ACTIVE | referência estática em código/build/teste |
| `src/section-order.ts` | 482 | RESERVED | código/configuração de desenvolvimento; sem prova de descarte |
| `src/sophia-art.ts` | 4351 | ACTIVE | referência estática em código/build/teste |
| `src/sophia-detective.ts` | 9204 | RESERVED | código/configuração de desenvolvimento; sem prova de descarte |
| `src/sophia-draw.ts` | 10638 | ACTIVE | referência estática em código/build/teste |
| `src/sophia-lounge-fox.ts` | 25688 | ACTIVE | referência estática em código/build/teste |
| `src/sophia-lounge-room.ts` | 14558 | ACTIVE | referência estática em código/build/teste |
| `src/sophia-lounge-tv.ts` | 8439 | ACTIVE | referência estática em código/build/teste |
| `src/sophia-lounge-wall.ts` | 13990 | ACTIVE | referência estática em código/build/teste |
| `src/sophia-lounge.ts` | 1223 | ACTIVE | referência estática em código/build/teste |
| `src/sophia-pixel.ts` | 4802 | ACTIVE | referência estática em código/build/teste |
| `src/sophia-portrait.ts` | 17698 | ACTIVE | referência estática em código/build/teste |
| `src/sophia-runner.ts` | 7433 | ACTIVE | referência estática em código/build/teste |
| `src/sophia-town.ts` | 26541 | ACTIVE | referência estática em código/build/teste |
| `src/styles/attention.css` | 6878 | ACTIVE | referência estática em código/build/teste |
| `src/styles/contact-orbits.css` | 2200 | ACTIVE | referência estática em código/build/teste |
| `src/styles/curiosidades.css` | 9684 | ACTIVE | referência estática em código/build/teste |
| `src/styles/editorial.css` | 11364 | ACTIVE | referência estática em código/build/teste |
| `src/styles/eink.css` | 3539 | ACTIVE | referência estática em código/build/teste |
| `src/styles/experimental-scene.css` | 4492 | ACTIVE | referência estática em código/build/teste |
| `src/styles/experimental.css` | 13354 | ACTIVE | referência estática em código/build/teste |
| `src/styles/gavetas.css` | 1452 | ACTIVE | referência estática em código/build/teste |
| `src/styles/global.css` | 140708 | ACTIVE | referência estática em código/build/teste |
| `src/styles/hero-autoral.css` | 10537 | ACTIVE | referência estática em código/build/teste |
| `src/styles/hsin-soundtrack.css` | 8692 | ACTIVE | referência estática em código/build/teste |
| `src/styles/hsin-stage.css` | 4233 | ACTIVE | referência estática em código/build/teste |
| `src/styles/legacy-win98.css` | 11762 | ACTIVE | referência estática em código/build/teste |
| `src/styles/legacy.css` | 23153 | ACTIVE | referência estática em código/build/teste |
| `src/styles/method-scene.css` | 10153 | ACTIVE | referência estática em código/build/teste |
| `src/styles/mobile.css` | 4561 | ACTIVE | referência estática em código/build/teste |
| `src/styles/mode-tokens.css` | 3345 | ACTIVE | referência estática em código/build/teste |
| `src/styles/mono-modes.css` | 10042 | ACTIVE | referência estática em código/build/teste |
| `src/styles/music-gallery.css` | 23944 | ACTIVE | referência estática em código/build/teste |
| `src/styles/music-player.css` | 36038 | ACTIVE | referência estática em código/build/teste |
| `src/styles/music-scene-motion.css` | 13098 | ACTIVE | referência estática em código/build/teste |
| `src/styles/music-scene.css` | 7232 | ACTIVE | referência estática em código/build/teste |
| `src/styles/pi-card.css` | 18643 | ACTIVE | referência estática em código/build/teste |
| `src/styles/reveal.css` | 8578 | ACTIVE | referência estática em código/build/teste |
| `src/styles/section-refinements.css` | 32875 | ACTIVE | referência estática em código/build/teste |
| `src/styles/section-scenes.css` | 15108 | ACTIVE | referência estática em código/build/teste |
| `src/styles/serious.css` | 11142 | ACTIVE | referência estática em código/build/teste |
| `src/styles/shorekeeper-material3.css` | 12186 | ACTIVE | referência estática em código/build/teste |
| `src/styles/shorekeeper-presentation.css` | 2666 | ACTIVE | referência estática em código/build/teste |
| `src/styles/shorekeeper-sk-lab.css` | 9816 | ACTIVE | referência estática em código/build/teste |
| `src/styles/sophia-404-3d.css` | 6621 | ACTIVE | referência estática em código/build/teste |
| `src/styles/sophia-corrida.css` | 6945 | ACTIVE | referência estática em código/build/teste |
| `src/styles/sophia-illustration.css` | 14495 | ACTIVE | referência estática em código/build/teste |
| `src/styles/sophia-pixel.css` | 910 | ACTIVE | referência estática em código/build/teste |
| `src/styles/sophia-room2d-temp.css` | 5656 | ACTIVE | referência estática em código/build/teste |
| `src/styles/sophia-tetris.css` | 6296 | ACTIVE | referência estática em código/build/teste |
| `src/styles/type-hierarchy.css` | 8090 | ACTIVE | referência estática em código/build/teste |
| `src/styles/typography.css` | 22812 | ACTIVE | referência estática em código/build/teste |
| `tests/experimentos-canonical.test.mjs` | 1394 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-acting-director.test.mjs` | 1885 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-acting-runtime.test.mjs` | 4586 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-arm-clearance.test.mjs` | 1709 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-arm-roles.test.mjs` | 5773 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-autonomous-repertoire.test.mjs` | 2154 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-b1-automation.test.mjs` | 4183 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-chest-director.test.mjs` | 8272 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-chest-rig.test.mjs` | 13593 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-chest.test.mjs` | 3662 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-choreography-private.test.mjs` | 5504 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `tests/hsin-dance-geometry.test.mjs` | 5497 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-dance-r2.test.mjs` | 9238 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-dance-r3-authoring.test.mjs` | 10832 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-dance-r3-director.test.mjs` | 13645 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-dance-r3.test.mjs` | 14055 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-dance.test.mjs` | 8241 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-embedded-texture.test.mjs` | 2402 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-face-acting.test.mjs` | 7007 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-face-b1.test.mjs` | 4221 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-face-pass-b.test.mjs` | 7304 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-face-private.test.mjs` | 5353 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-face-skin-math.test.mjs` | 7321 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-face-skin.test.mjs` | 5682 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-gesture-ik.test.mjs` | 11259 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-hair-caress-geometry.test.mjs` | 5158 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-hair-gesture.test.mjs` | 3582 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-left-arm-motion.test.mjs` | 10385 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-lip-hair.test.mjs` | 7771 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-lip-touch-geometry.test.mjs` | 5565 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-lunar-refinement.test.mjs` | 8542 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-lunar-terrace.test.mjs` | 12039 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-material-audit.test.mjs` | 2602 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-material-debug.test.mjs` | 2330 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `tests/hsin-moonlit-environment.test.mjs` | 3735 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-motion-director.test.mjs` | 16025 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-music-state.test.mjs` | 7623 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-pavilion-r2.test.mjs` | 4998 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-pose-transition.test.mjs` | 951 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-presence-expression.test.mjs` | 2021 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-presentation.test.mjs` | 7357 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-repertoire-private.test.mjs` | 4223 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `tests/hsin-rig-parity.test.mjs` | 3200 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-soundtrack.test.mjs` | 8437 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-stage-asset.test.mjs` | 4603 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-stage-metrics.test.mjs` | 4194 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-stage.test.mjs` | 4244 | ACTIVE | referência estática em código/build/teste |
| `tests/hsin-waypoint-safety.test.mjs` | 1839 | ACTIVE | referência estática em código/build/teste |
| `tests/music-experimental-mode.test.mjs` | 1423 | ACTIVE | referência estática em código/build/teste |
| `tests/music-experimental-transition.test.mjs` | 1453 | ACTIVE | referência estática em código/build/teste |
| `tests/performance-route-isolation.test.mjs` | 1007 | ACTIVE | referência estática em código/build/teste |
| `tests/shorekeeper-private-r2.test.mjs` | 4553 | ACTIVE | referência estática em código/build/teste |
| `tests/shorekeeper-publication-smoke.test.mjs` | 873 | RESERVED | documentação, autoria, fonte ou QA; sem prova de descarte |
| `tsconfig.json` | 42 | ACTIVE | metadado, configuração ou entrada do projeto |
