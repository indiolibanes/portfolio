# Hsin — repertório autônomo

## Base e privacidade

Base verificada em 01/11/2026: `main` em `35fad49b40cab877a5925818b8b42a4d9d48972b`, depois da integração dos PRs #164 e #165. Branch de trabalho: `experiment/hsin-autonomous-repertoire-2026-11-01`. Não houve escrita em main nem merge automático.

O GLB atual foi materializado com autorização para leitura local; seus bytes coincidem com a cópia previamente auditada. Não foi alterado. Nenhum GLB, textura, amostra de geometria, imagem privada, exportação de pose ou ferramenta de inspeção privada faz parte desta entrega. A página continua lendo o arquivo escolhido no aparelho, sem upload.

`hsin-right-signature.mjs` e `hsin-pose-transition.mjs` permanecem exatamente iguais à referência aprovada, com hashes fixados na suíte existente.

## Entrega A — face

A política nova é opt-in (`autonomous: true`) sobre o compositor B.1 existente; os passes A/B, B.1 diagnóstico e a automação anterior continuam disponíveis para comparação. Um único adaptador continua escrevendo nos canais faciais.

- Neutra é a base capturada do arquivo, com olhar e piscadas vivos; não há um sorriso aditivo permanente.
- Pausas neutras de 5–11 s entre beats. Entrada de 1,6 s, sustentação de 2,8–4,8 s e retorno de 2 s. Intensidades automáticas ficam abaixo das candidatas originais; limites de morph não foram ampliados.
- Sorrisos assimétricos dos dois lados, com memória que evita três beats consecutivos do mesmo lado. Neutralidade remove o overlay, preservando a expressão exportada aprovada.
- Atenção sustentada, sorriso e olhar estreitado alternam probabilisticamente, mesmo com o cursor presente. O contexto não fica travado em Curious Attention.
- Piscadas mantêm o calendário de 5–10 s e o árbitro único de pálpebras. Piscadelas usam os dois olhos, com probabilidade dependente do lado do sorriso, preferência geral pela direita e no máximo duas seguidas do mesmo olho. Exigem expressão de apoio e continuam ocasionais.
- Entrada/saída dos testes manuais preservam continuidade. Nariz permanece fora da automação.

## Entrega B — corpo

`hsin-body-repertoire.mjs` coordena os atores existentes sobre o mesmo relógio da sessão facial. Não há timers extras, simulação Rapier adicionada ou solver no loop de frames. A seleção tem pesos, cooldowns, memória do último episódio e repouso entre ações. A mesma semente reproduz os testes; cada carregamento público recebe uma semente nova.

| Episódio | Braços e retorno |
| --- | --- |
| Assinatura | Direita, usando a pose sob o queixo preservada; sustenta por 3,8–6,5 s e retorna suavemente. |
| Peito/marca | Esquerda, alvo mais baixo e lateral, dedos dirigidos para dentro e para o tórax; volta ao repouso. |
| Composição | Direita sustentada na assinatura; esquerda aproxima-se e retorna antes da saída direita. |
| Cabelo | Esquerda junto à parte superior do cabelo, pequeno percurso de cerca de 0,45 distância interocular; volta ao repouso. |
| Repouso | Braços na referência relaxada, rosto em sua base e oscilação torácica de 0,086° no máximo. A respiração é removida exatamente antes das trajetórias calculadas. |

As durações orgânicas do ator esquerdo existente foram reaproveitadas: entrada 2–2,7 s, sustentação 2,8–4,6 s, saída 2–2,8 s. Os cooldowns mínimos por episódio são 18 s (assinatura), 38 s (peito), 65 s (composição) e 90 s (cabelo), além do repouso de 7–15 s entre episódios. Não são um ciclo fixo.

Cabelo e peito compartilham a esquerda e nunca são reproduzidos juntos. A direita nunca recebe o gesto principal do peito nem o de cabelo. A classificação anatômica do arquivo foi `MATCHES_ROLES`; uma classificação ausente, ambígua ou espelhada continua bloqueando a atuação corporal automática.

### Roupa e contato

As imagens por CPU revelaram que a candidata antiga do peito aproximava os dedos do rosto. A variante nova do tórax muda alvo e direção da mão, mantendo ORG/DEF, pesos, materiais e dedos originais. Os padrões antigos do adaptador permanecem como referência; a apresentação usa a variante nova.

O envelope frontal continua verificando o tórax. Para a manga, a variante nova acrescenta testes de cruzamento de triângulos em 3D: um ponto oculto atrás de tecido numa projeção não é automaticamente um atravessamento. A ausência de cruzamento amostrado não comprova distância positiva nem ausência contínua de colisão. Superfícies coplanares, bordas, vértices totalmente contidos e triângulos fora das classes de pesos selecionadas não são uma garantia de cobertura completa.

- Peito e composição: 71 posições, incluindo extremos da respiração; zero cruzamentos de manga e zero violações do envelope do tórax na candidata examinada.
- Composição: medição adicional de amostras das superfícies das mãos. A menor distância amostrada foi aproximadamente **1,6 cm**. É uma aproximação, não contato físico dos dedos. A aproximação mais estreita que havia sido calculada foi recusada pelo guarda.
- Cabelo: 65 posições, incluindo testes do envelope de cabeça/cabelo, cruzamentos de manga e continuidade da trajetória. Punho limitado a **75°** em relação à referência local, sem alterar os dedos. A menor distância amostrada à região de cabelo foi aproximadamente **2 cm**. Não há física de contato ou deformação do cabelo.

Se uma candidata reprovar no arquivo escolhido, ela não entra no repertório automático. O resto da atuação continua. A preparação das trajetórias acontece ao abrir o GLB e pode ser custosa no Android; FPS e tempo de preparação no aparelho não foram medidos.

## Raposa e recursos do asset

Foram encontrados nove trechos skinned, 823 joints e zero clipes. O arquivo contém cadeias `Bone_Hair*`/`ORG-Bone_Hair*`, cadeias `Bone_Tail*`/`ORG-Bone_Tail*` e materiais Hair, Bangs e Tail. Esses nomes não demonstram uma raposa companheira independente. Não foi identificado um ator separado de raposa, prop de raposa ou clipe utilizável para uma raposa; nenhuma integração foi inventada. A cauda e os adereços da personagem continuam como parte do asset.

## Verificação

- Suíte `node --test tests/hsin-*.test.mjs`: passa. Os testes privados sem argumento informam que foram pulados; não representam auditoria do asset no CI.
- Auditoria explícita `node tests/hsin-repertoire-private.test.mjs /caminho/local/hsin-v.1.0.5.glb`: passa com o modelo real. Reproduziu assinatura, composição, cabelo e peito por 600 s de relógio simulado, confirmou exclusão dos atores esquerdos, não interferência na direita e restauração exata de posição, quaternion e escala de todos os ossos.
- A suíte existente verifica os hashes da assinatura direita e os traços dourados dos passes A/B.
- Build Astro: passa.
- UX: **97/100**, com as três falhas anteriores `nav: lab label aligned`, `nav: music static link` e `curiosidades: header link`.
- Novos testes de cabeça/cabelo e manga usam fixtures sintéticas originais, incluindo uma interseção real de triângulos e um caso de simples oclusão sem cruzamento.

### Evidência visual e limites

Foram geradas para inspeção interna imagens estáticas por rasterização CPU dos vértices deformados reais e texturas originais, em frente, 3/4 e perfil: repouso, assinatura, peito, composição, cabelo e uma posição intermediária. Isso permitiu corrigir a mão esquerda alta demais e conferir a silhueta das candidatas. As imagens e ferramentas privadas não foram publicadas.

**STATIC_VISUAL_QA_PARTIAL / ANDROID_MOTION_QA_PENDING.** O rasterizador CPU é ortográfico, aproxima transparência e usa cores sem iluminação; não replica o renderizador WebGL, não mede fluidez, performance ou a aparência final dos morphs em movimento. O cabelo e os adornos não têm dinâmica secundária nova; tecidos seguem rigidamente seus vínculos do rig e podem parecer rígidos ao levantar o braço. A pose de cabelo toca a vizinhança superior do cabelo/adereço, não simula um penteado com fios.

A naturalidade artística, o contato aparente, toda a roupa, dedos, cabelo e resposta no Samsung Internet continuam exigindo conferência real. Não há aprovação final de colisões contínuas ou de animação apenas por estes números ou imagens.

## Conferência no aparelho

Abrir a prévia do PR e escolher o GLB local. Sem comando adicional, observar pelo menos 3–5 minutos: intervalos neutros, sorrisos alternados, piscadelas espaçadas, assinatura ocasional, mão esquerda na região do peito e retorno aos braços relaxados. Cabelo e composição são raros, sujeitos aos cooldowns.

Conferir frente, 3/4 e perfil durante entrada, sustentação e saída; observar o limite da manga e os adereços, sobretudo no cabelo. Ocultar/retomar a página e pausar/retomar a atuação: o relógio não deve acumular tempo escondido. Ativar movimento reduzido: o estado deve congelar. Trocar de GLB: a atuação anterior deve ser descartada.

O laboratório permanece acessível apenas com `?lab=1`; diagnósticos internos exigem `?lab=interno`. Há um teste de cabelo apenas no laboratório. Nenhum controle novo foi acrescentado ao fluxo público. Kuro Games, Lvoxx, imblue__ e LSCherry permanecem creditados.
