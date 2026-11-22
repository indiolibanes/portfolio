# Design system

The portfolio's visual system is a thin token layer on top of its authored identity. It borrows structure from three public systems and copies none of their looks.

| Source | What we took | What we did not take |
| --- | --- | --- |
| **Adobe Spectrum** | Three tiers (global → alias → component), role-based names, tokens as the only contract | Its neutral gray palette and flat UI |
| **Apple HIG** | 44 pt minimum target, one consistent focus ring, motion that yields to `prefers-reduced-motion` | Translucent system chrome as a default |
| **Fluent 2** | Named ramps for radius, duration, elevation and spacing; a neutral/brand split | Acrylic shadows and rounded-everything |

## Identity guardrails (not standardised on purpose)

These define the authorial mode. They stay as authored, and the token layer must never "tidy" them:

- warm beige paper, brick/gold ink and the prism palette (`--bg`, `--ink`, `--sun`, `--brick-*`, `--prism-*` in `global.css`);
- Benguiat chapters, Bookman subtitles, Roguepunk and pixel accents (`typography.css`, `type-hierarchy.css`);
- the hard "paper edge" shadow (`--shadow-card`) and the soft lift (`--shadow-soft`); no other decorative shadows;
- per-section scenes and choreographies (keyframes, WAAPI timings, header drawer 22 px / 500 ms contract).

## Tiers

`src/styles/design-tokens.css` is loaded first by `BaseLayout`.

1. **Global** – raw scale values: spacing (4 px grid), radius ramp, target size, durations, easing, focus ring, z-index layers.
2. **Alias** – roles that follow the active mode, pointing at the colour tokens that `mono-modes.css` / `mode-tokens.css` already override: `--color-background`, `--color-surface*`, `--color-text*`, `--color-border`, `--elevation-0/1/2`.
3. **Component** – declared beside the component, built from tiers 1–2 (for example `--xm-size` in `experimental.css`). Never put these in `design-tokens.css`.

### Scale reference

| Token | Value | Notes |
| --- | --- | --- |
| `--space-1…8` | 4, 8, 12, 16, 24, 32, 48, 64 px | Adopt when touching a rule; no mass rewrite |
| `--radius-xs/sm/md/lg/xl/full` | 6, 12, 18, 28, 38, 999 px | Values the site already used |
| `--target-min` | 44px | HIG minimum interactive target |
| `--duration-instant/fast/base/slow/slower` | 120, 160, 180, 220, 300 ms | Most-used existing values |
| `--ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Alias `--motion-emphasized` in `reveal.css` |
| `--focus-ring-width/offset` | 3px / 3px | |
| `--focus-ring-on-light` | `#ac652d` | 3.9:1 on `--bg`, 3.7:1 on the darkest beige |
| `--focus-ring-on-dark` | `#ffd15a` | 11.9:1 on `--prism-stage` |
| `--z-overlay/skip-link/top` | 60 / 10000 / 2147483000 | |

## Materials (glass)

There is one translucent material, used by the Música widget (`music-player.css`, "Vidro líquido"). Recipe, so other surfaces can reuse it instead of inventing a new one:

- a sheet over *something colourful* (here the blurred cover); glass over a flat colour shows nothing;
- `backdrop-filter: blur(20px) saturate(1.8)`, a dark veil of about 44% so light text stays above 4.5:1 even on white covers, a soft specular highlight in one corner, and a 1 px light rim (inset highlights);
- static: the only motion is the existing diagonal beam;
- `prefers-reduced-transparency` and browsers without `backdrop-filter` get a solid panel with the same contrast.

## Modes

Editorial and Legacy collapse colour tokens in `mono-modes.css` and flatten radius, shadow and motion with `!important` selectors. Because the alias tier uses `var()`, it follows the mode with no extra code. Do not redeclare colours in `design-tokens.css`.

## Rules

1. Use a token when one names the value you need. If your value is close but not equal, ask whether the design wants the ramp value; do not add a near-duplicate token.
2. A token may name an existing value. It must not silently change it. Changing a value is a design decision and goes in its own commit.
3. Standalone surfaces (RHEA, Hsin stage, Shorekeeper, `/modo-imersivo`) do not load `design-tokens.css` and keep their own identity. Do not use the new tokens there; the guard fails if you do.
4. `npm run check:design` enforces import order, that every new token is defined, and a ratchet on raw literals that tokens already name. The budget in `scripts/design-token-budget.json` only goes down.
5. Media queries cannot read custom properties, so breakpoints are documented, not tokenised (see the audit).

## Adding or changing a token

1. Add it to the right tier in `design-tokens.css` with a comment saying what it maps to.
2. If it replaces a repeated literal, migrate the call sites and lower the budget with `node scripts/check-design-tokens.mjs --print`.
3. Run `npm run check:design` and `npm run check:ux`.
