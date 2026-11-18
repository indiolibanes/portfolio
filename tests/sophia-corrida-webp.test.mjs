// Static contract for the Curiosities-strip runner: pre-rendered WebP, no 3D at runtime.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');
const comp = await read('src/components/SophiaCorridaWebP.astro');
const css = await read('src/styles/sophia-corrida-webp.css');
const script = await read('src/scripts/sophia-corrida-webp.js');
const home = await read('src/pages/index.astro');
const ASSETS = ['town-sky', 'town-hills', 'town-far', 'town-mid', 'town-near', 'town-street', 'sophia-run', 'sophia-run-still'];

test('home swaps the 2D SVG runner for the WebP component', () => {
  assert.match(home, /import SophiaCorrida from '..\/components\/SophiaCorridaWebP\.astro'/);
  assert.doesNotMatch(home, /components\/SophiaCorrida\.astro/);
  assert.equal((home.match(/<SophiaCorrida\s*\/>/g) || []).length, 1);
});

test('component is decorative, lazy and never touches 3D sources', () => {
  assert.match(comp, /aria-hidden="true"/);
  assert.match(comp, /data-decorative-motion/);
  assert.match(comp, /loading="lazy"/);
  assert.doesNotMatch(comp + script, /\.glb|three|WebGL|getContext|XMLHttpRequest|fetch\(/i);
  assert.doesNotMatch(comp, /https?:\/\//);
});

test('every asset exists, is WebP and stays small', async () => {
  let total = 0;
  for (const name of ASSETS) {
    const file = new URL(`../public/assets/corrida/${name}.webp`, import.meta.url);
    const bytes = await readFile(file);
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', name);
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', name);
    total += bytes.length;
    assert.match(comp, new RegExp(name + '\\.webp'), `${name} wired`);
  }
  assert.ok(total < 260 * 1024, `total ${total} B must stay under 260 KB`);
  assert.ok((await stat(new URL('../public/assets/corrida/sophia-run.webp', import.meta.url))).size < 175 * 1024);
});

test('layers are lazy images with explicit size and a still fallback runner', () => {
  assert.match(comp, /sophia-run-still\.webp/);
  assert.match(comp, /data-run=\{`\$\{base\}sophia-run\.webp`\}/);
  assert.match(comp, /width="\d+"\s+height="\d+"/);
});

test('runner crosses the whole strip forward, never reversing', () => {
  assert.match(css, /@keyframes corrida-dash/);
  assert.match(css, /0%\s*\{[^}]*translate3d\(-100%/);
  assert.match(css, /100%\s*\{[^}]*translate3d\(100cqw/);
  assert.doesNotMatch(css, /animation-direction:\s*(alternate|reverse)|infinite\s+(alternate|reverse)/);
});

test('motion is transform-only and gated by playing state, reduced-motion and the data-motion hook', () => {
  assert.match(css, /prefers-reduced-motion:\s*no-preference/);
  assert.match(css, /\.is-running/);
  assert.match(css, /translate3d|translateX/);
  assert.doesNotMatch(css, /background-position|\bleft:\s*-?\d+(px|%)\s*;\s*\n[^}]*animation/);
});

test('controller honours visibility, Save-Data, reduced motion, pagehide and failures', () => {
  for (const needle of ['IntersectionObserver', 'document.hidden', 'saveData', 'reduce.matches', 'failed', 'destroy', 'decode']) {
    assert.ok(script.includes(needle) || comp.includes(needle), needle);
  }
});

test('mobile layout keeps the runner inside the strip', () => {
  assert.match(css, /@media \(max-width:\s*(640|599)px\)/);
  assert.match(css, /container-type:\s*size/);
});
