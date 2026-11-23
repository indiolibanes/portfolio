import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/neumorphic.css', import.meta.url), 'utf8');
const mobile = css.split('@media (max-width: 720px) {')[1]?.split("\n}")[0];
const contact = mobile?.match(/html\[data-documentation-mode='true'\] body \.closing \{([\s\S]*?)\n  \}/)?.[1];

test('documentation-mode contact orbit keeps a centred viewport-scaled mobile still', () => {
  assert.ok(contact, 'the mobile documentation contact rule must exist');
  assert.match(contact, /--contact-orbit-art-height:\s*clamp\(15rem,\s*76vw,\s*22rem\)/);
  assert.match(contact, /--contact-orbit-art-offset:\s*clamp\(6\.4rem,\s*32\.5vw,\s*9\.4rem\)/);
  assert.match(contact, /url\('\/assets\/neumorphic-contact-orbit\.webp'\)\s*calc\(50% - var\(--contact-orbit-art-offset\)\) bottom\s*\/\s*auto var\(--contact-orbit-art-height\) no-repeat/);
  assert.doesNotMatch(contact, /78% bottom/);
  assert.match(contact, /padding-bottom:\s*12rem !important/);
});

test('background orbit is approximately centred across phone and tablet widths', () => {
  // Landscape asset is 1178 x 640; orbit's visual centre is ~73% across it.
  const clamp = (minimum, candidate, maximum) => Math.min(maximum, Math.max(minimum, candidate));
  for (const viewport of [320, 360, 390, 430, 720]) {
    const artHeight = clamp(15 * 16, viewport * .76, 22 * 16);
    const artOffset = clamp(6.4 * 16, viewport * .325, 9.4 * 16);
    const artWidth = artHeight * 1178 / 640;
    const errorFromCentre = (.73 - .5) * artWidth - artOffset;
    assert.ok(Math.abs(errorFromCentre) < 7, `orbit should be centred at ${viewport}px (error ${errorFromCentre.toFixed(1)}px)`);
  }
});

test('desktop documentation image positioning is left untouched', () => {
  assert.match(css, /url\('\/assets\/neumorphic-contact-orbit\.webp'\) right center \/ cover no-repeat/);
});
