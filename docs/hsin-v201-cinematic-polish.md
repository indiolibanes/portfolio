# Hsin V2.0.1 — Acabamento cinematográfico e performance (PR C)

Status: **candidato**. Esta camada não adiciona feições visíveis novas; ela mede. Nada aqui aprova visualmente os gestos do PR B nem prova FPS (`WEBGL_VISUAL_QA_PENDING`).

## Instrumentação opt-in (`?hsin-metrics`)

- `src/scripts/hsin-stage-metrics.mjs`: janelas móveis de 240 amostras com média/p50/p95/máx na mesma janela; contador total separado de amostras na janela para `acting`, `sceneUpdate`, `render` e `frameInterval`; marcos únicos `stageStart → modelFetched → modelParsed → compiled → firstValidFrame`; contadores de `webglcontextlost/restored`. Lacunas > 1 s (pausa, aba oculta, perda de contexto) **não** contam como quadro lento.
- `src/scripts/hsin-stage.ts`: ganchos finos; desligado (padrão) cada chamada é um no-op e o laço paga um teste booleano. Sem UI, sem loop novo, sem rede, sem biblioteca nova. Ativado, expõe `window.__hsinMetrics = {report(), raw()}`; `report()` junta `renderer.info` (chamadas, triângulos, geometrias, texturas, programas), que conta trabalho submetido e objetos vivos, **não VRAM**.
- Tempos são CPU em milissegundos medidos em torno do trabalho; não são tempos de GPU.
- Teste: `tests/hsin-stage-metrics.test.mjs` (no-op desligado, percentis, marcos, lacunas excluídas, ligação opt-in sem UI nem laço extra).

## Benchmark de CPU do caminho quente de atuação (CI, indicativo)

`scripts/bench-hsin-acting.mjs`, rig real (823 ossos), Node 22.23.4 em runner do GitHub Actions (execução 41448059409, commit `76d47058`):

| Medida | µs/quadro |
| --- | --- |
| Reprodução do Lip Touch (18 ossos, slerp entre quadros) | 2,8 |
| Reprodução do Hair Caress | 2,8 |
| `scene.updateMatrixWorld` (rig completo, só quando a pose muda) | 208 |

Guarda do script: reprodução somada ≤ 0,25 ms/quadro (falha o CI se passar). **Isto não é medida de dispositivo, celular ou GPU**; o runner é uma CPU de servidor.

## Orçamentos preservados (verificados pelos testes existentes, sem alteração de contrato)

- GLB `hsin-v2.0.glb` intacto (9 873 744 bytes); teto de 30 FPS, relógio pausado/oculto/reduzido, DPR e orçamentos de pixels/câmera: `tests/hsin-stage.test.mjs` passa.
- Cenário V2.0.1 **refinado**: 12 meshes e 4.254 triângulos no cenário, teto estrutural estimado de 22 passes para cenário + personagem + fundo, 5 texturas WebP (~104.546 bytes comprimidos, ~10,0 MiB RGBA+mips estimados). Esses são resultados dos testes `hsin-lunar-refinement`/`hsin-lunar-terrace` e do relatório V2.0.1, não contagem real de `renderer.info`. Os números de 6 meshes / 298 triângulos / 54.752 bytes se referem apenas ao módulo minimalista legado `hsin-moonlit-environment.test.mjs` e **não** representam a cena pública completa. Nenhum passe, textura, luz ou render target novo foi adicionado pelo PR C.
- Simulação determinística de 600 s do V2 com restauração exata: passa. O perfil de atuação soma ~111 KB, carregado em paralelo e validado por hash.

## Fases 7 e 8 (cenário lunar e transição Música → Hsin)

Auditadas e **deixadas sem alteração**. A `main` já publica o palco lunar V2.0.1 e a transição (`706cc616`), cobertos por `hsin-lunar-terrace`, `hsin-lunar-refinement`, `hsin-moonlit-environment` e `music-experimental-*`, todos verdes neste PR. Como a única forma de provar uma melhoria seria olhar quadros em hardware real, e SwiftShader não decide estética, qualquer retoque aqui seria hipótese; o brief pede manter experimental o que não pode ser validado com segurança, então nada foi alterado.

## Limites reais

- Nenhum número de FPS, suavidade, memória de GPU ou tempo de carga em dispositivo foi medido. Para medir em hardware real: abrir `/experimentos/?hsin-metrics`, deixar rodar e ler `window.__hsinMetrics.report()` no console.
- Os tempos do CI não se extrapolam para celulares.
