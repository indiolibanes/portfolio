# Shorekeeper R6.5 — Painel facial R5/R6 e palco compartilhado lunar

**Referência:** PR #260 R6.4, commit `e51b384232f0db46adeeebe82106a8a9948336e5`. Este incremento é um **PR draft empilhado sobre #260**. Não fazer merge automático, não alterar main.

## Por que simplificar

A R6.4 possui nove atuações R6 e 16 receitas faciais anteriores na UI. Para o usuário, o seletor com caixas e vários painéis duplicados dificulta comparação direta. A preferência aprovada pelo autor é **painel de 20+ botões**, mesmo que sejam muitas opções, desde que cada botão represente um estado distinto.

A correção de contorno R5 é geométrica e reversível, não uma geração de atuação. A R6 é uma família de atuações. Uma receita histórica V2/R2/R3 pode continuar artisticamente distinta sob geometria R5, se seus morphs ou tempos diferirem. Não confundir "mesmo nome" com "mesma animação" sem analisar sua curva e a geometria usada.

## Catálogo de apresentação

**23 botões diretos**, agrupados por significado: 9 atuações R6 + 7 aparências aprovadas + 7 receitas históricas com pesos ou tempos próprios.

Dois casos verificados em `facial-variant-catalog.mjs` são equivalentes **apenas quando a geometria R5 é a mesma**:

- `LITTLE_SMILE_R2_CANDIDATE` ≡ `LITTLE_SMILE_R3_CANDIDATE` (pesos e tempos idênticos, geometria R2/R3 histórica diferente)
- `HELLO_R2_CANDIDATE` ≡ `HELLO_R3_CLOSED` (mesmos pesos e tempos, geometria R2/R3 histórica diferente)

Se a geometria muda, deixam de ser necessariamente equivalentes; por isso os dois originais continuam no código e acessíveis para comparação na QA técnica.

**Nunca deduplicar:** `MY_STAR_V2` vs `MY_STAR_R2_CANDIDATE` (timing); `MY_STAR_R3_EYES_SOFT` vs outros My Star (pálpebras); `HELLO_R3_OPEN` vs Olá fechada (M_OpenSmall); SURPRISE_SOFT vs EYES_WIDE_ACTING_R6. O inventário não afirma que uma expressão R6 e a histórica aprovada sejam visualmente idênticas apenas porque usam a mesma fonte-base: R6 aplica acentos e sequências próprias.

**UI:** `/experimentos/sk/?r61=1&r62=s5&r6Stage=1`. R5 continua padrão e sua seleção histórica fica oculta, disponível **somente** por `&legacyQA=1`. A área de Expressões exibe um único painel de botões. As antigas superfícies continuam no DOM apenas para rollback e diagnóstico, mas permanecem escondidas neste modo. A piscada e Neutro têm botões próprios.

## Hsin + Shorekeeper — Lua e pavilhão

**UI:** `/experimentos/duo/?r6Guest=1`.

A R6.4 já criou prefetch autorizado e cancelável de F2.0-A, carregamento somente do modelo para três idles e um enquadramento dos oito cantos do volume conjunto. A R6.5 **não modifica** essas regras.

A R6.5 restaura o pavilhão **tridimensional** usado no solo Hsin por `createMusicTower` com `duetMode:true` na mesma cena, sem outro renderer, timer, luz ou RAF. Modo dueto: geometria arquitetônica pequena, agrupada em batched meshes; movimento suave restrito; ancoragem fixa na porção **alta-direita do canvas** acima das silhuetas. O display nativo HTML de música mantém o tamanho atual e sua posição superior-direita no espaço reservado ao lado do canvas, para impedir que a caixa do YouTube/Spotify cubra os rostos. O solo Hsin e sua política completa de movimento do pavilhão não são alterados.

A Lua em `moonlit.group`, **somente no dueto**, recebe multiplicador geométrico **2,05×** e deslocamento vertical de +1,3 unidade, permanecendo atrás das personagens. Seu shader recebe `lunarBrightness=.69`; o halo é ampliado e reduzido a `opacity=.12`. A lua continua estática, sem novos render targets, shaders de bloom, passes ou luzes que ofusquem a face. O shader do modo solo tem `lunarBrightness=1` (mesma aparência histórica).

**Limitações:** posicionamento visual exato em widescreen/retrato, clipping, contraste aparente, FPS e se a 3D arquitetura se alinha visualmente com o display HTML dependem de QA WebGL física. O pavilhão 3D aparece no canvas ao lado da caixa nativa; ele não embute um iframe em textura WebGL. Eventual alinhamento visual mais fiel requer projetar os bounds da caixa e ajustar juntos.

## Testes e direitos

- Rodar `node --test tests/shorekeeper-r65-panel-moon.test.mjs` e as regressões R6/R6.3/R6.4.
- Verificar `npm run check`, `npm run build`, suíte de Hsin.
- QA real em Samsung Internet 832×384 e 390×844, mais desktop: 23 botões acessíveis, R5 correto, 3 idles/piscada, olhos arregalados, Moon, volumetric pavilion, player nativo, fit e no-overlay dos rostos.
- Guardar baselines e vídeos A/B antes de aprovar esteticamente.
- **CHOREOGRAPHY_PENDING**: R6.4 reconhece o estado da música, não dança automaticamente com fidelidade demonstrada.
- **G7 NO_GO** continua vigente. Nada de emoções autônomas, second writer ou importação automática de assets de combate.
- R2 permanece intacto. GLB canônico `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30` sem modificações.

**Rollback:** abrir a prévia #260. Nenhum arquivo de modelo privado foi modificado ou publicado.
