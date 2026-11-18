# Passagem de Sophia por Saturno

O trecho continua a sequência do foguete em `/modo-imersivo/`. Saturno entra no quadro a partir de 13,5 s de cena, a menor distância ocorre aos 22 s e a câmera começa a deixar o foguete seguir aos 23,5 s. O foguete some na distância aos 40 s. A cena usa o relógio da decolagem, incluindo pausa, repetição e a opção de câmera automática.

## Escala e movimento

- O globo usa 60.268 km de raio equatorial, 54.364 km de raio polar, obliquidade de 26,73° e rotação de 10,656 h (Sistema III). [Ficha de Saturno da NASA](https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html)
- O modelo mostra os anéis C, B, A e F em suas proporções, com a Divisão de Cassini. O padrão dos anéis avança a uma velocidade angular que varia com o raio, na aproximação kepleriana. A iluminação calcula sombras do globo nos anéis e dos anéis no globo. [Ficha dos anéis da NASA](https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html)
- A trajetória de referência é retilínea no referencial do planeta, com distância mínima de 82 milhões de km. A estimativa conservadora do raio de Hill, calculada no afélio por `rH = r × (GM_saturno / (3 × GM_sol))^(1/3)`, é de 68,81 milhões de km. A gravidade é gradual e essa fronteira é uma aproximação para a região de domínio gravitacional. [Parâmetros astrodinâmicos do JPL](https://ssd.jpl.nasa.gov/astro_par.html)
- A relação de tamanhos entre globo e anéis é física. O fundo usa ampliação óptica para Saturno dominar o quadro. O afastamento da nave é encenado em perspectiva com o modelo em tamanho constante. Cada segundo de cena representa 2.400 s na referência astronômica. A velocidade de cruzeiro de 12.000 km/s é ficcional. A composição representa uma passagem em torno do referencial local de Saturno, sem posição orbital por data nem integração gravitacional de múltiplos corpos. Redução de movimento estabiliza as texturas do planeta e dos anéis.

## Revisão

`npm run check:sophia` inclui as verificações da rotação, separação dos anéis, trajetória e repetição da decolagem. Em `/modo-imersivo/?launchQA=1`, os tempos 17, 22, 25, 30, 35 e 40 permitem revisar aproximação, passagem e afastamento no visualizador existente.
