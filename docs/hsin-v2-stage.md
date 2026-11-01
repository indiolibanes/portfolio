# Hsin V2.0 — palco e asset de produção

## Base e rotas

- Base funcional: PR #166, `experiment/hsin-autonomous-repertoire-2026-11-01`, commit `8dc7879654b5367f506d62229fae628d57e5d6ef`. Os checks dessa base estavam aprovados antes da implementação.
- Head: `experiment/hsin-v2-stage-2026-11-01`. PR empilhado sobre a branch acima; `main` não foi alterada e não há merge automático.
- Apresentação: `/experimentos/hsin/`, acessível em `/experimentos/`.
- Autoria e upload local: `/experimentos/hsin-lab/`, preservados como entrada independente.
- GLB público: `public/assets/models/hsin/hsin-v2.0.glb`.
- Perfil de atuação: `public/assets/models/hsin/hsin-v2.0-profile.json`.
- Poster: `public/assets/models/hsin/hsin-v2.0-poster.webp`, rasterização CPU do próprio modelo; não é captura WebGL nem evidência de FPS.

## Derivado explícito, original preservado

O original `hsin-v.1.0.5.glb` permanece fora do repositório, intacto. SHA-256: `938a86162d5b431638ff46f2d30c78ecea74c95587835e1a8883e2b7f6c740fe`. A ingestão pública desta etapa usa um derivado separado, solicitado para a V2. Créditos e metadados de origem foram preservados; esta alteração não acrescenta uma licença ao asset.

| Medida | Original | V2 |
| --- | ---: | ---: |
| Arquivo GLB | 69.407.460 bytes | 9.873.744 bytes |
| Memória estimada das texturas de morph | 466.807.744 bytes | 1.295.616 bytes |
| Morphs por primitiva | 169 | 18 face, 8 olhos, zero nas demais |
| Geometria da personagem | 9 primitivas | 9 primitivas, sem decimação |

O arquivo ficou 85,8% menor. A estimativa de memória de morphs caiu 99,7%; é uma estimativa do payload decodificado em FLOAT32, não uma medição do consumo total de GPU/VRAM. Texturas, buffers de skinning e o framebuffer também consomem memória.

O otimizador incorpora a contribuição neutra dos morphs sem uso à geometria base, mantém os canais faciais usados pela atuação, elimina buffers duplicados e remove os NORMALs dos morphs. O erro máximo medido na reconstrução da posição neutra foi `5,96e-8` metros. Pesos de skinning, índices, rig e triângulos da personagem permanecem. A esfera auxiliar LSCherry foi excluída do derivado, assim como UVs/cores não usados pelos materiais padrão do player.

Os mapas de cor usam WebP com perdas; face permanece em 2048 px e os demais mapas têm teto de 1024 px. Mapas normais usam WebP lossless. O derivado requer `EXT_texture_webp`, suportado pelo GLTFLoader existente em navegadores com WebP. Sem Draco, Meshopt, KTX2 ou decodificadores/dependências adicionais.

Tradeoff visual explícito: NORMALs dos morphs ativos ficam no estado base exportado. Isso reduz bastante o custo, mas pode mudar sutilmente a iluminação das expressões. Os materiais continuam sendo uma aproximação Three.js; não reproduzem os shaders do jogo. O relatório detalhado é `docs/hsin-v2-asset-report.json` e o manifesto usado pelo player é `src/data/hsin-v2-asset.json`.

## Cenário, câmera e interação

Fundo azul frio com gradiente de 256×512, profundidade por fog, chão simples, plataforma cilíndrica de 48 segmentos, aro fino e contato pintado de 128×128. Uma luz ambiente e duas direcionais; nenhuma sombra em tempo real, HDR, partículas ou pós-processamento. Hsin fica centrada, com os pés alinhados à plataforma e enquadramento adaptado à proporção da tela.

Roda, pinch e botões aproximam/afastam. Arrastar orbita suavemente em torno da personagem; pan é desativado, azimute limitado a aproximadamente ±56° e inclinação limitada acima do chão. Distância mínima 1,05 m; máximo adaptado ao enquadramento. Ao aproximar, o foco sobe gradualmente ao rosto. O botão de retorno restaura a composição inicial. Há pausa de atuação e respeito a `prefers-reduced-motion`, mantendo a câmera utilizável. Todos os parâmetros ficam em `hsin-stage-config.mjs`.

## Custo em execução e ciclo de vida

- Layout independente: sem cabeçalho global, fontes remotas, React/R3F, física ou UI do laboratório nesta rota.
- Imports e asset carregados quando a página fica visível. WebGL2 é verificado antes de baixar o modelo. Poster permanece em caso de indisponibilidade.
- Um único dono do requestAnimationFrame; render/atuação limitados a 30 FPS. A página oculta ou fora da tela cancela o loop, sem recuperar tempo acumulado.
- Pausa e movimento reduzido usam render sob demanda; damping da câmera termina e o loop para. Atuação autônoma ativa precisa de frames contínuos, por isso não se usa demand permanente.
- DPR até 1 no toque e 1,25 no desktop, com teto adicional de 1.152.000 pixels físicos; telas grandes podem receber DPR abaixo de 1.
- Matrizes locais estáticas congeladas; apenas ossos dirigidos atualizam suas matrizes, seguidos de uma propagação de mundo por frame de atuação. Sem geometria/auditorias/IK por frame ou na inicialização pública.
- Solvers aprovados e auditorias continuam no laboratório/offline. O bake captura 65 amostras por trajetória e variantes de respiração do braço esquerdo. O player interpola quaternions reutilizáveis. Erro angular máximo medido contra o solver: 0,821°, em amostras intermediárias.
- Gaze usa vetores reutilizados e projeção no plano apenas em eventos de input. Sem raycast de triângulos por frame.
- Listeners com AbortController, observers/OrbitControls/RAF descartados, geometrias, materiais, texturas, ImageBitmaps, skeletons e contexto WebGL liberados ao sair ou falhar. Retorno pelo bfcache remonta a cena. Perda/restauração do contexto pausa/retoma sem salto temporal.
- URL do modelo/perfil inclui o hash do manifesto; perfil e modelo são conferidos entre si. Headers CSP específicos permitem imagens GLB via blob sem afrouxar as demais rotas.

## Reprodução e validação

Requer o GLB original local, Node/dependências do projeto e Python com numpy/Pillow para o derivado:

```sh
python scripts/optimize-hsin-v2.py /caminho/hsin-v.1.0.5.glb public/assets/models/hsin/hsin-v2.0.glb --report docs/hsin-v2-asset-report.json
node scripts/bake-hsin-v2.mjs public/assets/models/hsin/hsin-v2.0.glb public/assets/models/hsin/hsin-v2.0-profile.json
node scripts/render-hsin-poster.mjs public/assets/models/hsin/hsin-v2.0.glb public/assets/models/hsin/hsin-v2.0-poster.webp
node --test tests/hsin-*.test.mjs
npm run build
npm run check:ux
```

Se o derivado mudar, atualizar `sha256` e `bytes` em `src/data/hsin-v2-asset.json` junto com o perfil. A CI confere hash, tamanho, canais, calibração, reprodução no rig real, restauração e orçamento do player.

Validação local: regressões Hsin, teste específico do GLB publicado (600 segundos de atuação simulada, sem disputa entre poses esquerdas, retorno exato), testes do clock a 120 Hz/30 FPS, visibilidade/pausa/damping, câmera e resolução; build Astro/OG aprovado. UX geral mantém a base de 97/100: três falhas preexistentes (`nav: lab label aligned`, `nav: music static link`, `curiosidades: header link`).

Limites: testes numéricos, rasterização CPU e tamanho do bundle não substituem inspeção WebGL em desktop/mobile. A meta de 30 FPS é um teto de trabalho, não FPS medido nem garantia em um aparelho. Ainda é necessário conferir iluminação, materiais, orbit/zoom/pinch e gestos ao vivo em hardware real, incluindo memória sustentada e perda de contexto. Não houve redução de triângulos ou do rig nesta etapa.

## Arquivos e responsabilidades

| Grupo | Arquivos |
| --- | --- |
| Entrada pública | `src/pages/experimentos/hsin/index.astro`, `src/layouts/HsinStageLayout.astro`, `src/styles/hsin-stage.css`, link em `src/pages/experimentos/index.astro` |
| Player | `src/scripts/hsin-stage.ts`, `hsin-stage-config.mjs`, `hsin-stage-loop.mjs`, `hsin-baked-pose.mjs` |
| Separação sem substituir rigs | `hsin-face-channels.mjs`, `hsin-face-binding.mjs`, `hsin-chest-director.mjs`; reexports em face-rig/morph-audit/chest-gesture e callback opcional de matriz em rest-breath |
| Assets | GLB, perfil e poster em `public/assets/models/hsin/`; manifesto em `src/data/hsin-v2-asset.json` |
| Autoria offline | `scripts/optimize-hsin-v2.py`, `bake-hsin-v2.mjs`, `render-hsin-poster.mjs` |
| QA e entrega | `tests/hsin-stage.test.mjs`, `hsin-stage-asset.test.mjs`, workflow Hsin, `public/_headers`, este documento e relatório do asset |
