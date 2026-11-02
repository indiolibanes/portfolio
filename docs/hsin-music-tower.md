# Hsin · Farol lunar / Music Tower

Base: PR #186, `08018bb4c196eb406c1b7d79399b347297abf58a`, com palco canônico em `/experimentos/` e transição da seção Música já integrada. Entrega em branch separada, PR draft empilhado sobre #186; sem merge automático.

## Resultado

O dock tornou-se uma fachada de observatório: latão, ferro azulado, arco astronômico, quatro rebites, pilares e base no cenário. A superfície interativa é HTML alinhada com a moldura Three.js. Isso permite deixar os controles oficiais dos provedores íntegros, planos e acessíveis, sem renderizar um iframe como textura ou acrescentar CSS3DRenderer.

Em desktop, a fachada ocupa uma faixa periférica, com atraso angular amortecido na órbita. A torre é reposicionada no mundo e orientada para a câmera; sua escala se adapta para manter o player legível. Os pilares chegam ao piso. Não é arquitetura fixa com oclusão física do iframe: é uma solução híbrida, com envelope lateral limitado. A câmera principal e o GLB permanecem iguais.

Em retrato abaixo de 800 px, reserva-se uma baia inferior; o canvas se reenquadra acima dela. Em paisagem de celular com até 540 px de altura, a baia fica na lateral. A estrutura WebGL é desativada nessas duas adaptações, e a moldura HTML preserva a identidade do farol. Em retrato muito curto, a página pode rolar; vídeo YouTube com menos de metade visível é encerrado. Não há tentativa de forçar o embed pequeno demais sobre o rosto da Hsin.

## Estado e playback

- `idle`: sigilo e frase poética, sem rede de terceiros.
- `provider-selection`: foco na escolha inicial.
- `youtube-active`: iframe oficial visível, 200 px de altura mínima, largura mínima de 200 px. Início completo ou marcador editorial de 66 s nas opções.
- `spotify-active`: álbum oficial em embed compacto de 152 px. O provedor controla as possibilidades de escuta; prévias são possíveis.
- `no-music-fallback`: mesmo sigilo, com slot `data-tower-fallback="lunar-sigil"` reservado para uma futura arte da Sophia.
- `data-info-expanded`: créditos e opções aparecem abaixo do player. Escape os recolhe sem remover o iframe.

Apenas um iframe é mantido. Escolher outro provedor remove o anterior. Repetir a mesma escolha, orbitar, aproximar, alternar lado ou abrir/recolher informações não recarrega o player. Nenhum autoplay programático. Ocultar a página ou sair dela encerra o embed. Não há armazenamento de preferência que recarregue terceiros sem nova escolha.

## Fontes e limitações

- YouTube oficial: <https://www.youtube.com/watch?v=Yhf9ur3xPQA>.
- Requisitos de tamanho e proibição de sobreposição ao vídeo: <https://developers.google.com/youtube/terms/required-minimum-functionality>.
- Sem player oculto/extração de áudio: <https://developers.google.com/youtube/terms/developer-policies>.
- Álbum Spotify confirmado pelo oEmbed oficial: <https://open.spotify.com/oembed?url=https://open.spotify.com/album/0l7zzxlw0HfvGYAJiiWU2F>.
- Incorporação Spotify: <https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed>.
- Limites de reprodução/DRM: <https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting>.
- Apple Music oferece embed e prévias públicas de 30 s; não garante a trilha completa para visitantes sem assinatura/login. Mantido link externo: <https://artists.apple.com/support/1117-apple-music-marketing-tools>.

Nenhum arquivo de áudio, SDK, proxy de mídia ou token foi introduzido. CSP amplia somente o `frame-src` da rota experimental para `open.spotify.com`. O header de referrer continua `strict-origin-when-cross-origin`. A ornamentação fica fora do retângulo dos embeds.

## Performance e acessibilidade

- Cinco draws / 436 triângulos adicionais para a estrutura em desktop; zero textura nova.
- Geometrias reunidas por material e pilares instanciados. Três materiais básicos; sem sombra dinâmica, bloom ou luz extra.
- Mesmo ciclo de render do palco. Sem novo rAF ou relógio independente; acompanha pausa, visibilidade e descarte existentes.
- Medidas DOM são atualizadas por resize/mudança do painel; não são lidas em cada frame. Movimento HTML usa apenas translação, nunca escala do iframe.
- `prefers-reduced-motion`: sem amortecimento ou animação decorativa.
- Grupos e botões com nomes, `aria-pressed`, créditos com `aria-expanded`, status com anúncio polido, foco de teclado e Play nativo.

## QA e aceite

Executados com sucesso:

- `npm run check`: UX 100/100, API, Tetris, estado musical, transição, Hsin e Sophia.
- `npm run build`: geração de assets, Astro e verificação OG.
- `node --test tests/hsin-*.test.mjs`: 30 arquivos passam. Os testes que exigem modelos privados não fornecidos continuam emitindo seu aviso de skip interno; o teste do GLB público roda normalmente.
- Teste novo de comportamento: opt-in; identidade do iframe ao abrir informações/mover a torre/repetir provedor; substituição exclusiva; silêncio; visibilidade e pagehide; início em 66 s.
- Construção Three.js real: matrizes finitas nos dois lados e limites de órbita, geometria e faixa central protegida; orçamento da torre.
- Navegador: fachada de fallback e carregamento dos embeds oficiais observados. YouTube exibiu os controles oficiais; Spotify exibiu o álbum e a indicação de prévia.

**Limite concreto:** navegador de QA informa `WebGL2 unavailable`. O fundo mostrado nessas verificações é o pôster existente, não um render 3D ativo. Não há aprovação visual da ancoragem/movimento da estrutura Three.js, medição de FPS/GPU ou prova de reprodução integral autenticada. Os custos geométricos acima são contagens estruturais.

**Spotify:** funcional no embed compacto, mas o álbum é visualmente mais denso do que o sigilo/YouTube. Precisa de avaliação estética no aparelho real; não declarar acabamento final ou escuta integral gratuita.

**Aceite recomendado:** revisão visual, não merge imediato. Conferir WebGL em desktop e Samsung Internet: enquadramento e sombra visual do farol, órbita/zoom, escolha de lados, portrait/landscape, controles nativos, troca de provedor, créditos e retorno à página. Os embeds podem variar com região, conta, cookies e bloqueadores.
