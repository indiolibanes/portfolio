# Acervo público e assets privados

O acervo visual público está em `public/assets/characters/`, dividido entre Hsin, Shorekeeper, Phrolova e Sophia. Esses arquivos são distribuídos pelo build e podem ser acessados diretamente por URL, mesmo sem links na interface.

Os modelos Hsin em `public/assets/models/hsin/`, as animações em `public/assets/animations/hsin/` e os modelos Sophia em `public/experimental/` têm consumidores ativos. Seus caminhos são preservados. Fontes em `assets/` podem ser usadas pelo build sem serem copiadas integralmente para o site.

Modelos e bibliotecas privados não entram no Git nem em `public/`. A entrega autenticada e a importação local são descritas no [contrato da Shorekeeper](shorekeeper-r2.md). O repositório contém código e validações; não comprova a configuração da conta de hospedagem ou a existência de objetos remotos.

Uma proposta anterior de manifesto foi removida por estar substituída pelo contrato validado do runtime e do publicador. As configurações administrativas efetivas devem ser mantidas no ambiente de hospedagem, fora de documentação pública.
