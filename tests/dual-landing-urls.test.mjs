import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = read('src/pages/index.astro');
const head = read('src/components/BaseHead.astro');
const modes = read('src/components/SeriousModeToggle.astro');
const redirects = read('public/_redirects');
const sitemap = read('public/sitemap.xml');
const creativePath = '/modo-criativo/';

assert.match(read('src/pages/modo-criativo.astro'), /import Home from '\.\/index\.astro'/);
assert.ok(!existsSync(new URL('../src/pages/modo-experimental.astro', import.meta.url)));
assert.match(home, /creative technologist/);
assert.match(home, /narrative designer/);
assert.match(home, /UX Writer/);
assert.match(home, /scriptwriter/);
assert.match(home, /isCreativeLanding \? PUBLIC_PAGES\.creative\.title : SITE\.title/);
assert.match(modes, /window\.location\.assign\(destination\.pathname/);
assert.match(modes, /id === 'authorial' \? creativePath : '\/'/);
assert.match(redirects, /\/modo-documentacao\/ \/ 301/);
for (const alias of ['/modo-experimental', '/modo-experimental/']) {
  assert.ok(redirects.split('\n').includes(`${alias} ${creativePath} 301`));
}
assert.ok(!sitemap.includes('/modo-documentacao/') && !sitemap.includes('/modo-experimental/'));
assert.ok(sitemap.includes(creativePath));

const initialization = head.match(/<script is:inline define:vars=\{\{ creativePath, isCreativeLanding, hasLandingScenes \}\}>([\s\S]*?)<\/script>/)?.[1];
assert.ok(initialization);

function initialize(path, stored) {
  const url = new URL(path, 'https://indiolibanes.dev');
  const isCreativeLanding = [creativePath, creativePath.slice(0, -1)].includes(url.pathname);
  const dataset = {};
  let redirect;
  runInNewContext(initialization, {
    URL,
    URLSearchParams,
    creativePath,
    isCreativeLanding,
    hasLandingScenes: isCreativeLanding || url.pathname === '/',
    window: { location: { search: url.search, href: url.href, replace: target => { redirect = target; } } },
    document: { documentElement: { dataset } },
    localStorage: { getItem: () => stored },
  });
  return { mode: dataset.portfolioMode, redirect };
}

assert.equal(initialize('/', 'authorial').mode, 'documentation');
assert.equal(initialize(creativePath, 'documentation').mode, 'authorial');
assert.equal(initialize('/modo-criativo').mode, 'authorial');
assert.equal(initialize('/?mode=editorial').mode, 'editorial');
assert.equal(initialize('/?mode=authorial&ref=share#lab').redirect, '/modo-criativo/?ref=share#lab');
assert.equal(initialize('/?mode=criativo').redirect, creativePath);
assert.equal(initialize('/?serious=0').redirect, creativePath);
assert.equal(initialize('/modo-criativo/?mode=editorial#lab').redirect, '/?mode=editorial#lab');
assert.equal(initialize('/modo-criativo/?mode=documentacao#sobre').redirect, '/#sobre');
assert.equal(initialize('/sophia/', 'legacy').mode, 'documentation');
console.log('PASS: documentary home, creative route, metadata, bookmark migration and mode selection.');
