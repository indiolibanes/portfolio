# Acervo visual / personagens — contrato de armazenamento
**Estado:** PUBLIC_VISUAL_ASSETS_REORGANIZED / R2_CODE_READY / CLOUD_ACCOUNT_QA_PENDING
**Repositório:** indiolibanes/portfolio. Os arquivos desta árvore são visíveis ao público.

## Publicação pública (URLs)
\`\`\`text
public/assets/characters/
  hsin/music/music-stage-2026-11-02.avif
  shorekeeper/ui/butterfly.webp
  shorekeeper/vfx/{butterfly-ice,butterfly-violet,star-sprite}.svg
  phrolova/ui/{crimson-baton.svg,baton-bow.webp}
  sophia/sprites/sophia-2d-{run,play,stress,throw,leave,gamepad}.webp
\`\`\`

Os artefatos acima foram movidos com os **mesmos blobs SHA do Git**, sem transcodificação e sem duplicação na nova árvore. Seus consumidores foram atualizados.

### Exceções que precisam de PR próprio
- Hsin: \`public/assets/models/hsin/\`, \`public/assets/animations/hsin/\` e \`public/assets/scenes/hsin/\` já estão segregados por personagem, mas são caminhos públicos consumidos por scripts e testes. Mover todos juntos sem atualização global é regressão.
- Sophia: \`public/experimental/sophia-alpha.glb\` e \`sophia-7b-e1-latest.glb\` alimentam rotas e testes, então permanecem nos caminhos verificados. O nome definitivo da Sophia 7B não foi aprovado; não renomear retroativamente.
- Shorekeeper: derivados gerados em \`public/assets/about/\` são controlados por \`scripts/generate-about-cutouts.mjs\`, e não devem ser migrados sem atualizar esse pipeline.

## Cloudflare R2 (bucket e binding informados pelo usuário; conta não verificada)
Bucket informado: \`private-assets\`, binding informado: \`SHOREKEEPER_ASSETS_R2\`; veja \`docs/asset-storage/shorekeeper-r2.md\`.

\`\`\`text
characters/
  shorekeeper/
    models/shorekeeper-f20a-canonical.glb
    animations/idles/       # somente se forem fornecidas separadamente
    animations/combat/      # arquivos convertidos e aprovados; não confundir QA estrutural com aprovação visual
    manifests/sha256.json
  hsin/
    models/                 # somente após revisão de titularidade e autorização
    animations/
  phrolova/
    models/
    animations/
  sophia/
    models/
    animations/
\`\`\`

O GLB canônico de Shorekeeper é identificado pelo SHA-256 4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30 e tamanho 39.487.548 bytes. Estes dados não provam que o objeto esteja no R2, nem que esteja acessível pelo portfólio.

Não há "pasta" física no R2: \`characters/shorekeeper/\` é um prefixo de object keys. Não versionar credenciais, não ativar domínios públicos e não usar URL pré-assinada como proteção contra cópia dos bytes. Para um uso estritamente privado, oferecer Cloudflare Access/Worker com token validado e resposta \`Cache-Control: private, no-store\`. O envio ao navegador de um GLB ainda permite extração por um visitante autorizado.

## Verificação real (pendente)
1. Confirmar conta Cloudflare, nome do bucket R2 e binding da Pages Function/Worker.
2. Conferir existência, tamanho, checksum e metadados de cada objeto.
3. Validar respostas autorizadas vs não autorizadas; não incluir token no frontend.
4. Confirmar que nenhum asset privado é servido por \`public/\`, \`dist/\` ou repositório GitHub.
5. Executar build e QA WebGL no Samsung Internet.
6. Revisar autorização do titular para qualquer redistribuição dos assets originais.

Sem acesso à conta R2 e aos binários privados, estes passos permanecem **BLOCKED/NOT_VERIFIED**.
