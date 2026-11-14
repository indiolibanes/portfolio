# Reprodução R1.5

Executar na raiz da branch draft, com Node >=22.12 (usado 24), npm, Python 3.12 com NumPy/SciPy/Pillow, Blender 4.3.2 CPU e FFmpeg. Dependências npm instaladas por `npm ci`. Python precisa estar acessível também ao Blender; não há download automático de fontes privadas.

Colocar os anexos originais em `local-private/sophia-r15/sources/`, com nomes e hashes da tabela de inventário. O GLB integrado público é lido, nunca sobrescrito. Scripts locais rejeitam fonte de hash divergente. Todos os derivados permanecem sob `local-private/`, ignorado pelo Git.

```sh
npm ci
node --test tests/*.test.mjs
npm run check:sophia
npm run check
npm run build
QA_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/qa-sophia-404.mjs
QA_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/qa-sophia-404-2d.mjs
python3 scripts/sophia/r15/audit_inputs.py
python3 scripts/sophia/r15/repair_coat.py --help
python3 scripts/sophia/r15/repair_coat.py
python3 scripts/sophia/r15/pack_glb.py
node scripts/sophia/r15/poses.mjs
blender -b -t 6 --python scripts/sophia/r15/validate.py
python3 scripts/sophia/r15/verify_rig.py
node scripts/sophia/r15/verify-packed.mjs
SOPHIA_R15_MODEL=local-private/sophia-r15/sophia-lab-r15.glb node --test tests/sophia-r15-runtime.test.mjs
```

`pack_glb.py` salva o intermediário `sophia-lab-r15-unpacked.glb` e depois substitui somente o candidato privado pelo layout sem perda. O relatório do reparador contém o hash do intermediário; `lossless-packing.json` relaciona-o ao hash final. Não executar o empacotador duas vezes sobre o mesmo intermediário sem refazer o reparador, pois relatórios de reachability mudariam.

```sh
blender -b -t 6 --python scripts/sophia/r15/render.py -- public/assets/models/sophia/sophia-lab.glb before
blender -b -t 6 --python scripts/sophia/r15/render.py -- local-private/sophia-r15/sophia-lab-r15-unpacked.glb after
blender -b -t 6 --python scripts/sophia/r15/render.py -- public/assets/models/sophia/sophia-lab.glb before --reference-only
blender -b -t 6 --python scripts/sophia/r15/render.py -- local-private/sophia-r15/sophia-lab-r15-unpacked.glb after --reference-only
blender -b -t 6 --python scripts/sophia/r15/render.py -- public/assets/models/sophia/sophia-lab.glb before --loops
blender -b -t 6 --python scripts/sophia/r15/render.py -- local-private/sophia-r15/sophia-lab-r15-unpacked.glb after --loops
python3 scripts/sophia/r15/media.py
```

O benchmark exige um checkout vizinho `../sophia-r15-baseline` do commit base, com node_modules acessível: `node --expose-gc scripts/sophia/r15/benchmark.mjs`. Não compara builds de branches diferentes sem registrar o commit base. O renderizador não usa denoise indisponível neste build CPU.

Os testes Node gerais geram alguns relatórios QA de Hsin. Esses efeitos de teste foram restaurados antes do commit; nenhuma mudança de Hsin faz parte da entrega. Comparar `git diff --name-only ff1453ed47b4a6bf47177699ae12556f08847b97` e hashes do GLB público antes de publicar o draft. Não commitar GLB/BLEND/renders/vídeos, fontes privadas, credenciais nem logs de transferência.

`test-results.json` separa os comandos repetidos dos bloqueados. Os fixtures Node exercitam matemática e chamadas da API, não uma GPU/navegador real. Os relatórios CSV contêm as amostras efetivas dos clipes, não poses sintéticas.
