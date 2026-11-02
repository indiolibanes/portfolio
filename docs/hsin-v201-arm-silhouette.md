# Hsin V2.0.1 — Silhueta do braço esquerdo na câmera pública (correção final)

Status: **não pronto para merge.** O problema P0 (antebraço esquerdo cruzando o olho durante a carícia) foi **medido, explicado e reproduzido**, e a solução candidata que o elimina na câmera foi encontrada e arquivada, mas ela viola 27 asserções de contrato de segurança e de alcance do teste de geometria. Por isso o caminho público continua com os dados do PR #181. Nenhum limite de teste foi alterado.

Testes numéricos não aprovam visualmente. `WEBGL_VISUAL_QA_PENDING`.

## Base

- Base: `review/hsin-v201-metrics-fix-2026-11-02` (PR #181), head auditado `ebcb243ff7aba8ffeb16a82200cb4bb8dd0c3422`.
- Dados públicos: os mesmos do PR #181 (`hsin-v2.1-acting.json`, `hsin-v2.0.glb`, perfil aprovado). Nenhuma pose pública mudou.

## 1. Diagnóstico (medido, não suposto)

Medição na câmera pública real (`lunarCameraFit`, azimute 8°, rotação raiz −62°, FOV 34°), com os quadros assados atuais, cobertura da área dos olhos pelo braço **à frente** do olho:

| Gesto | Câmera | Pior quadro | Cobertura máx. | Média |
| --- | --- | --- | --- | --- |
| Hair Caress (esq.) | paisagem 16:9 | 45 | **1,000** | 0,402 |
| Hair Caress (esq.) | retrato 0,6 | 47 | 0,882 | 0,292 |
| Lip Touch (dir.) | paisagem / retrato | 0 | 0,000 | 0,000 |

Causa mecânica: na coordenada da câmera o cotovelo fica em **y ≈ 1,29–1,34** (altura do ombro, 1,30) e em **z ≈ +0,18 a +0,24**, ou seja, à frente do rosto, na direção da câmera. Do ponto de vista da câmera, o antebraço entra em linha de visão sobre o olho. Não é colisão 3D: as folgas com a malha estavam dentro dos limites, por isso o teste anterior não detectava o problema. Isso confirma o brief: ausência de colisão não é qualidade de pose.

## 2. O que foi acrescentado (permanece no branch)

- `scripts/lib/hsin-silhouette.mjs`: câmera pública reproduzida a partir das funções do próprio palco, projeção, e oclusão que só conta o braço **à frente** do olho.
- `scripts/measure-hsin-silhouette.mjs`: relatório por quadro (`SILHOUETTE_JSON=…` grava o JSON).
- `tests/hsin-silhouette.test.mjs`: testa só as invariantes da biblioteca (eixo óptico, oclusão na frente, lateral livre). Não afirma que o gesto passa; isso é o relatório e a revisão visual. Registrado em `check:hsin` e no workflow.
- `scripts/data/experiments/silhouette-E/`: solução experimental arquivada (cinco estágios, relatório, e o `hsin-v2.1-acting.experiment.json` baked).

## 3. Experimentos (todos fora do caminho público)

Mudanças testadas no solver: termos de câmera (cotovelo com teto de altura e de profundidade; cobertura dos olhos ≤ 3 % nas duas câmeras), folga mínima da ponta no contato (3,5 mm) e no pairar (8 mm), mínimos do solver alinhados aos limites do teste (antes eram mais frouxos, ex.: mão–rosto 20 mm contra 35 mm no teste), e pesos em escala de milímetro.

Âncoras (ponto de contato no cabelo, estágio `start`). **Atenção:** as linhas vêm de rodadas feitas em momentos diferentes, com pesos e mínimos do solver diferentes; a ordem da tabela segue a ordem das rodadas. Servem para comparar tendências, não como números finais.

| Âncora (x, y, z) | Alvo a | Ponta–cabelo | Mão–rosto | Resultado |
| --- | --- | --- | --- | --- |
| (0,099; 1,515; −0,045), atual | — | — | — | cotovelo à frente; cobertura 1,0 |
| (0,085; 1,49; −0,075), sugestão do relatório anterior | 7,9 mm | 4,3 mm | — | não alcança |
| (0,10; 1,46; −0,08) | 3,8 mm | 3,3 mm | 27–30 mm | mão perto demais do rosto |
| (0,10; 1,46; −0,10) | 5,8 mm | 5,7 mm | 36,5 mm | **melhor equilíbrio** (arquivado) |
| (0,12; 1,46; −0,10) | 3,7 mm | 0,4 mm | 23,8 mm | toca o cabelo |
| (0,10; 1,44; −0,14) | 3,1 mm | 0,1 mm | 8,9 mm | pior |

Teto de cotovelo: Z ≤ 0 → alvo 6,6 mm, mão 33,6 mm; Y ≤ 1,30 → alvo 2,9 mm, mão 32,0 mm. Nenhum dos dois satisfaz as duas restrições.

Tempo: o pico de velocidade angular do braço superior (7,16°/quadro na aproximação, depois 7,05° na volta) foi reduzido a **6,25°/quadro** alongando a aproximação de 26 para 34 quadros e a volta para 20 quadros (`TIMES = [0, 34, 44, 51, 58, 68, 88, 108]`). Isso é transparente e não depende de solver.

## 4. Resultado do conjunto arquivado (E)

Na câmera, a cobertura dos olhos cai de **1,000 para 0,000** em todos os quadros, nas duas câmeras. A silhueta resolve o P0 no critério que o brief define.

Porém, o mesmo conjunto falha **27 asserções** de `tests/hsin-hair-caress-geometry.test.mjs`:

- alcance: o `start` fica a 5,8 mm do alvo (limite 4 mm); o `end` a 4,8 mm (limite 5 mm);
- mão–rosto no contato: 33 mm (limite 35 mm);
- antebraço–tronco nos quadros de aproximação e de volta: 0,2–3 mm (mínimo 8 mm), **risco de interpenetração**;
- dedos–tronco a 0,2 mm; ponta tocando o cabelo em quadros intermediários que deveriam estar livres;
- mão–tronco 3,9 mm no quadro 68 (mínimo 8 mm).

Interpretação: para este ponto do cabelo, a posição que tira o braço da frente do rosto (cotovelo atrás, mão mais afastada) empurra o antebraço contra o vestido, e a posição que mantém a mão no alvo põe a mão a 32–34 mm do rosto. É um conflito geométrico entre contratos, não um ajuste de peso. Afrouxar qualquer um deles para passar seria exatamente o que o brief proíbe.

## 5. Prontidão para merge (avaliação objetiva)

- Caminho público: contratos íntegros (PR #181); **P0 não resolvido** no caminho público.
- Candidato E: resolve a silhueta medida, mas não é seguro (interpenetração na aproximação e no retorno) e não atinge o alvo.
- Recomendação: **não mesclar** nenhum dos dois como está. A decisão que falta é de direção artística/geometria, não de cálculo:
  1. trocar o gesto de "toque no cabelo" por um **pairar/roçar a 4–6 mm** do cabelo lateral, o que remove a exigência de alcance de contato e o conflito com a mão–rosto;
  2. ou escolher outra região do cabelo (nuca ou lateral mais baixa), o que exige nova varredura;
  3. ou aceitar, com registro de análise de segurança, uma folga antebraço–tronco menor só na manga.

## 6. Visual

Leitura visual do candidato E (quadros do CI, `docs/qa/hsin-v201-arm-silhouette/candidate-E-*.webp`):

- O olho ficou livre no 3/4 e no perfil, como a medição prevê.
- **Mas a carícia não se lê como carícia.** Na câmera 3/4 e na lateral esquerda, o antebraço fica junto ao corpo, o cotovelo baixo e a mão perto do quadril; em nenhum quadro de contato a mão aparece tocando o cabelo. Ou seja, a folga de 3–5 mm medida no solver não está se traduzindo em um contato legível. Isso é uma discrepância entre a medição e a imagem que precisa ser investigada antes de qualquer conclusão sobre o candidato.
- A composição (lábio + cabelo) fica legível para o lábio; a mão esquerda não chega ao cabelo de forma visível.

Conclusão visual: o candidato E melhora a silhueta mas **não entrega o gesto**. Não é aprovável.


Quadros do conjunto E (renderizados pelo CI no branch descartável `experiment/hsin-v201-arm-silhouette-E-render-2026-11-02`, que **falha os testes de contrato e não deve ser mesclado**) ficam em `docs/qa/hsin-v201-arm-silhouette/` quando disponíveis. Comparação com o PR #181 em `docs/qa/hsin-v201/`.

## Limites

- Medição de silhueta é projeção geométrica de pontos de vértice (raio de disco de 1,8 cm); não é rasterização. Ela não substitui a revisão visual.
- Nenhum FPS, desempenho em dispositivo ou naturalidade foi medido. A tela da câmera (16:9 e 0,6) é uma aproximação do enquadramento público.
- O cabelo da carícia é uma sugestão de área (5 cm de passada, polpa do indicador); não há simulação de cabelo.
