import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const shelf = await read('../src/components/MusicShelf.astro');
const css = await read('../src/styles/music-gallery.css');
const stage = await read('../src/pages/experimentos/index.astro');

// Decisão de 2026-11-08: a colagem das personagens (panorama) saiu da home; /experimentos continua existindo, sem link.
assert.ok(!shelf.includes('music-experimental-mode'), 'home no longer exposes the experimental mode link');
assert.ok(!shelf.includes('<figure class="music-panorama'), 'music panorama collage is gone from the home');
assert.ok(!/href="\/experimentos/.test(shelf), 'music shelf does not link to /experimentos');
assert.ok(!shelf.includes('data-lunar-fox-cameo'), 'old temporary cameo markup is gone');
assert.ok(!shelf.includes('data-lunar-fox-call'), 'old one-shot call button is gone');

assert.ok(css.includes('.music-experimental-mode'), 'experimental mode uses scene-local styling');
assert.ok(!css.includes('.music-lunar-fox-cameo'), 'old cameo styling is gone');
assert.ok(!css.includes('.music-lunar-fox-call'), 'old cameo button styling is gone');

assert.ok(stage.includes('data-hsin-stage'), 'target route is the real public Hsin stage');
assert.ok(stage.includes("mountHsinStage"), 'target route mounts the 3D player');

console.log('Music experimental mode: direct Hsin stage link and no temporary cameo PASS');
