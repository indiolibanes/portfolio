# Hsin — Facial Acting Pass B

Candidata técnica; aprovação artística pendente. PR draft [#154](https://github.com/indiolibanes/portfolio/pull/154), empilhado sobre [#153](https://github.com/indiolibanes/portfolio/pull/153). O Pass A foi conferido aberto, draft e sem merge; a base efetiva é `experiment/hsin-facial-acting-pass-a`, commit `be842947a30d4ce9125c2ce11c753eb00d4fc962`. Main não foi modificada.

## Prévia confirmada e modelo

O bot Cloudflare confirmou **Deploy successful** para o commit de implementação `332d960eb5682e77b51ef448ff598fa5eae4f66f`:

- [Pass B, prévia imutável da bancada](https://1e556845.kaue.pages.dev/experimentos/hsin-lab/).
- [Pass A, prévia imutável de referência](https://60c82121.kaue.pages.dev/experimentos/hsin-lab/).

A página B foi aberta no navegador do Work: versão B visível, `CSP blob: OK`, grupo novo recolhido e controles desabilitados até escolher o arquivo local. Isso comprova a entrega da página, não a atuação da personagem.

Modelo de validação privada: `hsin-v.1.0.5.glb`, 69.407.460 bytes, SHA-256 `938a86162d5b431638ff46f2d30c78ecea74c95587835e1a8883e2b7f6c740fe`. Os sete arquivos de documentação/referência e o GLB conferem com o manifesto do pacote de transferência. Nenhum deles é distribuído neste PR.

## Mudanças e comparação com A

| Canal | Pass A preservado | Candidata B |
|---|---|---|
| Atenção | Seguimento amortecido do cursor, zona morta e expiração | Aquisição → fixação → desvio → retorno; pequenas mudanças durante fixação e atenção autônoma discreta |
| Referencial ocular | Deslocamentos skinned medidos, câmera → cabeça | Mesma calibração; micro-sacadas usam os eixos tangentes medidos |
| Sorriso | Variação lenta contínua do lado R | Beats espaçados, assimetria variável, sobre a expressão capturada |
| Sobrancelhas | Sem overlay adicional | B_Up_Add do lado principal, limitado pela auditoria; B_Cheerful disponível isoladamente |
| Pálpebras | Um árbitro para piscadas/piscadela direita | Mesmo árbitro; E_Smile/E_Squint adicionais atenuados durante fechamento |
| Piscadela | Calendário independente | Chance controlada após sorriso autônomo; não em todo ciclo |
| Nariz | Sem uso automático | **INDISPONÍVEL para apresentação automática**; testes isolados e sorriso + nariz apenas na bancada |
| Corpo | Diretor/solver existentes | Eventos de fase alimentam a face, sem alterações no solver, dedos ou coreografia |

Um grupo recolhível acrescenta perfil A/B, intensidade, modo de atenção, teste individual dos 12 controles, dois beats de laboratório e relatório geométrico. A interface anterior e a apresentação local foram mantidas. A apresentação esconde os controles de autoria; não há comandos de atuação destinados ao visitante. O modo de seguimento contínuo é somente um diagnóstico da bancada.

O seletor de perfil reinicia o relógio determinístico sobre a **mesma** referência capturada. Intensidade B em 0% reproduz integralmente o comportamento A. O botão A/B facial já existente alterna referência capturada/candidata congelada; não deve ser confundido com o seletor de perfil. Restaurar repõe todos os pesos capturados, incluindo os que não pertencem aos canais automáticos.

## Arquitetura e parâmetros

`hsin-face-pass-b.mjs` contém dois diretores puros, sem acesso ao DOM, ossos, materiais ou solver. `hsin-face-acting.mjs` integra os diretores ao relógio e ao árbitro de pálpebras. `hsin-face-morph-audit.mjs` mede controles; `hsin-face-rig.mjs` continua sendo o único escritor automático de pesos. A sessão existente mantém o ciclo de vida.

A atenção adquire um ponto por 0,14–0,22 s, fixa por 0,55–1,05 s, desvia por 0,16–0,25 s e retorna por 0,40–0,65 s. A fixação retém o ponto adquirido, em vez de perseguir cada pixel do cursor. Micro-sacadas têm intervalo de 0,20–0,45 s e limites iniciais de 0,012 horizontal/0,008 vertical multiplicados pela intensidade; o vetor total permanece limitado a 0,24. A componente horizontal retorna antes da vertical, mantendo os dois olhos coordenados. Atenção autônoma sem ponteiro é ainda menor. São parâmetros candidatos, não medidas fisiológicas.

A zona morta de 0,08, a conversão do raio da câmera para o espaço da cabeça, os sinais derivados da geometria e o toque temporário de 1,3 s foram preservados. Durante fechamento acima de 0,1, o diretor ocular congela ponto e relógio. No diagnóstico neutro, retorna ao centro. O modo contínuo existe para comparação técnica.

Sorrisos autônomos começam após 5–9 s e repetem após intervalos de 7–15 s, com entrada de 0,85 s, sustentação de 0,80 s e saída de 1,15 s. A intensidade inicial é 55%. O lado principal R é mais frequente (76%); a chance de solicitar uma piscadela direita depois do sorriso é 23%. O árbitro recusa a solicitação se já houver piscada ativa. Os testes manuais de sorriso não solicitam piscadelas.

Os eventos `gesture:prepare`, `gesture:hold`, `gesture:release` vêm das fases do diretor corporal já existente. A face suaviza a intensidade de apoio com constante de 0,65 s. O calendário de novos beats espera enquanto há apoio corporal, e expressões sobrepostas compõem por máximo por lado. A face funciona sem gesto. Testes faciais isolados param o diretor e congelam o corpo antes de começar; não resolvem uma nova pose.

Composição: referência capturada → sorriso/sobrancelha limitados → overlays oculares atenuados por `(1-fechamento)^2` → fechamento pelo árbitro → pupilas no referencial calibrado. Cada nome tem um único escritor. Controles ausentes/degenerados ficam indisponíveis; cabeça ambígua desabilita a auditoria candidata e o olhar calibrado. A presença do nome sozinha não habilita um controle.

Ocultação, saída do viewport, perda de contexto e redução de movimento suspendem o rAF e o relógio sem descartar a expressão atual. Trocar perfil restaura a referência antes de recriar o controlador. Descarte remove listeners e frames. Não foram adicionados timers permanentes, modelos duplicados ou novos materiais.

## Inventário medido no GLB privado

A auditoria usa os POSITION morph deltas relativos, conjunto afetado acima de 5% do maior delta (mínimo 1e-6) e amostra de até 97 vértices por primitive/controle, incluindo o maior delta bruto. Compara pesos 0 e 1 via `getVertexPosition`, skinning e matriz inversa da cabeça, restaurando o valor original em `finally`. Peso 1 serve à medição CPU, não é aplicado à apresentação. Contagens são vértices por primitive, sem soldagem entre primitives. Deslocamentos estão em unidades locais do modelo, não em milímetros.

| Controle | Vértices afetados | Máx. deslocamento amostrado em peso 1 | Movimento geométrico medido | Teto candidato | Sobreposição com fechamento do próprio lado | Uso |
|---|---:|---:|---|---:|---:|---|
| B_Cheerful_R | 157 | 0,006032 | Região acima dos olhos; componente média para cima +0,002850 | 0,12 | 3,18% | Teste isolado |
| B_Cheerful_L | 157 | 0,006032 | Região acima dos olhos; componente média para cima +0,002822 | 0,12 | 3,18% | Teste isolado |
| B_Up_Add_R | 189 | 0,006414 | Região acima dos olhos; componente média para cima +0,005914 | 0,12 | 4,76% | Overlay candidato + teste |
| B_Up_Add_L | 189 | 0,006414 | Região acima dos olhos; componente média para cima +0,005969 | 0,12 | 4,76% | Overlay candidato + teste |
| E_Smile_R | 871 | 0,012986 | Região ocular; componente média para cima −0,001781 | 0,08 | 98,85% | Overlay atenuado + teste |
| E_Smile_L | 854 | 0,012986 | Região ocular; componente média para cima −0,002126 | 0,08 | 98,83% | Overlay atenuado + teste |
| E_Squint_R | 766 | 0,004310 | Região ocular; componente média para cima +0,002455 | 0,08 | 98,96% | Overlay atenuado + teste |
| E_Squint_L | 749 | 0,004310 | Região ocular; componente média para cima +0,002442 | 0,08 | 98,93% | Overlay atenuado + teste |
| M_Smile_R | 129 | 0,003345 | Região inferior aos olhos; delta lateral assimétrico não nulo | 0,12 | 0% | Sorriso candidato + teste |
| M_Smile_L | 129 | 0,003345 | Região inferior aos olhos; delta lateral oposto não nulo | 0,12 | 0% | Sorriso candidato + teste |
| P_Nose_Up | 85 | 0,005785 | Região abaixo dos olhos; componente média para cima +0,002853 | 0,04 | 0% | Laboratório somente |
| P_Nose_Down | 106 | 0,004159 | Região abaixo dos olhos; componente média para cima −0,001929 | 0,04 | 0% | Laboratório somente |

“Para cima” é projeção no eixo derivado dos dois Pupil_Up, não um palpite sobre o eixo global. Regiões são inferências geométricas pela posição dos vértices em relação aos olhos; não comprovam emoção, naturalidade nem aparência da sobrancelha. Sobreposição mede interseção de vértices afetados: sugere risco de composição, mas não comprova um artefato visual. Nenhum controle recebeu aprovação artística nesta entrega.

Os tetos são o menor entre limites iniciais conservadores e um orçamento geométrico de 2% da distância entre olhos dividido pelo deslocamento amostrado (1% para nariz). Não são uma garantia anatômica e não representam o máximo global exato da deformação. O relatório em tempo de execução inclui parts, bounds, centros, deltas, elegibilidade e sobreposições de cada arquivo efetivamente escolhido. Estes resultados privados de referência não substituem essa verificação.

O beat sorriso + nariz aplica P_Nose_Up com atraso e envelope curto. P_Nose_Down só aparece no teste individual. O estado nasal é **LAB_ONLY_VISUAL_PENDING**, não rejeição artística e não autorização para ativação autônoma.

## Testes reproduzíveis

```sh
npm ci --no-audit --no-fund
node tests/hsin-face-acting.test.mjs
node tests/hsin-face-pass-b.test.mjs
node tests/hsin-gesture-ik.test.mjs
node tests/hsin-acting-director.test.mjs
npm run build
npm run check:ux
git diff --check
# Opcional, arquivo autorizado selecionado pelo autor; nunca incluído no CI:
node tests/hsin-face-private.test.mjs /caminho/privado/hsin-v.1.0.5.glb
```

| Verificação | Resultado e limite |
|---|---|
| Build de produção | PASS |
| Testes Pass A | PASS, comportamento anterior mantido |
| Testes B determinísticos | PASS: 5.000 frames A=zero B; seeds; estados de fixação; limites; pausa ocular; nariz ausente do calendário; teste nasal; composição; sinais corporais; troca A/B e restauração |
| Rig sintético/gesto/diretor | PASS; referências corporais existentes preservadas |
| Auditoria GLB privado | PASS: 9 partes skinned, 823 joints, 8 controles de pupila calibrados, 12 candidatos não degenerados, restauração exata |
| Teste Node com GLTFLoader | Imagens placeholder; nenhuma renderização ou validação de textura |
| Manifesto de transferência | PASS: bytes e SHA-256 dos oito arquivos conferidos |
| Contrato UX | 97/100, mesmas falhas prévias: `nav: lab label aligned`, `nav: music static link`, `curiosidades: header link` |
| Reduced motion/ciclo de vida | PASS automatizado: suspensão, sem avanço oculto, testes manuais bloqueados, listeners/frames removidos |
| Página B em navegador Work | PASS de entrega da UI: versão B, CSP blob OK, grupo recolhido |
| Renderização da personagem | VISUAL_QA_BLOCKED no Work: tentativa real na referência A terminou em `THREE.WebGLRenderer: Error creating WebGL context` |
| Samsung Internet / desktop com GPU | PENDENTE; não medido por emulação |
| FPS/memória GPU | NÃO MEDIDOS; sem metas declaradas atingidas |

## QA visual e limitações

**Resultado: CANDIDATO / VISUAL_QA_BLOCKED para a personagem no Work.** O erro ocorreu antes de poder renderizar o GLB na referência Pass A. A prévia B abre e a UI funciona; isso não remove o bloqueio de contexto WebGL. Nenhuma captura de argila, imagem de referência do pacote ou cena vazia foi apresentada como prova da atuação B. Não há capturas A/B reais da personagem nesta entrega. A existência de deltas e testes CPU não prova expressão legível, materiais corretos ou contato corporal.

Para validação no Samsung Internet e desktop compatível:

1. Abrir a prévia imutável B, confirmar CSP blob OK e selecionar o GLB privado localmente. Aproximar o rosto; manter material, luz e câmera iguais.
2. Selecionar perfil A, iniciar e comparar com B sobre a mesma referência. Restaurar deve reproduzir exatamente a expressão anterior. No B em 0%, observar o comportamento A.
3. Testar três piscadas e a piscadela direita anatômica; conferir em vista frontal e 3/4. Observar sorriso + olhos durante fechamento.
4. Expandir apenas Pass B, testar individualmente cada controle, depois sorriso e sorriso + nariz. Rejeitar artefatos e manter nariz fora do automático até decisão explícita.
5. No automático, mover e parar o cursor: aquisição, pequena fixação, desvio e retorno sem salto. Orbitar câmera e repetir; no Android tocar/arrastar deve produzir atenção breve sem comandar o gesto.
6. Reproduzir o ciclo corporal de QA já existente: face deve antecipar/sustentar/liberar sem mudar solver ou pose. Expressões devem funcionar também com ciclo parado.
7. Ocultar/retornar, ativar reduced motion, alternar A/B, restaurar e trocar arquivo. Ver apresentação local deve esconder todos os controles de autoria.
8. Guardar vídeos/capturas no aparelho, registrando URL/commit, navegador, GLB/SHA, perfil/intensidade, material/luz/câmera e resultado. Não comitar esses recursos.

Há ainda pendências artísticas: legibilidade e caráter do sorriso, amplitude/timing das sobrancelhas, nariz convincente, lateralidade aparente após órbita e coordenação sutil com gesto. Os testes não substituem uma decisão do autor. Nenhuma remodelagem, exportação GLB, pole vector, dedo/braço esquerdo ou revisão corporal foi feita.

## Privacidade e créditos

O PR contém código, testes e este relatório. O GLB original foi mantido intacto; não foram publicados GLBs, texturas, renders privados ou recursos derivados protegidos. Seleção local continua pela File API, sem upload a servidor. Atribuições preservadas: Kuro Games, Lvoxx, imblue__ e LSCherry; crédito não substitui licença de redistribuição. Sem merge automático.
