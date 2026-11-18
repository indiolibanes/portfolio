# Sophia apresenta o método

A seção 03 usa uma paleta de verde de eucalipto e uma apresentação no canto superior direito. Sophia aparece como apresentadora, em traje acadêmico: colete bordô com botões e corrente dourados, camisa marfim com laço, saia plissada azul-marinho e um ponteiro dourado preso à mão. Orelhas azul-marinho, olhos âmbar e a única cauda cósmica com constelações seguem a Sophia v1.4.1.

O fluxograma segue concepção, execução, avaliação e documentação (que volta a orientar a concepção). Textos, caixas, setas e a face da tela continuam SVG acessível; a moldura da tela, o pedestal e o projetor (camada de cenário) e a Sophia com o ponteiro (camada animada) são pré-renderizados em WebP transparente por cima do SVG.

## Animação (20 s, sincronizada com o fluxograma)

- O WebP da Sophia dura exatamente 20 s (135 quadros com duração variável: mais quadros na queda e nas trocas, menos nas pausas) e acompanha o destaque do momento: a cada 5 s ela aponta a etapa em destaque; na troca, o ponteiro (telescópico) já vai para a próxima.
- A Sophia fica parada no mesmo plano da versão 2D (à direita da tela, ~65% da altura do quadro), sem sair do lugar. Nas etapas da esquerda (Concepção e Documentação) ela gira para a tela, sobe na ponta dos pés (calcanhares fora do chão), estica o braço e o ponteiro telescópico, oscila cada vez mais, perde o equilíbrio (~1,9 s e ~16,9 s), cai com os braços em moinho, fica zonza, senta, levanta passando do ponto, faz uma cara desengonçada (olhos semicerrados, cabeça torta, cauda e orelhas) e volta a apontar.
- Respiração, balanço da cauda, piscadas e tremor das orelhas continuam.
- Ao entrar em movimento, o script decodifica as duas camadas e reinicia as animações CSS do fluxograma junto com o loop. Fora da tela, com a página oculta ou com movimento reduzido, entra o poster estático (`method-presenter-r1-still.webp`) e o loop não é baixado. Em telas até 820px, a cena fica abaixo da introdução.

## Assets e privacidade

`method-presenter-r1-loop.webp` (Sophia, 286 × 244, ~585 KB), `method-presenter-r1-scene.webp` (cenário, ~3 KB) e `method-presenter-r1-still.webp` (poster, ~16 KB) em `public/images/sophia/`. O GLB da Sophia, os arquivos Blender e as texturas de origem são privados e não entram no repositório; os quadros foram renderizados fora do navegador.

Componente: `src/components/MethodPresenter.astro`. Estilo: `src/styles/method-scene.css`. Teste: `tests/method-presenter-r1.test.mjs`.
