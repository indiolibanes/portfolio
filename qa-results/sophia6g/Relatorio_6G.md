# Sophia — Fase 6G: candidata parcial (6G-A e 6G-B executadas; 6G-C parcial)

Data: 27/10/2026. Repositório `indiolibanes/portfolio`, branch `sophia/integration-portfolio` (HEAD remoto `74ae799`). Sem merge na `main`, sem substituir o GLB servido, sem deploy e sem push.

**Classificação: CANDIDATA PARCIAL, não fase aprovada.** A cabeça, a pelagem, os olhos, os ornamentos da testa, as colisões das orelhas, o controle de Blink no runtime e a cauda evoluíram de forma mensurável. Jaleco/mangas, mãos/pena/caderno e parte das colisões herdadas continuam pendentes (seção 7). A aprovação artística final depende de revisão humana.

## 1. Base e verificação inicial

| Item | Resultado |
|---|---|
| Base | `Sophia_6F_visual_candidate.glb`, 22.974.296 bytes, SHA-256 `ad7f751e…b177a` — **confere** com o informado |
| Commit `25cc7c3` | **Não existe** no remoto (HEAD `74ae799`). Usado o GLB + scripts do pacote 6F como base reproduzível |
| Referências recebidas | `8d85c357-image.png` (ilustração) e `700f9e9c-185123.mp4`. O vídeo é byte a byte idêntico ao `1000050295.mp4` recebido antes (mesmo SHA-256); a imagem é idêntica à ilustração anterior. O nome `1000048002.png` não foi recebido com esse nome |
| Validator 6F reexecutado | 0 erros, 0 avisos, 340 infos (Khronos glTF-Validator 2.0.0-dev.3.10) — reproduz a auditoria 6F |
| Ferramentas | Sem Blender e sem npm/pip neste ambiente. Geometria em Python (numpy/scipy); renders em Three.js r186 (mesmo viewer, luzes e câmeras ortográficas da 6F) |

## 2. Saída

| Medida | 6F | 6G |
|---|---:|---:|
| Bytes | 22.974.296 | **20.777.996 (−9,6%)** |
| Triângulos (Validator) | 205.174 | 286.604 (+39,7%) |
| Primitivas / draw calls | 276 / 283 | 277 / 284 |
| Joints / clipes / morphs | 101 / 5 / 4 | 101 / 5 / 4 (mesmos nomes) |
| Validator | 0 erros, 0 avisos, 340 infos, 1.866 dicas | **0 erros, 0 avisos, 12 infos, 0 dicas** |
| Triângulos de área < 1e-12 m² | 1.653 | 1.589 (herdados; nenhum nas peças novas) |

O aumento de triângulos vem das 174 mechas da cabeça, das 213 da cauda e do crânio mais denso. O arquivo encolheu porque a compactação removeu 1.023 accessors e 1.135 bufferViews sem uso (16,9 MB) e porque 200 alvos de morph inteiramente nulos viraram accessors sem bufferView. Além disso, os índices de 281 primitivas passaram de uint32 para uint16. Todas essas otimizações são sem perda.

## 3. Alterações por primitiva (mesh `Sophia`, índice base 0)

| Primitiva | Alteração |
|---|---|
| 274 | Crânio reconstruído com estes elementos: superfície de revolução esculpida, planalto facial, focinho em cunha (ponta do nariz ~5,4 cm à frente do plano dos olhos, como no perfil do vídeo), órbitas rebaixadas onde assentam os olhos, coxins das vibrissas, arcada discreta e queixo recuado. O pescoço fica dentro do anel do colarinho. Os pesos vêm da 6F por k-NN; o pescoço foi refeito proceduralmente (chest → neck → head acima da borda do colarinho). Morphs: Smile (bochecha) e MouthOpen (queixo). A cor tem oclusão suave. Escavação localizada contra acessórios, colarinho e jaleco (seção 5) |
| 13–34 | Olhos refeitos por completo, conformados à superfície real do crânio. Cada camada fica em `H(x,y) + folga`: esclera 1,0 mm, íris 1,9 mm, pálpebras 3,1–3,7 mm e delineado 4,3 mm. A abertura é amendoada e inclinada (canto externo 2,7 cm acima do interno). A íris é grande (semieixos 21,5 × 22,8 mm, numa abertura de 80 mm de largura) e cortada pelas pálpebras, com pupila maior. As pálpebras usam a normal da pele (sem placas). O delineado é espesso e tem asa. Há 3 cílios no canto externo, e o antigo cílio 4 virou o traço inferior externo. Dois reflexos. Os alvos de Blink incluem o deslocamento em z ao longo da pele. BrowRaise ergue só a dobra, para não abrir fresta com Blink = 1. Tudo preso ao joint `head` (ver 4.3) |
| 2 | Sobrancelhas douradas curtas e o filete central refeitos e conformados (folga 0,9 mm); BrowRaise sobe 4 mm. Os 976 vértices restantes não mudaram |
| 3 | Nariz substituído por botão triangular arredondado, com metade posterior embutida na ponta do focinho; material `Sophia_nose` escurecido |
| 9, 10, 11 | Estrelas da testa refeitas facetadas com o mesmo arranjo e proporções: estrela principal com ponta inferior longa, estrela pequena acima, losango abaixo. Cada faceta é subdividida e acompanha o crânio (borda 0,6–0,9 mm, ápice 1,7–3,4 mm) |
| 35, 36 | Lábios reposicionados no focinho; deltas de Smile e MouthOpen transformados |
| 275 | 33 mechas da 6F substituídas por 174 tufos afilados e achatados em grupos de 2 a 5: topete varrido para trás, bochechas e mandíbula, três fileiras na nuca e base das orelhas. A raiz fica embutida 3 mm e escurecida (integração). Presas ao joint `head`. Geradas com folga ≥ 3 mm de uma nuvem que soma, em 61 poses no referencial da cabeça, os acessórios das orelhas, as orelhas, os anéis de pelo, o colarinho, as lapelas, o laço, o jaleco, os braços, as mãos, a pena e o caderno. 24 candidatas foram descartadas |
| 276 (nova) | Plumagem da cauda: 213 tufos na borda externa da pluma, seguindo o fluxo base → ponta. Cada tufo herda os 4 pesos do vértice da raiz e a cor do gradiente creme-azul da cauda. Material `Sophia_tail_locks`, que já existia sem uso. Aceitos com folga ≥ 2,5 mm de corpo, jaleco, fitas e constelação em 41 poses. Mais 2 foram removidos por contato de raiz com a constelação |
| Material 8 | `Sophia_nose`: baseColor mais escuro |

As outras 245 primitivas são byte a byte equivalentes à 6F (`Estrutura_6F_6G.json`), assim como nós, skin, inverse bind matrices, os 5 clipes (canais e quadros-chave idênticos), as imagens e os UVs das primitivas não alteradas, além do Book e da Pen.

## 4. Morphs, Blink e runtime

### 4.1 Morphs
Os renders de `Morphs_6G.png` cobrem Blink 0 / 0,5 / 1, Smile, BrowRaise, MouthOpen e as combinações Blink=1 com Smile, com BrowRaise e com MouthOpen, além de Combined. O fechamento é completo e não há fresta da íris em nenhuma combinação. Os testes triângulo-triângulo cobrem olhos × pálpebras e crânio × olhos/pálpebras/delineado em 9 estados de morph mais 36 poses de clipe: 0 cruzamentos (folga mínima 0,19 mm).

### 4.2 Conflito com o `AnimationMixer` — CONFIRMADO (Three.js r186)
Cada clipe anima o vetor inteiro `[Blink, Smile, BrowRaise, MouthOpen]`. O `PropertyMixer` só regrava esse vetor quando o valor do clipe muda. Por isso, uma expressão aplicada antes de `mixer.update()` some justamente durante as piscadas: 10 a 21 de 121 amostras por clipe (`Runtime_threejs_mixer.json`). Se a expressão for aplicada uma vez só, ela some de vez na primeira piscada.

**Correção:** `public/experimental/sophia-expressions.js`, chamada depois de `mixer.update()`. O Blink final é `max(Blink do clipe, Blink externo)`; Smile, BrowRaise e MouthOpen recebem o valor externo. Resultado: 121/121 amostras corretas em todos os clipes, com valores iguais nas 277 malhas. Num crossfade Idle → Point os pesos ficam em [0, 1].

### 4.3 Runtime próprio do site (`gltf-skel.js`) — defeito CONFIRMADO e corrigido
`sample()` tratava qualquer canal que não fosse `rotation` nem `translation` como escala. O canal `weights` do Blink era então gravado como escala do nó da malha (nó 93), que ficava em 0 no instante 0 e com desvio 1,0 em todos os clipes. Como `updateSkin()` inverte a matriz desse nó, o modelo inteiro colapsaria.

A correção trata `weights` à parte, expõe `skeleton.morphWeights` e `targetNames` e mantém intacta a mistura de camadas. Teste: `scripts/test-sophia-morph-runtime.mjs`. Original: desvio 1,0 nos 5 clipes. Corrigido: desvio 0,000000 nos 5 clipes, com picos de Blink entre 0,984 e 0,996.

Limitação: `gltf-gl.js` não desenha morph targets. Nesse runtime, o Blink fica disponível em `morphWeights`, mas não aparece na tela. Hoje nenhuma página carrega `sophia.glb` ou a 6F (o modo experimental usa `sophia-vetorial.glb`), e o `sophia.jsx` da raiz não faz parte do build Astro.

### 4.4 Rebind dos olhos
Na 6F, cada conjunto ocular estava preso ao joint do olho do lado **oposto**, e esses joints ainda têm canais de escala do piscar antigo (Y até 0,056) dessincronizados do morph Blink. Medido: deriva de até 9,9 mm do olho em relação à cabeça em Point, e achatamento com as pálpebras abertas (até 94%). Na 6G, todo o conjunto ocular segue o joint `head`. Como consequência, perdeu-se o microolhar de ±2° desses joints. As animações **não** foram alteradas.

## 5. Auditoria geométrica (mesmo método da 6F)

Método: `audit.test` da 6F. A fase ampla usa esferas/AABB; a fase estreita usa segmento-triângulo e distância triângulo-triângulo, com candidatos dentro de 0,3 mm. As poses foram as mesmas para 6F e 6G: repouso, 6 instantes por clipe e o pico de Blink de cada clipe (36 poses), mais 9 estados de morph para os pares faciais. Os números contam **pares de triângulos**, não defeitos independentes. As amostras são discretas, não contínuas, e não certificam ausência global de colisões.

| Par | 6F (poses com cruzamento / máx.) | 6G |
|---|---|---|
| Olhos × pálpebras | 0 / 0 | 0 / 0 (folga mín. 0,19 mm) |
| Olhos × crânio | 0 / 0 | 0 / 0 (0,44 mm) |
| Pálpebras, delineado × crânio | 0 / 0 | 0 / 0 |
| **Mechas × orelhas** | 45 / 474 | **0 / 0** (≥ 3,1 mm) |
| **Mechas × acessórios** | 45 / 918 | **0 / 0** |
| **Mechas × colarinho/lapelas/laço** | 45 / 641 | **0 / 0** (≥ 3,2 mm) |
| **Mechas × jaleco** | 35 / 532 | **0 / 0** (≥ 4,7 mm) |
| **Mechas × mãos/pena/caderno** | 7 / 46 | **0 / 0** (≥ 8,8 mm) |
| **Ornamentos × testa** | 0 / 0, flutuando a **8,9 mm** | 0 / 0, folga **0,46 mm** |
| **Sobrancelhas × crânio** | 0 / 0, flutuando a 4,1 mm | 0 / 0, folga 0,67 mm |
| **Crânio × acessórios das orelhas** | 36 / 182 | **0 / 0** (0,84 mm) |
| Pescoço × colarinho | 36 / 535 | 36 / **46** |
| Pescoço × jaleco | 9 / 390 | 36 / 385 (29 em repouso; 385 em Wave) |
| Braços × mangas | 5 / 46 | 5 / 46 (herdado, não modificado) |
| Mãos × pena | 36 / 925 | 36 / 925 (herdado) |
| Mãos × caderno | 36 / 245 | 36 / 245 (herdado) |
| Cauda × corpo | 36 / 151 | 36 / 151 (herdado) |
| Cauda × vestuário | 36 / 738 | 36 / 738 (herdado) |
| Constelação × cauda | 0 / 0 | 0 / 0 |
| Plumagem nova × corpo / jaleco / fitas / constelação | — | 0 / 0 em todos |

Classificação dos resíduos:

- **Pescoço × colarinho (38–46).** É penetração rasa na base posterior esquerda e na frente inferior do tubo do pescoço, escondida pela nuca e pelo colarinho. Penetração indevida, mas sem efeito visual conhecido.
- **Pescoço × jaleco, 29 pares em repouso.** É a borda inferior do tubo do pescoço tocando o forro no decote; está oculta. A tentativa de refinar o tubo gerou triângulos esticados e foi revertida.
- **Pescoço × jaleco, 385 pares em Wave.** A **manga direita erguida atravessa a lateral da cabeça**. Já existia na 6F (390) e é um problema da pose ou da animação Wave, não da geometria nova.
- **Mãos × pena, mãos × caderno, cauda × corpo e cauda × vestuário.** São herdados e não foram modificados (P1 pendente). A pena dentro do punho é parcialmente intencional (empunhadura), mas a ponta não toca a página.

Escavação do crânio:

- **Primeira passada**, só em repouso: teto de 5 mm na cabeça; na base e no pescoço ocultos o máximo aplicado foi 17 mm (teto 36 mm).
- **Segunda passada**, contra todas as poses, só no queixo e no pescoço: teto de 8 mm no queixo; máximo de 22 mm no pescoço oculto.
- **Tentativa descartada**: escavar contra todas as poses na cabeça inteira criava afundamentos laterais de até 23 mm, porque as correntes e fitas das orelhas balançam e varrem um volume grande.

## 6. Desempenho (`Desempenho_6F_6G.json`)

As medições usam Chromium headless com **SwiftShader** (rasterização por software, sem GPU real), Three.js r186, duas repetições por caso e animação Idle.

| Cenário | Parse 6F → 6G | 1º quadro 6F → 6G | Quadro mediano 6F → 6G | Heap JS |
|---|---|---|---|---|
| Desktop 900×900 | 296–347 → 298–311 ms | 948–1.098 → 943–1.027 ms | 10,9–12,1 → 10,7–13,5 ms | 97 → 110 MB |
| Celular emulado 390×844, CPU 4× | 1.153–1.270 → 1.024–1.298 ms | 2,56–2,59 → 2,49–2,95 s | 52–63 → **68–95 ms** | 101 → 106–110 MB |

No celular emulado o custo por quadro sobe, coerente com +40% de triângulos rasterizados na CPU. **Nenhum dispositivo móvel real foi testado**; não há afirmação sobre GPUs móveis. Se for preciso, dá para reduzir: LOD ou menos tufos na plumagem e no topete (são primitivas próprias, 276 e 275) e esconder a 276 em perfis de baixo desempenho.

## 7. Pendências e limitações

1. **Jaleco, mangas, forro e ombros (P1)** — não remodelados. As mangas continuam cilíndricas.
2. **Mãos, dedos e pose Write (P1)** — não remodelados. A ponta da pena não toca a página e a capa do caderno não aparece de frente.
3. **Wave**: a manga atravessa a lateral da cabeça (herdado). Exige ajuste de animação ou pose, o que não foi autorizado.
4. **Pescoço**: restam 38–46 pares ocultos com o colarinho e 29 com o forro em repouso.
5. **Microolhar** dos joints `eye_*` perdido com o rebind (4.4). Os canais de escala desses joints ficaram sem efeito.
6. **Interior das orelhas**: as 8 mechas internas da 6F, que colidiam com os brincos, foram retiradas. A continuidade fica a cargo dos anéis de pelo existentes e dos tufos da base. Uma pelagem interna nova, presa aos joints da orelha, não foi feita.
7. **Fidelidade**: os renders são Three.js comparados com ilustração e vídeo; não há equivalência pixel a pixel. Mechas e plumagem são geometria procedural, não escultura manual.
8. **`gltf-gl.js`** não desenha morphs (4.3).

## 8. Reprodução

```bash
python -m pip install numpy scipy pillow          # numpy 2.x, scipy 1.17, pillow 12
cd scripts
python prepare_clouds.py Sophia_6F_visual_candidate.glb ../work      # ~25 min: nuvens de colisão
SOPHIA6G_WORK=../work python patch_6g.py Sophia_6F_visual_candidate.glb Sophia_6G_visual_candidate.glb --compact   # ~10 min (cauda)
python structural_6g.py Sophia_6F_visual_candidate.glb Sophia_6G_visual_candidate.glb Estrutura_6F_6G.json
python audit_6g.py Sophia_6G_visual_candidate.glb Audit_geometria_6G.json      # ~10 min
gltf_validator -o Sophia_6G_visual_candidate.glb > validator.json
# renders (Three.js r186 + Playwright): render/make_tasks.py + render/run.sh (THREE_ROOT aponta para three@r186)
```

Reprodução verificada do zero (pasta limpa, nuvens regeneradas, sem cache): as três nuvens saíram byte a byte idênticas e o GLB saiu com o mesmo SHA-256 `228a2525dfd281b3e8e35f7a1e2d5b0c3156b4dfebc7c38cd50c23955d4d3290`. Os dados `.npy` das nuvens não estão no pacote porque têm centenas de MB e são regenerados pelo script.
