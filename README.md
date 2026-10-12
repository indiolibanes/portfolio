# Kauê Alencar — Portfólio

Portfólio pessoal voltado a **escrita, documentação, organização da informação e publicação digital**.

O projeto também funciona como laboratório de arquitetura de conteúdo, interfaces editoriais e pequenos experimentos de integração. Publicado em [kaue.pages.dev](https://kaue.pages.dev).

## O que há no site

Uma página principal com sete seções numeradas, na ordem definida em `src/section-order.ts`:

| # | Seção | Âncora |
| --- | --- | --- |
| 01 | Sobre | `#sobre` |
| 02 | Laboratório (cinco projetos) | `#lab` |
| 03 | Método | `#metodo` |
| 04 | Bastidores | `#bastidores` |
| 05 | Percurso | `#percurso` |
| 06 | Música (atividade recente via Last.fm) | `#musica` |
| 07 | Contato | `#contato` |

Além da página principal, o site tem `/sophia` (a personagem e seu sigilo) e uma página 404.

### Três modos de apresentação

Um único botão alterna entre **Autoral**, **Editorial** e **Legacy · 1998**. O controle tem três estados, não é um interruptor binário: o rótulo mostra o modo atual e o próximo. Os tokens de cada modo ficam em `src/styles/mode-tokens.css`, `serious.css` e `mono-modes.css`.

### Princípios de interface

- nada essencial depende de JavaScript: a âncora de Música existe no HTML estático e há `<noscript>` com link para o Last.fm;
- movimento decorativo respeita `prefers-reduced-motion`, a visibilidade da página e a viewport; no máximo dois loops decorativos ficam ativos ao mesmo tempo, e GIFs/WebP animados ganham primeiro quadro estático no build;
- links e controles de navegação têm alvo mínimo de 44 px; links que abrem em nova aba avisam no texto acessível;
- cards sem destino não fingem ser links.

## Stack

- [Astro](https://astro.build/) 7 (saída estática, sem framework de UI)
- [sharp](https://sharp.pixelplumbing.com/) para imagens Open Graph, quadros estáticos e recortes
- Cloudflare Pages (publicação) e uma Pages Function (`functions/api/music/recent.js`) para o Last.fm
- Markdown / Git
- Node.js 22.12 ou superior

## Estrutura

```text
src/
  components/      cabeçalho, rodapé, música, modos, cenas e animações
  layouts/
  pages/           index, sophia, 404
  styles/          tokens, tipografia, modos, mobile e cenas
  config.ts        site, perfil, redes e música
  section-order.ts ordem canônica das seções

functions/api/music/recent.js   proxy do Last.fm (Cloudflare Pages Function)
public/                         imagens, PDF do currículo, robots, sitemap, _headers
scripts/                        geração de assets, contrato de UX, teste do Last.fm
docs/                           decisões, auditorias e fluxo de publicação
qa/ e qa-results/               harness de QA no navegador e seus resultados
.github/workflows/              QA temporário e sincronização de assets externos
```

## Desenvolvimento

```bash
npm install
npm run dev
```

`dev` e `build` executam antes os scripts de geração (imagem Open Graph, quadros estáticos de movimento e recortes do Sobre).

Build de produção:

```bash
npm run build
npm run preview
```

## Verificações

```bash
npm run check:ux              # contrato estático de UX sobre o código-fonte
node scripts/test-music-state.mjs   # estados do widget de música
```

Essas verificações leem o código-fonte e simulam o navegador; **não substituem** teste em navegador real, leitor de tela, medição de contraste ou comparação visual. A auditoria de navegador mais recente e seus resultados estão em `qa-results/`; a revisão da auditoria estática está em `docs/ui-audit-followup.md` e `docs/auditoria-gui-ux-implementacao-2026-10-08.md`.

## Last.fm

A seção musical usa uma Cloudflare Pages Function como intermediária, com o método público `user.getRecentTracks`.

Variáveis necessárias no Cloudflare (**Settings → Variables and Secrets**):

```text
LASTFM_USERNAME
LASTFM_API_KEY
```

A chave não deve ser commitada no repositório. Detalhes de players, scrobblers e playlists em [`LASTFM_SETUP.md`](./LASTFM_SETUP.md).

## Currículo

O PDF em `public/curriculo-kaue-alencar.pdf` é gerado de forma determinística:

```bash
pip install reportlab
python3 scripts/build-resume.py
```

Edite o conteúdo no script, nunca o PDF.

## Publicação

Fluxo mínimo: Obsidian → Git/GitHub → Astro → Cloudflare Pages, com `main` como branch de produção. Detalhes em [`docs/publishing-workflow.md`](./docs/publishing-workflow.md).

Workflows do GitHub atualmente no repositório:

- `portfolio-browser-qa.yml` — harness **temporário** de QA no navegador; só roda em branches `qa/portfolio-browser-audit-*`, constrói cada ref localmente, não faz deploy e não usa segredos;
- `sync-external-assets.yml` — execução manual (ou ao editar o próprio workflow) que baixa e otimiza assets externos para `public/assets`.

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
| `docs/phrolova-vector-reference.md` | referência vetorial de uma ilustração |

## Decisões preservadas

Ao mexer no projeto, preserve: paleta, fontes, ilustrações e texturas; os três modos; a composição da seção Música; as cenas e personagens existentes; e o conteúdo da seção Método. Mudanças editoriais, substituição de URLs pessoais e remoção de materiais de terceiros dependem de confirmação. Nenhuma credencial entra no repositório.

## Princípios

Clareza antes de ornamentação.  
Estrutura antes de ferramenta.  
Documentação deve sobreviver a quem a escreveu.

---

© Kauê Alencar. Código e conteúdo sem licença aberta declarada. Imagens, personagens e marcas de terceiros pertencem aos seus respectivos titulares.
