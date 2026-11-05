# Shorekeeper R6.0.4 / R7-C1 — entrega parcial

Data: 2026-11-04 (America/Campo_Grande). **R604_PARTIAL / ULT_SOURCE_GATE_PENDING / VISUAL_QA_PENDING.**

O tronco R2 da #248 passa a conter a bancada facial R6 opt-in e um relógio de apresentação comum. A duração corporal deixa de perder intervalos acima de 100 ms. O repouso estático pode encerrar o RAF; céu, controles com damping, borboletas e transições legítimas continuam animados. A Ult cinematográfica e a rotina canônica completa **não foram implementadas nem aprovadas** nesta candidata.

## Fontes congeladas

| PR | Head conferido antes da implementação | Papel |
|---|---|---|
| #238 | c43b9a956fea4f8fe70d8164340e2376d84ed310 | Port seletivo da implementação facial R6, QA, ownership, atlas numérico e regressões |
| #239 | 5555743fbae26ab055434ff44fbd5194c2af95b0 | R2, manutenção e galeria aprovadas |
| #242 | 6a69328d9b452397a835253fd737d17fc56fbdef | Preflight documental da convergência |
| #247 | e079cac49185cda27df09946b795deed90b9e775 | Preflight documental da cinematografia |
| #248 | 17a2bf74efa27ff194871ab53f2b27768816b90f | Base desta branch; correção de handoff do loader preservada |

Busca de PRs, branches e histórico por R6.0.2 não localizou outra entrega verificável: `R602_DELIVERY_UNLOCATED`.

Os 15 arquivos do manifesto do pacote privado tiveram tamanho e SHA conferidos. Foram inspecionadas privadamente as três folhas de contato e recontados os GIFs: 165 quadros/5,51 s; 86/2,86 s; 132/4,41 s. Esses tempos pertencem à mídia, não aos clipes. Nenhuma imagem, GIF, GLB, token ou captura privada integra este commit.

## Implementação efetiva

- Port da R6 para `?facialR6=1`, com imports lazy, compositor exclusivo Face/Eye e desmontagem da UI/lease antes do descarte do modelo. A galeria manual, receitas, geometrias explícitas e modo R2-first/maintenance continuam no caminho padrão; não há promoção automática de candidatos R6.
- `PresentationClock` recebe timestamps do único RAF. Render pacing limita desenhos, sem truncar o tempo narrativo. Speed escala o delta uma vez; os diretores do laboratório recebem velocidade interna 1. Pause, offscreen, buffer e context loss reancoram o timestamp para não incorporar tempo oculto. `seek` do combo reancora o relógio e reposiciona o corpo.
- O diretor de clipes originais preserva o resto de delta ao cruzar entrada/execução/recuperação, com uma avaliação do mixer por avanço. Sequenciador, recuperação e narrativa manual/VFX deixam de limitar o delta a 100 ms.
- Política explícita de demanda substitui o RAF incondicional. O céu visível permanece uma razão legítima para animar, mesmo com efeitos desligados; VFX OFF, isoladamente, não significa cena estática. O loop existente mantém um único callback pendente e é acordado por comandos/controles.
- Context loss cancela fetch remoto, loader do modelo, geração/loader de bibliotecas, preparação e câmera; bibliotecas obsoletas não são adotadas. O resultado do modelo também é descartado se ficar obsoleto durante imports lazy.
- Cache de preparação por identidade do modelo/biblioteca, SHA do modelo/bundles e variante; invalidação em substituição, abort e context loss. Métricas agora distinguem wall/work, maior slice e maior unidade indivisível, agrupadas pela fase reportada pelo gerador. Nenhum Worker ou GLB adicional foi criado.
- Telemetria rolling de 512 amostras: p50/p95/p99 de intervalo e CPU. GPU continua `NOT_MEASURED`; a distribuição de intervalos não é tempo de GPU. DPR 1/1,5/2 e perfis de densidade existentes foram preservados, sem alegar melhoria física medida.
- `semantic-cues.mjs` fornece infraestrutura isolada: marcadores exigem SHA, clip/variante, frame, tempos, provenance e evidence; cruzamentos emitem uma vez/ciclo; seek recompõe estado sem emitir cues antigos. Ainda **não está ligado ao combo nem à câmera/VFX de runtime**. Fixtures sintéticas não são marcadores de Shorekeeper.

## Bloqueio de fontes e limite do aceite

O Pages confirma binding de bucket europeu no ambiente Preview. A leitura autenticada disponível por API retornou 404 no escopo padrão; a ferramenta não expõe o header de jurisdição europeu requerido. Isso **não prova ausência de arquivos no bucket europeu**. Não houve mudança em Access, bucket, permissões ou configuração.

O GLB canônico esperado tem SHA `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`. Seus bytes e os hashes atuais dos três bundles **não foram obtidos/recalculados nesta execução**. O único GLB original encontrado no acervo tem outro tamanho (18.336.444 bytes), e não foi usado como substituto do canônico (39.487.548 bytes esperados).

Consequentemente: `HEAVY_ATTACK_UNVERIFIED`; Skill01 candidata RS; Burst01/Burst02 candidatas Ult. Não houve A/B/C real, amostragem worldMatrix/solas @30/@60, identificação de apoio, marcador de clipe, nova câmera ou Outer Stellarealm sincronizado. O combo legado continua sendo 4 BA → Skill01 → Burst02 → recuperação/Idle, explicitamente uma prévia; não foi renomeado para a sequência 3BA → HA → RS → Ult.

## Validação e diferenças de evidência

- Suite Node `tests/shorekeeper-*.test.mjs`: 155 resultados PASS, incluindo 70 streams de baseline R6 bit-exact. Os sete testes R604 cobrem 60/30/15/5 FPS, drops, 0,5/1/1,5×, pause/reanchor/seek/reset, VFX sem clamp, cues e RAF, telemetria e três reloads de controladores com combate/recuperação.
- `npm run check`, `npm run build`, higiene de build e `git diff --check`: PASS local. CI remoto deve ser consultado no commit final da branch.
- Provas são numéricas/fixtures de controladores; não equivalem a R2 autenticado → GLB real → facial → combate → recuperação no navegador. Os testes históricos de loader continuam incluídos.
- A prévia gerenciada retornou bloqueio de host `terminal.local` pelo servidor Astro/Vite. O servidor foi encerrado sem mudar a configuração do projeto para contornar a infraestrutura. Browser/WebGL desta candidata permanece pendente até uma prévia hospedada acessível.
- Sem vídeos novos, capturas A/B/C, Samsung, GPU física, 600 s em aparelho, VRAM ou aceite visual. Não há alegação de redução de bateria, CPU/GPU ou FPS físico.

## Continuação necessária

1. Obter os quatro arquivos privados por fluxo autorizado compatível com a jurisdição, conferir os hashes e carregar os dez clipes no mesmo head.
2. Validar três reloads, troca de modo, load/abort, offscreen e perda/restauração real WebGL com facial R6 e galeria, conferindo owners e recursos.
3. Medir A/B/C com todas as chaves e solas skinadas; preencher o mapa JSON somente com proveniência privada. Atualmente `markers: []` é intencional.
4. Implementar a rotina confirmada, câmera com envelope/margens portrait e 16:9, composição determinística de VFX e recuperação; então medir GPU/DPR e 600 s/3 ciclos em Samsung.
5. Manter `VISUAL_QA_PENDING` até revisão humana. Hsin/DUO ficam fora desta entrega.

Rollback: reverter este commit na branch empilhada; nenhuma migração ou modificação de dados remotos. Sem merge, push em main ou deploy manual de produção.
