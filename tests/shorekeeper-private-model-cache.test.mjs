import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SHOREKEEPER_CANONICAL,readPrivateModel,savePrivateModel,forgetPrivateModel} from '../src/scripts/shorekeeper/private-model-cache.mjs';

assert.equal(SHOREKEEPER_CANONICAL.filename,'PRIVATE_shorekeeper_f20a_original_idles.glb');
assert.equal(SHOREKEEPER_CANONICAL.bytes,39487548);
assert.equal(SHOREKEEPER_CANONICAL.sha256,'4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30');
assert.deepEqual([...SHOREKEEPER_CANONICAL.clips],['SK_IDLE_01_ORIGINAL','SK_IDLE_02_ORIGINAL','SK_IDLE_03_ORIGINAL']);
// Node test runner deliberately has no IndexedDB; private storage must fail gracefully.
await assert.rejects(readPrivateModel(),/IndexedDB indisponível/);
await assert.rejects(forgetPrivateModel(),/IndexedDB indisponível/);
await assert.rejects(savePrivateModel({size:100,name:'bad.txt'},SHOREKEEPER_CANONICAL.sha256),/arquivo GLB/);
await assert.rejects(savePrivateModel({size:100,name:'test.glb'},'bad-hash'),/SHA-256/);
await assert.rejects(savePrivateModel({size:100,name:'test.glb'},SHOREKEEPER_CANONICAL.sha256),/IndexedDB indisponível/);
const markup=await readFile('src/pages/experimentos/sk/index.astro','utf8');
const runtime=await readFile('src/scripts/shorekeeper-sk-lab.mjs','utf8');
const cacheSource=await readFile('src/scripts/shorekeeper/private-model-cache.mjs','utf8');
assert.match(markup,/data-action="rememberPrivate"/);
assert.match(markup,/data-action="forgetPrivate"/);
assert.match(markup,/data-private-cache-status/);
assert.match(runtime,/readPrivateModel\(\)/);
assert.match(runtime,/savePrivateModel\(file,sha\)/);
assert.match(runtime,/forgetPrivateModel\(\)/);
assert.match(cacheSource,/indexedDB\.open\(DATABASE,1\)/);
assert(!/\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/.test(cacheSource),'Private cache must not upload or request remote data');
console.log('Shorekeeper private canonical GLB metadata and browser-local cache integration PASS.');
