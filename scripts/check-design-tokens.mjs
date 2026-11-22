#!/usr/bin/env node
/*
 * Design-token guard (dependency-free).
 *
 *   node scripts/check-design-tokens.mjs          # check, exit 1 on failure
 *   node scripts/check-design-tokens.mjs --print  # print current raw-literal counts
 *
 * What it enforces (see docs/design-system.md):
 *   1. design-tokens.css exists and BaseLayout imports it before global.css.
 *   2. Every design-system token referenced with var(--…) is defined somewhere.
 *   3. Standalone surfaces (pages/styles that do NOT render under BaseLayout)
 *      never reference the new tokens, because those pages do not load them.
 *   4. Ratchet: raw literals that a token already names may not increase.
 *      Lower the budget when you migrate more call sites; never raise it.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');

// Files that render outside BaseLayout. They keep literals on purpose
// (own identity / isolated surface) and must not use the new tokens.
const STANDALONE = new Set([
  'src/pages/rhea/index.astro',
  'src/styles/rhea-kinetic.css',
  'src/pages/modo-imersivo.astro',
  'src/pages/experimentos/combate/index.astro',
  'src/layouts/HsinStageLayout.astro',
  'src/styles/hsin-stage.css',
  'src/styles/shorekeeper-material3.css',
  'src/styles/shorekeeper-presentation.css',
  'src/styles/shorekeeper-sk-lab.css',
  'src/styles/experimental-scene.css',
]);
// Also left untouched on purpose (literals asserted by contract tests):
// src/styles/experimental.css.

function walk(dir, out = []) {
  for (const name of readdirSync(join(root, dir))) {
    const p = `${dir}/${name}`;
    const st = statSync(join(root, p));
    if (st.isDirectory()) walk(p, out);
    else if (/\.(css|astro)$/.test(name)) out.push(p);
  }
  return out;
}

const files = ['src/styles', 'src/components', 'src/layouts', 'src/pages'].flatMap((d) => walk(d));

// Return only the CSS of a file (whole file for .css, <style> blocks for .astro).
function cssOf(path) {
  const text = read(path);
  if (path.endsWith('.css')) return text;
  return [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
}

const tokensCss = read('src/styles/design-tokens.css');
const failures = [];

// 1 ── import order -------------------------------------------------------
const layout = read('src/layouts/BaseLayout.astro');
const iTokens = layout.indexOf("styles/design-tokens.css");
const iGlobal = layout.indexOf("styles/global.css");
if (iTokens === -1 || iGlobal === -1 || iTokens > iGlobal) {
  failures.push('BaseLayout must import design-tokens.css before global.css');
}

// 2 ── referenced tokens are defined --------------------------------------
const defined = new Set();
for (const f of files) for (const m of cssOf(f).matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
for (const m of tokensCss.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);

const NEW_TOKEN = /^--(space-\d|radius-xs|target-min|duration-[a-z]+|ease-[a-z]+|focus-ring-[a-z-]+|z-(?:overlay|skip-link|top)|color-[a-z-]+|elevation-\d)$/;
const used = new Map();
for (const f of files) {
  for (const m of cssOf(f).matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (!NEW_TOKEN.test(m[1])) continue;
    if (!used.has(m[1])) used.set(m[1], new Set());
    used.get(m[1]).add(f);
  }
}
for (const [token, where] of used) {
  if (!defined.has(token)) failures.push(`${token} is used but never defined (${[...where].join(', ')})`);
}

// 3 ── standalone surfaces must not depend on the token layer --------------
for (const [token, where] of used) {
  for (const f of where) {
    if (STANDALONE.has(f)) failures.push(`${f} is standalone (no design-tokens.css) but uses ${token}`);
  }
}

// 4 ── ratchet on raw literals --------------------------------------------
const METRICS = {
  'border-radius: 6/12/18/28/38/999px  → var(--radius-*)': /(?<![\w-])border-radius:\s*(?:6|12|18|28|38|999)px\s*(?:!important\s*)?(?=[;}]|$)/gm,
  'min-height/min-width: 44px         → var(--target-min)': /(?<![\w-])min-(?:height|width):\s*44px\s*(?:!important\s*)?(?=[;}])/g,
  'transition 120/160/180/220/300ms   → var(--duration-*)': /(?<![\w-])transition:[^;}]*?(?<![\d.])(?:120|160|180|220|300)ms\b/g,
  'outline 3px solid #ac652d/#ffd15a  → var(--focus-ring-*)': /(?<![\w-])outline:\s*3px solid #(?:ac652d|ffd15a)\b/gi,
  'z-index 60/10000/2147483000        → var(--z-*)': /(?<![\w-])z-index:\s*(?:60|10000|2147483000)\s*(?=[;}])/g,
};
// Budgets = occurrences that remain today in contract-protected files
// (experimental.css). Standalone surfaces are excluded from the count.
const BUDGET = JSON.parse(read('scripts/design-token-budget.json'));

const counts = {};
for (const [label, re] of Object.entries(METRICS)) {
  let n = 0;
  for (const f of files) {
    if (f === 'src/styles/design-tokens.css' || STANDALONE.has(f)) continue;
    n += (cssOf(f).match(re) || []).length;
  }
  counts[label] = n;
}

if (process.argv.includes('--print')) {
  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
}

for (const [label, n] of Object.entries(counts)) {
  const max = BUDGET[label];
  if (max === undefined) failures.push(`no budget recorded for: ${label}`);
  else if (n > max) failures.push(`raw literals grew: ${label} — ${n} > budget ${max}. Use the token.`);
}

if (failures.length) {
  console.error('Design-token check FAILED:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log(`Design-token check: PASS (${used.size} tokens in use, ${Object.keys(counts).length} ratchets, ${files.length} files scanned).`);
