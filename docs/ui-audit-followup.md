# Revisão da auditoria estática de interface

A auditoria recebida em 08/10/2026 examinou uma versão anterior do HTML. No código atual, já existiam H3 nos cinco projetos, nomes acessíveis definidos por aria-labelledby, navegação Laboratório, âncora estática de Música, datas em Percurso, contato LinkedIn e rótulo correto do Last.fm. A seção Método (#metodo) fica fora desta revisão.

## Mudanças

- Cards sem destino não exibem seta de saída nem elevação no hover. Links mantêm a composição integral, com nome acessível curto e aviso de nova aba.
- Ordem consistente de metadados, disciplina, heading e epígrafe nos cinco cards. Arquitetura recebe epígrafe; os projetos já públicos usam Publicado.
- Um único link para Sophia na introdução do Laboratório, com ilustração decorativa adjacente.
- Kicker sem repetição do nome, seção Sobre identificada e seta interna no CTA de contato.
- Botão dos três modos mostra estado atual e próximo; não utiliza semântica de switch binário.
- Música oferece link estático para o Last.fm, mensagens de vazio/erro, timeout e polling sem novas requisições em aba oculta. Anuncia alterações de faixa em região live.
- GIFs/WebP animados recebem primeiro quadro estático no build. Movimento reduzido, ausência de JavaScript e elementos fora da viewport usam esse quadro. No máximo dois loops decorativos controlados ficam ativos simultaneamente.
- Chips do Laboratório indicam o projeto na posição de leitura; links de navegação/rodapé têm área mínima de 44 px.

## Validação

Build Astro de produção e verificação de whitespace. O teste de navegador e suas limitações são registrados na descrição do PR. A compilação não prova contraste, percepção de hierarquia ou experiência em leitor de tela.

## Decisões preservadas

Paleta, fontes, arte, texturas, três modos, composição musical, efeito de borboletas/fitas e conteúdo de Método. Sem datas ou qualificações novas presumidas. As recomendações subjetivas sobre 5W2H e identidade editorial não foram tratadas como defeitos confirmados.
