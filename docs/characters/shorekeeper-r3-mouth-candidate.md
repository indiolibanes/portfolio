# B R3 — candidato geométrico reversível

Base técnica: PR #228 @ bf0353f13c4c94d20b60cc6bb11ba3e5b0166b48. Este draft adiciona o módulo de geometria e receitas de QA; o vínculo com a interface está no draft de integração.

`createMouthR3(model)` clona a Face através do owner R2, reduz a espessura do contorno e substitui o campo de deslocamento por estações C1, com lift limitado. Todos os parceiros do contorno seguem o campo. Não há extensão do liner, material novo, alteração do arquivo GLB ou escrita no blink. `restore()`/`dispose()` restituem a geometria original.

LITTLE_SMILE_V2 e MY_STAR_V2 continuam controles de base. As candidatas R3 incluem MY_STAR sem E_Smile/com E_Smile=.1 e HELLO fechada/entreaberta. A integração expõe geometria R3 só por `?mouthQA=1&mouthR3=1`; nenhum preset é promovido.

Verificação: interpolação C1 em Node; no GLB privado, buffers canônicos idênticos antes/depois e três idles amostrados em CPU. O navegador disponível não oferece WebGL2. Não há render/vídeo R3, validação de oclusão/perfil ou aprovação visual humana. **B_VISUAL_QA_PENDING**. O refinamento precisa ser confrontado com R2 na mesma câmera e pesos 0/.25/.5/.75/1, em escala facial e móvel.
