# Benchmark R1 — evidências de antes/depois

**Distinção obrigatória:** o comparativo abaixo é **estático e determinístico** (referências no código HTML/AST), **não é** medição de rede, CWV, FPS ou GPU. A baseline pertence ao commit `f94f10bb7def9e7163f3184ea1572d74a950ecc8`; o 'depois' é a mudança proposta no PR R1.

| Item | Antes (`main`) | Depois (R1) | Evidência |
|---|---|---|---|
| Referência a `/scripts/scenes.js` no `/` | 1 | 1 | `BaseHead.astro`; os 10 Canvas continuam |
| Referência a `/scripts/scenes.js` em `/curiosidades/`, `/sophia/`, fallback 404 | 1 por página | 0 por página | Condição `hasLandingScenes` baseada em `Astro.url.pathname` |
| Bytes não comprimidos do arquivo de origem `scenes.js` | 98.326 | 98.326 | Arquivo preservado sem alteração |
| Bytes de script **referenciados desnecessariamente** nessas páginas (não comprimidos, por navegação fria isolada) | 98.326 | 0 | Estimativa estática baseada na referência; não equivale a Network.transferSize |
| Alterações em GLBs, rigs, Three.js, música | 0 | 0 | Sem mudanças nesses arquivos |
| Número de arquivos removidos | 0 | 0 | Nenhum asset deletado |

## Matriz a executar com preview R1

| Métrica | Antes | Depois | Estado |
|---|---|---|---|
| LCP / INP / CLS (Home, Curiosidades, Sophia, Música, 404) | — | — | NOT_TESTED |
| Requests / bytes comprimidos / JS coverage por rota | — | — | NOT_TESTED |
| Hsin primeiro frame / GLB boot / p50/p95 frame / FPS (mobile 30) | — | — | NOT_TESTED |
| Shorekeeper init e inspeção privada / reuse / teardown | — | — | NOT_TESTED |
| renderer.info calls/triangles/geometry/textures/programs | — | — | NOT_TESTED |
| JS heap / GPU memory / after 20 navegações | — | — | NOT_TESTED |
| Android real / Samsung Internet / save-data / background | — | — | NOT_TESTED |
| Cloudflare Pages/Workers preview / CSP / música externa | — | — | NOT_TESTED |
| GitHub Actions `main` pré-R1 | PASS | n/a | Execução anterior confirmada |
| CI deste PR / build e checks do commit R1 | n/a | PENDING | Checar run remoto após publicar PR |

## Procedimento reproduzível para continuação

1. Checkout da base fixa (não usar heads móveis), `npm ci --no-audit --no-fund && npm run check && npm run build`; registrar tamanhos de `dist/`, arquivos `_astro` e headers. Repetir na branch R1.
2. Subir `npm run preview` (ou preview da Cloudflare) e, com o mesmo viewport e aparelho, executar 5 navegações **frias** e 5 **quentes** por rota, cache/rede documentados. Armazenar HARs e relatório de coverage.
3. Medir Web Vitals e tempos de frame com PerformanceObserver / DevTools e na Hsin comparar `?hsin-metrics` com `renderer.info`. Não confundir tempo de CPU com GPU.
4. Para Shorekeeper, usar apenas GLB privado via File API autorizado. Repetir montar/desmontar, aba oculta, contexto perdido/restaurado e 20 navegações.
5. Validar `prefers-reduced-motion`, players, acessibilidade, 404, rede lenta e Samsung Internet. Preencher dados observados/percentis e marcar ausências como NOT_TESTED.

**Não é legítimo apresentar a remoção de uma referência de 98.326 bytes como economia medida de 98.326 bytes de tráfego: gzip/brotli, cache, Service Worker e headers ainda não foram medidos.**
