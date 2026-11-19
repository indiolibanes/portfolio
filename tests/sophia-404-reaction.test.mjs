import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL('../' + relative, import.meta.url));

test('the 404 uses the Lab reaction above the game and preserves the 2D cast', async () => {
  const page = (await read('src/pages/404.astro')).toString();
  assert.match(page, /<SophiaDetective\s*\/>/);
  assert.match(page, /<SophiaMascot\s*\/>/);
  assert.match(page, /<SophiaRoom2DTemp\s*\/>/);
  assert.match(page, /<picture class="sophia-arcade-reaction"[\s\S]+?prefers-reduced-motion: reduce[\s\S]+?arcade-sophia-lab-still\.webp[\s\S]+?<img\s+src="\/images\/sophia\/arcade-sophia-lab\.webp"/);
  assert.doesNotMatch(page, /SophiaPortrait|sophia-404-stage|SOPHIA \/ LEGACY|data-sophia-canvas/);
});

test('the short 404 reaction is an animated WebP with transparency and a still alternative', async () => {
  const loop = await read('public/images/sophia/arcade-sophia-lab.webp');
  assert.equal(loop.toString('ascii', 0, 4), 'RIFF');
  assert.equal(loop.toString('ascii', 8, 16), 'WEBPVP8X');
  assert.equal(loop[20] & 0x12, 0x12);
  assert.ok(loop.length < 315 * 1024, `WebP: ${loop.length} bytes`);
  let duration = 0;
  let frames = 0;
  let infinite = false;
  for (let i = 12; i + 8 <= loop.length;) {
    const id = loop.toString('ascii', i, i + 4);
    const length = loop.readUInt32LE(i + 4);
    assert.ok(i + 8 + length <= loop.length);
    if (id === 'ANMF') {
      frames++;
      duration += loop.readUIntLE(i + 20, 3);
    } else if (id === 'ANIM') infinite = loop.readUInt16LE(i + 12) === 0;
    i += 8 + length + (length & 1);
  }
  assert.ok(frames >= 20 && duration >= 5500 && duration <= 7500 && infinite);
  const still = await read('public/images/sophia/arcade-sophia-lab-still.webp');
  assert.equal(still.toString('ascii', 8, 16), 'WEBPVP8X');
  assert.equal(still[20] & 0x12, 0x10);
});
