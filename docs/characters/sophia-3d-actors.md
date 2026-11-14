# Sophia 3D como "ator" das páginas (branch `feat/sophia-3d-actors-20261113`)

Substitui as ilustrações 2D da Sophia pela versão 3D (assets Sophia v1.4.2 + Lab Coat v1.1 + Ornaments v1.0),
**mantendo cenários e animações**. A arte 2D original continua no DOM como reserva.

## O que foi trocado

| Onde | Antes | Agora | Clipe |
|---|---|---|---|
| Home — faixa de curiosidades (`SophiaCorrida`) | SVG da corredora | ator 3D `runner` (jaleco) | `Correr_R6`, yaw 1.0 |
| Home — laboratório (`SophiaAnimation variant="lab"`) | sprite WebP | ator 3D `lab` | `ExpressionFlow_R6` |
| 404 — retrato sobre o tabuleiro | Three.js + `sophia-alpha.glb` (~36 MiB) | ator 3D `portrait` (busto) | humor do Tetris |
| 404 — mascote do Tetris | pixel art 4 humores | ator 3D `mascot` (rosto) | humor do Tetris → `MOODS` |

Humor do Tetris (`sophia:tetris`) → clipe de expressão: idle=Seria, playing=Encarando, cheer=Feliz, over=Triste
(`paused` cai em idle). Variantes de olhos (espiral/coração) ficam em `MOODS`.

## Não viável com estes assets (permanece como está)

- `MethodPresenter` (terno): não há roupa/pose correspondente.
- Sala gamer (404, `SophiaRoom2DTemp`/Lounge): exige sentada + controle/TV; sem clipe nem prop.
- Variante `music` (fones): não há fones em `Ornaments_v1.0`.
- Detetive (chapéu/lupa): sem esses adereços; não trocado.
- Astronauta imersivo: já é 3D, intocado.
- Livro/caneta (`Prop_Book`/`Prop_Pen`) estão no GLB, ocultos por padrão (`extras.hidden`); sem clipe de escrita ainda,
  não são posicionados nas mãos.

## Arquitetura

- `public/assets/models/sophia/sophia-lab.glb` (~18 MB): montado de `Sophia_v1_4_2.glb` + jaleco *ajustado e skinado*
  (escala 0,90 + envelope SDF do corpo, pesos transferidos) + brincos, broche de laço, faixa e amuleto lunar (rígidos
  presos às juntas). Clipes `*_R5` e `Expressions_R3` removidos; 48 morph targets esparsos mantidos.
- `public/experimental/sophia-actor.js`: um único contexto WebGL2 fora da tela + um GLB servem todos os atores;
  cada ator tem seu esqueleto e um `<canvas>` 2D. Só baixa quando um ator entra na tela.
- `gltf-skel.js` / `gltf-gl.js` estendidos: acessores esparsos, morph por CPU, materiais BLEND, KHR_materials_variants,
  pesos de morph por nó. O caminho legado (`morphWeights`/`meshNode`) não mudou.
- Atributos: `data-sophia-actor|clip|cam(full,bust,head)|yaw|speed|props|mood|variant|reacts`.
- Reserva 2D (3D desliga e a arte volta): `prefers-reduced-motion`, Save-Data, `deviceMemory ≤ 4`, modos
  retrô/sério/mono/e-ink, falha de WebGL/rede. O 3D respeita a cota de laços do `DecorativeMotion`.
- CSP inalterada (`script-src 'self'`, sem `blob:` necessário). `/assets/models/sophia/*` com `Cache-Control` de 1 dia.

## Limitações conhecidas

- O jaleco rasga na barra com a perna erguida (chute) e estica com o braço levantado (soco): as animações da home
  (corrida, expressões) não estão nesses extremos.
- Brincos/amuleto são rígidos nas juntas (não balançam).
- Validação: contrato estático 100/100; testes node idênticos ao baseline (67 falhas pré-existentes por falta de
  `three`/`node_modules` neste ambiente); renderização verificada em Chrome com WebGL (SwiftShader) numa página de teste
  que replica a marcação e usa o CSS real. **`astro build` e os testes baseados em Three não rodaram aqui**, e os
  scripts de QA da 404 (`qa-sophia-404*.mjs`) não foram executados. Nada está aprovado sem a inspeção visual do proprietário.
