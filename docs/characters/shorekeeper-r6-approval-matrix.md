# R6 — matriz de 35 gates

**PASS é técnico dentro da prova descrita. Não significa aprovação visual humana.** R7 não executado. Sonnet/Astra, hardware real e perfil humano continuam separados.

19 PASS técnicos · 6 PENDING_EVIDENCE · 10 NOT_APPLICABLE.

| Gate | Status técnico | Prova / limite |
|---|---|---|
| R6-01 · Preflight heads, bases e CI | PASS | PR236 f3b0c08; PR235/236 já merged; base original restaurada sem mudança de conteúdo. CI do head R6 a398667 verde; structural do base236 observado in_progress. |
| R6-02 · Perfil exato da aprovação humana | PENDING_EVIDENCE | Receitas/geometrias congeladas. Pacote não identifica câmera/material/geometria/idle da sessão de aprovação: APPEARANCE_PROFILE_UNVERIFIED. |
| R6-03 · V2 imutável no mesmo perfil | PASS | 70 streams exatos e 1050 PNG byte a byte idênticos nas condições controladas; tolerância zero. Não resolve R6-02. |
| R6-04 · Owner ocular e blink | PASS | Lease Face/Eye em todas as entradas; E_Close composto uma vez; timings .13/.08/.20 testados, pedidos de HOPE separados. |
| R6-05 · Atlas completo por mesh | PASS | 97 instâncias/83 nomes, 249 ossos; 1455 PNG, 97 contacts, métricas geométricas/pixels e gráficos. Down/Alpha excluídos. |
| R6-06 · Brow verificável | PASS | Deltas da faixa de sobrancelhas e renders 0–1; candidatos usam .08–.18. Delicadeza artística aguarda Sonnet/autor. |
| R6-07 · C_* somente com prova | PASS | C_Z documentado como composto bochecha/queixo/rosto inferior; não é músculo isolado. |
| R6-08 · Nariz/queixo sem invenção | PASS | P_Nose Up/Down: deslocamento vertical da ponta; C_Down_Face: superfície inferior. Não há nasal flare/wink/bochecha inflada inventados. |
| R6-09 · My Star V2 preservada | PASS | Peso literal, pico ocular .25, timing e pixels de cinco perfis preservados; candidato é ID separado. |
| R6-10 · Afeto crescente distinto | PASS | Intermediário .1 permanece separado; candidato pleno passa por .1→.25; três ângulos reais. |
| R6-11 · Little Smile e queixo | PASS | Pico assimétrico .9/.5, C_ZL .8; baseline original exato, candidato separado, vídeo temporal e três idles. |
| R6-12 · Olá fechado versus falado | PASS | HELLO_R2 selecionável e não alias do HELLO original com abertura; receitas inalteradas. |
| R6-13 · Ternura/Serenidade/Surpresa | PENDING_EVIDENCE | Pixels/receitas literais preservados; associação exata da aparência nomeada e aceite independente Astra ainda pendentes. |
| R6-14 · WORRIED sem linha oral duplicada | PASS | 180 provas: M_Ennui reproduz bordas; candidato usa boca neutra e mantém B_Sad1/E_Sad.7. Espessura do neutro e aceite artístico separados. |
| R6-15 · Olhar bilateral e range | PASS | Vídeo L(+X)/centro/R(−X)/neutro e cap vetorial .3; gesto .22. Frontal/45 mostram ambos lados; +90 é ocluído pelo capuz canônico. |
| R6-16 · Um writer, corpo preservado | PASS | Concorrência old/new/receitas recusada; combate bloqueia face; 9 replays dos idles com buffers/materiais/clipes/249 ossos preservados. |
| R6-17 · Range, overflow e NaN | PASS | 600s de comandos manuais simulados, canais finitos 0–1, cap de pupila, pausa, blink e inputs inválidos testados. |
| R6-18 · Restore/dispose e lifecycle | PASS | Três recargas UI e três ciclos privados completos; restore69 persistente/idempotente, contexto, offscreen e reduced motion no SwiftShader. Pós-combo pendente de bibliotecas privadas. |
| R6-19 · Privacidade do diff/build | PASS | Nenhum GLB/PSA/GIF/screenshot novo em Git/public/dist; políticas R2/Access e Hsin inalteradas; verificador estrito não relaxado. |
| R6-20 · R6 opt-in | PASS | Query facialR6=1, import dinâmico e UI escondida por padrão. Nenhum scheduler R7. |
| R7-01 · Eventos aprovados antes do scheduler | NOT_APPLICABLE | R7 fora desta etapa: não implementado nem ativado. Plano Opus e execução R7 dependem da validação R6. |
| R7-02 · Máquina de estados | NOT_APPLICABLE | R7 fora desta etapa: não implementado nem ativado. Plano Opus e execução R7 dependem da validação R6. |
| R7-03 · Não repetição | NOT_APPLICABLE | R7 fora desta etapa: não implementado nem ativado. Plano Opus e execução R7 dependem da validação R6. |
| R7-04 · Prioridade manual/combate | NOT_APPLICABLE | R7 fora desta etapa: não implementado nem ativado. Plano Opus e execução R7 dependem da validação R6. |
| R7-05 · Reduced motion e suspensão | NOT_APPLICABLE | R7 fora desta etapa: não implementado nem ativado. Plano Opus e execução R7 dependem da validação R6. |
| R7-06 · Cooldowns | NOT_APPLICABLE | R7 fora desta etapa: não implementado nem ativado. Plano Opus e execução R7 dependem da validação R6. |
| R7-07 · Blink no R7 | NOT_APPLICABLE | R7 fora desta etapa: não implementado nem ativado. Plano Opus e execução R7 dependem da validação R6. |
| R7-08 · RAF/mixer do R7 | NOT_APPLICABLE | R7 fora desta etapa: não implementado nem ativado. Plano Opus e execução R7 dependem da validação R6. |
| R7-09 · Samsung físico 600s | NOT_APPLICABLE | R7 fora desta etapa: não implementado nem ativado. Plano Opus e execução R7 dependem da validação R6. |
| R7-10 · Autoplay após aceite | NOT_APPLICABLE | R7 fora desta etapa: não implementado nem ativado. Plano Opus e execução R7 dependem da validação R6. |
| PUB-01 · Auditoria integral main→cadeia | PENDING_EVIDENCE | Diff R6 é delimitado e main preservada; não foi refeita auditoria independente de toda a cadeia histórica de 145 arquivos. |
| PUB-02 · Políticas reais R2/Access | PENDING_EVIDENCE | Proteções de código/testes preservadas; inspeção autenticada das políticas de produção não realizada. |
| PUB-03 · Direitos de publicação | PENDING_EVIDENCE | Nenhuma nova distribuição de asset; autorização de publicação e direitos continuam decisão do proprietário. |
| PUB-04 · Preview autenticado remoto | PENDING_EVIDENCE | Build CI/Cloudflare e fallback local passam; inspeção remota autenticada pelo proprietário ainda necessária. |
| PUB-05 · PR draft sem merge | PASS | PR238 draft sobre o head exato #236; sem automerge; main permanece 839fca45224154c2eca98d1b47e0d3faa42079b0. |

O pacote não encerra artisticamente a F2.1. Os 28 vídeos, atlas e interface estão prontos para refinamento Sonnet e auditoria Astra. Qualquer aprovação nova deve registrar expressão, receita, geometria, câmera, iluminação, GLB, intensidade e timestamp específicos.
