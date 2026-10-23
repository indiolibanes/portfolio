<div align="center">

# Kauê Alencar — Portfólio

**Escrita · Documentação · Organização da informação · Publicação digital**

[kaue.pages.dev](https://kaue.pages.dev) &nbsp;·&nbsp; Astro 7 &nbsp;·&nbsp; Cloudflare Pages &nbsp;·&nbsp; pt-BR

</div>

---

Portfólio pessoal e, ao mesmo tempo, laboratório de **arquitetura de conteúdo, interfaces editoriais e pequenos experimentos de integração**. É um site estático, sem framework de UI, em que cada decisão visual tenta servir à leitura antes de servir ao enfeite.

## Sumário

- [O que há no site](#o-que-há-no-site)
- [Três modos de leitura](#três-modos-de-leitura)
- [Cenas animadas](#cenas-animadas)
- [Princípios de interface](#princípios-de-interface)
- [Stack](#stack)
- [Estrutura](#estrutura)
- [Desenvolvimento](#desenvolvimento)
- [Verificações](#verificações)
- [Tipografia e fontes](#tipografia-e-fontes)
- [Last.fm](#lastfm)
- [Currículo](#currículo)
- [Publicação](#publicação)
- [Documentação](#documentação)
- [Decisões preservadas](#decisões-preservadas)

## O que há no site

Uma página principal com sete seções numeradas (ordem canônica em `src/section-order.ts`) e algumas páginas auxiliares.

| # | Seção | Âncora | Destaque |
| --- | --- | --- | --- |
| 01 | Sobre | `#sobre` | apresentação sóbria, botão de currículo em PDF |
| 02 | Laboratório | `#lab` | cinco projetos (tradução, reflexão, arquitetura, projeto integrador, documentação) sobre um colisor de neutrinos |
| 03 | Método | `#metodo` | brief de UX Writing escrito à mão, bloco de sketches em paisagem e quatro etapas em fluxograma |
| 04 | Bastidores | `#bastidores` | o repositório à vista, sobre sinapses |
| 05 | Percurso | `#percurso` | trajetória, com a equação de Dirac em zoom ao fundo |
| 06 | Música | `#musica` | atividade recente via Last.fm |
| 07 | Contato | `#contato` | céu profundo com estrelas, planetas e cometas |

Páginas extras: `/curiosidades`, `/sophia` (a personagem e seu sigilo) e a 404.

### Menu em tabela periódica

A gaveta de navegação escreve cada destino com **símbolos de elementos químicos** (Sobre = S·O·B·Re). A segmentação é calculada no build a partir dos 118 elementos, maximizando as letras cobertas; as letras sem símbolo ficam soltas ao lado dos azulejos, no estilo do logotipo de *Breaking Bad*. Os azulejos aparecem com efeitos aleatórios (giro, queda, zoom, desfoque) e um elemento se "reacende" de tempos em tempos. O texto acessível do link permanece o nome normal.

## Três modos de leitura

Um único botão alterna entre três estados. O rótulo mostra o modo atual e o próximo; a escolha fica salva e pode ser forçada por `?mode=editorial` ou `?mode=legacy`.

| Modo | Ideia |
| --- | --- |
| **Autoral** | papel quente, cor, cenas animadas e ilustrações. É o modo padrão. |
| **Editorial** | princípio *e-ink*, menos é mais: papel branco, tinta preta, filetes finos, sem ilustrações, sem cenas, sem sombras; rodapé sem navegação nem currículo. |
| **Legacy · 1998** | Windows 95/98: área de trabalho verde-azulada, cada seção é uma janela com barra de título, botões e menu cinza; cabeçalho como barra de menus, rodapé como barra de tarefas; fontes de sistema da época (Tahoma, Arial, Times New Roman, Courier New). |

Tokens e regras: `mode-tokens.css`, `serious.css` (Editorial), `eink.css`, `mono-modes.css`, `legacy.css` e `legacy-win98.css`. Não há modo escuro, de propósito (por enquanto).

## Cenas animadas

`public/scripts/scenes.js` é um motor de canvas único (um só `requestAnimationFrame`, sem dependências). Cada elemento com `data-scene="…"` recebe um `<canvas aria-hidden>` atrás do conteúdo.

| Cena | Seção | O que mostra |
| --- | --- | --- |
| `supernova` | Tradução | estrela que colapsa, explode e deixa um remanescente |
| `spacetime` | Reflexão | grade do espaço-tempo curvada por duas massas e o paradoxo de Andrômeda |
| `network` | Arquitetura | "segundo cérebro": rede de notas com ondas de ativação |
| `clockwork` | Arquitetura | relógio desmontado |
| `matrix` | Documentação | chuva de glifos com o fluxo de publicação |
| `collider` | Laboratório | colisor de neutrinos |
| `flipbook` | Método | brief de UX Writing à mão → sketch → wireframe → protótipo do app de astrofísica |
| `synapses` | Bastidores | neurônios e espelhamento entre duas mentes |
| `zoom` | Percurso | da tinta no papel ao átomo, aos quarks e ao mar de Dirac |
| `cosmos` | Contato | estrelas, nebulosas, planetas, asteroides, cometas |

Regras do motor: só desenha o que está na tela e com a aba visível; com `prefers-reduced-motion` pinta **um único quadro estático**; nos modos Editorial e Legacy fica desligado. Para inspecionar um quadro fixo: `window.PortfolioScenes.renderAt(host, t)`.

## Princípios de interface

- nada essencial depende de JavaScript: a âncora de Música existe no HTML estático e há `<noscript>` com link para o Last.fm;
- movimento decorativo respeita `prefers-reduced-motion`, a visibilidade da página e a viewport; GIFs e WebP animados ganham primeiro quadro estático no build;
- botões em destaque (currículo, alternador de modo) animam apenas fora do Legacy e se calam com movimento reduzido;
- links e controles de navegação têm alvo mínimo de 44 px; links que abrem em nova aba avisam no texto acessível;
- diagramas decorativos são `aria-hidden`; os fluxogramas do Método têm `aria-label` descrevendo as etapas;
- cards sem destino não fingem ser links.

## Stack

- [Astro](https://astro.build/) 7 (saída estática, sem framework de UI)
- CSS puro em camadas (sem aninhamento, ordem de importação definida em `src/layouts/BaseLayout.astro`)
- Canvas 2D e JavaScript sem dependências para as cenas
- [sharp](https://sharp.pixelplumbing.com/) para imagens Open Graph, quadros estáticos e recortes
- Cloudflare Pages e uma Pages Function (`functions/api/music/recent.js`) para o Last.fm
- Node.js 22.12 ou superior

## Estrutura

```text
src/
  components/      cabeçalho (menu periódico), rodapé, música, modos, Sophia, animações
  layouts/         BaseLayout (ordem das folhas de estilo)
  pages/           index, curiosidades, sophia, 404
  scripts/         máquina de escrever e utilitários de cliente
  styles/          tokens, tipografia, modos, cenas, e-ink, Win98, mobile
  config.ts        site, perfil, redes e música
  section-order.ts ordem canônica das seções

public/
  scripts/         scenes.js (motor de cenas) e reveal.js (entrada ao rolar)
  …                imagens, PDF do currículo, robots, sitemap, _headers
assets/fonts/      fontes locais e suas licenças
functions/api/music/recent.js   proxy do Last.fm (Cloudflare Pages Function)
scripts/           geração de assets, currículo, contrato de UX, testes
docs/              decisões, auditorias e fluxo de publicação
qa/ e qa-results/  harness de QA no navegador e seus resultados
.github/workflows/ QA temporário e sincronização de assets externos
```

## Desenvolvimento

```bash
npm install
npm run dev
```

`dev` e `build` executam antes os scripts de geração (imagem Open Graph, quadros estáticos de movimento e recortes do Sobre).

```bash
npm run build     # produção, com verificação das imagens OG
npm run preview   # serve o resultado
```

## Verificações

```bash
npm run check:ux      # contrato estático de UX sobre o código-fonte
npm run check:og      # imagens Open Graph
npm run check:api     # API de música
node scripts/test-music-state.mjs   # estados do widget de música
```

Essas verificações leem o código-fonte e simulam o navegador; **não substituem** teste em navegador real, leitor de tela, medição de contraste ou comparação visual. Ao mexer em cenas ou modos, confira os três modos, a largura de desktop (≈1440 px) e a de celular (≈390 px) e o movimento reduzido. As auditorias mais recentes estão em `qa-results/` e `docs/`.

## Tipografia e fontes

As fontes são locais (`assets/fonts`), declaradas em `src/styles/typography.css` e `type-hierarchy.css`:

| Família | Uso |
| --- | --- |
| Bookman, Benguiat, Garamond | títulos e texto editorial |
| Latin Modern Mono (*Portfolio Typewriter*) | etiquetas e máquina de escrever |
| Roguepunk | destaques do Laboratório |
| Heart Breaking Bad (*Portfolio Hand*) | assinatura e letras em azulejo (somente letras e dígitos) |
| Caveat (*Portfolio Script*, SIL OFL) | caligrafia do brief e dos fluxogramas do Método |

Cada fonte mantém sua licença original ao lado do arquivo quando houver. No modo Legacy, as fontes anexadas são substituídas por fontes de sistema da época.

## Last.fm

A seção musical usa uma Cloudflare Pages Function como intermediária, com o método público `user.getRecentTracks`.

Variáveis necessárias no Cloudflare (**Settings → Variables and Secrets**):

```text
LASTFM_USERNAME
LASTFM_API_KEY
```

A chave não deve ser commitada. Detalhes de players, scrobblers e playlists em [`LASTFM_SETUP.md`](./LASTFM_SETUP.md).

## Currículo

O PDF em `public/curriculo-kaue-alencar.pdf` é gerado de forma determinística:

```bash
pip install reportlab
python3 scripts/build-resume.py
```

Edite o conteúdo no script, nunca o PDF. A data de atualização exibida no rodapé (modo Autoral e Legacy) deve acompanhar a do PDF.

## Publicação

Fluxo mínimo: Obsidian → Git/GitHub → Astro → Cloudflare Pages, com `main` como branch de produção. Detalhes em [`docs/publishing-workflow.md`](./docs/publishing-workflow.md).

Workflows do GitHub atualmente no repositório:

- `portfolio-browser-qa.yml` — harness **temporário** de QA no navegador; só roda em branches `qa/portfolio-browser-audit-*`, constrói cada ref localmente, não faz deploy e não usa segredos;
- `sync-external-assets.yml` — execução manual que baixa e otimiza assets externos para `public/assets`.

Ainda não há workflow de build/verificação para pull requests nem lockfile de dependências commitado.

## Documentação

| Arquivo | Assunto |
| --- | --- |
| `docs/publishing-workflow.md` | fluxo de publicação |
| `docs/auditoria-gui-ux-implementacao-2026-10-08.md` | reconciliação da auditoria de GUI/UX |
| `docs/ui-audit-followup.md` | mudanças feitas após a auditoria estática |
| `docs/section-refinements.md` | refinamentos por seção |
| `docs/method-scene.md` | cena “Sophia apresenta o método” |
| `docs/music-scene-v2.md`, `docs/music-scene-generation-prompt.md` | cena da seção Música |
| `docs/contact-orbits.md` | composição do Contato |
| `docs/og-audit-2026-10-12.md` | auditoria das imagens Open Graph |
| `docs/phrolova-vector-reference.md` | referência vetorial de uma ilustração |

## Decisões preservadas

Ao mexer no projeto, preserve: paleta, fontes, ilustrações e texturas; os três modos (e a ausência de modo escuro); a composição da seção Música; as cenas e personagens existentes; e o conteúdo textual da seção Método. Mudanças editoriais, substituição de URLs pessoais e remoção de materiais de terceiros dependem de confirmação. Nenhuma credencial entra no repositório. Trabalho em branch dedicada, sem merge sem autorização.

## Princípios

Clareza antes de ornamentação.  
Estrutura antes de ferramenta.  
Documentação deve sobreviver a quem a escreveu.

---

© Kauê Alencar. Código e conteúdo sem licença aberta declarada. Imagens, personagens e marcas de terceiros pertencem aos seus respectivos titulares.
