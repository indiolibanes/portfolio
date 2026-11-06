# S6-A Gate A — harness de QA (não é código do aplicativo)

Branch `qa/shorekeeper-s6a-gate-a-20261106` = `5380f43` (HEAD certificado S5-C) + apenas esta pasta e o workflow `shorekeeper-s6a-gate-a.yml`.
Nenhum arquivo de `src/`, `functions/`, `public/`, testes ou lockfile foi alterado. Não é para merge.

- `menu-contract.test.mjs` e `security-contract.test.mjs`: cópias byte a byte dos contratos externos da S5-C (`tools/`), verificação de código/protocolo, não de navegador.
- O workflow também faz requisições HTTP **não autenticadas** à prévia, registrando apenas status e cabeçalhos — o que qualquer visitante vê. Nenhum cookie, token ou credencial é usado.

## G7 A/B mecânico (`g7/`)

- `g7-ab-mechanical.mjs`: mede, com o plano de combo e o sequenciador **do próprio app**, cada transição Basic → Skill → Burst → Recovery nas variantes ORIGINAL / REBASED / ROOT_BODY_OWNED: lacuna da fonte (A@saída × B@entrada, sem blend), passo por frame a 30/60 Hz dentro da janela de fade, deslocamento/yaw de Root, Bip001, pelve e pés, e distância à pose de repouso.
- `g7-ab-mechanical.test.mjs`: validação sintética (sem dados privados) — prova que o harness detecta uma descontinuidade injetada.
- `run-g7-ab-private.mjs`: executar **na máquina do proprietário**, com o kit privado G11.3 e `expected.json`; confere SHA-256/bytes antes de ler e grava só fora do Git. Não renderiza, não baixa, não altera fontes.
