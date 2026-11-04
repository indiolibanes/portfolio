# Shorekeeper CL.1 — Rotação da Liberation e inventário de VFX

**Status:** `ROOT_REBASE_IMPLEMENTED / VISUAL_QA_PENDING / VFX_ASSET_DISCOVERY_PARTIAL`. PR draft sobre C.4 (#214). O modelo canônico permanece F2.0-A e seus três idles e piscada não são alterados.

## Diagnóstico de rotação

A captura fornecida pelo usuário mostra a personagem inclinada em diagonal. O usuário relata balanço como um chocalho durante alguns segundos. A imagem estática sozinha não prova a causa temporal.

Inspeção direta dos dados privados (`PRIVATE_shorekeeper_f20a_original_idles.glb`; `SK_BURST_01_ORIGINAL.animations.glb`; `SK_BURST_02_ORIGINAL.animations.glb`):

| Canal/comparação | Burst 01 | Burst 02 |
|---|---:|---:|
| Ângulo do primeiro `Root.quaternion` vs pose canônica | ~176,9° | ~173,4° |
| Desvio máximo do `Root` em relação ao primeiro frame | ~0,507 rad | ~0,312 rad |
| Amplitude angular máxima do `Bip001` vs primeiro frame | ~1,124 rad | ~3,132 rad |
| Alteração de `Root.translation` | zero | zero |

Nos idles originais, o primeiro frame do `Root` coincide com o bind pose. Essa diferença inicial dos Burst pode ser uma causa da inclinação visual, **mas ainda não comprova erro da fonte, retarget ou intenção da cena**. O `Bip001` de Burst02 pode conter a rotação artística pretendida.

O código `liberation-rotation.mjs` gera, **apenas depois da importação local** das bibliotecas, uma variante derivada:
`q_rebased(t) = q_bind × inverse(q_source(0)) × q_source(t)`.

Esse rebase altera **somente** o canal `Root.quaternion`, com correção constante; conserva o avanço e as rotações relativas dos quadros, `Bip001`, materiais, demais bones, durações e clipes de origem. Mantém original e rebased simultaneamente para comparação A/B. IDs:
- `SK_BURST_01_ORIGINAL` / `SK_BURST_01_REBASED`
- `SK_BURST_02_ORIGINAL` / `SK_BURST_02_REBASED`

A correção não é automaticamente declarada canônica. Se a câmera/pose exigirem uma rotação longitudinal de corpo inteiro, sequenciar a câmera/pivô cinemático em fase posterior com os timestamps e capturas do jogo — **não eliminar as curvas de `Bip001` indiscriminadamente**.

## Teste A/B obrigatório

1. Importar o GLB privado canônico e as duas bibliotecas privadas Burst na rota `/experimentos/sk/`.
2. Na câmera fixa de corpo inteiro, reproduzir a versão original do Burst01. Capturar entrada, ápice, última pose e recuperação.
3. Repetir na variante `Burst 01 · eixo reancorado` sem mudar câmera nem FPS.
4. Repetir para Burst02. Observar se o giro pretendido foi preservado.
5. Verificar `Bip001`, cabeça, saia, fitas, transparência, root snapping e duração.
6. Confirmar que os três idles e a piscada continuam funcionando.
7. Em Samsung Internet, medir FPS, context loss e comportamento ao ocultar a aba.

Se a versão reancorada preservar o balanço ou produzir nova pose errada, classificá-la como `ROTATION_REBASE_VISUAL_FAIL` e não torná-la padrão. Se resolver a inclinação sem suprimir a rotação artística, classificar `ROOT_REBASE_CANDIDATE_PASS` e prosseguir à curadoria da câmera.

## Asset hunt — o que já sabemos

O RAR privado ActorX fornecido contém **532 PSA, 29 PNG, 1 PSK e 1 FBX**; não contém um pacote explícito de sistemas VFX, partículas ou modelos de borboletas. Entre os PNG há um material chamado **`T_StarrySkyNoise_D.png`**: sua aparência é uma máscara RGB com áreas verdes, pontos vermelhos/alaranjados e traços azuis, **não uma imagem final do campo estelar**. Esse recurso pode ser parte de um shader de efeitos, mas não há material/shader/fonte que confirme essa função. O GLB canônico inclui oito texturas difusas de personagem e não inclui esse PNG.

**Referências visuais e semânticas:** o jogo identifica a ultimate como `End Loop`, responsável pelo `Outer Stellarealm` (azul), `Inner Stellarealm` (roxo) e `Supernal Stellarealm` (dourado). As borboletas `Dim Star` e `Flare Star` aparecem no vocabulário visual de outras habilidades; não afirmar que o PSA Burst contém borboletas. Uma imagem promocional isolada não é prova da sincronização/posição real no campo de batalha.

### Próxima coleta

1. **Capturas de gameplay da ultimate**, com timestamps de anteposição, início do giro, máxima rotação, abertura do Stellarealm, persistência e retorno. Incluir câmera e avatar em quadro.
2. **Borboletas:** localizar sprite/modelo/textura confiável de asas, geometria e parâmetros de emissão, ou reproduzir em malhas simples originais e registrá-las como reconstrução artística, sem alegar extração autêntica.
3. **Campo estelar azul:** identificar textura dinâmica e material/shader, raio, bordas, ruído, densidade de estrelas e camadas volumétricas. Usar `T_StarrySkyNoise_D.png` somente após entender seus canais.
4. **Artefatos especiais:** linhas orbitais, filamentos luminosos, cintilação e bloom; priorizar alternativas de baixo custo sem render targets no Android.
5. **Proveniência:** guardar cópias privadas; no repositório somente contratos, referências de pesquisa e implementação independente autorizada.

### Sequência CL proposta (não implementada)

`PREPARATION → ASCENT → CONTROLLED_ROTATION → STELLAREALM_REVEAL → SETTLE → CONTEMPLATIVE_RECOVERY`.

A duração de cada fase precisa ser inferida de vídeo e/ou dados confiáveis; **não inventar marcadores temporais**. Bloquear câmera dinâmica, VFX e autoplay até haver storyboard comprovado. Se usar variantes de root, escolher por QA; o restante do movimento permanece original.

## Desempenho

Metas: 60 FPS, DPR adaptativo até 2, pausa offscreen, `prefers-reduced-motion`, um único loop. VFX devem ser instanciados/agrupados, sem pós-processamento pesado. Não aumentar largura da interface nem ressuscitar Inspection Studio.

**Merge:** sem alterações de `main`, sem merge automático. Os clipes `Burst` e as variantes CL continuam experimentais até inspeção visual.
