# Desempenho — linha de base (fase 0) · 2026-11-08

Alvo: desktop com 4 GB de RAM e Motorola G35 (celular de entrada).

## O que este documento é — e o que não é

**É** um inventário estático do código e dos assets da `main` (commit `1344442`), contado com `grep`/`stat`.
**Não é** uma medição de desempenho. Esta sessão não conseguiu instalar dependências (o gateway nega `registry.npmjs.org`), então **não houve build, Lighthouse, perfil de CPU nem heap snapshot**. Nenhum número abaixo é tempo, FPS ou memória em uso.

## Inventário estático

| Item | Valor |
|---|---|
| CSS global (`BaseLayout`) | ≈ 436 KB em 25 folhas (`global.css` sozinho ≈ 137 KB) |
| CSS dos modos Legacy/Editorial/Serious | ≈ 56 KB, carregado para todos |
| `public/scripts/scenes.js` | ≈ 96 KB |
| Animações CSS com `infinite` | 149 declarações (198 `@keyframes`) |
| `backdrop-filter` | 36 |
| `filter: blur(...)` | 39 |
| `mix-blend-mode` | 14 |
| `will-change` | 13 |
| `content-visibility` | 0 |
| Detecção de aparelho (`deviceMemory`/`saveData`) | só nos scripts da 404 (limite ≤ 2 GB) |
| Mídia animada na home (já `loading="lazy"`) | `typing-left.webp` 1,2 MB (102 quadros), `shannon-blackboard-transparent.gif` 1,1 MB (113 quadros, 720×406) |

### Modelos 3D em `public/`

| Arquivo | Tamanho | Quem referencia |
|---|---|---|
| `experimental/sophia-alpha.glb` | 19,8 MiB | `sophia-404-renderer.js` (retrato), `modo-experimental` |
| `experimental/sophia-7b-e1-latest.glb` | 16,3 MiB | `sophia-404-renderer.js` (lounge) |
| `assets/models/hsin/hsin-v2.0.glb` | 9,4 MiB | scripts e páginas do Shorekeeper |

A página 404 importa `sophia-404-stage.js`, que usa o renderer acima. Os dois GLBs da Sophia somam ≈ 36 MiB.

**Gatilho (auditado depois da primeira versão deste documento):** o renderer é importado sob demanda, só quando o palco chega a 160 px da viewport (`IntersectionObserver`); não carrega com `prefers-reduced-motion`, `saveData`, modo Legacy ou Serious, e as ilustrações SVG e a comédia 2D são sempre a alternativa. **Lacuna encontrada:** nada decidia pelo aparelho. Um celular de 4 GB sem `saveData` baixava os modelos. Corrigido na branch `perf/fase-1-peso-morto`: com `navigator.deviceMemory ≤ 4` o 3D não inicia (teste: `tests/sophia-404-device-gate.test.mjs`). Em Firefox e Safari, que não expõem `deviceMemory`, nada muda.

## Correções à análise inicial

- `three` **não** é dependência morta: é usado por `src/scripts/shorekeeper/*` e pelo renderer da 404. Não remover.
- `@react-three/*` e `rapier` já saíram do `package.json`, e `sophia.jsx` já não existe na `main`.
- O `sophia.glb` de 10,7 MB citado antes não existe mais.

## Como medir (rodar localmente, antes e depois de cada fase)

```bash
npm ci
npm run build
npm run preview            # http://localhost:4321

# Home e 404, perfil de celular fraco (CPU 4x mais lenta, rede 4G simulada)
npx lighthouse http://localhost:4321/ \
  --form-factor=mobile --only-categories=performance \
  --throttling.cpuSlowdownMultiplier=4 \
  --output=json --output-path=./perf/home-mobile.json
npx lighthouse http://localhost:4321/rota-inexistente \
  --form-factor=mobile --only-categories=performance \
  --throttling.cpuSlowdownMultiplier=4 \
  --output=json --output-path=./perf/404-mobile.json
```

Complementos manuais no Chrome DevTools:

1. **Performance** (CPU 4x): gravar a rolagem da home inteira e anotar longas tarefas, FPS e o painel *Layers*.
2. **Memory**: heap snapshot após rolar a home inteira e após abrir a 404; anotar o total.
3. **Network**: bytes transferidos na carga inicial da home e da 404, com cache desativado.
4. Repetir com `prefers-reduced-motion` ligado, e nos modos Legacy, Editorial e Serious.

Registrar os resultados em `docs/perf-medicoes-AAAA-MM-DD.md` antes de qualquer mudança de código.

## Candidatos (ainda não implementados, na ordem proposta)

1. **404**: ~~condicionar o carregamento dos dois GLBs por aparelho~~ (feito, ver acima). Falta reduzir os próprios modelos para quem tem ≥ 8 GB; exige ferramenta de glTF (ex.: `gltf-transform`/meshopt/KTX2), indisponível nesta sessão.
2. **Renderização sob demanda**: `content-visibility: auto` nas seções e pausa das animações CSS fora da tela.
3. **Nível "lite"** por aparelho (`deviceMemory`, `hardwareConcurrency`, `saveData`, quadros lentos): desliga blur, backdrop-filter, mix-blend e animações decorativas infinitas.
4. **Mídia animada**: reduzir quadros/dimensões do GIF e do `typing-left.webp`. Os *stills* são gerados por `scripts/generate-motion-stills.mjs`, então a troca de formato precisa de build e revisão visual.
5. **CSS**: carregar os modos sob demanda e remover `@keyframes` sem uso (fase mais arriscada).
