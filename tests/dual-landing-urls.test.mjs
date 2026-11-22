import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = read('src/pages/index.astro');
const head = read('src/components/BaseHead.astro');
const modes = read('src/components/SeriousModeToggle.astro');
const redirects = read('public/_redirects');

assert.match(read('src/pages/modo-experimental.astro'), /import Home from '\.\/index\.astro'/);
assert.match(home, /Creative Technologist/);
assert.match(home, /Narrative Designer/);
assert.match(home, /UX Writer/);
assert.match(home, /Scriptwriter/);
assert.match(home, /isExperimentalLanding \? PUBLIC_PAGES\.experimental\.title : SITE\.title/);
assert.match(head, /const hasLandingScenes = pathname === '\/' \|\| isExperimentalLanding;/);
assert.match(head, /mode = canonicalRequested === 'editorial'/);
assert.match(head, /: isExperimental \? 'authorial' : 'documentation'/);
assert.match(head, /const stored = localStorage\.getItem\('portfolio-mode-v2'\)/);
assert.match(modes, /window\.location\.assign\(destination\.pathname/);
assert.match(modes, /mode === 'authorial' \? '\/modo-experimental\/' : '\/'/);
assert.match(redirects, /\/modo-documentacao\/ \/ 301/);
assert.ok(!read('public/sitemap.xml').includes('/modo-documentacao/'));
assert.ok(read('public/sitemap.xml').includes('/modo-experimental/'));
console.log('PASS: documentation home, authorial route, metadata, bookmarks and mode navigation.');
