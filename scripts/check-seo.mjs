// SEO contract: public pages are indexable; experiments and 404 are not.
// This is a source-level check by default. Pass --dist after astro build to
// validate generated HTML too, without contacting an external search engine.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = path => readFileSync(join(ROOT, path), 'utf8');
const siteConfig = read('src/config.ts');
const site = siteConfig.match(/^\s*url:\s*'([^']+)'/m)?.[1];
assert.ok(site, 'Missing SITE.url');
assert.equal(new URL(site).protocol, 'https:');
assert.equal(new URL(site).pathname, '/', 'SITE.url must be a host URL');
const base = new URL('/', site).toString();

const sitemap = read('public/sitemap.xml');
const sitemapPaths = ['/', '/curiosidades/', '/sophia/'];
const expectedUrls = sitemapPaths.map(path => new URL(path, base).toString());
const urls = [...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m => m[1].trim());
assert.deepEqual(urls, expectedUrls, 'Sitemap must list exactly the three public indexable pages');
assert.equal(new Set(urls).size, urls.length, 'Duplicate URLs in sitemap');
assert.doesNotMatch(sitemap, /<(?:lastmod|changefreq|priority)>/i,
  'Do not publish guessed dates or ignored frequency/priority metadata');

const robots = read('public/robots.txt');
assert.ok(robots.includes('User-agent: *') && robots.includes('Allow: /'),
  'Public pages must remain crawlable');
assert.ok(robots.includes('Sitemap: ' + new URL('/sitemap.xml', base).toString()),
  'Robots sitemap and canonical origin must agree');

const headers = read('public/_headers');
const globalHeaders = headers.split(/\r?\n\r?\n/)[0];
assert.doesNotMatch(globalHeaders, /^\s*X-Robots-Tag:/mi,
  'Global indexing header can contradict noindex on experiments and 404');
assert.match(headers, /\/experimentos\/\*\s*\r?\n\s*X-Robots-Tag:\s*noindex,\s*nofollow/i);
assert.match(headers, /\/modo-imersivo\*\s*\r?\n\s*X-Robots-Tag:\s*noindex,\s*nofollow/i);

const head = read('src/components/BaseHead.astro');
assert.match(head, /const isNotFound =/);
assert.match(head, /isNotFound \|\| isUnlistedStage \? 'noindex/);
assert.match(head, /!isNotFound && <link rel="canonical"/);
assert.match(head, /application\/ld\+json/);

const sk = read('src/pages/experimentos/sk/index.astro');
assert.match(sk, /<meta\s+name="robots"\s+content="noindex,\s*nofollow,\s*noarchive"\s*\/>/i,
  'Shorekeeper experiment must not ask crawlers to index private-lab copy');

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)]
      .map(([, key, , val]) => [key.toLowerCase(), val.replaceAll('&amp;', '&')])
  );
}
function meta(html, key) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const a = attributes(tag);
    if (a.name === key || a.property === key) return a.content ?? null;
  }
  return null;
}
function canonical(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const a = attributes(tag);
    if (a.rel === 'canonical') return a.href ?? null;
  }
  return null;
}
function pathOf(url) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, new URL(base).origin, 'Wrong canonical origin: ' + url);
  assert.equal(parsed.search, '', 'Canonical should omit query parameters');
  assert.equal(parsed.hash, '', 'Canonical should omit fragment');
  return parsed.pathname.replace(/\/$/, '') || '/';
}

if (process.argv.includes('--dist')) {
  const distSitemap = read('dist/sitemap.xml');
  assert.equal(distSitemap, sitemap, 'Built sitemap differs from source');

  const titles = new Set();
  for (const pathname of sitemapPaths) {
    const file = pathname === '/' ? 'dist/index.html' : 'dist' + pathname + 'index.html';
    const html = read(file);
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    assert.ok(title && title.length >= 12, 'Missing page title: ' + pathname);
    assert.ok(!titles.has(title), 'Duplicate title: ' + title);
    titles.add(title);
    assert.ok(meta(html, 'description')?.length >= 40, 'Weak/missing description: ' + pathname);
    assert.match(meta(html, 'robots') ?? '', /\bindex,\s*follow\b/i);
    assert.doesNotMatch(meta(html, 'robots') ?? '', /\bnoindex\b/i);
    assert.equal(pathOf(canonical(html)), pathname.replace(/\/$/, '') || '/', 'Bad canonical: ' + pathname);
    assert.equal(pathOf(meta(html, 'og:url')), pathname.replace(/\/$/, '') || '/', 'Bad OG URL: ' + pathname);
    assert.equal(meta(html, 'og:title'), meta(html, 'twitter:title'), 'Social title mismatch');
    assert.equal(meta(html, 'og:description'), meta(html, 'twitter:description'), 'Social description mismatch');
    assert.ok(meta(html, 'og:image')?.startsWith(base), 'Off-domain OG image: ' + pathname);
    assert.match(html, /<html\b[^>]*\blang="pt-BR"/i);
    if (pathname !== '/') {
      assert.doesNotMatch(html, /type="application\/ld\+json"/i, 'Only the home page declares identity schema');
    }
  }

  const home = read('dist/index.html');
  const jsonLd = [...home.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(jsonLd.length, 1, 'Home must contain one JSON-LD identity graph');
  const graph = JSON.parse(jsonLd[0][1]);
  assert.equal(graph['@context'], 'https://schema.org');
  const person = graph['@graph']?.find(node => node['@type'] === 'Person');
  const website = graph['@graph']?.find(node => node['@type'] === 'WebSite');
  assert.ok(person?.name && person?.url === base, 'Person identity missing');
  assert.ok(website?.url === base && website?.author?.['@id'] === person['@id'],
    'WebSite must point to public author identity');

  for (const file of ['dist/404.html', 'dist/experimentos/index.html',
    'dist/experimentos/sk/index.html', 'dist/experimentos/duo/index.html',
    'dist/modo-imersivo/index.html']) {
    const html = read(file);
    assert.match(meta(html, 'robots') ?? '', /\bnoindex\b/i, file + ' is indexable');
    if (file === 'dist/404.html') {
      assert.equal(canonical(html), null, '404 must not present a canonical URL');
    }
  }

  console.log('SEO dist: PASS (three public routes, canonical, share metadata, JSON-LD, 404 and experimental noindex)');
}
console.log('SEO source: PASS (sitemap, robots, headers, Shorekeeper policy)');
