# Hsin · pavilhão musical itinerante / lua estática

Base: `main` em `048f6268657911977d04d1ea5780635bacd100ac` (PR #190 já integrado). Reaproveita a lógica musical de #189, sem trazer sua base antiga nem alterar a apresentação E, GLB, rig, atuação, câmera principal ou transição da seção Música. Branch separada; draft contra main, sem merge automático.

## Arquitetura e direção visual

`hsin-music-tower.mjs` constrói geometria real: hall aberto de madeira escura, paredes laterais e fundo espesso, chassis escalonado, dois telhados com beirais curvos, armação de latão, câmaras cilíndricas, conduítes, lanternas frias, quatro rodas com aros/raios, quatro naceles de levitação e coroamento armilar. A linguagem combina um pavilhão chinês de observatório com engenharia lunar, sem reproduzir arquitetura oficial.

São cinco meshes reunidas por material, 4.804 triângulos, nenhum asset ou dependência adicional. Materiais de madeira/ferro/latão recebem a iluminação existente; vidro usa luz própria controlada. O pulso de ativação dura 650 ms, com oscilação idle mínima. Não há vapor volumétrico, partículas extras, engrenagens independentes, novas luzes, sombras ou pós-processamento: o orçamento favorece forma e silhueta.

A posição é reconstruída no mundo numa faixa lateral protegida, com atraso angular amortecido; a construção permanece vertical e sua escala se adapta à legibilidade da fachada. Laterais, cobertura e chassis têm profundidade; não é somente uma moldura. O display é uma superfície HTML projetada sobre a abertura, sem CSS3DRenderer, textura de iframe, recorte ou decoração cobrindo o conteúdo oficial. **Limite híbrido:** o HTML não participa do depth buffer nem de oclusão física; acompanha o centro projetado e fica plano para preservar os controles nativos. Não é arquitetura totalmente fixa.

Em largura abaixo de 800 px ou altura até 540 px a construção continua em 3D, menor, na periferia. O mesmo player HTML ocupa baía inferior (retrato) ou lateral (paisagem). O canvas reserva espaço para o embed: não se sacrifica Hsin para exibir um vídeo minúsculo. Abaixo de 600 × 540 px, o documento pode rolar. Não foi medido desempenho em Android real.

## Estados e provedores

`hsin-music-providers.mjs` centraliza URLs/configuração; `hsin-soundtrack.ts` mantém um único iframe. `HsinSoundtrack.astro` e o CSS isolam apresentação, teclado e fallback.

- `idle` / `provider-selection`: sigilo, frase e opções, sem contato com terceiros.
- `youtube-active`: embed oficial visível, mínimo 200 × 200 px; início completo ou marcador editorial 66 s.
- `spotify-active`: álbum oficial, embed compacto 152 px; disponibilidade/preview controlados pelo Spotify.
- `no-music-fallback`: sigilo e frase; `data-tower-fallback` é o ponto de extensão para Sophia futura.
- `data-info-expanded`: opções/créditos após o player. Escape recolhe e devolve foco.

Orbitar, zoom, alternar lado, abrir/recolher informações e repetir a escolha mantêm o iframe. Trocar fonte remove a anterior; silêncio, página oculta e pagehide encerram o embed. YouTube menos de metade visível é encerrado. Retornar não inicia terceiros automaticamente. Não há download/redistribuição de áudio, SDK, scraping, proxy ou autoplay.

## Lua tridimensional estática

`hsin-lunar-moon.mjs` cria uma esfera 48 × 32, reaproveita o albedo craterado aprovado e aplica luz direcional fixa, escurecimento do limbo e microvariação procedural. É relevo **aparente**, não topografia fisicamente deslocada. Um plano de halo discreto fica atrás da esfera, com posição/orientação estáticas. A esfera sólida, e não esse plano, forma o corpo lunar.

Nenhum clock/uniform de câmera/tempo. `frameSky` mantém compatibilidade com o terraço, mas não move o astro. Sua posição mundial é `[-0.42, 3.03, -10]`; diâmetro aparente inicial segue a textura anterior. Orbitar pode deslocá-lo no enquadramento: consequência intencional da paralaxe, sem prender a lua ao viewport. A cena ambiente passa a 7.230 triângulos/13 meshes; o pavilhão é contado separadamente.

## Fontes e limitações de plataforma

- Vídeo: <https://www.youtube.com/watch?v=Yhf9ur3xPQA>.
- YouTube: <https://developers.google.com/youtube/terms/required-minimum-functionality> e <https://developers.google.com/youtube/terms/developer-policies>.
- Spotify oficial: <https://open.spotify.com/album/0l7zzxlw0HfvGYAJiiWU2F>.
- Embeds e limites: <https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed> e <https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting>.
- Apple Music: <https://artists.apple.com/support/1117-apple-music-marketing-tools>. Mantido link externo; não se promete reprodução integral sem login/assinatura.

CSP acrescenta somente `open.spotify.com` ao frame-src experimental, preservando restrições das demais rotas. Sem reprodução oculta; frames oficiais intactos. O álbum Spotify é funcionalmente suportado, mas sua densidade visual e condições de escuta exigem conferência no aparelho/região de destino.

## QA e decisão de aceite

Executados: `npm run check`, `npm run build`, `git diff --check`. Contratos incluem opt-in, persistência, troca exclusiva, silêncio, ocultação, pagehide, refrão, volume verdadeiro da estrutura, matrizes finitas, orçamento e permanência em 320×740, 393×852 e 844×390. Testes da lua verificam esfera, posição/orientação invariáveis ao orbitar e ausência de uniform de tempo; regressões de atuação/GLB continuam passando.

O navegador abriu a rota e confirmou a interface, mas a cena informa **WebGL2 unavailable**. O pôster de reserva é antigo: não representa o pavilhão nem a esfera novos. Portanto não há screenshot de aprovação 3D, validação GPU do shader, medição de FPS ou conclusão estética definitiva. Não declarar que a lua já atingiu o acabamento final ou que o player parece fisicamente encaixado em todos os ângulos.

**Pronto para revisão visual; não recomendado para merge cego.** Conferir em desktop WebGL2 e Android: telhados/naceles, sobreposição ao cabelo/rosto/caudas, encaixe da fachada no zoom/orbita, luz dos metais, volume/crateras/halo da lua, altura disponível no mobile, escolha entre fontes, densidade do Spotify, foco, movimento reduzido e retorno da página. Limites ainda mais claros: HTML plano sem depth occlusion; baía móvel deliberadamente híbrida; modelo geométrico estilizado sem texturas novas; Apple externo.
