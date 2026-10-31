# Sophia /404 — Legacy e 7B E1

## Arquivos efetivos

- Fliperama: `public/experimental/sophia-alpha.glb` (Alpha 6H, com esqueleto). A câmera enquadra o busto; a raiz da cauda antiga é recolhida e o livro e a caneta ficam invisíveis. Identificação no gabinete: **SOPHIA / LEGACY**.
- Quarto 2.5D: **`public/experimental/sophia-7b-e1-latest.glb`**. O arquivo já está na pasta, então não há necessidade de outro upload ou de um modelo denominado `sophia-7b-e1-stage.glb`.

## Movimento e fidelidade

A 7B E1 Latest é uma malha com materiais e texturas, mas sem esqueleto e sem animações glTF embutidas. O renderer faz pequenas oscilações de rotação/translação na raiz (`procedural-root`), acompanhando `idle`, `playing`, `cheer` e `over` do Tetris. Isso **não** corresponde a caminhar, apertar botões com dedos/patas, ou a animar cauda, olhos e braços independentemente.

A personagem da sala mantém as proporções e os materiais originais; a iluminação vem do cenário Three.js. A Alpha antiga não é carregada como substituta da 7B em caso de erro.

## Comportamento seguro

- A fonte da verdade para a 7B é a URL literal `/experimental/sophia-7b-e1-latest.glb`.
- SVG vetorial de reserva no quarto quando o GLB não carrega, WebGL não está disponível ou quando o usuário prefere movimento reduzido / economia de dados.
- Carregamento sob demanda, sem renderizar continuamente fora da viewport, preservando a lógica de Tetris 2D.
- Verificações: `node scripts/check-sophia-7b.mjs`, `npm run build`, `npm run check:tetris` e `node scripts/qa-sophia-404.mjs` após iniciar o preview local.

## Futuro rigging

Para movimentos independentes de patas, braços, dedos ou cauda, produzir uma nova versão rigada e validá-la visualmente antes de modificar novamente o loader. Não fingir articulação por deformações arbitrárias de vértices ou assegurar que os quatro clipes da versão Stage existam no arquivo Latest.
