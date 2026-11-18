# Sophia apresenta o método

A Sophia v1.4.1 apresenta o fluxograma com colete bordô, camisa marfim, saia plissada azul-marinho e ponteiro dourado. A moldura, o pedestal e o projetor continuam no WebP estático do cenário. Os rótulos e as setas continuam em SVG, recortados na face da tela. A descrição do fluxo acompanha a figura para tecnologias assistivas.

O WebP animado preserva as poses do PR #329 e o ritmo de 20 segundos. Sophia está 5,8% mais alta do que na primeira composição do PR #330, com a mesma âncora nas patas. O tamanho é um ajuste da projeção da personagem, e o ponteiro foi recalibrado para voltar à caixa ativa depois da queda. Concepção e Documentação continuam com a sequência de alcançar, oscilar, cair, sorrir e retomar.

A figura usa `<picture>` com WebP nativo de 480 × 345 px. A caixa colorida faz parte dos mesmos quadros que a personagem, de modo que o destaque e o gesto repetem juntos. Os rótulos e as setas em vetor ficam por cima do ponteiro. O carregamento é lazy e o navegador seleciona um pôster independente para movimento reduzido ou preferência de economia de dados quando disponível.

A composição anterior usava três folhas WebP estáticas. O pôster só mudava depois que o gerenciador liberava a animação e todas as folhas terminavam de decodificar. A nova figura reproduz os quadros diretamente no navegador, inclusive com JavaScript desativado. A origem 3D fica fora do repositório.

A validação do cabeçalho, transparência, quadros e duração roda em `tests/method-presenter-r1.test.mjs`.
