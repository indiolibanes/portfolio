# Shorekeeper — G11.3/S5: ciclo cinematográfico autorizado

**Correção humana de 7/11/2026:** “rotação” se refere à **sequência cinematográfica G11.3**, não à rotação rígida da personagem no próprio eixo. A implementação R6.4.1 do pião foi rejeitada e removida.

## Contrato de apresentação do dueto

| Estado | Corpo e cenário | Face e controle |
| --- | --- | --- |
| Sem música | Idles 01/02/03 originais aleatórios desde o início; sem repetição consecutiva | Três famílias S6/R5 curadas aleatórias; R6 somente manual |
| Música confirmada | Carregar basic+advanced+burst autenticados se ainda ausentes; executar G11.3/S5, com Stellarealm unificado contendo Hsin e Shorekeeper | Face sai das expressões manuais durante combate; um único body owner |
| Sem música, inclusive comando manual | G11.3 bloqueada; somente idles/expressões | Nenhum botão de combate nem bypass |
| Pausa/movimento reduzido | Não consumir relógio do combate nem avançar efeitos | Sem novas expressões automáticas |
| Música interrompida | Interromper a apresentação automática e recuperar idle, sem trocar as curvas originais | Retorno controlado ao modo contemplativo |
| Dispose | Liberar score/VFX, mixer corporal, writer facial e cópias temporárias | Fail closed |

Ao longo da sequência, o director S5 combina ataques básicos, candidato Heavy Attack, Skill, Burst02 e recuperação. O campo **Stellarealm** é centrado no envelope unido das duas personagens. A câmera do dueto mantém o enquadramento combinado: não adota a câmera solo do laboratório SK.

## Fronteiras de fidelidade

Os clipes GLB são privados, conferidos por Access e SHA-256, e nenhuma habilidade é fabricada caso faltem. O mapeamento B1/HA/Burst/cutscene ainda é inconclusivo. G7 NÃO está liberado. A aprovação humana contempla o ritmo narrativo do G11.3 existente, não uma certificação de canonicidade dos movimentos.

## Fundo e pavilhão

A lua mantém o centro horizontal da câmera, elevada verticalmente (NDC +0,46) e 2,7–3,3× maior do que na revisão anterior, exclusivamente no dueto, com profundidade de fundo e sem escrita de profundidade; a esfera é desenhada antes dos personagens, portanto não os ofusca. O halo é desativado para evitar alpha overlay. O tamanho adapata a proporção do viewport no fit. O widget 3D se alinha à única fachada nativa HTML: não existe um segundo painel/visor deslocado; controles oficiais do YouTube/Spotify seguem operáveis.

**Pendente:** renderização visual autenticada, posicionamento em 390×844 e 832×384, QA móvel e GPU real, tempo de rede R2, clipping facial, stellarealm abrangendo as personagens durante a câmera em órbita. Nenhuma taxa de FPS declarada.
