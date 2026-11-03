# F2.1-C — SOURCE_ASSETS_BLOCKED

A busca local encontrou os seis PSA dos três idles, sem Attack01–04 e seus pares Rib. O pacote de combate não foi encontrado na busca disponível. Não há dados para análise ActorX, composição, retarget, QA ou geração dos ataques. Nenhum movimento foi inventado.

`combat-library.mjs` apresenta quatro identificadores com disponibilidade falsa e implementa a superfície inicial playAttack/pause/resume/interrupt/recover/getState/dispose; não cria mixer, não aceita arquivos e não afirma ser um player de combate funcional. Futuramente a integração deverá receber apenas clipes que passaram pela auditoria individual de hierarquia, bind, quaternions, tempos e ownership body/Rib e reutilizar o ciclo central do runtime. Gatilho musical futuro exige evento de playback confirmado. Não há integração musical ou VFX nesta etapa.

Próxima entrada necessária: pacote privado contendo pares Attack01–04 e Rib correspondentes, com PSK e manifesto verificável. Evitar envio dos 532 PSA. Após receber, auditar cada par e preservar saída privada, comparar com a referência e realizar QA WebGL antes de declarar fidelidade. Sem merge automático.
