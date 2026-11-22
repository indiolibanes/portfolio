import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');

test('BaseLayout marks the documental and creative landings', async () => {
  const layout = await read('src/layouts/BaseLayout.astro');
  assert.match(layout, /data-landing=\{landing\}/);
  assert.match(layout, /'creative' : Astro\.url\.pathname === '\/' \? 'documental'/);
});

test('documental landing hides creative pieces but never the professional sections', async () => {
  const css = await read('src/styles/profiles.css');
  for (const selector of ['.immersive-banner', '.music-shelf', '.curiosities-teaser', '.lab-sophia-guide', '.serious-omega-entry']) {
    assert.ok(css.includes(selector), `missing ${selector}`);
  }
  for (const kept of ['#curadoria', '#traducao', '#rhea', '#reflexao', '#arquitetura', '#documentacao', '#percurso', '#metodo', '#bastidores', '#contato']) {
    assert.ok(!css.includes(kept), `${kept} must stay visible on the documental home`);
  }
});

test('the documental home keeps a way to the creative landing', async () => {
  const page = await read('src/pages/index.astro');
  assert.match(page, /PUBLIC_PAGES\.creative\.path/);
});

test('profiles.css is loaded last, after the visual modes', async () => {
  const layout = await read('src/layouts/BaseLayout.astro');
  const imports = [...layout.matchAll(/import '\.\.\/styles\/([\w-]+)\.css'/g)].map((m) => m[1]);
  assert.equal(imports.at(-1), 'profiles');
});
