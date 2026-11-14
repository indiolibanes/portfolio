// Mobile browsers resize the visual viewport as the address bar shows/hides: a bare `vh` height
// overshoots the screen and hides content. Every height/min-height in `vh` must be followed in the
// same rule by a dvh/svh version (the later declaration wins where supported; `vh` stays as fallback).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const dir = new URL('../src/styles/', import.meta.url);
const files = (await readdir(dir)).filter(f => f.endsWith('.css'));

test('height/min-height in vh always carry a dvh/svh fallback in the same rule', async () => {
  const bad = [];
  for (const f of files) {
    const css = await readFile(new URL(f, dir), 'utf8');
    for (const m of css.matchAll(/\{([^{}]*)\}/g)) {
      const body = m[1];
      for (const d of body.matchAll(/(?:^|;|\s)((?:min-|max-)?height)\s*:\s*([^;}]+)/g)) {
        const [, prop, value] = d;
        if (!/\d\s*vh\b/.test(value) || /dvh|svh|lvh/.test(value)) continue;
        const ok = new RegExp(`(?:^|[;\\s])${prop}\\s*:[^;}]*\\d(?:dvh|svh)`).test(body);
        if (!ok) bad.push(`${f}: ${prop}: ${value.trim()}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test('immersive page extends under notches (viewport-fit=cover) because it already pads controls with safe-area insets', async () => {
  const page = await readFile(new URL('../src/pages/modo-imersivo.astro', import.meta.url), 'utf8');
  assert.match(page, /name="viewport" content="[^"]*viewport-fit=cover/);
  assert.match(page, /env\(safe-area-inset-top\)/);
});
