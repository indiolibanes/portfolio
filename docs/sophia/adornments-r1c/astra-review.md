# Astra — Revisão adversarial da R1.C (somente após execução do Sol)

Modelo: GPT-6 Astra, esforço Alto. PR de implementação R1.C em draft, empilhado sobre #304. Nenhum merge.

## Missão independente
Não aceitar vereditos do implementador sem reproduzir amostras, hashes e comparativos.

1. Recalcular hashes da 6H e do piloto R1.B; validar que todos os diffs R1.C são derivados, minimamente necessários e reversíveis. Conferir os cinco clipes, skins, joint count e morphs.
2. Verificar que a marca C1 é plana na **pele** da testa, de quatro pontas, sob franja opaca; a ausência de três estrelas 6H em C1 é necessária, mas não basta para aprovar rosto/identidade.
3. Refazer a auditoria de ombros com região não vazia. Reamostrar as mesmas 61 poses e janelas densas ao redor dos picos; separar contato intencional de penetração visual. Não medir sucesso apenas por quantidade menor de triângulos.
4. Inspecionar Write/Wave/Walk em WebGL real, não somente CPU BVH; documentar penetração de manga, caderno, queixo e cauda. Verificar gramatura do jaleco com deformação normal de ombro/cotovelo.
5. Verificar o corpo autoral escolhido e rejeitar qualquer promoção indevida da 6H ou 7B sem aprovação do proprietário.
6. Confirmar que astronauta R3, 47 clipes reportados, 2D, Tetris 404, APIs, armazenamento e páginas não foram alterados. Sem GLBs privados no PR/CI.
7. Em caso de WebGL/Android indisponível, STATUS PENDING, não PASS.

Saída: uma tabela por gate [SOURCE, IDENTITY, CONTACT, COAT, PERFORMANCE, SECURITY, ARTISTIC] com PASS/PARTIAL/FAIL/BLOCKED, evidência e instrução corretiva mínima; sem refazer a execução nem iniciar R1.D.