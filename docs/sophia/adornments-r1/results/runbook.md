# Reprodução local

Dependências: Node conforme package.json; npm ci; Python 3 com numpy e Pillow; Blender 4.3.2 para BVH/renders. Não é necessário Tripo ou credencial de armazenamento.

1. `python scripts/sophia-adornments/inventory.py`
2. `python scripts/sophia-adornments/build_pilot.py`
3. `node --expose-gc scripts/sophia-adornments/verify-pilot.mjs`
4. `blender -b -t 4 --python scripts/sophia-adornments/collisions.py -- public/experimental/sophia-alpha.glb docs/sophia/adornments-r1/results`
5. `blender -b -t 4 --python scripts/sophia-adornments/render_review.py`
6. `blender -b -t 4 --python scripts/sophia-adornments/render_contact_details.py`
7. `blender -b -t 4 --python scripts/sophia-adornments/render_collision_details.py`
8. `python scripts/sophia-adornments/finalize_report.py`
9. `python scripts/sophia-adornments/preservation.py`
10. `npm run check:sophia-adornments`, `npm run check:sophia`, `npm run check`, `npm run build`.

Staging opcional: `node scripts/sophia-adornments/staging-server.mjs`, abrir o URL loopback mostrado. Execute na mesma máquina/browser. Não publicar esse servidor ou copiar o GLB privado para public/. O ambiente Work pode encerrar processos de preview ao fim da chamada; um servidor HTTP de teste não equivale a sessão visual WebGL.

Os checks auxiliares podem gerar relatórios com tempos/heap específicos da máquina; não use essas variações como alteração de geometria. O build do piloto exige o hash 6H exato e recusa entrada diferente. Para aceitar outra fonte, uma nova auditoria explícita é necessária; não altere a constante apenas para fazer o build passar.

O relatório privado inclui os renders reais. Para reproduzir o mesmo conjunto, limpe apenas a pasta local-private/adornments-r1/review gerada por esse fluxo e execute todos os passos. Arquivos de tentativas anteriores não referenciados por capture-index.json não fazem parte da entrega.
