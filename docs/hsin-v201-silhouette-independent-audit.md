# Revisão independente — PR #187 / HSIN V2.0.1

**Escopo:** instrumentação da silhueta; não alteramos GLB, morphs, rigs, timelines publicados, pesos de solver nem a pose do candidato E.

**Base confirmada:** PR #187 / `354ef41da1de991d77db6fd53f2bf7996804824d`, que por sua vez repousa sobre #181 → #180 → #179 → #178.

## Achado principal: tempos de amostragem não equivalentes

O teste geométrico público `hsin-hair-caress-geometry.test.mjs` foi escrito para a animação pública de **87 quadros** e seleciona diretamente os índices 26, 36, 39, 43, 46, 50, 54, 60, 70 e 80. O candidato experimental E contém **109 quadros** e marcos normalizados diferentes. A mesma posição absoluta na matriz de quadros não representa o mesmo instante do gesto.

| Marco | Público (87 quadros) | Candidato E (109 quadros) |
|---|---:|---:|
| Hover-in | 26 | 34 |
| Start | 36 | 44 |
| End | 50 | 58 |
| Hover-out | 60 | 68 |

Por exemplo, o quadro 43 do público está dentro de **caress (start→end)**, mas o quadro 43 do E ainda está em **contactApproach (hoverIn→start)**. Uma comparação de folgas nesses dois índices seria inválida.

**O que esta correção faz:** cria `scripts/lib/hsin-stage-alignment.mjs`, com validação estrita de nomes de ossos, quaternions, marcos e duração, além de `summarizePosePhases`. O relatório `scripts/measure-hsin-silhouette.mjs` passa a incluir `stageAligned` com limites, máximos e médias de cobertura por fase. Há testes sintéticos para 87/109 quadros, fase correta do índice 43 e entradas inválidas. Todos entram em `check:hsin` e no workflow.

**O que esta correção não faz:** não recertifica as 27 falhas físicas citadas no relatório original. Os problemas observados de folga com tronco, mão e rosto continuam sendo sinais de risco. O número de asserções não deve ser interpretado como um resultado reproduzido no mesmo ponto temporal sem reexecutar a avaliação geométrica para as fases equivalentes da versão E.

## Outras limitações confirmadas do PR #187

1. **Métrica de projeção, não pixel coverage real:** `eyeCoverage` considera discos de raio 18 mm centrados em vértices skinned do braço e uma grade de 12×12 pontos sobre o bounding box dos olhos. O resultado `1.000` significa 100% das **amostras do proxy** cobertas, não prova 100% de pixels ocultos em uma captura.
2. **Projeção não resolve anatomia:** o resultado `0.000` na câmera não implica ausência de autointerseção, segurança de manga/cabelo nem leitura correta da carícia.
3. **Visualização E contradiz a intenção:** o próprio relatório da PR #187 documenta que a mão permanece junto ao quadril, em vez de comunicar contato com o cabelo. É um bloqueador artístico mesmo com a métrica de silhueta zerada.
4. **CI verde não é aprovação:** o workflow executa invariantes da biblioteca e regressões do caminho **público**, não certifica E. O PR #187 está corretamente em draft.
5. **Real-device QA pendente:** SwiftShader pode validar cor e geometria, não FPS/VRAM, latência, naturalidade ou toque no Samsung Internet.

## Critério para próxima iteração de atuação

- Testar nova região do cabelo e modalidade de roçar/pairar, **sem liberar colisão por relaxamento arbitrário de limiares**. Resolver e medir as fases homólogas do perfil experimental, tanto na vista 3/4 quanto no perfil.
- Exigir contato visualmente inequívoco com o cabelo, rosto desobstruído, mangas/antebraço fora do tronco, transições contínuas, dedos legíveis e restauração da pose exata.
- Aprovar somente mediante imagens WebGL reais do **candidato testado** (não da trajetória pública) e comparação explícita fase a fase.
- Após aprovação de geometria e silhueta, executar testes de estabilidade e desempenho no Samsung Internet. Só então considerar merge da pilha.

**Decisão:** REVIEW_COMPLETE / QA_HARDENING_ONLY / ARTISTIC_BLOCKED. Preservar a branch original do Claude; não mesclar na main.
