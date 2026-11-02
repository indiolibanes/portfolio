// Portfolio R1: source-level regression of the 2D scene runtime's route boundary.
// This is NOT a browser/network performance benchmark.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const head = read('src/components/BaseHead.astro');
const home = read('src/pages/index.astro');

assert.match(head, /const hasLandingScenes = Astro\.url\.pathname === '\/';/);
assert.match(head, /\{hasLandingScenes && <script is:inline src="\/scripts\/scenes\.js" defer><\/script>\}/);
assert.equal((head.match(/src="\/scripts\/scenes\.js"/g) || []).length, 1);
assert.match(home, /data-scene="/);

for (const path of ['src/pages/curiosidades.astro', 'src/pages/sophia.astro', 'src/pages/404.astro']) {
  assert.doesNotMatch(read(path), /data-scene="/, `${path} now needs a scene runtime audit`);
}

console.log('PASS: landing-only Canvas 2D runtime, no scene markers on other known public routes.');
