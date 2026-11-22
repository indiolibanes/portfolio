# Design-system audit and clean-up — 2026-11-21

Branch: `chore/design-system-20261121` (from `main@7428bf4`).

## What this is, and what it is not

A static audit plus a value-preserving migration. This session could not install dependencies (the gateway denies `registry.npmjs.org`), so there was **no `astro build`, no Lighthouse, no visual regression and no real-device run**. Everything below was proved by static analysis and the dependency-free test suite. Sizes are source sizes, not build output.

## Findings (counted on `main`)

| Area | Finding |
| --- | --- |
| Radius | Ramp tokens existed (`--radius-sm…full`) but 38 literal uses of the same values remained in `BaseLayout` surfaces; off-ramp values also appear (16 px ×20, 22 px ×13, 14 px ×12, 100 px ×10) |
| Touch target | `min-height: 44px` repeated 33 times with no name |
| Motion | 160 ms ×12 and 180/220/300 ms scattered through `transition`; two hand-tuned bezier curves repeated 26× inside the hero keyframes (kept: authored choreography) |
| Focus | A dozen or more different outline colours and widths. The global default (`--rose` on beige) is 3.0:1 on `--bg` and 2.8:1 on `--surface-soft`, below the 3:1 non-text contrast target |
| Layers | `z-index` literals 60, 10000 and 2147483000 repeated without names |
| Breakpoints | 15+ distinct `max-width` values (920, 640, 720, 560, 680, 600, 620, 960, 860 …) |
| Dead code | 3 `@keyframes` with no consumer; 183 rules for retired features (GitHub window mock, prism stage, Moonlight note, footer nav, closing relics …) |

## Changes

1. `src/styles/design-tokens.css` — tiered token layer (global/alias), loaded before `global.css`. Radius ramp moved here from `global.css`.
2. 107 literals replaced by token references in 19 files (radius 38, duration 35, target 22, z-index 7, focus ring 5). **Proof:** every changed file was compared to `HEAD` after resolving all `var(--token)` to literals on both sides; the only residual differences are the ones listed here.
3. Default link focus ring now uses `--focus-ring-on-light` (`#ac652d`, 3.9:1) instead of `--rose` (3.0:1). This is the one intentional visible change, and it only shows on keyboard focus.
4. Removed `attn-wiggle`, `cover-fade`, `music-sonata-orbit` (no reference in `src`, `public`, `tests`, `scripts`).
5. Removed 183 rules whose every selector targets a class that exists nowhere (markup, JS, JSON, Markdown, tests), with an extra guard for dynamically built names (`prefix-${x}`, `'prefix-' + x`). 26.3 KB of source (global.css 19.9 KB). Selector lists of all other rules were verified unchanged.
6. `scripts/check-design-tokens.mjs`, `scripts/design-token-budget.json`, `tests/design-tokens.test.mjs`, and `npm run check:design` (also part of `npm run check`).

Stylesheet source: 569,438 B → 547,192 B (−22.2 KB, −3.9%); whitespace-collapsed gzip estimate −3.6 KB. Not a build measurement.

## Not touched, and why

- `experimental.css` and the header's asserted literals (22 px clip-path, 500 ms curve): contract tests assert them.
- RHEA, Hsin stage, Shorekeeper, `/modo-imersivo`, `experimental-scene.css`: standalone surfaces without the token layer.
- 252 more "dead-looking" rules (heuristic only; many are BEM modifiers built in JS, e.g. `triforce-system__body--*`). Needs a build and a visual diff before removal.
- RESERVED files in `docs/security/ghost-files-s1.md`: no deletions.
- Off-ramp radii and the focus colours that depend on an unknown surface (`#e6bb4a` 1.6:1 and `#c99738` 2.3:1 on light backgrounds in `sophia-tetris.css` / `global.css`): need a visual check of each surface.

## Proposals (need build + visual QA; not applied)

Per the 2026-11-02 audit rule, none of these ships without per-route CSS/JS sizes, build, `npm run check`, a Cloudflare preview and an Autoral/Editorial/Legacy comparison at desktop and mobile.

1. **Route-scoped CSS.** ~80 KB of Música CSS and other section sheets load on every `BaseLayout` page. Cascade order matters, so snapshot first.
2. **Breakpoint scale.** Collapse the 15+ widths to a short documented scale (for example 560 / 720 / 920), checking each layout.
3. **Off-ramp radii.** Decide per component whether 14/16/22 px move to the ramp.
4. **`content-visibility: auto`** on below-the-fold sections (0 uses today). Affects scrollspy and anchor jumps.
5. **Lite tier** (`deviceMemory`, `saveData`, slow frames): drop blur, backdrop-filter, blend and infinite decorative animation on weak devices (target: Moto G35, 4 GB desktop). 36 `backdrop-filter`, 39 blur, 149 infinite animations today.
6. **Externalise `SeriousModeToggle` inline source** (~85 KB) so it can be cached and deferred.
7. **Media and models.** `typing-left.webp` (1.2 MB) and the 1.1 MB GIF; Sophia GLBs (~36 MiB) need meshopt/KTX2 tooling.
8. **Fonts.** Self-host Pixelify Sans to drop the Google Fonts round trip (CSP change included).
9. **Focus ring.** Move the remaining per-surface outlines to the two focus tokens after a visual pass.

## How to verify locally

```bash
npm ci && npm run check && npm run build
npm run preview   # compare Autoral / Editorial / Legacy, desktop + 360 px, keyboard focus on links
```
