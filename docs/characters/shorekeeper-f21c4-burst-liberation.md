# Shorekeeper F2.1-C.4 — Burst / Resonance Liberation

**Status:** `SOURCE_PREFLIGHT_PASS / CONVERSION_QA_PENDING / VISUAL_QA_PENDING / LIBERATION_MAPPING_UNVERIFIED`.

A fonte privada ActorX fornecida pelo usuário inclui `Burst01.psa`, `Burst02.psa` e seus correspondentes `Rib_Burst01.psa` e `Rib_Burst02.psa`. Os quatro arquivos foram extraídos do RAR original, inventariados e empacotados privadamente em `Shorekeeper_F21C4_Burst_Preflight_PRIVADO.zip`, juntamente com o PSK e hashes SHA-256.

A nomenclatura `Burst` sugere uma ou mais variantes de movimento associado à Resonance Liberation (End Loop), **mas não comprova a equivalência visual, a ordem nem as diferenças entre as duas sequências no jogo**. Por isso, o código usa `SK_BURST_01_ORIGINAL` e `SK_BURST_02_ORIGINAL`, não rótulos definitivos de cutscene.

| Fonte | Quadros corpo/Rib | FPS corpo/Rib | Duração | Canais de posição/rotação móveis concorrentes | Deslocamento de Bip001 (fonte) |
|---|---:|---:|---:|---:|---:|
| Burst01 | 181 / 181 | ~30,1667 | ~6,000 s | 0 | ~18,94 de amplitude |
| Burst02 | 164 / 164 | ~30,1840 | ~5,433 s | 0 | ~96,88 de amplitude |

Ambos os pares contêm `BONENAMES=243`, um `ANIMINFO`, `ANIMKEYS` e `SCALEKEYS` com contagens coerentes. O inventário estrutural não aprova ainda motion retargeting, escala final ou VFX. O deslocamento de `Bip001` no Burst02 torna essencial conferir câmera e recuperação. As medidas estão nas unidades originais ActorX; não as converter diretamente em metros sem verificar hierarquia e escala.

## Contrato de implementação

- Base: PR #213 (C.3), empilhado sobre #212 e #211.
- Modelo canônico imutável: `PRIVATE_shorekeeper_f20a_original_idles.glb` (SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`).
- Conversão: `python3 scripts/shorekeeper/convert-burst.py PRIVATE_SOURCE PRIVATE_MODEL.glb PRIVATE_OUTPUT`.
- O conversor exige manifesto exato, valida bytes e hashes, hierarquias/bind pose, canais exclusivos e exporta bibliotecas **privadas**, um GLB de animações por Burst.
- Cada biblioteca contém o composto, `_BODY` e `_RIB`, para QA no mesmo contexto, sem criar animações novas ou copiar assets no repositório.
- Reutilizar o mesmo diretor corporal (um clip por vez), loop central, pause/resume/recover. Idles, piscada e oito clipes anteriores não mudam.
- Na interface de apresentação, dois movimentos Burst aparecem somente se as bibliotecas privadas forem carregadas.
- **Não** presumir que o PSA inclui o círculo estelar, partículas, mariposas, câmera de ultimate, iluminação de domínio, áudio ou efeitos de jogo. Esses recursos pertencem a etapas separadas, e devem ter proveniência/referência próprias.

## Teste privado

1. Carregar o GLB canônico no domínio experimental.
2. Entrar em `Combate` e abrir `Adicionar ataques privados`.
3. Importar `SK_BURST_01_ORIGINAL.animations.glb` e `SK_BURST_02_ORIGINAL.animations.glb`.
4. Reproduzir individualmente com câmera de corpo inteiro. Conferir retorno ao repouso, câmera ¾, Root/Bip001, mãos, saia, fitas e cabelos.
5. Comparar os dois com vídeo original do jogo em condições equivalentes de câmera antes de chamar um deles de Liberation canônico.
6. Repetir no Samsung Internet; observar pausa, retomada, context loss, FPS e descarte.

**Aprovação:** os oito ataques anteriores, os três idles e a piscada são preservados; os Burst só terão aprovação após QA visual. A fase VFX/Cinematic Liberation ficará para um PR posterior, com implementação opcional e otimizada, sem necessidade de render targets extras. **Sem merge automático e sem alterações em main.**
