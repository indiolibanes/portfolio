# Shorekeeper F2.1 B+C — Work R3

**VISUAL_QA_PENDING. B e C não estão artisticamente concluídos.** A implementação integra os candidatos faciais, ambiente, VFX e combo numa única rota. Nenhuma aprovação humana, de GPU ou Samsung é inferida de testes em CPU. Nenhum merge foi executado.

## Auditoria das entradas

| PR | Head auditado | Base | Resultado |
|---|---|---|---|
| #228 | `bf0353f13c4c94d20b60cc6bb11ba3e5b0166b48` | `experiment/shorekeeper-bc-mouth-forensics-20261103` @ `95f6fc8` | draft, checks verdes, base facial/CL preservada |
| #229 | `75cf2ae49e756dc62131fe2ce0fbe5741a5304b0` | `experiment/shorekeeper-bc-c-reference-audit-20261103` @ `c6986ee` | draft; Portfolio build falhou por Node 22.23.3; Astro exigiu >=22.23.4 |
| #230 | `a36c8513efcaea511da5fc1bcd96ccda411b0cdc` | mesma base do #229 | draft, checks verdes; VFX R2 selecionado |

A comparação por bytes confirmou `combo-sequencer.mjs` e seu teste idênticos em #229/#230. Há uma única cópia no runtime final. Os três PRs históricos permaneceram intactos. A integração é materializada sobre a `main` auditada `839fca45224154c2eca98d1b47e0d3faa42079b0`; arquivos alheios à Shorekeeper seguem essa revisão. Foram preservados auth/R2, cabeçalhos e reorganização pública de assets. A configuração experimental duplicada de `allowedHosts` foi excluída. Node 24 é o major usado nos checks locais, fixado em `.node-version`, evitando a versão incompatível observada no #229.

## Boca

`mouth-r3.mjs` é opt-in: `?mouthQA=1&mouthR3=1`. Ele usa uma cópia da geometria Face, interpola deltas com tangentes contínuas e aplica o campo também aos parceiros originalmente deslocados. A espessura candidata é 28% da seção neutra; a compensação de profundidade é limitada. Não altera material canônico, fonte GLB, ossos, tracks ou E_Close. Restore/dispose recupera a geometria original.

Comparações disponíveis: geometria canônica (sem flag), solda R2 (`mouthR2=1`) e candidato R3; pesos 0/.25/.5/.75/1; frontal/¾/perfil; LITTLE_SMILE_V2 e MY_STAR_V2 mantidos como bases. MY_STAR R3 oferece E_Smile=0 e .1; HELLO oferece fechada e entreaberta. A análise temporal de hello.gif não resolveu a abertura com confiança suficiente. LOVE/HOPE/HELLO e aliases existentes não foram promovidos nem unificados; B07 continua bloqueado.

**Risco visual pendente:** linha fina pode ficar subocluída no perfil; o liner não recebe a extensão artificial da R2. Exige render padronizado antes de aceitar espessura, profundidade ou ganho. Não há prova R3 de eliminação completa dos artefatos.

## Ambiente e VFX

R3 é o perfil padrão do candidato integrado; `?vfx=r2` conserva o perfil de comparação de efeitos. R3 estende o mesmo diretor R2 e reutiliza relógio, buffers, estados e descarte. A comparação R2 recebe os limites de partículas corrigidos e a correção comum de instanciamento; seu head histórico é a referência exata da Rodada 2.

A cena R3 adiciona céu procedural, velos cromáticos, horizonte, solo em perspectiva e ruínas distantes instanciadas. Esse cenário continua presente em OFF. O botão **Campo e céu · vista celestial** enquadra a composição ampla; os anéis foram reposicionados para esse campo visual. A qualidade monumental/convincente não foi demonstrada neste ambiente.

Borboletas usam InstancedMesh, atlas original com pontas inferiores mais longas e mistura normal para preservar cor. As duas asas sobem juntas. O painel `?vfxQA=1` permite exemplar 0°/45°/90°, aberto/meio/fechado, modos FIELD/CANOPY e tintas. Core ganha octaedro e cage coloridos; flare reduzido, depthTest ativo e escala sem duplicação do tamanho da personagem. A leitura das mãos/rosto e a saturação dependem de inspeção real.

| Perfil | Borboletas | Core | Estrelas + motes |
|---|---:|---:|---:|
| Desktop | 18 | 40 | 250 + 70 |
| Android | 8 | 12 | 90 + 20 |

Até 13 draw calls adicionais estimadas no perfil completo, incluindo três do cenário; não medidas por renderer aqui. Sem bloom, raymarching, loop de partículas ou pacote externo de assets. A narrativa opcional de 18 s é autoral e manual, independente de combate; sua câmera é opt-in e devolve configuração e controles ao terminar/parar. Reduced motion congela o cenário e exclui Core; não inicia narrativa. Outer/Inner/Supernal continuam **STAGE_REFERENCE_UNVERIFIED**. Não há aprovação do gate C07 nem markers fictícios de Liberation.

## Animação e combos

Um lease por modelo impede concorrência de diretores de corpo. Idle, gesto e combo liberam o mixer antes da troca. O sequenciador usa ações independentes mesmo quando o mesmo clip aparece duas vezes; seek e endpoints não fazem wrap, pausa e velocidade são testadas. A face continua com owner separado, sem VFX escrever em rig/morphs/mixer.

`?comboQA=1` disponibiliza BasicAttack1–4 → Skill01 (se carregada) → Burst02 → recuperação Idle01. Sem os quatro ataques, o fallback é explicitamente informado. Os quatro BasicAttack originais foram recuperados e amostrados privadamente em CPU. Bibliotecas avançadas continuam aceitas pelo contrato existente; não foram reexportadas nem presumidas a partir de nomes.

O matching analisa uma cópia não renderizada do esqueleto e pontua orientação, posição, velocidade e contatos inferidos dos pés. Só cortes de recuperação dos ataques são elegíveis. Burst02 mantém entrada zero, duração completa e todos os tracks não-Root idênticos nas três variantes. Nenhuma variante Root foi escolhida como definitiva. A recuperação usa blending para Idle01; **não foi implementada uma aterrissagem física validada**. C04 permanece pendente; contato inferido não substitui vídeo de pouso. Sem IK pesado ou correções no GLB canônico.

## Evidências e validação

O pacote de transferência R3, parecer e matriz integral orientaram esta revisão. Foram inspecionadas as folhas privadas R2 de boca, Core e canopy, os vídeos/referências e hello.gif temporal. As capturas R2 continuam evidência de R2, nunca foram renomeadas como prova R3.

Local: npm ci, npm run check, npm run build; suíte Shorekeeper, F1.6, testes Hsin/performance e higiene de build; compilação dos conversores Python. `qa-r3-private.mjs` verifica hash do GLB, três idles, quatro ataques e Root A/B/C com os mesmos frames PSA. Seu parser omite texturas somente numa cópia em memória para analisar geometria/rig em CPU. Não é um render.

O navegador de QA abriu a rota, mas `canvas.getContext('webgl2')` não disponibilizou contexto. O fallback e os controles desabilitados foram conferidos, sem erro da aplicação após a correção de um seletor CSS. Uma captura registra o bloqueio. **Nenhum render R3 SwiftShader, vídeo R3, teste de GPU, Samsung Internet ou context-loss real foi produzido.** Não foi instalado outro navegador para simular uma aprovação.

O relatório privado distingue uma simulação de 18.000 updates/600 s de tempo de cena de uma sessão de navegador de 600 s. CPU média/p95 não incluem rasterização. `gpuTiming=NOT_MEASURED`. Sem alegação de FPS ou VRAM. A estabilidade prolongada em GPU/dispositivo segue pendente.

A matriz `shorekeeper-r3-approval-matrix.csv` mantém os 27 gates originais e uma coluna de aprovação humana sempre PENDING. CI remoto deve ser lido no draft integrado; checks verdes autorizam apenas o gate estrutural correspondente.

## QA necessário antes de promoção

1. Em GPU, abrir o GLB privado e as bibliotecas de combate. Não adicionar esses arquivos a public/, git ou CI público.
2. Registrar a boca nas três geometrias, mesmos pesos/câmeras e escala móvel, com blink/retorno e crop. Decidir HELLO e a variante E_Smile.
3. Registrar exemplar 3×3 e voo ≥3 s; Core nas cinco fases; FIELD e CANOPY em plano único com personagem e cenário, frontal e ¾. Comparar com as referências privadas.
4. Registrar Root A/B/C nos frames PSA listados no relatório privado e vídeo frontal/topo; combos com pés/pelve visíveis, recuperação e pouso.
5. Em Samsung Internet real e GPU desktop, executar 600 s, offscreen, bfcache, pause/resume, perda/restauração de contexto e repetidos load/dispose; registrar renderer.info e draw calls reais.
6. Aprovação visual humana explícita antes de unificar aliases ou considerar B/C concluídos. Manter os drafts enquanto isso.

Wuthering Waves e Shorekeeper © KURO GAMES. Experiência independente e não oficial; nenhum asset privado está incluído no build ou neste relatório público.
