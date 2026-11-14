# Sophia raposinha (mascote celestial) — R1.6 Axilla & Sleeve Recovery

**Escopo:** somente a Sophia raposinha, malha `Sophia_LabCoat`. Não toca Sophia Anime/Waifu nem a Kitsune quadrúpede.
**Base:** PR #307 (R1.5, `9ed7a65`). **Status:** candidato privado, **aguardando aprovação artística do proprietário**. Nenhum asset de produção foi substituído; GLB/imagens/vídeos ficam fora do repositório.

## O que foi feito

Correção **somente de skinning** (`JOINTS_0`/`WEIGHTS_0` da primitiva do jaleco). Posições, normais, UVs, índices, morphs, esqueleto, animações, materiais e texturas são idênticos ao R1.5 (verificado por hash em `integrity-manifest.json`).

- Causa raiz: axila/manga ligadas ao flanco por uma "teia" de faces finas; os pesos de braço vazavam para o flanco e as faixas de punho/barra tinham pesos de quadril. Com os braços levantados (Nadar ≈1,5 s, Socos ≈0,75 s) a teia estica até 7,3× e rasga visualmente.
- Método final (`scripts/sophia/r16/arap_weights.py`): re-solução local de pesos tipo ARAP. LBS é linear nos pesos; para um conjunto de poses (piores poses de cada clipe + conjunto ativo) cada aresta da região deve manter a forma rígida mesclada. Mínimos quadrados esparsos, partição da unidade suave, regularização para os pesos R1.5, pesos IRLS nas arestas esticadas, passo amortecido (τ) aceito somente se o estiramento denso por clipe não regredir. Máximo 4 influências, normalizado.
- Alcance: 3 551 de 12 979 vértices (27 %) tiveram pesos alterados (região local + dilatação de 2 saltos); ossos envolvidos: Hips/UpLeg (barra), Spine/Spine1/Spine2, Shoulder/Arm/ForeArm (ambos os lados).

### Abordagens testadas e descartadas (para não repetir)
1. Corte da teia ao longo da isocurva φ=0 (subdivisão + cópias por lado) com pesos por classe e transição harmônica — números de estiramento excelentes, mas **fragmentos/buracos** na axila (métrica de aresta é cega a lacunas). Rejeitada visualmente.
2. Pesos por classe/harmônicos sem corte — picos 45–136× na linha central do peito.
3. Relaxamento local iterativo (Laplaciano) por limiar — diverge.
4. Reversão por nó de uma solução global — cria costuras (picos até 49×).

## Resultado (estiramento de aresta, amostragem densa; ver `deformation-matrix.md`)

| Clipe | R1.5 máx / p99 | R1.6 máx / p99 |
|---|---|---|
| Nadar_R6 | 7,28× / 3,06× | 4,36× / 1,94× |
| Socos_R6 | 4,93× / 2,69× | 3,47× / 1,63× |
| Mortal_Tras_R6 | 5,10× / 2,86× | 3,83× / 1,72× |
| Sophia_Dance_R4 | 6,61× / 2,56× | 3,99× / 1,81× |
| Sophia_Pirouette_R4 | 6,64× / 3,38× | 5,35× / 1,91× |

p99 melhora em todos os 15 clipes testados (−3 % a −43 %). Três clipes têm pior aresta ligeiramente maior (Correr 2,49→2,81×, Andar 1,54→1,87×, Moonwalk 1,27→1,40×), todos < 3×.

## Validação (PASS / FAIL / PARTIAL / BLOCKED / NOT RUN)

| Verificação | Estado |
|---|---|
| 90 ossos, IBM e hierarquia idênticos | PASS |
| 48 morph targets (3 primitivas do corpo) + Blush + Tears idênticos | PASS |
| 27 animações, tempos/curvas idênticos | PASS |
| Materiais e 7 imagens idênticos | PASS |
| Só a primitiva `Sophia_LabCoat` difere; só JOINTS_0/WEIGHTS_0 | PASS |
| Máx. 4 influências, soma=1 (desvio 4,5e-8) | PASS |
| Reimportação do GLB exportado (leitor glTF próprio) | PASS |
| Renders em WebGL2 real (motor do repositório): 5 ângulos em repouso, 8 poses críticas, close-ups, 4 vídeos | PASS (evidência) |
| Estiramento: sem regressão relevante, p99 menor em todos os clipes | PASS |
| Ausência de rasgos/pinçamentos **em todas** as poses extremas | **PARTIAL** — ver limitações |
| Testes Node do repositório (`sophia-r15-runtime`, `sophia-404-device-gate`, `sophia-adornments-source-lock`) | PASS (9/9) |
| `astro build` / `npm run check` completo | NOT RUN (sem `node_modules`; instalação de pacotes bloqueada) |
| Blender: `.blend` editável, renders Blender, correspondência `.blend`↔GLB | **BLOCKED** (Blender/bpy indisponível no ambiente) |
| Samsung Internet real / 30 FPS em dispositivo | NOT RUN |
| Aprovação artística | PENDENTE (proprietário) |

## Limitações restantes (honestas)

- Em Nadar ≈1,5 s ainda há abas de forro pendentes e algumas arestas até 4,4×: a malha-fonte tem camadas (externa, forro, bolsos) parcialmente desconectadas; só pesos não resolvem totalmente sem reconstrução local da cava, que não foi aprovada visualmente nesta rodada.
- Os polígonos brancos soltos no interior do jaleco são artefatos pré-existentes da fonte (fora do escopo).
- Imagens e vídeos foram gerados pelo motor WebGL do repositório, **não** pelo Blender; iluminação difere das evidências R1.5.
- `.blend` R1.6 não foi produzido (BLOCKED). O GLB R1.6 foi editado diretamente (somente atributos de pele).

## Reprodução

```sh
python3 scripts/sophia/r16/arap_weights.py local-private/sophia-r15/sophia-lab-r15.glb local-private/sophia-r16/sophia-lab-r16.glb HOPS=2 THR=1.6 OUTER=8 PER=3 LREG=0.05
python3 scripts/sophia/r16/metrics.py local-private/sophia-r16/sophia-lab-r16.glb
python3 scripts/sophia/r16/integrity.py local-private/sophia-r15/sophia-lab-r15.glb local-private/sophia-r16/sophia-lab-r16.glb local-private/sophia-r16/integrity.json
```
Requer Python 3 com NumPy/SciPy/Pillow. SHA-256 do candidato privado: `9509a118686fbe4279ae2027a4a36ca009f903c41d2a5f408f456d7f1af0fb25` (18 296 684 bytes); R1.5: `7d5d9dad7d68f69759bed1b9b76d04f04eb13cbac0353c6a7e2dd08d9c3ef501`.
