# Shorekeeper F2.0-B.2 — Expression Library

Base verificada: PR #201, `707b244657eeb8e80cc7e536cc4034e4b9de940c`, empilhado sobre #200 e #182. As três animações F2.0-A têm aprovação visual informada pelo usuário. Esta etapa preserva os arquivos, os clipes e o diretor corporal original. **Resultado da biblioteca facial: PARTIAL / VISUAL_QA_PENDING.** Código executável e testes numéricos não equivalem a aprovação artística.

## Referências e interpretação

Os dez GIFs fornecidos foram abertos localmente, com quadros amostrados em 0, 25, 50, 75 e 95% de cada arquivo. A tabela mantém a ordem indicada pelo usuário; não pressupõe que movimentos de câmera sejam movimentos do rig. Nenhum GIF, quadro ou asset derivado é versionado ou publicado.

| Ref. | Duração do GIF | Interpretação e implementação |
| --- | ---: | --- |
| 01 My Star | 4,01 s | Sorriso doce sustentado, olhos suaves; MY_STAR, boca e pálpebras com leve assimetria. |
| 02 Surpresa | 6,30 s | Atenção e lábios discretamente abertos; SURPRISE_SOFT usa E_Stare, B_Up_Add e M_OpenSmall existentes. |
| 03 Amor | 6,12 s | Afeto sereno; LOVE com transições mais demoradas. Mãos, roupa e câmera da cena não são recriadas. |
| 04 Sorrisinho | 3,36 s | Pequeno sorriso de leitura progressiva; LITTLE_SMILE. A inclinação de cabeça da referência fica sob o idle original. |
| 05 Olá | 7,00 s | Recepção pelo olhar e sorriso; HELLO aplica pupilas antes dos outros morphs, sem gesto corporal novo. |
| 06 Preocupada | 4,16 s | Apreensão contida; WORRIED combina B_Sad/E_Sad, sem intensificar para tristeza pesada. |
| 07 Esperança | 2,91 s | Contemplação e memória; HOPE usa a entrada e recuperação mais lentas. Não reproduz chuva, iluminação ou partículas. |
| 08 Meme | 1,00 s | Desenho cômico: MEME_OPTIONAL é aproximação manual. Não há morph seguro de bochecha inflada; não reconstruir o rosto para copiá-lo. |
| 09 Aproximação | 5,15 s | Câmera “Aproximar”, mais próxima e levemente lateral. Não aplica fisheye, wink unilateral, poses ou alterações no rig. |
| 10 Olhadinha | 13,00 s | PERFECT_GLANCE: pupilas antes do sorriso. O enquadramento variável não é convertido em rotação de cabeça. |

Os valores são autoria experimental inspirada nas referências, não curvas extraídas das cutscenes. Não se afirma equivalência quadro a quadro. O lateral escolhido usa Pupil_L do próprio modelo, sem espelhamento por causa de referências de vídeo anteriores.

## Biblioteca e API

`src/scripts/shorekeeper/expression-library.mjs` concentra nomes, rótulos, descrição, pesos, morphs necessários, frequência automática e tempos. `gentle-acting.mjs` aplica a biblioteca. Configurações de timing em segundos:

| Identificador | Entrada | Permanência | Retorno | Automático |
| --- | ---: | ---: | ---: | --- |
| MY_STAR | 0,8 | 2,3 | 1,1 | Frequente |
| LOVE | 1,2 | 2,8 | 1,4 | Manual |
| LITTLE_SMILE | 0,65 | 1,6 | 0,9 | Frequente |
| PERFECT_GLANCE | 0,7 | 1,8 | 1,0 | Frequente |
| WORRIED | 0,9 | 1,7 | 1,1 | Raro |
| HOPE | 1,4 | 2,6 | 1,5 | Raro |
| SURPRISE_SOFT | 0,35 | 1,0 | 0,85 | Ocasional |
| HELLO | 0,85 | 1,8 | 1,0 | Raro |
| MEME_OPTIONAL | 0,5 | 1,3 | 0,8 | Nunca |
| RETURN_TO_BASE | — | — | 0,8 | Recuperação explícita; sem botão principal |

`createGentleFace(inspection)` mantém `trigger`, `advance`, `setPaused`, `reset` e `state`; acrescenta `support(id)` e `setIntensity(.25…1)`. Aliases históricos continuam aceitos. O slider aplica intensidade apenas ao próximo disparo; não reinicia a expressão corrente. `trigger(id,{automatic:true})` não substitui uma expressão em andamento. Presets sem morphs obrigatórios ficam indisponíveis; opcionais ausentes são reportados no JSON, sem escrever em nomes inexistentes. A UI utiliza a mesma função de binding testada com eventos click reais.

A piscada bilateral tem um envelope próprio (0,13 / 0,08 / 0,20 s). Um único escritor combina E_Close por máximo e atenua E_Smile durante o fechamento. Assim, piscar não cancela o sorriso. As pupilas opostas são resolvidas por diferença, evitando L/R ou Up/Down simultâneos; os máximos desta biblioteca permanecem ≤0,24, abaixo de 0,3. Não há bones faciais inventados.

## Ownership e modos

O diretor F2.0-A continua único dono dos TRS corporais, inclusive cabeça e pescoço. A biblioteca escreve somente os 19 nomes de morph existentes que utiliza. Nunca chama mixer.update. O loop central continua único; a câmera de aproximação não escreve no rig.

O scheduler aguarda os eventos start/execution/recovery/end e o repouso entre idles, preserva 1×, evita repetição consecutiva e nunca sobrepõe dois idles. As expressões automáticas têm frequências diferentes e não substituem presets manuais em curso. MEME_OPTIONAL e LOVE ficam manuais. Reference QA desliga a automação facial e restaura imediatamente seus morphs a zero para comparação pura, preservando o relógio corporal. O retorno normal de cada expressão, inclusive interrupção, é suave.

Pausa/retomada atua sobre corpo, rosto e temporizadores, inclusive quando apenas a camada facial está ativa no GLB F1.6. Movimento reduzido desativa automação e borboletas; ações manuais continuam disponíveis. Visibilidade, saída da viewport e bfcache suspendem os relógios. Não existe novo render loop. Borboletas usam quatro formas CSS, três em telas pequenas, sem imagens, e podem ser desligadas; o voo usa transform/opacity e pausa com a apresentação.

## Interface e fluxo privado

A apresentação oferece seleção de idle/modo, reprodução/pausa/interrupção, automação, câmeras e captura local. A aba Expressões contém a biblioteca; meme e inspeção facial ficam recolhidos. Rig, materiais, wireframe, fontes BODY/RIB, velocidade e transições continuam acessíveis em Ferramentas de inspeção. Diagnóstico fica recolhido e o JSON registra versão, pesos, capacidades e estado do scheduler. Arquivo antigo sem idles continua aceito: a biblioteca facial funciona, e os idles ausentes são indicados/desabilitados.

Nome canônico recomendado: **shorekeeper-f20-original-idles.private.glb**. É só um nome local para a cópia F2.0-A aprovada; não se altera nem se renomeia o arquivo do usuário automaticamente. Também é possível carregar o F1.6 e importar as três bibliotecas de animação pela File API. Nenhum GLB, hash novo ou asset privado é produzido nesta etapa.

Para desktop e Android/Samsung Internet: carregar localmente, selecionar Expressive Acting, abrir Expressões e testar os seis alvos principais em câmera Rosto e Aproximar. Repetir em cada idle; testar pausa, interrupção e Reference QA. Para comparar amplitude, disparar cada preset a 25, 50, 75 e 100%; o retorno fornece a referência 0. Verificar lábios, cílios, pálpebras e íris e exportar PNG/JSON apenas localmente.

## QA consolidado

| Critério | Estado | Evidência / limite |
| --- | --- | --- |
| Biblioteca, curvas e retorno | PASS numérico | Todos os presets/intensidades, pesos finitos, invariância por passo temporal e retorno exato. |
| Ownership e idles | PASS CPU | 33 combinações (11 ações × 3 idles), 3.300 amostras; 19 morphs encontrados; zero escritas em TRS e hashes dos clipes idênticos antes/depois. PNG explicitamente simulado. |
| Pausa, reduced motion e scheduler | PASS sintético | Sessões determinísticas de 600 s, não sobreposição corporal, meme excluído, expressões manuais protegidas e temporizadores pausados. |
| Botões e capacidades | PASS sintético | A mesma função usada na UI recebe click, valida modo/disabled e dispara todos os presets; morph ausente falha de modo explícito. |
| Suítes anteriores e build | PASS local | Testes do laboratório, F1.6, diretor original, npm check (inclui Hsin/Sophia) e build Astro. |
| Interface no navegador | PASS limitado | Prévia inicial cbde79d aberta: abas, oito botões, menus técnicos recolhidos e acessíveis; bloqueio seguro sem WebGL2. Não houve teste visual do modelo. |
| Aparência facial e Android | VISUAL_QA_PENDING | Sem renderização WebGL2 comprovada nesta execução. Nenhum FPS/VRAM, validade artística ou estabilidade móvel é afirmado. |

O primeiro CI de build usou Node 22.23.3, abaixo do mínimo 22.23.4 do Astro instalado. `.node-version` passa a 24 (mesma família do runtime local), e o workflow sintético da Shorekeeper usa esse arquivo. Não houve mudança de dependências, lockfile ou testes da Hsin.

Arquivos alterados: configuração Node, biblioteca nova, controlador facial/scheduler, runtime do laboratório, câmera de stage, rota Astro, CSS de apresentação, testes faciais/laboratório e workflow sintético. Nenhuma alteração em Hsin, Phrolova, Sophia, rig/GLB ou diretor original. As suspeitas anteriores sobre auxiliares dos idles continuam separadas da aprovação visual informada pelo usuário.

Próximo passo necessário: calibrar os pesos no modelo em WebGL2, usando os GIFs como direção de atuação. Priorizar My Star, Amor e Olhadinha; verificar cílios/pálpebras durante piscadas sobrepostas e legibilidade em celular. Ajustar somente pesos/tempos a partir da evidência, sem reconstrução geométrica automática.

Shorekeeper / Wuthering Waves © KURO GAMES. Agradecimento aos criadores da personagem e das animações. Estudo não oficial, sem afiliação ou hospedagem dos assets do jogo. Sem merge automático.
