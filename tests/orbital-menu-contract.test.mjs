import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const menu = read('src/components/ExperimentalMenu.astro');
const animatedIcons = read('src/components/ImmersiveModeEmblems.astro');
const header = read('src/components/PortfolioHeader.astro');
const base = read('src/layouts/BaseLayout.astro');
const immersive = read('src/pages/modo-imersivo.astro');
const mode = read('src/components/SeriousModeToggle.astro');
const css = read('src/styles/experimental.css');
const js = read('public/scripts/experimental-menu.js');
const authorialHop = read('public/scripts/authorial-glass-drawer.js');

test('Autoral restores original trigger + periodic navigation, borrowing only glass drawer', () => {
  assert.match(header, /class="nav-menu-toggle"/);
  assert.match(header, /data-nav-menu-toggle/);
  assert.match(header, /class="nav-sections" id="nav-sections" data-nav-sections/);
  assert.match(header, /class="xm-glass"/);
  assert.match(header, /<SeriousModeToggle \/>/);
  assert.match(header, /data-nav-plasma/);
  assert.doesNotMatch(header, /<ExperimentalMenu/);
  assert.match(base, /import '\.\.\/styles\/experimental\.css';/);
  assert.match(header, /src="\/scripts\/authorial-glass-drawer\.js"/);
  assert.match(header, /clip-path: inset\(0 0 100% 100% round 22px\)/);
  assert.match(header, /clip-path 500ms cubic-bezier\(0\.2, 0\.85, 0\.25, 1\)/);
  assert.match(header, /html:not\(\[data-nav-js='true'\]\) \.site-header \.nav-sections \.xm-glass/);
  assert.doesNotMatch(css, /\.xm-header--authorial/);
  assert.doesNotMatch(js, /keepDrawerInView/);
});

test('Autoral adopts original five-hop choreography while retaining its own reveal and reduced-motion logic', () => {
  assert.match(header, /const reveal = \(\) =>/);
  assert.match(header, /data-nav-sections/);
  assert.match(header, /event\.key === 'Escape'/);
  assert.match(authorialHop, /const HOP_MS = 2500;/);
  assert.match(authorialHop, /const HOPS = 5;/);
  assert.match(authorialHop, /const HOP_PERIOD = 470;/);
  assert.match(authorialHop, /const STAGGER_MS = 18;/);
  assert.match(authorialHop, /drawer\.querySelectorAll\('\.el, \.ch'\)/);
  assert.match(authorialHop, /drawer\.querySelector\('\.xm-glass'\)/);
  assert.match(authorialHop, /const observer = new MutationObserver\(sync\)/);
  assert.match(authorialHop, /reduce\.matches/);
});

test('Immersivo keeps orbital trigger and shows animated original α/β/γ plus social links', () => {
  assert.match(immersive, /<ExperimentalMenu \/>/);
  assert.match(menu, /<ImmersiveModeEmblems \/>/);
  assert.doesNotMatch(menu, /variant="authorial"|NAV\.map|MODE_CHOICES/);
  assert.match(animatedIcons, /data-xm-mode-nav/);
  for (const [id, href] of [['authorial','/'],['editorial','/?mode=editorial'],['legacy','/?mode=legacy']]) {
    assert.ok(animatedIcons.includes('"id":"' + id + '"'), 'Original emblem missing: ' + id);
    assert.ok(animatedIcons.includes('"href":"' + href + '"'), 'Link missing: ' + href);
  }
  assert.doesNotMatch(animatedIcons, /"id":"immersive"/);
  assert.match(animatedIcons, /class="serious-art"/);
  assert.match(animatedIcons, /const loopsOf = \{/);
  for (const signature of ['.serious-rays__spin', '.serious-beams__spin', '.serious-jets__tilt', '.serious-gamma__blob']) {
    assert.ok(animatedIcons.includes(signature), 'Original FX target missing: ' + signature);
  }
  assert.match(animatedIcons, /if \(!open\) \{ stop\(\); return; \}/);
  assert.match(animatedIcons, /reducedMotion\.matches/);
  assert.match(animatedIcons, /document\.hidden/);
  assert.match(animatedIcons, /new MutationObserver\(sync\)/);
  assert.match(menu, /href=\{SOCIALS\.github\}/);
  assert.match(menu, /href=\{SOCIALS\.lastfm\}/);
  assert.match(menu, /href=\{PROFILE\.linkedin\}/);
  assert.match(menu, /href=\{PROFILE\.whatsapp\}/);
  assert.match(menu, /href=\{\`mailto:\$\{PROFILE\.email\}\`\}/);
});

test('Immersivo orbital menu proportions and Omega portal remain unchanged', () => {
  assert.match(css, /--xm-size:\s*56px/);
  assert.match(css, /--xm-orbit-period:\s*10s/);
  assert.match(css, /--xm-open:\s*500ms/);
  assert.match(css, /\.xm-orbit\s*\{[\s\S]*?width:\s*120px;[\s\S]*?height:\s*120px;/);
  assert.match(menu, /<animateTransform[^>]+dur="10s"[^>]+repeatCount="indefinite"/);
  assert.match(js, /const HOP_MS = 2500/);
  assert.match(js, /const HOPS = 5/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /drawer\.inert = !open/);
  assert.match(mode, /href="\/modo-imersivo\/" data-omega-portal/);
  assert.doesNotMatch(mode, /class="serious-omega-caption"/);
  assert.match(mode, /const modes = \['authorial', 'editorial', 'legacy'\];/);
});
