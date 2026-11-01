# Hsin — B.1 automático e expressões icônicas

Entrega A, empilhada no PR #156 (`experiment/hsin-facial-legibility-pass-b1-2026-10-31`, commit `d1c29c8ccf4d3824d67d7073fbbe20142a3653a0`). Esse PR deriva da apresentação autônoma #155. Ambos estavam abertos em draft, sem merge. O usuário relatou visualização dos sorrisos S1/S2/S3 no Samsung Internet; as novas composições I1–I5 e a automação ainda não receberam aprovação artística.

A apresentação seleciona `auto-b1` por padrão. No laboratório, é possível desativar a automação, escolher perfis anteriores, testar S1–S3/I1–I5 e os dois olhos, comparar e restaurar a expressão. O visitante não recebe controles de animação. O mesmo adaptador compõe sorriso, sobrancelhas, pálpebras e pupilas sobre os pesos capturados. O nariz não recebe overlay automático. A piscada bilateral continua com 5–10 s de espera, e piscadelas automáticas alternam os lados, respeitando o árbitro de pálpebras.

O diretor usa seed, transições suavizadas e estados Idle Allure, Curious Attention, Coy Response e Warm Presence. O cursor/toque influencia a escolha contextual e o olhar calibrado; o estado seguinte não repete o mesmo preset imediatamente. S1 é comum em repouso; S2 favorece atenção; S3 e I2/I5 aparecem em diversão; I3 em calor. Duração e intensidade variam. As composições seguem [0,1] e somente morphs verificados no arquivo são usados. S1/S2/S3 automáticos deliberadamente ultrapassam os tetos conservadores antigos, utilizando os perfis B.1 reportados visíveis pelo autor; não há alegação de que toda combinação ampliada esteja aprovada visualmente.

| Nome | Intenção e composição candidata |
|---|---|
| I1 Fox Sentinel Calm | Sorriso pequeno bilateral, leve assimetria de sobrancelhas e olhos |
| I2 Coy Amusement | Boca enviesada, M_Squint/M_meow e sobrancelha direita |
| I3 Sacred Warmth | Sorriso mais bilateral e sobrancelhas/olhos suavemente levantados |
| I4 Knowing Gaze | Sorriso discreto, sobrancelha esquerda acentuada e olhos semicerrados |
| I5 Flirtatious Dominance | Sorriso mais forte e assimétrico, sobrancelha direita e squint |

São criações novas, **não clipes extraídos do jogo**. A leitura estrutural do GLB v1.0.5 encontrou 169 nomes de morphs e zero animações. Há também controles B_Happy/B_Sad/E_Sad no arquivo; nomes não comprovam resultado visual e não foram promovidos automaticamente. O modelo não é modificado ou publicado.

Duas atmosferas procedurais sem imagens de terceiros ficam no laboratório: dourado/âmbar por padrão e escarlate. O gradiente é uma textura de fundo da cena, sem mudanças nos materiais da personagem; portanto aparece também nas capturas locais. Trocas descartam a textura anterior; a última é descartada ao sair.

## Verificação

Build Astro, testes faciais A/B/B.1, apresentação, IK, diretor e automação S/I passaram; a auditoria CPU do GLB privado confirmou checksum `938a86162d5b431638ff46f2d30c78ecea74c95587835e1a8883e2b7f6c740fe` e restauração. O teste de UX continua em 97/100, com as três falhas de navegação pré-existentes. Testes CPU não comprovam aparência ou FPS. Work continua com WebGL indisponível nas tentativas anteriores; verificar no navegador de destino.

## Teste visual no Android

Carregar o GLB local, observar ciclos por 1–2 minutos, tocar e orbitar. No laboratório, testar S1–S3 e I1–I5 frontalmente e em 3/4, na mesma câmera/luz; avaliar boca, sobrancelhas e pálpebras, incluindo piscadelas e restauração. Comparar dourado e escarlate, conferir contorno, cabelo e roupa. Testar redução de movimento, ocultar/retomar e trocar de modelo. Sem comparação real, I1–I5 permanecem candidatas.

Nenhum GLB, textura, render ou imagem protegida foi incluído no repositório. Créditos da página preservados. Sem merge automático.
