import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';

const root = await readFile('src/pages/experimentos/index.astro','utf8');
const music = await readFile('src/components/MusicShelf.astro','utf8');
const redirects = await readFile('public/_redirects','utf8');

assert.match(root,/data-hsin-stage/);
assert.match(root,/mountHsinStage/);
assert.match(root,/The Moon Fox · V2\.0\.1/);
assert.match(root,/href="\/#musica"/);
assert.match(music,/class="music-experimental-mode"[\s\S]*?href="\/experimentos\/"/);
assert.doesNotMatch(music,/\/experimentos\/hsin\//);

for (const removed of [
  'src/pages/experimentos/hsin/index.astro',
  'src/pages/experimentos/hsin-lab/index.astro',
  'src/scripts/experimental-stage.ts',
  'src/styles/experimental-stage.css',
  'src/scripts/hsin-local-lab.ts',
  'src/styles/hsin-local-lab.css',
  'src/layouts/HsinPresentationLayout.astro',
]) {
  await assert.rejects(access(removed), undefined, removed + ' must stay removed');
}

assert.match(redirects,/\/experimentos\/hsin\/\*\s+\/experimentos\/\s+301/);
assert.match(redirects,/\/experimentos\/hsin-lab\/\*\s+\/experimentos\/\s+301/);

console.log('Experimentos canonical route: Hsin V2.0.1 at /experimentos/, legacy stage/lab removed PASS');
