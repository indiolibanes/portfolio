import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { onRequestGet, onRequestHead } from '../functions/api/sophia/rocket.js';
import { onRequestGet as getSophiaStatus } from '../functions/api/sophia/status.js';

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
  assert.equal(response.headers.get('cache-control'), 'public, max-age=86400, stale-while-revalidate=604800');
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
  const page = await readFile(new URL('../src/pages/modo-imersivo.astro', import.meta.url), 'utf8');
  const file = page + await readFile(new URL('../src/scripts/sophia-immersive-runtime.ts', import.meta.url), 'utf8');
  assert.match(file, /const astronautAssetUrl = '\/api\/sophia\/rocket'/);
  assert.doesNotMatch(file, /sophia-7b-e1-latest\.glb|fallbackUrl|type="file"|fileInput/);
  assert.match(file, /retry\.addEventListener/);
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
  assert.deepEqual(prefixes, [
    'sophia/models/', 'private-assets/sophia/models/',
    'sophia/', 'private-assets/sophia/', undefined,
  ]);
  assert.ok(reads.every(k => k.endsWith('/Sophia_Astronaut_Rocket_v1.1.glb')));
});

test('public immersive page reports remote 404 and 503 instead of a generic unavailable status', async () => {
  const page = await readFile(new URL('../src/pages/modo-imersivo.astro', import.meta.url), 'utf8');
  const file = page + await readFile(new URL('../src/scripts/sophia-immersive-runtime.ts', import.meta.url), 'utf8');
  assert.match(file, /credentials:\s*'omit'/);
  assert.match(file, /response.status\s*===\s*404/);
  assert.match(file, /response.status\s*===\s*503/);
  assert.doesNotMatch(file, /temporariamente indisponível|sophia-7b-e1-latest\.glb|fileInput/);
});

test('public status shows EU-binding-visible prefix presence without revealing object keys', async () => {
  const listPaths = [];
  const bucket = {
    async head() { return null; },
    async list({ prefix }) {
      listPaths.push(prefix);
      return {
        objects: prefix === 'sophia/'
          ? [{ key: 'sophia/models/unrelated-private-name.glb' }]
          : [],
        truncated: false,
      };
    },
  };
  const response = await getSophiaStatus({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.state, 'model_not_located');
  assert.equal(body.direct.canonical, false);
  assert.equal(body.folders.find(x => x.scope === 'sophia_tree').hasObjects, true);
  assert.deepEqual(listPaths, [
    'sophia/models/', 'private-assets/sophia/models/',
    'sophia/', 'private-assets/sophia/', undefined,
  ]);
  assert.doesNotMatch(JSON.stringify(body), /unrelated-private-name|shorekeeper|private-assets/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('public status reports the precise allowlisted filename when found', async () => {
  const bucket = {
    async head(name) { return name === key ? { size: 46_000_000 } : null; },
    async list() { return { objects: [], truncated: false }; },
  };
  const response = await getSophiaStatus({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  const body = await response.json();
  assert.equal(body.state, 'model_located');
  assert.equal(body.direct.canonical, true);
});

test('status endpoint does not disclose config if binding is missing', async () => {
  const response = await getSophiaStatus({ env: {} });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { state: 'binding_unavailable' });
});

test('EU bucket probe distinguishes misplaced model from an entirely empty binding', async () => {
  const paths = [];
  const bucket = {
    async head() { return null; },
    async list({ prefix, limit }) {
      paths.push({prefix, limit});
      if (prefix === undefined) {
        return { objects: [{ key: 'an-unrelated-private-object' }], truncated: true };
      }
      return { objects: [], truncated: false };
    },
  };
  const response = await getSophiaStatus({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.state, 'model_not_located');
  assert.equal(body.bucketHasAnyObjects, true);
  assert.deepEqual(paths.at(-1), { prefix: undefined, limit: 1000 });
  assert.ok(!JSON.stringify(body).includes('an-unrelated-private-object'));
  assert.ok(!JSON.stringify(body).includes('shorekeeper'));
});

test('EU bucket probe reports empty bucket without leaking private metadata', async () => {
  const bucket = {
    async head() { return null; },
    async list() { return { objects: [], truncated: false }; },
  };
  const response = await getSophiaStatus({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  const body = await response.json();
  assert.equal(body.state, 'model_not_located');
  assert.equal(body.bucketHasAnyObjects, false);
});

test('root scan recovers the EXACT approved rocket file from a differently cased Sophia folder', async () => {
  const oddKey = 'Characters/SOPHIA/3D/SHARED/Sophia_Astronaut_Rocket_v1.1.GLB';
  const reads = [];
  const bucket = {
    async head() { return null; },
    async get(key) {
      reads.push(key);
      return key === oddKey
        ? { size: 4, body: new Response('glTF').body, httpEtag: '"astronaut"' }
        : null;
    },
    async list({ prefix }) {
      return prefix
        ? { objects: [], truncated: false }
        : { objects: [
          { key: 'characters/shorekeeper/models/top-secret.glb' },
          { key: oddKey },
        ], truncated: false };
    },
  };
  const response = await onRequestGet({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'glTF');
  assert.ok(!reads.some(key => key.includes('shorekeeper')));
  const status = await getSophiaStatus({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  const diagnostic = await status.json();
  assert.equal(diagnostic.state, 'model_located');
  assert.equal(diagnostic.rootScan.approvedModelFoundOutsideKnownPrefixes, true);
  assert.equal(diagnostic.rootScan.hasSophiaPathAnywhere, true);
  assert.doesNotMatch(JSON.stringify(diagnostic), /Characters|SHARED|top-secret/i);
});

test('root scan does not expose an unrelated GLB with the same name', async () => {
  const forbidden = 'characters/shorekeeper/private/Sophia_Astronaut_Rocket_v1.1.glb';
  const reads = [];
  const bucket = {
    async head() { return null; },
    async get(key) {
      reads.push(key);
      return key === forbidden ? { size: 5, body: new Response('glTF!').body } : null;
    },
    async list({ prefix }) {
      return prefix ? { objects: [], truncated: false }
        : { objects: [{ key: forbidden }], truncated: false };
    },
  };
  const response = await onRequestGet({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  assert.equal(response.status, 404);
  assert.equal(reads.length, 2);
  const status = await getSophiaStatus({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  const diagnostic = await status.json();
  assert.equal(diagnostic.rootScan.filenameSeenOutsideSophiaPath, true);
  assert.equal(diagnostic.rootScan.approvedModelFoundOutsideKnownPrefixes, false);
  assert.doesNotMatch(JSON.stringify(diagnostic), /shorekeeper|private\//i);
});

test('multiple valid root matches fail closed instead of selecting an arbitrary GLB', async () => {
  const bucket = {
    async head() { return null; },
    async get() { return null; },
    async list({ prefix }) {
      return prefix ? { objects: [], truncated: false }
        : { objects: [
          { key: 'Characters/Sophia/Sophia_Astronaut_Rocket_v1.1.glb' },
          { key: 'Archive/SOPHIA/Sophia_Astronaut_Rocket_v1.1.glb' },
        ], truncated: false };
    },
  };
  const response = await onRequestGet({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  assert.equal(response.status, 404);
  const status = await getSophiaStatus({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  const diagnostic = await status.json();
  assert.equal(diagnostic.rootScan.ambiguous, true);
  assert.equal(diagnostic.rootScan.approvedFilenameSeen, true);
});

test('root scan follows R2 pagination and only uses a complete deterministic match', async () => {
  const bucket = {
    async get(key) {
      return key === 'Gallery/Sophia/Sophia_Astronaut_Rocket_v1.1.glb'
        ? { size: 4, body: new Response('glTF').body }
        : null;
    },
    async list({ prefix, cursor }) {
      if (prefix) return { objects: [], truncated: false };
      if (!cursor) return {
        objects: [{ key: 'characters/shorekeeper/model.glb' }],
        truncated: true, cursor: 'next-page',
      };
      return {
        objects: [{ key: 'Gallery/Sophia/Sophia_Astronaut_Rocket_v1.1.glb' }],
        truncated: false,
      };
    },
  };
  const response = await onRequestGet({ env: { SHOREKEEPER_ASSETS_R2: bucket } });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'glTF');
});


test('immersive intro restores the original orbital menu and cyberpunk-style start screen', async () => {
  const page = await readFile(new URL('../src/pages/modo-imersivo.astro', import.meta.url), 'utf8');
  const file = page + await readFile(new URL('../src/scripts/sophia-immersive-runtime.ts', import.meta.url), 'utf8');
  assert.match(file, /import ExperimentalMenu from '\.\.\/components\/ExperimentalMenu\.astro'/);
  assert.match(file, /<ExperimentalMenu \/>/);
  assert.match(file, /PRESS ANY KEY TO/);
  assert.match(file, /immersive__start-main.*START/);
  assert.match(file, /Roguepunk\.ttf/);
  assert.match(file, /start\.addEventListener\('click',\s*requestStart[,)]/);
  assert.match(file, /window\.addEventListener\('keydown'/);
  assert.match(file, /e\.target\.closest\('a,button,input,select,textarea/);
  assert.match(file, /phase\s*!==\s*'intro'/);
});

test('immersive page delegates choreography to the tested launch director', async () => {
  const page = await readFile(new URL('../src/pages/modo-imersivo.astro', import.meta.url), 'utf8');
  const file = page + await readFile(new URL('../src/scripts/sophia-immersive-runtime.ts', import.meta.url), 'utf8');
  assert.match(file, /createLaunchDirector/);
  assert.match(file, /ActiveSceneClock/);
  assert.match(file, /clock.read\(now\)/);
  assert.match(file, /data-launch-hud/);
  assert.match(file, /visibilitychange/);
  assert.doesNotMatch(file, /setInterval|rocket\.position\.(?:x|y|z)|rocket\.translate/);
});

// ---- Delivery speed (perf/auditoria-imersivo) -------------------------------------------
test('delivery: long cache with stale-while-revalidate, still public and same-origin only', async () => {
  const mock = { async get() { return { size: 4, httpEtag: '"v"', body: new Response('glTF').body }; } };
  const r = await onRequestGet({ env: { SHOREKEEPER_ASSETS_R2: mock }, request: new Request('https://x.test/api/sophia/rocket') });
  assert.equal(r.headers.get('cache-control'), 'public, max-age=86400, stale-while-revalidate=604800');
  assert.equal(r.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('delivery: If-None-Match is forwarded to R2 and answered with an empty 304', async () => {
  let opts;
  const mock = { async get(_k, o) { opts = o; return { size: 4, httpEtag: '"v"' }; } }; // no body = precondition failed
  const req = new Request('https://x.test/api/sophia/rocket', { headers: { 'If-None-Match': '"v"' } });
  const r = await onRequestGet({ env: { SHOREKEEPER_ASSETS_R2: mock }, request: req });
  assert.equal(opts.onlyIf, req.headers);
  assert.equal(r.status, 304);
  assert.equal(r.body, null);
  assert.equal(r.headers.get('etag'), '"v"');
  assert.match(r.headers.get('cache-control'), /max-age=86400/);
});

test('delivery: the resolved key is remembered so later requests skip the fallback listing', async () => {
  const nested = 'private-assets/sophia/models/Sophia_Astronaut_Rocket_v1.1.glb';
  const calls = { get: [], list: 0 };
  const bucket = {
    async get(k) { calls.get.push(k); return k === nested ? { size: 1, httpEtag: '"n"', body: new Response('g').body } : null; },
    async list() { calls.list++; return { objects: [], truncated: false }; },
  };
  const env = { SHOREKEEPER_ASSETS_R2: bucket };
  const ok = await onRequestGet({ env, request: new Request('https://x.test/api/sophia/rocket') });
  assert.equal(ok.status, 200);
  calls.get.length = 0;
  await onRequestGet({ env, request: new Request('https://x.test/api/sophia/rocket') });
  assert.deepEqual(calls.get, [nested], 'second request goes straight to the remembered allowlisted key');
});

test('immersive loader uses one GET (no HEAD round trip), reports status codes and streams progress', async () => {
  const src = await readFile(new URL('../src/scripts/sophia-immersive-runtime.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /method:\s*'HEAD'/);
  assert.match(src, /response\.status\s*===\s*404/);
  assert.match(src, /response\.status\s*===\s*503/);
  assert.match(src, /getReader\(\)/);
  assert.match(src, /credentials:\s*'omit'/);
});
