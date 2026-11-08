# HSIN Combat R2.2 — Environmental VFX e palco lunar reativo

Base: PR #279 (R2.1.2), commit `07d74804ce8a69196164dd462a7a4c55a1da5d31`. Um PR draft empilhado, sem merge, sem alterar `main`.
Extensão **opt-in** do laboratório de combate: seletor "R2.2 · R2.1 + resposta ambiental lunar". A opção "R2.1" continua idêntica à R2.1.2.

## O que foi implementado

Uma camada ambiental de baixo custo, dirigida pelo mesmo relógio e pelos mesmos marcadores da coreografia (nenhum segundo RAF, física ou diretor):

| Efeito | Movimento real que o dispara | O que aparece |
|---|---|---|
| A. Crescent Resonance, Basic 01 | trilha da mão direita (marcador `trail` 1,8 s → `arc` 2,2 s), posição da palma lida do esqueleto a cada frame | fragmentos ouro/carmesim baixos e horizontais, dispersão curta (≈0,3–0,5 s), assentam para baixo |
| A. Crescent Resonance, Basic 02 | trilha da mão esquerda (`trail-left` 2,78 s → `arc-left` 3,32 s) | fragmentos rosé/ouro finos, flutuabilidade ascendente, dissipação mais longa (≈0,55–0,8 s); brilho rosé no pico |
| B. Lunar Surface Response | transferência de peso verificada: pico do deslocamento lateral da pelve sobre um pé **plantado** (altura real de pé/dedo contra a linha de base de repouso) | onda luminosa rasa sob o pé carregado (y = 0,006 m, plano da pedra) + 3–6 fragmentos junto à borda do anel; nada quando o pé não está plantado |
| C. Lunar Convergence, Skill | `charge` 3,95 s → `ring` 5,45 s → `recovery` 6,0 s | 1 concentração: 1–3 brilhos pequenos junto às palmas · 2 acumulação: fragmentos convergem em espiral para a esfera real, cada vez mais rápido (até 34) · 3 liberação: leque estreito de raios na direção do lançamento da R2.1.2 + dois brilhos + onda no piso · 4 reverberação: duas ondas atrasadas (+0,30 s e +0,62 s) e brasas na linha externa do mandala · 5 dissipação: tudo termina em ≈1,9 s e devolve o palco ao cenário |

Mandala selo (dois anéis finos no piso, entre os pés) acompanha a Skill: surge devagar durante a acumulação, expande no lançamento e some. Cores em luz linear (ouro quente, carmesim, rosé, ouro pálido): nenhuma chega ao branco.

Água, flores e lanternas: **não implementado** (ver Limitações) — o terraço atual não expõe superfícies com altura/normais próprias para resposta barata e convincente; fica como expansão futura.

## Arquitetura

- `src/scripts/hsin-combat-env-sim.mjs` — simulação **pura** (sem THREE/DOM). Cada partícula é função analítica de (registro de nascimento, relógio): arrasto + gravidade em forma fechada, ondas por interpolação de raio. Spawns em ticks fixos de 60 Hz com posições de mão interpoladas, RNG por contador. Pausa = mesmo relógio = mesmo quadro; rebobinar reinicia.
- `src/scripts/hsin-combat-env.mjs` — wrapper THREE. 3 `InstancedMesh` (anéis/ondas, cristais, brilhos de 4 pontas) com **um** material aditivo `vertexColors`; buffers alocados uma vez; nenhum objeto alocado por frame. Lê palmas (mesmas do R2.1, via `vfx.palms`), pés/dedos e pelve do esqueleto real.
- `src/scripts/hsin-combat-vfx.mjs` — apenas dois acessores de leitura (`palms`, `launch`); comportamento R2.1.2 inalterado.
- `src/scripts/hsin-combat-lab.mjs` / `src/pages/experimentos/combate/index.astro` — opção `r22`; a camada só é criada com essa escolha e é limpa/descartada com o laboratório.
- Harness/QA: `scripts/qa/hsin-combat-acceptance.mjs` (opções `environment`, `camera:'cinematic'`, `density`, `bench`), `scripts/qa/render-hsin-combat-r22-video.mjs` (vídeos e pares R2.1.2 × R2.2), `scripts/qa/run-hsin-combat-webgl.mjs` (`--variant=r22`).
- Workflow: `.github/workflows/hsin-combat-r22.yml`.

## Orçamento (ver resultados medidos no PR)

Limites: ≤ 4 draw calls extras, ≤ 3.000 triângulos extras, sem textura, sem render target, sem bloom. Projeto: 3 draw calls, 3 geometrias, 1 material, pior caso 2.016 triângulos (todos os pools cheios). Densidade dos fragmentos cai para 60 % em dispositivos de poucos núcleos/pouca memória (`hardwareConcurrency ≤ 4` ou `deviceMemory ≤ 3`); a animação corporal nunca é alterada.

## Preservado

GLB, skin, bake, anatomia R2.0.1–R2.1.2, trajetórias/tempos/marcadores, atuação facial, V2.0.1 pública, contemplativos/Dança Lunar, Shorekeeper/Sophia/Phrolova, Cloudflare Access/R2, `main`. O workflow verifica por `git diff` contra o commit-base que esses caminhos não mudaram.
