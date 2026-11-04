# Shorekeeper F2.1 — R5 FINAL

Candidata opt-in da última rodada planejada, empilhada sobre #234 (`e7ebc3c3a4225649794e35a45488a2a69aa65fbe`). Sem alteração de main, fechamento de PRs anteriores, merge ou implantação. `VISUAL_QA_PENDING`, `ROTATION_PENDING`, `LANDING_VISUAL_PENDING` e `PERFORMANCE_PENDING` continuam independentes.

## Preflight e preservação

Heads reconfirmados antes da recuperação/finalização: #233 `b485603`, #234 `e7ebc3c`, #231 `1cff61b`, #232 `dc336bc`, #228 `bf0353f`, #229 `75cf2ae`, #230 `a36c851`. Todos abertos/draft, sem novos heads descartados. Main: `839fca45224154c2eca98d1b47e0d3faa42079b0`. Bases: #234→#233→main; #231→#228; #232→#230; #229/#230 partem de `c6986ee`. R5 usa a consolidação de #233; não reaplica branches inteiras ou duplica sequenciadores. A falha histórica #229 foi incompatibilidade de Node; Node 24 e os workflows consolidados foram preservados.

GLB F2.0-A: SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`, 39.487.548 bytes, 249 bones, três idles. Sete bibliotecas privadas reais: Attack01–04, Skill01 e Burst01/02. Fonte, tracks não-Root das variantes, UV/material/índices/skinning e E_Close são verificados. Nenhum GLB, PSA, textura, GIF ou captura privada entra no Git/dist/artifacts públicos. Hsin, outras rotas, estilos globais, public e funções de autenticação não foram alterados.

O pacote R4 real (378 PNG/27 MP4) foi inspecionado na execução anterior desta mesma tarefa. A transferência R5 contém 15 referências MP4 reamostradas/contact sheets e documentos; timestamps desses vídeos não definem clocks PSA ou markers. Manutenção automática apagou os temporários R5 antes de sua entrega. Os três commits já enviados foram recuperados; correções restantes foram reconstituídas, testadas e as evidências entregues foram **regeneradas**. Contagens e timings da execução perdida não são a prova desta entrega. Os materiais privados foram recuperados pelo fluxo autorizado, sem alterar Access/R2.

| Prioridade | Achado reproduzido | Correção |
|---|---|---|
| P0 | callbacks RAF persistiam offscreen | proprietário único cancelável; retomada por eventos |
| P0 | preparo síncrono no clique | geradores cooperativos, AbortSignal, cache por identidade |
| P0 | pele/cavidade separada do contorno do sorriso | campo local compartilhado na cópia reversível |
| P0 | pés ainda se deslocavam após contato R4 | cadeia inferior termina no contato, restante do corpo recupera gradualmente |
| P0 | canopy cortada na interface real em retrato | fit R5 pelo envelope real e limites Orbit restauráveis |
| P0 | arcadas ocultavam a personagem após corrigir o zoom | arcade R5 exterior ao percurso normal da câmera |
| P1 | `.next()` herdado voltava a AMBIENT | ciclo manual RECOVERY→OFF; narrativa R5 termina OFF |
| P1 | patches shader podiam falhar silenciosamente | contrato de uma correspondência e compilação real |
| P1 | notificação media atrasada após suspensão | reconciliação no frame existente antes de dormir |
| P1/P2 | fase reduzida incompleta; câmera sem GLB não liberada | níveis estáticos imediatos; limites finitos e leases em finally |
| P2 | nomes/estágios/espécies não aprovados | plano inativo e incerteza explícita |

## Facial

O isolamento identificou parte da fenda **sem** o ribbon: a borda da pele/cavidade ficava atrás do traço em movimento. Alinhar apenas profundidade do forro não resolveu; restaurar toda a profundidade do traço acentuou a ponta preta. As tentativas foram descartadas.

R5 estende o campo R4 à borda oral local: 287 vértices, decaimentos C1 em X/Y/profundidade e fechamento neutro limitado. Região: ±13 mm em X, ±3,5 mm da linha oral em Y, Z>21 mm com fade até 29 mm. Reutiliza clone/owner R4; modifica somente posições neutras locais e os oito morphs de canto existentes. Não reconstrói face ou material. Buffer fonte é restaurado byte a byte, com dispose idempotente; E_Close/olhos não são reescritos.

Comparações canônica/R2/R3/R4/R5 usam pesos 0/.25/.5/.75/1, frontal/45°/90°, rosto/crop e viewport móvel. A captura R5 reduz a fenda cinza/rosada e a ponta escura em ¾, mantendo um arco discreto; capuz/cabelo continuam ocultando parte do perfil direito. Há vídeos neutro→sorriso→blink bilateral→neutro e provas sobre idles. MY_STAR olhos originais/.1, HELLO fechada/entreaberta, Ternura, Esperança e demais expressões permanecem comparáveis. Não houve promoção/unificação de presets. `expression-release-plan.mjs` é plano inativo, sem scheduler automático.

## Poderes e mundo

R5 herda R4/R3/R2, com um só relógio/pool/owner. Atlas procedural menos serrilhado, núcleo/corpo/antenas mais delicados, fases independentes e dobra bilateral. Exclusões de cabeça/mãos/câmera/corpo foram mantidas; pelve/roupa usa volume aproximado adicional e somente leitura do rig. Isso não é colisão exata com tecido; os vídeos em Skill/Burst documentam limites.

Core mantém SPAWN/GATHER/HOLD/CONVERT/DISSOLVE, cristal/cage e partículas separados, flare menor e facetas coloridas. Fase nos vídeos corporais é inspeção manual independente, sem sincronização canônica presumida.

Campo mais translúcido evita base opaca. Céu tem camadas azul/violeta e luz distante; pedra recebe luz direcional/fog por altura da personagem e degraus/pilastras na mesma geometria compartilhada. Arcadas ficam fora da câmera normal de retrato, preservando horizonte/profundidade. Anéis têm planos e cor diferenciados. Sem bloom, raymarching, segundo canvas ou render targets permanentes.

O teste antigo projetava uma câmera ideal; na interface, Orbit limitava a distância e cortava a cobertura. R5 fornece limites coerentes e os salva/restaura com posição/target/FOV. O envelope é testado com **matrizes reais dos anéis**, não somente círculo aproximado. O fit de produção é usado pelos botões normais frontal/¾; resize mantém azimute celestial e não sobrescreve Orbit manual `custom`. Capturas operacionais reais de canvas 960×540 e 390×640 demonstram personagem+campo+céu+canopy+ruínas juntos. Câmera de combate permanece fixa/corpo inteiro para não esconder defeitos.

Budgets: 18/8 borboletas, 40/12 partículas Core e 320/110 estrelas+motes, desktop/mobile; até 14 draws adicionais. Registrar draws/triângulos reais nos manifests. FNV dos shaders identifica diagnóstico; SHA-256 de fontes/bundle documenta proveniência. Dim/Flare `UNRESOLVED`; Outer/Inner/Supernal `STAGE_REFERENCE_UNVERIFIED`. Não se afirma equivalência 1:1 ao jogo.

## Cinematic Liberation

A/B/C explícito: ORIGINAL, REBASED e ROOT_BODY_OWNED. Burst01 frames PSA 0/105/135 a 30.166666031 FPS; Burst02 0/54/107/163 a 30.184049606 FPS. Frente/¾/topo e vídeos fixos permitem avaliar orientações. A pirueta genuína inteira (pico relevante ~740°/s) e os clipes originais foram preservados. Tracks não-Root/duração das variantes são idênticos à fonte. Não há bone Rib: trata-se de camada fonte.

Combo real: Attack1–4→Skill01→Burst02 integral→Landing→Idle01. Matching permanece limitado à recuperação e não corta o início/fim da Burst. Fallback é explícito se faltarem fontes. R4 (.9 s, contato .558 s) continua disponível. R5 (1.15 s, contato .667 s) leva a cadeia inferior ao Idle no apoio e termina corpo/tecidos progressivamente, com os mesmos vértices skinados Foot/Toe e correção Root de suporte, sem IK novo. CPU a 30/60 Hz mostra R4 com até ~18,2 cm de deslocamento pós-contato em um pé de ORIGINAL; R5 fica abaixo da resolução registrada nas mesmas amostras. Isso se restringe à ponte e não prova transferência de peso natural ou ausência de slide no combo inteiro. `LANDING_VISUAL_PENDING` e `ROTATION_PENDING` continuam.

Preparo cede tarefas ao navegador, pode ser cancelado e não usa mixer sobre o modelo vivo. Cache depende de identidade modelo+biblioteca+Root+ponte; troca de biblioteca invalida. O orçamento 4/6 ms é cooperativo, **não limite rígido** de unidade atômica. Clone/binding pode excedê-lo no host; não foi usado Worker/GLB duplicado. Cancelamentos por Root/modo/biblioteca/contexto/dispose rejeitam resultado obsoleto. Corpo/câmera têm leases exclusivos; restauração libera leases mesmo diante de erro.

## Integração e aceite

91 testes Shorekeeper, F1.6, npm ci/check/build, Hsin/isolamento e compilação dos conversores Python. CI remoto deve ser conferido no head final do draft. Auditoria complementar nesta conversa encontrou a câmera sem GLB (Infinity) e a fase reduced-motion incompleta; ambos foram corrigidos, com confirmação estrutural e testes seletivos. Isso não constitui revisão artística humana.

Capturas são WebGL2 real com materiais/texturas originais, Chromium 153 / ANGLE Vulkan SwiftShader. Vídeos a 30 FPS **amostrados** não comprovam FPS sustentado. A interface testa input local real, cinco geometrias, pausa, IntersectionObserver, preferência de movimento, contexto, três recargas, cancelamento/câmera/rollback/dispose. Navegação bfcache é real; recusa do browser fica registrada, sem substituir por eventos simulados.

GPU desktop/600 s e Samsung Internet físico: `PERFORMANCE_NOT_TESTED_ON_DEVICE`. Sem VRAM, bateria/temperatura ou HUMAN_APPROVED inventados. Matriz de 35 gates tem STRUCTURAL/WEBGL_RENDER/GPU_MOBILE/HUMAN_ARTISTIC/SECURITY/RELEASE_READY separados, aprovação humana vazia. Restam aceite artístico, escolha Root/landing, referências inequívocas e teste físico; não se abre R6 por hábito.

Ver [matriz](shorekeeper-r5-approval-matrix.csv), [protocolo](shorekeeper-r5-capture-protocol.md), [medição](shorekeeper-r5-performance.md), [ativação/rollback](shorekeeper-r5-activation.md) e [dispositivos](shorekeeper-r5-device-protocol.md).

Wuthering Waves e Shorekeeper © KURO GAMES. Experiência independente e não oficial; VFX/cenário são aproximações procedurais autorais.
