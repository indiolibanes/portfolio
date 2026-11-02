# Hsin V2.0.1 — Lunar Terrace

**Experimental / VISUAL_QA_PENDING.** Comparações CPU do próprio GLB, sem imagem integral de fundo e sem personagens adicionais. Não equivalem a capturas WebGL, medição de FPS ou aprovação artística. Preview, head e resultado remoto ficam no PR draft.

## Base auditada e versão

- `main`: `dbed434f9ee2f3249244fe5c7ea543eba34e48c5`, sem alterações diretas.
- PR #170 permanece aberto/draft; seu head mais recente era `7e5e6c245afd5d3ca6842e1832b6e8e7d5e8134c`, sem sucessor identificado na auditoria. Seus relatórios, auditoria do rig e estudos de câmera foram reaproveitados.
- Branch empilhada: `experiment/hsin-v201-lunar-terrace-2026-11-02`, base de PR `experiment/hsin-v21-cinematic-idle-2026-11-01`. Sem merge automático.
- Versão pública **2.0.1**. Nomes internos `hsin-v2.1-profile.json` e `hsin-v21-pose.json` permanecem para compatibilidade; seus bytes não mudam nesta revisão.
- GLB: `public/assets/models/hsin/hsin-v2.0.glb`, **9.873.744 bytes**, SHA-256 `63506b0b7a2369722e6429c3b16c5f48764ee01706d1272b4ffd69a45c5e0d2c`, preservado. Nenhum acesso ou alteração do original privado.

## Apresentação estática e estudos

A câmera conserva azimute inicial de 8°, altura, alvo, zoom/dolly, órbita limitada, arrastar e pinch existentes. Mudar a câmera sozinha deslocaria também a leitura do lago/terraço. A solução gira o nó raiz do GLB **−47° em Y mundial**, sem translação adicional. Isso produz corpo aparentemente a 55° da observação inicial. O eixo cervical é medido de Spine2 a Neck; não é um eixo Euler arbitrário.

Compensação adicional sobre a referência reversível do #170:

| Estudo corporal | Root mundial | ORG/DEF Neck | ORG/DEF Head | Face aparente medida |
| --- | ---: | ---: | ---: | ---: |
| 35° | −27° | +1,8° | +3,2° | 25,69° |
| 45° | −37° | +5,4° | +9,6° | 24,08° |
| **55° — padrão** | **−47°** | **+9°** | **+16°** | **22,65°** |
| 65° | −57° | +12,6° | +22,4° | 21,50° |

A face é estimada pela direção do foco calibrado em relação ao head, não por reconhecimento de imagem. Offsets Neck/Head são deltas mundiais anatômicos convertidos ao espaço de cada pai, com atualização explícita das matrizes, inclusive com `matrixAutoUpdate=false`. A referência #170 de cabeça (+4° yaw/−2° roll) e os offsets de repouso dos braços continuam anteriores a esta camada.

Parâmetros ajustáveis em `HSIN_LUNAR_PRESENTATION`: obliquidade padrão, divisão cervical (36%) e teto de compensação (35°). `createLunarPresentation` admite estudos 35–65°, aplica de forma idempotente e restaura exatamente o root e quatro bones capturados. Nenhuma compensação é acumulada no ciclo de atuação. Root, pescoço e cabeça não mudam durante gestos. Descarte restaura primeiro a apresentação e depois a referência #170.

**Sem novo retarget/bake dos braços.** UpperArm/Forearm/Hand, ORG e DEF, permanecem idênticos ao perfil aprovado do #170 em 129 pesos de cada variante. Cada trajetória mundial é a mesma trajetória multiplicada pela transformação rígida do root: erro máximo medido `2,43e-16 m`. Timings, cooldowns, probabilidades, estados, lateralidades, exclusões, respiração, expressões e rastreamento ocular não mudam. A projeção do cursor já usa a matriz mundial inversa do head; o teste verifica essa composição. Não há novo solver/IK.

A compensação da cabeça necessariamente muda a relação mão/face, embora não mude o braço: as pranchas de assinatura, peito, cabelo e composição permitem inspecioná-la. O aceite dessa relação durante movimento continua pendente em WebGL; não se afirma ausência contínua de colisões com manga/cabelo.

## Remoções e contato

Removidos do player público: cilindro elevado azul, aro RingGeometry e plano de sombra circular do pedestal. O CircleGeometry do antigo chão não é mais criado na experiência V2.0.1. A fábrica antiga é mantida apenas como base de atmosfera e para reproduzir comparações anteriores.

O novo terraço é um plano retangular contínuo de 22 × 14 unidades, com superfície em Y=0. O mínimo dos vértices skinned fica em Y≈`1,65e-16`, no piso, sem alterar pernas, pés ou quadril. Dois pequenos contatos alongados, orientados pelo root e presos às âncoras dos pés, usam o atlas na pedra, sem disco ou sombra dinâmica. O novo cenário usa cilindros somente nos ramos botânicos, nunca como pedestal.

## Reinterpretação da ilustração

A referência anexada do terraço lunar orienta composição, profundidade e temperatura: céu azul frio, lua marfim/âmbar, água com faixa dourada, arquitetura oriental distante e enquadramento floral vermelho. Nenhum trecho da imagem inteira vira um backplate. Não se adicionam personagens ou silhuetas.

- Lua texturizada leve, superfície sutil e halo na própria textura; mesma política de enquadramento em retrato/paisagem, sem bloom.
- Céu com gradiente, nuvens discretas e estrelas estáticas. Duas serras em profundidades distintas e bruma separam o horizonte.
- Lago com uma única geometria de reflexos lunares/das janelas/das lanternas, sem espelho, render target ou animação temporal adicional.
- Pedra com paginação, juntas, grão e reflexos pintados; repetição de textura compacta.
- Balustrada baixa, retornos laterais e onze volumes distantes com telhados de beirais levantados; geometria agrupada, não um mesh por prédio.
- Quatro lanternas: painéis luminosos e halos pintados no mesmo atlas, sem luzes individuais.
- Ramos 3D leves e poucos planos florais periféricos. Largura do enquadramento floral se adapta ao aspecto da câmera somente ao mover/redimensionar a câmera.
- As três luzes existentes permanecem: ambiente fria, principal marfim e recorte dourado moderado. Materiais do GLB intactos.

## Orçamento real da estrutura

| Recurso | #170 / V2.0 anterior | V2.0.1 |
| --- | ---: | ---: |
| Meshes de cenário e suporte | 9 (6 ambiente + 3 pedestal) | 12, sem pedestal |
| Primitivas do GLB | 9 | 9 |
| Teto estrutural de passes, incluindo fundo | 20 | **22 (+2)** |
| Triângulos do novo cenário | — | **2.120**, abaixo de 5.000 |
| Novas texturas de cenário | — | 4; total exato no JSON de validação (~89 KB) |
| Luzes | 3 | 3 |
| Render targets / passes de pós-processamento | 0 | 0 |
| Trabalho temporal novo / IK público | 0 | 0 |

Os 18 meshes nominais anteriores não são o mesmo que passes: a reflexão antiga transparente DoubleSide fazia dois passes, além do fundo texturizado. Materiais transparentes novos de reflexos/halos usam `forceSinglePass`. Contagem estrutural conservadora; frustum culling pode reduzi-la. **Não é `renderer.info` medido em GPU.**

| Textura | Dimensões | Uso |
| --- | --- | --- |
| `night-sky-v201.webp` | 1024 × 512 | Céu, sem mipmaps |
| `golden-moon-v201.webp` | 512 × 512 | Lua e halo |
| `stone-v201.webp` | 1024 × 1024 | Pavimentação repetida |
| `terrace-atlas-v201.webp` | 512 × 256 | Painéis, janelas, flores, halos e contatos |

Estimativa RGBA8 com mipmaps (exceto céu): **9,33 MiB** para essas quatro texturas, sem contar o GLB, contra aproximadamente 2,42 MiB do antigo céu/lua/sombra procedural. É um acréscimo de cerca de 6,9 MiB, não VRAM medida. Preferimos dois atlas pequenos e pedra de 1024 para evitar detalhes geométricos e manter juntas legíveis. Sem dependências novas nem mudanças no lockfile.

Preservados: teto configurável de 30 FPS, DPR adaptativo, limite de 1.152.000 pixels, pausa fora da tela/aba, render sob demanda quando pausado, recursos descartáveis e único loop. Não há novo tier temporal mobile; a mesma cena estática é pequena, DPR segue conservador e a composição floral se adapta a retrato. Desempenho real Samsung Internet/Chromium ainda precisa ser medido.

## Calling Lunar Fox — correção independente

A falha herdada não era de cenário: o WebP tinha 14.981 bytes, mas RIFF declarava 18.382, com dados ALPH/VP8 truncados. Foi reconstruído como recorte transparente do **GLB público real**, com as mesmas proporções de exibição (260:305), em 520 × 610; arquivo completo de 29.402 bytes. `MusicShelf.astro` recebe somente chave de cache nova. O teste existente passa **sem alteração, skip ou relaxamento**. A reparação fica em commit separado, identificável no PR. A aparência foi revisada como aproximação CPU; não se inventa recuperação de bytes ausentes.

## Comparações reproduzíveis

- [Antes, orientação, retirada da base e final](qa/hsin-v201/before-after.webp)
- [Estudos 35°/45°/55°/65°](qa/hsin-v201/orientation-studies.webp)
- [Frente e três quartos](qa/hsin-v201/front-and-three-quarter.webp)
- [Assinatura, peito, cabelo e composição](qa/hsin-v201/acting-55.webp)
- [Entrada, meio, sustentação e retorno dos braços](qa/hsin-v201/gesture-transitions.webp)
- Retrato: `public/assets/models/hsin/hsin-v2.0.1-poster.webp` (786 × 1704, razão 393:852).
- Paisagem: `public/assets/models/hsin/hsin-v2.0.1-poster-landscape.webp` (1280 × 720).

O renderer CPU usa geometria skinned/texturas do GLB, UV/atlas, câmera e cenário reais, com iluminação aproximada. Não reproduz PBR nem todos os detalhes de ordenação/transparência do WebGL. A vista frontal de inspeção usa câmera externa a −47° apenas no renderer offline; os limites orbitais públicos não foram reduzidos nem ampliados.

```sh
node scripts/generate-hsin-terrace.mjs
node scripts/render-hsin-terrace-qa.mjs
node scripts/render-hsin-poster.mjs public/assets/models/hsin/hsin-v2.0.glb public/assets/models/hsin/hsin-v2.0.1-poster.webp 786 1704 --profile=cinematic --terrace=rich --orientation=55
node scripts/render-hsin-poster.mjs public/assets/models/hsin/hsin-v2.0.glb public/assets/models/hsin/hsin-v2.0.1-poster-landscape.webp 1280 720 --profile=cinematic --terrace=rich --orientation=55
HSIN_WRITE_TERRACE_REPORT=1 node tests/hsin-lunar-terrace.test.mjs
npm run build
HSIN_CHECK_DIST=1 node tests/hsin-lunar-terrace.test.mjs
```

## Validação e limitações

- **32/32** arquivos `tests/hsin-*.test.mjs` passam localmente, incluindo integridade do GLB/perfil e o teste antes bloqueado pelo cameo.
- Novo teste: estudos de orientação, cabeça legível, matrizes congeladas, reversibilidade exata dos 823 bones, trajetórias ORG/DEF invariantes, contato skinned no piso, 600 s a 30 Hz com traces corporais/faciais idênticos, exclusões, gaze, enquadramento lunar e arquitetura, descarte de geometria/material/texturas e orçamento. Testes de pausa/continuidade do #170 continuam passando.
- Build Astro e verificação OG: **PASS**. Quatro texturas do `dist` decodificadas e comparadas por SHA-256 com os assets.
- UX estático: **97/100**, mesmas três falhas preexistentes de navegação, sem reclassificação.
- CI passa a executar o teste V2.0.1 e a integridade de texturas no build; resultado remoto registrado no PR.
- Aceite artístico, FPS/VRAM, estabilidade prolongada em navegador, pinch/órbita/zoom e verificação real de manga/cabelo/rosto dependem de WebGL. Se o navegador do Work continuar sem WebGL2, registrar explicitamente no PR e manter **VISUAL_QA_PENDING**.
- A cauda pode atingir a borda direita em retrato estreito. O enquadramento prioriza corpo/rosto e preserva os controles existentes; nenhum corte é ocultado por mudança de anatomia.

Arquivos principais: `hsin-lunar-presentation.mjs`, `hsin-lunar-terrace.mjs`, integração `hsin-stage.ts`, configuração/página/CSS, gerador de texturas, renderer CPU e pranchas, teste novo e workflow. GLB, perfis de atuação, diretores e expressões não foram modificados.
