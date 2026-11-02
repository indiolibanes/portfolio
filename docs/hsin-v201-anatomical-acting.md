# Hsin V2.0.1 — Atuação anatômica: Lip Touch, Hair Caress e "Lip & Hair Composition" (PR B)

Status: **candidato experimental**. Geometria e lógica validadas por testes numéricos; **aprovação visual pendente** (`WEBGL_VISUAL_QA_PENDING`). Um teste numérico que passa não aprova visualmente nenhum dos gestos, e o braço esquerdo em especial exige revisão humana.

## O que mudou

| Item | Arquivo |
| --- | --- |
| Mão direita mantém o Signature Chin aprovado e **continua** até o lábio inferior (Lip Touch) | `public/assets/models/hsin/hsin-v2.1-acting.json` (`poses.lipTouch`) |
| Mão esquerda acaricia o cabelo lateral (Hair Caress) | idem (`poses.hairCaress`) |
| Estado raro do diretor "Lip & Hair Composition" | `src/scripts/hsin-lip-hair.mjs`, `src/scripts/hsin-body-repertoire.mjs` |
| Player de poses assadas com N ossos | `src/scripts/hsin-baked-pose.mjs` |
| Carga e validação do perfil de atuação (hash do GLB e do perfil) | `src/scripts/hsin-stage.ts`, `hsin-stage-config.mjs`, `src/data/hsin-v201-acting.json` |
| Solver/bake offline | `scripts/solve-hsin-*.mjs`, `scripts/bake-hsin-*.mjs`, `scripts/lib/hsin-{math,rig,proximity,arm,solve}.mjs` |

O GLB `hsin-v2.0.glb` e o perfil aprovado `hsin-v2.1-profile.json` **não foram tocados**. O perfil de atuação é um arquivo separado (~111 KB), com `modelSha256`/`profileSha256`; se algum hash divergir, o recurso é desligado e o repertório antigo segue intacto (sem recurso parcialmente conectado).

## Como foi feito (sem IK em tempo de execução)

1. Um avaliador de rig em Node puro (FK, skinning LBS, morph targets esparsos, pesos de morph padrão do GLB) reproduz a pose do three.js (teste `hsin-rig-parity`).
2. Distâncias exatas ponto–triângulo contra a **malha real** (rosto, cabelo, franja, roupa, tronco). Para folhas abertas (cabelo, franja, tecido) a distância é sem sinal; só o rosto usa sinal pela normal do vértice.
3. Uma estratégia evolutiva com semente fixa resolve deltas de quaternion e flexão dos dedos (eixo local +X, verificado nas duas mãos), com custos para alvo, cotovelo, punho, folgas contra rosto/cabelo/franja/tronco e acelerações.
4. As poses resolvidas são "assadas" em trajetórias suaves (Hermite em espaço de vetor de rotação, pesos min-jerk / Fritsch–Butland). Em tempo de execução só existe reprodução de um peso 0→1 por ator.

## Gestos

### Lip Touch (direita)
Do repouso, a mão passa pelo Signature Chin já aprovado (quadros 0–64, inalterados) e prossegue em trajetória contínua até a ponta do indicador no lábio inferior, pausa, volta ao queixo e retorna ao repouso. Sem salto entre estágios.
- Alvo: ponto da superfície do lábio inferior (UV 0,5 / 0,514) mais 2,5 mm de folga.
- Medido na malha real: ponta do dedo ao alvo mín. 1,46 mm, em permanência 2,76 mm; ponta do dedo ao rosto mín. 0,6 mm (toque leve, sem penetração); demais dedos ≥ 11,7 mm; mão ≥ 53 mm do rosto.
- Passo máx. 4,8°/quadro, aceleração máx. 1,94°/quadro².
- Limite herdado: a trajetória inclui o estágio Signature aprovado, cujos mínimos (mão–franja 0 mm, antebraço–tronco) já existiam.

### Hair Caress (esquerda)
Ombro prepara, cotovelo arredondado, punho relaxado, dedos levemente curvos; aproximação tangencial ao cabelo lateral, curta passada de ~5 cm com a polpa do indicador, saída e retorno. 87 quadros, com cinco poses resolvidas (hoverIn, início, meio, fim, hoverOut) mais um waypoint de retorno (`homeMid`) para evitar que o antebraço corte o tronco na volta.
- Passada à superfície do cabelo: 1,7–4,2 mm (alvo 3 mm). Sem contato real: se o perfil não estiver pronto ou o rig diferir, o gesto simplesmente não inicia (fallback sem contato = repouso).
- Mínimos: dedo distal–rosto 21,4 mm, mão–rosto 60 mm, mão–franja 49,8 mm, antebraço–tronco 4,6 mm (mínimo 0 mm no repouso é herdado, a mão pende contra o vestido).
- Passo máx. 6,12°/quadro, aceleração máx. 1,6°/quadro².

### Lip & Hair Composition (estado raro do diretor)
Sequência de 12 passos: direita sobe ao Signature → avança ao lábio → pausa; esquerda faz o cabelo com um lead-in; pausa conjunta (sorriso discreto só após o contato); uma das duas mãos sai primeiro (variante sorteada: esquerda primeiro ou direita primeiro), a outra a segue; ambas retornam. Durações sorteadas dentro de faixas (`LIP_HAIR`), máximo de 32 s.
- Probabilidade: peso 0,3 entre os candidatos, só se Signature e gesto do peito estiverem habilitados; cooldown de 240 s e memória do último evento.
- Um único dono por cadeia de ossos: o repertório roda um ator de braço por vez; não compete com o gesto do peito (esquerda).
- O rosto reage apenas a `gesture:prepare / hold / release`; árbitro de pálpebras, atuação facial e cooldowns existentes permanecem intactos.
- Simulação do repertório por 3 600 s, sementes 1–8, com atores simulados: ~9–10 episódios/h, nunca antes do cooldown, nunca com dois atores de braço ao mesmo tempo.

## Evidência visual (WebGL por software; só geometria/cor, não prova FPS)

- `docs/qa/hsin-v201/lip-touch.webp` — rosto frontal, ¾ (palco), perfil: repouso, aproximação, queixo, toque, toque + sorriso.
- `docs/qa/hsin-v201/hair-caress.webp` — ¾, lateral esquerda, cabelo próximo.
- `docs/qa/hsin-v201/composition.webp` — repouso, mão direita sobe, composição (pausa), pausa + sorriso, esquerda sai primeiro, em ¾, quase perfil e boca (perto).

## Limites reais e pendências

- **Visual pendente:** no enquadramento ¾ do palco, com a esquerda no cabelo, o antebraço esquerdo cruza a região do olho durante o contato e na saída ("esquerda sai primeiro"), e o cotovelo fica alto. Geometricamente a mão mantém ≥ 21 mm do rosto, mas a leitura visual no palco **não está aprovada**. Uma âncora de cabelo mais baixa/posterior (por ex. x≈0,085, y≈1,49, z≈−0,075) é a hipótese para corrigir; não foi aplicada nem validada.
- Não há inclinação de cabeça (head tilt) coordenada com os gestos.
- Os quadros vêm de SwiftShader: nada aqui prova naturalidade, suavidade ou FPS.
- A solução do lábio tem folga de 2,5 mm e repouso de 2,8 mm no fim; é um toque leve, não pressão.

## Testes

`tests/hsin-lip-hair.test.mjs`, `hsin-lip-touch-geometry.test.mjs`, `hsin-hair-caress-geometry.test.mjs`, `hsin-acting-runtime.test.mjs` (usa three; roda no CI), registrados em `check:hsin` e no workflow `hsin-facial-b1-qa.yml`.
