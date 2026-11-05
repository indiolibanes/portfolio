# SHOREKEEPER R6.1 — Convergência cinematográfica experimental

Status: **R61_AUTHORIAL_PREVIEW_SOURCE_MAPPING_PENDING**. Feature flag `?r61=1`, somente com modelo canônico e sete clipes privados originais.

## Missão da versão
É uma evolução integrada do laboratório: em vez de microcorreções dispersas, constrói uma apresentação contínua e inspecionável com uma única trilha corporal, um único relógio de apresentação, câmera temporal própria, VFX R5/Outer e retorno ao Idle01.

**Caminho completo:** `SK_ATTACK_01` → `SK_ATTACK_02` → `SK_ATTACK_03` → `SK_ATTACK_L02` → `SK_SKILL_01` → `SK_BURST_02` → `SK_IDLE_01` (todos `_ORIGINAL`). O segmento L02 é apenas candidato a Heavy Attack; Skill01 e Burst02 também não são identidade de gameplay certificada. As sete curvas de origem são preservadas; transições por crossfade de pesos, **autorais**, sem retiming dos clipes nem inserção de sourceFrame inventado.

## Direção de câmera e campo
A sequência usa nove pontos de câmera interpolados suavemente, alternando enquadramento integral, ¾ de combate, aproximação do rosto e abertura para cobertura Outer; corrige a distância em retrato estreito. Mantém um único proprietário de câmera via `claimCameraOwner`, captura/restaura o preset anterior e devolve OrbitControls ao usuário em conclusão, interrupção, troca de perfil ou descarte.

Os VFX usam os estados já existentes: AMBIENT → PREPARATION → STELLAREALM → RESONANCE_PEAK → STELLAREALM → RECOVERY → AMBIENT. Esses cues são relativos ao início/fim do clipe de Burst02 e da recuperação, **não** são markers extraídos do PSA nem timestamps equivalentes aos GIFs. Toda a coreografia usa o RAF já existente, sem setInterval, requestAnimationFrame extra ou segundo mixer.

## Restrições de fidelidade
A auditoria Work R6.0.8 comunicada pelo usuário relata 10/10 fontes, 23 traces e 7.661 avaliações com palmas/vértices skinados a até 240Hz, sem B1 sustentada. Nesta execução **não houve acesso aos traces ou GLBs privados**, de modo que o status de B1/HA/RS/Ult permanece não certificado. A câmera, a sequência e o Stellarealm são propostas autorais claramente rotuladas, não reprodução exata do jogo. Não foi criada pose de mãos em concha, nem landing canônica. Identificação de `cutscene moves.gif`, sourceFrame PSA, alias de yaw, shader do jogo e mobile GPU continuam PENDING.

## QA e operação
- Prévia: `/experimentos/sk/?r61=1` em uma branch preview autenticada.
- Exige modelo canônico e os sete clipes; não reproduz uma sequência incompleta nem cai silenciosamente no Burst isolado.
- Desativação: remover `r61=1`; todo o runtime anterior permanece funcional.
- Pausar, velocidade, interromper, buscar no timeline e reiniciar reutilizam os controles existentes.
- `prefers-reduced-motion` desliga a câmera cinematográfica e não reproduz automaticamente.
- Ao iniciar `sourceQA` ou trocar modo, o diretor R61 libera corpo/câmera; nenhuma alteração em assets ou modelo.
- Testar CPU total/render, GPU queries opt-in, 16:9 e 390×640, WebGL2 real, 600s Samsung e três ciclos físicos antes de aprovação.
- Após seek, composição de VFX/transientes não é garantida bit a bit; câmera e corpo usam tempo absoluto, VFX continuam preview visual.

## Gate para R6.2 / R7
Revisão visual da abertura B1 ausente, enquadramento, eventuais saltos no crossfade entre L02/Skill/Burst e contato real dos pés. Se houver incompatibilidade artística, manter R6.1 como laboratório separado e retornar à base #255 sem mesclar. A construção de uma sequência de gameplay canônica depende de fontes/markers certificados ou autorização explícita para adaptação autoral.

Não modificar `main`, Hsin, Phrolova, Sophia, R2/Access/Cloudflare nem arquivos protegidos.
