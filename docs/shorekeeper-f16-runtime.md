# Shorekeeper F1.6 — relatório consolidado

**2 novembro 2026 — PARTIAL / VISUAL_QA_PENDING.** A F1.6 parte do PR #182 no head `356065addebb302fcb804a8c6748071e15fb83f9`. Não toca na Hsin, Phrolova, player público ou main. O GLB permanece privado.

## Matriz de aceite

| Critério | Estado | Evidência e limite |
|---|---|---|
| Bounds dos 97 morphs | PASS | Deltas sparse expandidos com zero para entradas ausentes; 97 accessors corrigidos. O JSON restante e bloco binário são idênticos; comparação independente de 98.496 componentes sparse: 0 divergências. |
| Validador Khronos | BLOCKED | Executável indisponível; não se declara conformidade formal. |
| GLTFLoader | PARTIAL | Three.js 0.186.1 carrega a cópia, zero dos 97 avisos anteriores; decodificação de imagens simulada nos testes Node, não é teste de navegador. PNGs foram verificados na F1.5 separadamente. |
| Caixas e frustum | PARTIAL | Quatro caixas ampliadas, todas contêm as originais. Em 1.608 testes matemáticos de caixas/frustum, 20 posições de borda passaram de fora para dentro; `frustumCulled=true`. Não simula o culling do SkinnedMesh animado no renderer. |
| Corpo + tecido | PARTIAL | Mesmo mixer, corpo 80 tracks, baseline corporal de 143 e clip secundário 143; interpolação gradual entre referências, ambos em LoopOnce. Testes numéricos de interrupção, pausa, repetição e retorno. Não há aprovação visual ou garantia de ausência de saltos. |
| Rosto e material | BLOCKED | Viewer preparado para blink 0/.25/.5/.75/1, pupilas, ângulos e teste isolado MASK em Bangs/Alpha; sem avaliação visual real. |
| WebGL2 | BLOCKED | Navegador/WebGL2 não disponível nesta execução; viewer foi entregue para rodar localmente. |
| Descarte e desempenho GPU | BLOCKED | Sem contexto GPU; não há FPS, VRAM, tempo de carga nem verificação real de liberação. |
| Hsin | PARTIAL | Nenhum arquivo da Hsin alterado. Três testes de uma cópia local anterior passaram, mas ela não corresponde ao head atual: não se declara regressão completa na base atual. |

## Correção do arquivo privado

Original SHA-256 `2c9673907cf19d6e7c0f82c4bdb5a418446f8de5c09448b067a17f5270d3686e`.
Cópia com bounds SHA-256 `39a45609b86699a49200cc1931227e3e4ae6ec15af8ed4ddc87d3dd982e7af61`.

O script `fix-morph-bounds.py` aceita apenas a estrutura comprovada de morph FLOAT VEC3 sparse sem bufferView base; falha diante de formatos desconhecidos e não sobrescreve arquivos. Os limites são calculados sobre o array expandido integral, inclusive zeros, e a cópia é reversível mantendo o original. O script não transforma a geometria nem recompõe o GLB.

## Composição e evidência numérica

O baseline retém os 143 canais secundários da animação corporal; o gesto corporal sem eles e as duas alternativas secundárias atuam sobre um único mixer. O peso passa suavemente do baseline para Rib, evitando a troca instantânea entre referências inicialmente diferentes. Ao parar/interromper, todos os pesos retornam suavemente à pose de referência. Um pedido de repetição durante o gesto aguarda o retorno para iniciar novamente. O clip secundário é LoopOnce e permanece no último quadro até a saída; o corporal também é LoopOnce. Tempos de entrada e transição são parâmetros experimentais, ainda não aprovados visualmente.

No ensaio privado de 716 passos a 60 Hz, incluindo pausas, interrupção e nova execução: máximo por passo local **6,224°** (antebraço), máximo mundial **7,477°** (dedo), máximo local nos bones secundários **1,895°** (saia). São máximos das amostras e não um limiar de aceitabilidade visual; o movimento original do braço também contribui. Quaternions retornaram ao valor inicial com tolerância de 1e-6 por componente. A prova não garante ausência de clipping, continuidade perceptiva, nem coerência artística da pose.

Fixture não proprietária testa partição, rejeição de nomes duplicados, corpo e tecido simultâneos, transições, pausa, interrupção, repetição enfileirada e chamada única ao mixer por avanço. Um workflow dedicado executa a fixture no CI. Os testes com GLB exigem execução manual e não integram CI.

## Reprodução local

No checkout da branch deste PR, com dependências do repositório instaladas, rode da raiz:

```
node tests/shorekeeper-f16/synthetic-test.mjs
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8000/tests/shorekeeper-f16/viewer.html` no navegador da **mesma máquina**, escolha o GLB pela File API e feche o servidor ao terminar. Nenhum arquivo é enviado pelo viewer. Em Android, o servidor e o navegador devem estar na mesma máquina; use outra máquina com browser compatível caso não possa executar o servidor local. Não exponha o servidor em rede pública nem mova o GLB para `public/`.

No viewer, confira frente/3⁄4/perfil, rosto nos cinco pesos de fechamento, movimentos das pupilas, cílios, mãos, cabelo, saia, início/meio/fim do gesto, interrupção, repetição e pausa. O seletor MASK é um experimento somente em Bangs/Alpha; não é substituto do shader do jogo. A troca e aceitação visual são responsabilidade da inspeção no navegador.

O script de correção usa Python e NumPy:

```
python3 tests/shorekeeper-f16/fix-morph-bounds.py /caminho/original.glb /caminho/copia-nova.glb
node tests/shorekeeper-f16/private-test.mjs /caminho/original.glb /caminho/copia-nova.glb
node tests/shorekeeper-f16/culling-test.mjs /caminho/original.glb /caminho/copia-nova.glb
```

Todos os scripts recebem paths explícitos e não enviam dados à rede. Não publicar os resultados visuais derivados do asset.

## Próximos passos estritos

1. Rodar o validador Khronos local na cópia corrigida, se disponível.
2. Executar uma inspeção WebGL2 privada no viewer, cobrindo vista, morphs, corpo/tecido e bordas do frustum. Registrar problemas concretos antes de novas alterações.
3. Rodar os testes Hsin na base atual e inspecionar os resultados do workflow do PR.
4. Se a inspeção identificar defeitos, calibrar o blend/tempos ou materiais pontualmente; não iniciar F2 de expressividade até aprovar fechamento bilateral e movimento.
