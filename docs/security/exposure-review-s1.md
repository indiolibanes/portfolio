# Exposure review — S1 (público sanitizado)

**Data:** 2026-11-03. **Base congelada:** `95e78e82c29bac57707469440f6806979fcdc94f`. **Estado global: PARTIAL.**

## Credenciais

Zero achados no Gitleaks padrão em diffs do histórico alcançável e títulos/corpos dos 224 PRs. Não foi encontrada evidência de credencial válida que exigisse rotação nesta cobertura. Isso não equivale à aprovação do GitHub Secret Scanning: o serviço/alertas nativos e segredos da conta não estavam disponíveis. Não foram publicados valores de tokens nem relatórios brutos.

## Conteúdo atual

A documentação repetia identificadores de armazenamento, nomes de arquivos privados, checksums de modelos e uma proposta de namespace já substituída. Eram metadados operacionais, não credenciais comprometidas. Foram retiradas as repetições administrativas e a proposta antiga; o código de servidor/publicador mantém os identificadores funcionais necessários. Remover esses nomes indiscriminadamente quebraria a integração sem melhorar autenticação.

Os endpoints atuais falham fechados nos testes locais; não tiveram seu comportamento autenticado verificado em produção. A proposta antiga de exposição pública opcional foi encerrada no PR #207. Fechar o PR não retira seu diff, commits ou possíveis previews.

Dois workflows tinham force-push de evidências e um workflow de ingestão podia escrever na branch de execução. As correções adotam artifacts e permissões de leitura. Também foi retirada interpolação shell direta de input manual. Não há evidência de exploração anterior.

Um build incremental preservou um asset retirado da fonte; uma cópia temporária parcial apareceu no output. A causa específica dessa cópia não foi estabelecida. A limpeza de dist e o gate final impedem publicar arquivos de saída residuais ou com padrões restritos cobertos. A proteção não detecta todo segredo possível em arquivos de nome normal.

## Publicação de assets

GLBs Hsin e Sophia já publicados continuam intencionalmente em public/. A privacidade da Shorekeeper não se estende a esses modelos. Não foram movidos GLBs, rigs, morphs ou bibliotecas. O sprite inválido foi excluído; os quatro sprites de rotação foram preservados. A única duplicata exata tem papéis distintos e não foi eliminada.

## Superfícies externas

- 0 releases e 0 tags retornadas; nenhuma reescrita de referências.
- 63 artifacts de Actions, total 484.473.769 bytes, todos não expirados no snapshot. Conteúdo ZIP inspecionado em quatro amostras: 8 arquivos JSON/WebP, 9 JSON/TXT, 52 JSON/PNG/WebP e 1 JSON. Não havia arquivos com nomes privados restritos nessas amostras; não houve inspeção visual/OCR nem análise integral dos 63 pacotes.
- 0 registros na coleção GitHub deployments consultada; isso não descreve a conta Cloudflare.
- Requests HEAD a sete rotas de produção retornaram 403 uniformemente, inclusive a home: **NOT_VERIFIED**, sem inferir decisão da API da aplicação.
- Conta Cloudflare, R2, bindings, objetos, policies, aliases, previews antigos, caches e retenção remota: **NOT_VERIFIED**. Nada foi removido remotamente.
