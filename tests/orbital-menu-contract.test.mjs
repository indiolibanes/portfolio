import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const menu = read('src/components/ExperimentalMenu.astro');
const header = read('src/components/PortfolioHeader.astro');
const base = read('src/layouts/BaseLayout.astro');
const immersive = read('src/pages/modo-imersivo.astro');
const mode = read('src/components/SeriousModeToggle.astro');
const css = read('src/styles/experimental.css');
const js = read('public/scripts/experimental-menu.js');

test('Authorial uses the shared orbital drawer to the left of the existing reading-mode switcher', () => {
  assert.match(header, /<ExperimentalMenu variant="authorial" \/>/);
  assert.ok(header.indexOf('<ExperimentalMenu variant="authorial" />') < header.indexOf('<SeriousModeToggle />'));
  assert.match(base, /import '\.\.\/styles\/experimental\.css';/);
  assert.match(css, /\.xm-header--authorial\s*\{[\s\S]*?flex:\s*0 0 112px/);
  assert.match(header, /html\[data-xm-js='true'\]:not\(\[data-serious-mode='true'\]\):not\(\[data-legacy-mode='true'\]\) \.site-header :is\(\.nav-menu-toggle, \.nav-sections\)/);
  assert.match(header, /@media \(max-width: 820px\)/);
  assert.match(header, /@media \(max-width: 370px\)/);
  assert.match(css, /html:not\(\[data-xm-js='true'\]\) \.site-header \.xm-header--authorial \{ display: none; \}/);
});

test('Immersivo has only three other modes, not the periodic navigation, plus social/contact icons', () => {
  assert.match(immersive, /<ExperimentalMenu \/>/);
  assert.match(menu, /const \{ variant = 'immersive' \} = Astro\.props;/);
  assert.match(menu, /\{immersive \? \(/);
  assert.match(menu, /class="xm-mode-nav" aria-label="Outros modos de leitura"/);
  for (const [id, href] of [['authorial', '/'], ['editorial', '/?mode=editorial'], ['legacy', '/?mode=legacy']]) {
    assert.match(menu, new RegExp('"id": "' + id + '"'));
    assert.ok(menu.includes('"href": "' + href + '"'), 'Expected mode destination: ' + href);
  }
  assert.doesNotMatch(menu, /"id": "immersive"/);
  assert.match(menu, /data-xm-mode=\{choice\.id\}/);
  assert.match(css, /\.xm-mode-nav\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, 64px\)/);
  assert.match(menu, /href=\{SOCIALS\.github\}/);
  assert.match(menu, /href=\{SOCIALS\.lastfm\}/);
  assert.match(menu, /href=\{PROFILE\.linkedin\}/);
  assert.match(menu, /href=\{PROFILE\.whatsapp\}/);
  assert.match(menu, /href=\{\`mailto:\$\{PROFILE\.email\}\`\}/);
});

test('Orbital geometry and animations remain unchanged', () => {
  assert.match(css, /--xm-size:\s*56px/);
  assert.match(css, /--xm-orbit-period:\s*10s/);
  assert.match(css, /--xm-open:\s*500ms/);
  assert.match(css, /\.xm-orbit\s*\{[\s\S]*?width:\s*120px;[\s\S]*?height:\s*120px;/);
  assert.match(menu, /<animateTransform[^>]+dur="10s"[^>]+repeatCount="indefinite"/);
  assert.match(js, /const HOP_MS = 2500/);
  assert.match(js, /const HOPS = 5/);
  assert.match(js, /const keepDrawerInView =/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /drawer\.inert = !open/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('Omega remains a portal with no experimental caption in visible header', () => {
  assert.match(mode, /href="\/modo-imersivo\/" data-omega-portal/);
  assert.doesNotMatch(mode, /class="serious-omega-caption"/);
  assert.doesNotMatch(mode, /\[EXPERIMENTAL\]/);
  assert.match(mode, /\.serious-stage\.has-omega\s*\{[\s\S]*?height:\s*var\(--side\)/);
  assert.match(mode, /const modes = \['authorial', 'editorial', 'legacy'\];/);
});
