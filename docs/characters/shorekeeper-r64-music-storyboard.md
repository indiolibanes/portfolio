# Shorekeeper — dueto: rotação básica aprovada

**Aprovação do usuário:** durante reprodução musical confirmada, a coreografia da Shorekeeper é simplesmente uma rotação básica em torno do próprio eixo vertical. Não foi solicitada dança nova, habilidade Skill/Burst nem rastreamento de batidas. G7 permanece NO_GO para novos movimentos cinematográficos.

## Comportamento implementado na R6.4.1

| Estado | Movimento | Expressões |
| --- | --- | --- |
| Sem música | Idles originais 01, 02 e 03, sorteados desde o primeiro uso e sem repetição consecutiva | Três famílias S6/R5 curadas em ordem aleatória; R6 só manual |
| Playing confirmado | Rotação suave do grupo da Shorekeeper, 360° em ~14 s, sem criar ação de rig nem segundo mixer | Não iniciar uma nova expressão automática; comandos manuais disponíveis |
| Ready, paused, buffering, ended | Retorno controlado à orientação frontal pelo menor arco | Retomada de contemplação |
| Página pausada / movimento reduzido | Não avançar o relógio corporal nem a rotação | Nenhuma nova expressão automática |
| Dispose | Restaurar orientação e liberar os owners existentes | Liberar o escritor facial existente |

A rotação ocorre no grupo de apresentação, não no Root/bones. O diretor corporal original continua com o controle dos tracks; o diretor facial anatômico permanece com o único writer para morphs. Nenhum novo WebGLRenderer, requestAnimationFrame, domínio público de assets ou download de biblioteca é criado.

## Limites

A aprovação é artística quanto à ideia básica de rotação, não uma certificação do ritmo exato, da silhueta 360°, das roupas/cabelos, do modelo, da lua maior, do pavilhão, do desempenho ou da renderização no Samsung Internet. PlaybackConfirmed não fornece BPM ou sincronização de batida; não apresentar isso como dança sincronizada. É necessário QA do dueto autenticado em navegadores reais.
