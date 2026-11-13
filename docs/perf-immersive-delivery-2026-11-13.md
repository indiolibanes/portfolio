# Entrega do GLB da Sophia — auditoria 2026-11-13

Branch `perf/auditoria-imersivo` (a partir de `main` 756bc52). Sem merge, sem deploy.

| Gargalo | Correção |
|---|---|
| HEAD `no-store` antes do GET: 1 ida e volta extra à Function + R2 | Um único GET; status 404/503 e content-type validados na própria resposta |
| `Cache-Control: max-age=3600` | `max-age=86400, stale-while-revalidate=604800` (nome versionado v1.1) |
| Sem revalidação | `If-None-Match` repassado ao R2 (`onlyIf`) → 304 sem corpo |
| Chave resolvida a cada requisição (leituras falhas + `list()` a frio) | Chave aprovada memorizada por isolate (só vem da allowlist ou da listagem filtrada pelo nome aprovado) |
| `arrayBuffer()` sem feedback | Leitura em stream com percentual no status |

Segurança preservada: nenhuma chave vinda do cliente, nenhuma listagem exposta, Access/Shorekeeper intocados (`private, no-store`).

## Não medido
Sem acesso ao R2/GLB, WebGL, npm ou Lighthouse. Ganho real de tempo depende de medição em produção. O maior ganho restante é offline: comprimir o GLB (meshopt/Draco + KTX2 via gltf-transform) — exigiria também o loader correspondente e QA visual.
