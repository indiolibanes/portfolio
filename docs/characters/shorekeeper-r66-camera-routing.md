# Shorekeeper R6.6 — Câmeras selecionáveis e palco futuro

**Base:** PR #260, R6.5 do Work, sem merge. A correção de ownership VFX, os sete segmentos G11.3, o gating musical e o handoff corporal da R6.5 permanecem intactos.

## Contrato atual

- Automática: usa a câmera inteligente ORIGINAL G11.3/S5 da Shorekeeper durante a música, sem o adaptador posterior que enquadrava as duas personagens. Hsin permanece na mesma cena/Stellarealm, mas não precisa estar visível no close-up.
- Shorekeeper: acompanha o torso quando ociosa e usa a câmera cinematográfica original quando inicia G11.3.
- Hsin: enquadramento manual ancorado na personagem, mesmo enquanto G11.3 segue executando seus próprios body/VFX.
- Livre: câmera com OrbitControls. O corpo e os efeitos cinematográficos continuam quando o usuário toma o controle da câmera.
- Phrolova e Sophia: opções reservadas/desabilitadas; não fingir que possuem diretores ou GLBs prontos.

**Recursos:** uma PerspectiveCamera real, um WebGLRenderer e um RAF. Os quatro futuros diretores serão fontes de poses de câmera, não renderizadores separados.

## Interação

OrbitControls.zoomToCursor e enablePan estão ativos somente no dueto. Roda do mouse e pinça com dois dedos aproximam o ponto sob o cursor/toque (não o centro da tela). Ao começar um gesto enquanto a câmera G11.3 detém ownership, o lease cinematográfico é liberado sem restaurar uma posição antiga: a coreografia e os efeitos continuam.

Selecionar Hsin/Shorekeeper durante o modo de contemplação desloca o ponto de interesse suavemente usando o RAF existente e acompanha o bone/root pela posição mundial. Não executar varreduras caras de SkinnedMesh a cada frame.

No dueto, o listener de mudança do OrbitControls não deve forçar o Y do alvo para o centro da cena. A rota solo da Hsin permanece sem alterações.

**Pendente:** retorno à câmera inteligente no meio do golpe precisa de interpolação cinematográfica afinada em WebGL; não aprovar sem QA autenticado, especialmente em smartphones.

## Contrato futuro para quatro diretoras/diretores virtuais

Cada personagem terá: actorId, ready, root, anchors, cameraDirector, focusMode, priority, savedState, dispose. Um arbitrador aplica UMA pose por frame. Escolha explícita do usuário tem prioridade sobre follow automático; os diretores não podem concorrer diretamente pela PerspectiveCamera.

Não implementar quatro câmeras físicas. Não iniciar deslocamentos de câmera em personagem ainda sem geometria/rig pronto. Antes de disponibilizar Phrolova e Sophia, testar troca e zoom no meio de ações simultâneas.

## Cenografia proposta — Jardim das Marés Astrais

Evoluir o atual terraço lunar numa plataforma assimétrica de pedra clara/jade sobre lago espelhado e margens escalonadas. Arcos lunares vazados em marfim e ouro fosco nas bordas externas, pavilhões chineses futuristas discretos, lotos e gramíneas leves e lanternas de brilho contido. A superlua central permanece no fundo; um círculo central amplo, sem obstáculos, abriga o Stellarealm e as quatro personagens. Distribuição de intenção: Phrolova à esquerda (carmesim), Hsin centro, Shorekeeper à direita (azul), Sophia próxima à Hsin (prata/dourado).

Performance: instancing e geometria mesclada, materiais limitados, texturas comprimidas, sem bloom ou neblina volumétrica pesada, DPR adaptativo, pausas offscreen, um renderer. Não substituir cenário inteiro antes de estabilizar os envelopes das quatro animações e a seleção de câmera.

## QA obrigatório

G11.3 original: close-ups e lentes focam Shorekeeper somente, preservam os sete segmentos e efeitos. Com música tocando, scroll/pinça em qualquer quadrante permite exploração livre sem parar body/VFX. Hsin e Shorekeeper podem ser escolhidas no selector; Phrolova/Sophia permanecem desabilitadas. Verificar seleção rápida e retomar auto durante Skill/Burst sem snap ou pose perdida; se snap, marcar PENDING e ajustar via Work. Testar 1280x720, 390x844, 832x384, Samsung Internet, conta Cloudflare Access, música pausada e retomada, WebGL context loss. Build/Node não substituem render visual. G7 segue NO_GO.
