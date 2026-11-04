# Shorekeeper — preflight R6: decisões humanas e bloqueio de aliases

Base: R5 PR #235, head de referência `7445443ac2f1b83e6ca837681b05589b4ae7943a`. Esta documentação nasce de feedback humano explícito de 04/11/2026. **Não é liberação para scheduler, merge ou alteração de presets já aprovados.**

## Aprovações por aparência

| Nome apresentado | Decisão humana | Ação requerida |
|---|---|---|
| Little smile V2 | APROVADO | Preservar arco assimétrico para a esquerda, pequena resposta do queixo e duração; bloquear substituição automática por R2/R3 |
| My star V2 | APROVADO | Preservar sorriso amplo e fechamento parcial genuíno das pálpebras |
| Sorrisinho R2 / R3 | Válidos mas menos expressivos; equivalentes entre si | Manter apenas uma variante separada, intitulada *Esboço de sorriso*, depois de comprovação de equivalência |
| My star R2 | Considerada duplicata de V2 | Não promover como versão principal; arquivar depois de comparação |
| My star R3 com olhos originais | Intermediário opcional | Não promovido; decidir pela utilidade no acting |
| My star R3 com olhos suaves | APROVADO como estado intermediário | Rotular *Afeto crescente*, antes de Minha estrela completa |
| Olá R2 | APROVADO | Preservar olhos parcialmente cerrados e sorriso central |
| Olá fechada / entreaberta | Relatadas como versões equivalentes a R2 | Não publicar duplicatas; confrontar pesos e capturas antes de excluir |
| Ternura | APROVADA | Manter retorno espontâneo ao neutro após alguns segundos |
| Olá original | EM REVISÃO | Boca aberta pode representar saudação falada; não equiparar à Olá R2 |
| Serenidade | APROVADA, favorita do autor | Preservar sorriso sutil e olhos fechados |
| Surpresa | APROVADA | Não modificar a expressão aparente |
| Preocupação | REFINAR | Preservar sobrancelhas; investigar visual de duas bocas/forro |
| Olhar lateral | REFINAR | Direção para ambos os lados e retorno ao neutro |

## Contrato de congelamento

1. Antes de editar, capture GLB SHA-256, nome exato da receita, matriz de pesos, geometria candidata, viewport, câmera, iluminação, material, versão de shader, estado dos idles e clip de blink.
2. A expressão visualmente aprovada precisa de comparação A/B nas três câmeras. O usuário aprovou a aparência vista, **não** qualquer mapeamento teórico de um ID de receita a todas as geometrias (R2/R3/R4/R5).
3. Trate `RECIPES`, `MOUTH_QA_RECIPES`, `EXPRESSION_LIBRARY`, `GENTLE_MORPHS` e `FACIAL_VALIDATION` como camadas distintas; nomes iguais não comprovam curvas, bind nem mesma face.
4. `E_Close` e ciclo de piscar continuam de responsabilidade ocular. Combate continua dono exclusivo do corpo. Nenhum segundo writer para os mesmos morph targets.
5. Não associar cegamente `LOVE` a Ternura ou `HOPE` a Serenidade: confirmar receita efetivamente exibida no QA.
6. `EXPRESSION_RELEASE_PLAN.active` e `releaseReady` permanecem falsos, e as listas de aliases ficam vazias até a seleção formal.
7. Conteúdo de GLB, vídeo, referência do jogo e respostas privadas não entram no repositório; somente receitas autorais, testes sintéticos e documentação não sensível.

## Primeira missão de R6

Gerar inventário de todos os morphs disponíveis do GLB canônico e sua cobertura por mesh. Categorizar:
- sobrancelhas e testa (`B_*`);
- bochechas e sulcos nasolabiais (verificar o comportamento real dos `C_*`);
- boca, linha, forro e abertura (`M_*`/`P_M_*`);
- pálpebras e canal de blink (`E_*`, `E_Close`);
- pupilas/íris e mudanças de olhar (`Pupil_*`);
- nariz e queixo: **só identificar canais com prova de deslocamento anatômico real**; não inferir pela nomenclatura.

Para cada canal: geometria, magnitude espacial, pixels em 0/.25/.5/.75/1, sobreposição com outros morphs, limites de oclusão e owner em runtime. Construir coativação de baixa amplitude e testes de compatibilidade sem reescrever shapes aprovados.

## R7

Apenas após sign-off dos gestos compostos: microexpressões orquestradas, estado/continuidade emocional, alternância de olhar bilateral, antecipação, assimetrias, timers não periódicos, idle e combate. Nunca transformar aprovação estática em autorização de autoplay.

## Decisão de publicação

É possível disponibilizar o laboratório experimental com feature flags e assets privados após auditoria de integração da cadeia #233→#234→#235. Não promove a biblioteca facial nem variantes Root pendentes. Prefira um único PR de integração para main, quando autorizado; a existência deste draft não efetua merge.
