#!/usr/bin/env node
// Behaviour tests for the Last.fm proxy in functions/api/music/recent.js.
// No dependencies: fetch and the Workers cache are replaced with stubs.
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/music/recent.js';

const KEY = 'secret-key-123';
const USER = 'someone';
const env = { LASTFM_API_KEY: KEY, LASTFM_USERNAME: USER };

const cacheLookups = [];
const cachePuts = [];
globalThis.caches = {
  default: {
    match: async (request) => {
      cacheLookups.push(request.url);
      return undefined;
    },
    put: async (request) => {
      cachePuts.push(request.url);
    },
  },
};

let fetchCalls = [];
function stubFetch(impl) {
  fetchCalls = [];
  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url: String(url), options });
    return impl(url, options);
  };
}

async function call(url = 'https://kaue.pages.dev/api/music/recent', environment = env) {
  const waits = [];
  const response = await onRequestGet({
    request: new Request(url),
    env: environment,
    waitUntil: (promise) => waits.push(promise),
  });
  await Promise.all(waits);
  const body = await response.json();
  return { response, body, raw: JSON.stringify(body) };
}

const lastfmOk = (track) =>
  Response.json({ recenttracks: { '@attr': { user: USER }, track: [track] } });

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('missing credentials -> 503, no upstream call, not cached', async () => {
  stubFetch(() => assert.fail('must not call Last.fm'));
  const { response, body } = await call(undefined, {});
  assert.equal(response.status, 503);
  assert.equal(body.configured, false);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(fetchCalls.length, 0);
});

test('success -> normalized track, public cache headers, key never in body', async () => {
  stubFetch(() =>
    lastfmOk({
      name: 'Money',
      artist: { '#text': 'Pink Floyd' },
      album: { '#text': 'The Dark Side of the Moon' },
      image: [
        { '#text': 'https://lastfm.freetls.fastly.net/small.jpg' },
        { '#text': 'https://lastfm.freetls.fastly.net/large.jpg' },
      ],
      url: 'https://www.last.fm/music/Pink+Floyd/_/Money',
      '@attr': { nowplaying: 'true' },
    }),
  );
  const { response, body, raw } = await call();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.track.name, 'Money');
  assert.equal(body.track.artist, 'Pink Floyd');
  assert.equal(body.track.nowPlaying, true);
  assert.equal(body.track.artwork, 'https://lastfm.freetls.fastly.net/large.jpg');
  assert.match(response.headers.get('Cache-Control'), /s-maxage=60/);
  assert.ok(!raw.includes(KEY), 'API key leaked into the response');
});

test('upstream call has a timeout signal', async () => {
  stubFetch(() => lastfmOk({ name: 'x', artist: { '#text': 'y' } }));
  await call();
  assert.ok(fetchCalls[0].options.signal instanceof AbortSignal);
});

test('non-https artwork and url are dropped', async () => {
  stubFetch(() =>
    lastfmOk({
      name: 'x',
      artist: { '#text': 'y' },
      image: [{ '#text': 'javascript:alert(1)' }, { '#text': 'http://insecure.example/a.jpg' }],
      url: 'javascript:alert(1)',
    }),
  );
  const { body } = await call();
  assert.equal(body.track.artwork, null);
  assert.equal(body.track.url, null);
});

test('long text is clipped', async () => {
  stubFetch(() => lastfmOk({ name: 'n'.repeat(5000), artist: { '#text': 'a' } }));
  const { body } = await call();
  assert.equal(body.track.name.length, 200);
});

test('upstream error -> 502 with a generic message, no upstream text or code', async () => {
  stubFetch(() => Response.json({ error: 10, message: 'Invalid API key - leaked detail' }, { status: 403 }));
  const { response, body, raw } = await call();
  assert.equal(response.status, 502);
  assert.equal(body.ok, false);
  assert.ok(!raw.includes('leaked detail'));
  assert.ok(!('error' in body));
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('network failure -> 500 with a generic message, no internals', async () => {
  stubFetch(() => {
    throw new Error('connect ECONNREFUSED 10.1.2.3:443');
  });
  const { response, raw } = await call();
  assert.equal(response.status, 500);
  assert.ok(!raw.includes('ECONNREFUSED'));
  assert.ok(!raw.includes('10.1.2.3'));
});

test('timeout abort -> 500, still generic', async () => {
  stubFetch(() => {
    throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  });
  const { response, raw } = await call();
  assert.equal(response.status, 500);
  assert.ok(!raw.includes('timeout'));
});

test('cache key ignores the query string', async () => {
  cacheLookups.length = 0;
  cachePuts.length = 0;
  stubFetch(() => lastfmOk({ name: 'x', artist: { '#text': 'y' } }));
  await call('https://kaue.pages.dev/api/music/recent?bust=123456');
  assert.deepEqual(cacheLookups, ['https://kaue.pages.dev/api/music/recent']);
  assert.deepEqual(cachePuts, ['https://kaue.pages.dev/api/music/recent']);
});

test('empty history -> ok with null track', async () => {
  stubFetch(() => Response.json({ recenttracks: { track: [] } }));
  const { response, body } = await call();
  assert.equal(response.status, 200);
  assert.equal(body.track, null);
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name}\n     ${error.message}`);
  }
}
console.log(`\nMusic API tests: ${tests.length - failed}/${tests.length} passed.`);
process.exit(failed ? 1 : 0);
