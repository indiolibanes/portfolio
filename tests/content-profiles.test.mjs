import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');

test('BaseHead reads ?perfil= and persists only the documental profile', async () => {
  const head = await read('src/components/BaseHead.astro');
  assert.match(head, /params\.get\('perfil'\)/);
  assert.match(head, /localStorage\.setItem\('portfolio-profile', profile\)/);
  assert.match(head, /localStorage\.removeItem\('portfolio-profile'\)/);
  assert.match(head, /dataset\.profile = profile/);
});

test('documental profile hides creative pieces but never the professional sections', async () => {
  const css = await read('src/styles/profiles.css');
  for (const selector of ['.immersive-banner', '.music-shelf', '.curiosities-teaser', '.lab-sophia-guide', '.serious-omega-entry']) {
    assert.ok(css.includes(selector), `missing ${selector}`);
  }
  for (const kept of ['#curadoria', '#traducao', '#rhea', '#reflexao', '#arquitetura', '#documentacao', '#percurso', '#metodo', '#bastidores', '#contato']) {
    assert.ok(!css.includes(kept), `${kept} must stay visible in the documental profile`);
  }
});

test('the documental note offers a way back to the full portfolio', async () => {
  const page = await read('src/pages/index.astro');
  assert.match(page, /class="profile-note"/);
  assert.match(page, /href="\/\?perfil=criativo"/);
});

test('profiles.css is loaded last, after the visual modes', async () => {
  const layout = await read('src/layouts/BaseLayout.astro');
  const imports = [...layout.matchAll(/import '\.\.\/styles\/([\w-]+)\.css'/g)].map((m) => m[1]);
  assert.equal(imports.at(-1), 'profiles');
});
