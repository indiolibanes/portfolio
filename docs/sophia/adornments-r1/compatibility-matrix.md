# Matriz de compatibilidade — adornos da Sophia 6H (alpha)

Fonte única verificada: `public/experimental/sophia-alpha.glb` (SHA-256 `3b0e7db8…3a2a`, 101 juntas, 5 clipes, 4 morphs). Dados: `evidence/alpha-6h-census.json` e `evidence/alpha-6h-audit.json`. Estrutural apenas.

| Adorno | Onde está no GLB | Fixação / rig | Evidência de contato | Decisão | Confiança |
|---|---|---|---|---|---|
| **Caderno (Book)** | Nó 94, malha própria: 5 prims, 224 tris, UV em 4 das 5, materiais `cover`, `navybook`, `pages`, `gold` ×2 | Filho de `hand_L`; TRS animado (97 chaves no Write). Sem pele | Write: mãos×caderno 0, pena×caderno 0; fora do Write cruza mãos (até 96) e vestuário | **Recuperável sem remodelar.** Copiar materiais (`Sophia_gold` é do corpo) e manter TRS animado | Alta (estrutural) |
| **Pena (Pen)** | Nó 95: 2 prims, 2.936 tris (`pen`, `gem`) | Filho de `hand_R`, escala 0,75; TRS animado | Ponta 0,66–0,72 mm da página; mão×pena 134 pares no Write | **Recuperável**; empunhadura depende de mãos novas (fora desta fase) | Alta |
| **Estrelas 3D elevadas** | Prims 9, 10, 11 (ouro, 288 tris cada, sem UV, 4 morphs) | Corpo da malha, pele em `head` | Sem cruzamentos relatados | **Não reutilizar como C1** | — |
| **Marca C1 (plana, sob a franja)** | **Não existe** | Exigiria decalque aditivo + franja | Crânio sem UV; 165 vértices/35 mm (6,5 mm); sem franja à frente | **`STAR_IDENTITY_PENDING`** | Baixa |
| **Jaleco** | Prims 4 (casca, 8.224 v), 5 (forro), 127/130 (lapelas), 86 prims de ouro, 5 de tecido azul | Pele nas juntas existentes | Vestuário×caderno 78 (Write); braço×manga ~42 e pescoço×gola 20 (relatório 6H) | **Recuperar e reparar pesos** (ombro/punho); não remodelar | Média |
| **Brincos / fitas das orelhas** | 69 prims (8.296 tris) com junta dominante `earlink_*`/`earrib_*`/`charm`; ouro e gemas | Cadeias de juntas `earrib`, `earlink`, `charm`, `earrib2` | Crânio×aros 1/36 pose (6 pares); juba×fitas 2/36 (24 pares), relatório 6H | **Extrair por índice de primitiva**; reparar a pose Walk t=0,83 | Média |
| **Laço e broche do peito** | `Sophia_ribbon` (20 prims), `ribbon_phase5b_chest` (5), gema 139 no `chest` | Cadeias `bow_*`, `sash*`; pesos em `chest/spine/hips` | Não medido aqui | **Inspecionar e extrair** em fase própria | Média-baixa |
| **Cauda e constelação** | 32 prims de cauda (80.212 tris), constelação na prim 276 | Cadeia `tail` (7) | Cauda×corpo 151 e ×vestuário 738 (herdados, relatório 6H) | **Reparar contato antes de reutilizar** | Baixa |
| **Headphones** | **Não existe** (nenhum nó, junta ou material) | — | — | Só se necessário, após piloto | Baixa |
| **Astronauta R3** | Fora do GLB: `/api/sophia/rocket` (R2) | — | — | **Intocado**, somente referência | — |

## Jaleco: o que dá para recuperar e o que pede reparo

| Componente | Estado medido | Ação |
|---|---|---|
| Malha e UV | Casca única, UV 100% no quadrado unitário, 0 degenerados, ilhas espelhadas (relação UV/área 2,5), `doubleSided=false` | **Recuperável** |
| Materiais | `coat` e `lining` com textura 2048²; lapelas e ouro sem UV (cor sólida) | Recuperável |
| Gola | 390 vértices (faixa de 25 mm), `chest` 63% / `neck` 32%, 0 rígidos | Recuperável; só o queixo×gola do Write (20 pares) |
| Barra | 350 vértices, `thigh` 65% / `hips` 34%, 0 rígidos | Recuperável; checar Walk |
| Ombros | 696 vértices de manga: **50% presos a uma só junta, sem peso na clavícula** | **Reparar** (espalhar para clavícula/peito) |
| Cotovelos | Transição ~55 mm centrada no cotovelo, 21% rígidos | Recuperável; validar dobra no Write (85°) |
| Punhos | Manga termina 20 mm antes do pulso; 97 vértices rígidos | **Reparar**: cilindro aberto afastado da luva |

Nada disso foi alterado. Todas as ações são propostas, sem prova visual de que resolvem.
