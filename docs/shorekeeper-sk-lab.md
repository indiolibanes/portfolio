# Shorekeeper · /experimentos/sk/ — laboratory v0.1

**Base:** PR #184 (F1.6), head `5af24dae5738fb260dfe78c57f85051532a8d9df` · **Estado:** TEST-LAB-READY / VISUAL_QA_PENDING.

## Escopo

Rota Astro independente em `/experimentos/sk/`, com painel responsivo, acessível por abas. Nenhum asset da Shorekeeper é versionado ou publicado. O arquivo é selecionado por `<input type=file>`, lido com `File.arrayBuffer()` e entregue diretamente ao `GLTFLoader.parseAsync()`; não há `fetch`, telemetria ou upload no script do laboratório. A rota em si pode ser publicada, mas seu conteúdo não inclui o GLB.

### Menus

- **Rig:** skeleton overlay, eixos, wireframe, culling, lista de bones, coordenadas locais, rotações locais X/Y/Z de ±45° e restauração do repouso.
- **Visuais:** câmeras frente, 3/4, perfil, costas, rosto; material original/neutro/MASK Bangs-Alpha (experimental); fundo; intensidade de luz; DPR e órbita.
- **Expressões:** fechamento bilateral `E_Close`, olhar X/Y conservador, seletor de todos os morphs realmente existentes, peso individual e presets de inspeção.
- **Atuação:** compositor F1.6 importado de `tests/shorekeeper-f16/director.mjs`, gesto, pausa, interrupção, repetição e parâmetros de entrada/transferência/retorno.
- **Diagnósticos:** contagens de malhas, triângulos, bones, instâncias de morph, clipes, draw calls e FPS observado. Copiar JSON com fallback para download local, sem os bytes do GLB.

## Execução

Depois de instalar dependências no checkout desta branch, use `npm run dev` e abra `http://127.0.0.1:4321/experimentos/sk/`, ou a URL de preview da branch. Selecione a **cópia privada com morph bounds corrigidos** (F1.6 SHA-256 declarado: `39a45609b86699a49200cc1931227e3e4ae6ec15af8ed4ddc87d3dd982e7af61`). O GLB original F1 também é aceito, mas continua sujeito aos avisos/culling; não o trate como equivalente.

A cena usa WebGL2; sem ele, o status explicita a indisponibilidade. O visor não reproduz o shader original da Kuro. Uma rota pública sem asset **não** concede autorização para distribuir arquivos do jogo. Não adicione GLBs em `public/`.

## Testes

`node tests/shorekeeper-f16/synthetic-test.mjs` e `node tests/shorekeeper-sk-lab.test.mjs`; os dois ficam no workflow sintético da F1.6. Build Astro normal continua obrigatório.

Testes automatizados são **contratuais e sintéticos**, não substituem QA de deformação e desenho. A inspeção precisa cobrir: frente/perfil, piscada nos pesos 0/.25/.5/.75/1, gaze, ombros, dedos, acessórios, retorno ao repouso, pausa, repetição e alterações de material. Acompanhe relatórios por dispositivo sem declarar VRAM não medida.

## Itens pendentes

1. Verificar visualmente o GLB real em WebGL2 desktop e Android.
2. Testar o culling de SkinnedMesh animado e a mudança de bounds no renderer.
3. Validar material de olhos, cílios, cabelo e transparência sem alterar o rosto.
4. Calibrar expressões e dinâmica autônoma serenamente; ainda não existem piscadas L/R.
5. Medir memória e desempenho no aparelho de referência.
6. Realizar revisão de direitos antes de redistribuir qualquer asset.

**Não mesclar automaticamente.** A Hsin, a Phrolova, os shaders e os modelos GLB não foram modificados.
