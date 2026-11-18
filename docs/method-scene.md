# Sophia apresenta o método

A seção 03 usa uma paleta de verde de eucalipto e uma apresentação no canto superior direito. Sophia aparece como apresentadora, em traje acadêmico: colete bordô com botões e corrente dourados, camisa marfim com laço, saia plissada azul-marinho e um ponteiro dourado preso à mão. Orelhas azul-marinho, olhos âmbar e a única cauda cósmica com constelações seguem a Sophia v1.4.1.

O fluxograma segue concepção, execução, avaliação e registro. Avaliação recebe o destaque dourado e o ponteiro, pois a revisão humana orienta as decisões seguintes. Textos, caixas, setas e a face da tela continuam SVG acessível; a moldura da tela, o pedestal, o projetor, a Sophia e o ponteiro são objetos 3D pré-renderizados em um único WebP transparente que fica por cima do SVG.

## Animação

- O ciclo do fluxograma continua em 20 segundos (CSS).
- O WebP da Sophia é um loop independente de 36 quadros (576 × 414, ~3 s): respiração, leve movimento da cabeça, balanço da cauda, duas piscadas (a primeira no quadro 11) e um tremor das orelhas.
- O gerenciador de movimento decorativo pausa a cena fora da área visível, com a página oculta e com preferência por movimento reduzido. Nesses casos, entra o poster estático (`method-presenter-r1-still.webp`). Em telas até 820px, a cena fica abaixo da introdução.

## Assets e privacidade

`public/images/sophia/method-presenter-r1.webp` (loop com alfa, ~570 KB) e `method-presenter-r1-still.webp` (poster, ~22 KB). O GLB da Sophia, os arquivos Blender e as texturas de origem são privados e não entram no repositório; os quadros foram renderizados fora do navegador.

Componente: `src/components/MethodPresenter.astro`. Estilo: `src/styles/method-scene.css`. Teste: `tests/method-presenter-r1.test.mjs`.
