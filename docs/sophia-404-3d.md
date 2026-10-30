# Sophia 404 — estudo 2.5D com personagem rigada

**Estado:** protótipo em branch experimental; não mesclar sem inspeção visual em Android e desktop.

## Fonte da personagem

- O repositório já contém o arquivo `public/experimental/sophia-alpha.glb` (aprox. 20,8 MB), utilizado por `public/experimental/sophia-scene.js`. O código do protótipo o descreve como **alpha 6H**, com esqueleto e morph targets.
- **Não é o arquivo definitivo da Sophia 7B-R0-E1.** O pacote de transferência do Work não está disponível nesta branch; não atribuir a ele essa proveniência.
- Quando houver um GLB 7B otimizado, visualmente revisado e rigado, trocar a constante `MODEL_URL` em `src/scripts/sophia-404-renderer.js` e revisar o mapeamento de ossos/morphs.
- O alpha é reaproveitado diretamente, sem duplicar seus ~20 MB no Git.

## Como funciona

A página 404 continua sendo Astro + Tetris Canvas 2D. O script `sophia-404-stage.js` ativa dinamicamente o renderer apenas quando o retrato ou a sala gamer se aproxima da viewport, e suspende os frames fora da tela. O modelo é carregado uma vez e as instâncias utilizam clones independentes do esqueleto.

**Retrato do Tetris:** preserva o SVG original como fallback; no modo 3D a personagem aparece em close e responde a estados `idle`, `playing`, `paused`, `cheer`, `over`.

**Sala gamer:** preserva a arte vetorial do cômodo; o fox SVG só se oculta após o primeiro frame 3D. A personagem e o controle são renderizados sobre o cenário, criando um palco 2.5D com luz fria e quente.

**Fallback:** o SVG nunca é removido do DOM. Continua visível se a GLB não carregar, não houver WebGL, o navegador estiver em economia de dados, `prefers-reduced-motion`, Legacy ou Editorial. Os canvases 3D são decorativos para leitores de tela.

## Limitações, decisões e gate de aceite

- A versão atual usa **Three.js** e deformação do esqueleto/morphs; **não inicializa Rapier**. A física de corpos rígidos ficaria restrita a acessórios em uma iteração futura, após a inspeção de enquadramento e orçamento mobile. Evita WASM ou alterações na CSP do site nesta etapa.
- Nenhuma animação de sentar, IK de mãos ou sincronização da posição real das peças foi validada no modelo; os gestos são expressões procedurais moderadas e não devem ser divulgados como rig facial/corporal final.
- O fallback existente contém mais detalhes que o palco 3D em alguns dispositivos. Não remover os SVGs antes do aceite.
- O Tetris continua com as regras originais; o único acoplamento é um evento DOM personalizado de estado.
- O modelo é volumoso: conferir consumo de dados e memória, emissões visuais com o modelo realmente carregado e desempenho Android. Se ficar lento, preferir um LOD derivado do 7B em vez de sacrificar o Tetris.

### QA obrigatória antes do merge

1. Executar `npm ci`, `npm run build`, `npm run check:tetris` e `npm run check:ux`.
2. Abrir /404 em 390px, 768px e 1440px, conferir rosto, orelhas, braços, proporção e se a Sophia não cobre o tabuleiro nem a TV.
3. Jogar Tetris (iniciar, pausar, completar linha, quatro linhas, perder, reiniciar), teclado, controle e toque.
4. Verificar versões sem WebGL, economia de dados, reduzir movimento, modo Editorial/Legacy e navegação offscreen/volta.
5. Observar GPU, rede (GLB é carregado apenas uma vez) e eventos de perda do contexto WebGL.
6. Conferir o resultado em um telefone Android real; visual pass não foi obtido na sessão que criou a branch.
