import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { R3, sampleImmersiveR3At } from '../src/scripts/sophia-immersive-r3-timeline.mjs';

test('countdown holds zero briefly while the release and lift take place', () => {
  assert.equal(sampleImmersiveR3At(R3.countdown - .001).countdownDigit, null);
  assert.equal(sampleImmersiveR3At(R3.countdown).countdownDigit, 5);
  assert.equal(sampleImmersiveR3At(R3.launch).countdownDigit, 0);
  const lifting = sampleImmersiveR3At(R3.launch + .319);
  assert.equal(lifting.countdownDigit, 0);
  assert.ok(lifting.release > 0 && lifting.height > 0);
  assert.equal(sampleImmersiveR3At(R3.launch + .32).countdownDigit, null);
});
test('HUD leaves the 3D controls available and reads from the launch clock', async () => {
  const page = await readFile('src/pages/modo-imersivo.astro', 'utf8');
  const runtime = await readFile('src/scripts/sophia-immersive-runtime.ts', 'utf8');
  assert.match(page, /\.immersive__launch-hud \{[^}]*pointer-events: none;/);
  assert.doesNotMatch(page, /\.immersive__launch-hud \{[^}]*inset:\s*0;/);
  assert.match(runtime, /hud\.hidden=digit===null/);
  assert.match(runtime, /const t=clock\.read\(now\),sample=updateHud\(t\);\s*director\.apply\(t,cameraDt\)/);
});
test('Omega is a distinct navigational portal and keeps the other three reading modes', async () => {
  const component = await readFile('src/components/SeriousModeToggle.astro', 'utf8');
  assert.match(component, /const showOmega = Astro\.url\.pathname === '\/' \|\| isCreativeLanding;/);
  assert.match(component, /const modes = \['authorial', 'editorial', 'documentation'\];/);
  assert.match(component, /data-omega-portal/);
  assert.match(component, /href="\/modo-imersivo\/"/);
  assert.doesNotMatch(component, /serious-omega-caption|\[EXPERIMENTAL\]/);
  assert.match(component, /aria-label="Ω — Modo Imersivo Experimental/);
  assert.match(component, /omega-core-supernova/);
  assert.match(component, /if \(reducedMotion\.matches \|\| !omegaTransition\) return/);
  const header = await readFile('src/components/PortfolioHeader.astro', 'utf8');
  assert.match(header, /<SeriousModeToggle \/>/);
});
