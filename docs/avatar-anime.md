# Avatar em anime (marca do cabeçalho)

O círculo de 42 px do cabeçalho (`[data-brand-mark]`) mostra Kauê desenhado como
anime, a partir de uma foto dele: cel-shading com nanquim irregular de traço
Fujimoto, olhos avelã abertos e luz de crepúsculo à Shinkai. Ele gira 360° numa
órbita sob o céu de *Kimi no Na wa* (kataware-doki, cometa, silhuetas da fábrica
de celulose, torres de energia) e volta de frente.

## Arquivo

- `public/brand/kaue-anime.webp` — sprite 8 × 6 de quadros de 128 × 128 px
  (1024 × 768, ≈155 KB), lidos em ordem, da esquerda para a direita.
- 48 quadros a 12 qps ("de dois em dois") = **4 s**.
- O quadro 0 (frente, olhos abertos) é também o quadro estático.

## Comportamento (`PortfolioHeader.astro`)

- Sem JavaScript, ou se a imagem falhar: fica o "K" de reserva.
- Toca uma vez ao carregar e de novo no `pointerenter`/`focus` do link da marca
  (com intervalo de recarga).
- `prefers-reduced-motion: reduce` e Legacy ficam parados no quadro 0.
- Editorial e Legacy (monocromáticos) aplicam `grayscale(1) contrast(1.12)`.

## Trocar o desenho

Mantenha a grade (8 × 6) e os 48 quadros, ou ajuste `COLS`, `ROWS`, `FRAMES` e
`FPS` no script do cabeçalho e a checagem em `scripts/check-ux-contract.mjs`.
A duração total precisa continuar abaixo de 5 s.
