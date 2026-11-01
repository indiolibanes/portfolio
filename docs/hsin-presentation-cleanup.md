# Hsin — apresentação e folga do braço esquerdo

Base verificada: #160 aberto em draft, head `03db9ee192f2f03cf2a04d58f1b70a4a081c52d5`, empilhado em #159. A assinatura direita veio de `3757696`; o envelope quíntico da segunda entrega veio de `79a11bb`. Ambos os arquivos foram preservados byte a byte e um teste fixa seus hashes. O estado aprovado não é inferido a partir da posição numérica: a referência é o feedback do usuário sobre a segunda entrega.

## Entrega A

A rota usa um layout próprio, sem cabeçalho global, modos de leitura, rodapé ou decorações do portfólio. O menu `⋯` concentra a troca de arquivo, créditos e acesso secundário ao laboratório. A escolha de arquivo sai estruturalmente da apresentação depois de carregar; relatórios, inspeções e articulações continuam ocultos. A seleção contextual B.1, S1–S3, piscadelas alternadas e atenção já existentes continuam automáticas. Cada carregamento recebe uma semente própria; os controladores ainda aceitam sementes explícitas para reproduzir testes.

As referências privadas fornecidas foram examinadas sem incorporá-las ao site. A paleta usa escarlate `#992329`, vinho `#4d313e`, cinza rosado `#a7878c`, marfim `#eee6e4` e luz quente `#ddbb99`. Ela abrange o documento, menus, painéis, botões, foco e fundo procedural. Nenhuma iluminação ou textura da personagem foi alterada.

## Entrega B e diagnóstico

A pose anterior procurava um ponto do torso, afastava apenas o nó da mão e interpolava diretamente até o destino. Não verificava a superfície real do antebraço e dos dedos nem a manga ao longo do caminho. A auditoria privada reproduziu pontos atrás dos envelopes frontais do torso e da roupa no fim da pose antiga. Isso sustenta a hipótese geométrica; não identifica por si só todas as causas de uma deformação visual.

A nova candidata esquerda aproxima-se de uma região mais alta do esterno, com afastamento maior, saída inicial para frente e acomodação em etapas. Mantém ORG/DEF, auxiliares descendentes e dedos sem alterar geometria ou pesos. O envelope amostrado usa triângulos do torso e vértices de roupa vinculados ao braço, verifica 49 posições da trajetória e recusa uma candidata reprovada. Só a reprodução interpolada fica no loop de frames; a auditoria acontece ao preparar o modelo. O retorno percorre a mesma trajetória. A restauração pelo botão aguarda saída suave; descarte do modelo e edições diretas conservam a restauração forçada imediata.

A auditoria do modelo privado passou: referências de skin, cadeias independentes, restauração exata e zero violações no envelope amostrado dessa candidata. A margem frontal mínima foi aproximadamente 4 cm para o torso e 6 mm para a manga. A mão pode agora parecer afastada demais: o contato delicado precisa de avaliação artística. O envelope frontal não é um solver de tecido, teste contínuo de triângulos, avaliação de cabelo ou garantia de ausência de colisões em qualquer câmera. Nenhum resultado numérico aprova o gesto visualmente.

## Verificações e limites

Build, testes faciais A/B/B.1, automação, apresentação, estados, IK, diretor corporal, peito, envelope, transições e restauração foram executados. `check:ux` mantém 97/100: rótulo do laboratório na navegação, link de música e link de curiosidades falham em arquivos externos a esta mudança. O teste privado usa GLTFLoader com imagens substitutas, portanto não valida a renderização ou FPS Android.

**VISUAL_QA_PENDING — bloqueador de merge:** carregar o GLB local no Samsung Internet e no desktop; comparar a assinatura direita com a segunda entrega, examinar mão esquerda, manga, dobra do cotovelo, busto, cabelo e tronco em frente, 3/4 e lateral. Conferir retorno, pausa/retomada, movimento reduzido, toque e paleta. Não há aprovação artística nem atestado de colisões resolvidas visualmente.

Teste privado reproduzível: `node tests/hsin-choreography-private.test.mjs /caminho/privado/hsin-v.1.0.5.glb`. O arquivo não é enviado ao servidor ou incluído no repositório. Kuro Games, Lvoxx, imblue__ e LSCherry permanecem creditados.
