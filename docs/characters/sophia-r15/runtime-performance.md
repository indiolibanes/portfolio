# Runtime, atores e desempenho

## Correções executadas

- Laboratório usa `Sophia_ExpressionFlow_R6`. Nome inexistente agora emite `sophia:actor-error` com `MISSING_CLIP`, diagnóstico no console e reserva explícita `Sophia_Expr_Seria_R6`; falta da reserva aciona o fallback 2D. Não há seleção silenciosa.
- A mutação de `data-motion-playing` volta a agendar o RAF; ocultação da página, saída da viewport e preferências interrompem o laço. BFCache pausa/retoma; teardown remove canvases/observadores e recursos GPU. Fades interrompidos conservam a mistura corrente e descartam camadas de peso zero.
- Um fetch/GLB e renderizador compartilhados. Dados imutáveis de clipes compartilhados por WeakMap; matrizes, pesos faciais, tempo e camadas continuam individuais. Context loss volta ao 2D, restauração reconstrói os recursos usando os bytes em cache. Cobertura de API simulada, restauração real de driver pendente.
- Acessores normalizados esparsos respeitam offset do subarray e sobrepõem a base densa. Morphs POSITION/NORMAL densos ou esparsos usam deltas compactados e faixa suja. Uniformes GPU de Blush/Tears agora seguem seus nós, mesmo com máscaras iguais. O caminho legado de até quatro morphs e `morphOverride` foi mantido.
- Depth writing é reativado antes do clear. Blending e ordenação existentes foram preservados; descarte explícito de buffers/texturas/VAOs/programa e proteção contra alocação tardia após decode descartado. Sem alegação de correção visual completa de transparência.
- DPR limitado a 1,5 (antes 2), máximo de agendamento 30 quadros/s. São limites configurados, não medição de FPS. Câmeras, escala e yaw preservados.
- Texto acessível do laboratório descreve Sophia observando, pois livro/caneta permanecem ocultos.
- Playwright 1.65.1 registrado no lockfile para os scripts de QA já existentes; seleção opcional do executável Chromium e URL-base na QA 2D.

## Compatibilidade dos quatro atores

| Instância | PASS API/CPU reproduzido | Validação restante |
|---|---|---|
| Home corredora | `Correr_R6`, skeleton independente, mesma câmera/yaw/escala; pausa/retoma | BLOCKED: corrida/enquadramento no site e clipping em WebGL |
| Home laboratório | Nome corrigido, ciclo de expressão avaliável, descrição neutra | BLOCKED: olhos, rubor, transparência e ciclo visual |
| 404 retrato | Expressões/mood independentes; eventos do Tetris preservados | BLOCKED: recorte facial e reações visuais |
| 404 mascote | Expressões/mood independentes; mesma infraestrutura compartilhada | NOT RUN: comparação estética com pixel art e aprovação da representação colorida |

Fallbacks de movimento reduzido, Save-Data e modos de acessibilidade preservados; testes de API verificam a troca de estado. A página 404/Tetris não foi redesenhada. Scripts de QA real não conseguiram abrir Chromium por bloqueio AF_UNIX do ambiente, portanto funcionamento visual e fallback rasterizado não estão aprovados.

## Medições e estimativas

| Item | Resultado | Natureza |
|---|---|---|
| GLB antes / final | 18.296.208 / 18.296.432 bytes | Arquivos reais; +224 bytes. Não é captura de transferência HTTP/cache/compressão. |
| Empacotamento sem perda | 623.648 bytes removidos do intermediário | Quatro acessores/views antigos da roupa removidos; sem reencode de textura/quantização. |
| Arrays imutáveis de animação em quatro Skeletons | 4.189.824 → 1.047.456 bytes | Medido por identidade e byteLength de typed arrays; redução de 75%. Não inclui todo heap/GPU. |
| Construção de quatro Skeletons, mediana de 7 execuções | 55,926 → 10,070 ms | Node 24/CPU host, min/max em JSON. Não inclui fetch, raster, decode ou inicialização completa de atores. |
| FPS, tempo de quadro e inicialização no site | BLOCKED | Nenhuma medição WebGL; não afirmar 30 FPS reais. |
| GPU/VRAM, uploads efetivos e draw calls | BLOCKED | Contadores instrumentados (`renderer.metrics`); números reais dependem de navegador, clipe, materiais e visibilidade. Estimativas de armazenamento separadas em `storage-estimate.json`. |
| Android/Samsung Internet | NOT RUN | Exige aparelho real; limites 30 FPS/DPR não substituem esse teste. |

Os buffers CPU do renderizador são reutilizados sequencialmente por quatro atores; a atualização de cada um reaplica seus próprios pesos. A prova de isolamento exercita o GLB real com WebGL simulado e todos os 48 slots; não compila shader, não decodifica as texturas e não prova ordenação alfa visual. Regressões no renderizador legado precisam ainda de QA WebGL real. Não houve redução de texturas, expressões ou ornamentos para obter os ganhos medidos.

Contabilidade estática adicional: 7.204.944 bytes em views de geometria e 3.931.571 bytes em views de morphs referenciadas. As sete imagens somam aproximadamente 96,06 MiB se decodificadas uma vez em RGBA8, antes de mipmaps/cópias do driver. Há 13 primitivas, duas props ocultas: potencial de 11 draws de malha por ator sem props, não uma medição efetiva por quadro. Os quatro atores reutilizam essas texturas; memória total depende também dos buffers e canvases.
