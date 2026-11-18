# Sophia apresenta o método

A Sophia v1.4.1 apresenta o fluxograma com colete bordô, camisa marfim, saia plissada azul-marinho e ponteiro dourado. O SVG posiciona os textos, as caixas e as conexões dentro da face medida da tela. Moldura, pedestal e projetor continuam no WebP estático do cenário.

A composição R4 preserva os 135 quadros e a cadência da atuação R3 publicada no PR #329. O corpo foi redimensionado uniformemente para 78% da altura visual da R3, com as patas próximas à base original. A versão 2D foi usada como referência de posição lateral. Sua altura aparente era semelhante à R3, por isso a redução é uma escolha de composição, sem mudar a escala do modelo 3D.

- Concepção e Documentação são os dois alvos distantes. Sophia se estica na ponta das patas, oscila, perde o equilíbrio, cai e se levanta. A recuperação preserva os olhos semicerrados e a inclinação de cabeça da fonte e ganha uma curva de sorriso em alguns quadros.
- O ponteiro foi recalibrado sobre as poses para chegar ao canto da caixa ativa sem encobrir o texto. Na queda, segue a atuação original. Após a recuperação, volta ao quadro ativo e o ciclo prepara a transição para Concepção.
- Um relógio de 20 segundos seleciona o quadro, a caixa ativa e a seta. As folhas de poses transparentes somam cerca de 720 KiB e são decodificadas só quando a cena pode animar. Fora da tela, com a aba oculta, movimento reduzido ou economia de dados, aparece apenas o pôster.

A composição usa o palco 576 × 414 e o SVG 500 × 360. A camada da atuação ocupa o recorte (154, 113) a (552, 414) no palco. As imagens de poses são três folhas 7 × 7, com células de 230 × 174. As durações e a seleção dos quadros ficam em `src/scripts/method-projection.mjs`. Os arquivos-fonte privados são mantidos fora do repositório.
