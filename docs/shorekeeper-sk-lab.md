# Shorekeeper · Inspection Studio F1.8

Rota: `/experimentos/sk/`. Base verificada: head final do PR #184, `7f61a9e769827c53f983da949ba637e1c87a5c30`, que inclui #185. #184 foi mesclado na branch de #182, ainda em draft; esta entrega fica empilhada nessa branch. **PARTIAL / VISUAL_QA_PENDING.**

## O que mudou

- Diretor extraído de testes para `src/scripts/shorekeeper/director.mjs`; o caminho antigo apenas reexporta a API, preservando os ensaios F1.6. Um único mixer, sem update externo concorrente. Tempos editados durante um gesto são agendados para o próximo; velocidade ajustável ao vivo; repetição enfileirada, interrupção e retorno auditável.
- Responsabilidades separadas em carregamento/descarte (`local-model.mjs`), cena/câmera (`stage.mjs`), rig/morphs/materiais (`inspection.mjs`), política de estados (`lab-state.mjs`) e orquestração da UI (`shorekeeper-sk-lab.mjs`).
- Estados centralizados: sem modelo, carregando, pronto, animando, pausado, erro e contexto perdido. Rig manual bloqueado enquanto há atuação; executar gesto restaura explicitamente os offsets manuais antes da atuação.
- File API com progresso de leitura real, etapas de hash/preparação, cancelamento de FileReader e geração de pedidos. Uma parse antiga descarta somente os próprios recursos; o modelo anterior é mantido até a nova leitura ser adotada. O parser não pode ser interrompido internamente; o resultado tardio é descartado.
- SHA-256 local e identificação da versão F1.6. Outros hashes são aceitos e identificados. Validação de container/chunks e recusa de URI externa em buffers, imagens ou extensões; LoadingManager limita recursos a data/blob gerados localmente. Sem upload ou telemetria do GLB.
- UI azul noturno/marfim/dourado, viewport dominante, painel ajustável no desktop e inferior/recolhível no mobile, abas com teclado, controles de toque e rolagem independente.
- Bones pesquisáveis por nome/função, seleção por grupos, pai/filhos/TRS/influência por malha, offsets reversíveis e presets modestos. Materiais original/neutro e MASK experimental somente Bangs/Alpha; câmera frontal/¾/perfil/costas/rosto, skeleton/wireframe/culling e luz.
- Morphs agrupados, pesos persistentes (editar um não apaga os demais), presets filtrados pelas capacidades do GLB, mapa configurável e varredura bilateral 0/.25/.5/.75/1. E_Close não é wink independente. Marcação humana de defeitos captura o estado de teste sem imagens ou correção arbitrária.
- PNG local, JSON de diagnóstico, configuração exportável/importável e resumo de erros. Incluem commit/branch de build, hash do GLB, câmera, morphs, offsets, tempos, estado e navegador. Exportação somente por ação do usuário.
- Diagnóstico amostrado a cada 750 ms; FPS/frame interval observados, custo CPU de render, draw calls/triângulos e contagens do Three.js. `renderer.info.memory` é contagem de objetos, **não VRAM**. Teto de DPR/pixels, 30/60 FPS, suspensão por visibilidade, pagehide/pageshow persistidos e contexto WebGL perdido/restaurado; não força context loss em trocas de modelo.

## Arquivos

Página e CSS da rota, orquestrador, cinco módulos de produção em `src/scripts/shorekeeper/`, shim F1.6, testes do laboratório, novo ensaio CPU privado, workflow sintético e esta documentação. `astro.config.mjs` permite exclusivamente `terminal.local` como host adicional de desenvolvimento para o QA gerenciado. Hsin/Phrolova/modelos e materiais privados não foram editados.

## QA executado

| Critério | Estado | Evidência / limite |
|---|---|---|
| Privacidade/formato | PASS unitário | GLB truncado e URIs http/file/blob/relativas/não autorizadas recusados; data MIME autorizado aceito. Não substitui fuzzing ou auditoria de segurança completa. |
| Segunda leitura/cancelamento | PASS sintético + CPU | Pedidos concorrentes resolvidos fora de ordem; somente cena antiga descartada. Cancelamento descarta parse tardia. Duas cargas CPU do GLB real verificadas; não é QA de upload de texturas GPU. |
| Morphs e rig | PASS CPU / PARTIAL visual | GLB privado: 8 meshes, 249 bones, 97 instâncias / 83 nomes; 415 atribuições (83×5 pesos), 4.980 amostras de vértices finitas; offsets e retorno à referência verificados. |
| Atuação | PASS numérico / PARTIAL visual | Fixture F1.6 preservada, tempos pendentes, velocidade, pausa e update único; ensaio privado de 716 passos preservou os resultados anteriores. |
| Descarte | PASS unitário / PARTIAL GPU | Sets de recursos compartilhados e bitmap fechados uma vez; 8 geometrias, 8 materiais, 8 texturas, um skeleton no ensaio privado. GPU real não avaliada. |
| Layout desktop | PASS sem modelo | Navegador real 1363×936, sem overflow horizontal, abas e bloqueio de atuação sem WebGL conferidos. |
| Layout móvel | PARTIAL | Iframes de 360/390/430 px inspecionados, sem overflow de conteúdo na primeira amostragem; scrollbar desktop reduzia os clientWidth a 345/375/415. A automação posterior do harness foi bloqueada pela política do browser. Não é teste em dispositivo Android. |
| WebGL2 / materiais / captura da personagem | BLOCKED | Contexto indisponível no navegador de QA. Mensagem de erro e controles bloqueados verificados. Nenhuma imagem da personagem foi produzida ou publicada. |
| Samsung Internet/Chromium Android, pinch/orientação | PENDING | Requer aparelho real. |
| Reduced motion | PARTIAL | CSS sem transições cosméticas e atuação apenas explícita; pausa ao mudar preferência. Preferência do navegador não foi emulada nesta sessão. |
| Hsin e build | PASS local | `npm run check` e build completos; inclui regressões atuais da Hsin (600s numéricos) e Sophia. CI remoto deve ser conferido no PR. |
| bfcache/context restore | PARTIAL | Tratamento implementado, mas restauração real de uma cena WebGL não pôde ser exercitada. |

Os testes Node do GLB real usam mock explícito de ImageBitmap; não comprovam decodificação pelo navegador, desenho dos materiais ou velocidade de GPU. Nenhum número de FPS/VRAM de dispositivo foi inventado.

## Reproduzir os testes

```
node tests/shorekeeper-f16/synthetic-test.mjs
node tests/shorekeeper-sk-lab.test.mjs
npm run check
npm run build
# Opcional e somente privado; não colocar modelo em public/:
node tests/shorekeeper-sk-private.mjs /caminho/privado/modelo.glb
node tests/shorekeeper-f16/private-test.mjs /caminho/original.glb /caminho/corrigido.glb
```

## Teste no celular

1. Baixe a cópia GLB corrigida para Downloads do aparelho. Abra a URL completa da prévia deste PR terminada em `/experimentos/sk/` no Samsung Internet ou Chromium com WebGL2.
2. Em Modelo GLB, selecione o arquivo. Confira a identificação SHA-256: F1.6 esperado `39a45609b86699a49200cc1931227e3e4ae6ec15af8ed4ddc87d3dd982e7af61`. A página pode ser pública; o arquivo permanece no navegador. Noindex não protege acesso.
3. Recolha Controles e teste arrasto, pinch e câmeras. Reabra o painel e mude a orientação; confirme viewport sem overflow e rolagem do painel.
4. Teste seleção/rotação/restauração de bones, cinco pesos de E_Close, pupilas e presets; marque problemas visuais e registre observações. Compare Original/Neutro/MASK separadamente.
5. Execute gesto, pause/retome, altere tempos durante o movimento, interrompa, repita e confira o erro numérico do retorno. Mude de aba durante o gesto.
6. Abra um segundo GLB, selecione novamente o primeiro, cancele uma leitura e teste voltar/avançar na navegação. Em Diagnóstico, salve JSON, configuração e PNG local. A restauração de contexto depende do navegador; a página não provoca perdas artificiais.

## Qualidade e próximos passos

A interface foi reorganizada para inspeção e possui proteções de estado e evidência numérica mais fortes. A clareza, hierarquia e uso do espaço puderam ser avaliados sem modelo; a usabilidade tátil e a legibilidade dos defeitos da personagem ainda dependem do aparelho real. A próxima ação necessária é uma rodada WebGL2 desktop/Android com o GLB local, não nova reconstrução nem atuação autônoma. **Shorekeeper não está aprovada para produção.**
