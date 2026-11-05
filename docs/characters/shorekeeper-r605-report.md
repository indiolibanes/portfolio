# Shorekeeper R6.0.5 / R7-C2 — parcela técnica verificável

Data: 2026-11-04, America/Campo_Grande. **R605_TECHNICAL_PARTIAL / AUTHENTICATED_R2_UNAVAILABLE / LIBERATION_MAPPING_UNVERIFIED / VISUAL_QA_PENDING.**

A #249 continua aberta em draft no SHA `cdf9b93485889b3be49080f37c34489fcfd01d1a`, sobre a #248 `17a2bf74efa27ff194871ab53f2b27768816b90f`. Os três workflows da base foram reconferidos e estão em success. O merge-base coincide com a #248. `local-model.mjs`, os seis testes de handoff do loader e `render-loop.mjs` são preservados. A #250 está fechada, não mesclada; sua hipótese de wake reentrante não foi importada.

## Resultado por área

| Área | Resultado | Evidência e limite |
|---|---|---|
| Herança R2/R6/#248 | PASS estrutural | Base e ancestralidade conferidas; golden R6 e regressões R5 verdes |
| Fontes R2 atuais | PENDING | Binding Preview europeu confirmado; navegador bloqueado antes de ler a página autenticada |
| Forense @30/@60 | PASS de ferramenta | A/B/C, mundo/parent transform, yaw, arco 3D e solas comprovados em rig sintético; nenhuma medida real de Shorekeeper |
| HA / RS / Liberation | PENDING | Nomes continuam candidatos; nenhum timestamp, sourceFrame ou orientação final inventados |
| Cinematografia/Outer | PENDING | Condicionada às fontes; combo/câmera/narrativa legados não foram rebatizados como Ult canônica |
| GPU timer / DPR | PASS de contrato | Queries e controlador testados com mocks; integração opt-in, sem medida física |
| WebGL | PENDING, ambiente | Harness servido e aberto; o contexto WebGL2 retornou indisponível antes do primeiro frame |
| Samsung 600 s / 3 Ult | PENDING | Dispositivo e fontes indisponíveis; nenhum FPS/GPU/thermal aprovado |

## Fontes e acesso

O projeto Pages `kaue` continua apontando para o binding europeu existente. A especificação do endpoint R2 exige `cf-r2-jurisdiction`; a interface de chamada disponível não expõe headers arbitrários. Não foi repetida a leitura no escopo padrão para produzir outro 404 enganoso, nem foram alterados bucket, Access, Worker, permissões, DNS ou rotas.

A tentativa de retomar a aba da prévia via fluxo normal encontrou rejeição da revisão automática: a origem `horologiarius.cloudflareaccess.com` requer autorização explícita para leitura/autenticação. Não houve login, extração de cookies/tokens, leitura de arquivos privados, navegação alternativa para contornar a rejeição ou aquisição de GLB por URL pública. Os quatro hashes atuais e a reprodução dos dez clipes continuam **não verificados**.

Os seis hashes/tamanhos das referências privadas do pacote foram conferidos. Os GIFs têm 165/86/132 quadros e 5,51/2,86/4,41 s, respectivamente. As folhas de contato são idênticas às referências anteriormente inspecionadas. Nenhum desses tempos foi convertido para tempo de clipe ou apresentação. Nenhuma imagem/GIF foi copiada para esta branch ou dist.

## Mudanças, evidência e limites

1. `src/scripts/shorekeeper/source-motion-audit.mjs:29`: análise numérica em clone isolado, preservando o transform mundial do modelo e do parent. Exporta todos os `track.times/values` originais, quaternions locais/mundiais normalizados, hemisfério contínuo mundial, world matrices, posições de Root/Bip001/pelve/cabeça/mãos, forward projetado e yaw desembrulhado. Arco de rotação 3D é separado de yaw. Root e Bip001 exigem eixos forward locais calibrados separadamente; não se assume que seus eixos coincidem. Forward vertical gera null; não se interpola um giro através da singularidade. O grid combina @30/@60 com key times, deduplicação 1e-7 s e endpoint exato. `sampleFrame` é índice diagnóstico; `sourceFrame` permanece null sem correspondência PSA comprovada.
2. Solas exigem nomes de meshes skinadas, índices de vértices, evidência, piso, unidades e tolerâncias explícitas. `getVertexPosition` + skeleton/world matrices mede vértices deformados. Contato usa banda de altura, velocidade dos mesmos vértices entre amostras e permanência mínima. É um resultado numérico dependente da calibração, não certificação visual de aterrissagem. Intervalos de apoio iniciais e finais são exportados separadamente; pico de pelve não é automaticamente um marcador da Ult. Alta velocidade entre chaves ainda pode causar alias angular; inspeção visual continua obrigatória.
3. `scripts/shorekeeper/audit-private-source.mjs:24`: ferramenta offline para arquivos previamente adquiridos pelo fluxo autorizado. Exige modelo canônico/hash/tamanho, manifesto e três bundles, valida os dez IDs nos respectivos grupos e exercita bindings reais de AnimationMixer. Gera doze relatórios privados (duas Bursts × três variantes × 30/60). Não faz fetch, não promove identidade HA/Ult e não publica. Recusa relatórios dentro do repositório e usa criação exclusiva/permissions privadas. Parsing é **data-only**, com texturas-placeholder sem decode/render: não equivale a reprodução visual dos arquivos reais. Esta execução não obteve os binários e não executou essa análise real.
4. `src/scripts/shorekeeper/gpu-timer.mjs:2`: instrumentação opt-in de `EXT_disjoint_timer_query_webgl2`, até quatro queries pendentes e 120 amostras, sem bloqueio/RAF próprio. Queries disjoint são descartadas; loss/restore/dispose limpam os handles. `timerQueryMs` p50/p95/p99 fica separado de CPU e intervalo. Extensão ausente/sem amostra não fabrica números, e `physicalGpuValidation` permanece NOT_VALIDATED mesmo se um timer estiver disponível em renderer de software.
5. `src/scripts/shorekeeper/adaptive-quality.mjs:2`: DPR opt-in entre 1 e teto escolhido (máximo 2, teto de pixels existente preservado), passos 0,25, janelas de 60 amostras, histerese e cooldown de 6 s. Usa custo medido de CPU render ou último timer GPU, nunca intervalo de frame para confundir pacing com gargalo. Não reduz partículas nem remove efeitos essenciais. Ganho físico e thresholds ainda exigem benchmark. Sem opt-in, não há adaptação ou consulta da extensão, e o caminho por frame evita ordenar amostras de timer.
6. Wiring em `stage.mjs` e `shorekeeper-sk-lab.mjs`: `?gpuTiming=1` e `?adaptiveDpr=1` ativam separadamente os experimentos. Defaults, câmera, roteiro, galeria facial e R5 permanecem iguais. A instrumentação usa o RAF e o renderer existentes. Nenhuma mudança genérica de wake foi feita; o teste antigo R5 continua intacto.

## Reproduzir sem fontes privadas

```sh
node --test tests/shorekeeper-*.test.mjs
npm run check
npm run build
node scripts/shorekeeper/build-r605-webgl.mjs /absolute/scratch/r605-fixture-preview
```

No Work gerenciado, servir o diretório de fixture retornado com `sites-preview start /absolute/scratch/r605-fixture-preview`. O builder gera somente um harness estático de primitivas sintéticas, fora do checkout, sem modificar `astro.config.mjs` ou a configuração de produção. O harness contempla três ciclos sintéticos, R6, VFX R5, retrato/landscape, descarte, perda/restauração WebGL e métricas; seu watchdog falha explicitamente se não terminar. **Neste ambiente parou em WebGL2 indisponível; nenhuma dessas verificações renderizadas é marcada PASS.**

## Reproduzir após acesso autorizado

Guardar fora do checkout o `manifest.json` obtido da rota autenticada e os quatro GLBs com os nomes daquele manifesto. Preencher a calibração privada seguindo `shorekeeper-r605-calibration.template.json`, com prova visual para piso/forward/solas; o template contém null/arrays vazios e deve falhar enquanto não calibrado.

```sh
node scripts/shorekeeper/audit-private-source.mjs PRIVATE_DIRECTORY CALIBRATION_JSON NEW_PRIVATE_OUTPUT_DIRECTORY
```

O diretório de saída precisa ser novo, com parent existente e fora do repositório. Hash por clipe identifica nomes, duração, interpolação e bytes dos arrays, não o arquivo GLB inteiro; o SHA do bundle é exportado separadamente. Não publicar os traces JSON, que contêm curvas e coordenadas privadas. Reproduzir depois sob a mesma câmera e VFX OFF e preencher os markers apenas com `sourceFrame/clipTime/evidence` certificados. A ferramenta não substitui essa revisão.

## Validação desta candidata

- Base: 155 resultados Node PASS. Candidata: **163 resultados PASS**, incluindo os 70 streams golden R6 e oito testes R605. Testes R5 originais e hotfix loader preservados.
- Testes novos: A/B/C @30/@60, giro sintético acumulado de duas voltas, contato skinado com unidades de fixture, parent transform, rejeição de calibração/hash ausentes, endpoint e raw key times, assinatura por clipe, 200/1000 ms em 60/30/15/5 FPS, DPR e queries com disjoint/dispose/limite.
- `npm run check`, `npm run build`, higiene de build e `git diff --check`: PASS local. CI e prévia devem ser consultados no head final remoto; não se usa o CI da base como se fosse o da candidata.
- WebGL tentou executar em navegador real do ambiente e retornou `WebGL2 indisponível`. Não foi forçado outro backend/fingerprint nem declarada validação SwiftShader/GPU.
- Não há novas medidas históricas CL.1/C.4 na coluna de resultados. Valores numéricos dos testes pertencem somente às fixtures. Sem GLB real, vídeo Ult, apoio real, direção final ou sessão Samsung.

## Rollback e continuação

Rollback imediato dos experimentos: remover `gpuTiming=1` e `adaptiveDpr=1` e recarregar. Rollback de código: reverter o(s) commit(s) desta branch empilhada, retornando à árvore #249; nenhum dado remoto ou migração existe. O hotfix #248 permanece na base. Sem merge ou alteração de main/Hsin/Access/R2.

Para continuar: autorização explícita da origem Access e acesso efetivo aos quatro binários; calibração privada; A/B/C renderizado e mapping HA/RS/Bursts; só então contrato cinematográfico/Outer, sincronização determinística, vídeo em dois aspectos e Samsung 600 s/3 ciclos. Sonnet e Astra são passes futuros e **não foram executados** nesta entrega.
