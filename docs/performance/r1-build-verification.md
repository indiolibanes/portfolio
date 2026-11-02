# R1 — verificação local dos builds

Data: 2026-11-02. Comparação do estado anterior `f94f10bb7def9e7163f3184ea1572d74a950ecc8` com `main` após o PR #196, `7301135e046a38e4dcadaea83b0023d6741180fa`. Este documento complementa a baseline histórica; não afirma que a auditoria de runtime foi concluída.

## Método

Dois worktrees isolados, Node 24.22.1 e npm 11.9.0. Dependências instaladas por `npm ci --no-audit --no-fund` no checkout atual e compartilhadas com o checkout anterior; conferir o lockfile antes de reproduzir em outro par de commits. `npm run build` passou em ambos; `npm run check` passou no commit atual. O build gera `public/og-portfolio.jpg`, artefato não versionado que não faz parte da alteração. Resultados são do build local, não do Cloudflare nem de dispositivo real.

## Referências no HTML gerado

| Rota | `scenes.js` antes | Depois |
|---|---:|---:|
| `/` | 1 | 1 |
| `/curiosidades/` | 1 | 0 |
| `/sophia/` | 1 | 0 |
| 404 | 1 | 0 |
| `/experimentos/` | 0 | 0 |
| `/modo-experimental/` | 0 | 0 |

O arquivo tem 98.326 bytes e 26.841 bytes em gzip local (`gzip -c`), sem alterações entre as versões. Não são medições de transferência: compressão do servidor, cache e comportamento do navegador podem diferir. A economia de rede, FPS e experiência visual permanece **NOT_TESTED**.

No build posterior, `dist/` tem 59.902.169 bytes lógicos em 130 arquivos; o anterior tem 59.902.313 bytes. Esses totais incluem assets estáticos copiados e não equivalem a bytes transferidos. O maior chunk JS é `three.module` com 736.437 bytes, ou 184.574 em gzip local. `BaseLayout` CSS tem 257.978 bytes sem compressão. Os HTMLs de home, curiosidades e Sophia não referenciam diretamente Three.js; a 404 pode carregá-lo dinamicamente para a experiência Sophia, enquanto Hsin usa imports dinâmicos. Isso não comprova uma sessão de rede nem ausência de imports transitivos em todas as interações.

## Estado das experiências paralelas

Hsin #194 está em `32801974d95ae458d94d72d81e874df3be4e7529`, e #195 sobre ele em `dea78665d2e421475240b7f66c6911a65a690469`. Shorekeeper #182 está em `580deae49860fdcd0350789be69f42f4b17836ee`; sua rota não existe na `main` inspecionada. Por inspeção dessa branch, `frame()` agenda o próximo rAF antes de testar suspensão e chama `stage.draw()` em idle. Não houve medição de custo nem alteração na branch da personagem.

## Pendências e limites

LCP, INP, CLS, transferSize, requests reais, FPS, frame times, tempos 3D, renderer.info em WebGL, heap, GPU, descarte e navegação repetida, acessibilidade/visual, players, CSP em deploy, Android e Samsung Internet: **NOT_TESTED**. A inspeção estática não confirma ausência de vazamentos nem aprovação visual. O PR #196 foi integrado antes desta verificação; esta medição posterior não prova que seus gates visuais tenham sido realizados. Nenhum asset removido ou alterado nesta verificação.
