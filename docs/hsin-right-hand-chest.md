# Hsin — mão direita ao peito (candidata)

Entrega B empilhada sobre o [PR #157](https://github.com/indiolibanes/portfolio/pull/157), branch `experiment/hsin-b1-iconic-automation`, head `08778322b66411c49e607df7aa7d553ad48d25f8`. O PR #157 contém o B.1 automático, I1–I5 e as atmosferas; deriva do B.1 do #156 e da apresentação #155. Nenhuma dessas branches nem a main foi mesclada.

A cadeia ORG direita é resolvida por nomes únicos e hierarquia; seus deformadores DEF são identificados em separado e deve haver referências com peso nos ramos esperados. A candidata usa a superfície skinned superior do próprio torso, uma pequena distância frontal e o tamanho facial para definir o alvo, com solução de dois segmentos. Não espelha o braço esquerdo nem altera o GLB. Falta de ossos, skin, superfície, alcance ou limites invalida a candidata.

O movimento tem entrada 1,8 s, sustentação 2,2 s e retorno 1,8 s com interpolação suave, restaurando exatamente os quaternions iniciais. Após pelo menos 35 s ativos, pode ocorrer em Warm Presence; entre gestos há espera de 55–100 s. O diretor usa o quadro já existente da face, sem timer ou rAF adicional; ocultação, pausa e reduced motion congelam o estado. A emissão prepare/hold/release alimenta a expressão. O laboratório permite testar o gesto e desligar sua ocorrência automática.

Um único diretor controla os ossos direitos durante o movimento. O antigo gesto labial, seus controles e edição direita aguardam o retorno; o teste recusa partida se o outro gesto estiver ativo ou a cadeia não estiver na referência capturada. O alvo é rechecado contra a mão esquerda atual antes de iniciar. A pose esquerda é preservada e não pode ser alterada durante o gesto direito.

## Evidência estrutural no modelo privado

O GLB com SHA-256 `938a86162d5b431638ff46f2d30c78ecea74c95587835e1a8883e2b7f6c740fe` passou na auditoria CPU: 156 amostras do torso elegíveis, erro de alvo do punho ≈ 3,60e−8 unidades do modelo, flexão ≈ 139,89°, rotação local do punho ≈ 48,72° e braço ≈ 27,97°. Com a candidata da mão esquerda aplicada, a distância entre as origens das mãos foi ≈ 0,1443 unidades; a margem do alvo à superfície amostrada é ≈ 0,0289. São verificações de geometria, **não uma prova de ausência de interpenetração** de malha, roupa ou cabelo.

Foram exercitadas amostras intermediárias e retorno integral em CPU, preservando todos os quaternions da cadeia esquerda, posições, escalas e rotações dos dedos. O alvo é recusado se a distância das mãos ficar abaixo do limite ou se a base do tronco/braço direito tiver mudado. Não há solver de colisões nem prova de contato real da palma com o peito: a pose permanece `VISUAL_QA_PENDING` e é reversível no laboratório.

## Testes e protocolo

PASS local: automação B.1, testes faciais A/B/B.1, apresentação, rig/IK, diretor, trajetória do novo gesto, sinalização e concorrência; auditoria privada de ambos os braços e restauração exata; build. UX permanece 97/100, com três falhas prévias. O fluxo do GitHub Actions inclui os novos testes sintéticos; o teste privado continua opcional e não recebe o arquivo no CI.

No Android, selecione o GLB local. Em **Abrir laboratório → Gesto suave · mão direita ao peito**, teste a candidata em frente, 3/4 e lateral; observe palma, dedos, roupa, cabelo, tronco e braço esquerdo. Teste o controle do gesto antigo durante a movimentação, restauração, redução de movimento, ocultação e troca de modelo. A automação pode ser desligada até a aprovação visual. Volte à apresentação e observe alguns ciclos; o gesto é deliberadamente raro.

Work sem WebGL funcional nas tentativas anteriores; não há evidência visual da personagem nesta entrega, nem medição Android de FPS/memória. Nenhum GLB, textura, render privado ou referência protegida foi incluído. Créditos preservados. PR draft, sem merge automático.
