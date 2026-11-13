# Reprodução R1.C

Executar da raiz do repositório com Python 3 + NumPy/Pillow, FFmpeg/ffprobe, fontes DejaVu Sans em `/usr/share/fonts/truetype/dejavu/`, Node compatível com package.json e Blender 4.3.2. Nenhum comando publica assets.

```sh
# Se o piloto privado anterior não estiver disponível, reproduzir exatamente:
python3 scripts/sophia-adornments/build_pilot.py --out local-private/adornments-r1c/r1b-baseline.glb --sockets local-private/adornments-r1c/r1b-sockets.json
python3 scripts/sophia-adornments/repair_r1c.py --out local-private/adornments-r1c/sophia-r1c-collar-study.glb
python3 scripts/sophia-adornments/verify_r1c.py
blender -b -t 4 --python scripts/sophia-adornments/audit_r1c.py -- local-private/adornments-r1c/r1b-baseline.glb local-private/adornments-r1c/sophia-r1c-collar-study.glb --out local-private/adornments-r1c/full-qa
python3 scripts/sophia-adornments/skinning_r1c.py
node --expose-gc scripts/sophia-adornments/verify-r1c-runtime.mjs local-private/adornments-r1c/r1b-baseline.glb local-private/adornments-r1c/sophia-r1c-collar-study.glb local-private/adornments-r1c/r1c-cpu-runtime.json
node scripts/sophia-adornments/r1c-staging-server.mjs
```

Abrir o endereço loopback anunciado no próprio computador. Carregar os dois modelos, selecionar Idle/Write/Point/Wave/Walk, usar pause/seek, vistas e 10 ciclos; registrar `renderer.info`, dispositivo, decoder e contexto. O servidor e o cliente recusam hashes divergentes. Não é rota Astro, endpoint Cloudflare ou implantação de produção. O harness herda o controle de um RAF/mixer e descarte de recursos da R1.B; o teste CPU não substitui sua execução WebGL.

```sh
blender -b -t 6 --python scripts/sophia-adornments/render_r1c.py
blender -b -t 6 --python scripts/sophia-adornments/render_r1c.py -- --references
blender -b -t 6 --python scripts/sophia-adornments/render_r1c_contacts.py -- --stills
blender -b -t 6 --python scripts/sophia-adornments/render_r1c_contacts.py
python3 scripts/sophia-adornments/package_r1c_media.py
npm run check:sophia-adornments
npm run check:sophia-adornments-r1c
npm run check:sophia
npm run check
npm run build
```

Não executar dois renders para o mesmo modo em paralelo. O .blend é um derivado importado do GLB final, com Idle 0 ativo, materiais empacotados e sem novo corpo; o Icosphere de custom-shape do importador é auxiliar de osso, não geometria autoral adicionada.

O piloto usado na execução foi recuperado dos bytes privados anteriores, hash fd278e20…; o teste também reconstrói o mesmo hash por #304. O derivado final tem SHA ce3386a0…; o BIN original permanece como prefixo, com novos acessores anexados. Não afirmar que o BIN completo continua igual.

Todo PNG, GIF, MP4, GLB e BLEND gerado fica em `local-private/`, fora do Git e CI público. O manifest público lista nomes, tamanhos e hashes, sem URLs privadas. Logs detalhados e vídeos permanecem no pacote privado. O Chrome local abortou com `socket() failed: Operation not permitted` antes de criar WebGL; não há captura Three.js nem gate mobile aprovado neste ambiente.

As 255 comparações CPU verificam matrizes de Book, Pen, head, hand_L e hand_R. A preservação dos demais canais/joints é demonstrada separadamente por igualdade estrutural e de bytes. Contagens de dispose são chamadas explícitas, e sceneDetached mede somente ausência de parent; nenhum desses campos prova coleta de heap ou VRAM.
