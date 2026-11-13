# Modo imersivo — refinamento de supernova, START e propulsores · 2026-11-13

Branch: `polish/omega-supernova-lancamento`, a partir da `main` em `94562a0` (PR #298). Sem merge, sem deploy.

## O que mudou

| Item | Antes | Depois |
|---|---|---|
| **Supernova do Ω** (`SeriousModeToggle.astro`) | Brilho com `box-shadow` escalado 48× (blocos quadriculados visíveis), anel enorme e cortado, 600 ms de tela branca vazia e corte seco para a intro preta. Navegação por `setTimeout(1300)` fixo. | Sequência de 1,45 s: carga, implosão, pausa de tensão, explosão (núcleo, raios, flash e duas ondas, uma azul e uma quente) e dissolução em azul elétrico até o `#000` da intro. Só `transform`/`opacity`, sem sombra escalada. Navega no `animationend`, com timer de segurança. Corrige o overlay preso ao voltar pelo navegador (bfcache). |
| **START girando** (`sophia-start-wipe.ts`) | Interpolação linear entre 4 pontos: quase parado no primeiro terço, depois de 1,5× a 14,7× em 475 ms. | Curva pura `startWipeFrames`: impulso inicial sempre horário, giro que acelera até exatamente +360° e zoom exponencial (a palavra continua legível a meio caminho). Duração, véu opaco e modo de movimento reduzido iguais. |
| **Ignição** (`enginePower`) | Degrau de **0,22** em t=1,605 s (0,08 → 0,30): um "pop", não um acendimento. | Rampa contínua; mesmo platô (0,65) e mesmo valor no lançamento (1,0). |
| **Propulsores** (`thrusterFx`, diretor, base) | Pluma e luz sem variação; vapor constante. | Chama piloto fraca que "tropeça" antes da ignição, pulso brilhante ao pegar e outro ao liberar, assentamento em ~1 s e só cintilação em voo. Luz mais laranja em baixa potência. Vapor ligado à potência e à liberação, com envelope de entrada/saída. Movimento reduzido: chama estável e sem vapor (como antes). |

Tudo é função só do tempo ativo (`t`), então busca (`seek`) e replay continuam reproduzíveis.

## O que NÃO foi alterado, e por quê

**A corrida da Sophia até o foguete, o salto, a órbita de agarre e a subida do foguete** (`placeRider`, `gripStepAt`, curva de elevação). Essa coreografia é validada numericamente contra o modelo público de 46 MB (contato da palma, posição exata do assento, `riderSeatError < 1e-8`) e os gates G6–G9 de `immersive-r3-technical-notes.md` seguem em **QA visual pendente**. Sem o modelo e sem um frame renderizado, qualquer ajuste aqui seria às cegas e poderia quebrar o encaixe. Fica para a próxima rodada, com capturas.

## Verificação — o que foi feito de fato

- **Quadros reais no Chromium** (Playwright) da supernova e do START, congelados em instantes exatos, antes e depois, em 1280×720 e 390×844. Cobre a parte DOM/CSS por completo.
- **Teste de execução** da supernova com o código do componente extraído sem alteração: navega aos ~1,63 s (depois do fim da animação), o `animationend` do pseudo-elemento dispara e o overlay é limpo ao restaurar da bfcache.
- **`check:sophia` (parte executável)**: 41/41 testes (38 anteriores + 3 novos em `tests/sophia-r3-polish.test.mjs`). Contrato de UX 100/100.
- Sintaxe TypeScript dos três arquivos editados validada.

## Limites, ditos com clareza

- `tests/sophia-launch-director.test.mjs` e `tests/sophia-launch-cradle.test.mjs` **não rodaram**: exigem `three`, e o `npm ci` está bloqueado neste ambiente. Falham aqui por ambiente, já falhavam antes. **Rode-os localmente antes de aceitar a branch**: `npm ci && npm run check:sophia`.
- A parte 3D editada (`sophia-launch-director.ts`, `sophia-vertical-pad.ts`) **não foi executada**: só a lógica pura foi testada. A aparência real de chama, luz e vapor está **sem prova visual**.
- Nenhum quadro WebGL foi obtido. Nada aqui conta como aprovação artística nem como medição em celular de entrada.
- O flash da supernova é único, sobe em ~0,3 s e some em ~0,8 s. Não foi feita avaliação formal de fotossensibilidade; com movimento reduzido a sequência nem aparece (a navegação é direta).

## Como revisar visualmente

1. `npm run dev`; na home, clique no Ω (desktop e 390×640) e confira a sequência até a intro preta; use o botão voltar do navegador e confirme que não sobra overlay.
2. Em `/modo-imersivo/?launchQA=1`, depois de carregar o modelo, `window.__SOPHIA_LAUNCH_QA__.seek(t)` com t = 0.9, 1.5, 1.62, 1.75, 2.1, 5.1, 7.1, 7.3, 7.6 e 12: confira a chama piloto, o pulso de ignição, o vapor e a pluma em voo. Repita com movimento reduzido.
3. Clique em START e observe o giro (horário, legível, sem rachaduras no véu).

Reverter: `git revert` do commit desta branch; nenhum dado, modelo ou política foi tocado.
