<div align="center">

# Kauê Alencar — Portfólio

**Escrita · documentação · arquitetura da informação · experimentação digital**

[kaue.pages.dev](https://kaue.pages.dev) &nbsp;·&nbsp; Astro 7 &nbsp;·&nbsp; Three.js &nbsp;·&nbsp; Cloudflare Pages &nbsp;·&nbsp; pt-BR

</div>

---

Portfólio pessoal e laboratório de interfaces editoriais. O projeto combina conteúdo estático, três modos de leitura, cenas 2D em canvas, integrações com Last.fm e experiências 3D isoladas — sem transformar a página principal em uma SPA.

A prioridade técnica é manter **leitura, acessibilidade, degradação graciosa e custo de execução previsível** mesmo quando o site incorpora movimento e WebGL.

## Estado atual

- produção: branch `main`, publicada pelo Cloudflare Pages;
- build: Astro estático, Node.js 22.12+;
- experiência 3D pública atual: **Hsin · The Moon Fox V2.0.1**;
- personagem autoral do portfólio: **Sophia**, presente em `/sophia/`, na 404 e em protótipos isolados;
- Música: nova composição centrada na Hsin, com transição cinematográfica para o palco 3D;
- QA: resultados gerados não são versionados em `main`; evidências volumosas devem permanecer como artifacts de CI.

## Rotas principais

| Rota | Papel |
| --- | --- |
| `/` | portfólio principal, com sete seções canônicas |
| `/curiosidades/` | notas e curiosidades do autor |
| `/sophia/` | registro narrativo da Sophia |
| `/experimentos/` | índice de experiências visuais |
| `/experimentos/hsin/` | Hsin V2.0.1 no terraço lunar 3D; `noindex` |
| `/experimentos/hsin-lab/` | laboratório local da Hsin, com arquivo GLB escolhido no dispositivo; `noindex` |
| `/modo-experimental/` | protótipo WebGL2 isolado da Sophia; `noindex` |
| `/404` | página de erro com Sophia e Tetris |

A ordem das sete seções da página principal é definida em `src/section-order.ts`.

## Três modos de leitura

O portfólio preserva três estados visuais:

| Modo | Característica |
| --- | --- |
| **Autoral** | papel quente, cor, ilustrações, cenas e movimento |
| **Editorial** | leitura e-ink, contraste alto e redução de ornamentação |
| **Legacy · 1998** | interface inspirada em Windows 95/98 |

A preferência é persistida no navegador. Movimento decorativo respeita `prefers-reduced-motion`, visibilidade da página e modos que pedem uma apresentação mais quieta.

## Música e Hsin

A seção Música combina:

- atividade recente via Last.fm;
- composição `public/assets/music-hsin-stage-2026-11-02.avif`;
- Hsin como a única personagem atualmente acessível na composição;
- botão **Experimental mode** com fallback de link HTML direto;
- transição curta em violeta, azul elétrico e branco lunar antes da navegação;
- versão reduzida da transição para `prefers-reduced-motion`.

A rota `/experimentos/hsin/` usa Three.js diretamente. A V2.0.1 inclui terraço de pedra, água, arquitetura distante, lanternas, lua dourada, flores periféricas, framing responsivo e atuação autônoma da personagem.

O runtime limita custo de renderização, pausa quando apropriado e mantém o laboratório de autoria separado da experiência pública.

## Sophia

Sophia é a mascote/personagem autoral do portfólio.

O site mantém dois modelos 3D porque possuem funções diferentes:

- `public/experimental/sophia-alpha.glb` — protótipo rigado usado em `/modo-experimental/` e no retrato 3D progressivo da 404;
- `public/experimental/sophia-7b-e1-latest.glb` — modelo usado no lounge 3D da 404.

A 404 sempre possui fallback 2D. WebGL, redução de movimento, economia de dados ou falha de carregamento não impedem o acesso às ações de recuperação nem ao Tetris.

O parecer textual da antiga fase 6H foi preservado de forma compacta em `docs/archive/sophia6h/`; screenshots, cópias de `dist/` e outros resultados gerados não permanecem mais na árvore principal.

## Stack

- **Astro 7** — geração estática;
- **TypeScript / JavaScript** — interações e runtimes;
- **CSS puro** — modos, layout, cenas e tipografia;
- **Three.js** — Hsin e cenas 3D progressivas da Sophia;
- **Canvas 2D** — cenas decorativas e Tetris;
- **Sharp** — OG, quadros estáticos e recortes derivados;
- **Cloudflare Pages** — hospedagem e deploy;
- **Cloudflare Pages Functions** — proxy do Last.fm;
- **Node.js 22.12+**.

React Three Fiber, Drei e React Three Rapier não fazem parte do runtime atual e foram removidos das dependências.

## Estrutura

```text
src/
  components/       componentes Astro e interações de interface
  data/             manifests e dados derivados da Hsin
  layouts/          layouts gerais e layouts isolados das experiências
  pages/            rotas públicas e experimentais
  scripts/          runtimes de cliente, Hsin e Sophia
  styles/           tokens, modos, seções e experiências

public/
  assets/           imagens, modelos e texturas publicados
  experimental/     runtime/modelos ainda usados pelos protótipos da Sophia
  scripts/          scripts estáticos de página
  _headers          cache e cabeçalhos do Pages

assets/
  about/            fontes de geração do Sobre
  fonts/            fontes locais e licenças
  phrolova/         material de referência preservado
  og-portfolio.png  fonte canônica para geração da OG

functions/
  api/music/recent.js  proxy Last.fm

scripts/            geração, validação e ferramentas de autoria
tests/              regressões Hsin e contratos da seção Música
docs/               decisões, auditorias e documentação técnica
.github/workflows/  build, regressões Hsin e sincronização manual de assets
```

## Desenvolvimento

Use o lockfile:

```bash
npm ci
npm run dev
```

`dev` gera os assets derivados necessários antes de iniciar o Astro.

Build de produção:

```bash
npm run build
npm run preview
```

O build executa:

1. geração da imagem Open Graph;
2. geração dos primeiros quadros estáticos das mídias animadas;
3. geração dos recortes da Shorekeeper;
4. `astro build`;
5. verificação das imagens OG no `dist/`.

## Verificações

O conjunto recomendado é:

```bash
npm run check
```

Ele agrega:

```text
check:ux                contrato estático de UX
check:api               proxy Last.fm com fetch/cache simulados
check:tetris            regras do Tetris da 404
check:music-state       estados do widget de música
check:music-transition  contrato da transição Música → Hsin
check:hsin              terraço lunar e framing V2.0.1
check:sophia            modelos Sophia atualmente publicados
```

Verificação específica de OG:

```bash
npm run check:og
```

Os testes automatizados não substituem revisão visual em navegador, interação por toque, leitor de tela ou inspeção artística dos modelos 3D.

## Pipeline

### `portfolio-build.yml`

Executado em pull requests e pushes para `main`:

1. `npm ci`;
2. `npm run check`;
3. `npm run build`;
4. verificação pós-build das texturas do terraço lunar.

### `hsin-facial-b1-qa.yml`

Executa a regressão especializada da Hsin quando os arquivos relacionados à atuação/rig são alterados. Mantém testes de face, braços, gestos, diretor de movimento, GLB e build.

### `sync-external-assets.yml`

Workflow manual para ingestão/otimização controlada de assets externos.

Resultados de browser QA, screenshots e cópias de build devem ser anexados como **artifacts** do workflow. `qa-results/` está ignorado pelo Git.

## Política de assets

- fonte necessária para geração deve permanecer versionada;
- derivado reproduzível pode ser gerado no build;
- modelo grande só permanece em `public/` quando existe rota/runtime que o consome;
- screenshots, `dist/` copiado, relatórios repetidos e saídas temporárias não entram em `main`;
- assets de terceiros mantêm seus créditos e não implicam transferência de direitos;
- nenhuma credencial é versionada.

Essa política evita repetir o problema em que a remoção acidental de `assets/og-portfolio.png` interrompeu builds do Pages.

## Last.fm

A seção Música consulta uma Pages Function em `functions/api/music/recent.js`.

Variáveis necessárias no Cloudflare:

```text
LASTFM_USERNAME
LASTFM_API_KEY
```

A chave permanece apenas no ambiente do Pages. Mais detalhes em [`LASTFM_SETUP.md`](./LASTFM_SETUP.md).

## Currículo

O PDF publicado fica em `public/curriculo-kaue-alencar.pdf` e pode ser reconstruído com:

```bash
pip install reportlab
python3 scripts/build-resume.py
```

A fonte de verdade é o script, não o PDF editado manualmente.

## Documentação

Pontos de entrada recomendados:

- [`docs/publishing-workflow.md`](./docs/publishing-workflow.md) — publicação;
- [`docs/code-audit-2026-11-02.md`](./docs/code-audit-2026-11-02.md) — auditoria e backlog de otimização;
- [`docs/hsin-v2-stage.md`](./docs/hsin-v2-stage.md) — base do palco Hsin;
- [`docs/hsin-v2-moonlit-stage.md`](./docs/hsin-v2-moonlit-stage.md) — ambiente ao luar;
- [`docs/hsin-autonomous-presentation.md`](./docs/hsin-autonomous-presentation.md) — atuação autônoma;
- [`docs/sophia-404-3d.md`](./docs/sophia-404-3d.md) — 404 3D;
- [`docs/archive/sophia6h/`](./docs/archive/sophia6h/) — parecer histórico compacto da Sophia 6H.

## Próximas otimizações

A limpeza de repositório e dependências é a fase de baixo risco. A próxima rodada deve ser feita com comparação visual e métricas de bundle:

1. separar CSS específico de Música, homepage e Curiosidades do `BaseLayout`;
2. decompor `SeriousModeToggle.astro`, `global.css` e `index.astro` em unidades menores;
3. revisar listeners e scripts globais para inicialização somente quando o DOM correspondente existir;
4. medir CSS/JS por rota antes e depois;
5. manter Hsin V2.0.1 fora de refactors genéricos de animação até existir QA WebGL equivalente.

Detalhes e números estão em `docs/code-audit-2026-11-02.md`.

---

**Princípio:** clareza antes de ornamentação; estrutura antes de ferramenta; documentação deve sobreviver a quem a escreveu.

© Kauê Alencar. Código e conteúdo sem licença aberta declarada. Imagens, personagens e marcas de terceiros pertencem aos seus respectivos titulares.
