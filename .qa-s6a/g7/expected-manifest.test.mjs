/** Public-data-only regression tests. The actual G11.3 kit uses the array-of-records form. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeExpectedManifest} from './expected-manifest.mjs';
const sha = 'a'.repeat(64), other = 'b'.repeat(64);
const row = {name:'shorekeeper-f20a.glb',sha256:sha,bytes:39487548};

test('G11.3 expected.json array records normalize to named assets', () => {
  const manifest = normalizeExpectedManifest([row,{name:'basic.glb',sha256:other,bytes:5032460}]);
  assert.deepEqual(manifest.get('shorekeeper-f20a.glb'), {sha256:sha,bytes:39487548});
  assert.equal(manifest.get('basic.glb').sha256,other);
  assert.equal(manifest.size,2);
});
test('also accepts legacy name-to-hash and files object forms', () => {
  assert.deepEqual(normalizeExpectedManifest({'basic.glb':sha}).get('basic.glb'),{sha256:sha});
  assert.deepEqual(normalizeExpectedManifest({files:{'advanced.glb':{sha256:other,bytes:7}}}).get('advanced.glb'),{sha256:other,bytes:7});
  assert.equal(normalizeExpectedManifest({files:[row]}).size,1);
});
test('rejects malformed digests and bytes, duplicate names, invalid schema', () => {
  for (const input of [[],{},null,{files:null},[{...row,sha256:'bad'}],[{...row,bytes:-1}],[{...row,bytes:1.5}],[row,row],[{...row,name:'../secret.glb'}],{'bad.txt':sha}]) {
    assert.throws(()=>normalizeExpectedManifest(input));
  }
});
test('does not rely on object prototype or allow spoofed asset names', () => {
  const m = normalizeExpectedManifest({'__proto__.glb':sha});
  assert.equal(m.get('__proto__.glb').sha256,sha);
  assert.equal(m.get('absent.glb'),undefined);
});
