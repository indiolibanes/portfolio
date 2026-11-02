import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const shelf = await read('../src/components/MusicShelf.astro');
const css = await read('../src/styles/music-gallery.css');
const stage = await read('../src/pages/experimentos/index.astro');

const link = shelf.match(/<a\s[\s\S]*?class="music-experimental-mode"[\s\S]*?<\/a>/)?.[0] ?? '';
assert.ok(link, 'music panorama exposes the experimental mode link');
assert.match(link, /href="\/experimentos\/"/, 'experimental mode opens the canonical public Hsin stage');
assert.match(link, />\s*Experimental mode\s*</, 'visible label is Experimental mode');
assert.ok(!shelf.includes('data-lunar-fox-cameo'), 'old temporary cameo markup is gone');
assert.ok(!shelf.includes('data-lunar-fox-call'), 'old one-shot call button is gone');

assert.ok(css.includes('.music-experimental-mode'), 'experimental mode uses scene-local styling');
assert.ok(!css.includes('.music-lunar-fox-cameo'), 'old cameo styling is gone');
assert.ok(!css.includes('.music-lunar-fox-call'), 'old cameo button styling is gone');

assert.ok(stage.includes('data-hsin-stage'), 'target route is the real public Hsin stage');
assert.ok(stage.includes("mountHsinStage"), 'target route mounts the 3D player');

console.log('Music experimental mode: direct Hsin stage link and no temporary cameo PASS');
