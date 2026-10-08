# Preparação para implementação — auditoria GUI/UX/UI
Data: 2026-10-08
Repositório: `indiolibanes/portfolio`
Branch de trabalho: `audit/gui-ux-foundation-20261008`
Base inicial: `main` (commit `75b602db4d`)

## Fonte e limite da auditoria

Fonte: PDF **Auditoria GUI/UX/UI — kaue.pages.dev** (11 páginas), cuja análise examinou principalmente HTML da home e de `/sophia`, sem observação direta de CSS, renderização, foco, motion ou viewports.

Esta preparação **revalidou o HTML-fonte e componentes no GitHub**, não a experiência renderizada. Os resultados estáticos não substituem testes no navegador, screenshots ou resultados do Cloudflare.

## Restrições obrigatórias

- **Não avaliar nem modificar a seção `#metodo` / "Métodos".** Ela existe na versão atual mesmo que não estivesse presente na auditoria HTML.
- Preservar os três modos **Autoral / Editorial / Legacy 1998**, alternados no mesmo botão. O item do PDF que pede `role="switch"` binário **não se aplica** a este controle de três estados; manter botão com rótulo de estado e próxima opção legíveis.
- Preservar composições, ilustrações, textura, cores, fontes, personagens, animações autorais, geometrias estáticas da Shorekeeper e do Crimson Baton, bem como a seção Música e seus elementos.
- Evitar alterações de conteúdo/editoriais e substituição de URLs pessoais sem confirmação.
- Não introduzir bibliotecas sem necessidade. Nunca incluir credenciais Last.fm no repositório.
- Não mesclar nem publicar na `main` antes de validação funcional e visual.

## Reconciliação de achados com a versão atual

| Tema do PDF | Situação verificada no código | Ação |
| --- | --- | --- |
| H3 ausentes e links com nome acessível longo | `src/pages/index.astro` tem H3 nos cinco cards e `aria-labelledby` apontando para o H3 e aviso de nova aba nos cards 02, 03, 05 | **Já resolvido em código**; conferir leitor de tela |
| Cards clicáveis 02/03/05 versus 01/04 | 02/03/05 são links; 01/04 são `article`; CSS de elevação usa `a.lab-project-card:hover` | Sem alteração estrutural; verificar affordance em tela/teclado |
| Status heterogêneos | Atualmente os cinco cards usam predominantemente `Em andamento` e `Publicado` | **Já padronizado**; não inventar terceiro status |
| Âncora Música só depois do JS | `MusicShelf.astro` renderiza `<section id="musica">` de forma estática, `<noscript>` com link Last.fm, elementos de status e estados de erro/vazio/track | **Já resolvido em código**; testar sem JS, com API 500 e timeout |
| Música com atualização contínua | Polling atual de **90 s** e `visibilitychange`; anúncio `aria-live` condicionado à mudança da faixa | Manter; verificar condições de erro e status inicial |
| Reduced motion decorativo | `DecorativeMotion.astro` limita loops visíveis a dois, observa viewport/visibilidade e preferência de movimento; `MotionImage.astro` usa still | **Implementação parcial verificável**; testar fontes de motion fora desses mecanismos |
| Foco e scrollspy | `PortfolioHeader.astro` possui `aria-current` via observer na navegação e nos chips; `global.css` possui `a:focus-visible` | Teste manual obrigatório nos três modos |
| "Trabalhos" difere de "Laboratório" | Nav principal já usa `Laboratório`; hero ainda diz "Explorar trabalhos" como ação, coerente com seu destino | **Já resolvido** |
| Repetição do nome e CTAs no hero | Kicker sem nome; CTAs agrupados após manifesto: explorar, conversar, currículo; glifos internos ↘ e download ↓ | **Já resolvido**; hierarquia visual pendente |
| Dois links adjacentes para Sophia | `SophiaAnimation variant="lab" linked={false}` e apenas o link `.lab-sophia-guide` no bloco | **Já resolvido** |
| Last.fm divergente | `SOCIALS.lastfm` aponta para `kauealencar123`; `lastfmHandle` corresponde | **Já resolvido** |
| LinkedIn e estrela no Contato | LinkedIn aparece como terceira ação; estrela tem `aria-hidden="true"` | **Já resolvido** |
| Percurso sem cronologia | Quatro marcos, com datas/identificadores em `background` | **Já evoluiu**; validar ritmo visual |
| Bastidores com heading opaco | H2 reescrito: "O trabalho também vive no código — e aqui ele está à vista." | **Já evoluiu** |
| Sigilo Sophia e marcadores 01–04 | `sophia.astro` tem `button`, `aria-controls`, `aria-describedby`, botões de fragmentos com `aria-label` e `aria-pressed` | **Já resolvido em código** |

## Pendências reais / bloqueios de verificação

### P0 — validação de acessibilidade e robustez

1. **Teclado/leitor de tela**: ordem do Tab; foco perceptível para navegação, chips, cards, botões e 3 modos; link dos projetos lido como título + abertura em nova aba.
2. **Música**: sem JS, API 500, resposta vazia, rede lenta e transição de "tocando agora" para "ouvido recentemente"; nenhum salto de layout relevante.
3. **Motion**: `prefers-reduced-motion: reduce` e página oculta; validar todos os loops e animações, inclusive os que não usam `data-decorative-motion`.
4. **Responsividade**: verificar em 360, 390, 430, 768, 1024 e 1440 px, nos três modos. Sem scroll horizontal, truncamento ou botões minúsculos.

### P1 — refinamentos apenas após inspeção visual

5. Harmonia das composições do Laboratório: preservar cada "figurino", verificar alinhamento de número/status/kicker/H3/Sophia/corpo/ação; **não reestruturar cards que já respeitam o esqueleto**.
6. Hierarquia da dobra: ordem visual H1 → manifesto → CTA primário. Conferir relação entre prisma, H1, manifesto, botões e ornamentos.
7. Nav mobile e rodapé: largura disponível, estado de seção atual, touch targets preferencialmente ≥44×44 px.
8. Conformidade de contraste: corpo ≥4,5:1; texto grande e controles ≥3:1, inclusive card Reflexão e os três modos.
9. Scrollspy de todos os links de nav e chips: sinal visível/ARIA estável ao rolar e retornar de `/sophia`.

### P2 — adiar

10. Refinamento de composição e ritmo de Bastidores/Percurso, sem mudar texto ou ativos já aprovados.
11. Créditos/licenças de imagens e tradução: levantamento separado, **sem remoção automática de materiais**.
12. Revisão do enquadramento "5W2H" só mediante aprovação editorial.

## Aceite obrigatório antes de merge/deploy

- `npm run build` termina com sucesso em Node ≥22.12, sem regressões.
- Página inicial e `/sophia` navegáveis por teclado.
- Screenshots de 360/390/430/768/1440 px nos modos Autoral, Editorial, Legacy.
- Sem diferenças não autorizadas em Shorekeeper, Crimson Baton, Sophia, música e Método.
- Âncora `/#musica` funciona mesmo com JS desabilitado.
- Erros e ausência de Last.fm não ocultam o link/fallback.
- `prefers-reduced-motion` respeitado em todas as cenas e três modos.
- Contraste verificado com medição, não por inspeção subjetiva.
- `npm run check:ux` passa com as invariantes documentadas abaixo.
- PR revisado antes do merge; Cloudflare Pages só após validação.

## Próximo lote recomendado

Trabalhar em uma PR por tema: (1) acessibilidade & fallback de Música, (2) motion/reduced-motion, (3) responsividade/foco nos três modos, (4) ajustes de estrutura visual após screenshots. Fechar cada lote com build + evidência visual. Não substituir o código existente com base apenas na auditoria estática.

### Mapeamento de arquivos

- Estrutura/links/hero/cards: `src/pages/index.astro`
- Música e Last.fm: `src/components/MusicShelf.astro`, `functions/api/music/recent.*`, `src/styles/music-*.css`
- Nav/scrollspy: `src/components/PortfolioHeader.astro`
- Ciclo de modos: `src/components/SeriousModeToggle.astro`
- Sophia: `src/pages/sophia.astro`
- Controle global de motion: `src/components/DecorativeMotion.astro`, `src/components/MotionImage.astro`
- Visual global/refinamentos: `src/styles/global.css`, `src/styles/section-refinements.css`
- Fallback e handles: `src/config.ts`, `src/components/PortfolioFooter.astro`

**Atenção:** códigos e estados acima foram confrontados com a `main` consultada em 2026-10-08. Revalidar os arquivos antes de qualquer alteração futura, pois o portfólio recebe commits frequentes.
