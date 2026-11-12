import test from 'node:test';
import assert from 'node:assert/strict';
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
