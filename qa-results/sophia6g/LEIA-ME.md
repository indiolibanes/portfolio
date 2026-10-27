# Sophia 6G: candidata parcial (rosto, pelagem, colisões das orelhas, Blink no runtime, plumagem da cauda)

Candidata parcial, **não aprovada**. Base: `Sophia_6F_visual_candidate.glb` (SHA-256 `ad7f751e…b177a`). Saída: `Sophia_6G_visual_candidate.glb`, SHA-256 `228a2525dfd281b3e8e35f7a1e2d5b0c3156b4dfebc7c38cd50c23955d4d3290`, 20.777.996 bytes (entregue fora do repositório, como nas fases anteriores).

- Khronos Validator: 0 erros, 0 avisos, 12 infos.
- Rig, inverse bind matrices, os 5 clipes, os 4 morphs e as imagens são idênticos à 6F.
- Mechas × orelhas, acessórios, colarinho, jaleco e mãos: 0 cruzamentos nas poses amostradas (na 6F, até 918 pares).
- Runtime: `public/experimental/gltf-skel.js` gravava o canal `weights` como escala do nó da malha (colapso). Corrigido; teste em `scripts/test-sophia-morph-runtime.mjs`.
- Three.js: expressões aplicadas antes de `mixer.update()` eram apagadas nas piscadas. Usar `public/experimental/sophia-expressions.js` depois do update.
- Pendentes: jaleco e mangas, mãos/pena/caderno (Write), Wave (manga atravessa a cabeça, herdado) e resíduos ocultos no pescoço.

Detalhes, métricas e reprodução: `Relatorio_6G.md`. Scripts: `tools/`.
