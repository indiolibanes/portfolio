# Hsin Combat R2.0.1: reconstrução anatômica dos braços

**Experimental. A apresentação pública permanece V2.0.1. Estado: `R2.0.1_TECHNICAL_GATE_PASS · VISUAL_QA_PENDING`. Sem merge.**
A R2.1 (coreografia, face, VFX, câmera e secundários) **não foi iniciada**. Ela depende da aprovação visual da R2.0.1 pelo proprietário e de QA em WebGL real.

## Base e escopo

- **Base:** PR #270, `experiment/hsin-combat-r2-20261107 @ 6227e1c6744c6cd7a46e366a3a6a71f294254c0c` (empilhado sobre #269).
- **Branch:** `experiment/hsin-combat-r201-20261107`.
- **Intocados:** `main`, #269 e #270.
- **Fora do domínio Combat:** o GLB, o rig, os pesos de skin, as animações contemplativas, a Dança Lunar R1/R2/R3, `hsin-baked-pose`, `hsin-body-repertoire`, `hsin-lip-hair` e `hsin-cinematic-idle`. O CI confere que esses arquivos estão byte a byte iguais à base (`contemplative-untouched`).
- **Vídeos:** os 16 arquivos dos dois ZIPs reenviados têm SHA-256 idêntico aos 16 do `sources-manifest.json` da R2. Por isso não houve nova ingestão.
- **Captura citada no brief:** não veio anexada nesta rodada. A referência "rejeitada" usada aqui são os renders R2 do próprio PR #270 e o asset R2 medido quadro a quadro.

## Referência verificável da R2 (antes)

| Item | Valor |
|---|---|
| Asset | `combat-r2.json` de `6227e1c6` |
| SHA-256 | `189f5903…` |
| Tamanho | 1 457 955 B |
| Canais | 253 |
| Quadros | 253 |

As métricas completas estão em `arm-anatomy-before.json` e `arm-anatomy-per-frame.csv`. Elas cobrem todos os 253 quadros, os dois braços, sobre o GLB real (`scripts/qa-hsin-combat-arms.mjs`).

## Diagnóstico P0 (respostas medidas)

Fatos do rig, lidos no GLB:
- A dobradiça do cotovelo é o eixo **+X local** (o antebraço já está flexionado em +X no repouso).
- Os ossos apontam para +Y.
- A cadeia DEF é Clavícula → UpperArm → UpperArm.001 → Forearm → Forearm.001 → Hand.
- **A pele de todo o antebraço está em `DEF-Forearm.001`**, a mão e a palma em `ORG-Hand`, e o braço em `DEF-UpperArm`/`.001`.
- Existem ossos de torção (`UpArmTwist`, `ForeTwist`, `HandTwist`), mas **sem peso** de skin.

| # | Pergunta | Resposta medida (R2) |
|---|---|---|
| 1 | Primeira deformação | **Cotovelo**, nos dois braços, a partir de 0,2 s (R) e 0,23 s (L). O antebraço gira fora da dobradiça. |
| 2 | Onde começa | No **cotovelo**, não no ombro nem na clavícula. A clavícula fica parada no R2, medida no referencial do tórax. |
| 3 | Erro de eixo | **Sim, dois.** O antebraço e o punho flexionavam em eixos copiados das poses contemplativas (`signature`/`chest`): ~10° fora de +X à direita e **−X** à esquerda. Além disso, o braço girava em eixos **fixos do mundo** enquanto o tronco girava ±20°. |
| 4 | ORG/DEF | Reproduz corretamente: folga máxima de 0,025 mm. |
| 5 | Antebraço fora do eixo | **Sim.** O eixo do giro ficou até 10,5° (R) e 19,5° (L) fora da dobradiça. O cotovelo saiu do próprio plano até 8,6° (R) e **63,7° (L)**. |
| 6 | Torção do punho | Pequena no R2 (≤ 1,4°). O punho "pendurado" vinha da mão herdando o antebraço torto, sem intenção própria. |
| 7 | Skin weights | Não há erro de pesos. Porém o antebraço inteiro anda num único osso, então dobras profundas colapsam o vinco: compressão de aresta 0,27 (R) e 0,18 (L) já no R2. |
| 8 | Perspectiva × real | As duas coisas. O comprimento dos ossos não muda (no máximo 0,003 mm: **não há alongamento real**). Mas o ângulo do cotovelo projetado na vista frontal difere do anatômico em até 42°, o que dá a leitura de "braço elástico". |
| 9 | Rotação do tronco | **Agrava.** A correlação entre \|yaw do tronco\| e o erro do cotovelo é 0,55 (R) e 0,54 (L). O pior quadro R (1,47 s) coincide com yaw de −17,5°. |
| 10 | Mangas | Contribuem para a leitura. O tecido da manga chega a 47 % (R) e **97 %** (L) do comprimento do antebraço além do cotovelo, alongando a silhueta. |

**Defeito mais grave encontrado:** o cotovelo **esquerdo** do R2 entrava em **hiperextensão até −25,6°** (dobrava para trás) em 164 dos 253 quadros.

## Correção (domínio Combat apenas)

`scripts/lib/hsin-arm-anatomy.mjs` (offline) e `scripts/bake-hsin-combat-r2.mjs`:

- **Alvo da mão, polo e intenção** escritos no referencial do tronco (Spine2), não em eixos do mundo. Alvos interpolam distância e direção separadamente (PCHIP, contínuo C1), sem paradas a cada chave.
- **Ombro:** o braço gira o mínimo necessário e depois rola sobre o próprio eixo até a dobradiça +X ficar normal ao plano ombro–cotovelo–punho, com o sentido de flexão do repouso. O polo é coerente no tempo.
- **Cotovelo:** uma rotação **apenas em +X**, o que torna a hiperextensão impossível. A flexão é limitada a 80°, porque acima disso o vinco colapsa neste skin.
- **Punho e mão:** a mão segue o antebraço na relação de repouso. A pronação é limitada a 70° e a 3,5°/quadro, e 50 % dela vai ao osso de pele distal do antebraço. A extensão do punho é feita na direção do dorso da mão.
- **Clavícula:** só sobe quando a mão passa da altura do ombro (máximo atingido 4,3°).
- **Torção distribuída** em torno do eixo próprio de cada osso DEF: metade do rolamento do ombro vai a `DEF-UpperArm` e metade da pronação a `DEF-Forearm.001`. Isso não desloca nenhuma articulação.
- **Preservado do R2:** quadril, abaixamento, yaw do tronco, cabeça, pernas, apoio, lattice de recuperação, camada secundária, sequência e marcadores.

Partitura (autoral, sem novos golpes):

| Momento | O que acontece |
|---|---|
| Preparação | Guarda baixa, cotovelos para baixo e para trás, palmas para dentro. |
| Basic 01 | A direita recua e faz uma varredura em crescente para fora e para a frente, na altura do peito, com a palma para baixo e os dedos conduzindo. A esquerda fica em guarda. |
| Basic 02 | Espelho do Basic 01: o braço esquerdo varre, o direito guarda. |
| Skill | Carga "segurando a esfera": a direita com a palma para baixo por cima, a esquerda com a palma para cima por baixo, as mãos separadas. Na emissão, a direita abre para cima, para fora e para a frente, com o punho estendido para apresentar a palma; a esquerda abre baixa. |
| Recovery | Retorno pela guarda até a referência exata. |

## Gate anatômico (CI run 42433664242, todos os 253 quadros, GLB real)

| Métrica | R2 R | R2 L | R2.0.1 R | R2.0.1 L | Limite |
|---|---:|---:|---:|---:|---:|
| Δ comprimento ósseo máx. (mm) | 0,003 | 0,001 | 0,008 | 0,014 | 0,5 |
| Folga ORG/DEF máx. (mm) | 0,025 | 0,013 | 0,078 | 0,090 | 0,5 |
| Flexão do cotovelo (°) | 18,5…78 | **−25,6**…20,5 | 18,5…80 | 19,9…80 | ≥ −1, ≤ 150 |
| Cotovelo fora do plano (°) | 8,6 | **63,7** | 2,1 | 3,0 | 6 |
| Giro do antebraço fora da dobradiça (°) | 10,5 | 19,5 | 0,7 | 1,0 | 8 |
| Punho: swing / torção sobre a pele do antebraço (°) | 7,9 / 1,4 | 0 / 0 | 19,7 / 23,7 | 12,2 / 35,4 | 55 / 45 |
| Pronação total (°) | 1,4 | 0 | 49,1 | 70,1 | 80 |
| Punho projetado máx. (°), segmentos visíveis | 28,8 | 34,7 | 32,7 | 36,5 | 70 |
| Folga antebraço–tronco mín. (mm) | 99,7 | 99,6 | 70,5 | 16,2 | > 0 |
| Folga mão–rosto mín. (mm) | 237 | 243 | 233 | 237 | > 15 |
| Folga braço–braço mín. (mm) | 296 | 295 | 63,6 | 63,6 | > 0 |
| Passo local / mundo máx. (°/quadro) | 6,1 / 5,1 | 4,9 / 6,6 | 6,6 / 7,7 | 6,9 / 9,0 | 8 / 10 |
| Superfície: estiramento / compressão (arestas ≥ 4 mm) | 3,56 / 0,27 | 3,28 / 0,18 | 3,72 / 0,24 | 2,60 / 0,20 | envelope R2 (+10 % / −20 %) |
| Falhas no gate | 2 critérios, 235 quadros | 3 critérios, 233 quadros | **0** | **0** | |

Notas sobre os critérios:
- **Passo:** o limite de 8°/quadro local é o do teste R2 existente (`maxStep<8`), que continua aprovado.
- **Passo no mundo:** inclui o yaw do tronco que carrega o braço. O limite de 10° foi fixado nesta rodada e documentado aqui.
- **Superfície:** o skin linear deste asset já estica a axila (~3,5×) e dobra o vinco no R2. Por isso o gate é "não pior que o R2", e não um valor absoluto. Pesos de skin estão fora do domínio Combat.
- **Alvo não alcançado:** em 173 quadros o limite de flexão de 80° impede a mão de chegar ao alvo. A diferença máxima no punho é de 3,9 mm.
- **Repouso:** começo e fim são exatamente a referência. A diferença IK↔repouso de 2,9° é absorvida por rampa nos primeiros 0,5 s e nos últimos 0,7 s.

Outros testes no CI: `hsin-combat-r2` (apoio, recuperação, passo, determinismo de 600 s), `hsin-combat-r2-screen`, os laboratórios R1 e R2 (pausa, retomada, interrupção, reinício, câmera automática/manual, prioridade da dança, descarte), `reference-ingestion`, `check:hsin`, `check`, `build`, `contemplative-untouched` e `bake-deterministic` (hash do asset = bake). Todos aprovados.

## Reconciliação das métricas dos pés

As três métricas medem conjuntos diferentes e **não são equivalentes**:

| Métrica | Conjunto | Quadros | R2 | R2.0.1 |
|---|---|---|---:|---:|
| Apoio estrutural (`hsin-combat-r2.test`) | 412 vértices de sola: peso > 0,75 em Foot/Toe e y < 25 mm no repouso | 253 quadros do ciclo | 0,053 mm | 0,053 mm |
| Recuperação (mesmo teste) | os mesmos 412 vértices | 5 fases × 31 passos de recuperação | 0,307 mm | 0,307 mm |
| Superfície (`hsin-combat-r2-screen.test`) | 3 608 vértices com peso > 0,75 só em Foot, inclusive dorso e tornozelo, que recebem até 25 % do peso da panturrilha | 65 amostras | 3,31 mm | 3,31 mm |

Os pés não mudaram porque quadril, pernas e lattice são os mesmos do R2. A teste de tela continua sem intrusão do antebraço esquerdo no rosto (0) e agora registra os quadros em caso de intrusão.

## Custo

| | R2 | R2.0.1 |
|---|---:|---:|
| Canais | 253 | 257 (+4 ossos de pele `.001` com torção distribuída) |
| Bake | 1 457 955 B | 1 469 188 B |
| Quaternions decodificados | 2 125 200 B | 2 141 392 B |
| Runtime | reprodução de dados pré-calculados | idem: sem IK, sem física, sem novo loop, sem novos draws |

Não há medição de FPS ou de frame time em navegador. Nenhum ganho de desempenho é declarado.

## Evidências (`evidence/`, raster CPU do GLB real com articulações sobrepostas: laranja = braço direito, ciano = esquerdo)

- `compare-preparation|basic01|basic02|skill.webp`: antes/depois em frente, três-quartos e dois perfis, relativos ao corpo.
- `closeup-elbowR-side`, `closeup-elbowL-side`, `closeup-elbowR-threeQuarter`, `closeup-handR`, `closeup-handR-skill`, `closeup-handL`.
- `combat-r2-vs-r201-cpu.mp4`: 8,4 s, R2 | R2.0.1 lado a lado, 10 amostras/s.

**Limites destas imagens:** não são WebGL. Não mostram VFX, iluminação, materiais, FPS nem dispositivo. São prova de pose e geometria, **não de aprovação artística**. A naturalidade e a elegância do gesto ainda precisam de revisão humana no laboratório `/experimentos/combate/` com GPU real.

## Pendências

1. Revisão visual pelo proprietário (laboratório WebGL, desktop e Samsung). A R2.1 começa só depois disso.
2. A captura original do braço, para uma comparação lado a lado com a regressão citada.
3. Na carga da Skill (4,23–5,17 s, 29 quadros), a supinação esquerda atinge o limite de 70°. A palma esquerda "para cima" não é totalmente alcançada ali.
4. Colisão contínua com cabelo, manga e acessórios não é provada. As folgas usam raios nominais de membro sobre amostras de vértices.

## Reproduzir

```
node scripts/bake-hsin-combat-r2.mjs
node scripts/qa-hsin-combat-arms.mjs public/assets/animations/hsin/combat-r2.json /tmp/after.json R2.0.1
node tests/hsin-combat-r201-anatomy.test.mjs
node scripts/render-hsin-combat-r201-qa.mjs BEFORE.json public/assets/animations/hsin/combat-r2.json OUT --only=sheets|closeups|video
```
Workflow: `.github/workflows/hsin-combat-r201.yml`. As evidências são publicadas em `qa-results/hsin-combat-r201-*`.
