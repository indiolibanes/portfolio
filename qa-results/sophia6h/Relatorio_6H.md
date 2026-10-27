# Sophia 6H — relatório da candidata parcial

**Status: candidata parcial, não aprovada.** A 6H não está aprovada. Isso depende de inspeção visual humana e de validação no runtime de destino. Nada foi publicado: não houve push, merge nem deploy. O modelo ativo do site (`sophia-vetorial.glb`) não foi alterado.

| Item | Valor |
|---|---|
| Base (obrigatória) | `Sophia_6G_visual_candidate.glb` — SHA-256 `228a2525dfd281b3e8e35f7a1e2d5b0c3156b4dfebc7c38cd50c23955d4d3290` (conferido antes de cada montagem) |
| Candidata | `Sophia_6H_visual_candidate.glb` — SHA-256 `3b0e7db84809d6e4fe6eaa2bc6299874c202c529adcbd369cf83c6a29d3c3a2a` |
| Tamanho | 20.795.692 bytes (6G: 20.777.996; +0,09 %) |
| Triângulos / primitivas desenhadas | 291.306 / 286 (6G: 286.604 / 284; +1,6 %) |
| Rig | 101 joints; nós, skins e IBM idênticos aos da 6G |
| Clipes | 5 (Idle, Write, Point, Wave, Walk); mesmos canais, tempos e interpolação |
| Morphs | 4 (Blink, Smile, BrowRaise, MouthOpen); 4 alvos em todas as primitivas da malha principal |
| Khronos glTF-Validator 2.0.0-dev.3.10 | 0 erros, 0 avisos, 12 infos (os mesmos 11 `UNUSED_OBJECT` e 1 `IMAGE_NPOT_DIMENSIONS` da 6G) |
| Repo (branch `sophia/integration-portfolio`) | commits locais `86d67a4` (morphs no `gltf-gl.js`) e o de QA da 6H, sobre `e540702` (6G). Nada enviado ao remoto. |

Prioridade cumprida: a H-A foi feita primeiro e é a parte mais completa. A H-B foi feita em parte: Wave, Write, pescoço e cauda avançaram; jaleco e mãos não. A H-C foi feita por completo.

---

## 1. Aprovado nos testes técnicos (a aprovação visual humana continua pendente)

### H-A — cabeça, pelagem, orelhas, olhos

**Volume da cabeça** (`head6h.py`):
- A traseira ficou mais rasa (`rz_back` .120 contra .136 na frente).
- A nuca desce inclinada para o pescoço.
- Há maçãs do rosto ligando olho e focinho.
- As bochechas estão cheias para os lados.
- O volume de pelo foi esculpido na própria malha: bochechas, nuca, topo e têmporas.
- No material neutro, a cabeça deixa de ler como esfera no perfil e nas costas (linhas "Rosto — material neutro", "perfil (neutro)" e "Nuca (neutro)" da prancha).

**Fim da borda inferior plana e da "esfera sobre poste":**
- Uma juba em sino (`ruff6h.Mane`) nasce na própria superfície do crânio: em y≈.71 nas costas, acima do bojo, e em .615 nas laterais.
- Ela desce até a altura dos ombros e cobre nuca, pescoço e gola nas costas e laterais.
- A borda inferior é feita de 14 mechas largas, com pontas agudas e algumas duplas.
- A forma é um campo r(θ, y) com restrições por bin, medidas nas 61 poses (repouso + 5 clipes × 12):
  - no referencial do peito abaixo de y≈.60;
  - no da cabeça acima disso.
- Onde não cabe, a mecha termina mais alto e mantém a ponta.
- Pesos: peito embaixo, pescoço no meio, cabeça na raiz.
- Na auditoria, contra colarinho, lapelas, laço, jaleco, mangas, mãos, cauda, plumagem e fitas das costas: **0 cruzamentos em 36 poses**.

**"Agulhas" substituídas por massas esculpidas** (`clumps6h.py`):
- Seção com base achatada, dorso com estrias e raiz embutida.
- 31 de 35 candidatas aceitas: topete com 3 tufos penteados para trás mais os laterais; 10 por bochecha, com fluxo lateral; 2 nas têmporas.
- As fileiras da nuca, que liam como "dentes", foram retiradas e substituídas pela juba.
- Contra orelhas, acessórios, colarinho, jaleco e mãos/pena/caderno: **0 cruzamentos em 45 poses**, folga mínima de 4,2 mm.

**Interior das orelhas** (`ears6h.py`):
- 8 tufos creme, de 14 candidatos, presos às juntas `ear_*`.
- Contra os acessórios das orelhas: 0 cruzamentos em 36 poses.

**Olhos:**
- Globo abaulado entre as pálpebras (3,4 mm) e borda arredondada nas pálpebras.
- O Blink fecha por completo.
- Blink + Smile somados afundavam a pálpebra inferior na íris abaulada (448 pares numa montagem intermediária). Agora o alvo Smile compensa a altura.
- Resultado: **Olhos × pálpebras com 0 cruzamentos em 45 poses**, incluindo as 9 combinações de morphs. Folga mínima de 0,12 mm.

**Boca e estrelas:**
- Linha "ω" com interior; o MouthOpen acompanha a pele aberta.
- A estrela principal ficou mais larga.
- As 3 estrelas da testa continuam com **0 cruzamentos e folga mínima de 0,45 mm** (6G: 0,46 mm).

**Crânio × acessórios das orelhas:**
- O crânio mais alto encostava nos aros da base das orelhas.
- Foi feita uma escavação dedicada (`carve6h`) e o volume de pelo foi retirado sob os aros.
- Resultado: 0 cruzamentos em 35 de 36 poses (ver resíduo).

### H-B — escrita, Wave, pescoço, cauda

**Wave:**
- Pré-rotação constante de 26° (abdução) no canal de rotação de `upper_arm_R`. Mesmos tempos; antebraço e mão intactos.
- **Mangas × crânio: 7 poses e até 356 pares (6G) → 0**.

**Write — caderno** (`write6h.py`, só no clipe Write):
- O caderno está erguido, com o topo inclinado 38° e a capa azul com a estrela voltada para a frente (cosseno .76 com a câmera frontal), como na referência.
- O ponto preso pelos dedos da mão esquerda fica fixo.
- A rotação e a translação do nó Book no Write foram reescritas; os outros clipes não mudam.

**Write — pena:**
- Cinemática inversa nas 97 chaves (upper_arm_R, forearm_R, hand_R) com quatro restrições:
  - ponta da pena na face de escrita;
  - corpo grosso da pena fora do caderno;
  - pata direita fora do caderno;
  - manga a ≥ 6 mm da cabeça.
- Medido em 388 instantes:

| Medida | Valor |
|---|---|
| Ponta–página | 0,67–0,74 mm |
| Corpo da pena | ≥ 3,6 mm da página |
| Pata | ≥ 7,7 mm |
| Manga–cabeça | ≥ 22,8 mm |

- Na auditoria: **Pena × caderno = 0** e **Mãos × caderno no Write: 190–196 pares (6G) → 0**.

**Pescoço e gola:**

| Par | 6G | 6H |
|---|---|---|
| Pescoço × jaleco/forro | 36 de 36 poses, até 385 pares | **0** |
| Pescoço × colarinho | 36 de 36 poses, até 46 pares | 7 poses (só no Write), até 20 |

Sem escavação destrutiva:
- A base do pescoço é encaixada dentro do perfil interno da gola, medido no modelo.
- O tubo termina dentro da gola.
- A escavação com as nuvens de todas as poses fica restrita à faixa que segue a cabeça.
- A causa dos 1.078 pares de uma montagem intermediária ficou documentada: a escavação dobrava o pescoço para fora.

**Cauda** (`tail6h.py`):
- 106 mechas largas deitadas no fluxo substituem os 213 tufos-folha da 6G.
- Tufos com 30–48 mm de largura, lift de .08–.16 e raiz embutida.
- Contra corpo, jaleco, laços e constelação: 0 cruzamentos, folga mínima de 1,8 mm.

### H-C — runtime

**`gltf-skel.js`:** a correção dos canais `weights` (commit `e540702`) foi mantida. `test-sophia-morph-runtime.mjs` passa nos 5 clipes da 6H: escala do nó = 1, picos de Blink entre .984 e .996.

**`gltf-gl.js` (commit `86d67a4`):**
- Morph targets: POSITION nas locations 6–9, NORMAL nas 10–13, `uniform uMorph`.
- Alvos sem `bufferView` ficam desligados.
- Atributos base sem `bufferView` deixaram de quebrar o carregamento. Isso acontecia com a 6G no código antigo.
- Pesos vêm de `skeleton.morphWeights` ou de `model.morphOverride`.
- `composeExpressions()` foi adicionado ao `sophia-expressions.js`.

**Validação no renderer real** (Playwright + SwiftShader, harness em `qa-results/sophia6h/tools/runtime`):
- Um morph só conta como visível se mudar a imagem.
- Todos mudaram:

| Morph ou combinação | Pixels alterados |
|---|---|
| Blink | 13.051 |
| Smile | 2.333 |
| BrowRaise | 2.249 |
| MouthOpen | 6.076 |
| Todos juntos | 21.399 |

- Blink vindo do canal do clipe, contra o mesmo quadro sem pesos: visível nos 5 clipes (7.517–13.679 px).
- Expressões compostas sobre o clipe: visíveis nos 5 clipes.
- Console sem erros.

**Regressão:** o modelo ativo do site renderiza **idêntico pixel a pixel** com o renderer antigo e com o novo.

**Rota Three.js (r186):** helper e mixer conferidos nos 5 clipes. Composição preservada em 121 de 121 amostras e crossfade sem escala não uniforme.

---

## 2. Ainda falhou ou ficou incompleto

**Juba:**
- Ficou contínua e cobre a junção, mas lê como uma massa estilizada, "corte chanel" com pregas, mais do que como a pelagem fofa da referência.
- Faltam volumes macios sobrepostos. Tufos sobre a juba foram testados e liam como dentes colados; foram desligados.
- Do lado direito, a juba termina mais alto, sobre o percurso da manga no Wave. Isso deixa uma assimetria visível no perfil direito.
- Contra as fitas das orelhas: **2 de 36 poses, até 24 pares** (Idle t=2,67 s e pico de Blink do Write).

**Pescoço × colarinho:** 20 pares no Write. O queixo encosta na frente da gola quando a cabeça inclina para ler.

**Crânio × acessórios das orelhas:** 1 pose (Walk t=0,83 s), 6 pares. Na 6G eram 0.

**Efeitos colaterais da pose nova do Write** (o punho dobra até 85°):

| Par | 6G | 6H |
|---|---|---|
| Braço × manga (pelo do antebraço atravessa o punho da manga) | 0 | ~42 pares |
| Manga × caderno (punho encosta na borda da página) | 0 | ~23 pares |
| Mãos × pena (empunhadura) | ~900 pares | ~300 pares |

**Microgaze (±2°): não recuperado.** O pivô dos joints dos olhos fica ~2 cm à frente da nova superfície da íris, então girar inverte o olhar. Os canais de escala dos olhos também estão dessincronizados do Blink. Resolver exige mudar o rig: um pivô novo ou um joint dedicado.

**Mãos:** continuam parecendo luvas. Não houve modelagem de dedos nem de empunhadura.

**Jaleco:** ombros, mangas cilíndricas, lapelas, barra e forro **não foram trabalhados**.

**Cauda:**
- A parte branca ainda lê em parte como escamas.
- Os cruzamentos da malha-base da cauda não foram resolvidos (iguais aos da 6G):
  - cauda × corpo: 151 pares;
  - cauda × vestuário: 738 pares.

**Herdados da 6G e sem mudança:**
- Mãos × caderno: até 245 pares em Idle, Point, Walk e Wave.
- Mangas × caderno: até 872 pares, nas mesmas poses.
- Braços × mangas: até 46 pares no Walk.

**Orelhas:** os tufos internos ficaram esparsos. 6 de 14 candidatos foram rejeitados, por reentrada na orelha ou por invadir o crânio.

## 3. Não testado

- Desempenho em GPU real (celular ou desktop). Os números abaixo são de SwiftShader, emulado na CPU.
- LOD: avaliado, não implementado.
- Integração na cena do site com o modelo 6H. Nada foi trocado, por regra; os testes usaram uma página de QA à parte.
- Detecção contínua de colisão. A auditoria é amostrada: 36 a 45 poses por par.
- Regeneração das nuvens de obstáculos na checagem de reprodutibilidade. Ver a seção 7.
- Inspeção humana.

---

## 4. Auditoria de colisões

O método é o mesmo da 6G (`audit.test`): pares de triângulos que se cruzam em repouso, em 6 instantes de cada clipe, no pico de Blink e em 9 combinações de morphs. A tabela traz poses com cruzamento / poses testadas e o máximo de pares. A 6G foi re-medida com o mesmo script.

| Par | 6G | 6H |
|---|---|---|
| Mechas × orelhas, acessórios, colarinho, jaleco, mãos | 0 | 0 |
| Olhos × pálpebras / crânio | 0 | 0 |
| Ornamentos × testa (folga) | 0 (0,46 mm) | 0 (0,45 mm) |
| Crânio × acessórios das orelhas | 0/36 | 1/36, máx. 6 |
| Pescoço × colarinho | 36/36, máx. 46 | 7/36, máx. 20 (Write) |
| Pescoço × jaleco/forro | 36/36, máx. 385 | **0/36** |
| Mangas × crânio | 7/36, máx. 356 (Wave) | **0/36** |
| Braços × mangas | 5/36, máx. 46 | 12/36, máx. 46 (Walk herdado + Write) |
| Mãos × pena | 36/36, máx. 925 | 36/36, máx. 657 |
| Mãos × caderno | 36/36, máx. 245 | 29/36, máx. 245 (0 no Write) |
| Pena × caderno | 0 | 0 |
| Mangas × caderno | 28/36, máx. 872 | 35/36, máx. 872 (Write: ~23) |
| Cauda × corpo / vestuário | 151 / 738 | 151 / 738 |
| Plumagem da cauda × corpo, jaleco, laços, constelação | 0 | 0 |
| Juba × colarinho, jaleco, mangas, mãos, cauda, fitas | — | 0 |
| Juba × acessórios das orelhas | — | 2/36, máx. 24 |
| Tufos das orelhas × acessórios | — | 0 |

**Sobreposição intencional**, medida separadamente e não contada como penetração: raízes embutidas e pelo sobre pelo.
- Juba × crânio
- Juba × massas de pelo
- Massas × crânio
- Tufos × orelhas

## 5. Desempenho (SwiftShader; não representa GPU real)

Medido com Three.js r186: mediana do tempo de quadro em ms, 2 repetições, 6G e 6H intercaladas.

| Cenário | 6G | 6H |
|---|---|---|
| Desktop 900×900 | 3,6–7,1 | 4,2–4,6 |
| Celular emulado (390×844, CPU 4×) | 21,8–29,4 | 24,0–29,9 |

As faixas se sobrepõem, então não há diferença mensurável nessas condições.

Triângulos por componente, 6G → 6H:

| Componente | 6G | 6H |
|---|---|---|
| Massas de pelo da cabeça | 30.276 | 12.090 |
| Plumagem da cauda | 37.062 | 30.316 |
| Juba (nova) | — | 28.906 |
| Tufos das orelhas (novos) | — | 3.120 |

**LOD, se a GPU real pedir:** a juba (o anel θ pode cair de 360 para 180 colunas) e as mechas (seção de 12 para 8) são os candidatos com menos impacto visual.

## 6. Triângulos de área quase nula

São os 1.589 apontados na revisão (área < 1e-12 m²). Foram investigados antes de qualquer remoção.

- **A contagem da 6H é a mesma da 6G: 1.589.** Todos são herdados de primitivas que a 6H não alterou.
- Distribuição: ouro 896, gemas 276, ouro do vestuário 184, pelagem `phase5_pelt` 96, fitas 128, tecido azul 9.
- A maioria tem aresta colapsada (< 1 µm), típica de polos de esferas e anéis: são os vértices repetidos no polo das gemas e contas.
- Nenhum vem da geometria nova.
- Com limiares maiores, a 6H tem menos que a 6G: 1.891 contra 1.902 abaixo de 1e-10 m²; 2.305 contra 2.324 abaixo de 1e-9 m².
- **Nada foi removido.** Não afetam a renderização (o rasterizador os descarta) e estão em ornamentos aprovados. Se for desejado, é possível removê-los sem mudança visual numa etapa de limpeza.
- Os detalhes por primitiva estão em `structural_6G_vs_6H.json`.

## 7. Reprodutibilidade

- O pipeline é determinístico: sementes fixas e sem rede. O roteiro é `scripts/tools/run_6h.sh`.
- Remontagem da candidata **com os caches da juba e da cauda apagados**: o SHA-256 reproduziu idêntico, `3b0e7db8…a2a`.
- `6G_wave.glb` (`16ba9dfe…b0`) e `6G_ww.glb` (`69f38bb3…a7b`) também reproduziram idênticos. O segundo usa os pontos de cabeça de referência em `write_head_ref.npz`, que vai no pacote.
- **Não verificado:** a regeneração das nuvens de obstáculos (`prepare_clouds.py`, cerca de 40 min). As usadas vieram do `6G_ww.glb` acima.

## 8. Registros por primitiva

Estão em `Sophia_6H_Auditoria.zip/evidencias/changes_per_primitive.json`, com vértices e triângulos antes e depois e uma nota para cada uma.

- **Alteradas:** 2, 3, 9–11 (estrelas e sobrancelhas), 13–36 (olhos e boca), 274 (crânio), 275 (massas), 276 (cauda).
- **Novas:** 277 (tufos das orelhas), 278 (juba).
- **Canais alterados:**
  - Wave: `upper_arm_R.rotation`;
  - Write: `upper_arm_R`, `forearm_R` e `hand_R.rotation`, além de `Book.rotation` e `Book.translation`.
- Os demais canais são idênticos byte a byte.
- Malhas do caderno e da pena, materiais e imagens: idênticos.

## 9. Pacote

- `Sophia_6H_visual_candidate.glb` e `SHA256SUMS.txt`.
- Pranchas:
  - `Gate_HA_6G_6H_Referencia.png` (gate H-A: frente, perfis, 3/4, nuca, olhos, orelha, pelagem, topo; com material neutro);
  - `Comparacao_Rosto_Perfil_Nuca_Cauda_Write.png`;
  - `Comparacao_6G_6H_Referencia.png` (completa);
  - `Runtime_6H_gltf-gl.png` (morphs e 5 clipes no renderer do site).
- `Sophia_6H_Auditoria.zip` contém:
  - os scripts;
  - as evidências: validator 6G e 6H, estrutura, auditorias 6G/6H pelo mesmo método, logs, IK, juba, cauda, testes de runtime, desempenho;
  - os renders individuais;
  - os patches dos commits de runtime.
