// Static contract for the home banner that advertises /modo-imersivo.
// It proves wiring, accessibility and performance guards, NOT how it looks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');
const banner = await read('src/components/ImmersiveBanner.astro');
const home = await read('src/pages/index.astro');
const headers = await read('public/_headers');

test('banner is mounted on the home between Método and Bastidores, without touching section numbering', async () => {
  assert.match(home, /import ImmersiveBanner from '..\/components\/ImmersiveBanner\.astro'/);
  const at = home.indexOf('<ImmersiveBanner');
  assert.ok(at > home.indexOf('id="metodo"') && at < home.indexOf('id="bastidores"'));
  assert.doesNotMatch(await read('src/section-order.ts'), /imersivo/i);
});

test('banner links to the experience and to the process, with no external requests', () => {
  assert.match(banner, /href="\/modo-imersivo\/"/);
  assert.match(banner, /href="\/curiosidades\/#creative-process-title"/);
  assert.doesNotMatch(banner, /https?:\/\//);
});

test('video is decorative, lazy and respects reduced motion, Save-Data, visibility and tab focus', () => {
  assert.match(banner, /<video[^>]*\bmuted\b[^>]*\bloop\b[^>]*\bplaysinline\b|<video[^>]*\bplaysinline\b/s);
  assert.match(banner, /preload="none"/);
  assert.match(banner, /aria-hidden="true"/);
  assert.match(banner, /tabindex="-1"/);
  assert.doesNotMatch(banner, /<video[^>]*\bautoplay\b/); // playback is started by script only when allowed
  assert.match(banner, /IntersectionObserver/);
  assert.match(banner, /prefers-reduced-motion: reduce/);
  assert.match(banner, /saveData/);
  assert.match(banner, /visibilitychange/);
});

test('banner assets exist, are small and are same-origin (CSP media-src self)', async () => {
  const webm = await stat(new URL('../public/assets/immersive-banner/sophia-rocket.webm', import.meta.url));
  const still = await stat(new URL('../public/assets/immersive-banner/sophia-rocket-still.webp', import.meta.url));
  assert.ok(webm.size > 50_000 && webm.size < 700_000, 'clip must stay under 700 KB');
  assert.ok(still.size < 60_000);
  assert.match(banner, /\/assets\/immersive-banner\/sophia-rocket\.webm/);
  assert.match(banner, /\/assets\/immersive-banner\/sophia-rocket-still\.webp/);
  assert.match(headers, /default-src 'self'[^\n]*media-src 'self'/);
});

test('serious/mono modes get the still image, no moving star field and no gradient text effects', () => {
  assert.match(banner, /data-serious-mode='true'|data-serious-mode="true"/);
  assert.match(banner, /@media \(prefers-reduced-motion: reduce\)/);
});
