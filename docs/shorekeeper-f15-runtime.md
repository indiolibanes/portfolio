# Shorekeeper F1.5 — validação privada

Data: 2 de novembro de 2026. Resultado global: **PARTIAL — VISUAL_QA_PENDING**. A amostra foi mantida privada. Não há GLB nem texturas neste pacote.

## Ambiente e procedência

GLB SHA-256 `2c9673907cf19d6e7c0f82c4bdb5a418446f8de5c09448b067a17f5270d3686e`, 27.512.648 bytes. O ZIP F0–F1 foi recuperado e inspecionado; o validador próprio também depende do FBX original para a parte final, ausente nesta rodada. O Khronos Validator, Blender e navegador/WebGL não estavam disponíveis. Não se tentou download. Three.js instalado: 0.186.1. Execução Node com `GLTFLoader.parseAsync`; a decodificação de imagens no loader foi simulada, sem GPU, sem navegador. Os oito PNGs foram decodificados separadamente pelo Pillow, todos 2048² RGBA. Isso não comprova upload de texturas ou renderização.

Repo: main consultada pelo código remoto; o PR #170 permanecia aberto, draft, não mesclado, head `4916630e92a78a11e81dbdf6217a8b7ec04d8c83`, mergeable=false. A descrição do PR menciona outro hash em parte do texto: o campo head é a referência. A cópia local está desatualizada e contém mudanças de outra tarefa, preservadas. O código remoto da Hsin usa módulos dedicados, coleta recursos compartilhados em sets e descarta skeletons; não foi alterado.

## Critérios

| Critério | Estado | Evidência / limite |
|---|---|---|
| Khronos glTF Validator | BLOCKED | Ferramenta independente indisponível; conformidade formal não demonstrada. |
| GLTFLoader | PARTIAL | Parse CPU real em 0.186.1; decodificação de imagem simulada; sem WebGL. |
| Skin e joints | PARTIAL | 8 SkinnedMesh, um skeleton compartilhado com 249 bones; 59.675 pontos submetidos a skinning CPU sem valores não finitos. Sem aceite visual. |
| Sparse | PARTIAL | 97 accessors; comparados 98.496 componentes sparse fornecidos pelo GLB com arrays decodificados do loader, 0 diferenças; não é teste completo do validador. |
| Clipes | PARTIAL | 223 e 143 tracks; amostragem em 100 passos para cada clipe, matrizes e transforms dos bones finitos. Não garante integridade contínua nem aparência. |
| Limpeza | PARTIAL | Eventos de dispose recebidos para 8 geometrias, 8 materiais e 8 texturas. Skeleton.dispose chamado uma vez; Skeleton não emite dispose e não tinha boneTexture criada nesse cenário sem renderer. Liberação real na GPU não verificada. |
| Composição | PARTIAL | Divisão 80+143, 0 tracks coincidentes, originais preservados; one-shot retornou aos quaternions iniciais no ensaio. Sem sincronização ou aceite visual dos dois clipes. |
| Face | PARTIAL | Morphs e deltas verificados numericamente, com inferência linear para 5 pesos; não há nova comparação visual nesses pesos. |
| Materiais / desempenho | PARTIAL | PNG e configurações inspecionados; ausência de benchmark e de renderização. |

## Observação nova: limites dos morphs

GLTFLoader emitiu 97 avisos `Missing min/max properties for accessor POSITION`, um por alvo sparse. No código Three.js 0.186.1, a expansão conservadora da bounding box pelos deslocamentos do morph é ignorada quando esses limites estão ausentes. Isso pode levar a culling prematuro. Não confundir com confirmação de erro de especificação Khronos: execute o validador oficial. Na F2 calcular min/max corretos para deltas densificados, incluindo zeros, testar antes/depois do culling e validar a especificação. Alternativa temporária e custosa: `frustumCulled=false` apenas na malha em teste; não resolver sem medir.

## Composição

Os 143 canais da camada secundária sobrepõem os alvos da animação corporal. Com ações normais, o mixer pondera valores concorrentes da mesma propriedade; não interpreta a segunda animação como delta. Na solução A, clonar a corporal e retirar as 143 trilhas de mesmo nome, preservando a original; o clip secundário é clonado. A prova não reproduziu os dois de forma simultânea: as durações 3,96179 s e 2,63374 s não demonstram alinhamento ou loop suave. Não ativar uma camada de tecido contínua até revisar fase, emendas e qualidade visual. Alternativa B exige pose de referência e deltas validados, arriscando dupla transformação; C exige parâmetros e dinâmica ainda não conhecidos. A é a menor hipótese verificável, não uma solução artística final.

O protótipo `shorekeeper-composition.mjs` usa LoopOnce, envelope de entrada e retorno smoothstep e hold opcional no último quadro; o retorno é à pose-base capturada pelo mixer. Valores de tempo são parâmetros de teste e não foram aprovados visualmente. A sustentação do quadro final não corresponde necessariamente a uma pose artística desejada. Não integrar ao player Hsin antes de testar pausas, interrupção/reentrada e transições sob renderização real.

## Face, olhos e geometria

`E_Close` e `E_Smile_L/R` estão em Face; `Pupil_L/R/Up/Down` em Eye. Down e Alpha possuem 14 morphs cada, mas nenhum desses nomes. Face tem 64, Eye 5. `E_Close` desloca 1.112 vértices; delta máximo local no peso 1: 14,51 mm. Para pesos 0, .25, .5, .75, 1, máximos lineares teóricos são 0, 3,63, 7,26, 10,88, 14,51 mm. `E_Smile` tem máximo ~7,51 mm; pupilas lateral ~13,13 mm, vertical ~5,44–6,07 mm. São máximos de delta em coordenadas locais, não medidas de abertura ocular nem prova visual. `facial.json` traz os valores por alvo. O alvo bilateral só altera Face: Eye não possui `E_Close`; a relação entre íris, cílios e pálpebras deve ser observada na tela. A prancha anexada anterior mostra fechamento incerto e estrias, produzida em software; ela não prova a causa nem valida os passos intermediários. Sem wink independente nem limites herdados da Hsin.

## Materiais e orçamento

Todos os oito materiais são OPAQUE e single-sided. Alpha de Bangs varia 0–255, Hair 254–255, Alpha 56–255 e Eye 0–97. O alfa pode ser máscara de shader, não opacidade; trocar tudo para BLEND causaria regressões. Compare, localmente, original e variantes isoladas MASK/BLEND apenas em Bangs/Alpha, com face e olho como controles, considerando ordenação, depthWrite e recortes. Para distinguir causas, observar a mesma geometria em material neutro e material/textura; a evidência atual não permite atribuição definitiva. Não foi criado shader supostamente fiel.

Oito texturas RGBA8 de 2048² custariam teoricamente 128 MiB sem mipmaps e cerca de 171 MiB com cadeia completa, sem contar outras alocações, compressão real ou implementação. O tamanho GLB não é memória GPU. 97 targets, muitos esparsos no arquivo, tornam-se arrays no loader; o custo GPU real depende do renderer/dispositivo. Testar KTX2/Basis fora do repositório e comparar perceptualmente face e olhos antes de escolher compressão; usar lazy load e fallback conforme necessidade. Não há medições de FPS, VRAM ou tempo de carga.

## Próxima fase F2

1. Rodar Khronos glTF Validator local e registrar relatório completo; reparar problemas comprovados, incluindo investigar min/max dos morphs.
2. Em WebGL2 real, confirmar PNGs, bind, visibilidade com culling, animação e descarte; medir desempenho em desktop e Samsung.
3. Comparar visualmente `E_Close` nos cinco pesos, com cílios, Face e Eye; só então considerar particionar wink. Testar cada pupila e combinações, calibrar limites e evitar interseção.
4. Testar material neutro versus variantes controladas Bangs/Hair/Alpha com luz, profundidade e transparência. Preservar versões e rejeitar intervenções que desfigurem a personagem.
5. Validar movimento one-shot, transição, interrupção e se a faixa secundária é compatível temporalmente; testar repetição apenas se as extremidades forem contínuas.
6. Medir compressão e memória, preservando qualidade dos olhos/rosto; desenvolver adaptador específico isolado só após aceitar os ensaios. Não iniciar Phrolova.

## Reprodução privada

Coloque os scripts em um projeto com Three.js 0.186.1 instalado. Execute `node runtime.mjs /caminho/privado/model.glb`, `node facial.mjs /caminho/privado/model.glb` e `node composition-test.mjs /caminho/privado/model.glb`. Os scripts não devem ser conectados a telemetria ou validadores externos; nunca copie o GLB a `public/`. A simulação de imagem no Node não deve ser interpretada como renderização.
