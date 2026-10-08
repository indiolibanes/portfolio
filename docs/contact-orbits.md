# Encerramento triforcêntrico

A Triforce permanece no centro, com halo dourado pulsante. Quatro corpos preservam as referências do portfólio: Emil, prisma, cogumelo e bloco Mario. Os tamanhos são uma hierarquia visual inspirada nos planetas, sem pretender escala astronômica literal.

| Corpo | Elipse (% do palco) | Inclinação | Período | Largura (% do palco) |
|---|---|---|---|---|
| Cogumelo | 48 × 30 | −14° | 19 s | 6 |
| Bloco Mario | 64 × 42 | 24° | 29 s | 7 |
| Prisma | 78 × 55 | −22° | 43 s | 17, em formato largo |
| Emil | 87 × 70 | 12° | 61 s | 14, em formato circular |

`offset-path: ellipse(...)` produz a trajetória, com `offset-rotate: 0deg` e compensação da inclinação no corpo. Cada wrapper tem fase e duração próprias. Microgestos ficam em um elemento interno, para não alterar a trajetória. Emil oscila e recebe um brilho leve; o prisma revela seis raios em sequência; os corpos menores flutuam discretamente.

O componente `TriforceSystem.astro` e a folha `contact-orbits.css` isolam a alteração no Contato. A composição ocupa a coluna direita no desktop e fica abaixo dos botões até 920 px. Texto e ações têm camadas superiores; a arte não intercepta eventos. O botão “Pausar órbitas” controla todo o movimento e informa seu estado com `aria-pressed`. Sem JavaScript a cena fica estática. O controle existente de visibilidade pausa a animação fora do viewport. Movimento reduzido e modo Editorial usam composição estática; Legacy recolhe a decoração. Navegadores sem suporte à elipse usam posições estáticas.

Emil usa enquadramento CSS do asset original. Prisma, Triforce e ícones Mario usam SVG, sem novos assets raster ou serviços externos. Música, Sobre, Laboratório e Percurso permanecem intactos.

Validação: build Astro; Chromium em 360, 390, 430, 768 e 1440 px; amostragem de posições a cada 500 ms ao longo de 61 s, sem cruzamento do texto ou saída do palco; quatro corpos visíveis; botão de pausa; movimento reduzido; modos Editorial e Legacy; ausência de erros JavaScript. Capturas visuais conferidas em desktop e mobile.
