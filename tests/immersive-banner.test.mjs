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

test('Voo Prismático is a decorative, lazy WebP with a static fallback', () => {
  assert.match(banner, /Sophia — <span[^>]+>Voo Prismático<\/span>/);
  assert.match(banner, /<img\s+class="immersive-banner__art"/);
  assert.match(banner, /loading="lazy"/);
  assert.match(banner, /aria-hidden="true"/);
  assert.match(banner, /tabindex="-1"/);
  assert.match(banner, /alt=""/);
  assert.doesNotMatch(banner, /<video\b/);
  assert.match(banner, /src="\/assets\/immersive-banner\/sophia-voo-prismatico-poster\.webp"/);
  assert.match(banner, /data-animated-srcset=/);
  assert.match(banner, /IntersectionObserver/);
  assert.match(banner, /prefers-reduced-motion: reduce/);
  assert.match(banner, /saveData/);
  assert.match(banner, /visibilitychange/);
  assert.match(banner, /data-serious-mode/);
  assert.match(banner, /art\.removeAttribute\('srcset'\)/);
  assert.match(banner, /object-fit: contain/);
  assert.match(banner, /aspect-ratio: 2 \/ 1/);
});

test('responsive animations exist, are animated WebPs, and remain same-origin', async () => {
  const dir = '../public/assets/immersive-banner/sophia-voo-prismatico-';
  for (const [name, limit] of [['480', 1_400_000], ['768', 3_000_000], ['960', 4_800_000]]) {
    const path = new URL(`${dir}${name}.webp`, import.meta.url);
    const size = await stat(path);
    const content = await readFile(path);
    assert.ok(size.size > 50_000 && size.size < limit, `WebP ${name} is within budget`);
    assert.equal(content.toString('ascii', 0, 4), 'RIFF');
    assert.equal(content.toString('ascii', 8, 12), 'WEBP');
    assert.ok(content.includes(Buffer.from('ANIM')), `WebP ${name} has an animation chunk`);
    assert.match(banner, new RegExp(`/assets/immersive-banner/sophia-voo-prismatico-${name}\\.webp`));
  }
  const poster = await stat(new URL(`${dir}poster.webp`, import.meta.url));
  assert.ok(poster.size < 60_000);
  assert.match(headers, /default-src 'self'[^\n]*media-src 'self'/);
});

test('serious/mono modes get the still image, no moving star field and no gradient text effects', () => {
  assert.match(banner, /data-serious-mode='true'|data-serious-mode="true"/);
  assert.match(banner, /@media \(prefers-reduced-motion: reduce\)/);
});
