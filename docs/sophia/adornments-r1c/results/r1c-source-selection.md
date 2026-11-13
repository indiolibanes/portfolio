# SOPHIA R1.C.1 — Seleção de fonte (preflight ao vivo)

**Veredito: `ACCESS_BLOCKED`.** Não foi possível verificar `CURRENT_C1_SOURCE_VERIFIED`. Nenhum trabalho de malha, rig, pesos ou animação foi feito nesta sessão.

Data: 2026-11-13. PR #305, branch `planning/sophia-adornments-r1c-identity-contact-20261113`, HEAD de abertura `d4a5fdf` (só documentação sobre o código auditado `b195340`). Sem merge.

## O que foi tentado e o resultado

| Acesso | Resultado |
|---|---|
| R2 (somente leitura, prefixos Sophia) | Sem conector de armazenamento nem credencial delegada nesta sessão. Nada listado ou baixado. |
| Navegador autenticado (Cloudflare Access) | Nenhum navegador conectado a esta sessão (built-in e Chrome indisponíveis). Sem como fazer o login interativo. |
| Site publicado (`kaue.pages.dev`) pelo sandbox | Bloqueado pela política de rede do sandbox (403 no túnel). Não é prova sobre o site. |
| Arquivos privados (BLEND, master C1, pacotes 6H/R1.B/R1.C) | Não anexados a esta sessão. |

## Tabela de decisão (só o que é verificável aqui)

| Ativo | SHA-256 | Data | Papel | Carregado pela UI? | Identidade C1 | Decisão |
|---|---|---|---|---|---|---|
| `sophia-alpha.glb` (6H, rastreado no Git) | `3b0e7db8…3c3a2a` (recalculado) | 2026-10-27 | Doador histórico | Não verificado | Bloqueada (3 estrelas elevadas, mascote) | `LEGACY_6H_DONOR_ONLY` |
| `sophia-7b-e1-latest.glb` (7B, rastreado) | `b0f2c2e9…91c53a` (recalculado) | 2026-10-30 | Doador desrigado | Não verificado | Não é C1 | Doador |
| Derivado R1.C | `ce3386a0…eb62666` (do manifesto) | — | Revisão privada | Não | Bloqueada | Não é fonte |
| Master 2D C1 | `e33a6e9f…142f5` (do manifesto) | — | Referência 2D | n/a | Referência | Não recalculado (arquivo ausente) |
| Astronauta R3 | `e9bddcd7…e3674` (relatório) | — | Separado, somente leitura | Via `/api/sophia/rocket` | Não é C1 | Não tocar |
| **C1 3D autoral mais recente** | — | — | Alvo | — | — | **NÃO ENCONTRADO / NÃO VERIFICÁVEL** |

Hashes marcados "do manifesto" ou "relatório" são valores registrados, não recalculados nesta sessão.

## Próximos passos que dependem do proprietário
1. Conectar à sessão um navegador (Claude em Chrome ou do app desktop) e fazer o login do Cloudflare Access por conta própria, ou
2. Anexar o GLB C1 mais recente e o master 2D, ou conectar uma integração R2 somente leitura restrita a `sophia/`.

Com qualquer um, o preflight retoma do ponto 3 do `source-access-preflight.md`: GLB realmente carregado pela página autoral/imersiva, SHA-256 dos bytes e comparação com 6H/7B/R3.

Nenhuma chave de objeto, URL assinada, cabeçalho ou cookie consta neste arquivo.
