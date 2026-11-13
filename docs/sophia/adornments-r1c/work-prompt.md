# GPT-6 Sol — SOPHIA R1.C | Identity Lock & Targeted Garment Repair

> **CORREÇÃO AUTORAL PRIORITÁRIA (2026-11-13):** o alvo desta recuperação é a **Sophia RAPOSINHA / mascote celestial**, **não** a Sophia anime antropomórfica C1. O gate `IDENTITY_BLOCKED` por divergência com rosto/franja/proporções anime utilizou a referência errada e está **SUPERSEDED_WRONG_TARGET**. Consulte obrigatoriamente [`OWNER-CORRECTION-FOX-SOPHIA.md`](OWNER-CORRECTION-FOX-SOPHIA.md) antes das instruções históricas abaixo. As fontes 6H/7B/R5/R6 são candidatas da **raposinha**, e a falta de R2/WebView bloqueia somente a verificação REMOTA, não impede estudo não destrutivo sobre a 6H verificável. Não solicitar `Sophia_v1.1.glb` anime nem master anime como pré-requisito da R1.C.1. Reavaliar a identidade com a **arte 2D da raposinha**, sem aprovação artística automática.


**Esforço:** Alto. **Auditor independente posteriormente:** GPT-6 Astra, esforço Alto.
**Repositório:** `indiolibanes/portfolio`.
**Base operacional:** PR #304, branch `experiment/sophia-adornments-r1ab-20261113`, head `c59335f823f30ed2af4e55ccddc1044277929d61`.
**Handoff:** branch `planning/sophia-adornments-r1c-identity-contact-20261113`; PR draft de planejamento empilhado sobre #304, continuar nele com commits de implementação. Não mesclar nem alterar main.
**Meta:** corrigir identidade C1 e contatos/vestuário da Sophia autoral a partir do material recuperado, SEM criar um novo corpo, reesqueleto ou jaleco inteiro.

## 0. Preflight com divergências documentais
Leia integralmente:
- `docs/sophia/adornments-r1c/README.md`, `source-gates.md`, `qa-contract.md`;
- `docs/sophia/adornments-r1/results/go-no-go.md`, `independent-review.md`, `runbook.md`, `sockets.json`, `collision-summary.json`, `pilot-equivalence.json`;
- `docs/archive/sophia6h/Relatorio_6H.md` e `Verdict.json`;
- os documentos `claude-preflight-handoff.md` e `handoff-artifacts-required.md` no head do **PR #303**, `cb1ae5ebeaeee43b0ea26d2d7cdd2363905c7c8b`. Esta revisão mais recente NÃO está integralmente no PR-base #304. Reconciliar requisitos sem merge automático.
Antes de executar, conferir PRs/SHAs reais. Nunca tomar relatório do Work como substituto de abrir e inspecionar o GLB real.

## 1. Aceitar e reproduzir fontes
- Recalcular SHA-256 da fonte 6H: `3b0e7db84809d6e4fe6eaa2bc6299874c202c529adcbd369cf83c6a29d3c3a2a`.
- O piloto privado R1.B deve ter SHA-256 `fd278e201f1854dd1a2dae6f24064a0c2f9013262007cece70ff478c28ff1fce`. Se não estiver acessível, usar **apenas** o builder versionado `scripts/sophia-adornments/build_pilot.py`, conferir hash e explicar se foi reproduzido ou recuperado; não pedir um novo Tripo, nem inventar arquivo. Se falhar, `PILOT_UNAVAILABLE` e avançar somente com auditoria de fonte.
- A fonte contém 101 joints, clips `Idle`, `Write`, `Point`, `Wave`, `Walk`, quatro morphs. Validar materiais/UVs, acessores, sockets e matrizes originais.
- Os vídeos, GLBs derivados e arquivos BLEND devem permanecer privados; PR público só scripts e relatórios sanitizados.

## 2. C1 Identity Lock é pré-requisito, não efeito cosmético
A Sophia C1 requer identidade autoral inequívoca: rosto, cabelos branco/prata, olhos dourados, orelhas de raposa e **uma única marca de nascimento dourada plana de quatro pontas NA PELE da testa, parcialmente sob franja branca opaca**. Não usar os três relevos antigos da 6H como o resultado final. Não construir halo, broche na testa ou decal pintado sobre a franja.
- Compare a fonte 6H, piloto 6H, 7B E1 e master C1 fornecido, em mesma escala, luz e vistas 0°, 45°, 90°, 180°.
- Se o master C1 não estiver disponível, documentar `C1_REFERENCE_UNAVAILABLE`. Não chamar a 6H de canônica.
- Prototipar SOMENTE no modelo de ensaio escolhido, uma marca plana ancorada à superfície cutânea: preferir material/UV/máscara de material, ou pequena intervenção superficial não saliente se necessário, sob geometria opaca da franja. Validar a oclusão frente/¾/perfil e movimento de cabeça.
- Se a fonte 6H não tiver franja adequada para ocultar a marca sem reconstruir identidade, retornar `IDENTITY_BLOCKED`, fornecer diagnóstico e opções, sem improvisar um novo penteado por conta própria.
- Não remesclar corpo C1/7B, não rigar novamente, não converter astronauta R3 em Sophia autoral.

## 3. Reparos locais de contato: escolha uma ordem racional
Primeiro corrigir o pipeline de QA dos ombros: `shoulders__coat` resultou em `REGION_UNRESOLVED` com 0 faces selecionadas. Criar seleção anatômica auditável e documentar se a região mede realmente colisões.
Depois, na candidata experimental e de forma REVERSÍVEL:
A. `Write` — punho/manga, caderno/cuff, pena/página, empunhadura e queixo/gola. O pivô original de Pen/Book tem animação válida; não reescrever clipes de origem. Usar offsets limitados, pesos/correções locais, constraints/sockets, ou derivado de keyframes somente se sua necessidade for demonstrada. Preservar Write e provar diferença.
B. `Wave` — ombro/cabeça, manga/antebraço, colarinho; respeitar abdução original.
C. `Idle/Walk` — cauda/barra/corpo, volumes do jaleco, orelhas/fitas. Não amputar a cauda nem fazê-la atravessar o tecido.
D. Jaleco: recuperar skin existente em core, lining e lapelas. Corrigir *somente* ombro/cotovelo/colarinho/punho/barra, sem mudar paleta, recortar corpo ou parentear roupa inteira num único osso.

A matriz baseline de 61 poses indicou:
- wrists_forearms × sleeves 12/61;
- cuffs × Book 60/61;
- chin × collar 12/61;
- tail × body 61/61 e tail × coat 61/61;
- ear ribbons × mane 4/61;
- hands × Pen 61/61 — provavelmente contém contato de empunhadura, não zerar às cegas.

Reamostrar as mesmas 61 poses e adensar as janelas piores, classificando penetração visível, contato legítimo e indefinido. Nunca afirmar melhora comparando seletores regionais diferentes sem normalizar método. Se reparo introduzir deformação de malha em outras poses, revertê-lo.

## 4. Jaleco: tentativa A obrigatória antes de B/C
- A: reparos localizados na malha e nos pesos originais (GO para tentativa).
- B: retopologia/remesh parcial da peça comprovadamente irrecuperável, apenas com evidência e review.
- C: Tripo3D isolado = **NO_GO** nesta etapa, salvo autorização posterior expressa após demonstrar falha de A e B.
Sem novo skeleton nem novas morphs por padrão. Se um corretivo de ombro for indispensável, registrar morph derivado como opção e comparar poses; nunca alterar morphs faciais aprovados.

## 5. Estudo visual e software
Produzir evidência de GLB real com skinning/morphs em um harness privado e, se possível, via Three.js WebGL; render Blender CPU separado e rotulado. Previews:
1. Rosto C1 / marca: mesmo frame e câmera (0°, ¾, perfil).
2. `Write`: close dos dedos, pena, capa do caderno, manga, queixo e gola (3 s).
3. `Wave` + `Walk`: ombro, manga, barra, cauda e figurino em movimento.
4. Orto geral source → candidata.
Não confiar apenas em proximidade numérica: demonstrar contato e ausência de interpenetrações visíveis.
Não publicar modelos ou vídeos no Pages/PR. Somente descrição, SHA e resultados em Git.

## 6. Regressões e segurança
Rodar `npm run check:sophia-adornments`, `npm run check:sophia`, `npm run check`, `npm run build`, equivalência/diff do glTF, e 10 ciclos de carregamento/descarte em QA. Medir draw calls/geometrias/texturas no renderer real se disponível. GPU Android/Samsung é pendência separada, não presumir 60 FPS.
Preservar R3 astronauta e os 47 clipes, URLs/API, roteamento `/modo-imersivo/`, 2D, `/404` Tetris, Curiosidades, Hsin, Shorekeeper, Phrolova, Cloudflare Access/R2, main e PRs preexistentes.
Nenhuma alteração pública/GLB principal em R1.C.

## 7. Entregáveis e honestidade do status
Manter **um único PR draft R1.C empilhado em #304** (o de handoff, se já existir). Produzir:
- `r1c-identity.md`: modelo candidato e diferenças C1;
- `r1c-contact-matrix.csv`: método, poses e antes/depois;
- `r1c-coat-go-no-go.md`: deformação e decisão A/B/C;
- `r1c-source-diff.json`: original e modificado com hashes e alterações por malha;
- `r1c-qa.json`: gates independentes;
- `r1c-private-manifest.json`: SHA/nome de GLB, BLEND, PNG, GIF, MP4, sem URLs autenticadas;
- vídeo/ortos/GLB derivados somente por canal privado autorizado.
Se faltar corpo C1, marca/franja ou piloto, entregar `R1C_6H_VISUAL_CANDIDATE` com bloqueios, não alegar identidade, vestuário ou produção concluídos.

**Não iniciar R1.D, Tripo, 404, Curiosidades ou merge automaticamente. A aprovação estética é do proprietário.**
