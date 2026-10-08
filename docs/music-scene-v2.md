# Sala de escuta — terraço lunar

## Composição

Nova ilustração anime feita a partir das referências fornecidas de Phrolova, Hsin e Shorekeeper e do primeiro quadro da Sophia ativa no Work. Phrolova ocupa a esquerda carmesim; Shorekeeper a direita azul; Hsin e sua forma de raposa ficam no centro lunar. Sophia, de marfim, azul noturno e ouro, lê com fones em primeiro plano, ao lado da raposa branca com detalhes vermelhos.

O cenário foi planejado com céu livre nos cantos e passou por uma extensão superior após o teste visual dos controles. A proporção final é 3:2. Em desktop, Last.fm e post-it usam esses espaços. Até 1199 px, os controles saem da arte; em mobile ficam empilhados. A imagem mantém o enquadramento inteiro, sem recorte ou ampliação artificial. Arquivos de 1536 × 1024 px, AVIF com crominância 4:4:4 e WebP de fallback.

O título fica no cabeçalho da mesma sala. O widget mostra scrobbles, sem controles que simulem reprodução de áudio. Não retorna o rótulo “Na vitrola” nem o link permanente de perfil: há um atalho apenas em erro/vazio ou sem JavaScript.

## Preservação

Código das borboletas e do laço do bastonete, CSS das duas animações e seus dois recortes permanecem idênticos aos do commit 7c313c1. A alternância, os tempos e a limpeza de partículas foram verificados antes e depois da alteração. A frase de Moonlight Sonata permanece exata; digitação e notas orbitais continuam como camadas HTML/CSS, sem texto gravado na imagem.

As referências do mascote foram usadas só para a identidade visual; a Sophia ativa no Work não foi alterada. Método e demais seções também não foram modificados.

## Validação

Build Astro, whitespace, comparação literal do código/CSS/assets dos efeitos e testes Chromium. Capturas em 360, 390, 430, 768 e 1440 px; modos Autoral, Editorial e Legacy; movimento reduzido; estados de carregamento, vazio, erro e sem JavaScript. Os testes usam respostas simuladas de Last.fm, sem comprovar disponibilidade do serviço real.

A seção musical foi testada para overflow. A página apresenta overflow anterior fora da seção, causado por ambient-two e pela ilustração decorativa no hero em telas estreitas; esses elementos ficam fora deste rework.
