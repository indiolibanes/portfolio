# Histórico e remediação — S1

**Data:** 2026-11-03. **Base congelada:** `95e78e82c29bac57707469440f6806979fcdc94f`. **Estado global: PARTIAL.**

## Alcance confirmado

50 heads remotos e 224 refs de PRs foram recuperados. O grafo contém 1.353 commits; o scanner examinou 1.113 commits/diffs e não relatou segredos pelos padrões padrão. Busca suplementar em 2.128 blobs textuais de até 2 MB não encontrou arquivos de ambiente/chaves com os padrões pesquisados nem parâmetros de URL assinada. Binários, arquivos grandes, conteúdo textual não decodificado, comentários e anexos externos não foram examinados integralmente.

36 blobs em 34 paths contêm caminhos locais de execução, predominantemente logs antigos de QA e metadados de dependências. Não se demonstrou que esses paths fossem credenciais ou nomes de documentos privados. As ocorrências de termos de cofre localizadas foram texto editorial e código de autenticação; não demonstraram conteúdo de cofre privado. Não foram copiados caminhos locais completos para este relatório.

A proposta administrativa removida, as instruções simplificadas, os workflows antigos e a proposta do PR #207 continuam no histórico e nos diffs do GitHub. São metadados/código históricos, sem credencial identificada nesta rodada. A exclusão no HEAD proposto não elimina essas superfícies. Os registros de QA conservados em branches independentes também continuam acessíveis.

## Correção extraordinária — não executada

Não há justificativa comprovada para reescrever todo o histórico apenas por nomes de recursos, roadmaps chamados R2 ou caminhos genéricos de máquina. R2 como versão coreográfica não é Cloudflare R2. O arquivo de roadmap foi preservado.

Se aparecer uma credencial ou dado privado concreto:

1. Conter e revogar/rotacionar a credencial pelo serviço titular; apagar texto ou branch não a invalida.
2. Preparar inventário restrito dos blobs/commits, PR refs, tags, artifacts, releases, previews e caches afetados, sem valores secretos no relatório público.
3. Solicitar autorização separada para reescrita de histórico compartilhado, com plano de congelamento de branches, backup privado autorizado e coordenação de clones/forks.
4. Executar saneamento somente com essa autorização; verificar referências remanescentes e solicitar suporte do GitHub quando refs de PR/cache não puderem ser removidas normalmente.
5. Remover cópias externas apenas após revisar dependências, retenção e autorização. Confirmar por consultas de acesso, não por inferência a partir de Git.

Nenhum force-push, filter-repo, BFG, reescrita de SHA compartilhado ou pedido de remoção ao suporte foi executado. Excluir uma branch eventualmente autorizada continuará insuficiente para atestar eliminação histórica.
