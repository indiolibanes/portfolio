# QA — Sophia 6H (candidata parcial, NÃO aprovada)

- `Relatorio_6H.md` — relatório completo (aprovado nos testes / ainda falhou / não testado).
- `Verdict.json` — resumo máquina-legível.
- `evidencias/` — resumos da auditoria de colisões (6G e 6H, mesmo método), checagens estruturais, Khronos Validator,
  diferença de pixels dos morphs no renderer real e medidas da IK do Write.
- `tools/runtime/` — harness Playwright que usa o `gltf-gl.js` real:
  `node morph-viewer.cjs MODELO.glb SAIDA/` e `python3 morph_pixel_check.py SAIDA/`.

O GLB candidato, as pranchas e o pacote de auditoria completo (scripts, logs, renders) foram entregues fora do repositório.
Nenhum GLB em `public/` foi alterado; nada foi enviado ao remoto.
