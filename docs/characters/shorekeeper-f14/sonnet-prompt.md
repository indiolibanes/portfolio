# PROMPT DE EXECUÇÃO — SHOREKEEPER F1.4 (SONNET)

Modelo: Claude Sonnet — esforço Alto.
Repositório: indiolibanes/portfolio.
PR-base obrigatória: #285 (head 936bf64ff1728c000a257eaf14ff6215a016dbd5).
Branch da entrega já criada: experiment/shorekeeper-f14-study-handoff-20261108.
PR F1.4: PR draft de handoff preparado nesta branch. **Continuar no mesmo PR e branch; não abrir outro micro-PR.**
Nenhum merge automático; não tocar main ou a Hsin.

## 0. Antes de programar
1. Confira o HEAD real do PR-base #285 e que a branch F1.4 deriva dele. Se o head tiver mudado, registre o delta e não sobrescreva alterações posteriores.
2. Leia integralmente estes três arquivos, que são o contrato da tarefa:
   - docs/characters/shorekeeper-f14/README.md
   - docs/characters/shorekeeper-f14/reference-matrix.md
   - docs/characters/shorekeeper-f14/qa-contract.md
3. Inspecione o código real em:
   - src/scripts/shorekeeper/combat-vfx-liberation.mjs
   - src/scripts/shorekeeper/combat-vfx-shaders.mjs
   - src/scripts/shorekeeper/combat-vfx-events.mjs
   - src/scripts/shorekeeper/fidelity-rest-frame.mjs
   - src/scripts/shorekeeper/fidelity-camera.mjs
   - src/scripts/shorekeeper/r62-integration.mjs
   - src/scripts/shorekeeper/r61-plan.mjs
   - src/scripts/shorekeeper-sk-lab.mjs
   - src/pages/experimentos/sk/index.astro
4. Inventarie as dez imagens de referência (201995, 201990, 201997, 201991, 201992, 201986, 201999, 201978, 201996, 201988.jpg), os vídeos originais e o GLB privado F2.0-A **somente se acessíveis de forma autorizada**. Calcule hashes e registre ausências. Arquivos de outro chat/serviço NÃO atravessam automaticamente; não invente acesso. Não publique mídias privadas no GitHub ou em artifacts públicos.
5. Registre baseline do modo F3 atual, do modo ARTÍSTICO G11.3 e do perfil azul-branco FIDELIDADE.

## 1. Objetivo e limites de escopo
Isto é **F1.4 — Visual Fidelity & Study Presentation**, NÃO F4 nem introdução de movimentos novos.
Entregar melhoria visual comprovada na pequena borboleta, estudo cromático reversível e apresentação longa para observação.
Não implementar Unbound Form, Illation, Discernment ou novo Basic.
Não editar arquivos de animações originais, GLB, rig, morphs, pesos de skin, três idles, expressões R5/R6, F1 Root BODY, música gating ou câmeras F2 sem prova de defeito.

## 2. P0 — Diagnóstico da asa ocultada pela cabeça
No quadro 201997, uma porção da borboleta de energia junto à mão some sobre a cabeça/cabelo; a referência 201991 mostra composição com dedos, rosto e asas claramente legíveis.
O código combina depthTest:true, depthWrite:false, a máscara faceMask() e uFaceR≈0.14*h. Não assumir que a máscara, e não a oclusão 3D real, é a única causa.
Faça comparativos A/B em um harness PRIVADO com o modelo e câmera reais, no mesmo relógio:
A. baseline; B. desativar só máscara facial; C. desativar só depthTest (QA APENAS); D. ambas desativadas (QA APENAS); E. pequena alteração de enquadramento/offset de borboleta.
Documente qual mecanismo recorta qual parte da asa, em 16:9, 9:16, close e ¾.
Corrija minimamente (priorizar máscara seletiva/perspectiva/câmera). Não deixar efeitos atravessarem a cabeça permanentemente. Remova toggles de diagnóstico da produção. Preserve silhueta, trajetória, flap, cor e venação aprovados.

## 3. P1 — Stellarealm: estudo de azul, violeta e dourado
O modo FIDELIDADE zera explicitamente pesos de violeta e dourado em liberationColorScore; a G11.3 mantém essas cores. Isso foi uma escolha editorial exagerada, não uma prova de que a paleta dourada/violeta seja falsa em todos os eventos.
Preserve os perfis históricos:
- ARTÍSTICO G11.3: inalterado.
- FIDELIDADE azul-branco de referência: inalterado e identificável.
Crie STUDY_COLOR (opt-in, somente laboratório) com variantes BLUE, VIOLET, GOLD e transição expositiva reversível; reutilize materiais, buffers, shaders e timeline. Vincule seleções a controles de usuário e estados explícitos, não a mudanças de habilidade canônica por elapsed-time.
Não apresentar Outer/Inner/Supernal como cores: estágios exigem eventos de End Loop/Intro. Se a referência indicar violeta ou dourado em um evento, registre timecode e nível de confiança.
Garantir bom contraste, evitar tela branca persistente e manter leitura corporal e borboletas.

## 4. P2 — Apresentação de estudo longa
Criar STUDY_PRESENTATION com duração configurável de aproximadamente 60–90 segundos.
Manter cada clip PSA ORIGINAL em velocidade 1x; não reescrever curvas nem simular uma sequência gameplay canônica.
Inserir tempo com intervalos contemplativos, idles originais, movimentos de câmera de apresentação, e hold do Stellarealm de 15–25 segundos (marcar na interface e vídeo como EXPOSITION_HOLD_NOT_CANONICAL_DURATION). O campo pode persistir esteticamente em exposição, mas nunca promover automaticamente Inner/Supernal nem reproduzir Discernment sem evento original.
Reutilizar relógio, câmera, rendering loop, controle de ownership, pausas, seek, recuperação, descarte e music gating atuais. Manter rotação curta F3 e Legacy disponíveis. Não multiplicar loops ou diretores, nem interceptar os intervalos S6 sem teste.
Adicionar UI compacta: modo CURTO/F1.4 ESTUDO, hold 15–25s, perfil de cor, retorno. Preferir menus simples a dezenas de controles.
Se inserção segura de hold exigir mudanças arquiteturais profundas, entregar modo de estudo por fases com evidência e declarar etapa não concluída, em vez de retimar o corpo.

## 5. P3 — Reconhecimento com disciplina epistêmica
Use reference-matrix.md como hipóteses, nunca como mapeamento certificado. Para cada imagem, registre OBSERVADO vs INFERIDO vs VERIFIED_SOURCE vs MOTION_MATCHED.
201995/201990: núcleo escuro / Illation candidato;
201997/201991: borboleta/mãos / evento Liberation candidato;
201992/201986: acrobacia / Basic exato desconhecido;
201999/201978: campo / estado e tempo desconhecidos;
201996/201988: borboletas / Chaos Theory ou Intro Enlightenment.
Só promova correspondência com vídeo contínuo, marcação de timecode e análise skinnada. Não declarar novos movimentos canônicos na F1.4.

## 6. QA real obrigatório
- Capturas reais do GLB F2.0-A e três idles: frente, ¾, perfil e celular.
- Testar oclusão por depth e faceMask separadamente; documentar a causa.
- Três MP4s privados, H.264 yuv420p faststart sem áudio:
  A_butterfly_mask_ab.mp4 — baseline versus F1.4 (inclui close e retrato);
  B_stellarealm_colorstudy.mp4 — BLUE / VIOLET / GOLD no mesmo frame;
  C_study_presentation_long.mp4 — estudo com 60–90 s, rotulado como expositivo.
- Node regressions, npm run check, npm run build, testes WebGL com shader real, pausa/seek/interrupção, 10 ciclos FID/STUDY/ART e descarte.
- Registrar draw calls, geometria, texturas, temporização GPU/CPU quando disponível; resultados SwiftShader NÃO equivalem a FPS reais Samsung.
- Arquivos privados ficam fora do repositório e de CI/artifacts públicos; fornecer por canal privado seguro.
- Se modelo ou navegador reais indisponíveis: VISUAL_QA_BLOCKED, sem alegar conclusão visual; não substituir por rig sintético sem rotulá-lo.

## 7. Entrega do trabalho
Continuar a branch e o PR F1.4 de handoff. Atualizar README e matriz com resultados verificáveis, manter qa-contract, adicionar código e testes estritamente necessários, sem merge.
Registrar BEFORE/AFTER, causa confirmada da asa, perfis cromáticos, duração real do estudo, links privados dos 3 MP4s quando efetivamente produzidos, resultados de testes e limites remanescentes.
Aprovação por componente: mask/occlusion, colors, long study, regression, privacy, visual acceptance. Mantenha G7 NO_GO e CANONICAL_PENDING; aprovação final é do proprietário.
**Não iniciar F1.5, F4 ou novos ataques sem autorização.**
