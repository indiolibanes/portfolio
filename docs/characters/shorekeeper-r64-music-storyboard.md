# Shorekeeper — storyboard autoral proposto (não implementado)

**CHOREOGRAPHY_PENDING.** Nenhum movimento, timestamp ou sincronismo artístico foi produzido/certificado nesta PR. A biblioteca atual oferece idles originais, não uma dança autenticada. G7 NO_GO; autonomia facial R6/R7 continua bloqueada.

| Fase proposta | Intenção artística a validar | Condição/limite técnico |
|---|---|---|
| Preparação | Orientar a atenção para a experiência compartilhada sem arrancada de posição | Só após playback confirmado e permissões artísticas específicas; entrada a partir da pose atual |
| Frase corporal | Um gesto autoral curto de corpo inteiro, com arco e contraposto, evitando oscilação diagonal repetida | Necessita asset/curvas novas autorizadas e A/B visual; nunca Skill/Burst renomeada; mesmo body owner |
| Continuidade | Sustentar a intenção e concluir a frase, em vez de alternar clipes abruptamente | Relógio de apresentação existente; phase/seek determinísticos; nenhum segundo mixer ou timer |
| Recuperação | Devolver peso e postura a um dos três idles sem snap ou apoio inventado | Pause/buffering/ended, mudança de epoch, hidden e interrupção devem ter política explícita e prova visual |

Contrato para uma implementação futura: consumir snapshot read-only de musicForStage, com epoch e qualidade; não iniciar por simples seleção de provedor. Posição observada não significa beat tracking. Metadados incompletos devem reduzir a pretensão de sincronismo, não inventar batidas. Uma futura score deve ser função de tempo absoluto da apresentação já existente; nenhum relógio local acumulado paralelo. Seek e retorno devem ser reversíveis; reduced-motion devolve pose estável, sem escrita facial concorrente. Descarte cancela preparação e devolve ownership.

Sem confirmação artística de uma frase completa (entrada, execução, continuidade e recuperação), o guest preserva idles e reconhecimento musical. Aprovar esta PR técnica não aprova automaticamente coreografia, autonomia R6/R7, curvas derivadas ou G7.
