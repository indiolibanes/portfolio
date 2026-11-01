# Hsin B.1 — candidata de coreografia

A assinatura usa a cadeia ORG/DEF direita para a mão sob o queixo. O gesto de calor usa a cadeia esquerda e amostras da superfície do torso. Cada cadeia é resolvida pelos seus próprios ossos; nenhuma malha ou textura é modificada. A assinatura usa interpolação de quaternion com entrada e saída de 2,4 s, suavização quíntica e reversão a partir do valor atual. O gesto ao peito mantém entrada, sustentação e saída separadas. O relógio compartilhado pausa junto da atuação facial e não avança sob movimento reduzido ou enquanto invisível. O gesto legado do braço direito exige que a assinatura esteja desativada, para evitar dois escritores.

A auditoria privada executou o GLTFLoader sobre o modelo local com imagens substitutas e verificou referências de skin, limites geométricos, independência das cadeias e restauração exata. Não é um render nem um teste de colisões. O cotovelo da candidata ao peito ficou perto do limite conservador; posição numérica não comprova naturalidade.

## VISUAL_QA_PENDING

No Samsung Internet, abra a prévia e selecione o modelo local. Observe a transição em frente, 3/4 e lateral; no laboratório teste a mão esquerda ao peito, alternando a assinatura direita. Verifique manga, dobra do cotovelo, punho, contato com peito, cabelo e tronco e retorno sem salto. Repita com movimento reduzido e após ocultar/retomar a página. Desative as candidatas caso ocorram deformações ou colisões. Nenhuma pose está artisticamente aprovada até essa avaliação real.

O GLB e os mapas permanecem privados. Teste opcional: `node tests/hsin-choreography-private.test.mjs /caminho/privado/modelo.glb`; não adicione o modelo ao repositório.
