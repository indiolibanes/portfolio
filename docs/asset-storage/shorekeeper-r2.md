# Shorekeeper — contrato de entrega privada

A integração usa um bucket privado no ambiente do servidor. O manifesto e os assets exigem JWT Cloudflare Access com assinatura, emissor, audiência e prazo válidos. A configuração deve ser provisionada no projeto que executa as Pages Functions; um Worker separado não compartilha bindings automaticamente.

## Configuração do servidor

O código requer `SHOREKEEPER_ASSETS_R2`, `SK_ACCESS_TEAM_DOMAIN` e `SK_ACCESS_AUD`. São nomes de configuração, não credenciais. Os valores e o mapeamento para recursos da conta ficam no ambiente administrativo, fora do Git. Mantenha o armazenamento sem distribuição pública e proteja também os aliases e previews. Não envie tokens ou chaves ao código frontend.

O servidor responde 503 quando falta configuração, 403 quando a autorização falha, 404 para objetos ausentes e 409 para tamanho divergente. As respostas privadas usam `private, no-store`. O cliente verifica SHA-256 antes de analisar o GLB. Um visitante autorizado ainda pode copiar os bytes recebidos.

## Publicação local

Use uma sessão local autenticada do Wrangler e arquivos cujo uso foi autorizado. Consulte `npm run publish:shorekeeper -- --help` para os argumentos atuais. O modo `--dry-run` inspeciona arquivos sem upload. O publicador verifica uploads e promove o manifesto por último. Uma atualização de dados compatível não exige alterar o código; mudanças de rig/formato exigem QA próprio.

Guarde cópias locais privadas em `local-private/` (ignorado pelo Git). Confira o diff antes de publicar. A importação local e o cache do navegador continuam disponíveis quando a entrega remota falha.

## Validação

`npm run check:shorekeeper-r2` verifica o contrato com fixtures, e `npm run build` valida a integração estática. Autorização real, configuração remota, objetos, aliases, previews, cache e Android precisam de validação no ambiente de destino. Não presumir acesso seguro ou funcionamento remoto a partir desses testes locais.
