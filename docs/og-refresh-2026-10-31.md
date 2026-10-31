# Atualização da Open Graph — 31/10/2026

## Direção criativa

O cartão deixa de apresentar uma legenda de meme e passa a tratar o portfólio como um **laboratório autoral**: escrita, documentação, interfaces e experiências interativas. A mensagem principal é **“Escrita, sistemas e mundos possíveis.”** Não há redefinição da formação nem alegação de experiência profissional adicional.

## Preservação da Sophia

A fonte `assets/og-portfolio.png` preserva o enquadramento original, os óculos e a **pata erguida junto ao rosto**. O build aplica, via Sharp, um painel editorial no lado esquerdo que oculta a tipografia antiga sem regenerar a personagem, alterar os olhos ou deslocar a pose.

O arquivo-fonte PNG atualmente versionado ainda é uma matriz histórica com texto anterior. Apenas `public/og-portfolio.jpg`, regenerado durante o build, é publicado nas tags OG/Twitter; o script offline `build-og-card.py` foi alinhado para deixar futuras regenerações da matriz sem texto. Essa decisão evita reinterpretar a personagem ou depender de ferramentas externas para substituir seu desenho.

## Metadados

- `SITE.ogImage`: `/og-portfolio.jpg?v=20261031-og2` para invalidação parcial de caches.
- `SITE.ogImageAlt`: descreve a Sophia e o conteúdo atual, sem a legenda antiga.
- `SITE.description`: integra a dimensão editorial e experimental sem abandonar a documentação.
- `PROFILE.tagline`: referencia os experimentos interativos, preservando a escrita como eixo.

## Verificação

```sh
npm run check:og
npm run check:ux
npm run build
```

Confirmar no JPG gerado: 1200 × 630, legibilidade dos dois blocos de texto em miniatura, ausência da legenda antiga, preservação dos óculos e da pata erguida. A prévia social depende de cache específico de WhatsApp, Telegram, Discord, X e outros serviços; nem o build nem a mudança de query asseguram atualização imediata em todos.

O GIF público antigo foi **retirado**, porque ainda expunha a legenda anterior embora não fosse referenciado pelo Open Graph. A animação só será recriada sob demanda com `python3 scripts/build-og-card.py --gif`, sem textos incorporados; esta opção não faz parte do build.
