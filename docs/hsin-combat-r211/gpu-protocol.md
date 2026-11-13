# Validação em GPU física pelo proprietário

Registrar modelo do dispositivo, sistema, navegador, renderer WebGL, viewport, DPR aplicado, modo de energia, carga inicial e condição térmica observável. O software SwiftShader serve à inspeção visual e a contagens de objetos; não estabelece FPS, latência GPU ou desempenho no Samsung.

Executar o mesmo commit do relatório com cache frio e quente. Usar o palco com ?hsin-metrics para os tempos de CPU já disponíveis e renderer.info para draws/objetos. Registrar parse, compilação e primeira imagem separadamente. Se houver GPU timer query válida, registrar tempo GPU sem resultados disjoint; caso contrário, marcar indisponível.

| Intervalo | Percurso |
|---|---|
| 0–60 s | Idle e primeiro carregamento do combate; registrar primeira imagem e preparação. |
| 60–180 s | Três ciclos completos em câmera livre e três em automática; observar Basic 02 em 3,3–3,5 s e leitura facial. |
| 180–300 s | Interromper durante preparação, Basic 01, Basic 02, carga, liberação e recuperação. Reiniciar e pausar/retomar. |
| 300–420 s | Alternar paisagem/retrato, girar, zoom, pan e takeover durante a câmera automática. Observar pavilhão, mãos, face e VFX. |
| 420–540 s | Ocultar/mostrar a aba e sair/voltar da rota; repetir dez ciclos e verificar crescimento de recursos ou perda de contexto. |
| 540–600 s | Repetir o pior caso; anotar estabilidade de frame-time, aquecimento observável e estado final dos recursos. |

Comparar p50/p95 dos intervalos renderizados, long tasks, draws, triângulos, programas, geometrias e texturas antes/depois. O teto continua em 30 FPS e o DPR adaptativo do palco. O pool continua com 7 meshes, 4 geometrias, 5 materiais, sem texturas ou render targets novos. Uma queda persistente em relação à mesma cena em idle, crescimento de objetos por ciclo, salto ao reiniciar ou disputa de câmera exige investigação.

Aprovação artística e aceitação em dispositivo são decisões do proprietário. Conservar os dados brutos junto do commit medido.
