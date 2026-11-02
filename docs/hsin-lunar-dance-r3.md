# Hsin Lunar Dance R3 · Moon Fox Reverie

**Experimental; apresentação pública permanece V2.0.1. VISUAL_QA_PENDING. Sem merge automático. Nenhuma aprovação artística é declarada.**

Base: PR #195, `experiment/hsin-lunar-dance-r2-2026-11-02 @ dea78665d2e421475240b7f66c6911a65a690469`. Branch: `experiment/hsin-lunar-dance-r3-2026-11-02`, empilhada sobre #195 (PR draft). `main` não foi tocado. Estudo da referência: [`hsin-lunar-dance-r3-reference-study.md`](hsin-lunar-dance-r3-reference-study.md).

## O que muda

1. **Frase especial rara `moon-fox-reverie`** (13,6 s, autoria própria; o vídeo só informou vocabulário e tempo). Cinco movimentos:

| Movimento | Fase | Conteúdo |
| --- | --- | --- |
| A · Fox's Prelude | 0–.16 | Ombros antecipam, torso segue a mão direita, cabeça contra-move |
| B · Silk Spiral | .16–.44 | Arcos largos, rotação parcial, punhos terminam depois dos cotovelos |
| C · Lunar Bow | .44–.66 | Quadril para trás/baixo com pés travados, coluna dobra, braços equilibram |
| D · Moonlit Recovery | .66–.78 | Tronco primeiro, cabeça tarde, ombros acomodam |
| E · Foxfire Finale | .78–1 | Um braço sobe, o outro responde, silhueta aberta breve e retorno orgânico |

2. **Variante conservadora (padrão) e dramática (desligada).** Conservadora: coluna 12 + 14 + pescoço 4 + cabeça 3 = 33°, quadril 40 mm para trás / 45 mm para baixo. Dramática (`moon-fox-reverie-grand`, 14,4 s): 22 + 26 + 8 + 6 = 62°, 75 mm / 70 mm. A dramática só entra com `dramaticEnabled: true` **e** `maxBowDegrees ≥ 62`, e o bake a descarta se o alcance do IK ou o portão de segurança falhar; sem ela, o diretor cai automaticamente para a conservadora.
3. **Movimento secundário offline** em 215 bones já skinados no GLB: cabelo 102, manga L 52, manga R 51, cauda 10. Seguidor amortecido de 2ª ordem, atraso por profundidade, viés de gravidade, envelope zero nas pontas. Nenhuma física em runtime.
4. **Suavização R2 → R3:** interpolação Catmull-Rom nos canais superiores (o inferior mantém slerp, para não quebrar o foot lock); chaves da R3 interpoladas com PCHIP (C1).
5. **Integração facial** pelos sinais existentes (`REVERIE_FACE_CUES`: sorriso na preparação, sustentação no final, neutro na liberação), com instantes alternativos por episódio. O árbitro de pálpebras não é interrompido.
6. **Carregamento:** sondagem do GLB e dos assets em paralelo, cenário carregado cedo, e o asset R3 (~205 kB) é carregado de forma preguiçosa em idle, com SHA-256 e hashes de modelo/perfil verificados. Se falhar, a dança R2 continua idêntica.

## Ossos e propriedade de canais

Nenhum bone criado; GLB não reexportado. A R3 usa 40 canais (ORG + DEF): Spine1, Spine2, Neck, Head, ClavicleR/L, UpperArmR/L, ForearmR/L, HandR/L (superior, 24) e Thigh, Calf, Foot, Toe0 L/R (inferior, 16), mais o canal de posição do ancestral comum e as trilhas secundárias. A inclinação usa o eixo lateral do modelo (`bowAxis`), com contra-rotação dos braços sobre o mesmo eixo; pés fixos por IK analítico offline de dois segmentos (o mesmo solver da R2).

## Variações de intensidade

`soft` .72 / `flowing` .9 / `expressive` 1 escalam somente a parte **superior**. Quadril, pernas e pés ficam sempre a 100 % (o caminho de apoio verificado). O erro de pé medido é idêntico nos três níveis (0,045 mm).

## Configuração (`DANCE_R3.reverie`)

| Chave | Padrão | Limite aplicado por `reverieSettings()` |
| --- | ---: | --- |
| `enabled` | true | — |
| `chance` (por frase elegível) | .14 | ≤ .5 |
| `cooldownSeconds` | 160 | ≥ 45 |
| `minPlayingSeconds` / `minPhrasesBefore` | 30 / 3 | — |
| `intensity` / `speed` | 1 / 1 | speed .85–1,2 |
| `maxBowDegrees` | 36 | ≤ 70 |
| `dramaticEnabled` | false | — |
| `reducedMotion` | `skip` | — |
| `footSlideLimitMm` | 2 | — |
| `recoverySeconds` / `interruptSpeed` | 1,6 / 1,45 | — |

O evento especial usa um fluxo de RNG próprio: com `enabled: false` ou `chance: 0`, a sequência R2 é bit a bit idêntica (testado). Janela insegura de interrupção [0,46; 0,76]: espera acelerada até o corpo estar ereto, depois recuperação inercial. Fora dela, recupera de uma postura já ereta.

## Resultados medidos (CI, run 41517380911, head 44133c26)

| Medida | Valor |
| --- | --- |
| Escorregamento máx. dos pés (1 / .9 / .72) | 0,045 mm em todos |
| Altura mín. da sola | +0,028 mm (conservadora), +0,016 mm (dramática) |
| Gap ORG/DEF | ≤ 0,018 mm (cons.), 0,033 mm (dram.) |
| Passo angular máx. entre frames (30 Hz) | 2,43° |
| Salto de aceleração / passo secundário / passo de posição | 0,56° / 0,53° / 2,28 mm |
| Inversões de sinal do quaternion após decodificar | 0 |
| Recuperação a partir de 8 fases | passo ≤ 2,19°; sola mín. −0,88 mm (fase .44), demais ≥ −0,47 mm |
| Sessões de 600 s, 3 sementes forçadas | 11–13 episódios; passo ≤ 7,28°; sola mín. −0,3 mm |
| Sessões de 600 s, padrão (6 sementes) | 3–4 episódios |
| Coluna máx. / queda do quadril / recuo | 32,96° / 52,7 mm / 40 mm |
| Margem de COM mín. (repouso) | 19,4 mm (21,5 mm) |
| Asset R3 / R2 | 205.005 B / 511.505 B (dramático 215.487 B) |
| Buffer de runtime R3 / R2 | 20.208 B / 5.472 B |
| CPU por `apply` (Node, runner de CI) | R2 ≈ 0,010 ms · R3 com secundário ≈ 0,030 ms |
| R2: 8 frases e tempos | preservados (teste de regressão R2 PASS) |

Testes: autoria, diretor (plain Node, local) e `hsin-dance-r3.test.mjs` com o GLB real (CI), regressão R2, `check:hsin` e `build` — todos PASS no CI, com `pipefail`.

## QA visual (evidência em `docs/qa/hsin-dance-r3/`)

`key-poses-front|threeQuarter|side.webp` (14 fases), `r2-vs-r3.webp`, `transition-r2-r3.webp`. Vídeo CPU de 13,6 s publicado pelo CI na branch `qa-results/hsin-dance-r3-video`. São renders por raster em CPU (SwiftShader): servem para pose/geometria, **não** para FPS, material ou aprovação artística.

Leitura da inspeção por mim: pés plantados em todas as fases; a inclinação conservadora lê como uma reverência suave (quadril recuando, tronco inclinando, braços equilibrando), sem pop nas transições. A vista "side" do script enquadra por trás/três-quartos traseiros; a profundidade da inclinação é mais legível na vista lateral real e no navegador.

## Limitações conhecidas

- **Sem medição de FPS, DPR adaptativo ou tempo de carregamento em navegador/GPU real.** Os números de CPU são relativos.
- O modelo de COM é uma estimativa rígida e rústica (margem idêntica nas duas variantes: não discrimina a inclinação). Não é prova de equilíbrio.
- Sinais de inclinação, contra-rotação dos braços e das trilhas secundárias foram verificados só por imagens de CPU; revisão humana em GPU real pendente.
- Interseção de cabelo/mangas/cauda com o corpo na inclinação: inspeção visual limitada à resolução das folhas; não há detector automático.
- A variante dramática foi gerada e passou o portão do bake, mas permanece desligada até aprovação.
- Sincronização com a música continua livre (sem BPM/compasso verificado).

## Reproduzir

```
npm run check:hsin        # inclui os 3 testes R3 (o de GLB real roda no CI)
node scripts/bake-hsin-dance-r3.mjs
node scripts/render-hsin-dance-r3-qa.mjs --only=sheets|compare|video
```
Workflow: `.github/workflows/hsin-dance-r3.yml` (publica em `qa-results/hsin-dance-r3-*`).
