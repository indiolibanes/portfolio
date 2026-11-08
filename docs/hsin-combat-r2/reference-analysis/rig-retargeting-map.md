# Correspondência cinemática e rig

Fonte geométrica imutável: GLB 63506b0b7a2369722e6429c3b16c5f48764ee01706d1272b4ffd69a45c5e0d2c. As nove malhas usam a skin 0 com 823 joints. A matriz integral do preflight resolve nomes, pais, repouso local, FK mundial e índice de bind por skin. A skin de 498 joints não autoriza substituir a usada pelo player.

| Observação do vídeo | Canais usados na R2 | Conversão e limite adotados |
|---|---|---|
| Corpo abaixa antes de cruzar os braços | posição do container RIG-R2T1XinMd10011_LOD0_Skeleton e ORG/DEF Thigh, Calf, Foot, Toe0 dos dois lados | Deslocamento lateral autoral até 60 mm e vertical até −60 mm. Solver de apoio da Dance R2 executado offline, com ambas as solas apoiadas. |
| Tronco prepara num sentido e responde no outro | ORG/DEF Bip001Spine2, Neck, Head | Giro de torso autoral até 20°. Cabeça contramove até 8°. Valores do bake são decisões de animação, sem derivação de ângulos exatos de vídeo 2D. |
| Arcos alternados e gesto de emissão | ORG/DEF clavículas, UpperArm, Forearm, Hand L/R | Eixos mundiais do corpo; cada DEF recebe o delta mundial de seu driver relativo às duas referências, convertido pelo seu próprio pai. Eixo local do cotovelo/punho vem do perfil validado Signature/Chest. |
| Cabelo, mangas e cauda chegam depois do torso | 215 canais secundários da R3 | Nomes, eixos locais, profundidade e ganho da R3. Resposta limitada e amortecida por envelope, inteiramente pré-calculada. Ornamentos herdam pais existentes. |
| Boca/pálpebras reagem no close | binding facial existente | Overlays pequenos em E_Squint e M_Squint, B_Up_Add_R e sorriso L. Blink e gaze continuam no árbitro original. |
| Raposa, construções e câmera geram grande deslocamento aparente | nenhum retarget direto | Requer asset adequado ou decisão autoral separada. Sem estimativa de root por fluxo de imagem durante cortes/oclusão. |

A R2 possui 253 canais quaternion, incluindo pernas e secundários, e um canal de posição do container. Cada propriedade tem um proprietário efetivo durante o combate. Idle/dança cedem antes da aquisição. A câmera nunca escreve no modelo.

A primeira tentativa de recuperação por interpolação global produziu cerca de 4 mm de deriva dos pés. A candidata usa uma lattice offline de pernas, indexada por fase inicial e progresso de recuperação. O player interpola duas fases e duas amostras da lattice. Os demais canais usam slerp para o repouso. Não há solver/IK em runtime. O banco devolve o apoio sem repetir os ataques durante o cancelamento.
