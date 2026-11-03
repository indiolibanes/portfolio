# Shorekeeper F2.0-A — modelo integrado ao portfólio (R2 / Pages)

## Estado e limite

Esta branch implementa a **entrega automática** do GLB completo no laboratório `/experimentos/sk/`, mantendo o carregamento local como fallback. A aplicação **não publica o modelo** até que o bucket e a variável de consentimento estejam configurados.

**O arquivo não está armazenado neste commit.** A cópia disponível no ambiente da implementação era apenas a F1.6, com dois clipes de ~4 s. O modelo completo autorizado para a integração é o `PRIVATE_shorekeeper_f20a_original_idles.glb` produzido na F2.0-A, contendo três idles originais mais nove variantes de comparação. Não substituir esse arquivo pelo F1.6.

| Propriedade | Valor |
| --- | --- |
| SHA-256 | `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30` |
| Tamanho | 39.487.548 bytes (~37,66 MiB) |
| R2 key | `models/shorekeeper/shorekeeper-f20a-original-idles.glb` |
| URL pública do site (via Pages Function) | `/api/shorekeeper/model` |
| Bucket binding de Pages | `SHOREKEEPER_ASSETS_R2` |
| Variável de Pages | `SHOREKEEPER_MODEL_PUBLIC=true` |

Cloudflare Pages limita cada asset estático a 25 MiB. O GLB de 37,66 MiB causaria falha se enviado diretamente a `public/assets`; o endpoint `functions/api/shorekeeper/model.js` utiliza `R2.get()` e faz **stream** dos bytes ao navegador, sem incorporar o binário no build, sem liberar listagem do bucket e sem acesso CORS externo. É uma rota **publicamente acessível quando habilitada**.

## Para ativar

1. Verifique a autorização de redistribuição deste modelo e crie um **bucket R2 separado** somente para assets que pretende publicar. Nunca usar o bucket privado do Obsidian, de backups ou de outros dados pessoais.
2. Obtenha a saída exata da F2.0-A, `PRIVATE_shorekeeper_f20a_original_idles.glb`. Pode usar um nome local diferente; o script exige o SHA-256 e tamanho exatos.
3. Com a CLI do Wrangler autenticada, execute na raiz do projeto:

   ```sh
   bash scripts/shorekeeper/publish-f20a-to-r2.sh /caminho/PRIVATE_shorekeeper_f20a_original_idles.glb NOME_DO_BUCKET_DEDICADO
   ```

4. No projeto Cloudflare Pages `kaue`, configure **Settings → Bindings → R2 bucket**, com nome da variável `SHOREKEEPER_ASSETS_R2` e o bucket dedicado como destino. Configure a variável de ambiente `SHOREKEEPER_MODEL_PUBLIC=true` somente na(s) environment(s) em que pretende disponibilizar o modelo.
5. Faça redeploy da branch. Verifique:

   ```sh
   curl -I https://SEU-DOMINIO/api/shorekeeper/model
   ```

   Deve retornar 200, `Content-Type: model/gltf-binary`, `Content-Length: 39487548` e `X-Asset-SHA256` exato. Sem configuração, responde 404 propositalmente.

6. Abra `/experimentos/sk/`. O GLB carregará automaticamente; a validação efetiva do SHA-256 ocorre **no navegador, sobre todos os bytes**, antes de o modelo ser adotado. Os três idles originais aparecerão no menu e o diretor contemplativo poderá iniciar. Se o asset não estiver disponível ou não passar na validação, o seletor local continuará funcional.

O endpoint **não consulta URLs arbitrárias**, não recebe uploads de visitantes, nem é usado como proxy de arquivos escolhidos no navegador. Nenhum GLB, textura extraída, PSA ou token de acesso foi colocado no GitHub.

## QA

- O SHA do GLB completo está registrado no contrato da F2.0-A; o arquivo não está disponível para re-hash nesta execução. O script confere todos os bytes antes de enviá-lo ao bucket.
- O Pages Function apenas compara `Content-Length`; o cliente efetua a checagem SHA-256 completa com Web Crypto. Não confiar somente no tamanho.
- O bucket não precisa ser público: a leitura acontece pelo binding privado. **A rota do portfólio, porém, é pública quando habilitada**. Quem conseguir acessar a rota poderá salvar o modelo.
- Testes de integração `tests/shorekeeper-hosted-asset.test.mjs` validam a chave fixa, o opt-in, respostas HEAD/GET, objetos ausentes e tamanhos incorretos. Testes sintéticos não substituem QA em navegador e Cloudflare de fato.
- A etapa C permanece separada; não houve alteração no esqueleto, no contrato de animação, no facial B.5.1 nem em Hsin/Phrolova/Sophia.

## Créditos e direitos

Shorekeeper e Wuthering Waves são criações da **KURO GAMES**. O trabalho de extração do material original foi realizado pela comunidade e associado ao pacote NekoPixil fornecido para estudo. A redistribuição pública do GLB é uma ação distinta do uso privado de um arquivo local; confirme os direitos pertinentes antes de ativar a rota.
