# Shorekeeper B.7 — estudo privado de sorriso

Base: cadeia #209 integrada em #208, head `e9d29593c1cbb2f9d7d9e83642125bf047177dee`. Estado: **PARTIAL / VISUAL_QA_PENDING**. O usuário aprovou os três idles e a piscada bilateral; os módulos que os executam não foram alterados. GLB privado F2.0-A conferido por SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`.

| Candidata | Morph / binding | Deformação CPU | Resultado visual | Classificação |
|---|---|---|---|---|
| CANONICAL_SOFT_SMILE | Presentes e ligados | Não nula | Não observado em WebGL | GEOMETRY_ONLY |
| TENDER_GAZE | Presentes e ligados | Não nula | Não observado em WebGL | GEOMETRY_ONLY |
| SOFT_SURPRISE | Presentes e ligados | Não nula | Não observado em WebGL | GEOMETRY_ONLY |

Três propostas **não aprovadas**, limitadas a pesos 0–1; não são introduzidas no runtime de apresentação:

- CANONICAL_SOFT_SMILE: M_Smile_L/R 1, P_M_L/R_Add 0,55, E_Smile_L/R 0,15. A auditoria B.4 detectou franjas de cílios no rasterizador CPU já em 0,15: **E_SMILE_VISUAL_SIDE_EFFECT é suspeita baseada em CPU**, não foi confirmado com o material Three.js. A leitura do sorriso anterior foi recusada pelo usuário.
- TENDER_GAZE: Pupil_L 0,16, E_Focus 0,08, M_Smile_L/R 0,45. Não movimenta cabeça ou pescoço.
- SOFT_SURPRISE: E_Stare 0,18 e M_OpenSmall 0,25.

O teste privado mede os morphs isolados, os prefixos progressivos e a composição em 0, 25, 50, 75 e 100%: 39 configurações. Com o GLTFLoader e pesos máximos, os maiores deltas locais por vértice foram aproximadamente 5,18 mm, 2,10 mm e 0,70 mm, respectivamente. Esses máximos incluem regiões diferentes da malha e **não medem legibilidade, percepção da boca, movimento da íris ou semelhança artística**. A decodificação das imagens foi simulada e não há aprovação de GPU, shaders, olhos ou cílios.

## Bancada privada reproduzível

A bancada foi implementada, mas o servidor local recusou conexão nesta sessão; seu fluxo no navegador não foi verificado. Em ambiente de desenvolvimento com Node e dependências instaladas, no diretório do projeto:

```
npx vite --host 127.0.0.1 --port 4174
```

Abrir `http://127.0.0.1:4174/tests/shorekeeper-b7/qa.html` no mesmo computador; selecionar o GLB pela File API. A bancada usa os mesmos módulos de loader, inspeção e stage, sem publicar nem enviar o modelo. Para cada proposta, registrar **0, 25, 50, 75 e 100%**, morfos isolados e passos progressivos nas câmeras frontal, ¾ e rosto, mantendo a mesma iluminação. PNG é salvo localmente pelo botão; não é adicionado ao repositório. Para avaliar enquadramento móvel usar também dispositivo real com servidor local confiável e acesso ao arquivo, sem expor o GLB em rede pública.

**As capturas solicitadas não foram geradas**: a sessão não dispõe de WebGL2 funcional. O teste de pixel/olhos/cílios e a legibilidade na câmera habitual do telefone continuam pendentes. Sem essa prova, nenhuma das três candidatas foi promovida; `SOFT_SMILE_GEOMETRY_ONLY` aplica-se ao sorriso. A existência de deformação não resolve a falha visual relatada.

Os vídeos de referência indicados anteriormente foram tentados nesta sessão, mas não puderam ser obtidos (`DisabledError`); não há análise de frames nem alegação de fidelidade. Não é possível afirmar que todas as combinações úteis foram esgotadas. **FACIAL_ASSET_LIMITATION_FOR_CANONICAL_SMILE: NÃO DETERMINADA** até a avaliação em WebGL; caso as comparações reais confirmem falha, propor em etapa separada um corrective blendshape privado `SmileSoft`, eventualmente `EyeSmileSoft`, sujeito à autorização do usuário. Nenhum corrective foi criado nesta fase.

Teste numérico privado: `node tests/shorekeeper-b7/geometry-private.mjs /caminho/privado/modelo.glb`. Testes sintéticos de 0–1/etapas e regressões de blink/idles/loader executáveis sem asset; imagens não são decodificadas nem renderizadas pelo teste Node. Sem medição de FPS/Android. Não subir o GLB, capturas ou GIFs ao GitHub. Sem merge automático.
