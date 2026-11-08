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
- experiências 3D públicas: **Hsin · The Moon Fox V2.0.1** e **Shorekeeper · laboratório de inspeção 3D** (entrega autenticada com alternativa de importação local);
- personagem autoral do portfólio: **Sophia**, presente em `/sophia/`, na 404 e em protótipos isolados;
- Música: nova composição centrada na Hsin, com transição cinematográfica para o palco 3D;
- QA: resultados gerados não são versionados em `main`; evidências volumosas devem permanecer como artifacts de CI.

## Rotas principais

| Rota | Papel |
| --- | --- |
| `/` | portfólio principal, com sete seções canônicas |
| `/curiosidades/` | notas e curiosidades do autor |
| `/sophia/` | registro narrativo da Sophia |
| `/experimentos/` | Hsin V2.0.1 no terraço lunar 3D; `noindex` |
| `/experimentos/sk/` | laboratório Shorekeeper; entrega autenticada e importação local |
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
- composição `public/assets/characters/hsin/music/music-stage-2026-11-02.avif`;
- Hsin como a única personagem atualmente acessível na composição;
- botão **Experimental mode** com fallback de link HTML direto;
- transição curta em violeta, azul elétrico e branco lunar antes da navegação;
- versão reduzida da transição para `prefers-reduced-motion`.

A rota `/experimentos/` usa Three.js diretamente. A V2.0.1 inclui terraço de pedra, água, arquitetura distante, lanternas, lua dourada, flores periféricas, framing responsivo e atuação autônoma da personagem.

O runtime limita custo de renderização e pausa quando apropriado. O antigo palco intermediário e o laboratório local de upload de GLB foram removidos; `/experimentos/` é agora a experiência canônica da Hsin.

### Pavilhão musical e atuação

O pavilhão tridimensional combina arquitetura chinesa com propulsores de hidrogênio e acompanha o enquadramento da câmera. O player oficial continua em HTML para manter controles legíveis e acessíveis.

A escolha entre YouTube, Spotify e silêncio é explícita. As APIs oficiais observam o estado do player; selecionar um provedor sem confirmar reprodução não inicia dança. A coreografia experimental depende de reprodução YouTube confirmada. Spotify permanece como opção de escuta; não se declara sincronização exata com batidas de uma gravação. Os diretores e dados de coreografia são mantidos separadamente do rig e do modelo.

A lua permanece fixa no mundo. Limites de renderização, pausa e movimento reduzido estão no runtime; sua existência não comprova desempenho em hardware real. Revisão artística, players externos e Android exigem QA específico.

**Créditos:** © 2026 **KURO GAMES** · Wuthering Waves. Composição: Jin Dazhou; voz: Jaime Arin; letras: SmileL e Kat Kennedy; arranjo: He Shan. Portfólio independente, não afiliado à KURO GAMES. Os créditos e links oficiais permanecem na interface.


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
  pages/            rotas públicas e experimentais; /experimentos é Hsin
  scripts/          runtimes de cliente, Hsin e Sophia
  styles/           tokens, modos, seções e experiências

public/
  assets/characters/  acervo visual público separado por Hsin, Shorekeeper, Phrolova e Sophia
  assets/models/hsin/  modelo/poses Hsin usados por URLs antigas do runtime (manter compatibilidade)
  assets/animations/hsin/  coreografias públicas da Hsin (manter compatibilidade)
  assets/scenes/hsin/  texturas do terraço lunar (manter compatibilidade)
  assets/about/   derivados gerados no build, inclusive motivos da Shorekeeper
  assets/        outras imagens e texturas publicados
  experimental/     modelos 3D da Sophia ainda consumidos pelo runtime legado (migração separada)
  scripts/          scripts estáticos de página
  _headers          cache e cabeçalhos do Pages

assets/
  about/            fontes de geração do Sobre
  fonts/            fontes locais e licenças
  phrolova/         material de referência preservado
  og-portfolio.png  fonte canônica para geração da OG

functions/
  api/music/         proxy Last.fm e capas
  api/shorekeeper/   entrega privada autenticada
  _lib/             validação de acesso/manifesto

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

1. limpeza do diretório de saída `dist/`;
2. geração da imagem Open Graph, stills e recortes derivados;
3. `astro build`;
4. verificação de OG e rejeição de arquivos privados/temporários no output.

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
check:hsin              rota canônica, terraço lunar e framing V2.0.1
check:sophia            modelos Sophia atualmente publicados
check:performance       isolamento do runtime Canvas por rota
check:shorekeeper-r2    contrato de autenticação e entrega privada
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

Os workflows de evidência visual e bake publicam artifacts com retenção de 30 dias, sem criar branches nem usar credenciais de escrita.

### `hsin-facial-b1-qa.yml`

Executa a regressão especializada da Hsin quando os arquivos relacionados à atuação/rig são alterados. Mantém testes de face, braços, gestos, diretor de movimento, GLB e build.

### `sync-external-assets.yml`

Workflow de ingestão/otimização de assets externos. Entrega artifacts para revisão por PR; não escreve na branch de execução.

Resultados de browser QA, screenshots e cópias de build devem ser anexados como **artifacts** do workflow. `qa-results/` está ignorado pelo Git.

## Acervo de personagens e armazenamento privado

O catálogo público mantém recursos visuais de cada personagem em `public/assets/characters/{hsin,shorekeeper,phrolova,sophia}/`. As imagens e os sprites podem ser públicos; isso **não** constitui licença para redistribuir arquivos de terceiros. Os modelos e as animações **extraídos de jogos e protegidos por direitos autorais** devem ficar em armazenamento privado, fora deste repositório e fora de `public/`, até existir autorização apropriada para eventual distribuição. Os créditos aos titulares devem acompanhar cada apresentação.

Os modelos e as bibliotecas privados da Shorekeeper ficam fora do Git e de `public/`. A rota tenta carregar o manifesto autenticado, verifica a integridade dos bytes e mantém importação local como alternativa. O publicador local atualiza o manifesto depois de verificar os uploads. A configuração e os objetos da conta de hospedagem exigem validação administrativa separada; não estão comprovados por um build local.

As imagens Hsin e Sophia já existentes em diretórios de runtime (`public/assets/models/hsin`, `public/assets/animations/hsin`, `public/assets/scenes/hsin`, `public/experimental/`) permanecem em seus caminhos funcionais até auditoria de todos os consumidores. Em especial, o modelo Hsin atualmente servido por Pages é **público**, e não deve ser descrito como privado. A reorganização dos arquivos visuais não o transforma em privado. Uma futura migração de GLBs deve ocorrer em PR isolado, após análise de licenças, integridade, carga e URLs.

Ver `docs/asset-storage/README.md` para o catálogo e o contrato de armazenamento.

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

- [`docs/security/repository-audit-s1.md`](./docs/security/repository-audit-s1.md) — auditoria de higiene e seus limites;
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

## SEO e indexação

A origem canônica deste portfólio é `https://kaue.pages.dev` (definida em `astro.config.mjs` e `src/config.ts`). Evite publicar uma segunda origem indexável sem redirecionamento permanente para a URL canônica.

- **Indexáveis:** `/`, `/curiosidades/` e `/sophia/`. São as únicas URLs listadas em `public/sitemap.xml`.
- **Fora do índice:** `/404`, `/modo-experimental/` e `/experimentos/**` (incluindo Hsin, Shorekeeper e o preview de dupla). A exclusão do índice não substitui autenticação.
- **Metadados:** `src/components/BaseHead.astro` define título, descrição, canonical, Open Graph e Twitter Cards. A página inicial publica um grafo JSON-LD `Person` + `WebSite`; o cartão de compartilhamento continua a ser gerado por `scripts/generate-og.mjs`.
- **Cabeçalhos:** `public/_headers` aplica `X-Robots-Tag: noindex` às rotas experimentais. Não aplicar `X-Robots-Tag: index` globalmente: isso conflita com páginas que solicitam `noindex`.
- **Sitemap:** manter apenas as URLs públicas canônicas. Não preencher `lastmod` com a data do build nem datas estimadas; só publicar datas verificáveis de alteração do conteúdo.
- **Verificação:** `npm run check:seo` inspeciona os arquivos-fonte; `npm run build` também verifica HTML, canonicals, dados estruturados e diretivas dos arquivos compilados. O CI de PR executa ambos.

A presença do site no Google depende também de entrega HTTP, configuração Cloudflare e Google Search Console. O teste local não confirma indexação em serviços externos.
