# Shorekeeper R6.3 — rosto unificado / dueto Hsin / transferência Work

**Base exata:** PR #258 (`experiment/shorekeeper-r6-g113-manual-bridge-20261106`, commit `c30936635a4696812d0858c85499525ca5c0e051`). R6.3: branch `experiment/shorekeeper-r63-unified-face-duo-20261107`. PR draft empilhado; **não mergear** na main sem aprovação.

## Sintomas do usuário

- Menu facial com oito candidatas R6, 16 receitas anteriores, galeria aprovada de sete e cinco+ três testes faciais adicionais; escolhas indistintas e repetidas.
- Falta de olhar claramente arregalado/assustado, distinto de `SURPRISE_SOFT`.
- Em `/experimentos/duo/`, Shorekeeper carregava muito lentamente, ocupava espaço da Hsin e não reconhecia reprodução musical, executando apenas três idles.
- Player musical invadia espaço de personagem; preferência temporária: posição superior direita, perto da lua.

## Correções implementadas

**Rosto.** `facial-unified-menu.mjs`: um menu visível principal de **nove** entradas R6 (oito existentes + `EYES_WIDE_ACTING_R6`) e **16 receitas históricas** em dois grupos ocultos até clicar "Mostrar versões anteriores". Sete históricas são da galeria manual aprovada; não são duplicadas como botões. Contorno R5 reversível permanece inicial no modo R6/G11.3; Original/R2/R3/R4/R5 permanecem como QA dentro de "Geometria da boca", recolhido. O controlador histórico R6 facial continua sendo o único proprietário Face/Eye. R6 e histórico usam a mesma UI mas despacham para `playCandidate` e `playBaseline` respectivamente.

**Olhos arregalados.** `anatomical-face.mjs`: `EYES_WIDE_ACTING_R6` baseia-se nos canais de `SURPRISE_SOFT` (sobrancelha elevada, `E_Stare`, abertura oral), com `E_Stare` elevado da base 0,6 para 0,85, sem substituir a receita antiga, sem tocar em `E_Close`. **CANDIDATA / WEBGL_VISUAL_QA_PENDING**, nunca chamada de expressão original autêntica, nem ativada automaticamente.

**Carregamento.** `s6-duet-guest.mjs`: quando o modo `?r6Guest=1` está ativo, verifica manifesto autenticado e SHA canônico F2.0-A, depois carrega somente o GLB canônico. Desnecessário buscar Basic/Advanced/Burst nesse modo (nenhum desses clipes é reproduzido na contemplação); modo S6/D original sem flag preserva seu gate de três bibliotecas. IndexedDB: após autorização via manifesto, aceita uma cópia privada local **somente** se tamanho e SHA-256 de bytes conferirem; caso contrário, baixa pelo endpoint autenticado. Nenhuma credencial/URL pública/asset novo no Git. **Benchmark de economia de rede e tempo real ainda pendente**.

**Espaçamento.** `hsin-stage.ts`: posicionamento inicial de convidada x=1,7 m; após load, calcula os bounding boxes *mundiais* das duas personagens, impõe pelo menos 0,52 m de separação de suas projeções X nas poses atuais, deriva envelope conjunto e recalcula fit da câmera em retrato/paisagem e reset. **Não é teste de colisão de cabelo, fitas ou movimentos ao longo do tempo; QA visual obrigatório.**

**Música.** `hsin-music-state.mjs` já fornece `musicForStage(stage).sample()`, estados `playing/paused/buffering/no_music` e `playbackConfirmed`. O guest agora recebe esse estado por frame, reporta `PLAYING_CONFIRMED/PAUSED/BUFFERING/NO_MUSIC`, e a interface indica reconhecimento de fonte realmente reproduzindo. Não se interpreta seleção de provedor como Play, e não se falsifica beat tracking. A Shorekeeper **ainda executa os idles**: não há na biblioteca carregada uma coreografia dança music-aware certificada. **Implementar dança é a próxima tarefa, não resultado desta PR.** Sem autoplay experimental R6/G7.

**Widget.** No dueto, player HTML oficial está numa área superior direita; o pavilhão tridimensional adicional não é criado (menos draws e sem sobrepor malhas). O solo Hsin não muda. CSS isolado em `src/styles/shorekeeper-duo.css`. Embeds YouTube/Spotify continuam nativos; nada escala/reproduz mídia em outro renderer.

## Arquivos alterados mais importantes

`src/scripts/shorekeeper/anatomical-face.mjs`
`src/scripts/shorekeeper/facial-unified-menu.mjs`
`src/pages/experimentos/sk/index.astro`
`src/scripts/shorekeeper-sk-lab.mjs`
`src/scripts/shorekeeper/s6-duet-guest.mjs`
`src/scripts/hsin-stage.ts`
`src/pages/experimentos/duo/index.astro`
`src/styles/shorekeeper-duo.css`
`tests/shorekeeper-r63-menu-duet.test.mjs`

## Regras e QA

- Hsin solo /experimentos/ e `main` preservados; PR draft sem merge automático.
- Os três idles, blink bilateral, R5 e R6 existentes, oito movimentos de combate, Burst e modelos privados não sofrem reexport/reescrita.
- R5 é reparo geométrico **em clone reversível**, não novo GLB/R2.
- Segurança: `SHOREKEEPER_ASSETS_R2`, Cloudflare Access e endpoints autenticados continuam exigidos. Sem mais permissões para revisar código.
- G7: `NO_GO`; não habilitar agendamento emocional automático.
- Testar: WebGL real e Samsung Internet, câmera de retrato/paisagem, extremos de idle, cabelos/fitas, 9 expressões, piscar, neutral, troca Original/R5, busca de modelos autorizada, música YouTube confirmada, Spotify (se confirmar), sem música, pause, hidden, context loss, teardown, comparação fria/quente de carregamento, estado sem acesso e R2 incompleto.
- Estabelecer resultados por logs, snapshots e duração medida, não por descrição de status. Antes de declarar apto para integração, verificar todos os workflows no head.

## Próxima etapa recomendada para Work na outra conta

1. Reproduzir o dueto em Android e desktop: medir Network Waterfall com/sem cache (quantidade de bytes de modelo, bibliotecas, JS, texturas), TTFP guest, GPU frame time e peak memory.
2. Ajustar enquadramento e espaçamento com bounding boxes temporalmente amostradas (cabelo/roupa), não apenas pose neutra; player no alto direito **não deve** ocultar rostos, lua ou botões em paisagem/retrato.
3. Música: documentar o contrato de estados disponível, pesquisar assets de dança genuína ou desenhar **uma coreografia autoral independente**, apenas após permissão, com antecipação, frases corporais, transições e recuperação. Nunca afirmar sincronização exata por beat sem telemetria real. Não usar `Skill/Burst` como dança substituta. Uma prova curta em PR separado é preferível a improvisar 30 sequências.
4. Revalidar R6 olhos arregalados no modelo F2.0-A com R5; examinar iris/oclusão e linha oral; preservar Surprise Soft e approved baselines.
5. Manter não regressão da Hsin e da SK; não alterar segurança, R2, main ou publicar GLB.

**Dados privados que o executor externo precisará, caso não tenha Cloudflare Access:** GLB canônico F2.0-A SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`, bibliotecas privadas apenas se o trabalho novo usar combate, e capturas reais da cena (idealmente Samsung Internet). Nunca colocar binários em Git, PR ou site estático público. 
