# Sophia Living Face R1.1 — Facial QA Gate

**Decisão: R1.1 FIX REQUIRED · R2 DEFERRED · sem aprovação para integração.**

Este laboratório verifica os dois masters R1 existentes. Não altera GLBs, fontes Blender, geometria, UVs, materiais, pesos, ossos ou coreografias. A utilidade dos controles foi confirmada em CPU/API; a aprovação visual interativa continua pendente.

## Base e preservação

- `main` verificada ao iniciar: `ffab5343d95c7f59232c26428d6f4301f1d58199` (#302).
- O PR #308 apareceu durante a execução: `experiment/sophia-face-qa-r11-20261114` @ `eb85e6f50d245854753ed572b9921a48c8a2846a`.
- Esta entrega é empilhada sobre #308, na branch `experiment/sophia-face-qa-r11-gate-20261114`. Preserva a entrada por ZIP do protótipo, substituindo a rota pública do protótipo por injeção **somente em `astro dev`**. Não atualiza a branch #308 nem `main`.
- #306/#307 tratam de atores/jaleco de outra Sophia; #303–305 tratam de recuperação de adornos. Não são usados como fontes dos masters Anime/Kitsune nem incorporados nesta mudança.
- Páginas, assets e runtimes de Hsin, Shorekeeper, Phrolova, Sophia de produção, 404 e modo imersivo permanecem fora do diff.

## Segurança e acesso

O laboratório não está em `src/pages/`. A integração `scripts/sophia-face-qa-integration.mjs` injeta `/experimentos/sophia-face-qa/` apenas para o comando **dev**. `build`, `preview` e `sync` não a registram. O gate de build procura tanto a rota quanto referências aos masters e ao código da interface no resultado de produção. O build medido verificou 66 arquivos de texto, sem encontrar esses conteúdos.

Não há GLB, PNG de personagem, screenshot ou Blender privado no Git; não há URL de asset, API de upload ou nova permissão de acesso. A página lê um GLB ou uma entrada específica do ZIP pela File API. Os hashes são obrigatórios; dependências glTF externas são rejeitadas. O ZIP recebe validação de limites e descompressão limitada ao tamanho do master, seguida de SHA-256. Presets JSON são os do pacote R1, verificados no ensaio de assets.

Não foi verificada/configurada uma implantação com autenticação restritiva para esta rota. Proteções de outras experiências não certificam acesso a um novo laboratório. Portanto, **a entrega fica local**, sem URL pública de QA, registro de Site ou deploy solicitado. Uma eventual prévia automática do PR não conterá o laboratório nem os masters.

## Abrir o laboratório

```sh
npm ci
npm run qa:sophia-face
```

Abra `/experimentos/sophia-face-qa/` na origem local impressa pelo Astro. Selecione `Sophia_Living_Face_R1.zip`, `Sophia_R11_QA_Kit.zip` ou o GLB extraído correspondente. Nenhum terminal é necessário **para ler o ZIP pela interface**; iniciar um servidor local ainda exige um ambiente de desenvolvimento. Não confundir essa condição com uma prévia pública pronta para Android.

O ZIP comprimido precisa de `DecompressionStream('deflate-raw')`; em navegador sem suporte, use o GLB extraído ou um QA Kit sem compressão. Somente a Sophia escolhida é decodificada, mesmo que o arquivo ZIP contenha ambas.

## Controles

- Sliders descobertos nos morph targets reais: 21 Anime / 12 Kitsune. O limite recomendado de `Mouth_Open` é 0,65.
- 12 presets Anime / 6 Kitsune, sem substituição silenciosa de nomes desconhecidos.
- Play e stop dos clipes existentes; sliders/presets param o mixer antes de escrever. Stop conserva os pesos atuais; neutro zera os morphs em todas as primitivas.
- Câmeras frontal, ¾ nos dois sentidos, perfis, traseira, close-up e enquadramento do corpo/cauda. A Kitsune usa a base local da cabeça documentada na R1, não a frente global do corpo.
- Luz frontal/oblíqua, órbita e zoom; um contexto, DPR máximo 1,5, pausa por visibilidade e offscreen, descarte e encerramento de ImageBitmaps.
- Contadores do renderer, FPS estimado em janela de um segundo, leitura/verificação/parse e primeiro frame **enviado**, sem alegação de tempo GPU.
- Três repetições opcionais de carga/descarte; estabilidade dos contadores não comprova VRAM/heap livre ou ausência total de vazamento.
- Avaliação separada por versão, critério, morph e preset; exportação JSON local com condições de observação, hashes das imagens de referência e câmera/luz quando disponíveis. Tudo começa em NOT TESTED.

## Ensaios realizados

```sh
npm run check:sophia-face-qa
npm run check
npm run build
npm run qa:sophia-face:assets -- /diretorio-privado-r1 /saida-privada.json /pacote-r1.zip
```

Ambiente: Node 24, Astro 7.4.2 e Three.js 0.186.1, conforme o lockfile; sem dependências novas.

| Ensaio | Resultado | Escopo |
|---|---|---|
| 13 testes de regressão | PASS | Mixer/sliders, todas as primitivas, neutro, descarte compartilhado, concorrência, ZIP, rota/build e avaliações |
| `npm run check` | PASS | Suites atuais do repositório mais os novos testes |
| `npm run build` | PASS | Astro, SEO, OG, higiene e exclusão do laboratório |
| Hashes e inventários dos GLBs reais | PASS | Coincidem com o pacote R1 |
| Todos os morphs/presets | PASS API | 99 aplicações individuais + 54 de presets; deltas não vazios e deslocamento real de vértice avaliado pela API do SkinnedMesh em cada controle |
| Demo e retorno neutro | PASS API | 42 amostras temporais; pesos coerentes nas três/duas primitivas |
| Preservação durante os controles | PASS API | Hash dos atributos/índices/morph buffers, UVs, skinning, materiais e transforms dos ossos não mudou |
| Bitmap lifecycle | PASS CPU | Seis decodificações JPEG reais via sharp; seis encerramentos; não é descarte GPU |
| Exportação pela interface | PASS | JSON baixado e lido; versões/estados independentes e métricas GPU nulas |
| Renderização WebGL interativa | NOT TESTED | Navegador remoto recusou a criação do contexto: `GL_VENDOR/GL_RENDERER = Disabled`, `BindToCurrentSequence failed` |
| FPS, VRAM, estabilidade GPU e Samsung Internet | NOT TESTED | Não substituídos por tempos de CPU ou imagens estáticas |

`asset-api-results.json` contém hashes, inventários, tempos de parse CPU e ciclos. O adaptador de imagem usa pixels JPEG reais via sharp para exercitar o GLTFLoader em Node. Não é um ImageBitmap de navegador nem prova de renderização. A comparação com a versão R0 não foi repetida; o escopo de preservação é **R1 antes/depois das operações do laboratório**.

Os accessors de tempo começam em `1/24 s` e terminam em `9 + 1/24 s`: a faixa animada possui 9 segundos, enquanto `AnimationClip.duration` chega a cerca de 9,04 segundos. O laboratório mostra a duração carregada; nenhum clipe foi recortado ou renomeado.

## Gate visual e próximos passos limitados

As capturas privadas da interface mostram **os renders PNG fornecidos na R1 em comparação**, não um novo render WebGL. A inspeção desses materiais mantém pele/contraste, legibilidade emocional, fechamento das pálpebras e alinhamento aparente como PARTIAL. Os renders laterais mostram constelações pouco legíveis/ausentes nas superfícies expostas da cauda; o item foi catalogado sem repintura. A referência autoral do emblema e o comportamento sob órbita/luz no aparelho ainda precisam de conferência.

A matriz completa em `gates.json` separa essas observações da validade de API; tabelas por morph e preset não recebem aprovação visual automática por terem valores não nulos.

Correções R1.1 já sustentadas e implementadas: serialização da carga, atualização de todas as primitivas, arbitragem mixer/sliders, neutralização, limpeza de recursos/listeners, entrada ZIP limitada e retirada do laboratório do build público. **Nenhuma correção adicional de GLB é autorizada por um simples PASS estrutural.** Antes de qualquer reparo de piscada, reproduzir o defeito com controle isolado, câmera/luz registradas e master de hash conhecido. Só então limitar amplitude/recompor presets ou corrigir um defeito localizado demonstrado, preservando o master.

Novos globos, loops extensos de pálpebras, cavidade oral, animações corporais e atuação avançada ficam em eventual R2. Não integre ao modo imersivo nem faça merge por causa destes testes.

Referências primárias usadas: [Astro Integration API](https://docs.astro.build/en/reference/integrations-reference/), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) e [AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html).
