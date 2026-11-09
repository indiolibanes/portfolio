# F1.4 — Contrato de aceitação

## Gate A — segurança e preservação
- F1 BODY Root em Burst01/Burst02 inalterado; clipes originais, GLB, pesos, morphs e 3 idles não editados.
- Face R5/R6, piscada, G11.3 ARTÍSTICO, gatilho pequeno F2 e câmeras F2/F3 mantidos salvo correção visual comprovada.
- G7 segue NO_GO; canonical status nunca é promovido por resultado sintético.
- PR draft empilhado sobre #285, sem merge nem edição de main ou Hsin.
- Sem materiais privados no GitHub, Actions, logs ou Cloudflare público.

## Gate B — diagnóstico da asa
- Captura real, frame a frame em câmera F2 onde a asa desaparece.
- Varredura **somente em QA**: baseline; facial mask desligada; depth-test desligado; ambos desligados; ajuste de câmera; eventual ajuste mínimo de offset.
- Indicar se o problema é máscara, depth buffer, ambas ou outro; retirar flags de depuração da entrega.
- Comparar frontal, ¾, perfil, 16:9 e 9:16; mão/rosto/asa completa legíveis quando geometricamente possível.
- Não tornar a asa permanentemente visível através do crânio; escolher correção editorial/câmera se oclusão real.

## Gate C — perfis cromáticos
- Perfil FIDELIDADE azul-branco da fonte específico permanece selecionável e pixel/data-regression quando possível.
- ARTÍSTICO G11.3 mantém seu baseline.
- \`STUDY_COLOR\` explícito e reversível oferece BLUE, VIOLET, GOLD e opcional transição.
- Não promover Outer/Inner/Supernal ou terminar campo por elapsed time/hue.
- Mesma câmera/instantes para comparar saturação, legibilidade e cor.

## Gate D — apresentação longa
- Duração do estudo configurável aproximadamente 60–90 s; sem retime de uma única curva original.
- Campo demonstrativo por 15–25 s com etiqueta \`EXPOSITION_HOLD_NOT_CANONICAL_DURATION\`.
- Preservar pausa, seek, interrupção, return-to-idle, música gating e lifecycle.
- Uma única câmera/renderer/RAF/clock de apresentação; sem montar Intro/Discernment fictícios.
- Ao finalizar, estado e recursos restaurados, sem duplicar campos/ciclos S6.

## Gate E — validação material
- \`npm test\` ou comando de teste do repositório, \`npm run check\`, \`npm run build\`, diff check.
- Testes WebGL com GLB real e shaders (não somente Node/sintético); métricas de geometrias, texturas, draw calls, CPU/GPU se disponível.
- Dez ciclos de alternância (F3 / ESTUDO / ART) sem crescimento; contexto perdido/restaurado.
- Distinção entre SwiftShader, GPU real e Samsung Internet; 60 FPS não pode ser afirmado sem medir.

## Entregas visuais privadas (obrigatórias)
1. \`A_butterfly_mask_ab.mp4\`: F3 → A/B diagnóstico → F1.4, closes da mão/rosto e 9:16.
2. \`B_stellarealm_colorstudy.mp4\`: BLUE / VIOLET / GOLD mesmos frames, exibir perfil e estado de campo.
3. \`C_study_presentation_long.mp4\`: ~60–90 s, música ausente/silenciosa permitido, holds expositivos rotulados.

H.264 yuv420p faststart, sem áudio, evidência privada. Não fabricar link e não declarar vídeo pronto sem verificar o arquivo. Se sem GLB ou browser, relatar \`VISUAL_QA_BLOCKED\` e não aprovar merge.

## Resultado exigido
Emitir PASS / CONDITIONAL PASS / FAIL separadamente para: oclusão; cromatismo; estudo longo; regressões; recursos; segurança; fidelidade canônica. Nunca usar um PASS global de testes para encobrir um FAIL visual.
