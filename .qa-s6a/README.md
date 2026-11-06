# S6-A Gate A — harness de QA (não é código do aplicativo)

Branch `qa/shorekeeper-s6a-gate-a-20261106` = `5380f43` (HEAD certificado S5-C) + apenas esta pasta e o workflow `shorekeeper-s6a-gate-a.yml`.
Nenhum arquivo de `src/`, `functions/`, `public/`, testes ou lockfile foi alterado. Não é para merge.

- `menu-contract.test.mjs` e `security-contract.test.mjs`: cópias byte a byte dos contratos externos da S5-C (`tools/`), verificação de código/protocolo, não de navegador.
- O workflow também faz requisições HTTP **não autenticadas** à prévia, registrando apenas status e cabeçalhos — o que qualquer visitante vê. Nenhum cookie, token ou credencial é usado.
