# Portfolio performance — R2 backlog (não implementado)

Priorização posterior à R1; cada item depende de profiling, QA e aprovação de personagem.

| Ordem | Tema | Hipótese e próximos passos | Condição de aceite |
|---|---|---|---|
| 1 | Rede e bundles | Comparar `dist/` por rota, CSS coverage, import graphs e requests. Identificar se `Three.js` aparece fora dos experimentos. | Manifesto antes/depois + zero vazamento de Three/GLB em páginas editoriais |
| 2 | Hsin #194/#195 | Perfilar p95 frame-time, draw calls, clusters de transparência, sombras, runtime do pavilhão, players, listeners e cache de texturas. | Nada de perda de atuação; 30 FPS mobile estáveis |
| 3 | Shorekeeper #182 | Perfilar File API, morphs/skeletons, atualização de matrizes e descartes, 20 entradas/saídas. **Inspecionar `frame(now)`: rAF é reagendado antes do teste de suspensão e `stage.draw()` roda também em idle. Propor dirty rendering e pausa do scheduler quando seguro.** | Sem leaks comprovados, sem regressão facial/rig e reativação correta do canvas |
| 4 | DPR adaptativo | Introduzir hysteresis baseada em frame-time e proteção contra oscilação, respeitando limites de pixels. | Ganho visualmente validado no Android; controles restauráveis |
| 5 | Canvas 2D landing | Avaliar limite de FPS para efeitos fora de foco, degradação proporcional e respeitar reduced motion. | Preservar 10 cenas e composição original |
| 6 | CSS crítico | Separar CSS por rota/componente com cobertura real e análise de cascata. | Sem mudanças de tipografia/modos 1998/editorial |
| 7 | Assets grandes | Avaliar versões alternativas AVIF/WebP, poster e preview; proteger GLBs da Sophia e da Hsin. | Redução verificada de transferSize sem perder qualidade |
| 8 | GLB compression | Testar Meshopt/Draco/KTX2 somente em cópia candidata, mantendo rigs/morphs e comparativo visual; nenhum swap automático. | Visual QA aprovada em desktop e Android |
| 9 | Players | Confirmar teardown de Spotify/YouTube/iframe e ausência de autoplay sem ação; dança só quando autorizada. | Sem estado musical regressivo |
| 10 | Clean repo | Buscar referências em heads ativos, histórico e runtime antes de confirmar órfãos. | Só apagar CONFIRMED_UNUSED, com rollback e PR próprio |

## Guardrails

Não fazer merge automático; não cherrypickar Hsin/Shorekeeper na R1; não trocar modelos; não introduzir placeholders de benchmark; entregar PRs pequenos e rastreáveis; separar ganhos comprovados de hipóteses.
