# Sophia — prontidão do runtime para o Lab R2 (relatório)

Base: cabeça verificada do PR #312 (`feat/sophia-lab-r2-20261114`, `0303e90`). PR único, em rascunho, sem merge. Nenhum GLB, textura ou variante foi adicionado; CSP, `_headers`, dependências e o GLB principal ficaram intactos.
Legenda: **PASS** / **FAIL** / **PARTIAL** / **BLOCKED** (ambiente impede) / **NOT RUN**. Medições = Chromium headless com SwiftShader (CPU): valem para contagem de contextos, requisições, estados e ordem de eventos. **Nada aqui afirma desempenho de GPU ou de celular.** Não há indicador de FPS.

## 1. Defeitos medidos (antes) e correções (depois)

| # | Defeito reproduzido em #312 | Antes | Depois | Arquivo |
|---|---|---|---|---|
| D1 | `lab-r2` ainda não publicado: cada visita pedia o GLB (404) e subia um contexto WebGL à toa | S1: 2 contextos, 1 requisição 404 | S1: 1 contexto, 0 requisição ao R2 | `sophia-actor.js` (`published`, `useFallback`) |
| D2 | Rede cai / corpo não-GLB / GLB truncado: o contexto era criado **antes** de validar os bytes e vazava | F1–F3: 3 contextos criados, nenhum liberado | F1–F3: **0** contextos; 2D permanece | `glbBytes`/`checkGLB`/`releaseGL` |
| D3 | Um ator que lança erro em `draw()` derrubava o laço de rAF de **todos** | F11: 0 quadros em 1,5 s | F11: 11 quadros; só o ator com erro volta ao 2D | `failActor` |
| D4 | Ator ficava registrado após falhar o 1º desenho | F12: registrado = [true,true] | [false,false], 2D visível | `wake` |
| D5 | Perda de contexto de **um** palco reconstruía todos, e `dispose()` em contexto perdido gerava `INVALID_OPERATION` | F10 ×5: 3 contextos vivos | 2 vivos (= nº de palcos), bytes do GLB reutilizados, sem re-download | `resetStage(key)`, `gltf-gl.js` |

Heap (JS) em F10: oscila 9–35 MB nas duas versões (GC + SwiftShader); **não há evidência de diferença de vazamento de heap**. O ganho comprovado é em contextos e requisições.

## 2. Relatório de carga inicial (Chromium/SwiftShader, 900×700)
- Scripts: `sophia-actor.js` 19 KB, `gltf-gl.js` 30 KB, `gltf-skel.js` 20 KB, `gltf-morph.js` 2 KB, novo `sophia-clip-contract.js` 3 KB — todos carregados em paralelo após o primeiro (cadeia de 2 níveis, como antes). Download do GLB inicia ~80 ms após o carregamento da página (local, sem rede real → **tempos de rede NOT RUN**).
- GLB padrão 17,9 MB (público, já existente). `lab-r2` (~6 MB, privado) só é pedido quando `published: true`.
- Primeiro quadro 3D válido: ~2,5 s em SwiftShader, dominado pela compilação de shaders na CPU — **não representa celular nem GPU real** (PARTIAL).
- Transição 2D→3D: em todos os eventos medidos o `data-sophia3d="on"` só ocorre com `alphaSum > 0` no canvas (quadro válido já copiado). **PASS**: a ilustração só some depois do 1º quadro válido; terminar o download não a oculta.

## 3. Matriz de contextos WebGL e memória
| Cenário | Contextos | Observação |
|---|---|---|
| Atores só com modelo padrão (runner + lab fallback) | 1 | `canvas` compartilhado por modelo (`stagePromises`) |
| R2 publicado (runner + lab-r2) | 2 | um contexto por modelo; animações independentes (esqueleto por ator) |
| Falha de rede/decodificação | 0 | antes: 3 |
| Perda+restauração de 1 palco | +1 | antes: +2 e INVALID_OPERATION |
| Aba oculta | sem desenhos (0/s), retoma a ~8/s | PASS |
| Viewport sai/entra (3 atores) | 1 contexto estável | PASS |
| Modo retrô liga/desliga/liga | 0 → 1 → mantém contexto, 2D volta | PASS |
| reduced-motion / Save-Data / deviceMemory ≤ 4 | 0, 0 requisições GLB | PASS |
Memória de GPU estimada do GLB padrão público: 6 texturas 2048² RGBA8 + mips ≈ 128 MB (calculada, não medida). Textura 4K equivale a ≈ 85 MB cada; 2K ≈ 21 MB.
**Decisão sobre contexto único compartilhado: NÃO implementado.** Sem GPU real não há benefício demonstrável; exigiria API de descarte por modelo no `Renderer` e arriscaria as animações independentes. Reavaliar com medição em GPU/celular quando o R2 estiver publicado.

## 4. Avaliação 4K × 2K — **NOT RUN (R2)**
O GLB do R2 não está disponível/autorizado nesta sessão. Ferramenta pronta: `scripts/sophia/readiness/texture-2k-eval.py --glb <cópia autorizada> --out <fora do repo>` (recusa gravar dentro do repositório; não altera geometria/rig/UV). Teste de fumaça no GLB público: as texturas já são 2K (nenhuma redução aplicável). Critério de aceite continua do proprietário: olhos, estrela da testa e bordados legíveis nos recortes lado a lado; sem evidência, a textura original permanece.

## 5. Contrato dos clipes opcionais do caderno
Ver `clip-contract.md`. Resumo: o runtime aceita `Lab_Book_Equip_P1`, `Lab_HoldBook_P1`, `Lab_Write_P1`, `Lab_PauseRead_P1` (opcional), `Lab_Book_Unequip_P1`; a cena fica desligada (`bookScene:false`) e, sem os clipes, o comportamento é idêntico ao atual. Sem animações fictícias, sem caderno/caneta no modelo, biblioteca de 6 animações intacta.

## 6. Matriz de QA
| Item | Status |
|---|---|
| `tests/sophia-pre-r2-runtime.test.mjs` (12 novos) | PASS 12/12 (no #312 sem as correções: 0/5 passam os de ciclo de vida) |
| `sophia-lab-r2`, `sophia-r15-runtime`, `sophia-public-r2`, `sophia-immersive-r3`, `sophia-launch-timeline/audio`, `sophia-omega`, `sophia-r3-polish`, `sophia-adornments` | PASS (iguais ao #312) |
| 404 (`sophia-404-device-gate`), `performance-route-isolation`, Tetris, música (`test-music-state`), `check-ux-contract` 100/100, `check-seo`, `check-sophia-7b` | PASS |
| `sophia-launch-cradle`, `sophia-launch-director` | BLOCKED — faltam `node_modules/three` (falham igual no #312) |
| `npm ci`, `npm run build`, `npm run check` completo | BLOCKED — registro npm inacessível |
| Chromium WebGL real (F1–F12, S1–S2) na bancada, não na página `/` | PASS/PARTIAL — harness próprio; página real exige build (BLOCKED) e fica atrás do Access |
| Desempenho em celular / GPU real | NOT RUN |
| Contexto perdido/restaurado ×5, atores montar/desmontar | PASS (contextos), heap inconclusivo |

## 7. Segurança (escopo relevante)
Sem URL externa nova; imports apenas de mesma origem e estáticos; chaves de modelo vêm de tabela fixa (`MODELS`), não do DOM livre; sem alteração de CSP/`_headers`/dependências; sem caminhos/IDs privados nos arquivos novos; `lab-r2` não carrega sem `published: true` (decisão explícita do proprietário); estágios por modelo isolados e liberados (`loseContext`) em falha/descarte.

## 8. Riscos restantes
1. Tempo real de rede/GPU/celular desconhecido (NOT RUN). 2. Em falha de decodificação o estágio do modelo padrão permanece vivo para nova tentativa (1 contexto). 3. Perda de contexto em GPU real pode ter comportamento diferente de `WEBGL_lose_context`. 4. Compartilhar contexto único segue como opção a medir. 5. Dois GLBs (≈ 24 MB) quando R2 publicado, com cache de 1 dia na pasta pública.
Para publicar o R2: copiar o GLB para o destino autorizado e trocar `published: false → true` em `MODELS['lab-r2']`. **A aprovação final é do proprietário.**
