# R5 — reprodução privada

Node da `.node-version`; npm ci/check/build. Modelo canônico SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`. JSON privado com caminhos de Attack01–04, Skill01 e Burst01/02. OUT fora do checkout. Não baixar assets privados no CI.

```sh
node scripts/shorekeeper/qa-r5-private.mjs "$MODEL" "$OUT/cpu.json" "$ATTACK01" "$ATTACK02" "$ATTACK03" "$ATTACK04" "$SKILL01" "$BURST01" "$BURST02"
node scripts/shorekeeper/capture-r5.mjs --model="$MODEL" --librariesJson="$LIBRARIES_JSON" --out="$OUT/face" --suites=face --fps=30
node scripts/shorekeeper/capture-r5.mjs --model="$MODEL" --librariesJson="$LIBRARIES_JSON" --out="$OUT/vfx" --suites=vfx --fps=30
node scripts/shorekeeper/capture-r5.mjs --model="$MODEL" --librariesJson="$LIBRARIES_JSON" --out="$OUT/cl" --suites=cl --fps=30
node scripts/shorekeeper/capture-r5.mjs --model="$MODEL" --out="$OUT/r4-control" --suites=face-motion --geometry=r4 --fps=30
node scripts/shorekeeper/capture-r5.mjs --model="$MODEL" --out="$OUT/idle-face" --suites=idle-face --fps=30
node scripts/shorekeeper/qa-r5-ui.mjs --model="$MODEL" --librariesJson="$LIBRARIES_JSON" --out="$OUT/ui"
node scripts/shorekeeper/qa-r5-lifecycle.mjs --app="$OUT/ui/app.html" --model="$MODEL" --librariesJson="$LIBRARIES_JSON" --out="$OUT/lifecycle"
```

Playwright externo: `SHOREKEEPER_QA_PLAYWRIGHT`; Chromium: `SHOREKEEPER_QA_BROWSER`. `SHOREKEEPER_QA_RENDERER=swiftshader` declara raster de software. `SHOREKEEPER_QA_SINGLE_PROCESS=1` é opção de container que pode limitar bfcache. Não desabilitar web security/auth/SHA/R2. ffmpeg/ffprobe necessários: encoder atômico confere frames antes de apagar temporários.

Fontes/bundle/modelo/bibliotecas têm SHA-256; PNGs registram câmera/renderer e vídeos os clocks de amostragem. Nada de imagem gerada ou substituto 2D. UI usa HTML/CSS construídos, mount e input reais. O global QA pertence só à entrada de testes. Capturas operacionais usam botões normais e recolhimento de painel, sem câmera/CSS exclusivos do harness. Lifecycle serve somente HTML local e página de navegação; endpoints desconhecidos retornam 404, preservando comportamento fail-closed.

No ZIP final, campanhas `face`, `vfx`, `cl`, `r4-control`, `idle-face`, `ui`, `lifecycle` são a autoridade regenerada após a manutenção. O ensaio inicial de face-motion sem flag R4 foi excluído, não apresentado como baseline. Vídeos de comparação derivam dessas campanhas, com originais preservados. Galeria offline, manifests, SHA256SUMS e logs acompanham a entrega. 30 FPS amostrados não medem GPU/FPS observado. Approval humano fica vazio.
