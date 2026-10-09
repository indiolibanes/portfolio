# Sophia apresenta o método

A seção 03 usa uma paleta de verde de eucalipto e uma apresentação no canto superior direito. Sophia conserva a identidade do template `lab-single-tail.webp`, com terninho azul-marinho, camisa clara e os adornos originais.

O fluxograma segue concepção, execução, avaliação e registro. Avaliação recebe o destaque dourado e a ponteira, pois a revisão humana orienta as decisões seguintes. Tela, textos e projetor são SVG; as expressões da personagem usam um sprite transparente com poses registradas na mesma escala e posição.

O ciclo dura 4,8 segundos, com piscar e olhar para o público. O gerenciador existente pausa a cena fora da área visível, com a página oculta e quando há preferência por movimento reduzido. Essa preferência também carrega uma pose estática. Em telas até 820px, a cena fica abaixo da introdução.

Assets: `public/images/sophia/method-presenter.webp` (quatro quadros de 640 × 704, com retorno à primeira pose) e `method-presenter-still.webp` (640 × 704). O componente é `src/components/MethodPresenter.astro`; o estilo está em `src/styles/method-scene.css`.

Validação: build Astro, contrato de UX (34 verificações), renderização desktop de 1440px e móvel de 390px, ausência de transbordamento horizontal e preferência por movimento reduzido.
