# Sophia R1.C — C1 Identity & Contact Repair

**Estado:** execução R1.C parcial: `IDENTITY_BLOCKED`, gola experimental corrigida, contatos/vestuário não aprovados. Resultados verificáveis em [results/](results/), com [QA separado por gate](results/r1c-qa.json) e [reprodução](results/runbook.md). Nenhum asset ou runtime público foi alterado. O handoff histórico abaixo descreve o ponto de partida. Base: PR #304, commit c59335f823f30ed2af4e55ccddc1044277929d61. Preservar draft, sem merge.

## Source-first obrigatório para continuação com Claude

**Antes de editar geometria, leia `source-access-preflight.md` e `claude-r1c1-live-source-prompt.md`.** O proprietário autorizou inspeção somente de leitura dos assets Sophia necessários no R2 e acesso interativo ao WebView/Cloud Browser autenticado, mediante conexões e login efetivamente disponíveis. Confirmar a versão mais recente, o hash do GLB e o ativo que a página realmente carrega. A fonte 6H é doadora histórica, não C1 autoral certificada; a astronauta R3 tem outro propósito. A autorização não concede credenciais nem permite remover Access, expor R2 ou acessar outras personagens. **Sem `CURRENT_C1_SOURCE_VERIFIED`, suspender a adaptação do jaleco ao corpo final.** Registrar `ACCESS_BLOCKED` quando não houver acesso real.

## Resultados sólidos da R1.A/B
- Fonte `public/experimental/sophia-alpha.glb`: SHA-256 `3b0e7db84809d6e4fe6eaa2bc6299874c202c529adcbd369cf83c6a29d3c3a2a`, compatível com a candidata 6H arquivada.
- Piloto privado Book, Pen e três estrelas: SHA-256 `fd278e201f1854dd1a2dae6f24064a0c2f9013262007cece70ff478c28ff1fce`. Preserva payload BIN, rig 101 joints, 5 clipes, 4 morphs; 255 poses verificadas quanto a equivalência geométrica. **Não** certifica contato nem identidade.
- Book: 224 triângulos; Pen: 2.936 triângulos; estrelas antigas: 864 triângulos.
- Jaleco core/forro/lapelas têm UV, pesos e geometria recuperáveis; reparo limitado é GO para ensaio; Tripo está NO_GO.
- 61 poses e 915 verificações: wrists/forearms × sleeves 12/61, chin × collar 12/61, tail × body e tail × coat 61/61, ear ribbons × mane 4/61. Região de ombro sem faces: `REGION_UNRESOLVED`.
- O piloto e os renders estão **fora do Git**, em pacote privado do trabalho anterior; se não estiverem disponíveis, reconstruir apenas com os scripts versionados de #304 e verificar hashes. Não alegar ter visto arquivos privados sem inspeção.

## Identidade C1: correção essencial
As **três estrelas metálicas em relevo da 6H NÃO são a estrela C1**. A identidade C1 exige UMA MARCA DE NASCIMENTO DOURADA DE QUATRO PONTAS, PLANA, SOBRE A PELE DA TESTA E SOB A FRANJA BRANCA OPACA, frequentemente quase invisível na vista frontal. Não é halo, clipe, joia sobre o cabelo nem adorno elevado. Não adicionar ossos ou morphs apenas para ela.

A 6H continua `6H_VISUAL_CANDIDATE`, não é um corpo 3D C1 aprovado. A 7B E1 atual não tem rig/clipes. A astronauta R3 (47 clipes) é outra base protegida. Não selecionar corpo definitivo por conveniência.

## Dependência documental
O PR #303 recebeu mudanças de preflight posteriores à origem do PR #304: arquivos `claude-preflight-handoff.md` e `handoff-artifacts-required.md` na branch `planning/sophia-adornments-recovery-r1-20261113` (head cb1ae5eb). Ler esses requisitos e reconciliar com os resultados do #304, **sem merge cego de branches**.

## R1.C — tarefas autorizadas
1. **C0 — Identity lock candidato:** confrontar arte mestre C1 com 6H, 7B e piloto por quatro ortos; estabelecer explícito GO/NO_GO de base corporal. Se não existe base C1 aprovada, manter exclusivamente estudo 6H rotulado.
2. **C1 — Marca cutânea:** variante experimental com marca plana sob franja, somente quando UV/skin/cabelo permitirem; nunca usar o grupo das três estrelas antigas como resultado final.
3. **C2 — Contatos do Write:** corrigir nos dados derivados e reversíveis a empunhadura, pena-página, punho-manga, livro-cuff e queixo-gola com prova de origem de cada ajuste; não retimar os clipes fonte.
4. **C3 — Jaleco localizado:** reparo de gola, manga, lapela, ombro e barra com pesos do esqueleto existente; medir efetivamente ombro antes de afirmar melhora. Cauda e barra devem ser testadas em Walk/Idle.
5. **C4 — QA material:** GLB real, imagens e GIF/MP4 privados, diferença geométrica quantificada, testes WebGL e mobile como gates separados.

Não iniciar conversão de `/curiosidades/`, `/404`, modo imersivo ou cenas públicas; não modificar R3, Hsin, Shorekeeper, Cloudflare, assets originais nem main. Não usar Tripo até um NO_GO geométrico fundamentado do reparo A/B.

## Critérios para concluir
O resultado pode ser `R1C_6H_VISUAL_CANDIDATE` ou `IDENTITY_BLOCKED`, não necessariamente aprovação total. Entregar problemas remanescentes com screenshots e métricas sem mascarar falhas. A aprovação da identidade e do vestuário cabe ao proprietário.
