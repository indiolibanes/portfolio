import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const tokens = Object.fromEntries(
  [...read('src/styles/design-tokens.css').matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);

test('token values keep the identity the site already shipped', () => {
  assert.equal(tokens['--radius-sm'], '12px');
  assert.equal(tokens['--radius-md'], '18px');
  assert.equal(tokens['--radius-lg'], '28px');
  assert.equal(tokens['--radius-xl'], '38px');
  assert.equal(tokens['--radius-full'], '999px');
  assert.equal(tokens['--target-min'], '44px');
  assert.equal(tokens['--ease-emphasized'], 'cubic-bezier(0.2, 0, 0, 1)');
  assert.equal(tokens['--duration-fast'], '160ms');
  assert.equal(tokens['--z-top'], '2147483000');
});

test('the focus ring colours meet 3:1 on their surfaces', () => {
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  assert.ok(ratio(tokens['--focus-ring-on-light'], '#f1e7cf') >= 3, 'on-light ring on the darkest beige surface');
  assert.ok(ratio(tokens['--focus-ring-on-dark'], '#1c1b19') >= 3, 'on-dark ring on the prism stage');
});

test('design-token guard script passes (import order, definitions, ratchets)', () => {
  const r = spawnSync(process.execPath, ['scripts/check-design-tokens.mjs'], {
    cwd: new URL('..', import.meta.url).pathname,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
