// The presentation palette comes from the Hsin references: every colour in the stylesheet is a palette token
// (or an alpha of one), text keeps WCAG contrast on the surfaces it sits on, and no generic blue remains.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css = await readFile(new URL('../src/styles/hsin-local-lab.css', import.meta.url), 'utf8');
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');

// ---------------------------------------------------------------------------------------------
// Tokens, read from the stylesheet itself.
// ---------------------------------------------------------------------------------------------
const root = stripped.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
assert.ok(root, 'a :root token block exists');
const tokens = new Map([...root.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const color = (name) => { const v = tokens.get(name); assert.match(v ?? '', /^#[0-9a-f]{6}$/i, `--${name} is a plain hex colour`); return v.toLowerCase(); };
for (const required of ['hsin-night', 'hsin-night-2', 'hsin-ember', 'hsin-wine', 'hsin-mauve', 'hsin-crimson', 'hsin-scarlet', 'hsin-rust', 'hsin-amber', 'hsin-gold', 'hsin-cream', 'hsin-ivory', 'hsin-soft', 'hsin-rose']) color(required);

const channel = (c) => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const luminance = (hex) => { const n = parseInt(hex.slice(1, 7), 16); return .2126 * channel(n >> 16) + .7152 * channel((n >> 8) & 255) + .0722 * channel(n & 255); };
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + .05) / (lo + .05); };
const hue = (hex) => {
  const n = parseInt(hex.slice(1, 7), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return {h: 0, s: 0};
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return {h: (h * 60 + 360) % 360, s: d / (1 - Math.abs(max + min - 1))};
};

// ---------------------------------------------------------------------------------------------
// 1. Every colour literal is a palette colour; none is a blue; the legacy tan and brown layers are gone.
// ---------------------------------------------------------------------------------------------
const palette = new Set([...tokens.entries()].filter(([k, v]) => /^hsin-(?!line|veil|shadow|grad)/.test(k) && /^#[0-9a-f]{6}$/i.test(v)).map(([, v]) => v.slice(1).toLowerCase()));
palette.add('000000'); // shadows only
const literals = [...stripped.matchAll(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi)].map((m) => m[1].toLowerCase());
assert.ok(literals.length > 20, "the colour scan found the stylesheet colours");
for (const literal of literals) {
  assert.ok([6, 8].includes(literal.length), `#${literal}: use full hex so it can be checked`);
  assert.ok(palette.has(literal.slice(0, 6)), `#${literal} is not a Hsin palette colour (or an alpha of one)`);
  const {h, s} = hue('#' + literal);
  assert.ok(!(h >= 185 && h <= 265 && s > .12), `#${literal} reads as blue (hue ${h.toFixed(0)}°)`);
}
for (const legacy of ['866742', 'ad8c57', 'efe8db', 'a75f2c', '612f1c', '321716', '291814', 'f4ebde', '3d332a', '502a23', '75402d', 'bca482', 'e7c58f'])
  assert.ok(!literals.some((l) => l.startsWith(legacy)), `legacy colour #${legacy} is gone`);
assert.ok(!/\b(?:blue|navy|royalblue|dodgerblue|steelblue|cornflowerblue|deepskyblue|skyblue|rgb\(|hsl\()/i.test(stripped), 'no named blues and no colour functions that bypass the check');
for (const [name, value] of tokens) if (/^hsin-/.test(name) && /^#/.test(value)) { const {h, s} = hue(value); assert.ok(!(h >= 185 && h <= 265 && s > .12), `--${name} is blue`); }

// ---------------------------------------------------------------------------------------------
// 2. Contrast: text on the surfaces it is drawn on (WCAG AA, 4.5:1).
// ---------------------------------------------------------------------------------------------
const c = (name) => color('hsin-' + name);
const text = [
  ['ivory', ['night', 'night-2', 'ember', 'wine', 'mauve', 'crimson', 'scarlet', 'rust']],
  ['cream', ['crimson', 'scarlet', 'rust', 'wine', 'ember']],
  ['gold', ['night', 'night-2', 'ember', 'wine']],
  ['soft', ['night', 'night-2', 'ember', 'wine']],
  ['peach', ['night-2', 'ember']],
  ['rose', ['night']],
];
for (const [foreground, surfaces] of text) for (const surface of surfaces) {
  const ratio = contrast(c(foreground), c(surface));
  assert.ok(ratio >= 4.5, `${foreground} on ${surface} is ${ratio.toFixed(2)}:1`);
}
assert.ok(contrast(c('night'), c('amber')) >= 4.5 && contrast(c('night'), c('gold')) >= 4.5, 'dark text stays readable on the gold and amber accents');
// The focus ring has to stand out from everything it can sit on (non-text contrast, 3:1).
for (const surface of ['night', 'night-2', 'ember', 'wine', 'crimson', 'rust']) assert.ok(contrast(c('gold'), c(surface)) >= 3, `focus ring on ${surface}`);

// ---------------------------------------------------------------------------------------------
// 3. The scheme is actually applied: gradients, states, native controls.
// ---------------------------------------------------------------------------------------------
const rule = (selector) => stripped.split('}').map((r) => r.trim()).filter((r) => r.startsWith(selector + ' {') || r.startsWith(selector + '{'));
const has = (selector, needle) => rule(selector).some((r) => r.includes(needle));
assert.match(tokens.get('hsin-grad-accent'), /var\(--hsin-crimson\).*var\(--hsin-rust\)/, 'accent gradient runs crimson to rust');
assert.match(tokens.get('hsin-grad-surface'), /var\(--hsin-wine\).*var\(--hsin-ember\)/, 'surface gradient runs wine to ember');
assert.match(tokens.get('hsin-grad-stage'), /var\(--hsin-mauve\)[\s\S]*var\(--hsin-night\)/, 'the stage glows from mauve into night');
assert.ok(has('.hsin-lab button', 'var(--hsin-grad-surface)'), 'buttons use the surface gradient');
assert.ok(has('.hsin-lab button:hover:not(:disabled), .hsin-lab button:focus-visible', 'var(--hsin-grad-accent)'), 'hover and focus use the accent gradient');
assert.ok(has('.hsin-lab button[aria-pressed="true"]', 'var(--hsin-grad-accent)'), 'active state uses the accent gradient');
assert.ok(has('.hsin-lab button:disabled', 'opacity'), 'disabled state is distinct');
assert.ok(has('.hsin-lab :focus-visible', 'var(--hsin-gold)'), 'focus ring is gold');
assert.ok(has('.hsin-lab__options > summary:hover, .hsin-lab__options[open] > summary', 'var(--hsin-grad-accent)'), 'the ⋯ button reacts');
assert.ok(has('.hsin-lab__options-content', 'var(--hsin-veil)') && has('.hsin-lab__options-content', 'backdrop-filter'), 'the menu is a translucent surface');
assert.ok(has('.hsin-lab__viewport', 'var(--hsin-grad-stage)'), 'the stage uses the palette gradient');
assert.ok(has('.hsin-lab__load input::file-selector-button', 'var(--hsin-grad-accent)'), 'the native file button follows the palette');
assert.ok(has('.hsin-lab select, .hsin-lab input[type="search"]', 'var(--hsin-night-2)') && has('.hsin-lab select option', 'var(--hsin-night-2)'), 'select and its options are palette surfaces');
assert.ok(/\.hsin-presentation-page\s*\{[^}]*accent-color:var\(--hsin-gold\)/.test(stripped), 'native checkboxes and ranges take the gold accent');
assert.ok(/\.hsin-presentation-page\s*\{[^}]*color-scheme:dark/.test(stripped));
assert.ok(/\.hsin-presentation-page ::selection\s*\{[^}]*var\(--hsin-scarlet\)/.test(stripped), 'text selection is scarlet, not the browser default');
assert.ok(/prefers-reduced-motion:\s*reduce/.test(stripped), 'reduced motion is respected');

// ---------------------------------------------------------------------------------------------
// 4. The stylesheet is sound: balanced, every variable defined, every class it targets exists.
// ---------------------------------------------------------------------------------------------
assert.equal([...stripped].filter((x) => x === '{').length, [...stripped].filter((x) => x === '}').length, 'balanced braces');
const defined = new Set([...stripped.matchAll(/--([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
for (const m of stripped.matchAll(/var\(--([a-z0-9-]+)/g)) assert.ok(defined.has(m[1]), `var(--${m[1]}) is defined`);
const html = await readFile(new URL('../src/pages/experimentos/hsin-lab/index.astro', import.meta.url), 'utf8');
const script = await readFile(new URL('../src/scripts/hsin-local-lab.ts', import.meta.url), 'utf8');
for (const klass of ['hsin-lab__menu-group', 'hsin-lab__options-content', 'hsin-lab__role', 'hsin-lab__controls', 'hsin-lab__viewport'])
  assert.ok(css.includes('.' + klass) && html.includes(klass), `.${klass} is styled and used`);
for (const klass of ['hsin-lab__morph', 'hsin-lab__morphline']) assert.ok(css.includes('.' + klass) && script.includes(klass), `dynamic .${klass} stays styled`);

console.log('Palette: every colour from the Hsin references, AA contrast, no blue residue, gradients and states applied PASS');
