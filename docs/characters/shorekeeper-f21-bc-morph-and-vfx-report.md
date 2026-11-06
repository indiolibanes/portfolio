# Shorekeeper F2.1 B+C — Rodada 1: forense da boca e gates visuais

**Resultado: B_FACIAL_CAPABILITY_PARTIAL / B_VISUAL_QA_PENDING. Gate B1 não aprovado.**
Nenhuma recuperação artística de LITTLE_SMILE_V2 ou MY_STAR_V2 é alegada. Sem B1, B2, refino dirigido por capturas e integração B+C permanecem bloqueados pelo plano.

## Bases auditadas

| Cadeia | Estado consultado | Head | Decisão |
| --- | --- | --- | --- |
| #223 facial/CL | aberto, draft | c129f5374f9581290c3a072d636d694b192c5486 | Base deste ramo B |
| #215 CL | aberto, draft; contém #217 | 28653eba0138f5ff3e3eccc3c1f15bf84cf97c91 | Preservar variantes, sem escolher Root padrão |
| #219 VFX R1 | aberto, draft, paralelo | c454fc9a40fba5fc5c6ad1680a286fe0e4059198 | Auditoria C separada; não transplantado |
| main | inclui #221, #222 e #225 | 839fca45224154c2eca98d1b47e0d3faa42079b0 | Não alterada; integrações de assets/R2/S1 não portadas nesta rodada |

#216 está no histórico de #223. #217 está no histórico de #215/#223. O VFX R1 não está integrado em #223. Consultados status, branches, histórico e 35 PRs mais recentes antes de escrever. O pedido usa exclusivamente B/C.

## Identidade e inventário real

O GLB privado recuperado foi revalidado: **39.487.548 bytes**, SHA-256 **4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30**. Não foi regravado. Os oito meshes têm uma primitiva/material cada; 249 bones. Contagem real: **83 nomes únicos / 97 instâncias de morph**, distribuídas em Face 64, Eye 5, Down 14 e Alpha 14. Os onze clipes embutidos, incluindo três idles e suas camadas, têm **zero tracks de pesos faciais**.

O parser glTF binário/sparse e o GLTFLoader real foram usados independentemente. O segundo usou imagens simuladas apenas para auditoria CPU; não houve render nem aprovação de materiais. `scripts/qa/audit-shorekeeper-mouth.mjs` gera inventário privado de cada mesh, componente, material e morph: contagem/percentagem de vértices afetados, deslocamento médio/máximo, região, modo relativo/absoluto e existência de normal targets.

## O “fiozinho” e hipóteses eliminadas

- A Face tem 3.062 vértices e **64 componentes topológicos**. O contorno escuro candidato é o componente 12 (ordenação por tamanho), com **52 vértices**, no atlas UV perto de V=0,902…0,917. A amostragem privada da textura tem mediana RGB aproximadamente 51/47/47. Não é uma Mesh ou material separado.
- M_Smile_L e M_Smile_R afetam 57 vértices cada; cada um afeta dez vértices desse contorno, além de pele/superfícies adjacentes. Deslocamento máximo global ~0,00384 unidades locais, e no contorno ~0,00351. P_M_L/R_Add afetam 69 vértices cada e também alcançam o contorno. M_OpenSmall afeta 551 vértices, dos quais 26 no contorno.
- Há componentes orais distintos dentro da mesma primitiva (116 vértices, 76+76, 60, 52, etc.), com ilhas UV de tecido oral/dentes/contorno. Portanto, “Face” não é uma superfície monolítica.
- A Face é opaca; a textura tem alpha 254…255. O contorno não é explicado por uma alpha separada ausente. A Eye também é opaca, embora sua textura tenha alpha 0…97; a semântica original desse canal não foi estabelecida e isso não autoriza mudar transparência.
- Todos os 97 morph targets exportados têm posições relativas, **sem deltas de normais**. Isso é uma característica real do arquivo, não prova de que normals/shading sejam a causa do defeito.
- Binding ausente do contorno, outro mesh de boca esquecido e tracks faciais nos idles não são sustentados por estes dados. O contorno responde geometricamente; ainda falta demonstrar sua leitura, oclusão, winding, shading e relação com o interior oral no WebGL real.

**Não foi estabelecido FACIAL_ASSET_LIMITATION.** Não se esgotaram combinações úteis nem se provou necessidade de corrective shape. Não foram criados shapes, alterados materiais canônicos ou escolhidos pesos artísticos novos sem evidência.

## Correção estrutural demonstrável

O avanço facial da base escrevia Face/Eye mesmo durante playback de referência; a interrupção de combate só iniciava a liberação, continuando a escrever a cada frame. Isso poderia sobrescrever tracks faciais de um clipe futuro. Agora há uma passagem explícita: neutralização na fronteira start/end de combate, seguida de nenhuma escrita facial durante o combate. Playback de referência também cede a escrita final. Não há promessa de fade pré-combate: esta correção protege ownership; avaliar a fronteira visual no laboratório.

Permanecem o mesmo escritor final (`createGentleFace` → `setFacialMorphs`), o dono de E_Close e a curva bilateral **0,13/0,08/0,20 s**. Não foram modificados idle director, clipes, Root, Rib, loader, cache, rig, geometria ou materiais persistentes do modelo.

## Bancada B1 reproduzível

Abra a única rota `/experimentos/sk/?mouthQA=1` na branch deste PR e selecione o GLB canônico local. O modo exige o SHA verificado e impede início corporal automático. O restante da rota mantém o comportamento da base.

- Pesos 0/0,25/0,5/0,75/1; neutro; M_Smile_L/R, P_M_L/R_Add, M_OpenSmall, P_M_ZL/ZR_Add isolados.
- **LITTLE_SMILE_V2 e MY_STAR_V2 são IDs dos controles de base**, usando exatamente as receitas anteriores, sem alegar recuperação V2. Mantêm a pose para inspeção; não entram no agendamento automático.
- Isolamento por componente, contorno isolado e Face sem o contorno; normais como material temporário opcional. Ao restaurar/desmontar, geometria, material e visibilidades originais são recolocados; os buffers canônicos não são editados.
- Câmeras manuais frontal/¾ de rosto e boca. A mudança de peso não reenquadra nem altera iluminação. GIF local opcional, PNG e atlas JSON salvos somente por comando. Os arquivos ficam locais.

**Prova WebGL bloqueada:** o navegador abriu a bancada e informou WebGL2 indisponível ao criar o contexto. Assim, não houve capturas frontais/¾ reais, vídeo antes/depois, inspeção de boca em escala de celular ou teste Samsung Internet. O funcionamento de renderização da bancada também permanece pendente. Os atlas entregues são **projeções geométricas rotuladas**, não renderizações ou aprovação visual.

## Referências efetivamente examinadas

Os **15 GIFs** foram decodificados, tiveram duração, frames, hashes e candidatos a cortes inventariados e seus quadros amostrados foram examinados. O mapa `shorekeeper-expression-reference-map.json` distingue observação, interpretação e confiança.

`sweet smile.gif` (~3,36 s) mostra mudança legível de curvatura da boca por volta de 2 s, com inclinação de cabeça; é uma candidata de comparação para o sorriso mais amplo, sem identidade 1:1 provada com My Star. `smile.gif` (~6,96 s) só permite comparação de boca depois do giro/reenquadramento, aproximadamente 4,16…6,92 s. `hello.gif` mantém um sorriso e mudanças discretas, mas pequena abertura não foi confirmada só pelo título. `hopeful flashback.gif` mostra fechamento ocular/serenidade; “esperança” é interpretação. Os nomes atuais ficam preservados até B1 e aceitação humana.

`shorekeeper-wife.gif` é uma montagem; butterfly e Liberation também mudam de plano. O GIF chamado “ingame” inclui enquadramentos cinematográficos. Nenhum desses relógios foi declarado sincronizado a Burst01/02. O acesso ao showcase oficial no YouTube retornou DisabledError; **REFERENCE_VIDEO_ACCESS_BLOCKED**. A página KURO não retornou texto legível; nenhum frame de vídeo externo foi alegado como visto.

## C/CL e VFX

Foi recuperado o preflight C.4 privado e seu manifesto conferido pelo conversor existente. Duas bibliotecas candidatas foram regeneradas apenas fora do repositório para auditoria. A amostragem A/B de ORIGINAL/REBASED/ROOT_BODY_OWNED preserva duração e todos os canais fora de Root.quaternion. Não há decisão de orientação, supressão da pirueta ou câmera automática.

Há um ajuste de precisão na matriz futura: o FPS declarado no PSA é ~30,166666 em Burst01 e ~30,184050 em Burst02. Logo os frames 105/135 de Burst01 são ~3,480663/~4,475138 s, não exatamente 3,5/4,5 s. Não foi alterado o timing do conversor; usar o relógio do arquivo para comparar. Detalhes, lacunas do #219 e storyboard ficam no PR C separado sobre #219. Nenhum diff VFX foi integrado em B.

## Gates e entrega

| Gate | Estado e evidência |
| --- | --- |
| Inventário / identidade / deltas | B_FACIAL_CAPABILITY_PARTIAL; inventários reais e mapas privados |
| Ownership facial / blink / recuperação | Testes automatizados e regressões privadas; não são prova visual |
| B1 dois sorrisos | B_VISUAL_QA_PENDING; controles de base, nenhuma recuperação aprovada |
| B2 outros presets / nomes públicos | Bloqueado até B1 e aprovação humana |
| Root / pirueta / câmera | C_ROTATION_QA_PENDING; somente A/B numérico |
| Aparência R2 / Samsung / GPU | C_VFX_VISUAL_QA_PENDING |
| Integração B+C | Não iniciada; depende dos ramos e capturas aprovados |

Testes: treze testes focados de runtime/forense, regressões Shorekeeper existentes, seis combinações de prova×idle no GLB real, restauração do componente canônico e build Astro. Texturas simuladas nos testes Node. Relatórios e imagens privados não são publicados no GitHub. O pacote privado contém contatos dos GIFs, atlas geométricos, métricas, inventário completo e amostras de Burst; não inclui novo GLB canônico nem texturas extraídas.

Wuthering Waves e Shorekeeper © KURO GAMES. Experiência independente, não oficial. Nenhum asset privado publicado. PRs draft sem merge automático.
