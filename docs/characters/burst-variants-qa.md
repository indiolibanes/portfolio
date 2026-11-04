# Shorekeeper F2.1 C/CL · Rodada 2 · variantes de Root, pirueta da Burst02 e combo contínuo

Estado: **`C_ROTATION_QA_PENDING`** · **`C_COMBO_QA_PENDING`** · sem aprovação visual humana. `main` intocada. Nenhum asset privado no repositório.
Renderizado em **WebGL2 real** (Chromium headless + SwiftShader; GLB canônico `4f03b6fd…bc30`, clipes originais Burst01/02 e C.3 privados, `stage.mjs` e `liberation-rotation.mjs` do repositório). É software: serve para forma, orientação e continuidade, não para desempenho nem para o shader do jogo.

## 1. As três variantes, lado a lado (mesma câmera, mesmo instante)

A = `ORIGINAL` (Root vindo do Rib, como está) · B = `REBASED` (CL.1: `q_bind × q(0)⁻¹ × q(t)`) · C = `ROOT_BODY_OWNED` (Root no bind, só o corpo anima).
Quadros: Burst01 em 0 / 3,48 / 4,475 / 6,0 s (quadros 0/105/135 do brief + fim); Burst02 em 0 / 1,789 / 3,545 / 5,4 s (quadros 0/54/107/163). Vistas frontal e superior.

Medição objetiva sobre as poses reais do esqueleto (quatérnion mundial; 60 amostras/s; pelve, cabeça, mãos):

| Clipe | A vs C (rotação do corpo inteiro) | B vs C | Maior passo por quadro a 60 Hz (A / B / C) |
|---|---|---|---|
| Burst01 | **150–180°** (≈177° nos quadros de referência) | 0–28,9°, média 8,9° (6,2–8,8° nos quadros 105/135/fim) | 3,1° / 3,1° / 1,3° |
| Burst02 | **165–180°** (≈173–180° nos quadros de referência) | 0–17,8°, média 6,7° (4,7–7,7° nos quadros de referência) | 12,4° / 12,4° / 11,7° |

Leitura:

- **A gira o personagem inteiro ~180°** em relação ao bind (pelve, cabeça e mãos andam juntas: o corpo inteiro gira rigidamente): é a rotação estática do Root do Rib que a CL.1/1.1 já tinha apontado. Na imagem, A termina de costas nas duas Bursts.
- **B** remove esse ~180° e mantém o movimento relativo do Root, que inclina o corpo até 29° (Burst01) e 18° (Burst02) em relação a C.
- **C** é o corpo limpo: Burst01 fica ereta; a diferença de passo máximo (1,3° contra 3,1°) é a oscilação do Root.
- **A pirueta da Burst02 é real e está nas três**: o passo máximo de ~12°/quadro (≈ 740°/s) é igual em A, B e C, ocorre em 2,1–2,2 s, e não há salto de quatérnion (nenhum passo > 13°). Nenhuma variante a altera nem a desacelera.

## 2. Entrada da Burst02 (de costas ou de frente?)

Decisão a partir da referência, não do diagnóstico numérico:

- `resonance liberation cutscene.gif`, 0,1 s: o primeiro quadro mostra **as costas** da Shorekeeper (costas abertas, laço da cintura); em 3,0–3,7 s ela já está **de frente** para a câmera, braço erguido. B e C começam de costas na Burst02 e terminam de frente (pelve de −91° a +120°, ≈ 210°). A termina de costas.
- Portanto **não aplico correção de 180° à entrada da Burst02**: B/C entram de costas e giram até encarar a câmera, o que é consistente com a abertura do GIF.
- Ressalva: a câmera da cutscene se move, então o GIF não fixa o rumo absoluto no mundo. A evidência é de consistência de sequência (de costas → de frente), não de prova. Continua `C_ROTATION_QA_PENDING`. Se a câmera do jogo estiver atrás dela nos 0,1 s, a entrada de costas da câmera frontal do laboratório é esperada.

## 3. Recomendação (provisória, depende de revisão humana)

- **Combos e uso geral: `ROOT_BODY_OWNED` (C).** É a mais estável, e nos combos suaviza a transição Skill→Burst (4,6° contra 15,8° por quadro).
- **Burst isolada com a inclinação autoral do Root:** `REBASED` (B) mantém até 29°/18° de inclinação que podem ser coreografia (o brief da CL.1.1 já dizia que, se o jogo balança de leve, B é o certo). **Não consegui provar** nenhuma das duas contra o jogo.
- `ORIGINAL` (A) permanece disponível só como controle.
- Nenhuma curva foi editada. Os clipes originais e o GLB canônico continuam intactos.

## 4. Combo contínuo: Attack → Skill → Burst → Recovery

Módulo novo `src/scripts/shorekeeper/combo-sequencer.mjs` (7 testes). Um único dono do mixer, pesos explícitos e tempo explícito (reprodutível e "seekable"), só trilhas de corpo (rejeita canais não corporais), sem morphs faciais, sem editar Root, sem câmera, sem VFX acoplado.
Os pontos de transição são escolhidos por **similaridade de pose** (distância média de ângulo em 20 ossos) em janelas limitadas, em vez de cortes nos fins naturais.

Sequência medida (Root no bind em todos os clipes; os originais não foram alterados):

| Evento | t (s) | Clipe | Janela do clipe (s) | Blend | Distância de pose |
|---|---|---|---|---|---|
| ENTER | 0,00 | `SK_ATTACK_L02` | 0,00–4,27 | — | — |
| BLEND_IN | 3,97 | `SK_SKILL_01` | 0,53–4,63 | 0,30 s | 28,4° |
| BLEND_IN | 7,72 | `SK_BURST_01` (C) | 0,27–4,70 | 0,35 s | 17,8° |
| BLEND_IN (recuperação) | 11,80 | `SK_IDLE_01` | 0,90–4,10 | 0,35 s | 17,6° |
| END | 15,00 | — | — | — | — |

Maior passo por quadro a 60 Hz nas janelas de transição (mão/cabeça/pelve):

| Plano | Attack→Skill | Skill→Burst | Burst→Idle |
|---|---|---|---|
| Corte seco, fins naturais (Root original) | 137° | 61° | 167° |
| Corte seco, Root no bind | 136° | 59° | 97° |
| Blend por similaridade, Root original + Burst REBASED | 18,9° | 15,8° | 8,9° |
| **Blend por similaridade, Root no bind + Burst C** | 19,9° | **4,6°** | 9,3° |

Com a Burst02 no lugar da 01: Skill→Burst 11,0° (C) / 13,1° (B); Burst→Idle 11,6° / 11,6°.
O maior passo da sequência inteira (38,6° em 0,35 s) está **dentro do Attack**, não numa transição: os blends não introduzem velocidade maior que a do próprio clipe. Os cortes secos têm saltos de até 1,5 m em um osso (pelve, cabeça ou mão) de um quadro para o outro.

Vídeo: três personagens com o mesmo combo, corte seco (esquerda) × blend com Root original e Burst B (centro) × blend com Root no bind e Burst C (direita).

## 5. Limites (não escondidos)

- Os quatro ataques básicos (`SK_ATTACK_01..04`) não estavam disponíveis como GLB nesta sessão; o combo usa `ATTACK_L02` e `SKILL_01`. A matriz com o encadeamento Attack01→04 fica pendente.
- O blend de 0,3–0,35 s em transições de 17–28° de distância é visível como movimento, não como corte. Se a pose de chegada for muito diferente, o olho vê uma "dobra": só o vídeo em GPU/Android decide.
- A Burst começa e termina no ar; a recuperação para o idle pelo Root no bind não tem física de pouso (o idle original tem os pés no chão): a transição de altura é feita pelo blend, sem animação de aterrissagem.
- Sem câmera cinematográfica e sem VFX acoplado: o brief só autoriza depois de marcadores de evento manuais aprovados. A tabela acima é a base desses marcadores.
- `deriveBindRootClip` (generaliza `createBindRootBurstClip` a outros clipes) existe só para QA/combos; o módulo original continua restrito às Bursts.
- Sem GPU: nada de FPS/draw calls.
