# Jaleco — reparo A parcial, sem autorização de escalada

A geometria original continua recuperável. O ensaio final move apenas a borda frontal superior da gola, com campo suave de até 6 mm em espaço da fonte. Core e guarnições adjacentes acompanham o campo; forro, lapelas, corpo, ossos e pesos permanecem iguais. São 574 vértices de posição em oito primitivas fonte (4, 12, 121–126); índices/topologia não mudam. Normais autorais recebem apenas a rotação local provocada pela geometria, preservando as demais normais, sem suavização global. Diferença angular máxima: 12,739°.

O jaleco inteiro NÃO foi rigidamente preso a um osso. Os pesos, os 101 joints e suas inverse-bind matrices são exatamente os do piloto. A análise por peça e as frações de vértices com uma influência estão em `r1c-source-diff.json`; o comportamento original dos ombros/cotovelos não foi mascarado por troca de rig.

## Comparação emparelhada

61 poses originais (REST diagnóstico + 12 por clipe) e 100 adicionais: Write 65 em 0–3,2 s, Wave 13 em 0,9–1,5 s, Walk 13 em 0,15–0,4 s, Point 9 em 1,2–1,4 s. Os mesmos índices de faces, câmeras, clipes e tempos são usados nos dois modelos. REST não é aprovação visual: os 12 joints dos braços têm divergência entre node-rest e inverse-bind na fonte. Os renders usam clipes ativos.

| Par | Poses com cruzamento antes → depois (61) | Máximo de pares de triângulos antes → depois | Interpretação |
|---|---:|---:|---|
| Queixo × gola | 12 → 0 | 20 → 0 | Melhora medida; revisão artística ainda pendente |
| Antebraço/punho × manga | 12 → 12 | 32 → 32 | Defeito de dobra persiste |
| Punho de manga × caderno | 60 → 60 | 375 → 375 | Contato/penetração não aprovado |
| Cauda × jaleco | 61 → 61 | 741 → 741 | Encaixe e excesso ainda não separados com segurança |
| Ombro E × torso proximal E | 13 → 13 | 30 → 30 | Seleção não vazia, cobertura anatômica parcial |
| Ombro D × torso proximal D | 13 → 13 | 35 → 35 | Seleção não vazia, cobertura anatômica parcial |
| Lapelas × queixo | 0 → 0 | 0 → 0 | Sem novo cruzamento amostrado; lapelas intactas |

Nas 100 amostras densas: queixo/gola 65 → 0; antebraço/manga 65 → 65 (máximo 34); punho/caderno 100 → 100 (375); cauda/jaleco 100 → 100 (745). BVH mede cruzamento de superfícies triangulares, não distância de penetração, volume contido ou colisão contínua. Zero pares não constitui aprovação visual.

**Correção da auditoria de ombro:** cada lado tem 1.246 triângulos reais da casca do jaleco em raio de 60 mm da origem bind do upper_arm. O parceiro contém 245 triângulos reais de torso proximal em raio de 85 mm. A fonte não fornece uma superfície completa de úmero sob a roupa; portanto isto é um proxy espacial do torso, não aprovação anatômica integral do braço. Os índices selecionados têm hashes no relatório. Não foi criada geometria sintética para preencher a seleção.

Nas 161 poses, a primitiva de gola 121 tem área de triângulo mínima relativa 0,82018, sem normais de face invertidas; deslocamento máximo mundial 5,99998 mm. Core: área mínima relativa 0,99796, máximo mundial 0,02260 mm. Forro e lapelas avaliados permanecem exatamente iguais. A checagem adicional de todas as oito peças modificadas, mais forro/lapelas, contém 1.771 linhas (11 peças × 161 poses): nenhuma normal de face oposta; área mínima relativa global 0,75463 nas guarnições. Essas estatísticas não certificam gramatura, auto-interseção de toda a gola ou suavidade artística.

## Tentativas rejeitadas

A matriz rápida usa as mesmas 10 poses em cada tentativa; não é comparada diretamente com as 61 como se fossem a mesma amostra.

| Tentativa A localizada | Resultado observado | Decisão |
|---|---|---|
| Offset caderno 6 mm + compensação média da pena; cuff radial 2 mm; barra 5 mm; blend de ombro 8%; gola 6 mm | Introduziu pena/caderno (máx. 275), piorou mão/caderno 170→212, ombro E 30→33 e cauda/jaleco 741→747 | Revertida integralmente; ensaio combinado não isola causalidade de cada parâmetro |
| Gola frontal 6 mm | Removeu cruzamentos queixo/gola sem mudar os outros pares | Delta de posição retido; normais corrigidas localmente no derivado final |
| Folga frontal de cotovelo 5 mm + gola | Antebraço/manga piorou de máximo 32 para 62 | Folga revertida |

Esses ensaios provam que as propostas testadas não resolvem o conjunto; não provam que toda correção local possível falhará. Não se declara geometria original inviável.

| Etapa | Decisão |
|---|---|
| A — recuperar e corrigir localmente | PARTIAL: gola melhorada; ombro, manga, punho, barra/cauda não aprovados |
| B — retopologia/remesh parcial | NÃO EXECUTADA; faltam prova específica de inviabilidade local e review |
| C — Tripo3D | NO_GO nesta entrega; nenhuma chamada/geração |
| Integração pública / R1.D | NO_GO automático; depende da inspeção e decisão do proprietário |
