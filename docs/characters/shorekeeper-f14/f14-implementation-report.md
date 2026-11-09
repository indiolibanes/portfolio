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

RESULTADOS_P0

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

RESULTADOS_P2

## 4. Testes e regressão

RESULTADOS_TESTES

## 5. Recursos e custo

RESULTADOS_RECURSOS

## 6. Segurança e privacidade

- Nenhum GLB, vídeo, imagem original, nome de arquivo privado ou URL autenticada no repositório, no PR ou em artefatos de CI; hashes truncados apenas em `reference-recognition.md`.
- Evidência privada entregue pelo canal privado da sessão (`F14_private_evidence_NAO_PUBLICAR.zip`) e pacote público seguro separado (`F14_public_safe.zip`).
- `CANONICAL_PENDING` e `G7_NO_GO` mantidos; Unbound Form, Illation, Discernment e novos Basics **não** implementados; F1.5/F4 não iniciadas; sem merge.

## 7. Limites honestos

- SwiftShader não equivale a GPU real nem a Samsung Internet: nenhum FPS móvel é afirmado.
- As dez imagens nomeadas não chegaram (`SOURCE_UNAVAILABLE`); o reconhecimento visual cobre só os quadros do ZIP e não verifica fonte, habilidade nem movimento.
- O tempo extra do estudo é expositivo; a duração canônica do ciclo continua desconhecida.
- `npm run check` / `npm run build`: ver §4 (ambiente sem instalação de pacotes).
- A correção da borboleta remove a perda causada pela máscara e reduz a causada pela folga; **oclusão geométrica legítima remanescente** (quad atrás do crânio) é mantida por decisão: a asa não atravessa a cabeça.
