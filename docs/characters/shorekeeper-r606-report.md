# R6.0.6 / R7-C3 — SOURCE_MAPPING_PARTIAL / ULT_PENDING

Base verificada: #252 `195e755e841c49598d7f99eb4199c67690a77b96`, sobre #251 `e50daa986d789bdf03d1cd8e1b656d4f42473dbc`. Ambos abertos, drafts, sem merge; três workflows SUCCESS no head da #252. Ancestralidade local #248 → #249 → #251 → #252 confirmada. #250 permanece CLOSED/unmerged; `render-loop.mjs` preservado byte a byte, SHA `93d7483b5dcd2c9ecf95ca102c08a8d787661d8c8753008b3ad07c9f3e91d7a6`.

## Resultado implementado

`sourceQA=1` acrescenta inspeção **manual**, sem habilitar uma Ult canônica. O reprodutor usa um único mixer corporal, o dt do relógio de apresentação existente e os controles existentes de pausa/velocidade/interrupção. Seek aplica o tempo exato do clipe, sem fades ou cortes de motion matching. ORIGINAL, REBASED e ROOT_BODY_OWNED são comparáveis nas Bursts; outros candidatos usam ORIGINAL. Nenhuma variante é promovida automaticamente. Ao iniciar: restaura rig, desliga scheduler facial, cancela câmera/narrativa anterior e seleciona VFX OFF. Nenhuma câmera nova é animada. O endpoint fica disponível para inspeção; interromper restaura o bind, explicitamente **não** uma aterrissagem certificada. Reduced-motion não dispara reprodução automática. As rotas R2 e o modelo canônico continuam obrigatórios; nenhum acesso/asset privado foi alterado.

CPU total (`frameMetrics.cpuMs`) e CPU render (`renderMetrics.cpuMs`) têm janelas separadas de 512 amostras, com p50/p95/p99 calculados somente no relatório. O resumo `observed` agora distingue `cpuTotalMs` de `cpuRenderMs`. A correção #252 permanece: `stage.observeFrame(renderCpuMs,...)`; GPU query fica em `renderer.gpuTiming`, separada de ambas. Flags `gpuTiming=1` e `adaptiveDpr=1` continuam opcionais.

Preparação de motion matching agora cede após cada pose em vez de quatro, e decompõe a matriz mundial já atualizada uma vez por joint em vez de repetir atualização de ancestrais por getter. Nenhuma curva, frequência de amostragem ou regra de transição foi alterada. Teste compara posições/quaternions sob transformação do modelo com tolerância numérica de 1e-12. O cache existente e suas invalidações permanecem.

## Fontes e evidência reproduzida nesta execução

Os 13 hashes internos do pacote de transferência conferem. O ZIP privado R605 recuperado tem SHA `52ecd78268df39164dc2cd0473a7e5bc64b9f5a6e58a2f207849acb7ca468ad0`. **Esse ZIP não contém os GLBs** (há descrição imprecisa no prompt de transferência); os quatro GLBs estavam separadamente no diretório privado obtido na sessão autenticada anterior. Nesta execução seus tamanhos/hashes foram recalculados, o formato autossuficiente verificado e os dez clipes reavaliados em AnimationMixer. Não houve novo download ou alegação de sessão Access renovada. Binding EU e mecanismo autorizado R2 preservados.

Modelo: `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`; Basic: `2efd607ea7d47f9d43c67eb1e0da7bb08445acb63eed60b66296966bb6fd318e`; Advanced: `dfb8086c4c41cdc65a71ca5a9e8465e77f23cd2e50223cb5e79522d32363306a`; Burst: `984f7b58ae5b32560509834d75793fd298e51b49a2a062a4a7a7fba85b6fc35e`.

Foram produzidos novamente 16 traces privados: L02/Skill01 ORIGINAL × 30/60 e duas Bursts × A/B/C × 30/60, incluindo todos os tempos de keys. Solas: 32 vértices skinados por pé; floor/forward continuam a calibração geométrica de repouso da R605. O CSV público traz apenas endpoints e extremos numéricos, sem curvas. `motion-landmarks.mjs` identifica CLIP_START, máximo global de altura da pelve, mínimo global de distância entre mãos e CLIP_END. **Esses extremos não são HANDS_CLOSE, ASCENT, FIELD_REVEAL ou outros markers semânticos.** O mínimo global de mãos da Burst02 é próximo do endpoint, demonstrando por que não basta usar esse extremo como cue da Ult.

Os três GIFs e seus contatos foram confrontados com as poses da malha real. No GIF ingame há mãos próximas do peito; Burst02 também contém gesto no peito seguido de rotação/abertura, uma semelhança parcial. O GIF cutscene mostra rosto/ombro, abertura e plano de campo; Burst01 apresenta abertura/emissão, outra semelhança parcial. Isso não estabelece equivalência, continuidade de tomada, câmera original ou escala temporal. O GIF moves inclui varredura de braço/luz e rotação; não prova HA/RS. Não há referência rotulada independente de HA/RS neste pacote. A matriz mantém todos como QA manual; nomes e aproximadamente 575° não certificam habilidades.

Pacote privado R606 entregue separadamente: SHA `0e9a6d63f2aa1a4ed578067c21f72158d1fa1f4005270de73ba0535ad34b9a9d`; contém quatro traces novos e índices dos 12 traces Burst, idênticos aos já entregues na R605.

Comparativos privados: folhas A/B/C da R605 mantidas; 16 novas folhas frontal/perfil com câmera e iluminação iguais por vista, VFX OFF. Dois vídeos CPU da Burst02 ORIGINAL, 30 amostras/s, 640×360 e 390×640, com clipTime anotado, endpoint exato e uma exposição final de 1/30 s. Render diagnóstico de base color + iluminação simples; não é PBR/WebGL, captura do jogo ou validação de campo/canopy. Câmera fixa é deliberada para inspecionar corpo; não é storyboard cinematográfico aprovado. Nenhum GIF, render, vídeo, GLB, curva ou credencial vai para Git/CI/PR.

## Medições e decisão de direção

Detalhes por variante/taxa em `shorekeeper-r606-observations.csv`. Em ORIGINAL @60, Bip001: L02 +590,8856°; Skill01 −233,7885°; Burst01 −3,0913° (arco 3D 388,6213°); Burst02 +574,5622° (arco 3D 781,6173°). Os yaws são projeções do forward calibrado no mundo; start/end são valores principais em [−180°,180°], enquanto delta é desembrulhado. Não representam um yaw imposto à câmera/avatar. Pelve máxima em 0,2978723 / 1,3911391 / 2,3204420 / 1,7558943 s respectivamente. Mudanças de máximo entre variantes não são tempos canônicos de ápice: rebasing muda a geometria projetada no mundo.

As solas, elevação/descida e contato permanecem disponíveis quadro a quadro nos traces privados. Nenhum primeiro apoio de cena foi certificado. Não recalibramos o chão para forçar contato; cenas/piso métricos e PSA/conversor original continuam ausentes. `sourceFrame=null`, `sequenceTime=null` nos extremos; os GIFs têm seu próprio índice/tempo. Não foram criados timestamps canônicos nem retirado o giro de Bip001.

A rotina desejada 3 BA → HA → RS → Ult → Outer → variedade → colapso → recuperação → reinício segue **PENDING**. Nenhuma fase automática nova ou câmera/VFX cinematográficos foi ativada. O combo legado de quatro BA continua somente em `comboQA=1`, rotulado experimental. A narrativa VFX manual de 18 s continua uma demonstração autoral independente, não Liberation. Falta identidade/landmarks/chão para conectá-la honestamente. Sem Echo, troca, Inner/Supernal ou duração de campo supostamente canônica. Duo/Hsin permanece adiado.

## Performance, regressões e limites

Preparação em Node, modelo real e combo **legado** ORIGINAL, budget solicitado 6 ms: primeira observação antes do ajuste wall 506,78 / work 434,67 / maxUnit 22,45 ms; depois wall 409,04 / work 354,87 / maxUnit 17,24 / maxSlice 19,80 ms. Cache depois: wall 0,040 / work 0,018 ms. São execuções isoladas sob carga do ambiente, não benchmark estatístico, comparação mobile ou GPU. Unidades de clone/bind/finalização ainda excedem 6 ms: limite de preparação fria permanece PENDING, explicitamente sem garantia de ausência de jank. O novo modo fonte não executa motion matching.

169 testes Node PASS (incluem golden streams R6, R5 RAF, R604 clock, R605, hotfix #252 e quatro R606); `npm run check`, `npm run build` e `git diff --check` PASS. A revisão de código não altera Hsin, os baselines, a galeria aprovada, GLBs ou armazenamento.

Harness WebGL executado novamente no navegador: falha antes do primeiro frame, “WebGL2 indisponível”; checks vazios. Resultado de ambiente PENDING, não aprovação GPU. Nenhum número de CPU render/intervalo/GPU do dispositivo foi inventado. Loss/restore, três ciclos renderizados, enquadramento real WebGL, fidelidade artística, economia DPR e Samsung Internet 600 s permanecem PENDING. CI remoto do mesmo head será registrado no corpo do PR após execução, sem confundir verde estrutural com WebGL.

## Reprodução e rollback

1. Fora do repo, restaurar os quatro GLBs do fluxo autorizado e manifesto/calibração R605. Executar `node scripts/shorekeeper/audit-private-source.mjs PRIVATE_DIR CALIBRATION_JSON NEW_PRIVATE_OUTPUT_DIR`. Saída exclusiva e fora do checkout; parser não acessa rede/texturas.
2. Resumir cada trace com `summarizeMotionAudit` (helper de reprodução incluído no pacote privado). Os hashes identificam arquivos exatos. Calibração proxy é explicitamente obrigatória e não deve ser promovida a piso real.
3. Na prévia autenticada, abrir `/experimentos/sk/?sourceQA=1`, carregar acervo R2, selecionar candidato/variante. Comparar a mesma câmera frontal/¾/perfil; VFX OFF; velocidades iguais. Usar pausa/seek e exportar diagnóstico privado com câmera, fonte, relógio e métricas. Para GPU/DPR adicionar flags explicitamente. Após perda de contexto não iniciar nova carga sem checar estado.
4. Em Samsung físico registrar modelo, SoC, versão Samsung Internet/Android, viewport e temperatura; medir 600 s/3 ciclos apenas depois da correspondência aprovada. Exportar CPU total/render, intervalos p50/p95/p99, queries GPU suportadas e válidas, DPR/draws/geometrias/texturas. Testar pausa/offscreen/seek/interrupção/loss-restore/descarte. Query ausente/disjoint não é zero ms. Alvo mobile 30 FPS apenas se p95 de intervalo medido ≤33,3 ms; três ciclos de fixture não são três ciclos canônicos.
5. Rollback imediato: remover `sourceQA`, `gpuTiming` e `adaptiveDpr`, recarregar. Rollback integral: reverter o commit desta branch; #252 e sua correção DPR permanecem. Sem main/merge/deploy manual de produção ou alterações de Access.
