# Phrolova — referência para reconstrução vetorial do bastonete

Status: **pesquisa / não implementado**. Em `#sobre`, Phrolova está **estática**; a animação da Shorekeeper permanece habilitada. Não reativar os antigos laços SVG.

## Referências visuais

1. **Reprodução física do bastonete contra fundo claro** — [Cosangas, Phrolova Flower Cosplay Prop](https://www.cosangas.com/products/wuthering-waves-phrolova-cosplay-accessory-prop). A fotografia de produto mostra claramente haste vermelha, anéis dourados, duas inflorescências e estames. **Melhor referência geométrica para traçado de pétalas e haste**, embora não substitua a identidade artística no jogo. Foto de terceiros: usar como referência, não incorporá-la ao site sem autorização.
2. **Item canônico** — [Crimson Baton, Wuthering Waves Wiki](https://wutheringwaves.fandom.com/wiki/Crimson_Baton). Confirma qual é o bastonete da Phrolova; conferir a imagem do item e procurar uma versão maior antes da vetorização.
3. **Galeria de materiais publicados pelos desenvolvedores** — [Phrolova/Gallery](https://wutheringwaves.fandom.com/wiki/Phrolova/Gallery), incluindo os *Resonator Showcase Sketches* e a animação *Weapon Menu*. Usar para validar proporções e funcionamento.
4. **Arte original já usada no site** — `public/phrolova-baton.webp`. Embora de baixa resolução e com notas musicais, é a referência de cor, orientação e silhueta no projeto.

## Protocolo de implementação futura

- Criar primeiro uma folha de comparação (lado a lado) com a imagem original, uma máscara isolada da haste e a flor completa, e um SVG traçado manualmente.
- Traçar componentes separadamente: haste, coroas de pétalas (cada curva real), estames e ornamentos.
- Não tratar as notas musicais e os adornos flutuantes como parte da geometria da haste.
- Só desenhar fitas se houver uma conexão morfológica clara com o bastonete ou uma sequência de quadros/referência do poder da personagem.
- Pré-visualizar estados estático, 25%, 50%, 75% e 100%, verificando se cada um continua reconhecível como a arma da Phrolova.
- Validar em 360/390/768/1440 px e com `prefers-reduced-motion: reduce`.
- Substituir a versão estática **somente depois de aprovação visual**. Não alterar a Shorekeeper nem a seção Música.

## Nota

Uma fotografia de prop é útil para **observação e traçado autoral**, mas não é uma gravura vetorial pronta. O SVG final precisará ser refeito manualmente, sem incorporar imagens ou modelos de terceiros cuja reutilização não esteja autorizada.
