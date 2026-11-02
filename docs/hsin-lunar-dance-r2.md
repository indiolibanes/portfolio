# Hsin Lunar Dance R2 · Hydrogen Lunar Observatory

**Experimental; apresentação pública V2.0.1. VISUAL_QA_PENDING. Sem merge automático.**

Base auditada: PR #194 aberto, `experiment/hsin-lunar-dance-2026-11-02 @ 32801974d95ae458d94d72d81e874df3be4e7529`. Main continuava `f94f10bb7def9e7163f3184ea1572d74a950ecc8`. Nova branch: `experiment/hsin-lunar-dance-r2-2026-11-02`, empilhada sobre #194, sem reaplicar commits históricos. Head, CI e prévia finais constam no PR draft.

## Coreografia e referência

A lentidão R1 vinha de frases de 9–14 s, braços discretos, quadril/pernas excluídos e 1,6 + 2,4 + 2,2 s de preparação/saída. A R2 reescreve amplitudes, chaves, apoios e cadências; não aplica um multiplicador global.

| Frase | R1 | R2 | Movimento entregue |
| --- | ---: | ---: | --- |
| Moon Breathing | 9 s | 3,8 s | Respiração superior, contramovimento e microtransferência com pés travados |
| Silk Sway | 12 s | 4,2 s | Transferência lateral de quadril, braços e punhos defasados |
| Fox's Invitation | 11 s | 3,6 s | Convite direito, olhar/sinais faciais existentes e retorno |
| Crescent Turn | 12 s | 4,4 s | Giro parcial do torso e contramovimento cervical; sem pirueta/root yaw |
| Lunar Waltz | Sem passos reais | 5,6 s | Deslocar L, transferir/fechar R e retornar cada pé ao centro |
| Ballet Flourish | Ausente | 4,6 s | Port de bras assimétrico, balancé discreto e demi-plié até 32 mm |
| Petal Flourish | 14 s | 3,7 s | Abertura mais rápida, desaceleração e retorno assimétrico |
| Lunar Repose | 3,2 s | 1,4 s | Acomodação final; diretor usa janela de 1,3 s |

Lunar Waltz possui quatro trajetórias reais de pés: L desloca 65 mm, R desloca 90 mm para fechar, L retorna, R retorna; elevação livre até 23 mm. O quadril antecipa os apoios (−50 a +100 mm laterais) e abaixa até 35 mm para conservar alcance. São passos laterais/fechamento **inspirados** em valsa, não uma valsa canônica completa nem sincronização comprovada em 3/4. Relevé, chassé/pas de bourrée, piruetas e rotação do ancestral foram descartados nesta revisão; não há solver de equilíbrio físico ou tecido.

`hsin-dance-config.mjs` expõe preparação 0,8 s, recuperação 1,2 s, acomodação 1,3 s, memória de três frases/cooldown de 10 s e níveis `soft / flowing / expressive`. `setIntensity()` regula amplitude **superior** e peso probabilístico das frases expressivas. Os apoios inferiores conservam o bake completo em todos os níveis: reduzir seus quaternions independentemente quebraria o foot locking. Não se altera BPM para mudar energia. O primeiro gesto coreográfico varia por semente; a breve preparação usa Moon Breathing.

Uma pausa/buffering/seek/troca de provedor fecha o caminho de apoio já calculado até a referência, com tempo Hermite e velocidade final zero, antes de devolver controle. Não se faz SLERP arbitrário de um pé levantado através do piso. Essa saída de até 1,2 s pode concluir o fechamento da frase, não necessariamente parar no primeiro apoio intermediário. Pausa manual/reduced motion/invisibilidade continuam suspendendo o loop; retomar música exige estado oficial válido. O novo teste cobre também interrupção durante a rampa de preparação sem mudança angular em tempo zero.

## Rig inferior e ownership

Nenhum bone foi criado e o GLB não foi reexportado. A dança passa de 22 para **38 canais de quaternion**: acrescenta pares ORG/DEF de ThighL/R, CalfL/R, FootL/R e Toe0L/R. Os split bones DEF `001` ficam na referência local.

O bone `hips` é folha sem pesos. `root`/`ORG-Root` não contêm toda a árvore ORG. O ancestral comum correto é o **Object3D** `RIG-R2T1XinMd10011_LOD0_Skeleton`: um canal XYZ de posição, restaurado exatamente. O yaw cinematográfico do modelo permanece intacto. Comprimentos medidos: coxa 395,56 mm, panturrilha 398,75 mm; ankle em contato y≈107,44 mm, sola y≈0. O alvo não coloca o ankle em y=0.

`scripts/lib/hsin-dance-lower.mjs` realiza IK analítica de dois segmentos **offline**, pole anatômico derivado da referência, orientação mundial do pé preservada e reconciliação proximal DEF no pai correto. O bake usa 65 amostras por frase superior, 97 em Ballet e 145 em Waltz. O runtime só decodifica uma vez, interpola quaternions/posição e atualiza matrizes. Sem IK, consulta de mesh ou criação de Quaternion/Vector3 por frame. Face/olhos continuam com o diretor facial; Idle e Dance não escrevem simultaneamente nas cadeias compartilhadas.

## Música e acesso

Somente **YouTube com `playing` confirmado** pode carregar/iniciar dança. Seleção, pausa, buffering, fim, evento antigo ou API indisponível não bastam. Spotify continua como embed oficial para escuta e é explicitamente inelegível para dança, mesmo se um teste simular `playing`. Não se acrescentou `unsafe-eval`.

A nota visível no rodapé do pavilhão explica a disponibilidade e a ausência de sincronização exata. O Music Transport, verificação de identidade/proveniência e relógio corrigido pelas posições oficiais permanecem. Não foi inventado BPM, compasso ou refrão; o modo real é **dança musical livre**. O mapa de batidas da gravação oficial continua não verificado. Sem autoplay, áudio copiado ou novo player. O iframe persiste durante câmera, informação e deslocamento do pavilhão.

## Pavilhão

Foram removidos discos, aros, raios e alojamentos das rodas. Quatro câmaras H₂ recebem carcaças metálicas, conduítes, bocais, anéis horizontais de confinamento e aletas. Núcleos esquerdo/direito compartilham materiais por lado; intensidade acompanha a velocidade e o esforço lateral. É propulsão de ficção científica, sem promessa física, partículas ou luzes individuais.

Madeira escura, bronze, treliças, suportes inspirados em dougong, celadon, dois telhados com beirais elevados e coroamento armilar enquadram um visor escuro com bordas branco-gelo/ciano. O HTML permanece frontal e nativo; arquitetura e halos não interceptam cliques nem recortam o iframe. Ornamentos verticais adaptam sua escala **somente no rebuild de layout** para caber em telas baixas, sem reduzir a resolução facial. Nos bays mobile, a mesma cena fica reservada acima/ao lado do conteúdo legível. Opções em paisagem curta podem rolar dentro da fachada.

Layout considera viewport/aspect, preferência manual, projeção do head/mãos, lua, envelope conservador do modelo e área dos controles. Avalia candidatos periféricos e margens incluindo arquitetura. Reavalia por câmera/layout ou amostragem de atenção a 4 Hz; não remonta o iframe nem reconstrói geometria na órbita. Movimento com amortecimento crítico equivalente, velocidade limitada a 380 px/s, histerese de 0,8 s e cooldown de 2 s. Hover e foco são bloqueios separados. Um clique explícito em alternar lado autoriza seu próprio movimento mesmo mantendo foco no botão.

Cruza por um corredor inferior/superior quando há espaço. Se não existir corredor seguro, uma troca **automática** é adiada e `data-layout-constrained` informa a limitação. Uma troca manual em viewport impossível pode usar a faixa inferior; não se promete ausência absoluta de oclusão em qualquer zoom/enquadramento. O limite junto ao piso altera somente profundidade/escala mundial, conservando o retângulo de tela já escolhido. Reduced motion elimina inclinação/deriva; sem novo rAF, renderer, render target, luz ou textura.

## Comparação de orçamento

| Medida | PR #194 | R2 |
| --- | ---: | ---: |
| Canais de quaternion | 22 | 38 |
| Frases | 7 | 8 |
| Asset JSON bruto | 394.188 B | 511.505 B |
| gzip offline | 69.115 B | 89.404 B |
| Brotli offline | 41.506 B | 51.757 B |
| Conteúdo numérico quaternion estimado | 320.320 B (double) | 384.256 B (Float32) |
| Posições inferiores estimadas | 0 | 7.584 B (Float32) |
| Buffers de playback/recuperação | 3.168 B | 5.472 B |
| Parsing Node | 1,64 ms | 1,33 ms |
| Parse + decode R2 | — | 9,26 ms, uma vez |
| Playback Node | 0,0110 ms | 0,0128 ms |
| Diretor + playback Node | 0,0129 ms | 0,0132 ms |
| Matrizes rig completo, benchmark separado | 0,122 ms | 0,105 ms |
| Pavilhão: meshes/lotes | 5 | 7 |
| Pavilhão: triângulos | 4.804 | 4.132 |
| Novas texturas/render targets/luzes | 0 | 0 |

O aumento de download corresponde a oito frases/apoios reais, com quantização I16 e decode único; não apenas mais frames float. Artefato R1 permanece como baseline de regressão/performance, não é baixado pelo player R2. Estimativas numéricas excluem objetos/VM, headers e compartilhamento de endpoints. Compressão offline não é tráfego HTTP medido. Benchmark Node **não é FPS de dispositivo**; não se atribui o render total ao diretor. A política/damping do pavilhão tem relatório próprio, aproximadamente 0,0012/0,00023 ms neste ambiente. Teto de 30 FPS, DPR adaptativo, limite de pixels, loop único e descarte preservados. `?hsin-metrics` acrescenta `pavilionUpdate`; o primeiro frame válido e números GPU dependem do navegador.

## Duas regressões antigas corrigidas

1. **Hair Caress:** investigação mostrou que o experimento #190 não era apenas um teste de 87 versus 109 frames: violava folgas reais de mão–rosto/cabelo. Restaurados **somente** `poses.hairCaress`, cinco caches e bake da trajetória segura `f7f1894`; Lip Touch e demais poses intactos. Manifesto SHA/bytes atualizado. Teste passa por fases semânticas hover/contato/soltura, preserva a cobertura antiga normalizada e todos os limites geométricos. Nenhum skip/tolerância foi usado para esconder a falha. Limitação herdada: a versão segura passa o contrato amostrado; a pesquisa densa encontra antebraço–tronco de 4,638 mm entre amostras, sem garantia contínua de tecido.
2. **Lua:** teste agora reconhece esfera shader + halo, 7 meshes/3.274 triângulos, vértices reais e câmera pública. Corrigido clipping no reset com centro mundial estático `[-0.8, 2.75, -10]`, halo/reflexo coordenados. Durante órbita a lua permanece fixa e pode sair do quadro, conforme parallax; não foi transformada em billboard. Texturas/shader/raio preservados.

GLB público continua 9.873.744 B, SHA-256 `63506b0b7a2369722e6429c3b16c5f48764ee01706d1272b4ffd69a45c5e0d2c`. Não se publicam modelos privados nem áudio.

## Evidência e limites

- [Vídeo CPU 20,25 s](qa/hsin-dance-r2/dance-r2-cpu.mp4): 162 quadros a 8 fps, GLB real, sequência autoral nominal; sem som/iframe e sem captura do diretor ligado a um provedor. Não demonstra FPS nem substitui aprovação WebGL de ritmo/naturalidade.
- [Sequência](qa/hsin-dance-r2/motion-sequence.webp), [pavilhão antes](qa/hsin-dance-r2/pavilion-before.webp), [depois](qa/hsin-dance-r2/pavilion-after.webp). Shader, PBR e luz aproximados; visor nativo ausente da rasterização CPU. Antes/depois não são capturas do navegador.
- [Suporte/600 s](hsin-dance-r2-qa.json): duas sessões com a mesma semente/trace, oito frases, 1.928 poses incluindo subframes e quantização, 250 vértices amostrados de sola. Drift máximo de apoio **0,310 mm**, mínimo de sola **−0,264 mm**, gap ORG/DEF **0,042 mm**, erro numérico dentro do critério novo de 0,5 mm. Não é foot locking matematicamente exato entre frames. Referência final XYZ/quaternions exata.
- [Tela](hsin-dance-r2-screen-qa.json): 744.480 probes de triângulos/área facial em retrato, paisagem e perfil; zero intrusão esquerda no proxy amostrado. Não é prova contínua de colisão de manga/cabelo/torso.
- [Performance](hsin-dance-r2-benchmark.json), [pavilhão/layout](hsin-pavilion-r2-qa.json). Viewports numéricos 320×740, 393×852, 844×390, 1280×720 e 1920×1080; não são cinco capturas reais de dispositivo.

Auditoria posterior GPT-6 Astra, esforço alto: nenhum P0/P1 identificado; três P2 corrigidos e retestados — ganho na interrupção da preparação, hold hover/foco e histerese/retorno automático. Os testes originais continuam exercitados, incluindo o asset R1. `npm run check`, build Astro, UX e suíte Hsin são registrados com resultados finais no PR. Sem mascarar CI.

**Aprovação artística, execução sustentada dos players reais, Samsung Internet, GPU/FPS, primeiro frame em dispositivo e perda/restauração real de contexto WebGL continuam exigindo navegador com WebGL2.** Os testes existentes cobrem política de pausa/loop/contexto em nível lógico; não se declara perda de contexto GPU testada por numerics. A versão pública permanece V2.0.1 até essa revisão.

## Reproduzir

```sh
node scripts/bake-hsin-dance-r2.mjs
HSIN_DANCE_REPORT=1 node tests/hsin-dance-r2.test.mjs
HSIN_DANCE_REPORT=1 node tests/hsin-dance-geometry.test.mjs --r2
HSIN_DANCE_REPORT=1 node tests/hsin-pavilion-r2.test.mjs
HSIN_DANCE_REPORT=1 node scripts/bench-hsin-dance.mjs --r2
node scripts/render-hsin-dance-r2-qa.mjs
npm run check
npm run build
npm run check:ux
```

Arquivos por domínio: direção/config, bake/solver/decoder/player, elegibilidade/nota, tower/layout/CSS/stage, testes/workflow, caches/acting/manifesto Hair, teste/posição lunar, relatórios e QA. A lista exata e os sete commits estão no PR draft.
