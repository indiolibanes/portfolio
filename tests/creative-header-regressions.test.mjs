import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');

test('scripted navigation is flagged in <head>, before the drawer is first styled', async () => {
  const head = await read('src/components/BaseHead.astro');
  assert.match(head, /dataset\.navJs = 'true'/);
});

test('the creative hero removes the tiles veil from over the name', async () => {
  const css = await read('src/styles/hero-autoral.css');
  assert.match(css, /#sobre \.name-brick-plate\.name-brick-plate::after \{\s*content: none;/);
});

test('reduced motion hides only the orbital drawer glass, not the header drawer', async () => {
  const css = await read('src/styles/experimental.css');
  assert.doesNotMatch(css, /^\s*\.xm-glass \{ clip-path: none; opacity: 0; \}/m);
  assert.match(css, /\.xm-drawer \.xm-glass \{ clip-path: none; opacity: 0; \}/);
});
