# Evidências R1.B (geradas de forma reproduzível)

| Arquivo | O que é |
|---|---|
| `alpha-6h-census.json` | Censo somente leitura de `sophia-alpha.glb`: hashes, nós, juntas, primitivas, UV, materiais, imagens, morphs, clipes |
| `alpha-6h-audit.json` | Integridade do bind, fixação de Book/Pen, contato triângulo×triângulo, estrela/oclusão, auditoria do jaleco |
| `e1-census.json` | Censo do `sophia-7b-e1-latest.glb` (malha única Tripo, sem pele) |
| `sockets.json` | Pontos de fixação derivados dos nós reais; **não existem nós `Socket_*` no GLB** |

Reproduzir (Node ≥ 22, sem dependências):

```bash
node scripts/sophia/glb-census.mjs public/experimental/sophia-alpha.glb --out docs/sophia/adornments-r1/evidence/alpha-6h-census.json
node scripts/sophia/adornments-audit.mjs public/experimental/sophia-alpha.glb --out docs/sophia/adornments-r1/evidence/alpha-6h-audit.json   # ~4 min
node scripts/sophia/adornments-audit.mjs public/experimental/sophia-alpha.glb --skip-contact --out /tmp/audit-fast.json                        # segundos
```

Capturas (local; Playwright + Chromium; usa o renderer próprio do site; não é rota nem vai a deploy):

```bash
node scripts/sophia/qa/adornments-capture.mjs --out /tmp/sophia-adornments-qa
```

Limites: estrutural, em poses amostradas; SwiftShader (CPU) não é GPU real; não substitui inspeção visual do proprietário. O mesmo script aceita o GLB do piloto do Work quando ele existir.
