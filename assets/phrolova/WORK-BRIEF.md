# Work — Crimson Baton / Phrolova

> **Etapa preparada, animação NÃO autorizada ainda.**
> Repositório: `indiolibanes/portfolio`; branch `main`; área futura: `#sobre`.
> Shorekeeper funciona e **não deve ser alterada**. Phrolova está estática de propósito.

## Tarefa curta para colar no Work

> Trabalhe apenas na **reconstrução vetorial estática do Bastonete Carmesim da Phrolova**. Antes de pesquisar algo, abra `assets/phrolova/references.json` e `assets/phrolova/reference-board.svg`; ambos já estão indexados. Use como geometria principal `public/phrolova-baton.webp` (a imagem realmente presente no portfólio), validada com as quatro fotografias angulares linkadas no JSON e os esboços publicados pelos desenvolvedores indicados ali. **Crimson Baton é o item de missão da Phrolova, não Lethean Elegy (o violino)**. Trace *manualmente* haste, junções, coroas de pétalas, estames e ornamentos em **grupos SVG independentes**, preservando a forma e a proporção do original. Não faça `image trace` sem inspeção, não trate as notas musicais como haste e não invente laços. Entregue `assets/phrolova/crimson-baton-vector-draft.svg` e uma sobreposição lado a lado sobre a imagem original. **Pare nessa etapa**: não altere `HeroMicroInteractions.astro`, CSS, Shorekeeper, Música, nem implemente animação. Somente depois de verificar visualmente o SVG, comite os arquivos de estudo e apresente a comparação para aprovação. Se o material não permitir fidelidade, descreva o que falta em vez de improvisar.

## Onde está tudo

- `assets/phrolova/references.json` — índice estruturado de **7 referências externas** (4 fotos + ícone canônico + esboços + showcase), procedência e limitações.
- `assets/phrolova/reference-board.svg` — prancha 1460 × 950, **autocontida**, que mostra a arte local completa e detalhes ampliados da flor e haste.
- `public/phrolova-baton.webp` — imagem já presente no portfólio, **principal referência da aparência no site**.
- `docs/phrolova-vector-reference.md` — contexto anterior e critérios de fidelidade.
- `src/components/HeroMicroInteractions.astro` — **NÃO EDITAR** na etapa de vetorização: a Phrolova deve ficar estática e a Shorekeeper intacta.

## Ordem de trabalho (restringe tokens e retrabalho)

1. Leia o JSON e abra a prancha local. **Não repita pesquisas gerais** de Phrolova, armas ou Wuthering Waves.
2. Inspecione **somente** as quatro fotos diretas e os esboços que forem necessários para resolver contornos ambíguos. Fotos mostram uma reprodução física de duas flores, **não** arte vetorial oficial; não copiar pixels da foto para o repositório.
3. Modele grupos independentes no SVG (no mínimo `staff`, `junction`, `petals-front`, `petals-back`, `stamens`, `ornaments`). Preserve geometria, desdobramentos, bordas e espessura.
4. Gere uma comparação visual em escala idêntica: original x SVG x sobreposição 50%. Abra a imagem em navegador; corrija até que a silhueta não mude indevidamente.
5. Faça **somente commit de arte de estudo** após a revisão. Relate o hash e ressalvas. Não modifique o site ainda.

## Condições de aprovação para animar depois

- Silhueta da inflorescência e haste reconhecível, sem uma rosa genérica ou segmentos artificiais.
- Nenhuma duplicação de flor, corte nas pétalas ou deformação dos estames.
- Notas musicais e energia são camadas distintas do objeto físico.
- Laços/fita **só** serão animados a partir de geometria aprovada e com referência visual identificável para a transformação.
- Somente após sinal verde: CSS/SVG na seção `#sobre`, sem alterar o efeito da Shorekeeper nem os eventos da Música; testar em 360/390/768/1440 px, `prefers-reduced-motion`, modos sério/Legacy.

## Origem e direitos

Os quatro links de fotografias comerciais e as imagens do jogo são **fontes externas de consulta**. Não estão copiadas para `assets/` e não devem ser republicadas sem direitos de uso. A prancha SVG contém apenas uma cópia autocontida do `public/phrolova-baton.webp` que já estava no repositório.

## Nota sobre o modelo

Para esta etapa focada, começar no **Work + Astra em esforço Médio**, se disponível. Só elevar para Alto se o recorte/tracing manual de contornos falhar, **sem relançar pesquisa ampla**. Não é necessário gastar outra sessão completa para implementar movimento enquanto a geometria ainda não foi aprovada.
