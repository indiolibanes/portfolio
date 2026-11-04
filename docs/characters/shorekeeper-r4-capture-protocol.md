# R4 — reprodução privada e inspeção externa

## Perfis e rollback

Base padrão continua R3; R4 é opt-in. Rota `/experimentos/sk/`:

| Query | Comportamento |
| --- | --- |
| `mouthQA=1` | Bancada e geometria canônica; comparação explícita, sem promoção |
| `mouthQA=1&mouthR2=1` | Solda R2 |
| `mouthQA=1&mouthR3=1` | Candidata R3; alias anterior `mouthR2=r3` preservado |
| `mouthQA=1&mouthR4=1` | Candidata R4; seletor canônica/R2/R3/R4 na bancada |
| `vfx=r2` | Compara R2; sem flag usa R3 |
| `vfx=r4` | R4 e enquadramento celestial normal ao carregar sem mouthQA |
| `vfxQA=1` | Diagnóstico, componentes, exemplar, fases e contexto |
| `comboQA=1&landingR4=1` | Combo manual com landing candidato marcado; câmera segue opcional |

Remover as flags retorna à referência. Nenhum novo preset automático. Não usar câmera de rosto para aprovar canopy; botão **vista celestial** deve mostrar domínio e personagem ao mesmo tempo. Na bancada, restabelecer material original/visibilidade antes de avaliar o rosto completo.

## Captura offline reproduzível

Instalar dependências do projeto com Node 24 (`npm ci`), executar `npm run build`. Em uma pasta privada **fora** do checkout, instalar Playwright, seu Chromium e ffmpeg. O executável alternativo usado neste trabalho é Chromium 153 distribuído por @sparticuz/chromium; não é dependência do site. Não colocar modelo, binários de navegador, bibliotecas ou resultados em public/dist/Git.

```bash
export SHOREKEEPER_QA_PLAYWRIGHT=/pasta-privada/node_modules/playwright
export SHOREKEEPER_QA_BROWSER=/caminho/absoluto/chromium
export SHOREKEEPER_QA_RENDERER=swiftshader
node scripts/shorekeeper/capture-r4.mjs \
  --model=/pasta-privada/Shorekeeper_F2.0-A_CANONICO_2026-11-03.glb \
  --out=/pasta-privada/evidencias-face \
  --suites=face --fps=12
node scripts/shorekeeper/capture-r4.mjs \
  --model=/pasta-privada/Shorekeeper_F2.0-A_CANONICO_2026-11-03.glb \
  --out=/pasta-privada/evidencias-vfx \
  --suites=vfx,story --fps=12
node scripts/shorekeeper/capture-r4.mjs \
  --model=/pasta-privada/Shorekeeper_F2.0-A_CANONICO_2026-11-03.glb \
  --out=/pasta-privada/evidencias-cl \
  --suites=cl --fps=12 --librariesJson=/pasta-privada/libraries.json
node scripts/shorekeeper/qa-r4-ui.mjs \
  --model=/pasta-privada/Shorekeeper_F2.0-A_CANONICO_2026-11-03.glb \
  --out=/pasta-privada/evidencias-ui \
  --librariesJson=/pasta-privada/libraries.json
```

`libraries.json` é um array privado de caminhos absolutos para os quatro `SK_ATTACK_01..04_ORIGINAL.animations.glb`, `SK_SKILL_01_ORIGINAL.animations.glb` e Burst01/02 originais. Os nomes acima com `01..04` representam quatro arquivos, não um nome literal. O runner lê arquivos em memória; não cria endpoint público para o modelo. O GLB deve corresponder ao hash canônico já documentado. Qualquer arquivo faltante em CL é erro; na UI o fallback é explicitamente sinalizado.

Em contêiner que exija processo único, definir `SHOREKEEPER_QA_SINGLE_PROCESS=1`; isso é configuração do runner, não recomendação de browser ao usuário. Para GPU, remover `SHOREKEEPER_QA_RENDERER`, selecionar navegador/aceleração reais, preferir `SHOREKEEPER_QA_HEADED=1` no runner raster e verificar o renderer retornado: um nome diferente de SwiftShader não autoriza automaticamente PERFORMANCE_PASS. Não desabilitar segurança/autorização.

Cada bateria guarda hashes de fontes **antes** da captura e SHA-256 do bundle exato, nomes/hashes de bibliotecas, câmera, materiais reais, contadores, erros e classe do renderer. `--bundle=/caminho/scene.bundle.js` permite repetir um bundle arquivado; os hashes de fontes correntes, nesse caso, descrevem o checkout e devem ser distinguidos do bundle efetivamente executado. PNGs são frames reais; MP4 são sequência temporal amostrada e incluem frame de endpoint, podendo durar até 1/FPS além do intervalo pedido. Não calcular desempenho a partir da taxa de codificação.

`qa-r4-private.mjs MODEL OUT LIBRARIES...` verifica em CPU preservação e pouso. O parser CPU remove texturas apenas da cópia em memória e é explicitamente **CPU_ONLY_NOT_WEBGL**. Esse resultado nunca substitui o runner raster.

## Samsung Internet e GPU — gates externos

No aparelho real, acessar o preview autorizado e selecionar os arquivos locais ou usar o caminho autenticado existente. Registrar modelo do aparelho, versão de Samsung Internet/Android, renderer/driver, viewport, DPR/limite de pixels e qualidade. Rodar sessão de 600 s reais com estados manuais e combo; guardar FPS/frame time/CPU update VFX, draws, geometrias/texturas e mudanças térmicas quando observáveis. Não chamar viewport emulado de Android.

Verificar alternância canônica/R2/R3/R4 com pesos e câmeras iguais; três idles, blink bilateral e retorno; gesto integral/pirueta e pés/tecido com câmera fixa, depois opcional. Comparar campo+canopy+personagem na vista normal, não só crop. Pausar/reabrir aba, tirar da tela, alternar app, reduced motion, navegar e voltar por bfcache real, repetir load/dispose, perder/restaurar contexto quando suportado. Não simular bfcache com um evento artificial e declarar teste real.

Preencher colunas separadas da matriz: STRUCTURAL_PASS; WEBGL_RENDER_PASS; PERFORMANCE_PASS somente após medição no dispositivo; HUMAN_APPROVED somente após aceite explícito do usuário. Se houver artefato, guardar frame, câmera/peso/Root, versão/hash, reprodução e decisão de rollback. Nenhuma transição VFX-Burst automática até markers/fontes verificáveis.
