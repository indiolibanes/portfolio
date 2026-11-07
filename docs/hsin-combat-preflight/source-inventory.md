# Fontes e escopo da evidência

Revisão de main em 07/11/2026: `13444422ea811bf7d4ca1d99c3e56a19dbe05f8e`. A solicitação partiu de `3523ce449d74a0b6aca2c0d1d2215dddc6121bad`. Todos os índices deste diretório pertencem exclusivamente ao GLB cujo hash começa em 63506b0b.

| Fonte primária no repositório | O que governa | Uso no próximo Work |
|---|---|---|
| public/assets/models/hsin/hsin-v2.0.glb | 9.873.744 bytes, 1.463 nodes, 9 malhas skinned, zero clips | Verificar SHA completo pelo teste. As nove instâncias referenciam skin 0 (823 joints). Skin 1 (498) não é referenciada por elas. |
| docs/hsin-v2-asset-report.json e docs/hsin-v201-material-audit.json | Inventário nominal de texturas/dimensões, normais e materiais por submalha | O campo joints lista as duas contagens. Normais-base e mapas normais preservados, deltas de normais congelados. Bounds do perfil são em espaço do modelo. |
| src/data/hsin-v21-pose.json e hsin-v201-acting.json | Pins do perfil cinematográfico e de atuação | Conferir hash do modelo e do perfil antes de aceitar trajetórias. Lip Touch e Hair Caress têm validação geométrica, com oclusão do olho pela esquerda ainda em revisão. |
| src/scripts/hsin-stage.ts, hsin-stage-config.mjs e hsin-stage-loop.mjs | Carregamento, OrbitControls, limite de pixels e loop | O carregamento usa versão no URL e AbortController. O loop consulta controles, avança a simulação e desenha. No descarte, cancela rAF, desfaz bindings, coleta por identidade, libera texturas, geometrias, materiais e skeletons. |
| hsin-body-repertoire.mjs, hsin-baked-pose.mjs e hsin-lip-hair.mjs em src/scripts | Direita Signature/Lip Touch, esquerda Chest/Hair Caress e composição | Um ator por cadeia. As amostras são quaternions locais absolutos; restore usa o repouso da trajetória. O gesto contextual conserva a prioridade do árbitro ocular. |
| hsin-face-acting.mjs, hsin-face-binding.mjs e hsin-face-skin.mjs em src/scripts | Máquina temporal, snapshot, gaze calibrado, aplicação final e iluminação | Usar sinal de intenção. Nunca escrever no array de influências por fora. |
| hsin-dance-director.mjs, hsin-dance-reverie.mjs e public/assets/animations/hsin | R2 por frases; R3 conservadora e grand opcional | Bake R2 para pés e amostras; estudo R3 para cabelo/mangas/cauda. A reverência autoral não documenta ataque. |

## Referências do jogo

- Notas oficiais 3.7, papéis Electro/Rectifier, Unison e Electro Flare. [Kuro Games](https://wutheringwaves.kurogames.com/en/main/news/detail/5571)
- Prévia de gameplay publicada com autorização da Kuro. Amostragem visual independente no relógio do próprio vídeo, inclusive quadros nos segundos inteiros 45–57 e 78–87. A montagem contém Suoming, troca de ator e cortes de câmera. Os intervalos na planilha identificam amostras, sem delimitar o primeiro/último frame de cada habilidade. [Shuhei Yoshida, 03/09/2026](https://x.com/yosp/status/2095346086382866654)
- Índice de vídeos da personagem. O showcase de combate e o curta narrativo são obras distintas. [Resonator Videos — Hsin](https://wutheringwaves.notion.site/Resonator-Videos-Hsin-508ef7f91e4b836cacd001046e308320)
- Descrição textual de condições de Formshift, Mechanism Dominion, entradas alternativas dos modos e saída da raposa. Serve à nomenclatura e à lógica de jogo. [Ficha do kit](https://wuthering.gg/characters/hsin)

## Transferência metodológica da Shorekeeper

| Evidência no repo | Contrato transferível | Calibração exclusiva da Hsin |
|---|---|---|
| scripts/shorekeeper/convert-idles.py, verify-idles.py; docs/characters/shorekeeper-f20a-animation-contract.md | Três pares de idles ActorX validados por manifest, nome, pai, bind e continuidade de quaternion. Calcular atividade TRS e compor BODY/RIB em um writer por propriedade. | Não há PSA/PSK/FBX Hsin autorizado nesta base. Não executar conversor com o GLB Hsin. Uma futura via FBX precisa medir unidades, eixos, pre/post rotations, bind e orientação de raiz em separado. |
| Mesmo contrato, §3 | Trilhas constantes também podem definir repousos distintos. Rejeitar dois canais móveis concorrentes. | 243 bones, 729 propriedades e Rx(−90°) descrevem os pares Shorekeeper. Usar inventário e matrizes Hsin, sem importar índices nem offsets. |
| docs/characters/shorekeeper-r6-morph-atlas.json e shorekeeper-r6-approval-lock.md | Congelar aparência aprovada, pesos, câmera, luz e comparação com blink | Receitas e materiais próprios; preservar as seis influências-base não nulas do rosto. |
| docs/characters/shorekeeper-r606-correspondence.csv | Rotular candidato separadamente da identificação de uma habilidade. Exigir alinhamento temporal e âncora espacial | A ausência de clipes implica bake autoral ou bloqueio de fidelidade. Root e Pelvis precisam de testes distintos. |
| tests/shorekeeper-r62-s5-g113-parity.test.mjs; docs/characters/shorekeeper-f21c4-burst-liberation.md | Trigger único, fases com cancelamento, campo e finalizador distintos, câmera contínua e prioridade ao usuário | Anéis, mecanismos e pilares Hsin. Não portar borboleta, amplo raio do Stellarealm, trajetórias ou velocidades G11.3. |
| docs/characters/shorekeeper-r5-device-protocol.md e shorekeeper-private-canonical-model.md | Separar testes geométricos, capturas WebGL e aparelho real; conferir integridade e autorização antes de distribuir | Versionar nesta rodada apenas documentação, testes e render do modelo público. Vídeo de referência permanece na origem. |
