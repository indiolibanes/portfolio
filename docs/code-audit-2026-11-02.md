# Auditoria de código e repositório — 2026-11-02

Base auditada: `main@706cc616801499ab1eb595f5c64a5394f06e1864`.

Objetivo: reduzir peso estrutural, remover material órfão e preparar otimizações de carregamento sem alterar a apresentação consolidada do portfólio.

## Resumo executivo

A maior ineficiência não estava no bundle público, mas na própria árvore Git: saídas antigas de browser QA haviam sido commitadas repetidamente, incluindo cópias completas de `dist/`.

| Métrica | Antes | Após limpeza | Diferença |
| --- | ---: | ---: | ---: |
| Arquivos rastreados | 5.240 | 377 | −4.863 |
| Bytes rastreados | 373.737.629 | 62.421.233 | −311.316.396 (≈83,3%) |
| Entradas do lockfile | 329 | 270 | −59 |
| `qa-results/` | 4.853 arquivos / 299.661.601 B | removido | resultados passam a ser artifacts |
| Modelos Sophia publicados | 4 GLBs | 2 GLBs ativos | dois protótipos órfãos removidos |

A redução melhora checkout, inspeção do repositório, transferências em CI e manutenção do lockfile. Ela não reescreve o histórico Git; para reduzir o tamanho histórico do clone seria necessário um procedimento separado de history rewrite, que não faz parte desta mudança.

## Limpeza aplicada

### Resultados de QA

Removidos `qa-results/` e o harness temporário `qa/`.

A pasta acumulava screenshots, logs e cópias de build de várias rodadas. Esse material não é requisito de runtime e deve ser produzido como artifact de CI.

O parecer textual da Sophia 6H foi preservado em `docs/archive/sophia6h/`.

### Workflows históricos

Removidos workflows ligados exclusivamente a branches experimentais encerradas:

- `portfolio-browser-qa.yml`;
- `audit-sophia-assets.yml`;
- `sophia-404-2d-qa.yml`;
- `sophia-404-arcade-qa.yml`;
- `sophia-404-experimental.yml`.

Permanecem os gates úteis à árvore atual:

- `portfolio-build.yml`;
- `hsin-facial-b1-qa.yml`;
- `sync-external-assets.yml`.

### Sophia

Mantidos:

- `public/experimental/sophia-alpha.glb` — `/modo-experimental/` e retrato 3D da 404;
- `public/experimental/sophia-7b-e1-latest.glb` — lounge 3D da 404.

Removidos:

- `public/experimental/sophia.glb`;
- `public/experimental/sophia-vetorial.glb`;
- `scripts/rig-sophia-vetorial.py`;
- `scripts/audit-sophia-assets.mjs`;
- `sophia.jsx`.

O último era um protótipo React/R3F isolado na raiz e não fazia parte de nenhuma rota Astro.

### Dependências

Não há importações de React Three Fiber, Drei ou React Three Rapier no runtime atual.

Foram removidos:

- `@react-three/fiber`;
- `@react-three/drei`;
- `@react-three/rapier`.

O lockfile foi podado por alcançabilidade a partir das dependências restantes, removendo 59 entradas que existiam apenas por essa pilha.

Three.js permanece porque é utilizado diretamente por Hsin e pelas cenas 3D progressivas da Sophia.

## Pipeline consolidado

`npm run check` passa a ser o ponto de entrada para regressões gerais:

- UX;
- API Last.fm;
- Tetris;
- estados de Música;
- transição Música → Hsin;
- Hsin V2.0.1;
- modelos Sophia ativos.

O workflow principal usa `npm ci --no-audit --no-fund`, executa `npm run check`, faz o build e repete a validação das texturas Hsin contra `dist/`.

## Auditoria de código: próximos alvos

Esta rodada não altera cascata visual nem comportamento de animação. Os seguintes pontos têm boa relação risco/benefício para uma fase posterior.

### 1. CSS específico carregado pelo BaseLayout

`BaseLayout.astro` importa folhas específicas de páginas/seções em todas as rotas que usam o layout.

Só o bloco de Música soma aproximadamente **80 KB de CSS-fonte**:

- `music-gallery.css` — 23.944 B;
- `music-scene.css` — 7.232 B;
- `music-scene-motion.css` — 13.098 B;
- `music-player.css` — 36.038 B.

Outros candidatos atualmente globais:

- `curiosidades.css` — 9.684 B;
- `contact-orbits.css` — 2.200 B;
- `method-scene.css` — 10.153 B;
- `pi-card.css` — 18.643 B;
- `hero-autoral.css` — 10.537 B;
- `section-scenes.css` — 15.108 B.

Próxima ação recomendada: mover imports para componentes/páginas proprietárias e comparar o CSS emitido por rota. Não fazer a mudança sem snapshot visual dos três modos, porque a ordem atual da cascata é significativa.

### 2. Arquivos muito grandes

Principais candidatos à decomposição:

| Arquivo | Tamanho aproximado |
| --- | ---: |
| `src/styles/global.css` | 140,7 KB |
| `src/scripts/hsin-local-lab.ts` | 96,3 KB |
| `src/components/SeriousModeToggle.astro` | 72,3 KB |
| `src/pages/index.astro` | 54,3 KB |
| `src/pages/404.astro` | 35,2 KB |
| `src/components/MusicShelf.astro` | 30,8 KB |

A decomposição deve priorizar responsabilidade e carregamento por rota, não apenas número de linhas.

### 3. JavaScript global

Revisar componentes globais do `BaseLayout` para confirmar que:

- listeners só são instalados quando o elemento-alvo existe;
- observers são desconectados em teardown quando aplicável;
- efeitos decorativos não criam clocks paralelos;
- `document.hidden`, `prefers-reduced-motion` e `saveData` são respeitados.

### 4. Hsin

A V2.0.1 já possui orçamento explícito de DPR/pixels, limite de FPS, pausa e testes de geometria/framing.

Não misturar uma refatoração genérica do site com mudanças no pipeline de atuação da Hsin. Qualquer otimização do player deve preservar:

- perfil V2.1;
- apresentação V2.0.1;
- framing responsivo;
- regressões faciais e de braços;
- assets do terraço lunar.

### 5. Imagens e fontes

Antes de recomprimir assets ativos:

1. medir uso real por rota;
2. verificar se a imagem é fonte de geração ou derivado;
3. preservar alpha/frames quando necessários;
4. comparar visualmente a saída;
5. manter licenças junto às fontes.

`assets/og-portfolio.png` é fonte obrigatória do build e não deve ser removida como “arquivo não usado”.

## Critério para a próxima fase

A próxima PR de performance deve apresentar, no mínimo:

- tamanho de CSS/JS por rota antes/depois;
- build verde;
- `npm run check` verde;
- Cloudflare preview verde;
- comparação visual Autoral / Editorial / Legacy em desktop e mobile;
- `prefers-reduced-motion`;
- verificação separada da rota Hsin.

Sem essas medições, a otimização deve permanecer como proposta, não como refatoração automática.
