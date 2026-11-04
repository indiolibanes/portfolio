# R5 — medições e limites

Classe: CPU compartilhada / Chromium 153 WebGL2 ANGLE Vulkan **SwiftShader Subzero**. Não é GPU física ou Android. Node 24.22.1. Campanhas concorrentes de rasterização geram contenção; estes números não são benchmark isolado ou promessa de FPS móvel.

## Preparação real

Baseline do código #234/e7, entrada canônica/bibliotecas reais: ORIGINAL 1929.0 ms, REBASED 1773.3 ms, ROOT_BODY_OWNED 1809.7 ms. R5 usa tarefas cooperativas; trabalho total e unidades atômicas são separados da latência de clique. Compare arquiteturas e registros, sem atribuir diferenças totais apenas ao código em host compartilhado.

| R5 Root | Wall ms | Work ms | Maior slice ms | Slices |
|---|---:|---:|---:|---:|
| ORIGINAL | 1633.0 | 1324.1 | 51.7 | 102 |
| REBASED | 1468.9 | 1243.1 | 36.4 | 101 |
| ROOT_BODY_OWNED | 1464.1 | 1170.5 | 48.0 | 96 |

Cache quente CPU: 0.0221 ms; navegador: cached=True, 0 ms (resolução do timer). Cache depende de modelo/biblioteca/Root/ponte. Abort/finally e rejeição stale passaram.

No clique real da UI, handler 21.1 ms. Plano frio: wall 1365.7 ms, work 962.7 ms, maior slice 51.8 ms, 88 tarefas. Long tasks observadas: [{"duration": 51, "startTime": 45025}]. Incluem a janela de preparo testada, não toda a sessão. Orçamento 4/6 ms cede entre unidades, não garante teto rígido; clone/binding continua indivisível. Medir no Samsung antes de promoção.

## RAF, memória e draws

Offscreen: callbacks 38→38, pending false. Uma única RAF pendente máxima 1; zero após dispose. Pausa estabiliza redraws/corpo; retomada reinicia relógio sem catch-up. Três recargas após alocação renderizada: [(13, 14), (13, 14), (13, 14)] (geometrias,texturas); isso não mede VRAM ou heap total.

Cena VFX: 6–22 draw calls reais conforme sistemas visíveis. Máximo adicional de referência: 14; 18/8 borboletas, 40/12 Core, 320/110 estrelas+motes. DPR/pixel cap e FPS cap preservados. CPU recente do update VFX está em cada captura; não inclui custo de rasterização. Vídeos: 30 FPS **amostrados**, não FPS sustentado. Encoding/contagem de frames verificados por ffprobe.

Lifecycle real passou: 8 verificações de câmera sem GLB, reduced-motion estático, cancelamentos por Root/modo/biblioteca/contexto/dispose e cache quente. Fallback sem WebGL passou. bfcache: **UNAVAILABLE_IN_THIS_BROWSER_RUN**, tentativa HTTP real com razões CDP BrowsingInstanceNotSwapped / BackForwardCacheDisabledForDelegate. Não se aprovou por simulação de eventos.

## Pendências externas

GPU desktop 600 s, Samsung Internet físico 600 s, frame time p50/p95 no aparelho, throttling, estabilidade prolongada, bateria/temperatura/VRAM: **NOT_TESTED_ON_DEVICE / PERFORMANCE_PENDING**. Viewport 390×640 é emulação de dimensão, não Samsung. Seguir o protocolo de dispositivos e anexar renderer/versões/resolução/DPR/energia e logs reais. Aceite artístico humano e release continuam separados e não concedidos.
