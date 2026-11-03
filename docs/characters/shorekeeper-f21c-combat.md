# Shorekeeper F2.1-C · combate original

Estado: **candidato estrutural / VISUAL_QA_PENDING**. Nenhum arquivo de jogo acompanha o código. A conversão usa apenas arquivos privados informados pelo usuário e é recusada dentro do repositório. O modelo F2.0-A permanece intacto.

## Conversão e limites

`python3 scripts/shorekeeper/convert-combat.py DIRETORIO_PRIVADO MODELO_CANONICO.glb DIRETORIO_DE_SAIDA_PRIVADO`

O manifesto é conferido antes da leitura ActorX; o hash do modelo canônico é `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`. Hierarquia e bind PSK/GLB foram comparados (erro máximo de componente 0 na execução privada). Cada par contém 243 bones; o rig do modelo contém 249. Todos os bones ponderados do PSK estão presentes nos PSA.

| Par | Corpo: quadros / FPS / segundos | Rib: quadros / FPS / segundos | Propriedades móveis compartilhadas |
|---|---|---|---|
| 01 | 110 / 30,2752 / 3,6333 | 109 / 30,2778 / 3,6000 | 0 |
| 02 | 173 / 30,1744 / 5,7333 | 173 / 30,1744 / 5,7333 | 0 |
| 03 | 117 / 30,2586 / 3,8667 | 117 / 30,2586 / 3,8667 | 0 |
| 04 | 181 / 30,1667 / 6,0000 | 181 / 30,1667 / 6,0000 | 0 |

A composição é **por propriedade**, não por nome de bone: canais animados vêm da fonte que os move; quando ambos são estáticos, a escolha provisória usa Rib para `Bone_*` e corpo nos demais. O conversor aborta se ambas as fontes moverem a mesma propriedade. Em todos os pares, `Root.rotation` pertence a Rib e `Root.translation` ao corpo. A matriz completa é gerada localmente para cada par. Não há canais de morph. Esses critérios eliminam escrita simultânea; **não provam a intenção artística ou correção visual da composição**.

Cada fonte usa seu próprio relógio e keyframes, sem reamostragem ou otimização. O último quadro é sustentado por um intervalo de amostragem, como na conversão F2.0-A. Em Attack01, Rib termina antes e mantém seu último valor; essa hipótese temporal precisa de inspeção, pois os arquivos têm durações diferentes. Root motion é preservado; Attack02 e Attack03 têm deslocamentos significativos em `Bip001`, por isso saltos ou enquadramento seguro não estão aprovados.

O arquivo de cada ataque contém a versão composta e as versões corpo e Rib para comparação privada. Todos são **candidatos**, não assets de distribuição. `createCombatDirector` usa o diretor existente, apenas um clip por vez e `LoopOnce`; a entrada e a recuperação são separadas do tempo original. Ele exige avanço por um loop central e não altera morphs. Não acoplar outro mixer simultâneo ao mesmo rig.

## Reprodução e verificação

`node tests/shorekeeper-combat-private.mjs MODELO_CANONICO.glb DIRETORIO_DE_SAIDA_PRIVADO`

A leitura Node usa GLTFLoader/Three.js e simula a decodificação das imagens; não é aprovação WebGL. O teste verifica canais, pausas, exclusão mútua, recuperação e descarte. Verificar separadamente gestos, dedos, saia, cabelo, root e corpo/Rib no WebGL e em Android antes de afirmar fidelidade.

## Contrato para música futura

Estados reservados: `NO_MUSIC`, `PLAYER_READY`, `PLAYING`, `PAUSED`, `BUFFERING`, `ENDED`, `UNAVAILABLE`. Somente `PLAYING` confirmado por um provider poderá solicitar combate numa fase futura; pausa ou fim devem aguardar recuperação antes de contemplação. Nenhuma integração musical ou sincronização existe nesta fase.
