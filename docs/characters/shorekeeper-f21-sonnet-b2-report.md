# Shorekeeper F2.1 B · Rodada 2 · boca (B1) — relatório

Estado: **`B_SMILE_VISUAL_CANDIDATE`** · `B_VISUAL_QA_PENDING` (sem aprovação humana) · desempenho `PERFORMANCE_VISUAL_QA_PENDING`.
Base empilhada: PR #226 (`95f6fc8`). `main` intocada. Nenhum asset privado foi adicionado ao repositório.

## 1. O que mudou desde a Rodada 1

A Rodada 1 concluiu que o contorno "responde geometricamente". Faltava ver. Nesta rodada a boca foi renderizada em **WebGL2 real** (Chromium headless com SwiftShader, `stage.mjs`/`inspection.mjs`/`gentle-acting.mjs` do próprio repositório, GLB canônico `4f03b6fd…bc30` verificado) e comparada com os quadros dos GIFs originais. Isso não é GPU nem Samsung Internet: serve para forma e ordem de profundidade, não para desempenho nem para o shader final do jogo.

## 2. Causa do "fiozinho" (comprovada em render, não presumida)

1. O contorno de 52 vértices é uma **fita com quatro vértices por seção** (camadas externa/interna). Os morphs de sorriso (`M_Smile_L/R`, `P_M_L/R_Add`, `P_M_ZL/ZR_Add`, `M_Ennui_*`) movem só **alguns** vértices da camada externa na ponta (até ~3 mm). Os vizinhos de mesma seção ficam parados. A fita se rasga e resta um fio fino, solto, que sobe.
2. A ponta que sobe 3 mm **não avança em z**. A pele ao lado sobe em z ~0,46 mm por mm de y (ajuste local), então cobre a fita. É isso que a deixa fina em vez de grossa.
3. O forro vermelho dos lábios são ilhas separadas (UV V 0,93–0,99, ±13 mm). Elas **não respondem** aos morphs de sorriso e ficam retas sob o traço curvo, formando uma "segunda boca".
4. O lábio rosado é textura da pele. Não se move com geometria.
5. `HELLO` usa `M_OpenSmall`, que levanta só a camada externa do centro e deixa um arco fino flutuando acima do traço. `hello.gif` (0,8–3,97 s) mostra boca **fechada**.

Hipóteses descartadas pelos renders: alpha da Face recortando o contorno; mesh de boca extra visível; winding/normais (a visão de normais é idêntica à base).

## 3. Correção mínima: `mouth-ribbon-weld.mjs`

Em tempo de execução, sobre um **clone** da geometria da Face (buffers canônicos nunca editados; `restore()`/`dispose()` devolvem o original):

- preenche os deltas que faltam nos vizinhos da seção, interpolando os que já existem ao longo de |x| (apenas morphs unilaterais; morphs bilaterais e de abertura ficam intocados);
- aplica `lift = 0,6` em z por unidade de subida em y, para o traço passar por cima da bochecha;
- faz o forro labial seguir o traço na borda frontal, com queda suave em profundidade e além da ponta.

Ativação **opt-in**: `?mouthQA=1&mouthR2=1`. Sem o parâmetro, nada muda. Falha da solda não impede carregar o modelo (registra aviso).

Candidatas, com IDs distintos e sem sobrescrever a classificação anterior: `LITTLE_SMILE_R2_CANDIDATE`, `MY_STAR_R2_CANDIDATE`, `HELLO_R2_CANDIDATE` (sem `M_OpenSmall`). Os controles de base `*_V2` permanecem como estavam. Nenhuma candidata escreve `E_Close`.

## 4. Evidência (pacote privado, fora do repositório)

- Boca frontal e ¾, escala de celular e close, neutro × isolado × combinado, canônico × soldado.
- Sequências de 5,4 s (neutro → sorriso → **piscada bilateral** → retorno) lado a lado, canônico × soldado, mesma receita e mesmo tempo.
- Em celular, o canônico quase não mostra `LITTLE`, e `MY_STAR` mostra só um fio. Com a solda, `LITTLE` é um sorriso pequeno e `MY_STAR` é claramente maior, com piscada preservada.

## 5. Limites conhecidos (não escondidos)

- O traço continua **grosso e preto**; nos GIFs a linha é fina. É geometria do contorno com material de cor-base (sem SDF/shader do jogo). Não afinei a geometria.
- Há um pequeno **degrau** no traço perto de |x| ≈ 4 mm e uma borda clara do forro sob o canto em ¾.
- `E_Smile` mostra os cílios inferiores azulados já registrados antes (camada de pálpebras), igual com ou sem solda.
- Sem GPU: nenhuma medição de FPS/draw calls. `PERFORMANCE_VISUAL_QA_PENDING`.
- Pesos e candidatas não foram aprovados por ninguém. B2 (biblioteca única e nomes públicos) permanece **bloqueado** até decisão do usuário.
- Se a solda não bastar no shader real, o próximo passo é `FACIAL_ASSET_LIMITATION_CANDIDATE`: um corrective shape em variante isolada (precisa de autorização).

## 6. Testes

`tests/shorekeeper-mouth-weld.test.mjs` (9): detecção da ilha, preenchimento sem mutar a entrada, `lift` só para cima, morphs bilaterais/vazios ignorados, forro por profundidade, clone × buffers canônicos, `restore`/`dispose` idempotentes, falha sem efeito colateral, IDs R2 explícitos sem `E_Close`. Incluído no CI do Shorekeeper. São testes **estruturais**; `CI_PASS` não implica `VISUAL_PASS`.
