# Hsin V2.0.1 — Cinematic Profile & Lunar Terrace Refinement

**DRAFT / VISUAL_QA_PENDING.** A versão pública continua V2.0.1. As pranchas usam o GLB real e rasterização CPU com iluminação aproximada; não representam aprovação WebGL/PBR ou medição de FPS. Preview, head e CI remoto são registrados no PR.

## Base efetivamente consolidada

Na auditoria inicial, o #171 já havia sido **mesclado na branch do #170**, não na main. O #170 continuava aberto/draft no sucessor `f100ed00b5025f26e83d9fbf63259d0d8d8b59f1`. Seu tree conserva a implementação do head auditado `ea0b223b78f3673ab618c19a06cb9b812e5a686f`. Esta revisão parte de `f100ed0` e propõe PR empilhado sobre `experiment/hsin-v21-cinematic-idle-2026-11-01`.

Branch: `experiment/hsin-v201-profile-refinement-2026-11-02`. Main auditada: `dbed434f9ee2f3249244fe5c7ea543eba34e48c5`, sem escrita direta, sem merge automático. Não foi criado outro produto, projeto ou laboratório.

GLB preservado em `public/assets/models/hsin/hsin-v2.0.glb`: **9.873.744 bytes**, SHA-256 `63506b0b7a2369722e6429c3b16c5f48764ee01706d1272b4ffd69a45c5e0d2c`. Perfil de atuação e manifesto V2.1 intactos, incluindo seus nomes internos. Não se alteram materiais da personagem, rig, morphs, dados dos braços ou diretores.

## Orientação: controles independentes

`HSIN_LUNAR_PRESENTATION` separa os alvos artísticos dos deltas anatômicos. `bodyApparentYaw` define apresentação do corpo em relação à direção central de câmera; `headApparentYaw` é **alvo de calibração validado em teste**, não uma ordem Euler para girar o head. `neckCompensation` e `headCompensation` são os deltas aplicados. Não há aumento automático da compensação quando o corpo gira. Para mudar o alvo facial, calibram-se explicitamente os deltas e refaz-se o envelope offline; o teste impede que o alvo nominal se afaste da medida.

| Variante | Corpo nominal | Alvo facial | Face medida no eixo da câmera | Root mundial | Neck / Head adicionais |
| --- | ---: | ---: | ---: | ---: | ---: |
| #171 | 55° | — | 22,65° | −47° | 9° / 16° |
| A | 60° | 30° | 30,15° | −52° | 4° / 18,8° |
| B | 65° | 35° | 35,15° | −57° | 4° / 18,8° |
| **C, escolhida** | **70°** | **40°** | **40,15°** | **−62°** | **4° / 18,8°** |
| D | 75° | 45° | 45,15° | −67° | 4° / 18,8° |

Câmera: azimute central 8°, sem mudança durante os gestos; `cameraTargetOffset=[0,0,0]` é um ajuste artístico adicional independente. O framing responsivo soma um deslocamento horizontal de composição de 0,16 em retrato e 0,10 em paisagem, no eixo direito da câmera. Isso mantém o volume da cauda no quadro sem reduzir demais a personagem. Considerando a perspectiva **da posição real da cabeça até a câmera**, a face mede **41,20–42,16°**, conforme o viewport; esses valores constam no JSON. Não se confunde yaw do root com direção efetiva da face.

A variante C foi escolhida nas comparações CPU por evidenciar ombro próximo, manga em profundidade e diagonal do torso; B é mais conservadora, D aumenta a ocultação do olho distante/cabelo. O total cervical adicional cai de 25° para 22,8°, com Neck reduzido de 9° para 4°. O head conserva também a referência anterior #170 (+4° yaw/−2° roll), que não é regravada. Leitura dos dois olhos e charme em movimento exigem aceite WebGL.

As compensações são aplicadas uma vez, em eixo anatômico medido, com conversão ao espaço de cada pai ORG/DEF. A rotação mundial do root é vertical, não um eixo local arbitrário. `updateMatrix`/`updateWorldMatrix` são explícitos; `matrixAutoUpdate=false` continua compatível. A restituição é exata, sem acumulação.

Os argumentos legados de estudo (`apparentBodyDegrees`, `cameraAzimuthDegrees`) continuam capazes de reproduzir a matemática do #171 exclusivamente para regressões e comparações históricas. O player usa os parâmetros independentes novos.

## Atuação preservada e relação mão/face

- Quaternions locais dos braços, ORG/DEF, são idênticos aos do #171; trajetórias mundiais só recebem a transformação rígida entre roots.
- Perfil de assinatura, peito, composição e cabelo, durações, probabilidades, cooldowns, prioridades, lateralidades, exclusões e retorno permanecem intactos.
- Expressões, piscadas/piscadelas, sorrisos, gaze e respiração usam os mesmos controladores e loop. Nenhum IK ou cálculo novo de postura por frame.
- O teste herdado compara **600 s a 30 Hz**, traces corporais/faciais, cadeias, referência, pausa e restituição. Continua aprovado sem reduzir tolerâncias.
- Verificação específica da assinatura: menor distância entre pontas dos dedos direitos e um proxy de queixo calibrado (centro ocular menos 55 mm em Y). Na aproximação de peso 0,85: **142,72 → 141,28 mm**; na sustentação: **60,91 → 60,17 mm**. A compensação menor não afasta a mão nesse proxy. Isso **não mede contato com a superfície do rosto**, nem prova ausência de colisão contínua; as pranchas mostram o gesto para revisão artística.

## Qualidade espacial por elemento

**Pedra e luz:** blocos com comprimentos diferentes, juntas levemente irregulares, variação tonal, grão e desgaste tileable. O plano continua único, em Y=0, mas recebe uma malha estática de 22×14 segmentos para gradientes de oclusão junto à balustrada e pequenas poças de luz pintada das quatro lanternas. Não há shadow map. Contatos pequenos por pé permanecem sem disco/base.

**Arquitetura:** telhados com três bandas de curvatura, beirais levantados, cumeeira estreita e frisos sugeridos; variação de altura/profundidade, volumes auxiliares e distribuição incompleta de janelas acesas. Tudo permanece nos batches existentes. Sombreamento de orientação mais forte e oclusão próxima ao solo estão nos vertex colors. Não se converteram todos os materiais para PBR nem se adicionaram luzes.

**Água:** gradação tonal de perto/longe, textura de ruído horizontal estático (512×256, **2.302 bytes**) e faixas lunares mais concentradas e irregulares. Reflexos de janelas menores, menos uniformes, com intensidade por distância. Não há ondas, relógio novo, espelho, render target ou segundo render.

**Atmosfera:** serras com 181 amostras determinísticas por contorno, em planos a −34 e −25, eliminando os grandes segmentos retos; a arquitetura/margem forma o terceiro nível perceptivo. Cor e bruma mantêm separação. São silhuetas trianguladas, não terrenos de alta densidade.

**Flores:** ramos 3D mais finos, planos menores com tamanhos variados, vermelho/rosa/coral, atlas com contornos e hastes mais delicados e botões pontuais. Continuam periféricas, sem simulação e sem personagem/silhueta adicional.

**Lua:** mesmo plano, textura, halo e cor; seu redesign não fez parte desta rodada. O fundo não usa a ilustração inteira como imagem plana.

O ambiente continua com materiais simples e iluminação pintada; não se promete a fidelidade de uma ilustração nem iluminação física. A principal mudança de materialidade é espacial/tonal e pode ser comparada por componente nas pranchas.

## Enquadramento após orientação

`scripts/bake-hsin-framing.mjs` mede vértices skinned reais após referência e apresentação, em repouso e nove pesos de cada pose existente. Grava `src/data/hsin-v201-framing.json`, com hashes do modelo/perfil e configuração usada. A envoltória orientada cobre cabelo, mangas e cauda; não se usa somente o AABB exportado antes do yaw. Amostragem não equivale a uma prova contínua de todas as poses intermediárias.

`hsin-lunar-framing.mjs` calcula distância/alvo somente no mount/resize. Em paisagem mantém a envoltória completa; em retrato estreito limita a distância a 4,65 para priorizar rosto, torso e gesto. Aceita corte periférico parcial da cauda durante algumas composições, explicitamente, sem reduzir a personagem a uma miniatura. O alvo é fixo durante a atuação e não acompanha os gestos.

| Viewport | Distância inicial | Face em perspectiva | Política |
| --- | ---: | ---: | --- |
| 320×740 | 4,65 | 41,66° | Prioridade face/torso/mãos; crop periférico permitido |
| 393×852 | 4,65 | 41,66° | Idem |
| 768×1024 | 3,50 | 42,16° | Envelope completo |
| 1280×720 | 3,45 | 41,20° | Corpo e ambiente |
| 1920×1080 | 3,45 | 41,20° | Corpo e ambiente |

Testes projetam cabeça e mãos nos cinco viewports, inclusive peito e cabelo. Zoom/dolly, reset, órbita limitada, damping e pinch permanecem. DPR/limites de pixels não mudam. Não há segunda cena nem geometria duplicada.

## Orçamento comparado

| Métrica estrutural | #171 | Refinamento |
| --- | ---: | ---: |
| Meshes de cenário | 12 | **12** |
| Triângulos de cenário | 2.120 | **4.254** |
| Passes estimados totais, com Hsin e fundo | 22 | **22** |
| Texturas de cenário | 4 | 5 |
| Bytes WebP | 88.816 | **104.546** |
| RGBA8 + mipmaps estimados | 9,33 MiB | **10,00 MiB** |
| GLB | 9.873.744 bytes | Idêntico |
| Luzes / render targets / pós-processamento | 3 / 0 / 0 | 3 / 0 / 0 |
| Atualização temporal adicional / IK público | 0 / 0 | 0 / 0 |

A malha adicional vem sobretudo da curvatura dos telhados, contornos serranos e gradientes estáticos do piso. Continua abaixo até do limite anterior de 5.000 triângulos e do alvo de 6.000. A quinta textura acrescenta ~0,67 MiB estimado, sem nova chamada de desenho. Os materiais transparentes continuam com single pass quando aplicável.

Não foram medidos `renderer.info`, VRAM ou FPS; são contagens/estimativas reproduzíveis. Preservados teto de 30 FPS, DPR adaptativo, pausa fora da tela/aba, render sob demanda pausado e descarte de recursos. Não se implementou um tier mobile separado sem evidência de benefício; a cena única pequena evita duplicar manutenção. Novos assets públicos recebem chave de cache `lunar-terrace-r2`, e posters têm a mesma revisão, para não reapresentar texturas antigas aos visitantes.

## Evidências reproduzíveis

- [Orientação #171 / A / B / C / D, mesma câmera e framing](qa/hsin-v201-refinement/orientation.webp)
- [Antes/depois de pedra, montanhas, arquitetura, água e flores](qa/hsin-v201-refinement/spatial-elements.webp)
- [Composição geral, mesma pose e câmera](qa/hsin-v201-refinement/composition.webp)
- [Repouso, assinatura, peito, composição, cabelo e retorno](qa/hsin-v201-refinement/acting.webp)
- [Cinco tamanhos e gestos mobile](qa/hsin-v201-refinement/responsive.webp)
- [Métricas, orientação medida e hashes](hsin-v201-refinement-validation.json)

O renderer offline pode ler a cena histórica de `f100ed0` com `--scene=baseline`; não adiciona essa cena ao bundle público. Os estudos de orientação usam o mesmo enquadramento legado e o mesmo fundo para não confundir mudanças de cenário com mudanças de pose. O renderer continua uma aproximação de iluminação, transparência e PBR, sem renderização artística inventada.

```sh
node scripts/generate-hsin-terrace.mjs
node scripts/bake-hsin-framing.mjs
node scripts/render-hsin-refinement-qa.mjs
HSIN_WRITE_REFINEMENT_REPORT=1 node tests/hsin-lunar-refinement.test.mjs
npm run build
HSIN_CHECK_DIST=1 node tests/hsin-lunar-terrace.test.mjs
HSIN_CHECK_DIST=1 node tests/hsin-lunar-refinement.test.mjs
```

`--compose` no gerador de QA recompõe apenas a diagramação dos renders temporários existentes; não deve ser usado para validar uma mudança na cena. Posters finais usam os mesmos framing/configuração do player, em 786×1704 e 1280×720.

## Arquivos e commits

1. Orientação: `hsin-lunar-presentation.mjs` e suporte de parâmetros no renderer.
2. Piso/luz: gerador de pedra, WebP e vertex colors do ambiente.
3. Arquitetura/lago/serras: fábrica do terraço, textura de água, carregamento e renderer.
4. Flores/framing: atlas, envelope JSON, bake offline, módulo de câmera, integração de alvo e cache dos posters.
5. Validação/otimização final: testes, workflow, comparações, posters, cache de texturas e esta documentação. SHAs finais no PR.

## Testes e limites

- **33/33** arquivos Hsin passam localmente. Novo teste compara alvos faciais independentes, braços inalterados, proxy mão/queixo, cinco proporções, restituição, orçamento e descarte.
- Teste anterior de terraço conserva suas tolerâncias de orientação legada, trajetória e orçamento; apenas inclui a quinta textura na decodificação e descarte. Nenhum teste foi pulado ou enfraquecido.
- Build Astro/OG **PASS**. Cinco texturas do dist decodificadas e comparadas por SHA-256; posters finais também comparados.
- UX estático **97/100**, mesmas três falhas anteriores de navegação; não reclassificadas.
- CI inclui o teste novo e verificação pós-build. Resultado remoto e preview no PR.
- **VISUAL_QA_PENDING:** ainda é preciso conferir navegador WebGL2 real, toque/Samsung Internet, órbita/zoom/pausa, estabilidade de vários minutos, relação mão/face e cabelo/mangas durante movimento. Não se afirma melhora de FPS ou ausência contínua de colisões com base em CPU/testes numéricos.
