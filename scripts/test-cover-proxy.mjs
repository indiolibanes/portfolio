// Behaviour tests for the album-cover proxy in functions/api/music/cover.js.
// Run with: node scripts/test-cover-proxy.mjs
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/music/cover.js';

const HOST = 'https://lastfm.freetls.fastly.net';
let passed = 0;
const calls = [];
const png = new Uint8Array([137, 80, 78, 71]);

async function run(name, fn) { await fn(); passed += 1; console.log(`PASS ${name}`); }
const call = (u) => onRequestGet({ request: new Request('https://kaue.pages.dev/api/music/cover' + (u === undefined ? '' : `?u=${encodeURIComponent(u)}`)) });

globalThis.fetch = async (url) => {
  calls.push(String(url));
  if (String(url).includes('/ar0/')) return new Response(null, { status: 404 });
  return new Response(png, { status: 200, headers: { 'content-type': 'image/png' } });
};

await run('rejects a missing or malformed url', async () => {
  assert.equal((await call()).status, 400);
  assert.equal((await call('not a url')).status, 400);
});
await run('rejects any host but the Last.fm CDN (no open proxy)', async () => {
  for (const bad of ['https://evil.example/i/u/300x300/a.png', 'http://lastfm.freetls.fastly.net/i/u/300x300/a.png', 'https://lastfm.freetls.fastly.net.evil.example/i/u/a.png', 'https://user:pw@lastfm.freetls.fastly.net/i/u/a.png', 'https://lastfm.freetls.fastly.net:8443/i/u/a.png']) {
    assert.equal((await call(bad)).status, 403, bad);
  }
  assert.equal(calls.length, 0);
});
await run('rejects paths outside /i/u/', async () => {
  assert.equal((await call(`${HOST}/other/a.png`)).status, 403);
});
await run('asks for the original first and falls back to the given size', async () => {
  const res = await call(`${HOST}/i/u/300x300/abc.png?x=1`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.match(res.headers.get('cache-control'), /max-age=86400/);
  assert.deepEqual(calls, [`${HOST}/i/u/ar0/abc.png`, `${HOST}/i/u/300x300/abc.png`]);
});
await run('refuses non-image and svg responses', async () => {
  globalThis.fetch = async () => new Response('<svg/>', { status: 200, headers: { 'content-type': 'image/svg+xml' } });
  assert.equal((await call(`${HOST}/i/u/300x300/abc.png`)).status, 502);
  globalThis.fetch = async () => new Response('hi', { status: 200, headers: { 'content-type': 'text/html' } });
  assert.equal((await call(`${HOST}/i/u/300x300/abc.png`)).status, 502);
});
console.log(`\nCover proxy tests: ${passed}/5 passed.`);
