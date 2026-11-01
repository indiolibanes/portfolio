# Hsin — papéis dos braços, braço esquerdo orgânico, apresentação limpa e paleta

Base verificada: `main` em `0f47ede` (merge do #163), a versão mais recente do estado da Hsin. A `main` não foi alterada e nada foi mesclado. `hsin-v.1.0.5.glb` não foi tocado nem publicado. `hsin-right-signature.mjs` e `hsin-pose-transition.mjs` continuam byte a byte iguais; o teste de apresentação limpa fixa seus hashes.

## Papéis dos braços

| Braço | Gesto | Onde está |
| --- | --- | --- |
| direito (`.R`) | pose de assinatura sob o queixo | `hsin-right-signature.mjs`, intocado |
| esquerdo (`.L`) | gesto suave ao peito | `hsin-chest-gesture.mjs` |

O briefing dizia que a mão direita ainda fazia os dois gestos. Isso foi verificado no código em vez de assumido: o gesto de peito já operava na cadeia `.L` e a assinatura na `.R`. O ponto frágil era outro. `createChestPose` tinha `side='R'` como padrão, não havia tabela de papéis e nada conferia se o sufixo do osso corresponde ao lado anatômico da personagem. Foi corrigido assim:

- `hsin-arm-roles.mjs` guarda a tabela de papéis, congelada, e uma verificação de que dois papéis nunca dividem o mesmo braço.
- `createChestPose` recusa qualquer lado que não seja o do papel de peito. Pedir o gesto de peito ao braço da assinatura devolve uma pose recusada, que não escreve em osso algum.
- `classifyArmSides` mede, a partir da geometria do rig e da calibração do rosto, se `.R` está de fato no lado direito anatômico. O laboratório faz essa auditoria ao carregar o GLB. Se o rig estiver espelhado (`MIRRORED`), o gesto de peito é suspenso em vez de ser executado na mão errada, e o motivo aparece no diagnóstico do gesto.

Sem o GLB não foi possível confirmar a lateralidade real do arquivo. Se na primeira abertura o gesto aparecer na mão errada, o diagnóstico do gesto (laboratório) traz o `armSideAudit` com a medida.

## Braço esquerdo mais orgânico

O gesto parecia roteirizado porque antebraço e mão se moviam em bloco e paravam secamente. Mudanças, todas funções do mesmo peso eased do gesto:

- **Sobreposição.** Ombro, antebraço e mão percorrem a mesma rota aprovada com pesos defasados (`w`, `w^1,22`, `w^1,5`). O ombro conduz e as partes distais chegam depois. Em 0 e em 1 os pesos são exatamente 0 e 1, então o repouso e a pose final não ganham resíduo.
- **Respiração.** Com a mão já assentada, o braço se move uma fração de grau (cerca de 1,0°, 0,8° e 0,6° por segmento) num sinal lento de 4,6 s. A respiração só entra acima de 88% do peso, com uma subida suave, de modo que a trajetória não é afetada.
- **Durações variadas.** Entrada de 2,0–2,7 s, sustentação de 2,8–4,6 s e saída de 2,0–2,8 s, sorteadas a cada gesto com a semente da apresentação. O cronograma 1,8 / 2,2 / 1,8 s continua sendo o padrão de quem não pede o modo orgânico.
- **Sem estado entre quadros.** A pose executada é uma função pura de (variante, peso, respiração). Por isso o guarda de colisão amostra exatamente o que será executado: 65 pontos da rota mais seis extremos de respiração.
- **Retorno exato.** `restore()` copia os quaternions capturados. O diretor restaura ao final e o teste com esqueleto sintético confere igualdade exata depois de 24 gestos.

## Composição opcional das mãos

A mão esquerda pode repousar um pouco mais perto da mão direita, como se as duas conversassem, sem se tocar. O alvo se desloca no plano do tórax (nunca em direção ao observador), no máximo 0,55 da distância entre os olhos e sem deixar a distância entre as mãos cair abaixo de 2,4 dessa unidade. Ao longo de toda a rota composta nenhum ponto da mão ou dos dedos pode chegar a menos de 1,0 unidade da outra mão. A composição:

- só é sorteada (55%) quando a assinatura está totalmente sustentada;
- não copia a pose da mão direita, que continua sendo a da assinatura;
- tem a própria rota, o próprio guarda de colisão e a própria checagem de distância entre as mãos;
- recorre ao gesto simples, sem aviso, se qualquer verificação falhar ou se faltar a medida da mão de apoio.

A posição da mão direita é medida pela API pública da pose de assinatura (`apply`/`restore`), com o braço ainda em repouso, sem alterar esse módulo.

## Apresentação

- **02B (diagnóstico visual) e 03B (articulações individuais)** saíram da apresentação. Existem apenas no modo interno, que exige `?lab=interno` na URL. O laboratório em si exige `?lab=1`. Sem nenhum dos dois, o botão de laboratório, o seletor de modo e todos os painéis ficam ocultos e `set('lab')` é recusado. O acesso vem da URL, nunca de um controle visível. O padrão da biblioteca é "nenhum".
- O texto de verificação de imagens locais (CSP) saiu do menu e foi para as evidências do laboratório. Se o navegador realmente bloquear imagens locais, a apresentação diz uma frase simples.
- As mensagens de carregamento e de falha não falam mais de Three.js, malhas ou rig. O detalhe técnico continua no laboratório e no console. O parágrafo de instruções sobre o palco foi removido.
- A marcação não foi apagada. O controlador depende de dezenas de elementos por seletor e falharia ao iniciar; por isso o que sai da apresentação é ocultado e fica inalcançável.

## Hierarquia do menu

1. A personagem ocupa a tela. Antes de carregar, só aparecem o título, a escolha do arquivo e o botão `⋯`. Depois de carregar, apenas o palco e o botão.
2. Atrás do `⋯`, três grupos curtos: **Hsin** (expressões e atenção, gestos ocasionais, mão sob o queixo), **Cena** (atmosfera) e **Arquivo** (trocar arquivo, voltar, créditos). Os mesmos controles e a mesma automação de antes; nada novo para operar à mão.
3. O laboratório, só com acesso explícito, começa pelos dois papéis de braço, depois a atuação facial e o restante. 02B e 03B ficam por último e só no modo interno.

## Paleta

Tokens nomeados a partir das referências: escarlate e carmesim, vinho e malva, marfim e creme, ouro de lanterna e âmbar, sobre uma noite quente. Gradientes carmesim→ferrugem nos estados ativos, vinho→brasa nas superfícies, palco malva→noite. Foco dourado, seleção escarlate, botão de arquivo, caixa de seleção, controle deslizante e lista de opções seguem a paleta. Nenhum azul permanece. As imagens de referência não foram incorporadas ao site.

## Testes

Rodam aqui, sem `three`: `hsin-arm-roles`, `hsin-left-arm-motion`, `hsin-chest-director`, `hsin-clean-presentation`, `hsin-palette`. Eles cobrem a tabela de papéis e a classificação de lateralidade, a matemática de sobreposição, respiração e durações, 4000 configurações reproduzíveis da composição, o diretor com pose falsa (tempos, sorteio da composição, ausência de saltos, restauração exata), o acesso por URL, a estrutura da página, o vocabulário visível e a paleta (cores, contraste AA, ausência de azul).

Dependem de `three` e rodam na CI: `hsin-chest-rig` (esqueleto sintético com ossos reais: prontidão, repouso e extremos exatos, pose sem estado, limite da respiração, composição guardada, braço direito intocado, diretor real devolvendo o braço ao repouso exato) e os testes anteriores, entre eles `hsin-chest`, `hsin-presentation` e `hsin-arm-clearance`.

## Limitações

- **O braço esquerdo ainda depende de QA visual humano com o GLB.** Nenhum teste desta entrega renderiza a malha. O guarda de folga avalia um envelope frontal amostrado de tórax e manga do mesmo lado; não é simulação de tecido e não vê busto, cabelo nem o braço oposto. Os testes numéricos servem de rede contra regressões; não aprovam o movimento.
- A lateralidade real de `.R`/`.L` no arquivo só é conhecida quando o GLB é aberto. A auditoria suspende o gesto se o rig estiver espelhado.
- A composição das mãos mede o punho e o primeiro dedo, não a malha da mão. Dedos e luvas precisam ser conferidos nas vistas frontal, 3/4 e perfil.
- `check:ux` falha em três verificações (`nav: lab label aligned`, `nav: music static link`, `curiosidades: header link`). As mesmas três falham na `main`; não têm relação com esta entrega.

## O que conferir com o GLB

Frente, 3/4 e perfil, com e sem a pose sob o queixo: o gesto está na mão esquerda; a chegada é em sequência (ombro, antebraço, mão) e não parece rígida; não há solavanco ao subir nem ao voltar; a respiração é discreta; manga, busto, torso e cabelo sem atravessar; quando as mãos se aproximam, não se tocam nem se cruzam; a pose da mão direita está exatamente como foi aprovada; a apresentação sem `?lab` não mostra nada técnico; os tons e o contraste do menu agradam sobre o palco real.
