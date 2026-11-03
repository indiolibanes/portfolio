# Shorekeeper — Cloudflare R2 privado + Cloudflare Access

- Bucket informado pelo usuário: private-assets
- Binding informado no projeto kaue: SHOREKEEPER_ASSETS_R2
- Status no GitHub: implementação e testes; presença do binding, objetos e política Access ainda NÃO comprovada de ponta a ponta.

## Segurança
O R2 usa criptografia em repouso e conexões TLS. Mantenha r2.dev e domínios públicos desativados. A API /api/shorekeeper/manifest e /api/shorekeeper/asset exige Cloudflare Access JWT assinado (RS256), validando emissor, audiência e expiração, com cache privado no-store. Ausência de configuração → 503; JWT inválido/ausente → 403; objeto inexistente → 404. O navegador calcula SHA-256 sobre os bytes antes de analisar o GLB. Quem tiver acesso válido ao modelo 3D poderá copiar os bytes; Access não é DRM.

Não use a versão de endpoint público opcional do PR #207. Nenhum asset sensível/extraído de jogos deve entrar em public/ ou Git.

## Configurar a conta Cloudflare (uma vez)
1. Confirmar que o binding SHOREKEEPER_ASSETS_R2 → private-assets existe no MESMO projeto Pages que serve kaue.pages.dev. Um Worker independente chamado kaue não entrega automaticamente bindings ao Pages; em caso de Worker separado, configurar o binding no Pages ou um Service binding específico.
2. Criar no Zero Trust uma aplicação Cloudflare Access para o host e a rota /api/shorekeeper/*, com política Allow limitada a você/colaboradores autorizados. Incluir todos os domínios/aliases necessários; negar previews não protegidos.
3. Copiar a Application Audience (AUD) da aplicação e o Team Domain no formato https://SEU-TEAM.cloudflareaccess.com.
4. Em Workers & Pages → projeto Pages → Settings → Variables and Secrets, definir SK_ACCESS_TEAM_DOMAIN e SK_ACCESS_AUD. Não coloque chaves R2 em variáveis frontend.
5. Reimplantar Pages para o binding/variáveis entrarem em vigor. Testar acesso anônimo (bloqueado) e autorizado (200 após upload). Não presume sucesso sem testes reais.

## Publicação local automatizada
Requisitos: Node.js 22+, autenticação local npx wrangler login e arquivos GLB cuja guarda/uso foi autorizada. O script envia objetos imutáveis com sufixos SHA-256, baixa-os de volta para verificar SHA-256, e só depois promove o manifesto. Os arquivos privados NÃO são armazenados no GitHub.

Primeiro upload (GLB canônico; SHA-256 fixo):
    npm run publish:shorekeeper -- --init --model "/caminho/PRIVATE_shorekeeper_f20a_original_idles.glb"

Adicionar/atualizar biblioteca, sem repetir upload do modelo:
    npm run publish:shorekeeper -- --library combat="/caminho/combat.glb"

Atualizar modelo após QA e avaliação de direitos:
    npm run publish:shorekeeper -- --model "/caminho/modelo-atualizado.glb" --allow-model-update

Inspeção local, sem upload:
    npm run publish:shorekeeper -- --model "/caminho/modelo.glb" --dry-run

O bucket e prefixo de objetos são fixos:
    private-assets/characters/shorekeeper/models/
    private-assets/characters/shorekeeper/animations/combat/
    private-assets/characters/shorekeeper/manifests/current.json

O script mantém até 4 bibliotecas, valida integridade e não muda o Pages a cada atualização de GLB. Se apenas os dados mudam e o rig continua compatível, basta executar um comando local. A troca de código, formato e lógica de rig ainda exige PR e deploy. Nenhum upload automatizado a partir do Drive foi habilitado porque ainda não há um pipeline autenticado para esses arquivos.

## Diagnóstico
- 403 sem JWT Access válido; 503 em configuração incompleta ou falha R2; 404 antes do primeiro envio; 409 em tamanho divergente.
- O portfólio mantém fallback de arquivo local e IndexedDB mesmo com R2 indisponível.
- Não extrapolar aprovação artística de QA estrutural. Os movimentos Burst permanecem experimentais.
- Verificação: npm run check:shorekeeper-r2 e npm run build; QA real em Android/Access/R2 ainda pendente.
