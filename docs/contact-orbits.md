# Encerramento triforcêntrico

A Triforce permanece no centro, com halo dourado pulsante. Oito corpos usam somente referências de jogos: Pokébola, Emil, cogumelo Mario, insígnia de Assassin’s Creed, Final Fantasy VII, Kingdom Hearts, Overwatch e Wuthering Waves. Os tamanhos são uma hierarquia visual inspirada nos planetas, sem pretender escala astronômica literal.

| Corpo | Elipse (% do palco) | Inclinação | Período | Largura (% do palco) |
|---|---|---|---|---|
| Cogumelo Mario | 44 × 30 | −14° | 23 s | 6 |
| Pokébola | 49 × 36 | 8° | 31 s | 6,5 |
| Assassin’s Creed | 58 × 45 | 20° | 41 s | 8 |
| Overwatch | 66 × 49 | −18° | 53 s | 8 |
| Kingdom Hearts | 81 × 60 | −24° | 67 s | 10 |
| Emil | 86 × 65 | 10° | 79 s | 13 |
| Final Fantasy VII | 68 × 76 | −8° | 97 s | 23, formato largo |
| Wuthering Waves | 70 × 80 | 12° | 113 s | 24, formato largo |

`offset-path: ellipse(...)` produz a trajetória, com `offset-rotate: 0deg` e compensação da inclinação no corpo. Cada wrapper tem fase e duração próprias. Microgestos ficam em um elemento interno, para não alterar a trajetória. Emil oscila e recebe um brilho leve; os demais corpos flutuam discretamente. As fases distribuem os oito logos ao redor do núcleo; os logos largos ocupam elipses mais altas para caber por inteiro.

O componente `TriforceSystem.astro` e a folha `contact-orbits.css` isolam a alteração no Contato. A composição ocupa a coluna direita no desktop e fica abaixo dos botões até 920 px. Texto e ações têm camadas superiores; a arte não intercepta eventos. O botão “Pausar órbitas” controla todo o movimento e informa seu estado com `aria-pressed`. Sem JavaScript a cena fica estática. O controle existente de visibilidade pausa a animação fora do viewport. Movimento reduzido e modo Editorial usam composição estática; Legacy recolhe a decoração. Navegadores sem suporte à elipse usam posições estáticas.

Emil usa enquadramento CSS do asset original. Triforce, Pokébola e cogumelo usam SVG. Os cinco logos importados são hospedados no próprio repositório, sem chamadas externas em execução. Overwatch foi convertido para WebP transparente; os outros quatro permanecem vetoriais. O prisma e o bloco foram removidos apenas desta composição. Música, Sobre, Laboratório e Percurso permanecem intactos.

Validação: build Astro; Chromium em 360, 390, 430, 768 e 1440 px; amostragem de posições a cada 500 ms ao longo de 113 s, sem cruzamento do texto ou saída do palco; oito corpos visíveis; botão de pausa; movimento reduzido; modos Editorial e Legacy; ausência de erros JavaScript. Capturas visuais conferidas em desktop e mobile.


## Fontes dos logos

- Assassin’s Creed: [Assassin insignia.svg](https://commons.wikimedia.org/wiki/File:Assassin_insignia.svg), Ubisoft Entertainment; versão de RootOfAllLight, CC BY-SA 4.0. Asset vetorial preservado; inversão de cor via CSS no tema escuro.
- Kingdom Hearts: [Kingdom Hearts logo.svg](https://commons.wikimedia.org/wiki/File:Kingdom_Hearts_logo.svg), símbolo coração/coroa da franquia, asset preservado.
- Overwatch: [Overwatch circle logo2.svg](https://commons.wikimedia.org/wiki/File:Overwatch_circle_logo2.svg), Gameposo, CC BY-SA 4.0. Conversão do raster embutido para WebP 256 px, sem alteração do desenho; versão convertida sob a mesma licença.
- Wuthering Waves: [Wuthering Waves logo.svg](https://commons.wikimedia.org/wiki/File:Wuthering_Waves_logo.svg), Kuro Games, vetorização Argenti Aertheri/VulcanSphere; asset preservado e inversão de cor via CSS no tema escuro.
- Final Fantasy VII: [Freebie Supply](https://freebiesupply.com/logos/final-fantasy-vii-logo/), logo Square Enix. O wordmark vetorial claro contrasta sobre o céu escuro sem bloco de fundo.

Marcas e personagens pertencem aos respectivos titulares. [Licença CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Refinos visuais

A Triforce ocupa 27% do palco com um halo dourado mais amplo e brilhante, mantendo a pulsação lenta. Wuthering Waves recebe anéis elípticos inclinados em duas camadas sobrepostas, atrás e à frente do logo. O contorno e o brilho dos anéis são reduzidos no modo sério; movimento reduzido desativa animações.
