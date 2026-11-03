# Shorekeeper B.5.1 — correção mínima após auditoria

Base: PR #204 (`experiment/shorekeeper-b5-facial-consolidation`, head `0f17f52579e76156dbd664a8bce69432ff28fc4c`).
Este PR é empilhado sobre #204. A fase C (#205) permanece em sua branch original e não foi alterada.

## Defeito corrigido

A B.5 manteve o contador de piscadas no `createContemplativeScheduler`, mas removeu a chamada `face.trigger('blink', {automatic:true})`. O efeito foi uma regressão silenciosa: os três idles permaneciam funcionais, mas a Shorekeeper não piscava mais automaticamente.

A B.5.1 restaura **apenas** a piscada bilateral existente por `E_Close`, respeitando pausa, `prefers-reduced-motion` e modo de referência. As expressões faciais ainda sem aprovação visual **continuam bloqueadas** na automação. A animação corporal e o seu `AnimationMixer` não são modificados.

## Interface simplificada

Na aba Expressões, existem apenas dois controles visíveis:

- **Testar sorrisinho V2** — candidato manual a validar com material real no navegador; usa `M_Smile_L/R + P_M_L/R_Add`; **não** representa uma reprodução fiel de cutscene.
- **Piscar** — `E_Close` bilateral; também ocorrerá automaticamente no modo Expressive Acting com contemplação habilitada.

A intensidade técnica do morph foi retirada da interface pública (mas preservada internamente para compatibilidade). Os textos que prometiam olhares e expressões automáticas não comprovados foram corrigidos. Sem borboletas, sem ajustes de qualidade no menu público.

## Validação e limites

Testes automatizados verificam que a piscada automática reaparece, não ocorre com reduced motion, congela na pausa e não reabilita `MY_STAR` nem outros presets não aprovados. A B.5 e o sistema dos três idles permanecem intactos.

**`SMILE_VISUAL_QA_PENDING` / `VISUAL_QA_PENDING`**: os testes sintéticos não demonstram naturalidade facial em WebGL/Samsung Internet. Não realizar alterações definitivas nos materiais dos olhos, modificar geometria ou reconstruir o GLB nesta fase.

## Próximo passo

Após inspeção humana do sorrisinho V2 e confirmação do funcionamento da piscada, considerar a B.5 encerrada como `FACIAL_CONSOLIDATION_PARTIAL`. A C (#205) só poderá avançar de `SOURCE_ASSETS_BLOCKED` quando houver os pares privados Attack01–04 e respectivos Rib, além do PSK. Antes de mesclar a C na cadeia, atualizar/rebase sua base sobre esta correção da B.5.1 para que a regressão não reapareça.

Não modificar `main`; nenhum merge automático; nenhum asset privado publicado.
