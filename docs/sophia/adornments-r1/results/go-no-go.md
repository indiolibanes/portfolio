# Sophia — R1.A / R1.B · resultado

**R1.A: SOURCE_MATCHED. R1.B: piloto estrutural concluído, CONTACT / C1 / MOBILE / ARTISTIC ainda sem aprovação. NO_GO para integração pública ou expansão.**

Base de fontes: PR #303, `d638f6e3a608cf953ffcb0322b41fb0dd051416d`; main conferida `ffab5343d95c7f59232c26428d6f4301f1d58199`. Os seis documentos foram lidos integralmente. O trabalho ocorreu em branch própria, sem mudar main ou atualizar #303.

## Fonte demonstrada

O SHA-256 calculado do `public/experimental/sophia-alpha.glb` é `3b0e7db84809d6e4fe6eaa2bc6299874c202c529adcbd369cf83c6a29d3c3a2a`, exatamente o da candidata `Sophia_6H_visual_candidate.glb` registrado em `Verdict.json` e no relatório 6H. Essa equivalência foi medida, não presumida pelo nome. Há 101 joints, quatro alvos faciais e os cinco clipes Idle/Write/Point/Wave/Walk. A 7B E1 permanece sem skin e sem clipes. Não foi promovida a parent body.

**Parent de ensaio: a própria 6H verificada, ainda candidata não canônica.** O piloto comprova recuperação no rig dessa fonte. Não comprova encaixe num corpo C1 diferente. Não houve troca para astronauta ou 7B nem reconstrução de corpo/rig. A identidade C1 segue autoridade artística; a 6H tem proporções/face/pelagem próprias e três estrelas em relevo, sem a franja opaca exigida pelo C1. Esse gate não foi disfarçado como PASS.

## Recuperação efetiva

| Peça | Resultado verificável | Limite |
|---|---|---|
| Book | Todas as cinco primitivas, 224 triângulos, UVs onde existentes, cores, materiais e texturas preservados; socket entre hand_L e nó Book | Mantém offsets e os canais originais; mãos/tecido ainda cruzam em poses herdadas |
| Pen | Duas primitivas, 2.936 triângulos, UVs/materiais/cores preservados; socket entre hand_R e Pen | É o instrumento metálico ornamentado da fonte; não foi inventada pluma. Empunhadura não aprovada |
| Estrelas da testa | Primitivas 9/10/11, 864 triângulos; pesos originais 100% head e deltas de morph zero permitiram equivalência rígida por inverse-bind | Grupo de três relevos legado, sem UV original; não é a marca plana única C1 sob franja |
| Jaleco/forro/lapelas | Core 4/5 com TEXCOORD_0 e skin; lapelas 127/130 com cor/material e skin | Recuperável, mas precisa reparo de contatos e eventual ajuste local de manga/gola/barra |
| Orelhas, laço/broche, fitas | Partes existentes mapeadas no manifest e CSV | Recuperáveis como peças indexadas; encaixe/colisões seguem pendentes, não integradas automaticamente |

O GLB piloto tem hash `fd278e201f1854dd1a2dae6f24064a0c2f9013262007cece70ff478c28ff1fce`. O BIN inteiro permanece idêntico à fonte: **zero novos vértices e zero novos joints**. Materiais, imagens, texturas, accessors, skins/IBMs e os cinco arrays de animação são iguais. As alterações são sockets de identidade e separação do grupo de estrelas. Book/Pen continuam sendo alvos dos mesmos canais, sob os mesmos ossos.

Three.js CPU amostrou 51 instantes de cada clipe: 255 poses, erro máximo de matriz dos props **0** e erro máximo de vértice das estrelas **0**. Isso demonstra equivalência geométrica/parental, não qualidade artística nem eliminação dos defeitos da fonte.

## Contatos medidos

61 poses (repouso + 12 por clipe), 915 pares avaliados. Método: glTF LINEAR/slerp, morphs, linear blend skinning e BVHTree de superfícies, epsilon zero. Os filtros regionais, triângulos indexados e limites estão no código/JSON. **Não é colisão contínua, não detecta toda contenção volumétrica, não certifica folga entre amostras.** Uma região sem faces retorna UNRESOLVED, nunca aprovação.

| Par | Poses com cruzamento | Máximo de pares | Pior amostra |
|---|---:|---:|---|
| hands__book | 49 / 61 | 170 | REST / 0 s |
| hands__pen | 61 / 61 | 286 | REST / 0 s |
| cuffs__book | 60 / 61 | 375 | Point / 0.0 s |
| pen__book | 0 / 61 | 0 | REST / 0 s |
| wrists_forearms__sleeves | 12 / 61 | 32 | Write / 0.0 s |
| shoulders__coat | não resolvido / 61 | não medido | None / None s |
| sleeves__cranium | 0 / 61 | 0 | REST / 0 s |
| chin__collar | 12 / 61 | 20 | Write / 0.0 s |
| tail__body | 61 / 61 | 436 | REST / 0 s |
| tail__coat | 61 / 61 | 741 | Walk / 0.272727273 s |
| stars__cranium | 0 / 61 | 0 | REST / 0 s |
| cranium__ear_jewelry | 0 / 61 | 0 | REST / 0 s |
| ear_ribbons__mane | 4 / 61 | 56 | Point / 1.309090961 s |
| book__chin | 0 / 61 | 0 | REST / 0 s |
| pen__chin | 0 / 61 | 0 | REST / 0 s |


No Write, o centro do anel terminal da Pen fica a 0.000666519–0.000726951 unidade da página (aproximadamente 0.667–0.727 mm se aplicada a unidade metro declarada pela fonte). É proximidade geométrica sem assinatura; não prova tinta/contato físico ou empunhadura natural. A coluna de distância mínima de vértice é separada dessa medida. Para pares que cruzam, não se atribui folga positiva.

As contagens não são uma suposta melhoria sobre os números antigos: seleções regionais/amostragem diferem do relatório 6H. As colisões do piloto seguem da equivalência provada com a fonte; a matriz foi avaliada diretamente na fonte, não apresentada como segunda medição independente do piloto. Punhos, queixo e cauda precisam da próxima correção limitada antes de aceitação de atuação.

## Capturas e arquivos privados

O conjunto de revisão contém 0°/45°/90°/180° reais de fonte, piloto e E1 com câmera/escala comuns; Write, Wave, Walk e Idle; closes de capa, página, punho, gola, cauda e fitas; enquadramentos 16:9 e 9:16. Detalhes props-only ocultam o corpo só no render e são rotulados. Os PNGs são Cycles CPU da geometria importada, não imagens sintetizadas nem screenshots WebGL. Os loops GIF têm 24 frames e 3.000 ms, com os clipes originais amostrados. Veja `capture-index.json` para hashes, câmera, tempos e limitações. O começo NLA em frame 1 foi compensado nas capturas finais.

O `.blend` foi criado por importação do GLB piloto, com imagens packed, e reaberto. **Não é uma fonte nativa original recuperada.** Guarda os cinco grupos glTF como actions separadas de armature/props/morphs; não são novos clipes. Foi salvo em REST com NLA muted para inspeção: selecione o track original para reproduzir. GLB, BLEND, PNGs e GIFs são entregues em pacote privado ao proprietário, sem commit de modelos/capturas ou rota pública.

## Runtime, memória e limites

Harness local em `scripts/sophia-adornments/`, servido somente em loopback, com Host validado e caminhos fixos. Carrega uma fonte por vez após comando e visibilidade, um mixer/RAF próprio da revisão isolada, toggles dos três adornos, seletor de clipes, pausa/seek, remoção e medição de 10 ciclos. Não é código montado no portfólio. Testes HTTP de Host/path passaram; WebGL real e contexto restaurado continuam sem validação visual.

10 ciclos CPU de parse/pose/descarte passaram com contabilidade explícita de geometrias/materiais/texturas/skeleton. Texturas foram substituídas por placeholders no ensaio CPU. São 286 mesh draws potenciais e 291,306 triângulos; **draw calls efetivas, tempo de decodificação real, VRAM e leaks de GPU não foram medidos**. Estimativas RGBA de imagens não são alocação ou latência real. Samsung Internet não foi testado e não recebeu PASS.

R3: arquivos de runtime, API, páginas e demais personagens ficaram idênticos ao baseline. Não houve regravação remota; GET anônimo do asset retornou 403, portanto hash e 47 clipes são evidência do relatório existente, não recontagem atual. A prova de preservação dos arquivos protegidos está em `preservation.json`.

## Decisão do jaleco

**A — recuperar e reparar: GO técnico para planejar a próxima correção limitada**, sujeito à inspeção do proprietário. A malha, UVs e pesos existem; não há prova de inviabilidade. **B — remesh parcial: reservar somente se um defeito localizado persistir após ajuste de pesos/contato. C — Tripo: NO_GO nesta etapa**, pois A/B não foram demonstradas inviáveis. Nenhum crédito consumido e nenhum novo jaleco foi gerado.

## Saída e próxima etapa

Não converter páginas. Inspecionar o piloto e decidir qual fonte autoral deve receber o ajuste final. Antes de R1.C/D, resolver conformidade da estrela/franja, cruzamentos do punho/caderno e gola/cauda, validar um corpo/rig autoral e medir WebGL/Android. Não fazer merge nem declarar 6H canônica por esse ensaio.
