# Sophia Lab v1.2 — rig R2, morphs e ciclo fiel ao 2D (relatório)

Data: 2026-11-14 · PR #312 (rascunho, empilhado em #307) · GLB e fontes **privados** (não estão no Git).
Base recebida: `Sophia_Lab_BookPen_P1.glb` (SHA-256 `5648b194…8b9`) + pacote privado P1. Entrega: `Sophia_Lab_v1.2_Animated.glb` (SHA-256 `291204d9…6b487`, 10,78 MB).

## 1. O que foi verificado no P1 (auditoria)

| Achado | Gravidade | Ação |
|---|---|---|
| Cauda (16 componentes soldados) e saia estavam **pesadas nas pernas**: qualquer caminhada arrastaria a cauda junto com os pés | alta | rig R2 (8 ossos novos) + repintura de pesos |
| Sem ossos de cauda/orelhas: nada de movimento secundário | média | `Tail01–04`, `EarL01/02`, `EarR01/02` (73 juntas) |
| Olhos pintados na textura, sem morphs: sem piscar/expressão | média | 5 morphs por deslocamento de vértices (ver §3) |
| Caderno/caneta sempre visíveis (sem `extras.hidden`) | média | `extras.hidden` + `extras.prop` nos 3 nós; o ator liga por `data-sophia-props` |
| Clipes P1 (Hold/Write/PauseRead/Equip/Unequip/Demo) bons como **base**, mas não cobrem o movimento real do 2D (caminhar com o caderno, virar, perceber) | — | clipes R2 (§4) |

Preservado byte a byte: malha, UVs, textura, materiais, os 65 ossos Mixamo e os 6 clipes R1 + 6 clipes P1.

## 2. Rig R2 (cauda e orelhas)

- 4 ossos de cauda (cadeia pelo eixo geodésico da cauda) e 2×2 de orelhas, com `IBM' = inv(B')·Wm` e rotação de repouso identidade.
- Pesos: cauda deixa de depender de `LeftUpLeg/RightUpLeg`; a saia reduz a influência das pernas conforme a altura (`share = 0.12 + 0.40·sm(a)`); enfeites da cauda (ilhas separadas) acompanham por proximidade. Top-4 por vértice, soma 1.
- Teste de esforço (numpy): pernas em passo largo, cauda ±40°, orelhas ±25°: sem rasgos visíveis nas costuras testadas.

## 3. Morphs (5)

`Blink_L`, `Blink_R`, `Eyes_Happy` (olho em arco ^ ^), `Smile_Soft`, `Brow_Curious`. Deltas esparsos de POSIÇÃO e NORMAL (as normais evitam o sombreamento azulado chapado). O runtime já lia `weights` esparsos (`gltf-morph.js`); cada clipe R2 traz o canal `weights` (piscadas determinísticas; `Brow_Curious`/`Eyes_Happy` no Notice e Think).

## 4. Clipes R2 (1 por comportamento do 2D)

| 2D (ciclo de 12 s) | Clipe R2 | Duração | Notas |
|---|---|---|---|
| anda esquerda/direita (8–40 %, 54–86 %) | `Lab_Walk_Book_R2` | 3,84 s (laço, 4×0,96 s) | passo de 0,48 s como o 2D; IK nas pernas, pés plantados; quadril sobe no apoio médio; contrarrotação coluna/cabeça; caderno estável; cauda e orelhas com onda + molas |
| escreve (0–8 %) | `Lab_Write_Notes_R2` | 1,92 s (laço) | golpes a cada 0,24 s, mão acompanha a linha e volta; cabeça segue a caneta; piscadas |
| pensa (40–52 %, 86–98 %) | `Lab_Think_Chin_R2` | 1,44 s | sequência 1-2-3-4-3-2-1: caneta chega ao **queixo** (IK iterativo na ponta real da caneta) e volta; cabeça inclina; `Brow_Curious` |
| vira (52–54 %, 98–100 %) | `Lab_Turn_R2` | 0,24 s | o 2D usa `scaleX(-1)`; o 3D gira de verdade (diretor, `yawTarget` suave) |
| pulinho ao apontar/focar | `Lab_Notice_R2` | 0,92 s | antecipação, salto duplo como o 2D (0/−16/−11/0/−3 px), aterrissagem amortecida; orelhas/cauda reagem; olhos felizes |

### Diretor do ciclo (`createCycleDirector`)
Linha do tempo de 12 s exatos (write 0,96 · walk 3,84 · think 1,44 · turn 0,24 · walk 3,84 · think 1,44 · turn 0,24). Raiz movida à velocidade do clipe (0,0903 un/s ⇒ **0,00 mm** de deslizamento nos apoios); percurso ±0,16 un; rampa de 0,3 s. Hover/foco no guia dispara Notice (pausa e retoma a fase; cooldown 2,5 s). CSS: com `data-sophia3d='on'` o contêiner não anda mais (só a sombra acompanha); `data-sophia-cycle='on'` alarga o quadro de desenho (190 %).

## 5. Métricas (clipes R2, medidas na criação)

| Clipe | Quadros | Vel. angular máx. | Fechamento do laço/retorno | Cauda (span) | Orelhas (span) |
|---|---|---|---|---|---|
| Walk | 116 | 155°/s (LeftLeg) | 0,0 | 8,9° | 5,0° |
| Write | 59 | 68°/s | 0,0 | 2,1° | 0,6° |
| Think | 44 | 285°/s (antebraço) | 0,0 | 3,2° | 0,6° |
| Notice | 29 | 474°/s (perna, tuck) | 0,006 | 18,9° | 12,9° |
| Turn | 8 | 669°/s (perna) | 0,005 | 6,7° | 1,2° |

Pés: tornozelo nunca abaixo de 0,0644 (chão); slip de apoio 0,00 mm; IK nunca estourou o alcance (joelho sempre dobrado, quadril −2,1 cm).

## 6. Matriz de QA

| Item | Resultado |
|---|---|
| Estrutura do GLB (acessores, tempos crescentes, quaternions unitários, 73 juntas) | PASS |
| Laços fecham (Walk, Write) | PASS (diferença 0,0) |
| Pés sem deslizar / sem atravessar o chão | PASS (cálculo) |
| Testes Node (`sophia-lab-r2`, `-cycle`, `pre-r2-runtime`) com e sem `SOPHIA_LAB_R2_MODEL` | PASS (25/25 com GLB; 23 + 2 pulados sem) |
| Ciclo de 12 s sem deriva em 200 voltas; sentido/olhar corretos; Notice retoma a fase | PASS (teste do diretor) |
| WebGL real (Chromium + SwiftShader, runtime do repositório): ciclo completo, adereços, morphs, sombra, sem erros no console | PASS |
| Aparência nas fotos-chave (andar, pensar, notar, virar) | PARTIAL — julgamento do autor; aprovação visual final é do proprietário |
| Blender / `.blend` / exportação nativa | NOT RUN (indisponível) |
| GPU real, celular, desempenho em dispositivo | NOT RUN |
| Build Astro / visual no site | NOT RUN |
| Pré-existente: `sophia-launch-cradle/director` precisam do pacote `three` (não instalado) | FAIL já existente, fora do escopo |

## 7. Limitações e riscos honestos

- Olho pintado na textura: o piscar é **deformação** de geometria (não troca de textura); nos extremos pode achatar pintas douradas. Pesos de piscada limitados a 0,90.
- De perfil à direita (yaw +1,45) o rosto fica mais sombreado que à esquerda (iluminação do ENV); considerar luz de preenchimento no ator.
- O percurso exige canvas mais largo (190 %): custo de preenchimento ~1,9× no 3D do laboratório. Medir em dispositivo antes de publicar.
- Notice e Turn têm picos de velocidade nas pernas por serem curtos e fiéis ao tempo do 2D.
- Cauda: ainda sem colisão com a saia.
- Clipes R1 (braços soltos) não trazem piscadas nem cauda; só o ciclo R2 usa o movimento secundário.

## 8. Decisões que são do proprietário

1. Publicar o GLB (`published: true` em `MODELS['lab-r2']`) — hoje **false**; nada novo é baixado.
2. Ligar a cena P1 do caderno (`bookScene`) — hoje **false**; o ciclo R2 já é completo sem ela.
3. Aprovação visual do andar, do pulo e do rosto de perfil.

## 9. Pedido de auditoria cruzada (ChatGPT Work)

Verificar: (a) soma de pesos = 1 e ≤4 influências; (b) `IBM` dos 8 ossos novos; (c) `weights` esparsos vs. `targetNames`; (d) coerência entre `CYCLE_TIMELINE` e as keyframes CSS do 2D (8/32/12/2 % …); (e) se `d.extras.prop` não colide com outros atores.
