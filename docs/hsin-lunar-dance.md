# Hsin — Lunar Dance, experimental

**Versão pública mantida em V2.0.1. VISUAL_QA_PENDING.** O recurso reage à reprodução confirmada e oferece sete frases autorais de movimento ambiental. **Não se afirma sincronização às batidas da gravação oficial**: não há mapa rítmico verificado disponível. O modo mapeado tem contrato e testes sintéticos, mas não está ativado para uma faixa real. A promoção pública a V2.1 depende de QA WebGL, validação dos provedores e auditoria posterior.

## Base e limites

Base obrigatória auditada: `main @ f94f10bb7def9e7163f3184ea1572d74a950ecc8`. PRs #178 e #190 já integravam fidelidade facial, atuação anatômica e silhueta; #193 já integrava pavilhão móvel e lua esférica. #179–#181 foram inspecionados como história, **sem cherry-picks**. Branch: `experiment/hsin-lunar-dance-2026-11-02`; base de PR `main`; head e preview no PR draft. Sem escrita direta na main e sem merge automático.

Nenhuma alteração no GLB público otimizado, nos perfis `hsin-v2.1-profile.json`/`hsin-v2.1-acting.json`, no diretor facial, no repertório corporal antigo, em Lip/Hair, na geometria do pavilhão, na lua ou no terraço. Nenhum GLB privado ou áudio foi usado, copiado ou publicado.

GLB preservado: `public/assets/models/hsin/hsin-v2.0.glb`, 9.873.744 bytes, SHA-256 `63506b0b7a2369722e6429c3b16c5f48764ee01706d1272b4ffd69a45c5e0d2c`.

## A — Estado musical real

`hsin-music-state.mjs` normaliza `no_music`, `ready`, `playing`, `paused`, `buffering`, `ended`, `unavailable`. Seleção cria uma época de sessão; não confirma Play. Apenas callbacks do provedor podem produzir `playbackConfirmed`. A estrutura inclui provider, status, trackId, posição/duração em segundos, observedAt, synchronizationQuality e epoch. Troca de provedor invalida callbacks antigos e limpa a identidade da faixa.

`hsin-music-api.mjs` usa os SDKs oficiais, carregados somente após escolha do visitante:

- YouTube IFrame Player API no iframe visível existente, com `enablejsapi=1`, `origin` da página e `autoplay=0`. Observa estados e consulta `getCurrentTime`, `getDuration` e identidade de vídeo. Uma observação a cada 500 ms; nenhuma chamada a `playVideo`/Play programático.
- Spotify iFrame API: inicializa uma única vez por seleção, substituindo o iframe inicial por aquele que o SDK oficial cria. Depois disso, câmera, posição do pavilhão e opções não remontam o player. Observa `ready`, `playback_started`, `playback_update`, `playingURI`, `isPaused`, `isBuffering` e posição/duração em milissegundos, convertidas para segundos. A seleção do álbum nunca é tratada como identidade da faixa.
- Timeout do SDK ou ausência de observações confiáveis por 12 s leva a `unavailable`. Não há dança nesse estado; o embed nativo permanece disponível quando o SDK não carrega. Um watchdog de 3 s é usado somente no Spotify. Timers de observação são descartados com o provedor; não são loops de animação.
- Getters YouTube podem estar em cache. Polling com posição/estado/identidade congelados por mais de 12 s não sustenta `playing`; `onError` também permanece indisponível até progresso real ou nova evidência de estado/evento. Um relógio injetável testa 30 s de dados congelados, erro e recuperação, sem adicionar timer.
- A política anterior de silêncio em aba oculta e vídeo YouTube fora da área visível permanece. Pagehide cancela callbacks/observers; bfcache remonta listeners uma única vez. Atuação pausada/reduced motion não avança a dança nem inicia seu download.

CSP mantém frame-src restrito aos três hosts anteriores. Script-src da rota experimental acrescenta apenas YouTube, ytimg, Spotify e `embed-cdn.spotifycdn.com` (host para o qual o bootstrap oficial do Spotify carrega seu script). Sem áudio entre origens, AudioContext, extração de streams, tokens ou nova interface de reprodução.

A API confirma o estado do player, **não analisa o sinal sonoro**. Restrições de conta/região, anúncios, disponibilidade dos embeds e latência do provedor continuam se aplicando. Um evento `playing` não é uma prova de BPM ou início de refrão.

## B — Ownership e estados

`hsin-dance-director.mjs` é chamado somente no loop existente, a até 30 FPS:

| Estado | Escritor corporal | Comportamento |
| --- | --- | --- |
| CONTEMPLATIVE_IDLE | Repertório antigo | Mesmo avanço e seleção de gestos sem música |
| DANCE_PREPARATION | Idle até voltar; depois Dance | Solicita release, aguarda os atores, verifica referência, prepara suavemente |
| DANCE_SOFT / DANCE_EXPRESSIVE | Dance | Playback de uma frase pré-calculada, sem outro escritor do mesmo canal |
| DANCE_RECOVERY | Dance | Interrupção, buffering, seek grande ou troca de qualidade: desacelera a pose atual até a referência |
| DANCE_TO_IDLE | Dance, depois Idle | Lunar Repose discreta e devolução explícita de controle |

O Facial Director conserva morphs/olhos. A dança possui 22 bones corporais, incluindo cabeça/pescoço; esses bones não são escritos pelo controlador facial de morphs. A respiração/gestos do Idle param de escrever ao ceder a cadeia. Não se chamam os dois diretores simultaneamente para os mesmos bones. Na entrada, os buffers são sincronizados com a referência para evitar herdar velocidade do gesto que terminou.

Recuperação usa um blend em espaço log/exp de quaternions com velocidade inicial estimada dos últimos samples e velocidade final zero, durante 2,4 s. Segue-se uma acomodação de 2,2 s. O alvo não é uma troca instantânea entre poses. Frases começam/terminam na mesma referência e usam easing, lag e sustentação definidos offline. A interpolação de samples não é uma promessa de C1 matemático perfeito em todo nó; o teste mede passos angulares e continuidade nas transições exercitadas.

Somente Fox's Invitation envia sinais contextuais já existentes de preparar/sustentar/liberar ao facial. Não há nova máscara fixa de sorriso ou expressão em cada batida. A atenção ao visitante continua usando a matriz mundial atual da cabeça.

## C — Sete frases autorais

| Frase | Duração nominal | Direção e energia |
| --- | ---: | --- |
| Moon Breathing | 9 s | Respiração/rotação superior mínima, braços relaxados; muito baixa |
| Silk Sway | 12 s | Contramovimento do torso/cabeça, arcos assimétricos de braço e lag dos punhos; baixa |
| Fox's Invitation | 11 s | Convite direito discreto, braço esquerdo próximo ao corpo, breve sustentação contextual; moderada |
| Crescent Turn | 12 s | Rotação do torso até 4°, cabeça contraria parcialmente, sem giro de root; moderada |
| Lunar Step | 10 s | **Fallback de apoio plantado**: balanço superior, sem passo, translação de quadril/root ou elevação dos pés |
| Petal Flourish | 14 s | Abertura assimétrica dos braços, cotovelos/punhos em fases distintas, até 32° de abertura e 36° de flexão adicional; expressiva |
| Lunar Repose | 3,2 s no asset | Microacomodação depois da recuperação e devolução ao repouso |

Não se copiou coreografia alheia. As chaves artísticas estão em `scripts/bake-hsin-dance.mjs`. Amplitude por episódio varia de 0,88 a 1 com semente, ordem evita repetir imediatamente a mesma frase. A coreografia é deliberadamente de palco com pés plantados: **não é uma dança locomotora nem uma validação de passos**. Lunar Step substitui o passo porque joelhos/tornozelos/compensação de apoio não foram demonstrados visualmente nesta fase. Não há física de tecido/cabelo.

Bones controlados, pares ORG/DEF: Spine2, Neck, Head, ClavicleR/L, UpperArmR/L, ForearmR/L e HandR/L. Pelvis, pernas, pés, root e dedos permanecem fora da dança. Eixos de torso/abertura são medidos no rig; flexão dos cotovelos/punhos usa eixos derivados das poses aprovadas. O bake reconcilia o delta **mundial** de cada driver ORG no pai correto de DEF, inclusive cadeias segmentadas. Não presume equivalência de rotações locais.

Dados: `public/assets/animations/hsin/lunar-dance-r1.json`, 65 frames por frase, 22 bones, 7 frases. Manifesto e hashes em `src/data/hsin-dance.json`. O GLB não é reexportado. No runtime há somente SLERP, pesos, recuperação e matrizes; zero IK ou consultas de mesh.

## D — Tempo musical e confiança

`hsin-music-transport.mjs` mantém um playhead estimado a partir das observações reais. Corrige pequenos erros gradualmente, até 0,25 s por segundo. Saltos acima de 1,25 s, troca de faixa/provedor e reinício incrementam a revisão temporal; o diretor recupera a referência antes de reentrar. Buffering/pausa não avançam uma frase como se a música continuasse tocando. Retomar a cena após pausa manual/ocultação trata o desvio da posição do provedor.

Dois modos são distintos:

- **Ambient:** reprodução confirmada, sem mapa verificado. Frases lentas usam cadência interna. Não há alegação de sincronismo de batidas. Este é o modo disponível para a gravação real nesta entrega.
- **Mapped:** exige ID da gravação, duração compatível, grade de batidas monotônica, marcadores com duração, método e fontes de verificação explícitos. Fase da coreografia segue a posição reportada/corrigida; entrada espera uma fronteira segura. Mudança de modo ou salto não teleporta o corpo. O modo foi testado com um fixture sintético, que não é publicado como mapa de uma música real.

`src/data/hsin-music-map.json` identifica o vídeo oficial já usado no pavilhão. **BPM, duração, offset e marcações permanecem null/vazios.** Não foi obtido áudio autorizado ou uma análise verificável da gravação; resultados de arranjos/MIDIs divergem e não servem como mapa do vídeo. O álbum Spotify pode reproduzir outra faixa; só playingURI real pode identificar uma gravação. O ponto 66 s é rotulado como **Trecho**, não refrão validado. Não se armazena áudio.

`synchronizationQuality='verified'` no contrato significa posição observada pela API, não aprovação do mapa de beats. `mode='mapped'` exige validação separada. Sem API confiável, o modo é contemplativo.

## E — Performance e recursos

A coreografia é lazy: download e parsing só começam após Play confirmado e se a atuação está ativa/visível. Hash SHA-256 é conferido antes do uso. Falha de dados, referência incompatível ou bone ausente mantém o repertório existente. Nenhuma geometria, material, textura, render target ou luz é acrescentada. Pavilhão e lua são preservados.

Medições Node v24, **não navegador/GPU/telefone/FPS**, registradas no [benchmark](hsin-dance-benchmark.json):

- JSON: **394.188 bytes**; gzip **69.115 bytes**; Brotli **41.506 bytes**, calculados offline. O tamanho transferido real depende da resposta HTTP/cache.
- Conteúdo numérico das poses: **320.320 bytes** em doubles, sem contar overhead do objeto/VM; não é medição de heap retido.
- Buffers de playback/recuperação: **3.168 bytes**.
- Playback de bones: aproximadamente **0,011 ms** por atualização.
- Diretor + playback, benchmark separado: aproximadamente **0,013 ms**.
- Atualização mundial do rig completo: aproximadamente **0,122 ms**, medida separadamente; não se atribui esse custo inteiro à dança.
- Parsing do asset: aproximadamente **1,64 ms** nessa execução. JSON do benchmark contém a medição exata e não constitui meta universal de dispositivo.

O modo `?hsin-metrics` conserva medições existentes e acrescenta `dancePose`, `danceDirector`, milestones de carga e snapshots de música/diretor em `window.__hsinMetrics.report()`. `renderer.info` continua disponível quando WebGL funciona. Sem medição de GPU, não se afirma melhora de FPS. Mantidos 30 FPS, DPR, teto de pixels, pausa fora da tela, render sob demanda, único rAF e descarte. Identidade de faixa é comparada por campos, sem construir strings novas a cada frame. Playback/recuperação não alocam Quaternion/Vector3 após construção, conforme teste.

## F — Testes e falhas da base

A suíte de base tinha **39 arquivos**, dois já falhavam antes de editar: `hsin-hair-caress-geometry` esperava 87 frames em um asset de 109; `hsin-moonlit-environment` esperava 6 meshes/lua plana, mas #193 contém 7 e esfera/halo. Investigar novas expectativas também encontra divergência com antigos alvos de contato/recorte lunar. **Os dois testes e os assets originais foram mantidos intactos; não houve relaxamento de limiares ou skip novo.** Não se declara aprovação artística desses pontos herdados.

Entrega: **40/42 arquivos encerram sem falha**, com as mesmas duas falhas herdadas; três dos arquivos têm os skips antigos dependentes de GLBs privados não fornecidos. Os três novos arquivos passam. O build Astro, OG e contrato UX **100/100** passam. Hash do asset no dist confere.

O workflow mantém o job de regressão original, que pode falhar nesses testes. Um job **lunar-dance** separado executa novos testes, pavilhão, pausa/métricas, benchmark, build/hash e UX. Não se usa continue-on-error para maquiar a regressão antiga. Resultados remotos no PR.

Evidências novas:

- [Runtime](hsin-dance-runtime-qa.json): **600 s duas vezes**, semente reproduzível, todas as sete frases/seis estados, sem música equivalente ao Idle, seleção sem Play, play/pause/resume, buffering, seek, troca de provedor, fim, freeze manual/invisível/reduced motion, restituição e zero Quaternion novo no playback.
- Maior passo angular nos handoffs exercitados: **0,624°**; maior distância ORG/DEF: **0,000523 mm**. Não equivale a uma prova contínua de ausência de colisão.
- [Geometria](hsin-dance-geometry-qa.json): **231 amostras**, **3.608 vértices de pés** sem deslocamento e **651.420 triângulos/probes de projeção** de antebraço/mão esquerda, em retrato/paisagem/perfil. Zero intrusões no proxy elíptico da região facial; braços pelo menos 224 mm abaixo do centro ocular nas amostras.
- O proxy de tela e os samples de superfície não detectam toda interpenetração de tecido/cabelo/torso; essa verificação completa segue para WebGL. Quadril/pernas/joelhos não são animados; portanto não há novo solver de equilíbrio ou passo validado.
- APIs: ready não inicia dança, identidade real de faixa, conversão ms/s, callbacks antigos rejeitados, fallback por API bloqueada, nenhuma chamada de autoplay, teardown e iframe persistente com câmera/opções/posição.

## G — QA visual e comandos

[Frases e repouso](qa/hsin-dance/phrases.webp) · [Vistas mobile/desktop/perfil](qa/hsin-dance/views.webp) · [Arco de Petal Flourish](qa/hsin-dance/flourish-arc.webp).

São poses do próprio GLB skinned com câmera/cenário. Preparação e repose usam pesos correspondentes; as frases mostram amplitude máxima para inspeção. **CPU, não WebGL**: iluminação/shader da lua/PBR aproximados; o pavilhão/iframe não é reproduzido nessas pranchas. Elas não são um vídeo de movimento contínuo nem aceite de naturalidade. O pavilhão real é validado separadamente por testes e preview.

```sh
node scripts/bake-hsin-dance.mjs
node tests/hsin-music-state.test.mjs
HSIN_DANCE_REPORT=1 node tests/hsin-dance.test.mjs
HSIN_DANCE_REPORT=1 node tests/hsin-dance-geometry.test.mjs
HSIN_DANCE_REPORT=1 node scripts/bench-hsin-dance.mjs
node scripts/render-hsin-dance-qa.mjs
npm run build
npm run check:ux
```

## Arquivos e próximos passos

### Conferência publicada e auditoria posterior

PR draft [#194](https://github.com/indiolibanes/portfolio/pull/194), sem merge. Na primeira publicação, head `849929a0c7ccaf5af32cafa9f73f06fe120fb5f1`: job `lunar-dance` PASS no push e no PR, build PASS e Cloudflare PASS. O job antigo `facial-regression` interrompe em `hsin-moonlit-environment.test.mjs:12`, `7 !== 6`, a mesma falha reproduzida na base; testes seguintes nesse step não executam. A suíte local completa documenta separadamente as duas falhas herdadas.

Prévia dessa publicação conferida em `/experimentos/`: `WebGL2 unavailable`, poster e fallback presentes, versão pública V2.0.1. **VISUAL_QA_PENDING** para GLB animado, GPU/FPS, câmera e Samsung Internet. YouTube carrega o iframe, seleção produz `ready` sem autoplay e Play nativo produz `buffering`; reprodução sustentada não confirmada nesta sessão. Spotify exibe o embed, mas o SDK oficial `iframe_api.b14cb21cf7e4cfe54860.js` tenta `eval` bloqueado pela CSP. O estado passa corretamente para `unavailable`; **Spotify musical não está aprovado nesta CSP**. Não foi permitido `unsafe-eval`. Mover o pavilhão preservou embed/URL; Sem música removeu o iframe e restaurou `no_music`.

Auditoria posterior com GPT-6 Astra, esforço alto: um P2 encontrado no polling YouTube, que renovava confirmação com getters congelados e apagava erro no próximo poll. Corrigido com a observação de progresso/estado descrita acima e teste determinístico. Nenhum outro P0/P1/P2 concreto relatado nos focos de ownership, referência, teardown, preferências e transport; isso não substitui QA visual ou validação dos provedores reais.

- Contrato/provedores: `hsin-music-state.mjs`, `hsin-music-api.mjs`, `hsin-music-providers.mjs`, soundtrack TS, componente e CSP.
- Direção/playback/tempo: `hsin-dance-director.mjs`, `hsin-dance-pose.mjs`, `hsin-music-transport.mjs`, integração pontual no stage.
- Assets/manifests: `hsin-dance.json`, `hsin-music-map.json`, `lunar-dance-r1.json`.
- Offline: bake, fixture do rig, benchmark, renderer/gerador de QA; três novos testes, harness de soundtrack e job CI.
- Relatórios e três pranchas, sem áudio nem modelo privado.

Próximos passos para consolidar V2.1: QA real do GLB animado e provedores em Chromium/Samsung Internet, compatibilidade segura da API Spotify com a CSP, resolver os dois testes da base com suas respectivas alterações de atuação/lua, obter mapa rítmico autorizado/verificado da gravação exata e então habilitar o Nível 1. Passos e deslocamento de quadril exigem uma etapa própria de suporte/joelhos/tornozelos.

Documentação primária consultada: [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference), [Spotify iFrame API](https://developer.spotify.com/documentation/embeds/references/iframe-api), [Spotify SDK oficial](https://open.spotify.com/embed/iframe-api/v1). Não se inferiu BPM a partir dessas APIs.
