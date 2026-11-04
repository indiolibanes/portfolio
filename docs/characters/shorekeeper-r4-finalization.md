# Shorekeeper F2.1 R4 — parecer técnico e artístico

Entrega em draft [#234](https://github.com/indiolibanes/portfolio/pull/234), empilhada em [#233](https://github.com/indiolibanes/portfolio/pull/233), base `b4856030aaca157b8f5f72c06e0bc7e64e12f8e7`. Nenhuma alteração em main e nenhum merge. **VISUAL_QA_PENDING** para todas as candidatas: rasterização verificada não significa aceite artístico.

## Preflight e continuidade

| PR | Head confirmado | Base | Checks anteriores |
| --- | --- | --- | --- |
| #233 | b485603 | main 839fca4 | 7 verdes |
| #231 | 1cff61b | #228 bf0353f | 4 verdes |
| #232 | dc336bc | #230 a36c851 | 3 verdes |
| #228 | bf0353f | cadeia facial 95f6fc8 | 4 verdes |
| #229 | 75cf2ae | cadeia C c6986ee | build falhou; demais verdes |
| #230 | a36c851 | cadeia C c6986ee | 3 verdes |

Main permaneceu `839fca45224154c2eca98d1b47e0d3faa42079b0`. R4 parte da integração de #233; não reaplica PRs inteiros. O sequenciador historicamente duplicado em #229/#230 continua único. A causa do CI antigo (Node 22.23.3 abaixo do mínimo efetivo do Astro) já foi corrigida por Node 24 em R3; R4 preserva essa correção e não altera o PR histórico.

Foram consultados o relatório/matriz R3, parecer/matrizes de transferência R2, capturas e vídeos privados R2 e as referências visuais disponibilizadas. Montagens GIF/MP4 não foram tratadas como relógios PSA ou identificação de habilidade. A biblioteca Skill01 foi recuperada de arquivo privado real: 158 frames, FPS fonte 30.191083908, duração convertida 5.233333142 s. Os quatro BasicAttack e as duas Bursts também foram efetivamente carregados.

A limpeza automática do workspace removeu a primeira execução R4 antes do envio de seus commits/capturas. Essa execução não constitui a entrega. A base foi recuperada e as alterações e provas foram refeitas; os commits novos estão no PR e os resultados entregues possuem manifests próprios. Não se reutilizam os antigos números de testes/capturas como provas atuais.

## B — boca e atuação

**Defeito observado:** nas mesmas câmeras/pesos, a R2 produz traço espesso e cantos acentuados; a R3 perde a curvatura, especialmente em ¾. O crop também mostra profundidades diferentes entre ribbon e forro. A compressão apenas em Y não resolve a espessura aparente no perfil. Essa interpretação geométrica é uma inferência apoiada pelo isolamento e pelas vistas, não uma reprodução do shader do jogo.

**Candidata R4:** mantém o owner reversível de R3 e o GLB intacto. Usa campo Hermite C1 monotônico, espessura central .45, ganho de sorriso .85, aditivos .65 e lift .48. Na revisão final, afina também a profundidade da seção e as extremidades; 138 vértices de ilhas de forro recebem o campo com decaimento em profundidade. Não troca material, UV, índices, rig, E_Close ou tracks. Os buffers canônicos são restaurados no descarte. A regressão privada verifica buffers fonte, UV, normais, material e valores finitos.

**Prova:** 280 PNG faciais e seis vídeos finais; matriz canônica/R2/R3/R4, pesos 0/.25/.5/.75/1, frontal/45°/90°, rosto inteiro e boca; isolamento com material original e normais temporárias; viewport 390×640; seis vídeos neutro → sorriso → blink bilateral → neutro, em três ângulos. Há quadros de LOVE, HELLO fechada/entreaberta, HOPE, SURPRISE_SOFT, WORRIED, GLANCE e sorriso/blink com os três idles.

O perfil direito permanece parcialmente oculto pelo capuz/cabelo canônicos. O traço e a borda inferior em ¾ ainda exigem julgamento humano no tamanho de apresentação; o crop ampliado não autoriza dizer que todo artefato desapareceu. As variantes antigas continuam selecionáveis, inclusive MY_STAR com olhos originais e E_Smile .1. Nenhum preset foi unificado/renomeado/promovido. Esperança → Serenidade permanece proposta.

## C1 — borboletas, Core e Stellarealm

**Defeitos rasterizados da R3:** solo muito contrastado, ruínas em blocos escuros, anel superior branco muito espesso e Core grande perto do rosto. O enquadramento R4 inicial também cortava a canopy nas bordas; o fit final foi corrigido e renderizado novamente.

**Correção:** reaproveita R2/R3, sem novo sistema de partículas ou loop. Asas instanciadas com membrana subdividida leve (4 desktop, 2 móvel), dobra bilateral e curvatura discreta. A posição e a tangente usam a mesma trajetória após exclusão de cabeça, mãos, corpo e câmera; exclusões são volumes aproximados, não colisão exata com tecido. Não se pode garantir ausência de toda interseção sob qualquer animação.

Core tem cristal/cage menores, flare cromático contido e centro limitado abaixo da cabeça, com âncoras somente de leitura. SPAWN/GATHER/HOLD/CONVERT/DISSOLVE são mostradas em quadros e vídeo; há inspeção com Skill01. Essa inspeção mantém fase manual e **não prova sincronização canônica de habilidades**.

O cenário autoral usa céu azul celestial, véus e névoa de horizonte, solo/reflexos de menor contraste, arcadas instanciadas com fraturas e profundidade, estrelas e constelações discretas. FIELD_GAMEPLAY e CINEMATIC_CANOPY permanecem sistemas separados. O fit é compartilhado pelo botão normal de vista celestial, pela entrada do perfil R4 e pela narrativa opcional: a composição completa não depende de câmera exclusiva do harness. O teste de projeção verifica campo e canopy em retrato e paisagem; capturas reais verificam a rasterização.

**Limites:** até 18/8 borboletas, 40/12 partículas de energia e 320/110 estrelas+motes, desktop/móvel. Até 14 draws adicionais (constelações acrescentam um draw à R3), sem bloom, raymarching ou render targets. Nas capturas finais VFX, a cena completa varia entre 6 e 22 draws conforme os sistemas ativos; isso é contagem de chamadas, não desempenho em GPU. A aparência continua uma aproximação procedural autoral, sem alegação 1:1. Dim/Flare: UNRESOLVED; Outer/Inner/Supernal: STAGE_REFERENCE_UNVERIFIED.

**Prova:** 35 PNG e cinco vídeos finais de ambiente; exemplar 3 ângulos × 3 aberturas, voo individual ≥3 s, enxame, cinco fases do Core, R2/R3/R4 nas mesmas câmeras, planos com personagem+campo+céu+canopy, retrato emulado, narrativa 18 s com/sem câmera. A última bateria VFX substitui a composição inicial cortada, preservada como histórico de antes/depois.

## CL — Root, combo e recuperação

Comparação A/B/C manual, frente/¾/topo, Burst01 nos frames PSA 0/105/135 a 30.166666031 FPS; Burst02 0/54/107/163 a 30.184049606 FPS. Vídeos das duas Bursts em ORIGINAL/REBASED/ROOT_BODY_OWNED. O rig canônico não contém bone chamado Rib: o relatório assinala ausência; Rib é camada de animação fonte, não um osso inventado.

Nenhuma variante Root ganhou status canônico. O giro de Burst02, duração e todos os tracks não-Root permanecem intactos. **ROTATION_PENDING**: escolher por coerência visual com referências, jamais por menor yaw.

O plano compartilhado monta BasicAttack1–4 → Skill01 → Burst02 integral → Recovery → Idle01. Matching de pose/posição/velocidade/contatos continua limitado às janelas de recuperação; os contatos do matcher são inferidos. Cache por identidade do modelo/bibliotecas evita repetir a pré-amostragem, sendo invalidado na troca da biblioteca. O sampler não serializa o cache de animações do root nem move os objetos vivos.

**Pouso opt-in:** ponte de .9 s separada, depois do último frame do Burst; easing quintic e contato em .558 s. Mede vértices efetivamente skinados em Foot/Toe, não altura do tornozelo. Translaciona Root para transportar corpo e tecido juntos, fixa XZ do apoio após contato e chega ao Idle original. Rejeita queda >.45 m ou subida >.06 m. Não é simulação física ou IK aprovado. A pré-computação privada ficou em aproximadamente .86–.96 s por variante neste host; ocorre no preparo, não por frame.

| Variante | Desnível fonte | Erro máximo interpolado após contato, CPU |
| --- | --- | --- |
| ORIGINAL | .08435 m | .000168 m |
| REBASED | .0924 m aprox. | .0000713 m |
| ROOT_BODY_OWNED | .0913 m aprox. | .0000605 m |

Esses valores não provam naturalidade nem ausência de deslizamento durante toda a coreografia. Vídeos finais com câmera fixa e piso de referência de QA explicitamente identificado mostram a recuperação R3 antecipando o Idle, enquanto R4 termina o gesto e só então realiza a ponte; versões com câmera opcional também estão no pacote. O início R4 tem .35 s de preparação fora do relógio da fonte.

Owners exclusivos de corpo e câmera rejeitam escritores concorrentes. Câmera opcional preserva corpo/pés e restaura posição, target, FOV, controles e damping ao terminar/interromper/trocar de modo. Narrativa VFX sem câmera não restaura indevidamente uma câmera manual. Nenhum marker de Burst foi presumido e VFX não escreve em TRS/morphs canônicos.

## Integração, medição e limites de aprovação

Node 24.22.1; npm ci, npm run check, npm run build, 80 testes Shorekeeper, F1.6, Hsin, isolamento de rotas, higiene e compilação dos conversores Python. O workflow existente roda a suíte pública, sem baixar assets privados. Consultar os checks do head final de #234; o estado remoto não é inferido do teste local.

A rasterização nova usa Chromium 153 / WebGL2 / ANGLE Vulkan SwiftShader (Subzero), com texturas/materiais reais do GLB e imagens capturadas do canvas. Vídeos amostrados a 12 FPS não medem FPS sustentado de execução. Nada é imagem gerada ou renderer 2D substituto. O browser gerenciado inicial não oferecia WebGL2; o runner offline legítimo não desabilita web security nem altera a autorização privada.

O teste da interface carrega arquivos pela entrada real, alterna geometrias e testa pausa de corpo/redraws, IntersectionObserver, reduced motion, WEBGL_lose_context/restore, três recargas, interrupção e descarte. A medição de recarga aguarda o novo load e a primeira alocação renderizada: três amostras estabilizaram em 13 geometrias/14 texturas, DPR 1. O primeiro teste consultava contadores antes dessa alocação (13/5/13); essa corrida do teste foi corrigida, sem mascarar vazamento com tolerância maior. Instrumentação com polling por timer confirmou máximo de um RAF pendente e zero após dispose; polling RAF do próprio teste não é contado como loop da aplicação.

CPU do update VFX, draw calls, memória Three e renderer são registrados nos manifests privados. Na amostra R4 em ápice (45 updates), média de CPU do update .116 ms e P95 recente .20 ms neste host de software; não incluem custo de rasterização e não representam sessão prolongada. CPU de SwiftShader não caracteriza GPU; VRAM, throttling/consumo, sessão GPU real de 600 s, Samsung Internet e bfcache real continuam **NOT_TESTED**. Não há PERFORMANCE_PASS nem HUMAN_APPROVED.

O pacote final reúne 378 PNG das três suítes (280 face, 35 VFX, 63 Root), uma captura da interface e 27 MP4 (6 face, 5 VFX, 16 CL). As contagens não incluem a execução perdida nem as baterias iniciais substituídas. A prova CL final acrescenta piso de referência e um vídeo de pouso em ¾; esse piso é diagnóstico, não novo cenário canônico. ORIGINAL ainda exige avaliar a reorientação entre o endpoint fonte e Idle na ponte; contato numérico não aprova essa rotação.

Matriz completa: [shorekeeper-r4-approval-matrix.csv](shorekeeper-r4-approval-matrix.csv). Protocolo: [shorekeeper-r4-capture-protocol.md](shorekeeper-r4-capture-protocol.md). Pacote privado contém comparativos, PNG, MP4, manifests, fontes do harness e logs. Nenhum GLB/PSA/textura/referência/captura privada entra no Git ou dist. Auth/R2, assets públicos e todos os sistemas Hsin seguem a base sem alteração.

## Gates restantes e R5

Revisão humana de contorno em ¾/perfil e dimensão móvel, delicadeza dos sorrisos, asas/interseções, linguagem monumental da canopy, continuidade do combo e seleção Root; revisão do brilho em GPU e teste Samsung/600 s/bfcache. Corrigir defeitos que esses exames demonstrarem antes de promover candidatos. Só depois decidir nomes/aliases públicos e ativação progressiva do scheduler; revisar acessibilidade no aparelho durante essa estabilização. Não há reescrita geral proposta.

Wuthering Waves e Shorekeeper © KURO GAMES. Experiência independente e não oficial; cenário/VFX procedurais são aproximações autorais.
