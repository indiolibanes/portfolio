# Baseline e protocolo de comparação

| Grandeza | Evidência da base | Medição na candidata |
|---|---|---|
| Bytes do arquivo | GLB 9.873.744; acting 108.485; dança R2 511.505 (89.404 gzip, 51.757 Brotli em microbench) | Resource Timing: transferSize e encodedBodySize por URL em cache frio/quente. Um arquivo em disco não mede a rede. |
| Parsing / decode | R2 histórico Node: JSON 1,325 ms; parse+decode 9,262 ms | Marcar separadamente GLTFLoader, imagens, JSON e decode dos bakes no navegador. |
| CPU do frame | R2 Node: diretor + pose 0,0132 ms; matrizes 0,1049 ms | Com ?hsin-metrics, p50/p95 acting, sceneUpdate e submissão render, 3 percursos equivalentes idle → golpe → recuperação. |
| Compilação / primeira imagem | compileAsync precede ready; métricas registram compiled e firstValidFrame | Registrar carregamento → parse → compile → primeira imagem real e posição do poster em navegação fria. |
| GPU e memória | Sem medida de GPU desta sequência | Registrar renderer.info (calls, triângulos, programas, geometrias, texturas). Se disponível medir timer query sem disjoint; marcar indisponível de outro modo. |
| Samsung | Sem sessão física desta candidata | Registrar aparelho, navegador, DPR, resolução, energia/temperatura observável. Percurso 600 s incluindo drag, zoom, pausa, background, cancelamento e reentrada. |

Fonte dos números Node: docs/hsin-dance-r2-benchmark.json. Orçamento público: teto 30 FPS, DPR touch 1 / desktop 1,25 e 1.152.000 pixels. O intervalo nominal é 33,33 ms. Proposta para a primeira fatia: uma instância de anel, até uma chamada adicional, zero novas texturas ou render targets. Comparar p95 e contagem de recursos após dez ciclos com o idle nas mesmas condições. Queda persistente de ritmo ou crescimento por ciclo impede promoção; documentar os deltas medidos antes de fixar teto de GPU. Manter assets de combate lazy, sem Rapier ou scan de vértices no runtime.
