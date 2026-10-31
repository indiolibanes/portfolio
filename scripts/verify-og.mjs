// Guard the editorial Sophia share card and its metadata.
// Run before a build for source checks; pass --dist to inspect generated pages.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = relativePath => readFileSync(join(ROOT, relativePath), 'utf8');
const config = read('src/config.ts');
const head = read('src/components/BaseHead.astro');
const generator = read('scripts/generate-og.mjs');
const matchConfig = name => {
  const matched = config.match(new RegExp('\\b' + name + ':\\s*\'([^\']+)\''));
  assert.ok(matched, 'Missing SITE.' + name);
  return matched[1];
};
const site = matchConfig('url');
const imagePath = matchConfig('ogImage');
const alt = matchConfig('ogImageAlt');
const expectedImage = new URL(imagePath, site).toString();

assert.equal(new URL(site).protocol, 'https:');
assert.match(imagePath, /^\/og-portfolio\.jpg\?v=[\w-]+$/);
assert.match(alt, /Sophia/i);
assert.doesNotMatch(alt, /não ironicamente/i);
assert.match(alt, /pata erguida/i);
assert.match(alt, /mundos possíveis/i);
assert.match(alt, /óculos/i);
assert.match(head, /property="og:site_name"/);
assert.match(head, /property="og:image:alt"[\s\S]*?content=\{SITE\.ogImageAlt\}/);
assert.match(head, /name="twitter:image:alt"[\s\S]*?content=\{SITE\.ogImageAlt\}/);
assert.ok(!/og-portfolio-animated\.gif/.test(head + config), 'GIF must not replace the JPG as an OG image');
assert.match(generator, /sharp\('assets\/og-portfolio\.png'\)/);
assert.match(generator, /\.composite\(/);
assert.match(generator, /PORTFÓLIO \/ LABORATÓRIO AUTORAL/);
assert.match(generator, /e mundos possíveis\./);
assert.doesNotMatch(generator, /não ironicamente/i);
assert.match(generator, /toFile\('public\/og-portfolio\.jpg'\)/);
assert.ok(!existsSync(join(ROOT, 'assets/og-portfolio.svg')), 'Old OG SVG must not be revived');

const png = readFileSync(join(ROOT, 'assets/og-portfolio.png'));
assert.ok(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Source OG image is not PNG');
assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630], 'Source PNG dimensions');
const gif = readFileSync(join(ROOT, 'public/og-portfolio-animated.gif'));
assert.match(gif.toString('ascii', 0, 6), /^GIF8[79]a$/);
assert.deepEqual([gif.readUInt16LE(6), gif.readUInt16LE(8)], [800, 420], 'Optional GIF dimensions');
console.log('OG source: PASS (editorial Sophia card, PNG 1200x630, optional legacy GIF 800x420, metadata wired)');

if (process.argv.includes('--dist')) {
  const distPath = join(ROOT, 'dist');
  const jpgPath = join(distPath, 'og-portfolio.jpg');
  assert.ok(existsSync(jpgPath), 'Missing generated dist/og-portfolio.jpg');
  const { default: sharp } = await import('sharp');
  const img = await sharp(jpgPath).metadata();
  assert.equal(img.format, 'jpeg');
  assert.deepEqual([img.width, img.height], [1200, 630]);
  assert.ok(statSync(jpgPath).size > 1000 && statSync(jpgPath).size < 1000000, 'JPG filesize looks suspicious');

  function attributes(tag) {
    return Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)]
        .map(([, key, , value]) => [key, value.replaceAll('&amp;', '&')])
    );
  }
  function meta(html, key, attr = 'property') {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      const a = attributes(tag);
      if (a[attr] === key) return a.content ?? null;
    }
    return null;
  }
  function canonical(html) {
    for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
      const a = attributes(tag);
      if (a.rel === 'canonical') return a.href;
    }
    return null;
  }
  for (const [page, pathname] of [['index.html', '/'], ['sophia/index.html', '/sophia/'], ['curiosidades/index.html', '/curiosidades/']]) {
    const html = readFileSync(join(distPath, page), 'utf8');
    assert.equal(meta(html, 'og:type'), 'website', page);
    assert.equal(meta(html, 'og:locale'), 'pt_BR', page);
    assert.equal(meta(html, 'og:site_name'), 'Portfólio de Kauê Alencar', page);
    assert.equal(meta(html, 'og:image'), expectedImage, page);
    assert.equal(meta(html, 'twitter:image', 'name'), expectedImage, page);
    assert.equal(meta(html, 'og:image:type'), 'image/jpeg', page);
    assert.equal(meta(html, 'og:image:width'), '1200', page);
    assert.equal(meta(html, 'og:image:height'), '630', page);
    assert.equal(meta(html, 'twitter:card', 'name'), 'summary_large_image', page);
    assert.equal(meta(html, 'og:image:alt'), alt, page);
    assert.equal(meta(html, 'twitter:image:alt', 'name'), alt, page);
    assert.equal(new URL(meta(html, 'og:url')).pathname.replace(/\/$/, ''), pathname.replace(/\/$/, ''), page);
    assert.equal(new URL(meta(html, 'og:url')).origin, new URL(site).origin, page);
    assert.equal(canonical(html), meta(html, 'og:url'), page);
    assert.equal(meta(html, 'og:title'), meta(html, 'twitter:title', 'name'), page);
    assert.equal(meta(html, 'og:description'), meta(html, 'twitter:description', 'name'), page);
    assert.ok(meta(html, 'og:title')?.length > 3, 'Missing OG title on ' + page);
    assert.ok(meta(html, 'og:description')?.length > 20, 'Missing OG description on ' + page);
    assert.ok(!html.includes('property="og:image" content="' + new URL('/og-portfolio-animated.gif', site).toString()), 'GIF leaked into OG on ' + page);
    console.log('OG ' + page + ': PASS');
  }
  console.log('OG dist: PASS (JPEG format/dimensions and home/Sophia metadata)');
}