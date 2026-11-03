# F2.1-F.1 · integração facial manual

Resultado: RUNTIME_INTEGRATION_PASS / VISUAL_QA_PENDING. Base facial independente: `4bdb75fdb8e47524ad5b8e07c1bf01f81b7d2645`, branch F2.0-B.3 consolidada. Não modifica a cadeia C/CL nem os PRs #211–#215. Nenhum binário, frame de referência ou captura privada acompanha este PR.

O controlador F2.1-F entregue foi preservado como origem das receitas e corrigido: limite 0,3 sobre o **peso final** das pupilas; interpolação do valor corrente na troca ou cancelamento; recuperação até a base inicial segura. Um valor inicial de pupila acima de 0,3 é sanitizado para 0,3 quando o controlador assume o canal, inclusive na recuperação. Valores iniciais válidos são preservados. Entradas não finitas e bindings inválidos são rejeitados.

## Ownership e contrato

`createGentleFace` permanece o único escritor facial na integração. O controlador recuperado calcula valores em buffers intermediários; `inspection.setMorphs` aplica o resultado uma vez. Não há escrita de bones ou mixer. A piscada mantém fechamento 0,13 s, sustentação 0,08 s e abertura 0,20 s. HOPE fornece uma solicitação contínua, combinada por máximo pelo dono ocular com a piscada; o módulo recuperado nunca escreve `E_Close`. Canais de pálpebras são atenuados pelo fechamento efetivo.

`triggerQA(id)` dispara manualmente os candidatos; `triggerQA('NEUTRAL')` solicita recuperação suave. `qaSupport(id)` informa morphs ausentes, disponibilidade técnica e aprovação pendente. `FACIAL_RECOVERY` distingue as receitas recuperadas dos presets B arquivados. MY_STAR, LITTLE_SMILE, LOVE, HELLO e HOPE são EXPERIMENTAL / VISUAL_QA_PENDING; nenhum está autorizado ao scheduler. Os estados históricos da biblioteca B não são aprovação das receitas F.

O loop existente chama `face.advance(dt)` uma vez; o scheduler recebe `advanceFace:false`. Pausa, suspensão fora da tela e visibilidade continuam sob controle do runtime. `face.onAnimationEvent({type,clip})` aceita eventos `start`/`end` dos clipes `SK_ATTACK_*`: solicita recuperação e bloqueia novos candidatos até o término. A base facial não contém o diretor C/CL; o contrato foi testado com eventos sintéticos e deve ser conectado ao host de combate quando a integração entre branches for solicitada.

## Demonstração reproduzível

Abra `/experimentos/sk/?facialQA=1`, carregue o GLB privado canônico e use a área F2.1-F.1. Os controles não aparecem na apresentação normal. Selecione frontal, ¾, rosto, olhos ou boca; depois compare NEUTRAL e cada candidato mantendo a câmera e a luz. Espere a recuperação antes da captura neutra. Os PNGs são salvos somente por comando no dispositivo. Pausar a atuação no ápice permite captura; retome antes de pedir retorno ao neutro. Teste também durante cada idle. Os materiais usados são os reais do laboratório.

A leitura privada com GLTFLoader r186 confirmou disponibilidade e execução dos cinco candidatos durante os três idles, pesos finitos e recuperação. A decodificação PNG foi simulada em Node. Isso comprova binding e lógica, não aparência. O modelo usado tem SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30` e não é modificado.

## Materiais e limites visuais

A inspeção dos materiais carregados encontrou Face, Eye, Bangs e Alpha opacos (`transparent:false`), `depthWrite:true`, `depthTest:true`, `alphaTest:0`, FrontSide, e `renderOrder:0` nas malhas. O QA mostra esses parâmetros e referências de textura sem alterá-los. Esses dados não provam que os cílios inferiores sejam defeito de morph ou de material. A afirmação causal do relatório anterior requer confirmação WebGL. Não foram aplicadas correções de transparência por suposição.

Sem GPU/WebGL local ou navegador Android disponível nesta execução, não foram produzidas capturas novas nem aprovação artística. Executar a comparação frontal, ¾ e close com luz equivalente; observar cílios inferiores, oclusão e camada ocular. Não equiparar render offline ou testes Node a essa aprovação.

## Validação

`node --test tests/shorekeeper-*.test.mjs`

`node tests/shorekeeper-facial-runtime-private.mjs CAMINHO_DO_GLB_PRIVADO`

`npm run build`

Testes novos cobrem pupilas com bases não nulas, troca contínua, cancelamento, inputs inválidos, HOPE, curva ocular aprovada, suspensão, interrupção por evento de combate e sessão automática de dez minutos sem ativar candidatos recuperados. O teste privado exige explicitamente o arquivo canônico; não participa do CI público. Hsin, Sophia, Phrolova, dados dos idles e arquivos de combate não são modificados.
