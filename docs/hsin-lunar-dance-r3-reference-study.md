# Hsin Lunar Dance R3 — estudo da referência (`196609.mp4`, ~17 s)

Status: **estudo visual de linguagem corporal e temporização**. Nada do vídeo foi extraído, convertido em animação ou reutilizado como ativo: a frase Moon Fox Reverie é autoral. Método: planilhas de contato do vídeo a 2 quadros/s (ffmpeg), leitura quadro a quadro, separação do que é personagem, câmera, edição, secundários e VFX. Não há clipes de animação compatíveis nos arquivos autorizados do projeto (o GLB não contém animações; não foi presumido retargeting).

## O que é o quê

| Camada | Observação | Consequência para a R3 |
| --- | --- | --- |
| Movimento da personagem | Abertura assimétrica dos braços, torção do tronco, giro, uma inclinação profunda de lado (tronco quase horizontal no ápice), recuperação, braço erguido no final | Vocabulário dos cinco movimentos A–E; a inclinação foi **reduzida** a uma versão conservadora |
| Câmera | Plano aberto → closes no rosto e mãos (≈ 6–10 s) → plano aberto → plano baixo no final; zoom/rotação de câmera | Não reproduzido: a câmera do site é a do palco (órbita do visitante) |
| Cortes de edição | Cortes secos entre plano aberto e close; o corpo "salta" de pose entre cortes | Não são movimento: a R3 é contínua, sem saltos |
| Mangas, cabelo, cauda | Arrastam atrás da mão/cabeça, atingem o ápice depois do corpo, flutuam na inclinação | Faixas secundárias offline (atraso por profundidade, amortecimento, gravidade) |
| Partículas / VFX | Pétalas, faíscas, rastros vermelhos, explosão vermelha no fim | Fora do escopo (sem pós-processamento nem novos efeitos) |
| Rosto | Olhar ao visitante, olhar lateral, sorriso discreto, olhos estreitados, piscadas | Eventos `gesture:prepare/hold/release` existentes, sorteados por episódio |

## Poses-chave por intervalo (observação → decisão autoral)

| Intervalo | Observado | Decisão na R3 |
| --- | --- | --- |
| 0–3 s | Braços abertos assimetricamente (direito alto, esquerdo baixo), ombros antecipam, tronco gira acompanhando a mão dominante, cabeça contra-gira | **A · Fox's Prelude** (0–16 %): ombro direito antecipa, `outR` 40° × `outL` 20°, `yaw` +8°, cabeça −3° |
| 3–6 s | Giro com costas para a câmera, mangas em arcos largos, depois inclinação profunda lateral com cabelo/cauda flutuando | **B · Silk Spiral** (16–44 %): espiral parcial, arcos alternados, punhos depois dos cotovelos; **C · Lunar Bow** (44–66 %): flexão de coluna ≤ 33° + quadril para trás/baixo sobre pés travados (versão dramática de 62° separada, desligada) |
| 6–9 s | Recuperação do tronco, redistribuição do peso, rotação | **D · Moonlit Recovery** (66–78 %): tronco volta primeiro, cabeça volta com atraso, pés estabilizam |
| 9–13 s | Closes: mão perto do rosto, sorriso, olhos estreitados, piscada | Sem gesto de mão ao rosto (já existe em PR B: Lip Touch/Hair Caress); o rosto usa os eventos existentes, com cues deslocados/omitidos por episódio |
| 13–17 s | Expansão, braço erguido, silhueta aberta, finalização com VFX | **E · Foxfire Finale** (78–100 %): braço direito sobe a 66°, esquerdo responde, sustentação breve, retorno orgânico ao repouso |

## O que **não** foi copiado

Inclinação horizontal extrema, perna levantada (a política da R2 é pés travados), mão no rosto em plano fechado, cortes e câmera, VFX. A duração (13,6 s) e a ordem dos movimentos seguem o brief, não a montagem do vídeo.

## Limitação

Estudo feito sobre quadros a 2 fps: não permite medir velocidades reais. As velocidades da R3 vêm de curvas autorais (pico < 72°/s, teste `hsin-dance-r3-authoring`), não do vídeo.
