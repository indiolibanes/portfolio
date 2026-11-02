# Hsin V2.0.1 — Fidelidade do rosto e iluminação (PR A)

Status: **candidato**; aprovação visual pendente do responsável. Testes numéricos e quadros de WebGL por software (SwiftShader) não substituem a revisão visual no hardware real.

## Diagnóstico (medido no GLB de produção, sem alterá-lo)

- O material do rosto (`Gathering Wives - Face Xin`) usa `KHR_materials_unlit`; o `GLTFLoader` o converte em `MeshBasicMaterial`. O rosto exibe 100 % da textura sob qualquer luz: mediana sRGB 251/213/213, sem resposta à luz principal, de contorno ou ambiente.
- Os demais materiais de pele/roupa são PBR iluminados (≈40–60 % do albedo). Resultado: rosto 2,4–3,0× mais claro que pescoço/braços, lido como "pálido/achatado".
- Não há erro de espaço de cor: textura sRGB, cores de vértice 1,0, saída sRGB, `NoToneMapping`. Não há *morph normals* (as normais-base permanecem válidas).
- Auditoria completa: `docs/hsin-v201-material-audit.json` (`node scripts/audit-hsin-materials.mjs`).

## Mudança

Somente o material do rosto é substituído em tempo de execução por um `MeshLambertMaterial` que **reutiliza o mesmo objeto de textura** e aplica `saída = albedo × (tint × irradiância/π + piso)`. O piso quente (emissivo × mesma textura) mantém o lado sombreado em sombra suave de anime, sem cinza.

- Arquivo: `src/scripts/hsin-face-skin.mjs` (parâmetros congelados e versionados, `2.0.1-face-r2`); luzes compartilhadas em `src/scripts/hsin-stage-lighting.mjs` (valores inalterados).
- Preserva skinning e *morph targets*; não adiciona textura, luz, passe ou render target; olhos, cabelo, roupa e cenário não mudam; reversível com `restore()` (devolve o objeto original e descarta o substituto).
- O GLB `hsin-v2.0.glb` (9 873 744 bytes, sha256 `63506b0b…e0d2c`) não foi modificado.

## Evidência

- `docs/qa/hsin-v201/face-before-after.webp`: quadros reais de WebGL (esquerda: V2.0.1 com rosto unlit; direita: pele iluminada) em frontal, ¾ (palco) e quase perfil. Quatro variantes de parâmetros foram comparadas; r1 e as mais frias ficaram acinzentadas, uma mais rosada tendeu a rosa artificial.
- Testes: `hsin-material-audit`, `hsin-face-skin-math` (normais reais do rosto na pose apresentada: sem clipping, p10/p90 de luminância 0,55–0,85, razão rosto/corpo < 2,5), `hsin-face-skin` (troca, textura compartilhada, restauração exata, GLB real), `hsin-rig-parity` (o avaliador offline coincide com o three.js; inclui os 6 pesos de morph padrão do rosto).
- Infraestrutura de QA: `.github/workflows/hsin-visual-qa.yml` (Chromium + SwiftShader; quadros publicados em `qa-results/hsin-visual`).

## Limites reais

- SwiftShader só serve para cor/luz; **não** prova FPS nem suavidade (`WEBGL_VISUAL_QA_PENDING` para FPS/GPU).
- Os parâmetros foram escolhidos olhando quadros de software; ajuste fino pode ser necessário em telas reais (gama/brilho variam).
- O rosto continua mais claro que o corpo por escolha (ponto focal), dentro da banda testada.
