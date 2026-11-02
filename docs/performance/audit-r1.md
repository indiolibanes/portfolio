# Portfolio Performance Audit R1 — achados e decisões

**Escopo de intervenção deste PR:** carregamento global do motor Canvas 2D da landing; teste de contrato de rotas; inventário e documentação. **Escopo não modificado:** Three.js, GLBs, atuação/rigs, pavilhão, música, rotas e navegação de laboratórios.

## Resultados por prioridade

| ID | Prioridade | Evidência | Conduta R1 | Situação |
|---|---|---|---|---|
| P01 | Alta | `BaseHead.astro` referenciava `/scripts/scenes.js` globalmente, mas apenas `src/pages/index.astro` usa `data-scene`. | Restringir a referência ao caminho `/`; manter a implementação e a aparência das dez cenas. | FIXED_IN_SOURCE, NETWORK_QA_PENDING |
| P02 | Alta | O portfólio público tem páginas e layouts separados de `HsinStageLayout.astro`; Hsin depende de Three.js. | Não mover imports nem alterar os laboratórios ativos; manter isolamento e auditar bundles reais em R2. | SOURCE_INSPECTED |
| P03 | Alta | Hsin #194/#195 e Shorekeeper #182 ainda se desenvolvem fora da `main`. | Nenhum cherry-pick, rename ou merge para inclusão artificial. Auditar cada head isoladamente após estabilizar. | BLOCKED_BY_PARALLEL_DEVELOPMENT |
| P04 | Média | Limites de DPR e 30 FPS configurados na Hsin; métricas opt-in já existem. | Preservar; falta medição real sob carga, aparelhos e entrada/saída. | BROWSER_NOT_TESTED |
| P05 | Média | Os dois arquivos Sophia GLB somam 37.850.384 bytes de origem e têm objetivos/versões distintos. | Preservar; não há prova de desuso nem substituibilidade. | RESERVED/ACTIVE |
| P06 | Média | `public/scripts/scenes.js` contém um rAF comum aos Canvas e lógica de visibilidade/movimento reduzido. | Evitar refactor de animação sem perfil de frame-time; verificar 2D mobile em R2. | OBSERVED |
| P07 | Média | Build gera imagens/OG antes do Astro. | Medir tempo incremental e efeitos dos scripts antes de cachear outputs. | NOT_TESTED |
| P08 | Média | `src/layouts/BaseLayout.astro` importa muitos módulos CSS globais. | Mapear CSS coverage por rota no navegador antes de dividir estilos. | NOT_TESTED |
| P09 | Baixa | Dois paths SVG Phrolova têm blob SHA idêntico na árvore: `assets/phrolova/crimson-baton-vector-draft.svg` e `public/assets/phrolova/crimson-baton.svg`. | Classificar como POSSIBLY_UNUSED/duplicado de origem, **não** excluir. | DOCUMENTED |

## Análise 3D por componente

### Hsin (main / PR #194 / PR #195)

O código-base tem `createStageLoop`, `pixelRatio` e `createStageMetrics`; o PR #195 adiciona dinâmica musical e pavilhão H₂ sobre a #194. Não há confirmação nesta rodada de draw calls, frame times em Android, carga/destruição do YouTube/Spotify, presença de mais de um loop real nem perdas de GPU. **Nenhuma afirmação de ausência de leaks**. Para a próxima rodada, verificar `performance.now()`, `?hsin-metrics`, `renderer.info`, `document.visibilityState`, observer do canvas, loops do player e Memory após 20 visitas.

### Shorekeeper (branch do PR #182)

A cadeia de branches contém `shorekeeper-sk-lab.mjs`, módulos `shorekeeper/{stage,inspection,local-model,director}.mjs`, UI `/experimentos/sk/` e carregamento privado pela File API; nada disso aparece como rota na `main` consultada. Executar QA com GLB local autorizado, especialmente listeners, observers, decomposição de resources e cenas após troca de abas. **NOT_TESTED** aqui; não declarar funcionalidade aprovada no Chrome/Samsung Internet sem evidência.

#### Descoberta adicional — scheduler da Shorekeeper (source finding)

Na branch `experiment/shorekeeper-f15-private-runtime-2026-11-02@580deae49860fdcd0350789be69f42f4b17836ee`, `src/scripts/shorekeeper-sk-lab.mjs`, função `frame(now)` (~linha 103), solicita `requestAnimationFrame(frame)` **antes** de verificar `document.hidden || suspended || state.contextLost || !stage`. Assim, o scheduler permanece ativo quando `suspended` for verdadeiro em aba visível; com a cena ativa, `stage.draw()` é chamado após o limitador de FPS mesmo quando `director.state.phase==='idle'`. **Evidência estática de trabalho potencialmente redundante, sem quantificação de CPU/GPU**. A correção pertence a uma revisão da branch da Shorekeeper, preservando o modo de inspeção e reativação na interação, e exige testes de pausa, contexto, entrada/saída e gestos. Não editar esse runtime neste PR.

### Phrolova e Sophia

`assets/phrolova/` e `public/experimental/sophia-*.glb` permanecem intocados. Não deduzir desuso a partir de ausência de import literal, pois há paths runtime, versões de personagem e trabalhos paralelos.

## Integridade e riscos

- `BaseHead` mantém os outros scripts e metadados; o runtime 2D é carregado apenas quando há as cenas da landing.
- Risco residual: nova página passar a usar `data-scene` sem tornar o runtime disponível. O teste `check:performance` cobre as páginas atuais.
- O site usa `output:'static'` com Pages Functions. O comportamento de CSP, Cloudflare redirects, assets/fallback 404, players e reduced motion permanece pendente de validação em preview real.
- Não executar limpeza destrutiva, alterações de dependências nem compressões GLB nesta revisão.

## Evidências de qualidade

- Baseline do CI `main`: concluída com sucesso em GitHub Actions (ver `baseline-r1.md`).
- Código e teste adicionados nesta branch: inspeção por API de arquivos; **execução local indisponível**.
- CI desta branch: consultar workflow `Portfolio build` vinculado ao novo commit/PR; nunca confundir com a baseline.
- Browser/Android/QA visual/benchmarks: **NOT_TESTED**.
