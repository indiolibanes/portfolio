# Sophia pré-R2 — bancada de cenários (QA manual, fora do `npm run check`)

Serve `harness.html` (3 atores: `runner`, `lab`, `far`) a partir da raiz do repositório e roda cenários no Chromium via Playwright (Python).

```sh
# a partir da raiz do repositório; harness.html espera /experimental → public/experimental e /assets → public/assets
mkdir -p /tmp/sophia-h && cp scripts/sophia/readiness/harness.html /tmp/sophia-h/ \
  && ln -sfn "$PWD/public/experimental" /tmp/sophia-h/experimental && ln -sfn "$PWD/public/assets" /tmp/sophia-h/assets
(cd /tmp/sophia-h && python3 -m http.server 8765 &)
python3 scripts/sophia/readiness/scenarios-load.py       # S1/S2: carga inicial e dois palcos
python3 scripts/sophia/readiness/scenarios-fallback.py   # F1–F12: falhas, modos, visibilidade, perda de contexto
```

Parâmetros da página: `?only=runner,lab`, `?labclip=<clipe>`, `?publish=1` (marca `lab-r2` como publicado só nesta aba, para simular o arquivo), `?legacy=1`, `?patch=draw`.
Os resultados vão para `scripts/sophia/readiness/results-after*.json` (ignore-os no commit). Chromium com SwiftShader (CPU): **mede contagem de contextos, requisições, estados e ordem de eventos — não desempenho de GPU ou de celular**.
`texture-2k-eval.py` avalia a textura 4K→2K em uma cópia local autorizada (nunca grava dentro do repositório).
