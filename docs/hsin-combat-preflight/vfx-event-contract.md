# Eventos e ciclo de vida

Proposta de limites para a prévia. O relógio é tempo de simulação. O produtor de eventos é o diretor de combate; cada emissão leva actorId, cycleId, marcador, fase, instante local e âncora. Deduplicar por ciclo e marcador; cruzar tAnterior < marcador ≤ tAtual, inclusive quando um frame salta vários marcadores. Na entrada a t=0 emitir explicitamente uma vez. Repetição cria outro cycleId.

| Marcador | Origem e espaço após emissão | Limite por ciclo / vida máxima proposta | Recurso |
|---|---|---|---|
| ring.prepare / ring.release | âncora de mão resolvida no modelo; seguir até release, congelar matriz em mundo | 2 / 0,65 s cada | toro opaco/alpha recortado, geometria comum |
| arc.strike | mão → alvo fixado no início do golpe | 2 / 0,22 s | ribbon estreita, sem transparência em tela cheia |
| mechanism.build | centro lógico do mecanismo em mundo | 6 peças / 1,2 s | malha dourada instanciada, cor por instância |
| form.shift | centro do tórax projetado na cena | 1 / 0,6 s | pulso no material do efeito; pele segue o pipeline público |
| domain.open | projeção do alvo no piso, persiste após saída da mão | 1 / 3 s | disco de raio fixo, depth test, sem múltiplos planos sobrepostos |
| pillar.rise | pontos fixados no chão no início da fase | 4 / 0,9 s | instâncias opacas, uma geometria, variar scale.y |
| finisher.hit | centro do domínio | 1 / 0,35 s | consome o campo antes da explosão |
| domain.fade / recover | IDs vivos do ciclo | 1 / 0,4 s | devolver slots ao pool no fim ou imediatamente no cancelamento |

A primeira fatia só reserva uma geometria de anel e um material, um slot ativo. Aquecer quando a prévia for solicitada; nenhuma alocação de geometria no frame. O pool pertence à cena. Retorno ao pool zera draw range/visibilidade e relógio. Descarte da cena encerra todos os ciclos e libera geometria/material próprios uma vez. Geometrias e texturas do avatar têm outro dono. Sob pressão descartar o efeito cosmético menos importante e conservar o marcador do corpo. Conferir overdraw em retrato e limite incremental de calls antes de habilitar domínio/pilares.
