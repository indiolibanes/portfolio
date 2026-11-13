import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { R3, sampleImmersiveR3At } from '../src/scripts/sophia-immersive-r3-timeline.mjs';

test('full-screen countdown hides rocket through the final zero', () => {
  for (const t of [0, R3.reveal, R3.countdown, R3.launch - .001, R3.launch, R3.launch + .319]) {
    const s = sampleImmersiveR3At(t);
    assert.equal(s.rocketVisible, false, 'rocket became visible at ' + t);
  }
  assert.equal(sampleImmersiveR3At(R3.launch).countdownDigit, 0);
  assert.equal(sampleImmersiveR3At(R3.launch + .319).countdownDigit, 0);
  assert.equal(sampleImmersiveR3At(R3.launch + .32).rocketVisible, true);
  assert.equal(sampleImmersiveR3At(R3.launch + .32).countdownDigit, null);
});
test('HUD occupies whole viewport and uses only the one launch clock', async () => {
  const page = await readFile('src/pages/modo-imersivo.astro', 'utf8');
  const runtime = await readFile('src/scripts/sophia-immersive-runtime.ts', 'utf8');
  const director = await readFile('src/scripts/sophia-launch-director.ts', 'utf8');
  assert.match(page, /\.immersive__launch-hud \{[^}]*inset:\s*0;[^}]*width:\s*100vw;[^}]*height:\s*100vh;[^}]*height:\s*100dvh;/);
  assert.match(page, /font:400 min\(82vw,76dvh\)/);
  assert.match(runtime, /hud\.hidden=s\.rocketVisible/);
  assert.match(runtime, /const t=clock\.read\(now\),s=updateHud\(t\);director\.apply\(t,cameraDt\)/);
  assert.match(director, /carrier\.visible=s\.rocketVisible;pad\.group\.visible=s\.rocketVisible/);
  assert.match(director, /root\.visible=s\.rocketVisible/);
});
test('Omega is a distinct navigational portal and keeps the other three reading modes', async () => {
  const component = await readFile('src/components/SeriousModeToggle.astro', 'utf8');
  assert.match(component, /const showOmega = Astro\.url\.pathname === '\/';/);
  assert.match(component, /const modes = \['authorial', 'editorial', 'legacy'\];/);
  assert.match(component, /data-omega-portal/);
  assert.match(component, /href="\/modo-imersivo\/"/);
  assert.doesNotMatch(component, /serious-omega-caption|\[EXPERIMENTAL\]/);
  assert.match(component, /aria-label="Ω — Modo Imersivo Experimental/);
  assert.match(component, /omega-core-supernova/);
  assert.match(component, /if \(reducedMotion\.matches \|\| !omegaTransition\) return/);
  const header = await readFile('src/components/PortfolioHeader.astro', 'utf8');
  assert.match(header, /<SeriousModeToggle \/>/);
});
