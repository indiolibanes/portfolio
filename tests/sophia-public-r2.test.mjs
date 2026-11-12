import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { onRequestGet, onRequestHead } from '../functions/api/sophia/rocket.js';

const key = 'sophia/models/Sophia_Astronaut_Rocket_v1.1.glb';

test('does not expose data without a bound R2 bucket', async () => {
  const response = await onRequestGet({ env: {} });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('public GET reads only the exact allowlisted Sophia model', async () => {
  const reads = [];
  const mock = {
    async get(name) {
      reads.push(name);
      return { size: 4, httpEtag: '"xyz"', body: new Response('glTF').body };
    },
  };
  const response = await onRequestGet({
    env: { SHOREKEEPER_ASSETS_R2: mock },
    request: new Request('https://example.test/api/sophia/rocket?key=characters/shorekeeper/models/private.glb'),
  });
  assert.deepEqual(reads, [key]);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'model/gltf-binary');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=3600');
  assert.equal(response.headers.get('etag'), '"xyz"');
  assert.equal(await response.text(), 'glTF');
});

test('HEAD retrieves metadata, never a model body', async () => {
  const reads = [];
  const mock = {
    async head(name) {
      reads.push(name);
      return { size: 16, httpEtag: '"head"' };
    },
    async get() { throw Error('GET must not be called'); },
  };
  const response = await onRequestHead({ env: { SHOREKEEPER_ASSETS_R2: mock } });
  assert.deepEqual(reads, [key]);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-length'), '16');
  assert.equal(response.body, null);
});

test('missing model does not expose private bucket inventory', async () => {
  const response = await onRequestGet({
    env: { SHOREKEEPER_ASSETS_R2: { async get() { return null; } } },
  });
  assert.equal(response.status, 404);
  assert.doesNotMatch(await response.text(), /shorekeeper|bucket key|private-assets/i);
});

test('finds the explicitly permitted nested-prefix object without reading other characters', async () => {
  const nested = 'private-assets/sophia/models/Sophia_Astronaut_Rocket_v1.1.glb';
  const reads = [];
  const bucket = {
    async get(key) {
      reads.push(key);
      return key === nested
        ? { size: 4, httpEtag: '"rocket"', body: new Response('glTF').body }
        : null;
    },
  };
  const response = await onRequestGet({
    env: { SHOREKEEPER_ASSETS_R2: bucket },
    request: new Request('https://example.test/api/sophia/rocket?key=characters/shorekeeper/private.glb'),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(reads, [key, nested]);
  assert.equal(await response.text(), 'glTF');
  assert.ok(reads.every(name => name.endsWith('/Sophia_Astronaut_Rocket_v1.1.glb')));
});

test('immersive route exclusively loads astronaut rocket, never old Sophia or local upload', async () => {
  const file = await readFile(new URL('../src/pages/experimentos/modo-imersivo.astro', import.meta.url), 'utf8');
  assert.match(file, /const astronautAssetUrl = '\/api\/sophia\/rocket'/);
  assert.doesNotMatch(file, /sophia-7b-e1-latest\.glb|fallbackUrl|type="file"|fileInput/);
  assert.match(file, /retryButton\.addEventListener/);
});

test('scoped discovery finds an approved astronaut GLB in a nested Sophia folder', async () => {
  const nested = 'sophia/models/archive/Sophia_Astronaut_Rocket_v1.1.glb';
  const reads = [];
  const prefixes = [];
  const bucket = {
    async get(name) {
      reads.push(name);
      return name === nested
        ? { size: 4, body: new Response('glTF').body, httpEtag: '"found"' }
        : null;
    },
    async list({ prefix }) {
      prefixes.push(prefix);
      return {
        objects: [{ key: 'sophia/models/Not-Public.glb' }, { key: nested }],
        truncated: false,
      };
    },
  };
  const response = await onRequestGet({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'glTF');
  assert.deepEqual(prefixes, ['sophia/models/']);
  assert.ok(!reads.some(k => k.includes('shorekeeper') || k.includes('Not-Public')));
});

test('scoped discovery ignores unrelated models and never lists the entire bucket', async () => {
  const prefixes = [];
  const reads = [];
  const bucket = {
    async get(name) { reads.push(name); return null; },
    async list({ prefix }) {
      prefixes.push(prefix);
      return { objects: [{ key: 'characters/shorekeeper/models/private.glb' },
        { key: prefix + 'other-sophia.glb' }], truncated: false };
    },
  };
  const response = await onRequestGet({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  assert.equal(response.status, 404);
  assert.deepEqual(prefixes, ['sophia/models/', 'private-assets/sophia/models/']);
  assert.ok(reads.every(k => k.endsWith('/Sophia_Astronaut_Rocket_v1.1.glb')));
});

test('public immersive page reports remote 404 and 503 instead of a generic unavailable status', async () => {
  const file = await readFile(new URL('../src/pages/experimentos/modo-imersivo.astro', import.meta.url), 'utf8');
  assert.match(file, /method: 'HEAD'/);
  assert.match(file, /credentials: 'omit'/);
  assert.match(file, /response.status === 404/);
  assert.match(file, /response.status === 503/);
  assert.doesNotMatch(file, /temporariamente indisponível|sophia-7b-e1-latest\.glb|fileInput/);
});
