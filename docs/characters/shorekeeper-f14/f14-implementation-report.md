# Shorekeeper F1.4 — Relatório de implementação (Sonnet)

**PR:** #286 (draft, base #285 `936bf64ff1728c000a257eaf14ff6215a016dbd5`). Sem merge, sem alteração de `main`, sem F1.5/F4.
**Estado canônico:** `CANONICAL_PENDING` · **G7:** `NO_GO` · **Evidência visual:** MP4s privados, fora do repositório.
**Ambiente de medição:** Chromium/Playwright com SwiftShader (CPU). Serve para correção, ordem de desenho e crescimento de recursos; **não** mede FPS de GPU móvel nem Samsung Internet.

## 1. P0 — Borboleta pequena do gatilho (FIDELIDADE)

### 1.1 Causa confirmada (GLB real, A/B renderizado)

O defeito tem **duas causas reais e independentes**, medidas separadamente (área em pixels da borboleta = quadro com borboleta − quadro sem borboleta, normalizada pela pegada do mesmo quad sem personagem e sem máscara):

1. **Máscara de rosto em espaço de tela (`faceMask()` / `uFaceR`) — causa dominante.** O disco de proteção do rosto (raio `0,14·h`, `smoothstep 0,75–1,35`) é desenhado em tela e **independe da profundidade**: quando a câmera está atrás/ao lado da personagem — onde nenhum rosto está visível — a máscara continuava apagando a asa sempre que ela se projetava sobre a cabeça. Perda de até ~88% da área (≈24,6 s).
2. **Oclusão real do depth buffer.** Quando o plano da borboleta fica **atrás** do crânio/cabelo ao longo do raio da câmera (≈25,8–26,0 s), a cabeça a esconde de fato (`depthTest:true`, `depthWrite:false`, `renderOrder:14`). É oclusão geométrica legítima, não bug.
3. Descartado como causa: enquadramento/câmera (as variantes de azimute/enquadramento não eliminam o defeito, só o deslocam) e deslocamento espacial isolado.

Variantes testadas em QA (somente por sobrescrita de uniform/material; **nenhuma flag foi mantida**): baseline · máscara OFF · depthTest OFF · ambos OFF · raio de máscara 0,14/0,10/0,08/0,05 h · folga lateral 0/0,22/0,30/0,40 h · azimutes de câmera. O vídeo A (diagnóstico 2×2) mostra baseline × máscara OFF × depthTest OFF × ambos OFF no mesmo instante.

### 1.2 Correção (somente onde a causa foi demonstrada)

- **Máscara com consciência de perspectiva:** o disco só atua quando a cabeça realmente está voltada para a câmera (`uFaceFwd`, direção frontal lida do osso da cabeça e convertida para o espaço local — nunca do corpo, que inverte durante o giro aéreo). Se a frente não é confiável, volta ao comportamento histórico (máscara sempre ativa, sem folga).
- **Raio do disco do gatilho:** `0,05·h` (as demais camadas seguem em `0,14·h`).
- **Folga lateral `0,30·h`**, aplicada **somente quando o quad está atrás da cabeça** no espaço de visão, em direção radial na tela — a borboleta nunca atravessa a cabeça: o `depthTest` continua ligado.
- Constantes: `F14_TRIGGER_FACE_R_H = 0.05`, `F14_TRIGGER_CLEARANCE_H = 0.30`. Escolhidas pela varredura de 14 instantes × 16:9/9:16; 0,40 h já ampliava a asa além da pegada natural (razão 1,58 a 26,2 s) e foi rejeitada.
- Shader reutilizado (`BILLBOARD_VS_FACING` só no gatilho FIDELIDADE); **sem novo mesh, sem draw call, sem textura**. ARTÍSTICO G11.3 e as demais camadas FIDELIDADE usam o shader original (golden `authorialShaders` intacto).

### 1.3 Silhueta, transparência, venação e animação inalteradas

Para os 231 passos da linha do tempo sintética, o hash do probe de uniforms do gatilho **sem** `uFaceFwd/uClear/uFaceR` é **idêntico** ao do commit base F1.3 (golden `triggerAnimationUnchangedF2`, calculado no commit base e exigido pelo teste). O histórico (`f2Trigger`, `f2FidelityShaders`) foi mantido no JSON.

### 1.4 BEFORE / AFTER

Fração visível da borboleta (1,00 = pegada natural do quad sem personagem), GLB real, câmera F2 nativa, 13 instantes (23,6–26,2 s):

| t (s) | 23,6 | 23,9 | 24,2 | 24,4 | 24,6 | 24,8 | 25,0 | 25,2 | 25,4 | 25,6 | 25,8 | 26,0 | 26,2 | mín | média |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BEFORE 16:9 | 0,54 | 0,74 | 0,66 | 0,53 | 0,12 | 0,23 | 0,82 | 0,56 | 0,36 | 0,35 | 0,14 | 0,43 | 0,95 | **0,12** | **0,50** |
| AFTER 16:9 | 1,02 | 0,98 | 1,00 | 1,00 | 0,84 | 1,03 | 1,01 | 1,00 | 1,01 | 1,09 | 0,89 | 0,75 | 1,00 | **0,75** | **0,97** |
| BEFORE 9:16 | 0,54 | 0,74 | 0,66 | 0,53 | 0,12 | 0,26 | 0,83 | 0,56 | 0,35 | 0,35 | 0,16 | 0,43 | 0,94 | **0,12** | **0,50** |
| AFTER 9:16 | 1,01 | 1,07 | 1,01 | 1,00 | 0,84 | 1,04 | 1,01 | 0,99 | 1,03 | 1,02 | 0,85 | 0,77 | 1,02 | **0,77** | **0,97** |

- A média de visibilidade sobe de ~50% para ~97%; o pior instante vai de 12% para 75–77%.
- A perda remanescente (24,6 / 25,8 / 26,0 s) é **oclusão geométrica legítima**: o quad está atrás do crânio e o `depthTest` permanece ligado. Não foi “corrigida” de propósito, para a asa não atravessar a cabeça.
- Razões levemente acima de 1,00 vêm da folga lateral e da suavização da borda (±0,09 máx.); não há aumento de escala (a silhueta é a mesma).
- Evidência visual privada: vídeo `A_butterfly_mask_ab.mp4` (F3 × F1.4 em 16:9, close da mão/rosto, 9:16, câmera lenta 0,25× e diagnóstico 2×2).
- Verificação visual dos quadros (câmera F2, close e retrato): a asa aparece inteira onde o F3 a perdia; a borboleta continua atrás/ao lado da cabeça, nunca sobre o rosto.

## 2. P1 — `STUDY_COLOR` (somente laboratório)

- **AZUL** = FIDELIDADE azul-branco (pesos 0/0 → caminho idêntico por hash ao F2; o teste prova `BLUE === FIDELIDADE` em toda a linha do tempo).
- **VIOLETA** e **DOURADO** = chaves do G11.3 mantidas como *estado* (`violet 1/gold 0` e `violet 1/gold 1`); acentos (motes e onda de choque) acompanham o matiz de forma pálida.
- Transições expositivas de 1,6 s, **reversíveis**, dirigidas pelo tempo que o chamador informa — sem relógio, RAF ou timer próprios; trocar durante a transição continua dos pesos atuais (sem salto).
- **Sem associação a estágio:** o módulo não importa nada (não lê cronograma, estágio nem relógio) e `STUDY_COLOR_STATUS.stageAssociation = 'NONE'`. Cor nunca indica Outer/Inner/Supernal.
- ARTÍSTICO G11.3 ignora o estudo (teste de hash byte a byte). Recursos reutilizados: mesmos shaders, geometrias e materiais.

## 3. P2 — `STUDY_PRESENTATION` (60–90 s, configurável)

- **Combate intacto:** os seis primeiros segmentos do plano são `deepEqual` ao F3 curto (mesmos clipes, mesmos objetos, mesma duração/mistura); a mistura Burst→Recovery continua calculada sobre a saída canônica de 1,45 s (um teste detectou que a versão ingênua alterava essa mistura em 32 ms; corrigido).
- **Tempo extra = só exposição:** Idle01 continua em 1× (até seu comprimento menos 1 s), seguido de Idle02/Idle03 originais (cada um no máximo uma vez), o campo do Stellarealm é mantido por 15–25 s (padrão 20 s) com saída suave de 0,8 s e três câmeras de observação (`STUDY_DOME_LOOKUP_DRIFT`, `STUDY_GROUND_WIDE`, `STUDY_SHOULDER_TO_DOME`) entre o fim do Burst e o fim do hold. Tudo rotulado `EXPOSITION_HOLD_NOT_CANONICAL_DURATION` / `CONTEMPLATIVE_IDLE_NOT_CANONICAL`.
- O decaimento do campo permanece amarrado à recuperação de combate de 1,45 s (`STUDY_RECOVERY_REF_S`), nunca ao tempo expositivo.
- Sem Inner/Supernal/Discernment, sem relógio/RAF/câmera/renderer paralelos: usa o relógio de apresentação existente; o plano é apenas função pura do tempo absoluto.
- **UI compacta** (F3 curto preservado; Legacy G11.3 preservado): modo `CURTO · F3` / `F1.4 ESTUDO`, hold 15–25 s, duração 60–90 s, perfil de cor, “Voltar ao F3 curto”.
- Só FIDELIDADE (erro explícito em ARTÍSTICO); parâmetros inválidos falham **antes** de qualquer alocação.

**Duração real medida no GLB real (ciclo estudo padrão 75 s / hold 20 s):** 74,968 s — segmentos: Attack01 0–3,633 · Attack02 3,433–9,167 · Attack03 8,967–12,833 · L02 12,633–17,300 · Skill01 17,100–22,333 · Burst02 22,333–27,767 · Idle01 (estendido, 1×) → 53,487 · Idle02 → 74,968. Hold do Stellarealm 26,47–46,47 s (20 s); fases rotuladas: combate 1× até 27,77 s, `STELLAREALM_EXPOSITION_HOLD` até 46,47 s, `CONTEMPLATIVE_IDLE` depois. Ciclo curto F3 canônico: 28,87 s (FIDELIDADE) — inalterado.
Vídeo privado `C_study_presentation_long.mp4` (74,96 s, 24 fps) com rótulos de fase e de perfil de cor; o perfil muda AZUL → VIOLETA (33 s) → DOURADO (39 s) → AZUL (44 s) apenas para demonstrar a reversibilidade.
Vídeo privado `B_stellarealm_colorstudy.mp4`: AZUL × VIOLETA × DOURADO nos mesmos instantes e câmera (26–38 s), com o estado do campo rotulado.

## 4. Testes e regressão

- **Suíte completa:** 354 testes, **351 passam**; 3 falham por `ERR_MODULE_NOT_FOUND: sharp` (testes da Hsin que dependem de um pacote que não pode ser instalado neste ambiente, sem rede; **falham de forma idêntica no commit base**, Hsin intocada).
- **Novos (F1.4):** `tests/shorekeeper-f14-study.test.mjs`, 11 testes — configuração 60–90 s/15–25 s; combate byte-idêntico ao F3 curto; plano curto inalterado sem estudo; rejeição de caudas/durações inseguras; hold e decaimento; rótulos de fase; `BLUE === FIDELIDADE`, ARTÍSTICO ignora o estudo, reversibilidade; controlador sem importações/relógio/RAF e sem associação a estágio; shader/uniforms do gatilho (FIDELIDADE-only, histórico sem `front`, sem diagnóstico em produção); câmera de estudo (pura, finita em 16:9/9:16, desligada em movimento reduzido); integração só FIDELIDADE, validação antes de alocar e 10 ciclos create/dispose sem resíduos.
- **Ajustados (esperados):** `shorekeeper-f3-fidelity` (golden do gatilho FIDELIDADE regenerado, histórico F2 preservado, mais prova de animação idêntica ao base) e `shorekeeper-f3-cycle-menu` (novo literal `f14-study`).
- **`npm run check` / `npm run build`:** `ENV_BLOCKED` — sem instalação de pacotes neste ambiente; verificados apenas `node --check` em todos os módulos e equilíbrio de tags do `.astro`. Precisam rodar no CI/local.
- **Regressões cobertas pela suíte existente (verde):** três idles originais, rostos R5/R6, clipes originais e Root BODY, câmera F2, G11.3 ARTÍSTICO, gating de música e sistemas de segurança.

## 5. Recursos e custo

Medido com Chromium + SwiftShader (**não** representa GPU móvel/Samsung; sem FPS afirmado):

| Item | F3 curto (FID) | Estudo 75 s | ARTÍSTICO |
|---|---|---|---|
| Construção do diretor (3 execuções) | 482–548 ms | 1239–1436 ms (≈2,6×, linear na duração: guia de câmera e histórico de trilhas) | — |
| Draw calls (instantes amostrados) | 15–18 | 13–17 | 18 (ciclos) |
| Triângulos | ≈96,7–99,2 k | ≈96,2–98,7 k | — |
| Geometrias / texturas (estado estável após 10 ciclos) | 17 / 14 | 17 / 14 | 18 / 14 |
| Objetos de cena | 302 | 302 | 302 |

- **Dez ciclos FID / ESTUDO / ART (30 reconfigurações)**: texturas 14→14 e objetos de cena 302→302 nos três; geometrias 15→17 (FID, aquecimento no 1º ciclo e estável depois), 17→17 (ESTUDO), 18→18 (ART). **Sem crescimento.**
- **Ciclo de vida (estudo):** pausa congela o relógio (2,1166 s antes e depois); interrupção → `idle` / `INTERRUPTED`; reiniciar restaura o plano de 74,968 s; seek ao hold → `STELLAREALM_EXPOSITION_HOLD`; perda e restauração de contexto WebGL → contexto `webgl2` restaurado e estudo reconstruído (18 geometrias / 15 textura / 17 draw calls); descarte → 0 geometrias, 1 textura, 4 objetos, sem diretor.
- Nenhum draw call, mesh, textura ou RAF novo foi adicionado pelas correções; o custo extra do estudo é o pré-cálculo único mais longo. O custo em dispositivo real continua `NOT_MEASURED` (`MOBILE_GPU_PENDING`).

## 6. Segurança e privacidade

- Nenhum GLB, vídeo, imagem original, nome de arquivo privado ou URL autenticada no repositório, no PR ou em artefatos de CI; hashes truncados apenas em `reference-recognition.md`.
- Evidência privada entregue pelo canal privado da sessão (`F14_private_evidence_NAO_PUBLICAR.zip`) e pacote público seguro separado (`F14_public_safe.zip`).
- `CANONICAL_PENDING` e `G7_NO_GO` mantidos; Unbound Form, Illation, Discernment e novos Basics **não** implementados; F1.5/F4 não iniciadas; sem merge.

## 7. Limites honestos

- SwiftShader não equivale a GPU real nem a Samsung Internet: nenhum FPS móvel é afirmado.
- As dez imagens nomeadas não chegaram (`SOURCE_UNAVAILABLE`); o reconhecimento visual cobre só os quadros do ZIP e não verifica fonte, habilidade nem movimento.
- O tempo extra do estudo é expositivo; a duração canônica do ciclo continua desconhecida.
- `npm run check` / `npm run build`: `ENV_BLOCKED` aqui (ver §4); rodar no CI.
- A correção da borboleta remove a perda causada pela máscara e reduz a causada pela folga; **oclusão geométrica legítima remanescente** (quad atrás do crânio) é mantida por decisão: a asa não atravessa a cabeça.

## 8. Veredictos por componente

| Componente | Veredito | Observação |
|---|---|---|
| Oclusão da borboleta | **PASS** (visual sintético/GLB real) | média 50% → 97%; pior instante 12% → 75–77%; perda remanescente é oclusão geométrica legítima. Aceitação do dono pendente. |
| Cromatismo (STUDY_COLOR) | **PASS** | BLUE ≡ FIDELIDADE, VIOLETA/DOURADO distintos e reversíveis, ARTÍSTICO intacto; sem relação com estágios. |
| Estudo longo | **PASS** | 74,97 s no GLB real, combate 1× intacto, hold 20 s rotulado. Câmeras de observação são expositivas, não derivadas de referência. |
| Regressões | **CONDITIONAL PASS** | 351/354; 3 falhas ambientais (`sharp`, idênticas no base); `npm run check`/`build` bloqueados aqui. |
| Recursos | **CONDITIONAL PASS** | sem crescimento em 10 ciclos, sem novos draw calls; custo em GPU/Samsung não medido; construção do estudo ≈2,6× mais lenta (CPU). |
| Segurança | **PASS** | nada privado no repositório; evidência por canal privado. |
| Fidelidade canônica | **FAIL / CANONICAL_PENDING** (por desenho) | as dez imagens nomeadas não chegaram; sem MOTION_MATCHED; G7 NO_GO. Nenhuma fidelidade canônica é afirmada. |

**F1.4 “visualmente pronta”?** Os três critérios (asa sem o defeito, riqueza cromática estudável, apresentação longa sem regressões) foram atendidos nos testes e nos vídeos; falta a aceitação visual do dono, `npm run check/build` no CI e medição em dispositivo real.
