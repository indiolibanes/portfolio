# Validação — S1

**Data:** 2026-11-03. **Base congelada:** `95e78e82c29bac57707469440f6806979fcdc94f`. **Estado global: PARTIAL.**

## Antes e depois

Node 24.22.1 / npm 11.9.0. Instalação com `npm ci --no-audit --no-fund`, lockfile preservado. Na base: `npm run check` PASS e `npm run build` PASS (7 páginas). Na correção: mesmos comandos PASS, incluindo dois testes novos da higiene do build e quatro testes existentes da entrega privada. O teste do publicador em PR paralelo #224 não foi incorporado artificialmente.

A validação de workflows usou PyYAML já disponível e análise dos scripts shell. As cinco definições são YAML válido e usam `contents: read`. Os passos de build/regressão/render permanecem; os de publicação de branches/commits foram retirados. Não foi executado um workflow remoto especializado nem uma sessão Chromium/WebGL nesta auditoria.

Teste da limpeza: marcador obsoleto removido de dist; fonte em public preservada; destino de symlink preservado. Gate: permite asset público intencional e `.well-known`, rejeita fixtures de ambiente, GLB privado, log e cópia temporária. Ignored paths foram conferidos com `git check-ignore`.

Sharp: 81 rasters da base examinados; uma falha de cabeçalho no sprite excluído. Não é inspeção de qualidade visual nem decodificação de cada frame de todas as animações.

| Output local | Antes | Depois |
|---|---:|---:|
| Arquivos em dist | 145 | 144 |
| Bytes lógicos em dist | 61.348.742 | 61.342.556 |
| Asset excluído | presente | ausente |
| Recursos restantes | hashes registrados | idênticos, exceto comentários de quatro HTMLs |

Os quatro HTMLs alterados diferem apenas pelo comentário que explicava o sprite inválido. A substituição reversa do comentário reproduziu os quatro hashes-base. Não houve alteração de HTML funcional, JS/CSS emitido, GLB, textura ou animação. A redução de 6.186 bytes em disco não é uma medição de transferência HTTP.

A primeira reconstrução antes da correção de limpeza reteve o sprite excluído e apresentou uma cópia temporária parcial no output. Esse resultado foi descartado; o build limpo acima foi o validado. A origem específica da cópia temporária ficou indeterminada, sem alegar vazamento de modelo privado.

## Segurança e superfícies

- Gitleaks padrão no histórico e títulos/corpos dos PRs: zero achados; staged diff final examinado separadamente.
- `git diff --check`: PASS.
- Código JWT/manifesto/headers de entrega privada: coberto pelos testes existentes, sem mudança de implementação.
- Cloudflare/produção/previews/autorização real/R2/cache: **NOT_VERIFIED**; sondas externas retornaram 403 em todas as rotas.
- Android, Samsung Internet, atuação, players reais, leitores de tela e WebGL: **NOT_TESTED**. Ausência de mudança nesses recursos não foi apresentada como teste de runtime.
- Exclusão de branches: **BLOCKED_BY_AUTOMATIC_REVIEW**, zero excluídas. Cinco PRs obsoletos efetivamente encerrados.

Os seis relatórios são públicos e sanitizados. Logs brutos, dados de download temporário e possíveis detalhes restritos não integram o PR. Não foram anexados modelos privados nem cópias do site compilado ao repositório.
